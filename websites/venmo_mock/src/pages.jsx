import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useWorkspace } from './App'
import { useAccount } from './store'
import {
  amountCents, cents, changeRequest, dateLabel, dollars, exportStatement, find, fundingLabel, match, money,
  nameOf, newest, paymentDirection, paymentParty, person, postedAt, postedPayments, records,
  requestDirection, requestParty, signedMoney, splitStatus, statement,
} from './model'
import { AppLink, Avatar, Back, Empty, Facts, Field, Heading, Icon, Sheet, Status, Switch } from './ui'

const recordPath = (base, id) => '/' + base + '/' + encodeURIComponent(id)

function RecordRow({ path, item, children }) {
  return item.id
    ? <AppLink className="ledger-row" to={recordPath(path, item.id)}>{children}<Icon name="right" /></AppLink>
    : <div className="ledger-row">{children}</div>
}

function PaymentRow({ state, payment }) {
  const direction = paymentDirection(payment, state.account.id)
  const id = paymentParty(payment, direction)
  const incoming = direction === 'received'
  return <RecordRow path="activity" item={payment}>
    <Avatar person={person(state, id)} />
    <span className="row-main"><span className="row-title"><strong>{nameOf(state, id)}</strong>{payment.status === 'pending' && <Status value={payment.status} />}</span><small>{payment.note || 'Payment'}</small></span>
    <span className="row-end"><strong className={incoming ? 'positive' : ''}>{direction ? signedMoney(payment.amount, incoming) : money(payment.amount)}</strong><small>{dateLabel(postedAt(payment))}</small></span>
  </RecordRow>
}

function RequestRow({ state, request, compact = false }) {
  const direction = requestDirection(request, state.account.id)
  const id = requestParty(request, direction)
  return <RecordRow path="requests" item={request}>
    <Avatar person={person(state, id)} />
    <span className="row-main"><strong>{nameOf(state, id)}</strong><small>{request.note || (direction === 'incoming' ? 'Incoming request' : 'Outgoing request')}</small></span>
    <span className="row-end"><strong>{money(request.amount)}</strong>{compact ? <small>{direction === 'incoming' ? 'Incoming' : 'Outgoing'}</small> : <small>{dateLabel(request.createdAt)}</small>}</span>
    {!compact && <Status value={request.status} />}
  </RecordRow>
}

function SectionHeader({ title, path, link }) {
  return <div className="section-heading"><h2>{title}</h2>{path && <AppLink to={path}>{link} <Icon name="right" /></AppLink>}</div>
}

export function Overview() {
  const { state } = useAccount()
  const { openComposer, openSplit } = useWorkspace()
  const recent = newest(records(state.payments).filter((payment) => paymentDirection(payment, state.account.id)), postedAt).slice(0, 8)
  const pending = newest(records(state.requests).filter((request) => request.status === 'pending' && requestDirection(request, state.account.id))).slice(0, 3)
  return <>
    <Heading title={state.account.name ? 'Welcome, ' + state.account.name.split(' ')[0] : 'Overview'} description="Manage payments, requests, and shared expenses.">
      <button className="primary" onClick={() => openComposer()}><Icon name="plus" />Pay or request</button>
      <button className="secondary" onClick={() => openSplit()}><Icon name="split" />Split an expense</button>
    </Heading>
    <div className="overview-grid">
      <section className="panel">
        <SectionHeader title="Recent activity" path="/activity" link="View activity" />
        {recent.length ? recent.map((payment, index) => <PaymentRow key={payment.id ?? index} state={state} payment={payment} />)
          : <Empty title="No recent activity">Your payments will appear here.</Empty>}
      </section>
      <aside>
        <section className="balance">
          <div className="balance-art" aria-hidden="true" />
          <p>Venmo balance</p>
          <strong>{money(state.account.balance)}</strong>
          <small>Available {state.account.currency || 'USD'}</small>
        </section>
        <section className="panel pending-panel">
          <SectionHeader title="Pending requests" path="/requests" link="View all" />
          {pending.length ? pending.map((request, index) => <RequestRow key={request.id ?? index} state={state} request={request} compact />)
            : <Empty title="No pending requests">New requests will appear here.</Empty>}
        </section>
      </aside>
    </div>
  </>
}

