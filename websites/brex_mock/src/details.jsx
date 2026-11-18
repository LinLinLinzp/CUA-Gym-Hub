import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ActionDialog } from './forms.jsx'
import { infoFor } from './lists.jsx'
import { date, label, limitSpend, localFileUrl, lookup, memberName, numeric, receiptFor, records, roundMoney } from './model.js'
import { Badge, CalendarDate, Facts, Icon, Money, RecordLink, useSiteLink } from './ui.jsx'
import { withSid } from './utils/dataManager.js'
import { useWorkspace } from './workspace.jsx'

const present = (value, fallback) => value || fallback
const eventNames = {
  'card.issued': 'Issued card', 'card.locked': 'Locked card', 'card.unlocked': 'Unlocked card', 'card.canceled': 'Canceled card',
  'card.limit_changed': 'Changed spend limit', 'expense.submitted': 'Submitted reimbursement', 'expense.memo_updated': 'Updated memo',
  'expense.approved': 'Approved expense', 'expense.denied': 'Denied expense', 'receipt.uploaded': 'Uploaded receipt',
  'receipt.attached': 'Attached receipt', 'receipt.matched': 'Matched receipt', 'receipt.removed': 'Removed receipt',
  'limit.created': 'Created spend limit', 'limit.updated': 'Edited spend limit', 'limit.archived': 'Archived spend limit',
  'limit.increase_requested': 'Requested increase', 'limit.increase_approved': 'Approved increase', 'limit.increase_denied': 'Denied increase',
}

function History({ state, entity, id }) {
  const events = records(state.activity).filter(event => (event.targetType === entity && event.targetId === id)
    || event.relatedIds?.[`${entity}Id`] === id || event.relatedIds?.[`previous${entity[0].toUpperCase()}${entity.slice(1)}Id`] === id)
    .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
  return <section className="detail-section">
    <h3>Activity</h3>
    {events.length ? <ol className="activity-list">{events.map((event, index) => <li key={event.id ?? index}>
      <div><strong>{eventNames[event.action] || 'Recorded activity'}</strong><span>{memberName(state, event.actorId)} · {date(event.createdAt)}</span></div>
      {event.reason && <p>{event.reason}</p>}
    </li>)}</ol> : <p className="muted">No activity recorded.</p>}
  </section>
}

function Action({ children, open, command, record, request, intent = 'secondary' }) {
  return <button className={intent} type="button" onClick={() => open({ command, record, request })}>{children}</button>
}

function CardDetails({ state, record, open }) {
  const siteLink = useSiteLink()
  const limit = lookup(state.limits, record.limitId)
  const holder = memberName(state, record.holderId)
  const actionable = ['active', 'locked'].includes(record.status)
  return <>
    <div className="card-art">
      <span className="card-wordmark">Brex</span><span className="card-format">{label(record.format)}</span>
      <div className="card-contours" aria-hidden="true"><i /><i /><i /></div>
      <div className="card-art-data"><span>{record.name || 'Untitled card'}</span><strong className="numbers">{record.last4 ? `•••• ${record.last4}` : '••••'}</strong><span>{holder}</span></div>
    </div>
    <Facts values={[
      ['Cardholder', holder], ['Format', label(record.format)],
      ['Spend limit', <RecordLink base="/limits" record={limit} name={limit?.name} />],
      ['Issued', <CalendarDate value={record.createdAt} />],
    ]} />
    <div className="detail-actions">
      <Link className="secondary" to={siteLink('/expenses', { card: record.id })}>View card expenses <Icon name="arrow" size={15} /></Link>
      {record.status === 'active' && <Action open={open} command="card.locked" record={record}>Lock card</Action>}
      {record.status === 'locked' && <Action open={open} command="card.unlocked" record={record}>Unlock card</Action>}
      {actionable && <>
        <Action open={open} command="card.limit_changed" record={record}>Change spend limit</Action>
        <Action open={open} command="card.canceled" record={record} intent="danger-outline">Cancel card</Action>
      </>}
    </div>
  </>
}

