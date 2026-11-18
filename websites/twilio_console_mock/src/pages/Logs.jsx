import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { newSid, useWorkspace } from '../store.jsx'
import { AppLink, Badge, byId, contains, dateValue, display, Empty, Field, formatDate, Icon, label, List, Missing, Notice, Page, phoneMatches, routeId, rows, statuses, Toolbar, useRouteId, useSidNavigate, utcDate } from '../ui.jsx'

const logPath = '/logs/messaging'
const keys = ['messageSid', 'from', 'to', 'startDate', 'endDate', 'direction', 'status']
const directions = [['', 'All directions'], ['inbound', 'Inbound'], ['outbound', 'Outbound']]
const statusOptions = [['', 'All statuses'], ...statuses.map((value) => [value, label(value)])]

function matches(message, filter) {
  if (!contains(message.id, filter.messageSid) || !phoneMatches(message.from, filter.from) || !phoneMatches(message.to, filter.to)) return false
  if (filter.direction && message.direction !== filter.direction) return false
  if (filter.status && message.status !== filter.status) return false
  if (!filter.startDate && !filter.endDate) return true
  const day = utcDate(message.createdAt)
  return Boolean(day) && (!filter.startDate || day >= filter.startDate) && (!filter.endDate || day <= filter.endDate)
}

function matchingMessages(messages, filters, sort) {
  return rows(messages).filter((item) => matches(item, filters)).sort((a, b) => {
    const first = dateValue(a.createdAt)
    const second = dateValue(b.createdAt)
    if (!Number.isFinite(first)) return Number.isFinite(second) ? 1 : 0
    if (!Number.isFinite(second)) return -1
    return sort === 'oldest' ? first - second : second - first
  })
}

function csvCell(value) {
  let cell = String(value ?? '')
  if (/^[\s\uFEFF]*[=+\-@]|^[\t\r\n]/.test(cell)) cell = "'" + cell
  return '"' + cell.replaceAll('"', '""') + '"'
}