export function Activity() {
  const { state } = useAccount()
  const { openComposer } = useWorkspace()
  const [direction, setDirection] = useState('all')
  const [query, setQuery] = useState('')
  const payments = newest(records(state.payments).filter((payment) => {
    const side = paymentDirection(payment, state.account.id)
    const contact = person(state, paymentParty(payment, side))
    return side && (direction === 'all' || direction === side) && match(query, contact?.name, contact?.handle, payment.note)
  }), postedAt)
  return <>
    <Heading title="Activity" description="Review payments you’ve sent and received.">
      <button className="primary" onClick={() => openComposer()}><Icon name="plus" />Pay or request</button>
    </Heading>
    <section className="panel">
      <div className="toolbar">
        <Switch label="Payment direction" value={direction} onChange={setDirection} options={[[ 'all', 'All' ], [ 'sent', 'Sent' ], [ 'received', 'Received' ]]} />
        <label className="search"><Icon name="search" /><input type="search" aria-label="Search activity" placeholder="Search by person or note" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      </div>
      {payments.length ? payments.map((payment, index) => <PaymentRow key={payment.id ?? index} state={state} payment={payment} />)
        : <Empty title="No payments found">Try a different search or filter.</Empty>}
    </section>
  </>
}

export function Missing({ to = '/', label = 'Back to overview', title = 'Page unavailable' }) {
  return <><Back to={to}>{label}</Back><Heading title={title} description="This page or record could not be found." /></>
}

export function PaymentDetail() {
  const { paymentId } = useParams()
  const { state } = useAccount()
  const { openSplit } = useWorkspace()
  const payment = find(state.payments, paymentId)
  if (!payment) return <Missing to="/activity" label="Back to activity" title="Payment unavailable" />
  const direction = paymentDirection(payment, state.account.id)
  const counterpartyId = paymentParty(payment, direction)
  const request = find(state.requests, payment.requestId)
  return <>
    <Back to="/activity">Back to activity</Back>
    <Heading title="Payment details">
      {direction === 'sent' && payment.status === 'completed' && amountCents(payment.amount) > 0 &&
        <button className="secondary" onClick={() => openSplit(payment)}><Icon name="split" />Split payment</button>}
    </Heading>
    <section className="panel detail-panel">
      <div className="detail-top"><Avatar person={person(state, counterpartyId)} /><div><h2>{nameOf(state, counterpartyId)}</h2><p>{direction === 'sent' ? 'Payment sent' : direction === 'received' ? 'Payment received' : 'Payment'}</p></div><Status value={payment.status} /></div>
      <p className="detail-amount">{direction ? signedMoney(payment.amount, direction === 'received') : money(payment.amount)}</p>
      <Facts entries={[
        ['Note', payment.note || '—'], ['Date', dateLabel(postedAt(payment), true)], ['Payment ID', payment.id],
        ['Funding source', direction === 'sent' ? fundingLabel(find(state.fundingSources, payment.fundingSourceId)) : null],
        ['Related request', payment.requestId ? request ? <AppLink to={recordPath('requests', request.id)}>View request</AppLink> : 'Request unavailable' : null],
      ]} />
    </section>
  </>
}

export function Requests() {
  const { state } = useAccount()
  const { openComposer } = useWorkspace()
  const [direction, setDirection] = useState('incoming')
  const [status, setStatus] = useState('all')
  const requests = newest(records(state.requests).filter((request) =>
    requestDirection(request, state.account.id) === direction && (status === 'all' || status === request.status)))
  return <>
    <Heading title="Requests" description="Track money you’ve asked for and requests you’ve received.">
      <button className="primary" onClick={() => openComposer({ mode: 'request' })}><Icon name="plus" />New request</button>
    </Heading>
    <section className="panel">
      <div className="toolbar">
        <Switch label="Request direction" value={direction} onChange={setDirection} options={[[ 'incoming', 'Incoming' ], [ 'outgoing', 'Outgoing' ]]} />
        <Field label="Status" id="request-status" className="inline-field">
          <select id="request-status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="declined">Declined</option><option value="cancelled">Cancelled</option>
          </select>
        </Field>
      </div>
      {requests.length ? requests.map((request, index) => <RequestRow key={request.id ?? index} state={state} request={request} />)
        : <Empty title="No requests found">Requests matching these filters will appear here.</Empty>}
    </section>
  </>
}