function ExpenseDetails({ state, record, open }) {
  const card = lookup(state.cards, record.cardId)
  const limit = lookup(state.limits, record.limitId)
  const receipt = receiptFor(state, record.id)
  return <>
    <div className="detail-metric"><span>Amount</span><strong><Money amount={record.amount} currency={record.currency} /></strong></div>
    <Facts values={[
      ['Employee', memberName(state, record.employeeId)], ['Transaction date', <CalendarDate value={record.transactionDate} />],
      ['Type', label(record.kind)], ['Category', record.category || 'Uncategorized'],
      ['Card', <RecordLink base="/cards" record={card} name={card?.name} fallback={record.kind === 'reimbursement' ? '—' : 'Unavailable'} />],
      ['Spend limit', <RecordLink base="/limits" record={limit} name={limit?.name} />],
      ...(record.reviewedAt ? [['Reviewed', <CalendarDate value={record.reviewedAt} />], ['Reviewed by', memberName(state, record.reviewedBy)]] : []),
      ...(record.reviewReason ? [['Decision reason', record.reviewReason]] : []),
    ]} />
    {record.status === 'pending_review' && <div className="detail-actions">
      <Action open={open} command="expense.approved" record={record} intent="primary">Approve</Action>
      <Action open={open} command="expense.denied" record={record} intent="danger-outline">Deny</Action>
    </div>}
    <section className="detail-section"><h3>Memo</h3><p className="memo">{record.memo || 'No memo provided.'}</p><Action open={open} command="expense.memo_updated" record={record}>Edit memo</Action></section>
    <section className="detail-section"><h3>Receipt</h3>
      {receipt ? <><p><RecordLink base="/receipts" record={receipt} name={receipt.filename} /></p>
        <Action open={open} command="receipt.removed" record={receipt} intent="danger-outline">Remove receipt</Action></>
        : <><p className="muted">Missing receipt</p><Action open={open} command="receipt.attached" record={record}>Attach receipt</Action></>}
    </section>
  </>
}

function ReceiptDetails({ state, record, open }) {
  const expense = lookup(state.expenses, record.expenseId)
  const fileUrl = localFileUrl(record.fileUrl)
  return <>
    <div className="detail-metric receipt-metric"><span className="summary-icon"><Icon name="receipt" /></span><strong>{record.filename || 'Untitled receipt'}</strong></div>
    <Facts values={[
      ['File type', record.mimeType], ['File size', numeric(record.size) ? `${Number(record.size).toLocaleString('en-US')} bytes` : '—'],
      ['Uploaded', <CalendarDate value={record.createdAt} />], ['Uploaded by', memberName(state, record.createdBy)],
      ['Expense', <RecordLink base="/expenses" record={expense} name={expense?.merchant} fallback={record.expenseId ? 'Unavailable' : '—'} />],
    ]} />
    <div className="detail-actions">
      {fileUrl && <a className="secondary" href={withSid(fileUrl)} download={record.filename || 'receipt'}>Download receipt</a>}
      {record.status === 'unmatched' && <Action open={open} command="receipt.matched" record={record} intent="primary">Match to expense</Action>}
      {['attached', 'unmatched'].includes(record.status) && <Action open={open} command="receipt.removed" record={record} intent="danger-outline">Remove receipt</Action>}
    </div>
  </>
}

