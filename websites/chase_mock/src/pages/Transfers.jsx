import { useRef, useState } from 'react'
import { useBank } from '../bank'
import { AccountOptions, CancelButton, Field, Notice, PageList, PageTitle, Panel, Review, Search, Status } from '../ui'
import {
  accountLabel, asCents, audit, changeRecord, dateLabel, find, idFor, isDeposit, localDay, matches,
  money, newest, open, positiveCents, records, validDay,
} from '../utils/banking'

const eligible = (account) => open(account) && isDeposit(account)
const availableCents = (account) => asCents(account.availableBalance ?? account.currentBalance)
const blankDraft = () => ({ from: '', to: '', amount: '', date: localDay(), memo: '' })

function validate(state, draft) {
  const from = find(state.accounts, draft.from)
  const to = find(state.accounts, draft.to)
  const cents = positiveCents(draft.amount)
  const errors = {}
  if (!eligible(from)) errors.from = 'Select an open deposit account.'
  if (!eligible(to) || to?.id === from?.id) errors.to = 'Select a different open deposit account.'
  if (!cents) errors.amount = 'Enter a positive amount with up to two decimal places.'
  else if (eligible(from) && (availableCents(from) == null || cents > availableCents(from))) {
    errors.amount = 'The amount exceeds the available balance.'
  }
  if (!validDay(draft.date)) errors.date = 'Choose today or a future date.'
  if (cents && !errors.amount && !errors.from && !errors.to && draft.date === localDay()) {
    const balances = [from, to].flatMap((item) => [asCents(item.currentBalance), availableCents(item)])
    if (balances.some((balance, i) => balance == null || !Number.isSafeInteger(balance + (i < 2 ? -cents : cents)))) {
      errors.amount = 'This amount cannot be applied to the selected accounts.'
    }
  }
  return { errors, from, to, cents }
}

function transferState(state, draft, from, to, cents, record) {
  const transfers = [...(state.transfers || []), record]
  if (record.status === 'scheduled') return { ...state, transfers }
  const accounts = state.accounts.map((account) => {
    if (account?.id !== from.id && account?.id !== to.id) return account
    const adjustment = account.id === from.id ? -cents : cents
    return {
      ...account,
      currentBalance: (asCents(account.currentBalance) + adjustment) / 100,
      availableBalance: (availableCents(account) + adjustment) / 100,
      updatedAt: record.createdAt, updatedBy: record.createdBy,
    }
  })
  const entries = [
    { id: record.id + '-out', accountId: from.id, amount: -record.amount, description: 'Transfer to ' + accountLabel(to) },
    { id: record.id + '-in', accountId: to.id, amount: record.amount, description: 'Transfer from ' + accountLabel(from) },
  ].map((entry) => ({
    ...entry, transferId: record.id, category: 'Transfers', type: 'transfer', status: 'posted',
    transactionDate: draft.date, createdAt: record.createdAt, createdBy: record.createdBy,
  }))
  return { ...state, transfers, accounts, transactions: [...(state.transactions || []), ...entries] }
}