export function RequestDetail() {
  const { requestId } = useParams()
  const { state, commit } = useAccount()
  const { openComposer, announce } = useWorkspace()
  const [confirmation, setConfirmation] = useState(null)
  const [error, setError] = useState('')
  const submitting = useRef(false)
  const request = find(state.requests, requestId)
  if (!request) return <Missing to="/requests" label="Back to requests" title="Request unavailable" />
  const direction = requestDirection(request, state.account.id)
  const counterpartyId = requestParty(request, direction)
  const payment = find(state.payments, request.paymentId)
  const split = find(state.splits, request.splitId)
  const reminders = newest(records(request.reminders))
  const pending = request.status === 'pending'

  function apply(action) {
    if (submitting.current) return
    submitting.current = true
    setError('')
    try {
      commit((latest) => changeRequest(latest, requestId, action).state)
      setConfirmation(null)
      announce(({ remind: 'Reminder sent.', cancelled: 'Request cancelled.', declined: 'Request declined.' })[action])
    } catch (failure) {
      setError(failure.message)
    } finally {
      submitting.current = false
    }
  }

  function confirm(action) {
    setError('')
    setConfirmation(action)
  }

  const actionLabel = confirmation === 'declined' ? 'Decline request' : 'Cancel request'
  return <>
    <Back to="/requests">Back to requests</Back>
    <Heading title="Request details">
      {pending && direction === 'incoming' && <>
        <button className="primary" disabled={!amountCents(request.amount) || !request.requesterId} onClick={() => openComposer({ requestId })}>Pay</button>
        <button className="secondary" onClick={() => confirm('declined')}>Decline</button>
      </>}
      {pending && direction === 'outgoing' && <>
        <button className="primary" disabled={!request.payerId} onClick={() => apply('remind')}>Remind</button>
        <button className="secondary" onClick={() => confirm('cancelled')}>Cancel request</button>
      </>}
    </Heading>
    {!confirmation && error && <p className="error" role="alert">{error}</p>}
    <section className="panel detail-panel">
      <div className="detail-top"><Avatar person={person(state, counterpartyId)} /><div><h2>{nameOf(state, counterpartyId)}</h2><p>{direction === 'incoming' ? 'Incoming request' : direction === 'outgoing' ? 'Outgoing request' : 'Request'}</p></div><Status value={request.status} /></div>
      <p className="detail-amount">{money(request.amount)}</p>
      <Facts entries={[
        ['Note', request.note || '—'], ['Created', dateLabel(request.createdAt, true)], ['Request ID', request.id],
        ['Updated', request.updatedAt ? dateLabel(request.updatedAt, true) : null],
        ['Payment', request.paymentId ? payment ? <AppLink to={recordPath('activity', payment.id)}>View payment</AppLink> : 'Payment unavailable' : null],
        ['Expense split', request.splitId ? split ? <AppLink to={recordPath('splits', split.id)}>View split</AppLink> : 'Split unavailable' : null],
      ]} />
      {reminders.length > 0 && <div className="reminders"><h2>Reminders</h2><ul>{reminders.map((entry, index) => <li key={entry.id ?? index}>{dateLabel(entry.createdAt, true)}</li>)}</ul></div>}
    </section>
    {confirmation && <Sheet title={actionLabel} close={() => { setConfirmation(null); setError('') }} footer={<>
      <button className="secondary" onClick={() => { setConfirmation(null); setError('') }}>Go back</button>
      <button className="primary" onClick={() => apply(confirmation)}>{actionLabel}</button>
    </>}>
      <p>{confirmation === 'declined' ? 'Decline the request from ' : 'Cancel the request to '}{nameOf(state, counterpartyId)} for {money(request.amount)}?</p>
      {error && <p className="error" role="alert">{error}</p>}
    </Sheet>}
  </>
}

export function Splits() {
  const { state } = useAccount()
  const { openSplit } = useWorkspace()
  const [query, setQuery] = useState('')
  const splits = newest(records(state.splits).filter((split) => match(query, split.note, split.id,
    ...records(split.shares).map((share) => nameOf(state, share.userId)))))
  return <>
    <Heading title="Splits" description="Divide expenses and see who has paid their share.">
      <button className="primary" onClick={() => openSplit()}><Icon name="split" />Split an expense</button>
    </Heading>
    <section className="panel">
      <div className="toolbar"><label className="search"><Icon name="search" /><input type="search" aria-label="Search splits" placeholder="Search expenses or people" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
      {splits.length ? splits.map((split, index) => <RecordRow key={split.id ?? index} path="splits" item={split}>
        <span className="ledger-icon"><Icon name="split" /></span>
        <span className="row-main"><strong>{split.note || 'Shared expense'}</strong><small>{records(split.shares).length} participants · {dateLabel(split.createdAt)}</small></span>
        <span className="row-end"><strong>{money(split.amount)}</strong></span>
        <Status value={records(split.shares).length ? splitStatus(split, state.requests) : split.status} />
      </RecordRow>) : <Empty title="No splits found">Shared expenses matching your search will appear here.</Empty>}
    </section>
  </>
}

