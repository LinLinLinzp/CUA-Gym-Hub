import { useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useWorkspace } from '../context/Workspace.jsx'
import { calendarDate, compareDates, find, label, leaveTypes, list, searchMatches, utcDate, vacationBalance, weekdays, workerFor } from '../data/model.js'
import { requestedDays, resolveRequest, saveRequest } from '../data/timeOff.js'
import {
  Badge, cols, Confirm, DateText, ErrorText, Facts, Field, Missing, PageTitle, PagedTable, Panel, Person,
  recordPath, RouteLink, Search, Select, useFilters, useGo,
} from '../components/ui.jsx'

const defaults = { query: '', status: '', type: '' }
const back = ['/time-off', 'Back to time off']
const statuses = ['pending', 'approved', 'denied', 'cancelled']
const typeOptions = Object.entries(leaveTypes)
const days = quantity => quantity == null ? '—' : quantity + (Number(quantity) === 1 ? ' day' : ' days')
const views = [['requests', 'Requests'], ['balances', 'Balances'], ['calendar', 'Team calendar']]

export function TimeOff() {
  const { search } = useLocation()
  const view = new URLSearchParams(search).get('view') || 'requests'
  const active = views.some(([id]) => id === view) ? view : 'requests'
  return <>
    <PageTitle title="Time off" description="Review requests, vacation balances, and planned absences."
      actions={<RouteLink className="button primary" to="/time-off/new">Request time off</RouteLink>} />
    <nav className="view-tabs" aria-label="Time off views">
      {views.map(([id, name]) => <RouteLink key={id} to={id === 'requests' ? '/time-off' : '/time-off?view=' + id}
        aria-current={active === id ? 'page' : undefined}>{name}</RouteLink>)}
    </nav>
    {active === 'balances' ? <Balances /> : <Requests key={search} calendar={active === 'calendar'} />}
  </>
}

function Requests({ calendar }) {
  const { state } = useWorkspace()
  const [filters, set, clear] = useFilters(defaults)
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const monthStart = calendarDate(month)
  const monthEnd = calendarDate(new Date(month.getFullYear(), month.getMonth() + 1, 0))
  const workers = new Map(list(state.workers).filter(worker => worker.id).map(worker => [worker.id, worker]))
  const rows = list(state.timeOffRequests).filter(item => (!calendar || (
    item.status === 'approved' && utcDate(item.startDate) && utcDate(item.endDate) &&
    item.startDate <= monthEnd && item.endDate >= monthStart && item.startDate <= item.endDate
  )) && (calendar || !filters.status || item.status === filters.status) && (!filters.type || item.type === filters.type) &&
    searchMatches(filters.query, workers.get(item.workerId)?.name))
    .sort((a, b) => calendar ? compareDates(a.startDate, b.startDate) : compareDates(a.createdAt || a.startDate, b.createdAt || b.startDate, -1))
  const monthTitle = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(month)
  const navigateMonth = direction => setMonth(previous => new Date(previous.getFullYear(), previous.getMonth() + direction, 1))
  return <Panel title={calendar ? monthTitle : undefined} action={calendar && <div className="actions">
    <button onClick={() => navigateMonth(-1)}>Previous month</button>
    <button onClick={() => navigateMonth(1)}>Next month</button>
  </div>}>
    <div className="filters">
      <Search label="Search workers" value={filters.query} onChange={value => set('query', value)} placeholder="Employee name" />
      {!calendar && <Select label="Status" value={filters.status} onChange={value => set('status', value)}
        options={[[ '', 'All statuses'], ...statuses.map(status => [status, label(status)])]} />}
      <Select label="Leave type" value={filters.type} onChange={value => set('type', value)} options={[[ '', 'All types'], ...typeOptions]} />
      <button onClick={clear}>Clear filters</button>
    </div>
    {calendar && <MonthGrid month={month} title={monthTitle} rows={rows} />}
    <PagedTable columns={cols('Employee', 'Leave type', 'Start date', 'End date', 'Quantity', 'Status', 'Details')}
      rows={rows} resetKey={JSON.stringify([filters, calendar && monthStart])} noun="requests" caption={calendar ? 'Approved leave in ' + monthTitle : 'Time off requests'}
      empty={calendar ? 'No approved leave this month' : 'No time off requests found'}
      render={(item, index) => <tr key={item.id ?? index}>
        <td><Person name={workers.get(item.workerId)?.name} /></td><td>{label(item.type)}</td>
        <td><DateText value={item.startDate} /></td><td><DateText value={item.endDate} /></td>
        <td>{days(item.days)}</td><td><Badge status={item.status} /></td>
        <td>{item.id && <RouteLink to={recordPath('/time-off', item.id)} aria-label={'View request for ' + (workers.get(item.workerId)?.name || item.id)}>View request</RouteLink>}</td>
      </tr>} />
  </Panel>
}