function TransferActivity({ onCancel }) {
  const { state } = useBank()
  const heading = useRef(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const accounts = new Map(records(state.accounts).map((account) => [account.id, account]))
  const rows = newest(records(state.transfers).filter((record) => {
    const from = accountLabel(accounts.get(record.fromAccountId))
    const to = accountLabel(accounts.get(record.toAccountId))
    return (!status || record.status === status) && matches(search, from, to, record.memo, record.id, record.amount)
  }), 'transferDate')
  return <Panel title="Transfer activity" headingRef={heading}>
    <div className="controls">
      <Search label="Search transfers" value={search} onChange={setSearch} />
      <Field label="Status">{(props) => <select {...props} value={status} onChange={(event) => setStatus(event.target.value)}>
        <option value="">All statuses</option><option value="completed">Completed</option>
        <option value="scheduled">Scheduled</option><option value="cancelled">Cancelled</option>
      </select>}</Field>
    </div>
    <PageList key={JSON.stringify([search, status])} label="transfers" items={rows} empty="No transfers match your filters."
      render={(visible) => <ul className="activity">{visible.map((record) => <li key={record.id}>
        <div className="activity-head"><span className="row-title">{accountLabel(accounts.get(record.fromAccountId))} → {accountLabel(accounts.get(record.toAccountId))}</span>
          <span className="amount">{money(record.amount)}</span></div>
        <p className="row-sub">{dateLabel(record.transferDate)}{record.memo ? ' · ' + record.memo : ''}</p>
        <span className="reference">{record.id}</span>
        <div className="activity-foot"><Status value={record.status} />
          {record.status === 'scheduled' && <CancelButton label="Cancel transfer"
            description={'Cancel the ' + money(record.amount) + ' transfer for ' + dateLabel(record.transferDate) + '?'}
            onConfirm={() => onCancel(record.id)} focusAfterConfirm={heading}>Confirm cancellation</CancelButton>}
        </div>
      </li>)}</ul>} />
  </Panel>
}

export default function Transfers() {
  const { state, commit } = useBank()
  const [draft, setDraft] = useState(blankDraft)
  const [attempted, setAttempted] = useState(false)
  const [review, setReview] = useState(false)
  const [notice, setNotice] = useState('')
  const [reviewError, setReviewError] = useState('')
  const accounts = records(state.accounts).filter(eligible)
  const destinations = accounts.filter((item) => String(item.id) !== draft.from)
  const { errors, from, to, cents } = validate(state, draft)
  const fieldError = (key) => attempted ? errors[key] : undefined

  function change(key, value) {
    setDraft({ ...draft, [key]: value, ...(key === 'from' && value === draft.to ? { to: '' } : {}) })
  }

  function proceed(event) {
    event.preventDefault()
    setAttempted(true)
    if (Object.keys(errors).length) return
    setNotice('')
    setReviewError('')
    setReview(true)
  }

  function confirm() {
    let record
    const saved = commit((current) => {
      const checked = validate(current, draft)
      if (Object.keys(checked.errors).length) return current
      record = {
        id: idFor('trf'), fromAccountId: checked.from.id, toAccountId: checked.to.id, transferDate: draft.date,
        amount: checked.cents / 100, status: draft.date === localDay() ? 'completed' : 'scheduled',
        ...(draft.memo.trim() ? { memo: draft.memo.trim() } : {}), ...audit(current),
      }
      return transferState(current, draft, checked.from, checked.to, checked.cents, record)
    })
    if (!saved) {
      setReviewError('Return to the form to review the account, amount, and date.')
      return
    }
    setNotice((record.status === 'completed' ? 'Transfer completed.' : 'Transfer scheduled.') + ' Confirmation ID ' + record.id)
    setDraft(blankDraft())
    setAttempted(false)
    setReview(false)
  }

  function cancel(id) {
    const saved = commit((current) => {
      if (find(current.transfers, id)?.status !== 'scheduled') return current
      const { createdAt, createdBy } = audit(current)
      return { ...current, transfers: changeRecord(current.transfers, id, { status: 'cancelled', cancelledAt: createdAt, cancelledBy: createdBy }) }
    })
    if (saved) setNotice('Transfer cancelled. Confirmation ID ' + id)
  }

  return <>
    <PageTitle title="Transfers" description="Move money between your deposit accounts." />
    <div className="grid workflow-grid">
      <div>
        {review ? <Review title="Review transfer" rows={[
          ['From account', accountLabel(from)], ['To account', accountLabel(to)], ['Amount', money(cents / 100)],
          ['Transfer date', dateLabel(draft.date)], ...(draft.memo.trim() ? [['Memo', draft.memo.trim()]] : []),
        ]} back={() => setReview(false)} confirm={confirm} confirmLabel="Confirm transfer" error={reviewError} />
          : <Panel title="Make a transfer">
            {accounts.length < 2 ? <p className="empty">Two open deposit accounts are required to make a transfer.</p> :
              <form className="form" noValidate onSubmit={proceed}>
                <Field label="From account" error={fieldError('from')}>{(props) => <select {...props} value={draft.from} onChange={(e) => change('from', e.target.value)}><AccountOptions accounts={accounts} /></select>}</Field>
                {from && <p className="row-sub">Available balance {money(from.availableBalance ?? from.currentBalance)}</p>}
                <Field label="To account" error={fieldError('to')}>{(props) => <select {...props} value={draft.to} onChange={(e) => change('to', e.target.value)}><AccountOptions accounts={destinations} /></select>}</Field>
                <Field label="Amount" error={fieldError('amount')}>{(props) => <input {...props} inputMode="decimal" placeholder="0.00" value={draft.amount} onChange={(e) => change('amount', e.target.value)} />}</Field>
                <Field label="Transfer date" error={fieldError('date')}>{(props) => <input {...props} type="date" min={localDay()} value={draft.date} onChange={(e) => change('date', e.target.value)} />}</Field>
                <Field label="Memo (optional)">{(props) => <input {...props} value={draft.memo} onChange={(e) => change('memo', e.target.value)} />}</Field>
                <div className="actions"><button className="primary">Review transfer</button></div>
              </form>}
          </Panel>}
        <Notice>{notice}</Notice>
      </div>
      <TransferActivity onCancel={cancel} />
    </div>
  </>
}
