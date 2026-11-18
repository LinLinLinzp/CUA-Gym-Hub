import React, { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { coverage, dateText, localInput, localOccurrences, parseLocal, scheduleZone, timeline, validTime, validZone, weekDates, weekStart } from './coverage.js'
import { changesFor, createStamp, dateLabel, editStamp, event, find, label, list, open, put, uid, useStore, withEvents } from './store.jsx'
import { ActionLink, Badge, Confirm, Dialog, Empty, EntityLinks, Field, FormError, GoLink, Heading, Missing, Move, Options, Search, move, useGo } from './ui.jsx'

const base = '/schedules'
const pathFor = id => base + '/' + encodeURIComponent(id)
const zones = ['UTC', ...Intl.supportedValuesOf('timeZone')]
const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const policyBase = '/escalation-policies'
const uses = (rules, id) => list(rules).some(rule => list(rule.targets).some(target => target?.type === 'schedule' && target.id === id))
const linkedPolicies = (state, id) => list(state.escalationPolicies).filter(policy => uses(policy.rules, id))
const blockers = (state, id) => ({
  policies: linkedPolicies(state, id),
  incidents: list(state.incidents).filter(incident => open(incident) && uses(incident.policySnapshot?.rules, id)),
})
const overrideDetails = item => ({ overrideId: item.id, userId: item.userId, startAt: item.startAt, endAt: item.endAt })
const cancelOverride = (item, actor, now) => ({ ...item, status: 'canceled', canceledAt: now, canceledBy: actor, ...editStamp(actor, now) })

export function Schedules() {
  const { state } = useStore()
  const [query, setQuery] = useState('')
  const [team, setTeam] = useState('')
  const now = Date.now()
  const items = list(state.schedules)
  const shown = items.filter(item => (!team || item.teamId === team) && (!query.trim() || item.name?.toLowerCase().includes(query.trim().toLowerCase())))
  return <><Heading title="On-Call Schedules" description="See who is on call and manage team rotations." actions={<><ActionLink to={base + '/compare'}>Compare schedules</ActionLink><ActionLink to={base + '/new'} primary add>New Schedule</ActionLink></>} />
    <section className="surface">
      <div className="toolbar"><Search label="Search schedules" value={query} onChange={setQuery} /><select aria-label="Filter by team" value={team} onChange={e => setTeam(e.target.value)}><Options items={state.teams} placeholder="All teams" /></select></div>
      {shown.length ? <div className="table-wrap"><table className="table responsive"><thead><tr><th>Schedule</th><th>Team</th><th>Timezone</th><th>On call now</th><th>Escalation policies</th></tr></thead><tbody>{shown.map(item => {
        const user = coverage(item, state.scheduleOverrides, now).userId
        return <tr key={item.id}><td><GoLink to={pathFor(item.id)}>{item.name || 'Unnamed schedule'}</GoLink></td><td data-label="Team">{label(state.teams, item.teamId)}</td><td data-label="Timezone">{item.timeZone || '—'}</td><td data-label="On call now">{user ? label(state.users, user, 'Unavailable responder') : 'Coverage gap'}</td><td data-label="Policies"><EntityLinks items={linkedPolicies(state, item.id)} base={policyBase} /></td></tr>
      })}</tbody></table></div> : <Empty title={items.length ? 'No matching schedules' : 'No schedules yet'} description={items.length ? 'Adjust the name search or team filter.' : 'Create a schedule to set up on-call coverage.'}>{items.length ? <button onClick={() => { setQuery(''); setTeam('') }}>Reset filters</button> : <ActionLink to={base + '/new'}>New Schedule</ActionLink>}</Empty>}
    </section>
  </>
}

function WeekControls({ offset, setOffset, dates }) {
  return <div className="week-controls"><strong>{dateText(dates[0])} – {dateText(dates[6])}, {dates[6].slice(0, 4)}</strong><div className="actions"><button type="button" onClick={() => setOffset(offset - 1)}>Previous week</button><button type="button" onClick={() => setOffset(0)}>Today</button><button type="button" onClick={() => setOffset(offset + 1)}>Next week</button></div></div>
}
function Timeline({ schedule, offset = 0, setOffset, onShift, effectiveOnly = false, comparisonDates }) {
  const { state } = useStore()
  const zone = scheduleZone(schedule)
  const monday = weekStart(Date.now(), zone)
  const dates = useMemo(() => comparisonDates || weekDates(monday, offset), [comparisonDates, monday, offset])
  const { lanes, start, end, midnights } = useMemo(() => timeline(schedule, state.scheduleOverrides, dates), [schedule, state.scheduleOverrides, dates])
  const [showShifts, setShowShifts] = useState(false)
  const laneList = effectiveOnly ? lanes.slice(-1) : lanes
  const colors = new Map()
  const range = end - start
  const percent = instant => (instant - start) / range * 100
  const nameOf = (shift, lane) => shift.userId ? label(state.users, shift.userId, 'Unavailable responder') : lane.id === 'overrides' ? 'No override' : 'Coverage gap'
  const labelOf = (shift, lane) => nameOf(shift, lane) + ' · ' + dateLabel(new Date(shift.start).toISOString(), zone) + ' – ' + dateLabel(new Date(shift.end).toISOString(), zone)
  const shiftColor = (shift, lane) => {
    if (!shift.userId) return 'gap'
    if (lane.id === 'overrides' || shift.overrideId) return 'override-band'
    if (!colors.has(shift.userId)) colors.set(shift.userId, colors.size % 4)
    return 'shift-' + colors.get(shift.userId)
  }
  return <div className="timeline">
    {setOffset && <WeekControls offset={offset} setOffset={setOffset} dates={dates} />}
    <div className="timeline-grid">
      <div className="lane-name">On-call coverage</div><div className="lane-days">{dates.slice(0, 7).map((date, index) => <span key={date} style={{ left: percent(midnights[index]) + '%', width: (percent(midnights[index + 1]) - percent(midnights[index])) + '%' }}>{dateText(date)}</span>)}</div>
      {laneList.map((lane, index) => <React.Fragment key={lane.id || index}>
        <div className={'lane-name ' + (lane.id === 'effective' ? 'effective' : '')}>{lane.name}</div><div className="lane-track">
          {midnights.slice(1, -1).map(at => <span className="day-rule" key={at} style={{ left: percent(at) + '%' }} />)}
          {lane.shifts.map(shift => {
            const props = { className: 'shift ' + shiftColor(shift, lane), style: { left: percent(shift.start) + '%', width: (percent(shift.end) - percent(shift.start)) + '%' }, title: labelOf(shift, lane) }
            const name = <span>{nameOf(shift, lane)}</span>
            return onShift && shift.userId ? <button type="button" key={shift.start} {...props} aria-label={'Add override for ' + labelOf(shift, lane)} onClick={() => onShift(shift)}>{name}</button> : <span key={shift.start} {...props}>{name}</span>
          })}
        </div>
      </React.Fragment>)}
    </div>
    {onShift && <button className="shift-list-toggle" type="button" aria-expanded={showShifts} onClick={() => setShowShifts(value => !value)}>{showShifts ? 'Hide shift list' : 'Show shift list'}</button>}
    <div className={'shift-lists' + (showShifts ? ' expanded' : '')}>{laneList.map((lane, index) => <details key={lane.id || index} open={lane.id === 'effective'}><summary>{lane.name}</summary><ul className="record-list">{lane.shifts.map(shift => <li key={shift.start}>{onShift && shift.userId ? <button type="button" onClick={() => onShift(shift)}>{nameOf(shift, lane)}</button> : <strong>{nameOf(shift, lane)}</strong>}<small>{dateLabel(new Date(shift.start).toISOString(), zone)} – {dateLabel(new Date(shift.end).toISOString(), zone)}</small></li>)}</ul></details>)}</div>
  </div>
}

function OverrideTime({ label, value, onChange, occurrences, occurrence, onOccurrenceChange, error }) {
  return <>
    <Field label={label} error={error}><input type="datetime-local" value={value} onChange={e => onChange(e.target.value)} /></Field>
    {occurrences.length > 1 && <Field label={label + ' occurrence'}><select value={occurrence} onChange={e => onOccurrenceChange(Number(e.target.value))}>
      {occurrences.map((instant, index) => <option key={instant} value={index}>{index === 0 ? 'First' : 'Second'} occurrence ({new Date(instant).toISOString().slice(11, 16)} UTC)</option>)}
    </select></Field>}
  </>
}

function OverrideForm({ schedule, shift, close }) {
  const { state, commit } = useStore()
  const zone = scheduleZone(schedule)
  const [userId, setUserId] = useState(shift?.userId || '')
  const nowMinute = Math.floor(Date.now() / 60000) * 60000
  const initialStart = shift?.start ?? nowMinute
  const initialEnd = shift?.end ?? nowMinute + 3_600_000
  const [start, setStart] = useState(() => localInput(initialStart, zone))
  const [end, setEnd] = useState(() => localInput(initialEnd, zone))
  const starts = localOccurrences(start, zone)
  const ends = localOccurrences(end, zone)
  const [startOccurrence, setStartOccurrence] = useState(() => Math.max(0, starts.indexOf(Math.floor(initialStart / 60000) * 60000)))
  const [endOccurrence, setEndOccurrence] = useState(() => Math.max(0, ends.indexOf(Math.floor(initialEnd / 60000) * 60000)))
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  function submit(e) {
    e.preventDefault()
    const startAt = overrideInstant(starts[startOccurrence], initialStart)
    const endAt = overrideInstant(ends[endOccurrence], initialEnd)
    const invalid = { user: !find(state.users, userId) && 'Choose a responder.', start: !startAt && 'Enter a valid local start time.', end: !endAt ? 'Enter a valid local end time.' : startAt && endAt <= startAt && 'End must be after start.' }
    setErrors(invalid)
    if (Object.values(invalid).some(Boolean)) return
    const result = commit((current, actor, now) => {
      if (!find(current.schedules, schedule.id) || !find(current.users, userId)) return 'The schedule or responder is no longer available.'
      const item = { id: uid(), scheduleId: schedule.id, userId, startAt, endAt, status: 'active', canceledAt: null, canceledBy: null, ...createStamp(actor, now) }
      return withEvents({ ...current, scheduleOverrides: [...list(current.scheduleOverrides), item] }, [event('schedule.override_added', 'schedule', schedule.id, actor, now, overrideDetails(item))])
    }, 'Override added')
    if (result) setError(result)
    else close()
  }
  return <Dialog title="Add override" onClose={close}><form onSubmit={submit} noValidate>
    <div className="dialog-body"><p className="muted">Enter times in {zone}.</p>
      <Field label="Responder" error={errors.user}><select value={userId} onChange={e => setUserId(e.target.value)}><Options items={state.users} /></select></Field>
      <OverrideTime label="Start" value={start} onChange={value => { setStart(value); setStartOccurrence(0) }} occurrences={starts} occurrence={startOccurrence} onOccurrenceChange={setStartOccurrence} error={errors.start} />
      <OverrideTime label="End" value={end} onChange={value => { setEnd(value); setEndOccurrence(0) }} occurrences={ends} occurrence={endOccurrence} onOccurrenceChange={setEndOccurrence} error={errors.end} /><FormError>{error}</FormError>
    </div><div className="dialog-actions"><button type="button" onClick={close}>Cancel</button><button className="primary" type="submit">Add override</button></div>
  </form></Dialog>
}
function overrideInstant(instant, initial) {
  if (instant === undefined) return null
  return new Date(instant === Math.floor(initial / 60000) * 60000 ? initial : instant).toISOString()
}
function DeleteSchedule({ schedule, close }) {
  const { state, commit } = useStore()
  const go = useGo()
  const { policies, incidents } = blockers(state, schedule.id)
  const blocked = policies.length || incidents.length
  function remove() {
    const result = commit((current, actor, now) => {
      const scheduleNow = find(current.schedules, schedule.id)
      if (!scheduleNow) return 'This schedule is no longer available.'
      const references = blockers(current, schedule.id)
      if (references.policies.length || references.incidents.length) return 'This schedule is still referenced.'
      const canceledOverrideIds = []
      const priorOverrides = list(current.scheduleOverrides)
      const scheduleOverrides = priorOverrides.map(item => {
        if (item.scheduleId !== schedule.id || item.status !== 'active') return item
        canceledOverrideIds.push(item.id)
        return cancelOverride(item, actor, now)
      })
      const next = { ...current, schedules: list(current.schedules).filter(item => item.id !== schedule.id) }
      if (canceledOverrideIds.length) next.scheduleOverrides = scheduleOverrides
      return withEvents(next, [event('schedule.deleted', 'schedule', schedule.id, actor, now, { name: scheduleNow.name || 'Unnamed schedule', canceledOverrideIds })])
    }, 'Schedule deleted')
    if (!result) go(base)
    return result
  }
  return <Confirm title="Delete schedule" action="Delete schedule" danger disabled={Boolean(blocked)} onClose={close} onConfirm={remove}>{blocked ? <>
    <p>This schedule is referenced by the following records.</p>
    {policies.length > 0 && <div><h3>Escalation policies</h3><EntityLinks items={policies} base={policyBase} /></div>}
    {incidents.length > 0 && <div><h3>Open incident snapshots</h3><div className="link-list">{incidents.map(item => <GoLink key={item.id} to={'/incidents/' + encodeURIComponent(item.id)}>{item.number != null ? '#' + item.number + ' · ' : ''}{item.title || 'Untitled incident'}</GoLink>)}</div></div>}
  </> : <p>Delete {schedule.name || 'this schedule'}? Its active overrides will be canceled.</p>}</Confirm>
}
export function ScheduleDetail() {
  const { id } = useParams()
  const { state, commit } = useStore()
  const [offset, setOffset] = useState(0)
  const [modal, setModal] = useState(null)
  const schedule = find(state.schedules, id)
  if (!schedule) return <Missing to={base} title="Schedule unavailable" />
  const overrides = list(state.scheduleOverrides).filter(item => item.scheduleId === id).sort((a, b) => Date.parse(b.startAt) - Date.parse(a.startAt))
  const effective = coverage(schedule, overrides, Date.now())
  const close = () => setModal(null)
  const zone = scheduleZone(schedule)
  function cancel() {
    return commit((current, actor, now) => {
      const existing = find(current.scheduleOverrides, modal.item.id)
      if (!existing || existing.status !== 'active' || existing.scheduleId !== id) return 'This override is no longer active.'
      const record = cancelOverride(existing, actor, now)
      return withEvents({ ...current, scheduleOverrides: put(current.scheduleOverrides, record) }, [event('schedule.override_canceled', 'schedule', id, actor, now, overrideDetails(record))])
    }, 'Override canceled')
  }
  return <><Heading title={schedule.name || 'Unnamed schedule'} description={schedule.description} actions={<>
    <ActionLink to={pathFor(id) + '/edit'}>Edit schedule</ActionLink><button onClick={() => setModal({ type: 'delete' })}>Delete schedule</button><button className="primary" onClick={() => setModal({ type: 'add' })}>Add override</button>
  </>} />
  <div className="stack">
    <section className="surface panel"><dl className="metadata schedule-meta"><div><dt>On call now</dt><dd>{effective.userId ? label(state.users, effective.userId, 'Unavailable responder') : 'Coverage gap'} {effective.override && <Badge value="active">Override</Badge>}</dd></div><div><dt>Team</dt><dd>{label(state.teams, schedule.teamId)}</dd></div><div><dt>Timezone</dt><dd>{zone}</dd></div><div><dt>Escalation policies</dt><dd><EntityLinks items={linkedPolicies(state, id)} base={policyBase} /></dd></div></dl></section>
    <section className="surface panel"><h2>Weekly coverage</h2><Timeline schedule={schedule} offset={offset} setOffset={setOffset} onShift={shift => setModal({ type: 'add', shift })} /></section>
    <section className="surface panel"><h2>Shift overrides</h2>{overrides.length ? <ul className="record-list">{overrides.map(item => <li key={item.id} className="override-row"><div><strong>{label(state.users, item.userId)}</strong> <Badge value={item.status}>{item.status === 'active' ? 'Active' : item.status === 'canceled' ? 'Canceled' : '—'}</Badge><small>{dateLabel(item.startAt, zone)} – {dateLabel(item.endAt, zone)}</small>{item.canceledAt && <small>Canceled {dateLabel(item.canceledAt, zone)} · {label(state.users, item.canceledBy)}</small>}</div>{item.status === 'active' && <button onClick={() => setModal({ type: 'cancel', item })}>Cancel override</button>}</li>)}</ul> : <p className="muted">No overrides for this schedule.</p>}</section>
  </div>
  {modal?.type === 'add' && <OverrideForm schedule={schedule} shift={modal.shift} close={close} />}
  {modal?.type === 'cancel' && <Confirm title="Cancel shift override" action="Cancel override" danger onClose={close} onConfirm={cancel}><p>Return this time range to the regular rotation?</p></Confirm>}
  {modal?.type === 'delete' && <DeleteSchedule schedule={schedule} close={close} />}
  </>
}
function blankLayer(zone) {
  const date = localInput(Date.now(), zone).slice(0, 10)
  return { id: uid(), name: '', userIds: [''], rotationType: 'weekly', rotationDays: '7', startDate: date, handoffTime: '09:00', restrictions: [] }
}
function editorLayer(layer, zone) {
  return { ...layer, name: layer.name || '', userIds: list(layer.userIds).length ? list(layer.userIds) : [''], rotationType: layer.rotationType || 'weekly',
    rotationDays: String(layer.rotationDays || 7), startDate: localInput(layer.startAt, zone).slice(0, 10), handoffTime: layer.handoffTime || '', restrictions: list(layer.restrictions) }
}
function scheduleValues(draft, state) {
  const errors = {}
  if (!draft.name.trim()) errors.name = 'Enter a schedule name.'
  const zoneOk = validZone(draft.timeZone)
  if (!zoneOk) errors.timeZone = 'Enter a valid IANA timezone.'
  if (draft.teamId && !find(state.teams, draft.teamId)) errors.team = 'Choose an available team or leave the schedule without a team.'
  if (!draft.layers.length) errors.layers = 'Add at least one layer.'
  const layers = draft.layers.map((layer, index) => {
    const key = index + '.'
    const userIds = layer.userIds.filter(Boolean)
    if (!layer.name.trim()) errors[key + 'name'] = 'Enter a layer name.'
    if (!userIds.length || userIds.length !== layer.userIds.length || userIds.some(userId => !find(state.users, userId)) || new Set(userIds).size !== userIds.length) errors[key + 'members'] = 'Choose an available responder for each member without duplicates.'
    const rotationDays = layer.rotationType === 'daily' ? 1 : layer.rotationType === 'weekly' ? 7 : Number(layer.rotationDays)
    if (!Number.isSafeInteger(rotationDays) || rotationDays < 1) errors[key + 'rotation'] = 'Enter a positive whole number of days.'
    const localStart = layer.startDate + 'T' + layer.handoffTime
    let startAt = null
    if (zoneOk && validTime(layer.handoffTime)) {
      startAt = localInput(layer.startAt, draft.timeZone) === localStart ? layer.startAt : parseLocal(localStart, draft.timeZone)
    }
    if (!startAt) errors[key + 'start'] = 'Enter a valid start date and handoff time in the schedule timezone.'
    const restrictions = layer.restrictions.map((window, index) => {
      const dayOfWeek = Number(window.dayOfWeek)
      if (dayOfWeek < 1 || dayOfWeek > 7 || !Number.isInteger(dayOfWeek) || !validTime(window.startTime) || !validTime(window.endTime) || window.startTime === window.endTime) errors[key + 'window' + index] = 'Choose a weekday and two different times.'
      return { ...window, dayOfWeek }
    })
    const { startDate, ...saved } = layer
    return { ...saved, name: layer.name.trim(), userIds, rotationDays, startAt, restrictions }
  })
  return { errors, values: { name: draft.name.trim(), description: draft.description.trim(), timeZone: draft.timeZone, teamId: draft.teamId || null, layers } }
}
function LayerEditor({ layer, index, total, users, edit, reorder, remove, errors }) {
  const field = key => e => edit({ ...layer, [key]: e.target.value })
  const error = key => errors[index + '.' + key]
  const updateMember = (position, id) => edit({ ...layer, userIds: layer.userIds.map((value, i) => i === position ? id : value) })
  const updateWindow = (position, key, value) => edit({ ...layer, restrictions: layer.restrictions.map((item, i) => i === position ? { ...item, [key]: value } : item) })
  return <fieldset className="editor-block">
    <legend>Layer {index + 1}</legend><div className="editor-head"><Move index={index} total={total} onMove={reorder} label={'layer ' + (index + 1)} /><button type="button" onClick={remove}>Remove layer</button></div>
    <Field label="Layer name" error={error('name')}><input value={layer.name} onChange={field('name')} /></Field>
    <div className="form-row"><Field label="Rotation cadence"><select value={layer.rotationType} onChange={field('rotationType')}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="custom">Custom days</option></select></Field>
      {layer.rotationType === 'custom' && <Field label="Rotation days" error={error('rotation')}><input type="number" min="1" value={layer.rotationDays} onChange={field('rotationDays')} /></Field>}
      <Field label="Start date" error={error('start')}><input type="date" value={layer.startDate} onChange={field('startDate')} /></Field>
      <Field label="Handoff time"><input type="time" value={layer.handoffTime} onChange={field('handoffTime')} /></Field>
    </div>
    <h3>Members in rotation order</h3>
    {layer.userIds.map((id, position) => <div className="editor-row" key={position}>
      <Field label={'Member ' + (position + 1)}><select value={id} onChange={e => updateMember(position, e.target.value)}>{id && !find(users, id) && <option value={id}>Unavailable responder</option>}<Options items={users} /></select></Field>
      <Move index={position} total={layer.userIds.length} onMove={(i, offset) => edit({ ...layer, userIds: move(layer.userIds, i, offset) })} label={'member ' + (position + 1)} /><button type="button" onClick={() => edit({ ...layer, userIds: layer.userIds.filter((value, i) => i !== position) })}>Remove member</button>
    </div>)}
    {error('members') && <small className="error">{error('members')}</small>}
    <div><button type="button" onClick={() => edit({ ...layer, userIds: [...layer.userIds, ''] })}>Add member</button></div>
    <h3>Recurring time windows</h3>
    {!layer.restrictions.length && <small>Continuous coverage</small>}
    {layer.restrictions.map((window, position) => <div key={position} className="stack window-fields"><div className="editor-row">
      <Field label="Weekday"><select value={window.dayOfWeek} onChange={e => updateWindow(position, 'dayOfWeek', e.target.value)}>{weekdays.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}</select></Field>
      <Field label="Window start"><input type="time" value={window.startTime} onChange={e => updateWindow(position, 'startTime', e.target.value)} /></Field>
      <Field label="Window end"><input type="time" value={window.endTime} onChange={e => updateWindow(position, 'endTime', e.target.value)} /></Field>
      <button type="button" onClick={() => edit({ ...layer, restrictions: layer.restrictions.filter((item, i) => i !== position) })}>Remove window</button>
    </div>{error('window' + position) && <small className="error">{error('window' + position)}</small>}</div>)}
    <div><button type="button" onClick={() => edit({ ...layer, restrictions: [...layer.restrictions, { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }] })}>Add time window</button></div>
  </fieldset>
}
export function ScheduleEditor({ editing = false }) {
  const { id } = useParams()
  const { state, commit } = useStore()
  const go = useGo()
  const existing = editing && find(state.schedules, id)
  const defaultZone = validZone(state.account?.timeZone) ? state.account.timeZone : 'UTC'
  const [draft, setDraft] = useState(() => ({
    name: existing?.name || '', description: existing?.description || '', timeZone: existing?.timeZone || defaultZone, teamId: existing?.teamId || '',
    layers: existing ? list(existing.layers).map(layer => editorLayer(layer, scheduleZone(existing))) : [blankLayer(defaultZone)],
  }))
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [offset, setOffset] = useState(0)
  const zone = scheduleZone(draft)
  const preview = useMemo(() => {
    const { values } = scheduleValues(draft, state)
    return { ...values, id }
  }, [draft, state, id])
  if (editing && !existing) return <Missing to={base} title="Schedule unavailable" />
  const errors = submitted ? scheduleValues(draft, state).errors : {}
  const set = key => e => setDraft({ ...draft, [key]: e.target.value })
  function submit(e) {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(scheduleValues(draft, state).errors).length) return
    let savedId = id
    const result = commit((current, actor, now) => {
      const { errors, values } = scheduleValues(draft, current)
      if (Object.keys(errors).length) return 'Review the schedule fields before saving.'
      const before = editing && find(current.schedules, id)
      if (editing && !before) return 'This schedule is no longer available.'
      const changes = before && changesFor(before, values)
      if (before && !Object.keys(changes).length) return 'No changes to save.'
      savedId = before ? before.id : uid()
      const stamp = before ? editStamp(actor, now) : createStamp(actor, now)
      const item = { ...before, ...values, id: savedId, ...stamp }
      return withEvents({ ...current, schedules: put(current.schedules, item) }, [
        event(before ? 'schedule.updated' : 'schedule.created', 'schedule', savedId, actor, now, before ? { changes } : { layerIds: item.layers.map(layer => layer.id) }),
      ])
    }, editing ? 'Schedule updated' : 'Schedule created')
    if (result) setError(result)
    else go(pathFor(savedId))
  }
  return <><Heading title={editing ? 'Edit schedule' : 'New Schedule'} description={editing ? existing.name : 'Configure an on-call rotation and preview its weekly coverage.'} actions={editing && <button onClick={() => setDeleting(true)}>Delete schedule</button>} />
    <div className="stack"><form className="surface panel form" onSubmit={submit} noValidate>
      <div className="form-row"><Field label="Schedule name" error={errors.name}><input value={draft.name} onChange={set('name')} /></Field>
        <Field label="Timezone" error={errors.timeZone}><input list="schedule-zones" value={draft.timeZone} onChange={set('timeZone')} /></Field><datalist id="schedule-zones">{zones.map(zone => <option key={zone} value={zone} />)}</datalist>
        <Field label="Team" error={errors.team}><select value={draft.teamId} onChange={set('teamId')}>{draft.teamId && !find(state.teams, draft.teamId) && <option value={draft.teamId}>Unavailable team</option>}<Options items={state.teams} placeholder="No team" /></select></Field>
      </div>
      <Field label="Description"><textarea value={draft.description} onChange={set('description')} /></Field>
      <h2>Rotation layers</h2>
      {draft.layers.map((layer, index) => <LayerEditor key={layer.id || index} layer={layer} index={index} total={draft.layers.length} users={state.users} errors={errors}
        edit={next => setDraft({ ...draft, layers: draft.layers.map((item, i) => i === index ? next : item) })}
        reorder={(position, offset) => setDraft({ ...draft, layers: move(draft.layers, position, offset) })}
        remove={() => setDraft({ ...draft, layers: draft.layers.filter((item, i) => i !== index) })} />)}
      {errors.layers && <small className="error">{errors.layers}</small>}
      <div><button type="button" onClick={() => setDraft({ ...draft, layers: [...draft.layers, blankLayer(zone)] })}>Add layer</button></div>
      <FormError>{error}</FormError><div className="form-actions"><button className="primary" type="submit">{editing ? 'Save changes' : 'Create schedule'}</button><ActionLink to={editing ? pathFor(id) : base}>Cancel</ActionLink></div>
    </form>
    <section className="surface panel"><h2>Coverage preview</h2><Timeline schedule={preview} offset={offset} setOffset={setOffset} /></section></div>
    {deleting && <DeleteSchedule schedule={existing} close={() => setDeleting(false)} />}
  </>
}
export function ScheduleCompare() {
  const { state } = useStore()
  const [first, setFirst] = useState('')
  const [second, setSecond] = useState('')
  const [offset, setOffset] = useState(0)
  const zone = validZone(state.account?.timeZone) ? state.account.timeZone : 'UTC'
  const dates = weekDates(weekStart(Date.now(), zone), offset)
  return <><Heading title="Compare schedules" description="Review effective coverage for two rotations." actions={<ActionLink to={base}>Back to schedules</ActionLink>} />
    <div className="stack"><section className="surface panel form"><div className="form-row">
      <Field label="First schedule"><select value={first} onChange={e => setFirst(e.target.value)}><Options items={state.schedules} /></select></Field>
      <Field label="Second schedule"><select value={second} onChange={e => setSecond(e.target.value)}><Options items={state.schedules} /></select></Field>
    </div><WeekControls offset={offset} setOffset={setOffset} dates={dates} /></section>
    {[first, second].map((id, index) => {
      const schedule = find(state.schedules, id)
      return schedule && <section className="surface panel" key={index}><h2>{schedule.name || 'Unnamed schedule'} <small>{scheduleZone(schedule)}</small></h2><Timeline schedule={schedule} comparisonDates={dates} effectiveOnly /></section>
    })}</div>
  </>
}

