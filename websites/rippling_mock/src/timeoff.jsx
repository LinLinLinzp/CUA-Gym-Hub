import { useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from './icons.jsx'
import { useNavigate, useParams } from 'react-router-dom'
import { Dialog, Field, Fields, Heading, Missing, Panel, Pill, RouteLink, Table, Toolbar, latest, linkedPeople, options, peopleOptions, useDestination, useForm, useList } from './components.jsx'
import { activePeople, actorId, byId, date, hours, isDate, label, newId, person, rows, stamp, today, weekdayHours } from './data/format.js'
import { useWorkspace } from './workspace.jsx'

const back = ['/time-off', 'Time Off']
const types = ['vacation', 'sick', 'personal']
const balanceFor = (state, request) => rows(state.ptoBalances).find((balance) => balance.employeeId === request.employeeId && balance.type === request.type)
const remaining = (balance) => Number.isFinite(balance?.allocatedHours) && Number.isFinite(balance.usedHours) ? balance.allocatedHours - balance.usedHours : null

function requestLeave(state, values) {
  const { employeeId, type, startDate, endDate } = values
  const errors = {}
  if (!employeeId || !byId(activePeople(state), employeeId)) errors.employeeId = 'Select an active employee.'
  if (!types.includes(type)) errors.type = 'Select a time-off type.'
  if (!isDate(startDate)) errors.startDate = 'Enter a valid start date.'
  if (!isDate(endDate) || (!errors.startDate && endDate < startDate)) errors.endDate = 'Enter a valid date on or after the start date.'
  const duration = weekdayHours(startDate, endDate)
  if (!errors.startDate && !errors.endDate && !duration) errors.endDate = 'Include at least one weekday.'
  const requests = rows(state.ptoRequests)
  if (!Object.keys(errors).length && requests.some((record) => record.employeeId === employeeId &&
    ['pending', 'approved'].includes(record.status) && record.startDate <= endDate && record.endDate >= startDate)) {
    errors.endDate = 'This employee already has a pending or approved request during these dates.'
  }
  if (Object.keys(errors).length) return { errors }
  const id = newId('pto')
  const record = {
    id, employeeId, type, startDate, endDate, hours: duration, note: values.note?.trim() || null,
    status: 'pending', actorId: actorId(state), createdAt: new Date().toISOString(), updatedAt: null,
  }
  return { id, message: 'Time-off request submitted.', next: { ...state, ptoRequests: [...requests, record] } }
}

function decisionIssue(state, request, action) {
  const current = request?.status
  if (!(current === 'pending' || (current === 'approved' && action === 'cancelled'))) return 'This request has already been reviewed.'
  if (!request.employeeId || !request.type || !Number.isFinite(request.hours) || request.hours <= 0) return 'An employee, time-off type, and valid request hours are required.'
  if (action === 'approved') {
    const available = remaining(balanceFor(state, request))
    if (available === null) return 'A complete time-off balance is required to approve this request.'
    if (available < request.hours) return 'The employee has insufficient remaining hours.'
  }
  if (action === 'cancelled' && current === 'approved') {
    const used = balanceFor(state, request)?.usedHours
    if (!Number.isFinite(used) || used < request.hours) return 'A balance with enough used hours is required to cancel approved time off.'
  }
  return ''
}

function decideLeave(state, requestId, action, note) {
  const request = byId(state.ptoRequests, requestId)
  const issue = decisionIssue(state, request, action)
  if (issue) return { errors: { form: issue } }
  if (action === 'declined' && !note?.trim()) return { errors: { note: 'Enter a reason for declining this request.' } }
  const createdAt = new Date().toISOString()
  const balanceDeltaHours = action === 'approved' ? request.hours : action === 'cancelled' && request.status === 'approved' ? -request.hours : 0
  const balance = balanceFor(state, request)
  const event = {
    id: newId('pac'), requestId, employeeId: request.employeeId, action, status: action, hours: request.hours, balanceDeltaHours,
    note: note?.trim() || null, actorId: actorId(state), createdAt,
  }
  return {
    message: `Time-off request ${action}.`,
    next: {
      ...state,
      ptoRequests: rows(state.ptoRequests).map((record) => record.id === requestId ? { ...record, status: action, updatedAt: createdAt } : record),
      ...(balanceDeltaHours ? { ptoBalances: rows(state.ptoBalances).map((row) => row === balance ? { ...row, usedHours: row.usedHours + balanceDeltaHours } : row) } : {}),
      ptoActions: [...rows(state.ptoActions), event],
    },
  }
}

function NewRequest({ onClose, afterSave }) {
  const { state, commit } = useWorkspace()
  const form = useForm({ startDate: today(), endDate: today() }, onClose, afterSave)
  const preview = weekdayHours(form.values.startDate, form.values.endDate)
  return <Dialog title="Request time off" onClose={onClose} submitText="Submit request" error={form.errors.form}
    onSubmit={() => form.finish(commit((snapshot) => requestLeave(snapshot, form.values)))}>
    <div className="form-grid">
      <Field title="Employee" required choices={peopleOptions(activePeople(state))} {...form.field('employeeId')} />
      <Field title="Time-off type" required choices={types} {...form.field('type')} />
      <Field title="Start date" type="date" required {...form.field('startDate')} />
      <Field title="End date" type="date" required {...form.field('endDate')} />
      <p className="preview full" aria-live="polite"><strong>{hours(preview)}</strong> · {preview / 8} {preview === 8 ? 'weekday' : 'weekdays'} at 8 hours per day</p>
      <div className="full"><Field title="Note (optional)" area {...form.field('note')} /></div>
    </div>
  </Dialog>
}

const decisionLabels = { approved: 'Approve request', declined: 'Decline request', cancelled: 'Cancel request' }

function Decision({ request, action, onClose }) {
  const { state, commit } = useWorkspace()
  const form = useForm({}, onClose)
  return <Dialog title={decisionLabels[action]} onClose={onClose} error={form.errors.form}
    submitText={action === 'cancelled' ? 'Confirm cancellation' : decisionLabels[action]}
    onSubmit={() => form.finish(commit((snapshot) => decideLeave(snapshot, request.id, action, form.values.note)))}>
    <p>{person(state, request.employeeId)} · {label(request.type)} · {hours(request.hours)}</p>
    {action === 'declined' && <Field title="Reason for declining" required area {...form.field('note')} />}
    {action === 'approved' && <p className="subtle">Approval adds {hours(request.hours)} to the employee’s used balance.</p>}
    {action === 'cancelled' && request.status === 'approved' && <p className="subtle">Cancellation returns {hours(request.hours)} to the employee’s remaining balance.</p>}
  </Dialog>
}

function Requests({ emptyAction }) {
  const { state } = useWorkspace()
  const requests = rows(state.ptoRequests)
  const list = useList('startDate', 'desc')
  const columns = [
    ['employeeId', 'Employee', (record) => <RouteLink to={`/time-off/${record.id}`}>
      {person(state, record.employeeId)}<small>{record.id}</small>
    </RouteLink>],
    ['type', 'Type', (record) => label(record.type)],
    ['startDate', 'Start date', (record) => date(record.startDate), true],
    ['endDate', 'End date', (record) => date(record.endDate)],
    ['hours', 'Hours', (record) => hours(record.hours)],
    ['status', 'Status', (record) => <Pill value={record.status} />],
  ]
  return <>
    <Toolbar list={list} filters={[
      ['employeeId', 'Employees', linkedPeople(requests, state.employees)], ['type', 'Types', options(requests, 'type')], ['status', 'Statuses', options(requests, 'status')],
    ]} />
    <Table columns={columns} records={list.apply(requests)} list={list} noun="requests" emptyAction={emptyAction} />
  </>
}

function Balances() {
  const { state } = useWorkspace()
  const balances = rows(state.ptoBalances)
  const list = useList()
  const columns = [
    ['employeeId', 'Employee', (record) => byId(state.employees, record.employeeId)
      ? <RouteLink to={`/employees/${record.employeeId}`}>{person(state, record.employeeId)}</RouteLink>
      : person(state, record.employeeId)],
    ['type', 'Type', (record) => label(record.type)],
    ['allocatedHours', 'Allocated', (record) => hours(record.allocatedHours)],
    ['usedHours', 'Used', (record) => hours(record.usedHours)],
    ['remaining', 'Remaining', (record) => hours(remaining(record))],
  ]
  return <>
    <Toolbar list={list} filters={[
      ['employeeId', 'Employees', linkedPeople(balances, state.employees)], ['type', 'Types', options(balances, 'type')],
    ]} />
    <Table columns={columns} records={list.apply(balances)} list={list} noun="balances" />
  </>
}

function Calendar() {
  const { state } = useWorkspace()
  const [month, setMonth] = useState(today().slice(0, 7))
  const list = useList()
  const requests = rows(state.ptoRequests).filter((record) => record.status === 'approved')
  const monthDate = new Date(month + '-01T00:00:00Z')
  const offset = (monthDate.getUTCDay() + 6) % 7
  const days = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0)).getUTCDate()
  const title = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(monthDate)
  const visible = list.apply(requests)
  const move = (amount) => {
    monthDate.setUTCMonth(monthDate.getUTCMonth() + amount)
    setMonth(monthDate.toISOString().slice(0, 7))
  }
  return <>
    <Toolbar list={list} filters={[
      ['employeeId', 'Employees', linkedPeople(requests, state.employees)], ['type', 'Types', options(requests, 'type')],
    ]} />
    <div className="panel calendar-panel">
      <div className="calendar-header"><h2>{title}</h2><div className="pagination">
        <button className="icon-button" aria-label="Previous month" onClick={() => move(-1)}><ChevronLeft size={18} /></button>
        <button className="button" onClick={() => setMonth(today().slice(0, 7))}>Current month</button>
        <button className="icon-button" aria-label="Next month" onClick={() => move(1)}><ChevronRight size={18} /></button>
      </div></div>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Time-off calendar"><div className="calendar-grid">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <strong className="weekday" key={day}>{day}</strong>)}
        {Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => {
          const day = index - offset + 1
          if (day < 1 || day > days) return <div key={index} className="calendar-cell outside" />
          const key = `${month}-${String(day).padStart(2, '0')}`
          return <div key={index} className="calendar-cell"><time dateTime={key}>{day}</time>
            {visible.filter((record) => record.startDate <= key && record.endDate >= key).map((record) => <RouteLink key={record.id}
              to={`/time-off/${record.id}`} title={label(record.type)}>{person(state, record.employeeId)}</RouteLink>)}
          </div>
        })}
      </div></div>
    </div>
  </>
}

