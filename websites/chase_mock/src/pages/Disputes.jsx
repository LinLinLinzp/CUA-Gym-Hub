import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useBank } from '../bank'
import { BackLink, Details, Field, Missing, Notice, PageList, PageTitle, Panel, Review, Search, SessionLink, Status } from '../ui'
import {
  accountLabel, asCents, audit, dateLabel, disputable, disputePath, existingCase, find, idFor, matches,
  money, newest, openCase, positiveCents, reasons, records, signedMoney, transactionPath, transactionTitle,
} from '../utils/banking'

function CaseList() {
  const { state } = useBank()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('')
  const transactions = new Map(records(state.transactions).map((item) => [item.id, item]))
  const accounts = new Map(records(state.accounts).map((item) => [item.id, item]))
  const items = newest(records(state.disputes).filter((item) =>
    (!filter || (filter === 'open') === openCase(item))
    && matches(query, item.id, transactionTitle(transactions.get(item.transactionId)), reasons[item.reason], item.reason, item.description, accountLabel(accounts.get(item.accountId)))), 'createdAt')
  return <Panel title="Track cases">
    <div className="controls">
      <Search label="Search disputes" value={query} onChange={setQuery} />
      <Field label="Case status">{(props) => <select {...props} value={filter} onChange={(event) => setFilter(event.target.value)}>
        <option value="">All cases</option><option value="open">Open cases</option><option value="closed">Closed cases</option>
      </select>}</Field>
    </div>
    <PageList key={JSON.stringify([query, filter])} items={items} label="cases" empty="No cases match your filters."
      render={(rows) => <ul className="activity">{rows.map((item) => <li key={item.id}>
        <div className="activity-head"><SessionLink to={disputePath(item.id)}>{transactionTitle(transactions.get(item.transactionId))}</SessionLink>
          <span className="amount">{money(item.amount)}</span></div>
        <p className="row-sub">{dateLabel(item.createdAt)} · {reasons[item.reason] || item.reason || 'Reason unavailable'}</p>
        <div className="activity-foot"><span className="reference">{item.id}</span><Status value={item.status} /></div>
      </li>)}</ul>} />
  </Panel>
}

function validate(state, transactionId, draft) {
  const transaction = find(state.transactions, transactionId)
  const account = find(state.accounts, transaction?.accountId)
  const cents = positiveCents(draft.amount)
  const errors = {}
  if (!disputable(transaction, account) || openCase(existingCase(state, transaction?.id))) errors.transaction = 'This transaction is unavailable for a new case.'
  if (!Object.hasOwn(reasons, draft.reason)) errors.reason = 'Select a reason.'
  if (!cents || cents > -asCents(transaction?.amount)) errors.amount = 'Enter a positive amount up to the original charge.'
  if (!draft.description.trim()) errors.description = 'Describe what happened.'
  return { errors, transaction, account, cents }
}

