import { useRef, useState } from 'react'
import { useBank } from '../bank'
import { AccountOptions, CancelButton, Field, Icon, Notice, PageList, PageTitle, Panel, Review, Search, Status } from '../ui'
import {
  accountLabel, audit, categories, changeRecord, dateLabel, find, idFor, localDay, mask, matches,
  money, newest, open, payeeLabel, positiveCents, records, validDay,
} from '../utils/banking'

const fundingAccount = (account) => open(account) && account.type === 'checking'
const activePayee = (payee) => payee?.status === 'active'

function Payees({ onAdd, onSchedule, canSchedule }) {
  const { state } = useBank()
  const [query, setQuery] = useState('')
  const items = records(state.payees).filter((item) => matches(query, item.name, item.category, item.nickname, item.accountLast4))
  items.sort((a, b) => Number(activePayee(b)) - Number(activePayee(a)) || payeeLabel(a).localeCompare(payeeLabel(b)) || String(a.id).localeCompare(String(b.id)))
  return <Panel title="Payees" side={<button className="subtle" onClick={onAdd}><Icon name="plus" size={16} />Add payee</button>}>
    <Search label="Search payees" value={query} onChange={setQuery} />
    <PageList key={query} items={items} label="payees" size={6} empty="No payees match your search."
      render={(rows) => <ul className="activity">{rows.map((item) => <li key={item.id}>
        <div className="activity-head">
          <div className="row-main"><span className="row-title">{payeeLabel(item)}</span>
            <span className="row-sub">{[item.nickname, item.category, mask(item.accountLast4)].filter(Boolean).join(' · ')}</span></div>
          <Status value={item.status} />
        </div>
        {activePayee(item) && canSchedule && <button className="subtle" onClick={() => onSchedule(item.id)}
          aria-label={'Schedule payment to ' + payeeLabel(item)}>Schedule payment</button>}
      </li>)}</ul>} />
  </Panel>
}

function AddPayee({ close, onSave }) {
  const { commit } = useBank()
  const [draft, setDraft] = useState({ name: '', category: '', nickname: '', reference: '' })
  const [attempted, setAttempted] = useState(false)
  const accountReference = draft.reference.trim().replace(/[ -]/g, '')
  const errors = {
    name: draft.name.trim() ? undefined : 'Enter the payee name.',
    category: categories.includes(draft.category) ? undefined : 'Select a category.',
    reference: /^[a-z0-9]{4,24}$/i.test(accountReference) ? undefined : 'Enter a reference with 4 to 24 letters or digits.',
  }
  const change = (key) => (event) => setDraft({ ...draft, [key]: event.target.value })

  function submit(event) {
    event.preventDefault()
    setAttempted(true)
    if (Object.values(errors).some(Boolean)) return
    const name = draft.name.trim()
    const nickname = draft.nickname.trim()
    commit((state) => {
      const payee = {
        id: idFor('payee'), name, category: draft.category, accountLast4: accountReference.slice(-4),
        status: 'active', ...(nickname ? { nickname } : {}), ...audit(state),
      }
      return { ...state, payees: [...(state.payees || []), payee] }
    })
    onSave(name + ' was added.')
  }

  return <Panel title="Add payee">
    <form className="form" onSubmit={submit} noValidate>
      <Field label="Payee name" error={attempted && errors.name}>{(props) => <input {...props} value={draft.name} onChange={change('name')} />}</Field>
      <Field label="Category" error={attempted && errors.category}>{(props) => <select {...props} value={draft.category} onChange={change('category')}>
        <option value="">Select a category</option>{categories.map((category) => <option key={category}>{category}</option>)}
      </select>}</Field>
      <Field label="Nickname (optional)">{(props) => <input {...props} value={draft.nickname} onChange={change('nickname')} />}</Field>
      <Field label="Account reference" error={attempted && errors.reference}>{(props) => <input {...props} value={draft.reference} onChange={change('reference')} />}</Field>
      <div className="actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary">Save payee</button></div>
    </form>
  </Panel>
}

function validate(state, draft) {
  const payee = find(state.payees, draft.payee)
  const account = find(state.accounts, draft.account)
  const cents = positiveCents(draft.amount)
  const errors = {}
  if (!activePayee(payee)) errors.payee = 'Select an active payee.'
  if (!fundingAccount(account)) errors.account = 'Select an open checking account.'
  if (!cents) errors.amount = 'Enter a positive amount with up to two decimal places.'
  if (!validDay(draft.date)) errors.date = 'Choose today or a future date.'
  return { errors, payee, account, cents }
}

