import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { responders, snapshot } from './coverage.js'
import { changesFor, createStamp, dateLabel, editStamp, event, find, label, list, named, open, put, relative, uid, useStore, withEvents } from './store.jsx'
import { ActionLink, Badge, Confirm, Dialog, Empty, Field, FormError, GoLink, Heading, Missing, Options, Pager, Search, useGo } from './ui.jsx'

const base = '/incidents'
const pathFor = id => base + '/' + encodeURIComponent(id)
const pageSize = 12
const statusTabs = ['open', 'triggered', 'acknowledged', 'resolved', 'all']
const priorities = ['P1', 'P2', 'P3', 'P4', 'P5']
const activityLabels = { 'incident.created': 'Incident created', 'incident.acknowledged': 'Incident acknowledged', 'incident.resolved': 'Incident resolved', 'incident.reassigned': 'Incident reassigned', 'incident.updated': 'Incident updated', 'incident.note_added': 'Note added' }
const assignText = (state, item) => list(item.assigneeIds).map(id => label(state.users, id, 'Unavailable responder')).join(', ') || 'Unassigned'
const incidentNo = item => item.number == null ? '—' : '#' + item.number
const byNewest = (a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)
const canChange = (item, action) => action === 'acknowledge' ? item.status === 'triggered' : open(item)