function DisputeForm({ transactionId, close, onSave }) {
  const { state, commit } = useBank()
  const [draft, setDraft] = useState(() => {
    const amount = -asCents(find(state.transactions, transactionId)?.amount)
    return { reason: '', amount: amount > 0 ? (amount / 100).toFixed(2) : '', description: '' }
  })
  const [attempted, setAttempted] = useState(false)
  const [review, setReview] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const { transaction, account, cents, errors } = validate(state, transactionId, draft)
  const error = (key) => attempted ? errors[key] : undefined
  const change = (key) => (event) => setDraft({ ...draft, [key]: event.target.value })
  const related = existingCase(state, transaction?.id)

  function confirm() {
    let record
    const saved = commit((current) => {
      const checked = validate(current, transactionId, draft)
      if (Object.keys(checked.errors).length) return current
      record = {
        id: idFor('dsp'), accountId: checked.account.id, transactionId: checked.transaction.id, reason: draft.reason,
        amount: checked.cents / 100, description: draft.description.trim(), status: 'submitted', ...audit(current),
      }
      return { ...current, disputes: [...(current.disputes || []), record] }
    })
    if (saved) onSave(record.id)
    else setReviewError('This case could not be submitted. Return to review the transaction and your details.')
  }

  if (errors.transaction) return <Panel title="Report a problem">
    <Notice error>{errors.transaction}</Notice>
    <div className="actions">
      <button className="secondary" onClick={close}>Choose another transaction</button>
      {openCase(related) && <SessionLink to={disputePath(related.id)}>View existing case</SessionLink>}
    </div>
  </Panel>

  if (review) return <Review title="Review dispute" rows={[
    ['Transaction', transactionTitle(transaction)], ['Account', accountLabel(account)],
    ['Disputed amount', money(cents / 100)], ['Reason', reasons[draft.reason]], ['Description', draft.description.trim()],
  ]} back={() => setReview(false)} confirm={confirm} confirmLabel="Submit dispute" error={reviewError} />

  return <Panel title="Report a problem">
    <Details rows={[
      ['Transaction', transactionTitle(transaction)], ['Account', accountLabel(account)],
      ['Transaction date', dateLabel(transaction.transactionDate)], ['Original charge', signedMoney(transaction.amount)],
    ]} />
    <form className="form section-gap" noValidate onSubmit={(event) => {
      event.preventDefault()
      setAttempted(true)
      if (!Object.keys(errors).length) { setReviewError(''); setReview(true) }
    }}>
      <Field label="Reason" error={error('reason')}>{(props) => <select {...props} value={draft.reason} onChange={change('reason')}>
        <option value="">Select a reason</option>{Object.entries(reasons).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>}</Field>
      <Field label="Disputed amount" error={error('amount')}>{(props) => <input {...props} inputMode="decimal" value={draft.amount} onChange={change('amount')} />}</Field>
      <Field label="Description" error={error('description')}>{(props) => <textarea {...props} value={draft.description} onChange={change('description')} />}</Field>
      <div className="actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary">Review dispute</button></div>
    </form>
  </Panel>
}

function ChooseTransaction({ onSelect }) {
  const { state } = useBank()
  const [id, setId] = useState('')
  const [query, setQuery] = useState('')
  const accounts = new Map(records(state.accounts).map((item) => [item.id, item]))
  const disputed = new Set(records(state.disputes).filter(openCase).map((item) => item.transactionId))
  const eligible = newest(records(state.transactions).filter((item) =>
    disputable(item, accounts.get(item.accountId)) && !disputed.has(item.id)), 'transactionDate')
  const results = eligible.filter((item) => matches(query, item.merchant, item.description, dateLabel(item.transactionDate), accountLabel(accounts.get(item.accountId))))
  return <Panel title="Report a problem">
    {eligible.length ? <form className="form" onSubmit={(event) => { event.preventDefault(); if (id) onSelect(id) }}>
      <Search label="Find a purchase" value={query} onChange={(value) => { setId(''); setQuery(value) }} />
      <Field label="Eligible transaction">{(props) => <select {...props} value={id} onChange={(event) => setId(event.target.value)}>
        <option value="">{results.length ? 'Select a transaction' : 'No matching transactions'}</option>
        {results.map((item) => <option key={item.id} value={item.id}>{transactionTitle(item)} · {dateLabel(item.transactionDate)} · {signedMoney(item.amount)} · {accountLabel(accounts.get(item.accountId))}</option>)}
      </select>}</Field>
      <div className="actions"><button className="primary" disabled={!id}>Continue</button></div>
    </form> : <p className="empty">No transactions are eligible for a new dispute.</p>}
  </Panel>
}

export function Disputes() {
  const [query, setQuery] = useSearchParams()
  const transaction = query.get('transaction')
  const [caseId, setCaseId] = useState('')
  function select(id) {
    setCaseId('')
    const next = new URLSearchParams(query)
    if (id) next.set('transaction', id)
    else next.delete('transaction')
    setQuery(next, { replace: !id })
  }
  return <>
    <PageTitle title="Disputes" description="Report a posted purchase or check the status of a case." />
    <div className="stack">
      <div className="dispute-entry">
        {transaction ? <DisputeForm key={transaction} transactionId={transaction} close={() => select('')}
          onSave={(id) => { select(''); setCaseId(id) }} /> : <ChooseTransaction onSelect={select} />}
        {caseId && <Notice><span>Dispute submitted. Case ID <SessionLink to={disputePath(caseId)}>{caseId}</SessionLink></span></Notice>}
      </div>
      <CaseList />
    </div>
  </>
}

export function DisputeDetail() {
  const { disputeId } = useParams()
  const { state } = useBank()
  const item = find(state.disputes, disputeId)
  if (!item) return <Missing title="Case unavailable" to="/disputes" label="Back to disputes" />
  const transaction = find(state.transactions, item.transactionId)
  const account = find(state.accounts, item.accountId)
  return <>
    <BackLink to="/disputes">All disputes</BackLink>
    <PageTitle title="Case details" description={item.id} />
    <div className="grid">
      <Panel title={transactionTitle(transaction)} side={<Status value={item.status} />}>
        <Details rows={[
          ['Account', accountLabel(account)], ['Disputed amount', money(item.amount)],
          ['Reason', reasons[item.reason] || item.reason || '—'], ['Submitted', dateLabel(item.createdAt)],
          ['Description', item.description || '—'],
        ]} />
        {transaction && account && transaction.accountId === account.id &&
          <SessionLink className="secondary section-gap" to={transactionPath(account.id, transaction.id)}>View transaction</SessionLink>}
      </Panel>
    </div>
  </>
}