function SchedulePayment({ initialPayee, close, onSave }) {
  const { state, commit } = useBank()
  const [draft, setDraft] = useState(() => ({ payee: initialPayee || '', account: '', amount: '', date: localDay() }))
  const [attempted, setAttempted] = useState(false)
  const [review, setReview] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const { payee, account, cents, errors } = validate(state, draft)
  const payees = records(state.payees).filter(activePayee).sort((a, b) => payeeLabel(a).localeCompare(payeeLabel(b)))
  const accounts = records(state.accounts).filter(fundingAccount)
  const error = (key) => attempted ? errors[key] : undefined
  const change = (key) => (event) => setDraft({ ...draft, [key]: event.target.value })

  function confirm() {
    let record
    const saved = commit((current) => {
      const checked = validate(current, draft)
      if (Object.keys(checked.errors).length) return current
      record = {
        id: idFor('bill'), payeeId: checked.payee.id, fromAccountId: checked.account.id,
        amount: checked.cents / 100, sendDate: draft.date, status: 'scheduled', ...audit(current),
      }
      return { ...current, billPayments: [...(current.billPayments || []), record] }
    })
    if (saved) onSave('Payment scheduled. Confirmation ID ' + record.id)
    else setReviewError('Return to the form to review the payee, account, amount, and date.')
  }

  if (review) return <Review title="Review payment" rows={[
    ['Payee', payeeLabel(payee)], ['From account', accountLabel(account)], ['Amount', money(cents / 100)], ['Send date', dateLabel(draft.date)],
  ]} back={() => setReview(false)} confirm={confirm} confirmLabel="Confirm payment" error={reviewError} />

  return <Panel title="Schedule payment">
    <form className="form" noValidate onSubmit={(event) => {
      event.preventDefault()
      setAttempted(true)
      if (!Object.keys(errors).length) { setReviewError(''); setReview(true) }
    }}>
      <Field label="Payee" error={error('payee')}>{(props) => <select {...props} value={draft.payee} onChange={change('payee')}>
        <option value="">Select a payee</option>{payees.map((item) => <option key={item.id} value={item.id}>{payeeLabel(item)} {mask(item.accountLast4)}</option>)}
      </select>}</Field>
      <Field label="From account" error={error('account')}>{(props) => <select {...props} value={draft.account} onChange={change('account')}><AccountOptions accounts={accounts} /></select>}</Field>
      <Field label="Amount" error={error('amount')}>{(props) => <input {...props} inputMode="decimal" placeholder="0.00" value={draft.amount} onChange={change('amount')} />}</Field>
      <Field label="Send date" error={error('date')}>{(props) => <input {...props} type="date" min={localDay()} value={draft.date} onChange={change('date')} />}</Field>
      <div className="actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary">Review payment</button></div>
    </form>
  </Panel>
}

function PaymentActivity({ onCancel }) {
  const { state } = useBank()
  const heading = useRef(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const payees = new Map(records(state.payees).map((item) => [item.id, item]))
  const accounts = new Map(records(state.accounts).map((item) => [item.id, item]))
  const rows = newest(records(state.billPayments).filter((item) => (!status || item.status === status)
    && matches(query, payeeLabel(payees.get(item.payeeId)), accountLabel(accounts.get(item.fromAccountId)), item.amount, item.id)), 'sendDate')
  return <Panel title="Payment activity" headingRef={heading}>
    <div className="controls">
      <Search label="Search payments" value={query} onChange={setQuery} />
      <Field label="Status">{(props) => <select {...props} value={status} onChange={(event) => setStatus(event.target.value)}>
        <option value="">All statuses</option><option value="scheduled">Scheduled</option>
        <option value="completed">Completed</option><option value="cancelled">Cancelled</option>
      </select>}</Field>
    </div>
    <PageList key={JSON.stringify([query, status])} items={rows} label="payments" empty="No payments match your filters."
      render={(visible) => <ul className="activity">{visible.map((item) => <li key={item.id}>
        <div className="activity-head"><span className="row-title">{payeeLabel(payees.get(item.payeeId))}</span><span className="amount">{money(item.amount)}</span></div>
        <p className="row-sub">{dateLabel(item.sendDate)} · {accountLabel(accounts.get(item.fromAccountId))}</p>
        <span className="reference">{item.id}</span>
        <div className="activity-foot"><Status value={item.status} />
          {item.status === 'scheduled' && <CancelButton label="Cancel payment"
            description={'Cancel the ' + money(item.amount) + ' payment for ' + dateLabel(item.sendDate) + '?'}
            onConfirm={() => onCancel(item.id)} focusAfterConfirm={heading}>Confirm cancellation</CancelButton>}</div>
      </li>)}</ul>} />
  </Panel>
}

export default function BillPay() {
  const { state, commit } = useBank()
  const [form, setForm] = useState('')
  const [initialPayee, setInitialPayee] = useState('')
  const [notice, setNotice] = useState('')
  const canSchedule = records(state.accounts).some(fundingAccount)
  const hasPayee = records(state.payees).some(activePayee)

  function cancelPayment(id) {
    const saved = commit((current) => {
      if (find(current.billPayments, id)?.status !== 'scheduled') return current
      const { createdAt, createdBy } = audit(current)
      return { ...current, billPayments: changeRecord(current.billPayments, id, { status: 'cancelled', cancelledAt: createdAt, cancelledBy: createdBy }) }
    })
    if (saved) setNotice('Payment cancelled. Confirmation ID ' + id)
  }

  function schedule(id = '') {
    setNotice('')
    setInitialPayee(id)
    setForm('schedule')
  }

  function saved(message) {
    setForm('')
    setNotice(message)
  }

  return <>
    <PageTitle title="Bill pay" description="Manage your payees and see scheduled payments.">
      {canSchedule && hasPayee && !form && <button className="primary" onClick={() => schedule()}>Schedule payment</button>}
    </PageTitle>
    <div className="grid workflow-grid">
      <div>
        {form === 'add' ? <AddPayee close={() => setForm('')} onSave={saved} /> :
          form === 'schedule' ? <SchedulePayment key={initialPayee} initialPayee={initialPayee} close={() => setForm('')} onSave={saved} /> :
            <Payees canSchedule={canSchedule} onSchedule={schedule} onAdd={() => { setNotice(''); setForm('add') }} />}
        <Notice>{notice}</Notice>
      </div>
      <PaymentActivity onCancel={cancelPayment} />
    </div>
  </>
}