function MonthGrid({ month, title, rows }) {
  const year = month.getFullYear()
  const index = month.getMonth()
  const first = (month.getDay() + 6) % 7
  const length = new Date(year, index + 1, 0).getDate()
  const weekdayLabels = [['M', 'Monday'], ['T', 'Tuesday'], ['W', 'Wednesday'], ['T', 'Thursday'], ['F', 'Friday'], ['S', 'Saturday'], ['S', 'Sunday']]
  const cells = Array.from({ length: Math.ceil((first + length) / 7) * 7 }, (_, offset) => {
    const day = offset - first + 1
    if (day < 1 || day > length) return <li key={offset} aria-hidden="true" className="outside-month" />
    const date = calendarDate(new Date(year, index, day))
    const count = weekdays(date, date) ? rows.filter(item => item.startDate <= date && date <= item.endDate).length : 0
    return <li key={offset}><time dateTime={date}>{day}</time>
      {count > 0 && <span className="calendar-count" aria-label={count + ' approved requests'}>{count}</span>}
    </li>
  })
  return <div className="month-grid" role="group" aria-label={title + ' team calendar'}>
    <div className="weekday-labels">{weekdayLabels.map(([short, full]) => <abbr key={full} title={full}>{short}</abbr>)}</div>
    <ol>{cells}</ol>
  </div>
}

function Balances() {
  const { state } = useWorkspace()
  const [query, setQuery] = useState('')
  const year = new Date().getFullYear()
  const rows = list(state.workers).filter(item => item.type === 'employee' && searchMatches(query, item.name, item.team))
    .sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')))
  return <Panel title={year + ' vacation balances'}>
    <div className="filters"><Search label="Search employees" value={query} onChange={setQuery} placeholder="Employee name or team" />
      <button onClick={() => setQuery('')}>Clear filters</button></div>
    <PagedTable rows={rows} resetKey={query} noun="employees" columns={cols('Employee', 'Team', 'Allowance', 'Approved', 'Available')}
      render={(worker, index) => {
        const balance = vacationBalance(state, worker, year)
        return <tr key={worker.id ?? index}><td><Person name={worker.name} /></td><td>{worker.team || '—'}</td>
          <td>{days(balance.allowance)}</td><td>{days(balance.used)}</td><td><strong>{days(balance.available)}</strong></td></tr>
      }} />
  </Panel>
}

const controls = {
  approved: ['Approve request?', 'Approve request', 'Approve this time off request.'],
  denied: ['Deny request?', 'Deny request', 'Record the decision on this request.'],
  cancelled: ['Withdraw request?', 'Confirm withdrawal', 'Remove this request from the review queue.'],
}
export function TimeOffDetail() {
  const { id } = useParams()
  const { state, commit } = useWorkspace()
  const [action, setAction] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const request = find(state.timeOffRequests, id)
  if (!request) return <Missing noun="Request" back={back} />
  const worker = workerFor(state, request)
  const balance = vacationBalance(state, worker)
  const pending = request.status === 'pending'
  function open(next) {
    setError('')
    setNote('')
    setAction(next)
  }
  async function confirm() {
    const result = await commit(resolveRequest(id, action, note))
    if (result.error) setError(result.error)
    else setAction('')
  }
  return <>
    <PageTitle title="Time off request" back={back} description={worker?.name}
      actions={<><Badge status={request.status} />{pending && <>
        <RouteLink className="button" to={recordPath('/time-off', id) + '/edit'}>Edit request</RouteLink>
        <button className="danger-outline" onClick={() => open('cancelled')}>Withdraw request</button>
        <button onClick={() => open('denied')}>Deny</button>
        <button className="primary" onClick={() => open('approved')}>Approve</button>
      </>}</>} />
    <div className="detail-grid">
      <div className="stack">
        <Panel title="Request details">
          <Facts entries={[
            ['Employee', worker?.name], ['Team', worker?.team], ['Leave type', label(request.type)],
            ['Duration', label(request.duration)], ['Start date', <DateText value={request.startDate} />],
            ['End date', <DateText value={request.endDate} />], ['Requested time', days(request.days)],
            ['Submitted', <DateText value={request.createdAt} />],
          ]} />
          <p className="prose"><strong>Request note</strong></p><p className="prose">{request.note || 'No note provided.'}</p>
        </Panel>
        {(request.reviewedAt || request.cancelledAt) && <Panel title="Review history">
          <Facts entries={[
            ['Reviewed by', request.reviewedBy === state.currentUser?.id ? state.currentUser?.name : request.reviewedBy],
            ['Reviewed on', <DateText value={request.reviewedAt} />], ['Decision note', request.decisionNote],
            ['Withdrawn on', <DateText value={request.cancelledAt} />],
          ]} />
        </Panel>}
      </div>
      <Panel title="Vacation balance">
        <Facts entries={[[ 'Year', new Date().getFullYear()], ['Available', days(balance.available)], ['Allowance', days(balance.allowance)], ['Approved', days(balance.used)]]} />
      </Panel>
    </div>
    {action && <Confirm title={controls[action][0]} confirmLabel={controls[action][1]} danger={action !== 'approved'}
      error={error} onClose={() => setAction('')} onConfirm={confirm}>
      <p>{controls[action][2]}</p>
      {action === 'denied' && <Field label="Denial reason (optional)"><textarea value={note} onChange={event => setNote(event.target.value)} /></Field>}
    </Confirm>}
  </>
}