export function TimeOff() {
  const { state } = useWorkspace()
  const [tab, setTab] = useState('Requests')
  const [adding, setAdding] = useState(false)
  const navigate = useNavigate()
  const destination = useDestination()
  const canRequest = activePeople(state).length > 0
  function handleTabKey(event, index) {
    const tabs = Array.from(event.currentTarget.parentElement.querySelectorAll('button'))
    const next = { ArrowLeft: (index + tabs.length - 1) % tabs.length, ArrowRight: (index + 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key]
    if (next === undefined) return
    event.preventDefault()
    tabs[next].focus()
    tabs[next].click()
  }
  return <>
    <Heading title="Time Off" description="Review leave requests and track employee balances." icon={CalendarDays}
      actions={<button className="button primary" disabled={!canRequest} aria-describedby={!canRequest ? 'time-off-reason' : undefined} onClick={() => setAdding(true)}><Plus size={17} />Request time off</button>} />
    {!canRequest && <p className="inline-note" id="time-off-reason">Add an active employee before submitting a request.</p>}
    <div className="tabs" role="tablist" aria-label="Time off views">
      {['Requests', 'Balances', 'Calendar'].map((name, index) => <button type="button" key={name} id={`tab-${name}`} role="tab" aria-controls={`timeoff-${name}`}
        aria-selected={tab === name} tabIndex={tab === name ? 0 : -1} onKeyDown={(event) => handleTabKey(event, index)} onClick={() => setTab(name)}>{name}</button>)}
    </div>
    <div role="tabpanel" id={`timeoff-${tab}`} aria-labelledby={`tab-${tab}`}>
      {tab === 'Requests' ? <Requests emptyAction={canRequest && <button className="button" onClick={() => setAdding(true)}>Request time off</button>} />
        : tab === 'Balances' ? <Balances /> : <Calendar />}
    </div>
    {adding && <NewRequest onClose={() => setAdding(false)} afterSave={(id) => navigate(destination(`/time-off/${id}`))} />}
  </>
}

export function TimeOffDetail() {
  const { state } = useWorkspace()
  const { requestId } = useParams()
  const [action, setAction] = useState(null)
  const request = byId(state.ptoRequests, requestId)
  if (!request) return <Missing back={back} entity="Time-off request" />
  const employee = byId(state.employees, request.employeeId)
  const history = latest(state.ptoActions).filter((entry) => entry.requestId === requestId)
  const balance = balanceFor(state, request)
  const actions = request.status === 'pending' ? ['cancelled', 'declined', 'approved'] : request.status === 'approved' ? ['cancelled'] : []
  const issues = Object.fromEntries(actions.map((value) => [value, decisionIssue(state, request, value)]))
  return <>
    <Heading title={request.type ? `${label(request.type)} request` : 'Time-off request'} description={person(state, request.employeeId)} icon={CalendarDays} back={back} status={request.status}
      actions={actions.length > 0 && actions.map((value) => <button className={`button ${value === 'approved' ? 'primary' : value === 'declined' ? 'danger' : ''}`}
        key={value} disabled={Boolean(issues[value])} aria-describedby={issues[value] ? `issue-${value}` : undefined}
        onClick={() => setAction(value)}>{decisionLabels[value]}</button>)} />
    {actions.filter((value) => issues[value]).map((value) => <p key={value} className="inline-note" id={`issue-${value}`}>{issues[value]}</p>)}
    <div className="detail-grid"><div className="stack">
      <Panel title="Request details"><Fields values={[
        ['Employee', employee ? <RouteLink to={`/employees/${employee.id}`}>{employee.name || employee.id}</RouteLink> : person(state, request.employeeId)],
        ['Time-off type', label(request.type)], ['Start date', date(request.startDate)], ['End date', date(request.endDate)],
        ['Hours requested', hours(request.hours)], ['Submitted', stamp(request.createdAt)], ['Note', request.note], ['Request ID', request.id],
      ]} /></Panel>
    </div><div className="stack">
      <Panel title="Time-off balance"><Fields values={[
        ['Allocated', hours(balance?.allocatedHours)], ['Used', hours(balance?.usedHours)], ['Remaining', hours(remaining(balance))],
      ]} /></Panel>
      <Panel title="Decision history" count={history.length}>
        {history.length ? <ul className="history">{history.map((entry) => <li key={entry.id}><span><strong>{label(entry.action)}</strong>{entry.note && <small>{entry.note}</small>}</span><time>{stamp(entry.createdAt)}</time></li>)}</ul> : <p className="subtle">No decisions recorded.</p>}
      </Panel>
    </div></div>
    {action && <Decision request={request} action={action} onClose={() => setAction(null)} />}
  </>
}