function lifecycle(current, actor, now, ids, action) {
  const events = []
  const incidents = list(current.incidents).map(item => {
    if (!ids.includes(item.id) || !canChange(item, action)) return item
    const status = action === 'acknowledge' ? 'acknowledged' : 'resolved'
    events.push(event('incident.' + status, 'incident', item.id, actor, now, { previousStatus: item.status, status }))
    const patch = action === 'acknowledge' ? { assigneeIds: [actor], acknowledgedAt: now, acknowledgedBy: actor } : { resolvedAt: now, resolvedBy: actor }
    return { ...item, status, ...patch, ...editStamp(actor, now) }
  })
  return events.length ? withEvents({ ...current, incidents }, events) : 'No selected incidents can be changed.'
}
export function Incidents() {
  const { state, commit } = useStore()
  const [status, setStatus] = useState('open')
  const [query, setQuery] = useState('')
  const [service, setService] = useState('')
  const [urgency, setUrgency] = useState('')
  const [mine, setMine] = useState(false)
  const [sort, setSort] = useState('new')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState([])
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState('')
  const items = list(state.incidents)
  const isStatus = (item, type) => type === 'all' || (type === 'open' ? open(item) : item.status === type)
  const search = query.trim().toLowerCase()
  const filtered = items.filter(item => isStatus(item, status) && (!service || item.serviceId === service) && (!urgency || item.urgency === urgency)
    && (!mine || list(item.assigneeIds).includes(state.account?.currentUserId))
    && (!search || item.title?.toLowerCase().includes(search) || incidentNo(item).includes(search)))
    .sort(sort === 'old' ? (a, b) => byNewest(b, a) : sort === 'urgency' ? (a, b) => Number(b.urgency === 'high') - Number(a.urgency === 'high') || byNewest(a, b) : byNewest)
  const activePage = Math.min(page, Math.max(0, Math.ceil(filtered.length / pageSize) - 1))
  const shown = filtered.slice(activePage * pageSize, (activePage + 1) * pageSize)
  const selectedItems = items.filter(item => selected.includes(item.id))
  const eligible = action => selectedItems.filter(item => canChange(item, action))
  const allOnPage = shown.length > 0 && shown.every(item => selected.includes(item.id))
  const filter = (setter, value) => { setter(value); setPage(0); setSelected([]); setError('') }
  function change(action) {
    const result = commit((current, actor, now) => lifecycle(current, actor, now, selected, action), action === 'acknowledge' ? 'Incidents acknowledged' : 'Incidents resolved')
    if (!result) setSelected([])
    return result
  }
  return <>
    <Heading title="Incidents" description="Triage service alerts and track incident response." actions={<><ActionLink to="/incidents/activity">Activity</ActionLink><ActionLink to="/incidents/new" primary add>Create Incident</ActionLink></>} />
    <section className="surface" aria-label="Incident queue">
      <div className="status-tabs" role="group" aria-label="Incident status">{statusTabs.map(type => <button key={type} type="button" aria-pressed={status === type} onClick={() => filter(setStatus, type)}>{named(type)} <span>{items.filter(item => isStatus(item, type)).length}</span></button>)}</div>
      <div className="toolbar">
        <Search label="Search incidents" placeholder="Search by title or incident #" value={query} onChange={value => filter(setQuery, value)} />
        <select aria-label="Filter by service" value={service} onChange={e => filter(setService, e.target.value)}><Options items={state.services} placeholder="All services" /></select>
        <select aria-label="Filter by urgency" value={urgency} onChange={e => filter(setUrgency, e.target.value)}><option value="">All urgencies</option><option value="high">High urgency</option><option value="low">Low urgency</option></select>
        <select aria-label="Sort incidents" value={sort} onChange={e => filter(setSort, e.target.value)}><option value="new">Newest first</option><option value="old">Oldest first</option><option value="urgency">High urgency first</option></select>
        <label className="check"><input type="checkbox" checked={mine} onChange={e => filter(setMine, e.target.checked)} />Assigned to me</label>
      </div>
      {selectedItems.length > 0 && <div className="bulk">
        <strong>{selectedItems.length} selected</strong>
        <button onClick={() => setError(change('acknowledge'))} disabled={!eligible('acknowledge').length}>Acknowledge ({eligible('acknowledge').length})</button>
        <button onClick={() => setConfirm(true)} disabled={!eligible('resolve').length}>Resolve ({eligible('resolve').length})</button>
        <button onClick={() => setSelected([])}>Clear selection</button>
        {selectedItems.length > 1 && <small>Acknowledge: {eligible('acknowledge').map(incidentNo).join(', ') || 'none'} · Resolve: {eligible('resolve').map(incidentNo).join(', ') || 'none'}</small>}
        <FormError>{error}</FormError>
      </div>}
      {shown.length ? <div className="table-wrap"><table className="table responsive incidents-table"><thead><tr>
        <th><input type="checkbox" aria-label="Select all incidents on this page" checked={allOnPage} onChange={() => setSelected(allOnPage ? selected.filter(id => !shown.some(item => item.id === id)) : [...new Set([...selected, ...shown.map(item => item.id)])])} /></th>
        <th>Incident</th><th>Status</th><th>Priority</th><th>Urgency</th><th>Service</th><th>Assignee</th><th>Created</th>
      </tr></thead><tbody>{shown.map(item => <tr key={item.id}>
        <td><input type="checkbox" aria-label={'Select incident ' + incidentNo(item)} checked={selected.includes(item.id)} onChange={e => setSelected(e.target.checked ? [...selected, item.id] : selected.filter(id => id !== item.id))} /></td>
        <td><small className="incident-number mono">{incidentNo(item)}</small><GoLink to={pathFor(item.id)}>{item.title || 'Untitled incident'}</GoLink></td>
        <td data-label="Status"><Badge value={item.status}>{named(item.status)}</Badge></td><td data-label="Priority"><Badge value={item.priority} /></td><td data-label="Urgency"><Badge value={item.urgency}>{named(item.urgency)}</Badge></td>
        <td data-label="Service">{label(state.services, item.serviceId, 'Unavailable service')}</td><td data-label="Assignee">{assignText(state, item)}</td><td data-label="Created"><time title={dateLabel(item.createdAt, state.account?.timeZone)}>{relative(item.createdAt)}</time></td>
      </tr>)}</tbody></table></div> : <Empty title={items.length ? 'No matching incidents' : 'No incidents yet'} description={items.length ? 'Adjust the filters to find incidents.' : 'Create an incident to start tracking response.'}>{items.length ? <button onClick={() => { filter(setStatus, 'all'); setQuery(''); setService(''); setUrgency(''); setMine(false) }}>Reset filters</button> : <ActionLink to="/incidents/new">Create Incident</ActionLink>}</Empty>}
      <Pager page={activePage} setPage={setPage} total={filtered.length} pageSize={pageSize} />
    </section>
    {confirm && <Confirm title="Resolve selected incidents" action="Resolve incidents" onClose={() => setConfirm(false)} onConfirm={() => change('resolve')}><p>This will resolve {eligible('resolve').map(incidentNo).join(', ')}.</p></Confirm>}
  </>
}