export function TimeOffForm() {
  const { id } = useParams()
  const { state } = useWorkspace()
  const request = find(state.timeOffRequests, id)
  if (id && !request) return <Missing noun="Request" back={back} />
  if (request && request.status !== 'pending') return <Missing noun="Pending request" back={[recordPath('/time-off', id), 'Back to request']} />
  return <RequestEditor key={id || 'new'} existing={request} />
}

function RequestEditor({ existing }) {
  const { state, commit } = useWorkspace()
  const go = useGo()
  const saving = useRef(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(() => ({
    workerId: existing?.workerId || '', type: existing?.type || 'vacation', startDate: existing?.startDate || '',
    endDate: existing?.endDate || '', duration: existing?.duration || 'full_day', note: existing?.note || '',
  }))
  const employees = list(state.workers).filter(item => item.type === 'employee' && item.id)
  const update = (name, value) => setForm(previous => ({ ...previous, [name]: value }))
  const backLink = existing ? [recordPath('/time-off', existing.id), 'Back to request'] : back
  const balance = vacationBalance(state, find(employees, form.workerId))
  function dateField(title, name) {
    return <Field label={title}><input type="date" required value={form[name]} onChange={event => update(name, event.target.value)} /></Field>
  }
  async function submit(event) {
    event.preventDefault()
    if (saving.current) return
    saving.current = true
    const result = await commit(saveRequest(form, existing?.id))
    if (result.error) {
      saving.current = false
      setError(result.error)
    } else {
      go(recordPath('/time-off', result.id), { replace: true })
    }
  }
  return <>
    <PageTitle title={existing ? 'Edit request' : 'Request time off'} back={backLink} />
    <Panel className="form-panel">
      <form onSubmit={submit}>
        <div className="form-grid">
          <Select label="Employee" value={form.workerId} onChange={value => update('workerId', value)}
            options={[[ '', 'Select an employee'], ...employees.map(item => [item.id, item.name || item.email || item.id])]} />
          <Select label="Leave type" value={form.type} onChange={value => update('type', value)} options={typeOptions} />
          {dateField('Start date', 'startDate')}{dateField('End date', 'endDate')}
          <Select label="Duration" value={form.duration} onChange={value => update('duration', value)}
            options={[[ 'full_day', 'Full day'], ['half_day', 'Half day']]} />
          <div className="review-strip" aria-live="polite">
            <strong>{days(requestedDays(form))} requested</strong>
            <div>{balance.available === null ? 'Vacation balance unavailable' : days(balance.available) + ' vacation available'}</div>
          </div>
          <div className="full"><Field label="Note (optional)"><textarea value={form.note} onChange={event => update('note', event.target.value)} /></Field></div>
        </div>
        <ErrorText message={error} />
        <div className="actions form-actions"><RouteLink className="button" to={backLink[0]}>Cancel</RouteLink>
          <button className="primary">{existing ? 'Save changes' : 'Submit request'}</button></div>
      </form>
    </Panel>
  </>
}