function downloadCsv(items, fileName) {
  const header = 'Timestamp,Message SID,Direction,From,To,Service SID,Status,Segments,Error code'
  const lines = items.map((item) => [
    item.createdAt, item.id, item.direction, item.from, item.to, item.serviceId, item.status, item.segments, item.errorCode,
  ].map(csvCell).join(','))
  const url = URL.createObjectURL(new Blob([header, '\r\n', lines.join('\r\n'), '\r\n'], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  try {
    link.click()
  } finally {
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

export function Logs() {
  const { state, mutate } = useWorkspace()
  const location = useLocation()
  const navigate = useSidNavigate()
  const [notice, setNotice] = useState(null)
  const params = new URLSearchParams(location.search)
  const filters = Object.fromEntries(keys.map((key) => [key, params.get(key) || '']))
  const normalized = Object.fromEntries(keys.map((key) => [key, filters[key].trim()]))
  const sort = params.get('sort') === 'oldest' ? 'oldest' : 'newest'
  const page = Math.max(1, Math.floor(Number(params.get('page')) || 1))
  const invalid = Boolean(filters.startDate && filters.endDate && filters.startDate > filters.endDate)
  const items = invalid ? [] : matchingMessages(state.messages, normalized, sort)
  function listUrl(key, value, resetPage = true) {
    const next = new URLSearchParams(params)
    next.delete('sid')
    if (resetPage) next.delete('page')
    if (key) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    return logPath + (next.size ? '?' + next.toString() : '')
  }
  const bind = (key) => ({
    value: key === 'sort' ? sort : filters[key],
    onChange: (event) => {
      setNotice(null)
      navigate(listUrl(key, event.target.value), { replace: true })
    },
  })
  const clear = () => { setNotice(null); navigate(logPath, { replace: true }) }
  function exportLogs() {
    if (invalid) return
    let count
    try {
      const saved = mutate((previous, now, actor) => {
        const matches = matchingMessages(previous.messages, normalized, sort)
        if (!matches.length) return null
        const fileName = 'messaging-logs-' + now.slice(0, 10) + '.csv'
        const record = {
          id: newSid('EX'), kind: 'messaging_csv', status: 'generated', filters: normalized, sort,
          messageIds: matches.map((item) => item.id), rowCount: matches.length, fileName,
          actorId: actor, createdAt: now,
        }
        downloadCsv(matches, fileName)
        count = matches.length
        return { ...previous, logExports: [...previous.logExports, record] }
      })
      if (saved) setNotice({ text: 'CSV export started for ' + count + (count === 1 ? ' message.' : ' messages.') })
    } catch {
      setNotice({ error: true, text: 'The CSV could not be downloaded. Try exporting again.' })
    }
  }
  return <Page title="Messaging Logs" description="Search message activity and inspect delivery outcomes." action={<button type="button" className="button primary" onClick={exportLogs} disabled={!items.length}><Icon name="download" size={17} />Export CSV</button>}>
    {notice && <Notice error={notice.error}>{notice.text}</Notice>}
    <section className="panel">
      <Toolbar count={items.length} noun="message" clear={clear}>
        <Field label="Message SID" type="search" placeholder="SM…" {...bind('messageSid')} />
        <Field label="From" type="search" placeholder="Sender number" {...bind('from')} />
        <Field label="To" type="search" placeholder="Recipient number" {...bind('to')} />
        <Field label="Start date (UTC)" type="date" {...bind('startDate')} />
        <Field label="End date (UTC)" type="date" error={invalid ? 'End date must be on or after the start date.' : undefined} {...bind('endDate')} />
        <Field label="Direction" options={directions} {...bind('direction')} />
        <Field label="Status" options={statusOptions} {...bind('status')} />
        <Field label="Sort by" options={[['newest', 'Newest first'], ['oldest', 'Oldest first']]} {...bind('sort')} />
      </Toolbar>
      <List pageIndex={page} changePage={(next) => navigate(listUrl('page', next > 1 ? next : '', false), { replace: true })}
        headers={['Time (UTC)', 'Message SID', 'Direction', 'From', 'To', 'Status', 'Segments']} items={items}
        empty={rows(state.messages).length ? <Empty title="No matching messages" action={<button type="button" className="button secondary" onClick={clear}>Clear filters</button>} />
          : <Empty title="No messages yet" action={<AppLink className="button secondary" to="/messaging/send">Send an SMS</AppLink>} />}
        render={(item) => <tr key={item.id}>
          <td className="nowrap">{formatDate(item.createdAt)}</td>
          <td><AppLink className="inline-link mono" to={logPath + '/' + routeId(item.id)} state={{ logBack: listUrl(null, null, false) }}>{item.id}</AppLink></td>
          <td>{label(item.direction)}</td><td className="nowrap">{display(item.from)}</td><td className="nowrap">{display(item.to)}</td>
          <td><Badge value={item.status} /></td><td>{display(item.segments)}</td>
        </tr>} />
    </section>
  </Page>
}

export function LogDetail() {
  const { state } = useWorkspace()
  const id = useRouteId()
  const location = useLocation()
  const message = byId(state.messages, id)
  const storedBack = location.state?.logBack
  const back = typeof storedBack === 'string' && storedBack.startsWith(logPath + '?') ? storedBack : logPath
  if (!message) return <Missing title="Message Details" to={back} back="Messaging Logs" />
  const service = byId(state.messagingServices, message.serviceId)
  const number = byId(state.phoneNumbers, message.phoneNumberId)
  const steps = rows(message.deliverySteps)
  return <Page title="Message Details" description={formatDate(message.createdAt) === '—' ? undefined : formatDate(message.createdAt) + ' UTC'} back={{ to: back, label: 'Messaging Logs' }}>
    <section className="panel narrow">
      <div className="panel-head"><h2>Message summary</h2><Badge value={message.status} /></div>
      <dl className="detail-grid">
        <div><dt>Message SID</dt><dd className="mono">{message.id}</dd></div>
        <div><dt>Direction</dt><dd>{label(message.direction)}</dd></div>
        <div><dt>From</dt><dd>{display(message.from)}</dd></div>
        <div><dt>To</dt><dd>{display(message.to)}</dd></div>
        <div><dt>Messaging service</dt><dd>{service ? <AppLink className="inline-link" to={'/messaging/services/' + routeId(service.id)}>{service.friendlyName || service.id}</AppLink> : display(message.serviceId)}</dd></div>
        <div><dt>Phone Number SID</dt><dd className="mono">{number ? <AppLink className="inline-link" to={'/numbers/' + routeId(number.id)}>{number.id}</AppLink> : display(message.phoneNumberId)}</dd></div>
        <div><dt>Segments</dt><dd>{display(message.segments)}</dd></div>
      </dl>
    </section>
    {(message.errorCode != null || message.errorMessage) && <section className="panel narrow">
      <div className="panel-head"><h2>Delivery error</h2></div>
      <dl className="detail-grid"><div><dt>Error code</dt><dd className="mono">{display(message.errorCode)}</dd></div><div><dt>Explanation</dt><dd>{display(message.errorMessage)}</dd></div></dl>
    </section>}
    <section className="panel narrow">
      <div className="panel-head"><h2>Delivery steps</h2></div>
      {steps.length ? <ol className="timeline">{steps.map((step, index) => <li key={index}>
        <Badge value={step.status} /><span className="muted">{formatDate(step.occurredAt)}{utcDate(step.occurredAt) && ' UTC'}</span>
        {step.detail && <p>{step.detail}</p>}
      </li>)}</ol> : <p className="panel-copy">No delivery steps recorded.</p>}
    </section>
    <section className="panel narrow">
      <div className="panel-head"><h2>Message body</h2></div>
      <p className="detail-text">{display(message.body)}</p>
    </section>
  </Page>
}