function IncidentFields({ draft, setDraft, errors, servicePicker, children }) {
  const set = key => e => setDraft({ ...draft, [key]: e.target.value })
  return <>
    <Field label="Title" error={errors.title}><input value={draft.title} onChange={set('title')} /></Field>
    {servicePicker}
    <Field label="Description"><textarea value={draft.description} onChange={set('description')} /></Field>
    <div className="form-row">
      <Field label="Urgency"><select value={draft.urgency} onChange={set('urgency')}><option value="high">High</option><option value="low">Low</option></select></Field>
      <Field label="Priority"><select value={draft.priority} onChange={set('priority')}><option value="">No priority</option>{priorities.map(item => <option key={item}>{item}</option>)}</select></Field>
    </div>
    {children}
  </>
}
function applyIncident(state, item, type, actor, now, details) {
  return withEvents({ ...state, incidents: put(state.incidents, item) }, [event(type, 'incident', item.id, actor, now, details)])
}

export function NewIncident() {
  const { state, commit } = useStore()
  const go = useGo()
  const [draft, setDraft] = useState({ title: '', description: '', urgency: 'high', priority: '', serviceId: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const service = find(state.services, draft.serviceId)
  const policy = find(state.escalationPolicies, service?.escalationPolicyId)
  const routed = responders(state, policy, Date.now())
  function submit(e) {
    e.preventDefault()
    const validation = { title: !draft.title.trim() && 'Enter an incident title.', service: !service && 'Choose a service.' }
    setErrors(validation)
    setError('')
    if (Object.values(validation).some(Boolean)) return
    let id
    const result = commit((current, actor, now) => {
      const activeService = find(current.services, draft.serviceId)
      const activePolicy = find(current.escalationPolicies, activeService?.escalationPolicyId)
      const assigneeIds = responders(current, activePolicy, Date.parse(now))
      if (!assigneeIds.length) return 'This service has no eligible responder. Choose another service or update its escalation policy.'
      id = uid()
      const number = list(current.incidents).reduce((max, item) => Number.isSafeInteger(item.number) ? Math.max(max, item.number) : max, 1000) + 1
      const item = {
        id, number, title: draft.title.trim(), description: draft.description.trim(), serviceId: activeService.id, escalationPolicyId: activePolicy.id,
        policySnapshot: snapshot(activePolicy), assignmentTarget: { type: 'escalation_policy', id: activePolicy.id }, assigneeIds,
        status: 'triggered', urgency: draft.urgency, priority: draft.priority || null, acknowledgedAt: null, acknowledgedBy: null, resolvedAt: null, resolvedBy: null,
        ...createStamp(actor, now),
      }
      return applyIncident(current, item, 'incident.created', actor, now, { serviceId: activeService.id, escalationPolicyId: activePolicy.id, assigneeIds })
    }, 'Incident created')
    if (result) setError(result)
    else go(pathFor(id))
  }
  return <><Heading title="Create Incident" description="Choose a service to route the incident to its on-call responders." />
    <form className="surface panel form form-narrow" onSubmit={submit} noValidate>
      <IncidentFields draft={draft} setDraft={setDraft} errors={errors} servicePicker={<Field label="Service" error={errors.service}><select value={draft.serviceId} onChange={e => setDraft({ ...draft, serviceId: e.target.value })}><Options items={state.services} placeholder="Choose a service" /></select></Field>}>
        {service && <div className="callout"><strong>{policy?.name || 'No escalation policy available'}</strong><p>{routed.length ? 'Eligible responders: ' + routed.map(id => label(state.users, id)).join(', ') : 'No eligible responder at this time.'}</p></div>}
      </IncidentFields>
      <FormError>{error}</FormError><div className="form-actions"><button className="primary" type="submit">Create Incident</button><ActionLink to={base}>Cancel</ActionLink></div>
    </form></>
}
function IncidentEdit({ item, close }) {
  const { commit } = useStore()
  const [draft, setDraft] = useState({ title: item.title || '', description: item.description || '', urgency: item.urgency || 'high', priority: item.priority || '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  function submit(e) {
    e.preventDefault()
    if (!draft.title.trim()) { setErrors({ title: 'Enter an incident title.' }); return }
    const result = commit((current, actor, now) => {
      const existing = find(current.incidents, item.id)
      if (!existing) return 'This incident is no longer available.'
      const values = { title: draft.title.trim(), description: draft.description.trim(), urgency: draft.urgency, priority: draft.priority || null }
      if (existing.status === 'acknowledged' && existing.urgency === 'low' && draft.urgency === 'high') Object.assign(values, { status: 'triggered', acknowledgedAt: null, acknowledgedBy: null })
      const changes = changesFor(existing, values)
      if (!Object.keys(changes).length) return 'No changes to save.'
      return applyIncident(current, { ...existing, ...values, ...editStamp(actor, now) }, 'incident.updated', actor, now, { changes })
    }, 'Incident updated')
    if (result) setError(result)
    else close()
  }
  return <Dialog title="Edit incident" onClose={close}><form onSubmit={submit} noValidate>
    <div className="dialog-body"><IncidentFields draft={draft} setDraft={setDraft} errors={errors} /><FormError>{error}</FormError></div>
    <div className="dialog-actions"><button type="button" onClick={close}>Cancel</button><button className="primary" type="submit">Save changes</button></div>
  </form></Dialog>
}
function Reassign({ item, close }) {
  const { state, commit } = useStore()
  const [type, setType] = useState('user')
  const [id, setId] = useState('')
  const [error, setError] = useState('')
  function submit(e) {
    e.preventDefault()
    const result = commit((current, actor, now) => {
      const existing = find(current.incidents, item.id)
      if (!existing || !open(existing)) return 'Only open incidents can be reassigned.'
      const policy = type === 'escalation_policy' ? find(current.escalationPolicies, id) : null
      const assigneeIds = type === 'user' ? (find(current.users, id) ? [id] : []) : responders(current, policy, Date.parse(now))
      if (!assigneeIds.length) return 'Choose a responder or a policy with eligible responders.'
      const assignmentTarget = { type, id }
      const update = {
        assignmentTarget, assigneeIds, status: 'triggered', acknowledgedAt: null, acknowledgedBy: null, ...editStamp(actor, now),
        ...(policy ? { escalationPolicyId: policy.id, policySnapshot: snapshot(policy) } : {}),
      }
      return applyIncident(current, { ...existing, ...update }, 'incident.reassigned', actor, now, { previousAssigneeIds: list(existing.assigneeIds), assigneeIds, assignmentTarget })
    }, 'Incident reassigned')
    if (result) setError(result)
    else close()
  }
  return <Dialog title="Reassign incident" onClose={close}><form onSubmit={submit}>
    <div className="dialog-body">
      <Field label="Assign to"><select value={type} onChange={e => { setType(e.target.value); setId('') }}><option value="user">User</option><option value="escalation_policy">Escalation policy</option></select></Field>
      <Field label={type === 'user' ? 'Responder' : 'Escalation policy'}><select value={id} onChange={e => setId(e.target.value)}><Options items={type === 'user' ? state.users : state.escalationPolicies} /></select></Field>
      <FormError>{error}</FormError>
    </div>
    <div className="dialog-actions"><button type="button" onClick={close}>Cancel</button><button className="primary" type="submit">Reassign</button></div>
  </form></Dialog>
}
export function IncidentDetail() {
  const { id } = useParams()
  const { state, commit } = useStore()
  const [modal, setModal] = useState('')
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState('')
  const [actionError, setActionError] = useState('')
  const item = find(state.incidents, id)
  if (!item) return <Missing title="Incident unavailable" />
  const zone = state.account?.timeZone
  const policy = find(state.escalationPolicies, item.escalationPolicyId)
  const notes = list(state.incidentNotes).filter(entry => entry.incidentId === id).sort(byNewest)
  const history = list(state.activity).filter(entry => entry.entityType === 'incident' && entry.entityId === id).sort(byNewest)
  const close = () => setModal('')
  const change = action => commit((current, actor, now) => lifecycle(current, actor, now, [id], action), action === 'acknowledge' ? 'Incident acknowledged' : 'Incident resolved')
  function addNote(e) {
    e.preventDefault()
    const body = note.trim()
    if (!body) { setNoteError('Enter a note.'); return }
    const result = commit((current, actor, now) => {
      if (!find(current.incidents, id)) return 'This incident is no longer available.'
      const record = { id: uid(), incidentId: id, body, createdBy: actor, createdAt: now }
      return withEvents({ ...current, incidentNotes: [...list(current.incidentNotes), record] }, [event('incident.note_added', 'incident', id, actor, now, { noteId: record.id })])
    }, 'Note added')
    setNoteError(result)
    if (!result) setNote('')
  }
  return <>
    <Heading title={item.title || 'Untitled incident'} actions={<>
      {item.status === 'triggered' && <button className="primary" onClick={() => setActionError(change('acknowledge'))}>Acknowledge</button>}
      {open(item) && <><button onClick={() => setModal('resolve')}>Resolve</button><button onClick={() => setModal('reassign')}>Reassign</button></>}
      <button onClick={() => setModal('edit')}>Edit incident</button>
    </>}><div className="detail-badges"><strong className="mono muted">{incidentNo(item)}</strong><Badge value={item.status}>{named(item.status)}</Badge><Badge value={item.priority} /><Badge value={item.urgency}>{named(item.urgency)} urgency</Badge></div></Heading>
    <FormError>{actionError}</FormError>
    <div className="columns">
      <div className="stack">
        <section className="surface panel"><h2>Incident details</h2><p className="prewrap">{item.description || 'No description provided.'}</p><dl className="metadata"><div><dt>Service</dt><dd>{label(state.services, item.serviceId, 'Unavailable service')}</dd></div><div><dt>Created</dt><dd>{dateLabel(item.createdAt, zone)}</dd></div>{item.acknowledgedAt && <div><dt>Acknowledged</dt><dd>{dateLabel(item.acknowledgedAt, zone)} · {label(state.users, item.acknowledgedBy)}</dd></div>}{item.resolvedAt && <div><dt>Resolved</dt><dd>{dateLabel(item.resolvedAt, zone)} · {label(state.users, item.resolvedBy)}</dd></div>}</dl></section>
        <section className="surface panel"><h2>Activity</h2><ActivityRows entries={history} /></section>
      </div>
      <div className="stack">
        <section className="surface panel"><h2>Assignment</h2><dl className="metadata compact"><div><dt>Assignees</dt><dd>{assignText(state, item)}</dd></div><div><dt>Escalation policy</dt><dd>{policy ? <GoLink to={'/escalation-policies/' + encodeURIComponent(policy.id)}>{policy.name || 'Unnamed policy'}</GoLink> : item.escalationPolicyId ? 'Unavailable policy' : '—'}</dd></div><div><dt>Routing snapshot</dt><dd>{item.policySnapshot ? list(item.policySnapshot.rules).length + ' captured levels' : '—'}</dd></div></dl>
          {list(item.policySnapshot?.rules).length > 0 && <details className="snapshot"><summary>View captured rules</summary><ol>{list(item.policySnapshot.rules).map((rule, index) => <li key={rule.id || index}>{list(rule.targets).map(target => label(target.type === 'schedule' ? state.schedules : state.users, target.id)).join(', ') || 'No targets'} · {rule.delayMinutes ?? '—'} min</li>)}</ol></details>}
        </section>
        <section className="surface panel stack"><h2>Notes</h2><form className="form" onSubmit={addNote}><Field label="Incident note" error={noteError}><textarea value={note} onChange={e => { setNote(e.target.value); setNoteError('') }} placeholder="Write a note…" /></Field><div><button className="primary" type="submit">Add note</button></div></form>
          {notes.length ? <ul className="record-list">{notes.map(entry => <li key={entry.id}><strong>{label(state.users, entry.createdBy, 'Unavailable responder')}</strong><small>{dateLabel(entry.createdAt, zone)}</small><p className="prewrap">{entry.body}</p></li>)}</ul> : <p className="muted">No notes yet.</p>}
        </section>
      </div>
    </div>
    {modal === 'resolve' && <Confirm title="Resolve incident" action="Resolve incident" onClose={close} onConfirm={() => change('resolve')}><p>Resolve {incidentNo(item)} · {item.title}?</p></Confirm>}
    {modal === 'edit' && <IncidentEdit item={item} close={close} />}
    {modal === 'reassign' && <Reassign item={item} close={close} />}
  </>
}
function ActivityRows({ entries, links = false }) {
  const { state } = useStore()
  return entries.length ? <ul className="record-list timeline-list">{entries.map(entry => {
    const linked = links && find(state.incidents, entry.entityId)
    return <li key={entry.id}><strong>{activityLabels[entry.type] || named(entry.type)}</strong><small>{label(state.users, entry.actorId, 'Unavailable responder')} · {dateLabel(entry.createdAt, state.account?.timeZone)}</small>
      {linked && <GoLink to={pathFor(linked.id)}>{incidentNo(linked)} · {linked.title || 'Untitled incident'}</GoLink>}
      {entry.type === 'incident.updated' && <p>Changed {Object.keys(entry.details?.changes || {}).join(', ') || 'incident details'}.</p>}
      {entry.type === 'incident.reassigned' && <p>Assigned to {list(entry.details?.assigneeIds).map(id => label(state.users, id)).join(', ') || 'unassigned'}.</p>}
    </li>
  })}</ul> : <p className="muted">No matching activity.</p>
}
export function IncidentActivity() {
  const { state } = useStore()
  const [type, setType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(0)
  const entries = list(state.activity).filter(entry => entry.entityType === 'incident' && (!type || entry.type === type) && (!from || entry.createdAt?.slice(0, 10) >= from) && (!to || entry.createdAt?.slice(0, 10) <= to)).sort(byNewest)
  return <><Heading title="Incident activity" description="Review recorded response actions. Dates use UTC." actions={<ActionLink to={base}>Back to incidents</ActionLink>} />
    <section className="surface panel form"><div className="form-row">
      <Field label="Event type"><select value={type} onChange={e => { setType(e.target.value); setPage(0) }}><option value="">All events</option>{Object.entries(activityLabels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></Field>
      <Field label="From date"><input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(0) }} /></Field>
      <Field label="Through date"><input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(0) }} /></Field>
    </div><ActivityRows entries={entries.slice(page * pageSize, (page + 1) * pageSize)} links /><Pager page={page} setPage={setPage} total={entries.length} pageSize={pageSize} /></section>
  </>
}