export function SplitDetail() {
  const { splitId } = useParams()
  const { state } = useAccount()
  const split = find(state.splits, splitId)
  if (!split) return <Missing to="/splits" label="Back to splits" title="Split unavailable" />
  const shares = records(split.shares)
  const source = find(state.payments, split.sourcePaymentId)
  return <>
    <Back to="/splits">Back to splits</Back>
    <Heading title={split.note || 'Split details'} description="Review participant shares and linked requests." />
    <div className="overview-grid">
      <section className="panel">
        <SectionHeader title="Participant shares" />
        {shares.length ? shares.map((share, index) => {
          const request = find(state.requests, share.requestId)
          const owner = share.userId && share.userId === split.ownerId && !share.requestId
          const content = <>
            <Avatar person={person(state, share.userId)} />
            <span className="row-main"><strong>{share.userId === state.account.id ? 'You' : nameOf(state, share.userId)}</strong><small>{owner ? 'Organizer share' : request ? 'View request' : 'Request unavailable'}</small></span>
            <span className="row-end"><strong>{money(share.amount)}</strong></span>
            {!owner && <Status value={request?.status} />}
          </>
          return request
            ? <RecordRow key={index} path="requests" item={request}>{content}</RecordRow>
            : <div key={index} className="ledger-row">{content}</div>
        }) : <Empty title="No participant shares available" />}
      </section>
      <section className="panel detail-panel">
        <div className="section-heading"><h2>Expense total</h2><Status value={shares.length ? splitStatus(split, state.requests) : split.status} /></div>
        <p className="detail-amount">{money(split.amount)}</p>
        <Facts entries={[
          ['Method', ({ equal: 'Equal', custom: 'Custom' })[split.method] || '—'],
          ['Created', dateLabel(split.createdAt, true)], ['Split ID', split.id],
          ['Source payment', split.sourcePaymentId ? source ? <AppLink to={recordPath('activity', source.id)}>View payment</AppLink> : 'Payment unavailable' : null],
        ]} />
      </section>
    </div>
  </>
}

const months = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, index, 1))))

export function Statements() {
  const { state, commit } = useAccount()
  const { announce } = useWorkspace()
  const now = new Date()
  const history = postedPayments(state)
  const mostRecent = history.length ? new Date(postedAt(history[0])) : now
  const [year, setYear] = useState(mostRecent.getUTCFullYear())
  const [month, setMonth] = useState(mostRecent.getUTCMonth() + 1)
  const [error, setError] = useState('')
  const years = [...new Set([now.getUTCFullYear(), now.getUTCFullYear() - 1, year,
    ...history.map((payment) => new Date(postedAt(payment)).getUTCFullYear())])].sort((a, b) => b - a)
  const { rows, totalIncoming, totalOutgoing } = statement(state, year, month)

  function download() {
    setError('')
    try {
      let result
      commit((latest) => {
        result = exportStatement(latest, year, month)
        return result.state
      })
      const url = URL.createObjectURL(new Blob([result.csv], { type: 'text/csv;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = result.filename
      document.body.append(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      announce('Statement downloaded.')
    } catch (failure) {
      setError(failure.message)
    }
  }

  return <>
    <Heading title="Statements" description="Review and download your monthly payment history." />
    <section className="panel">
      <div className="toolbar period-toolbar">
        <div className="period-controls">
          <Field id="month" label="Month"><select id="month" value={month} onChange={(event) => setMonth(Number(event.target.value))}>{months.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}</select></Field>
          <Field id="year" label="Year"><select id="year" value={year} onChange={(event) => setYear(Number(event.target.value))}>{years.map((value) => <option key={value}>{value}</option>)}</select></Field>
        </div>
        <button className="primary" onClick={download}><Icon name="down" />Download CSV</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="statement-totals">
        <div><span>Incoming</span><strong className="positive">{money(totalIncoming)}</strong></div>
        <div><span>Outgoing</span><strong>{money(totalOutgoing)}</strong></div>
        <div><span>Net total</span><strong>{money(dollars(cents(totalIncoming) - cents(totalOutgoing)))}</strong></div>
      </div>
      <SectionHeader title={months[month - 1] + ' ' + year} />
      {rows.length ? <div className="table-wrap"><table className="statement-table" aria-label="Posted payments">
        <thead><tr><th scope="col">Date (UTC)</th><th scope="col">Payment ID</th><th scope="col">Counterparty</th><th scope="col">Note</th><th scope="col">Amount</th></tr></thead>
        <tbody>{rows.map((row, index) => <tr key={row.id ?? index}>
          <td data-label="Date (UTC)"><time dateTime={row.date}>{dateLabel(row.date, true)}</time></td>
          <td data-label="Payment ID">{row.id ? <AppLink to={recordPath('activity', row.id)}>{row.id}</AppLink> : '—'}</td>
          <td data-label="Counterparty">{row.counterparty}</td><td data-label="Note">{row.note || '—'}</td>
          <td data-label="Amount" className={row.amount > 0 ? 'positive' : ''}>{signedMoney(dollars(Math.abs(row.amount)), row.amount > 0)}</td>
        </tr>)}</tbody>
      </table></div> : <Empty title="No posted payments this month">You can still download a statement for this period.</Empty>}
    </section>
  </>
}