function LimitDetails({ state, record, open }) {
  const siteLink = useSiteLink()
  const spent = limitSpend(state, record)
  const requests = records(state.limitIncreaseRequests).filter(item => item.limitId === record.id)
    .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
  const active = record.status === 'active'
  return <>
    <div className="detail-metric"><span>Spend cap</span><strong><Money amount={record.amount} currency={record.currency} /></strong></div>
    <Facts values={[
      ['Owner', memberName(state, record.ownerId)], ['Recurrence', label(record.recurrence)],
      ['Recorded spend', <Money amount={spent} currency={record.currency} />],
      ['Remaining', <Money amount={numeric(record.amount) ? roundMoney(Number(record.amount) - spent) : null} currency={record.currency} />],
    ]} />
    <div className="detail-actions">
      <Link className="secondary" to={siteLink('/cards', { limit: record.id })}>View linked cards</Link>
      <Link className="secondary" to={siteLink('/expenses', { limit: record.id })}>View linked expenses</Link>
      {active && <>
        <Action open={open} command="limit.increase_requested" record={record} intent="primary">Request increase</Action>
        <Action open={open} command="limit.updated" record={record}>Edit spend limit</Action>
        <Action open={open} command="limit.archived" record={record} intent="danger-outline">Archive spend limit</Action>
      </>}
    </div>
    <section className="detail-section">
      <h3>Increase requests</h3>
      {requests.length ? <ul className="requests">{requests.map((request, index) => <li key={request.id ?? index}>
        <div className="request-top"><strong><Money amount={request.additionalAmount} currency={request.currency} /></strong><Badge value={request.status} /></div>
        <p>{request.reason || 'No reason provided.'}</p>
        <small>{memberName(state, request.requestedBy)} · {date(request.createdAt)}</small>
        {request.decisionReason && <p className="muted">{request.decisionReason}</p>}
        {request.id && request.status === 'pending' && <div className="detail-actions">
          {active && <Action open={open} command="limit.increase_approved" record={record} request={request}>Approve increase</Action>}
          <Action open={open} command="limit.increase_denied" record={record} request={request} intent="danger-outline">Deny increase</Action>
        </div>}
      </li>)}</ul> : <p className="muted">No increase requests yet.</p>}
    </section>
  </>
}

const detailViews = { card: CardDetails, expense: ExpenseDetails, receipt: ReceiptDetails, limit: LimitDetails }

export function RecordDetail({ section }) {
  const { id } = useParams()
  const { state } = useWorkspace()
  const { search } = useLocation()
  const navigate = useNavigate()
  const [action, setAction] = useState(null)
  const panel = useRef(null)
  const closeLink = useRef(null)
  const { entity, path, name } = section
  const record = lookup(state[infoFor(entity).collection], id)
  const goBack = `${path}${search}`
  const View = detailViews[entity]
  const title = record && present(record.name || record.merchant || record.filename, 'Untitled record')

  useEffect(() => {
    const previous = document.activeElement
    closeLink.current?.focus()
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus() }
  }, [id])

  useEffect(() => {
    function onKey(event) {
      if (event.defaultPrevented || document.querySelector('dialog[open]')) return
      if (event.key === 'Escape') navigate(goBack)
      if (event.key !== 'Tab') return

      const controls = [...panel.current.querySelectorAll('a[href], button:not(:disabled)')]
      const active = document.activeElement
      const first = controls[0]
      const last = controls.at(-1)
      if (controls.includes(active) && active !== (event.shiftKey ? first : last)) return
      event.preventDefault()
      const next = event.shiftKey ? last : first
      next?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [goBack, navigate])

  return <>
    <div className="detail-backdrop" onClick={() => navigate(goBack)} aria-hidden="true" />
    <aside ref={panel} className="detail" role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <header className="detail-header">
        <div><div className="detail-type">{name}</div><h2 id="detail-title">{title || 'Record unavailable'}</h2>{record && <Badge value={record.status} />}</div>
        <Link to={goBack} ref={closeLink} className="icon-button" aria-label="Close detail"><Icon name="x" /></Link>
      </header>
      <div className="detail-content">
        {record ? <><View state={state} record={record} open={setAction} /><History state={state} entity={entity} id={record.id} /></>
          : <div className="empty"><p>This record is unavailable in the current workspace.</p><Link to={goBack}>Return to {name.toLowerCase()}</Link></div>}
      </div>
    </aside>
    {action && <ActionDialog action={action} close={() => setAction(null)} />}
  </>
}
