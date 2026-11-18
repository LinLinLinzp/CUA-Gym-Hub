import { useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import { companies, dateLabel, forProject, items, localDate, makeId, nameOf, replaceRecord } from '../domain'
import { recordPath, useRouteNavigate } from '../navigation'
import { useWorkspace } from '../state'
import { Button, Dialog, Field, History, MissingRecord, PageHeader, useFields } from '../ui'

const entryTypes = [
  { key: 'weather', label: 'Weather', singular: 'Weather' },
  { key: 'manpower', label: 'Manpower', singular: 'Manpower' },
  { key: 'note', label: 'Notes', singular: 'Note' },
  { key: 'delivery', label: 'Deliveries', singular: 'Delivery' },
]

const fieldSpecs = {
  weather: [
    { name: 'condition', label: 'Condition', required: true },
    { name: 'tempF', label: 'Temperature (°F)', type: 'number', step: 'any', required: true },
    { name: 'observedAt', label: 'Observed At', type: 'time', required: true },
    { name: 'notes', label: 'Notes', area: true },
  ],
  manpower: [
    { name: 'companyId', label: 'Company', required: true },
    { name: 'workerCount', label: 'Worker Count', type: 'number', min: 1, required: true },
    { name: 'hoursPerWorker', label: 'Hours per Worker', type: 'number', step: 'any', max: 24, required: true },
    { name: 'location', label: 'Location' },
    { name: 'description', label: 'Description', area: true },
  ],
  note: [
    { name: 'text', label: 'Note', area: true, required: true },
    { name: 'location', label: 'Location' },
  ],
  delivery: [
    { name: 'companyId', label: 'Company' },
    { name: 'material', label: 'Material', required: true },
    { name: 'quantity', label: 'Quantity', type: 'number', step: 'any', required: true },
    { name: 'unit', label: 'Unit', required: true },
    { name: 'receivedAt', label: 'Received At', type: 'time', required: true },
    { name: 'notes', label: 'Notes', area: true },
  ],
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value + 'T12:00:00')
  return !Number.isNaN(+date) && localDate(date) === value
}

function shiftedDate(value, offset) {
  const date = new Date(value + 'T12:00:00')
  date.setDate(date.getDate() + offset)
  return localDate(date)
}

export function DailyLog() {
  const { date } = useParams()
  const { project, path } = useOutletContext()
  const base = path + '/daily-log'
  if (date && !validDate(date)) return <MissingRecord to={base} tool="Daily Log" />
  const selected = date || localDate()
  return <Day key={project.id + ':' + selected} {...{ project, base, selected }} />
}

function Day({ project, base, selected }) {
  const navigate = useRouteNavigate()
  const { state, commit } = useWorkspace()
  const [modal, setModal] = useState(null)
  const days = forProject(state.dailyLogs, project.id)
  const day = days.find((record) => record.date === selected)
  const dayEntries = day ? items(state.dailyLogEntries).filter((entry) => entry.dailyLogId === day.id) : []
  const complete = day?.status === 'Complete'
  const recordedDates = [...new Set(days.map((record) => record.date).filter(validDate))].sort().reverse()
  const close = () => setModal(null)
  const go = (date) => { if (validDate(date) && date !== selected) navigate(recordPath(base, date)) }
  const completeLabel = complete ? 'Reopen Day' : 'Mark Complete'

  function transition() {
    const status = complete ? 'Open' : 'Complete'
    const saved = commit({ projectId: project.id, entityType: 'dailyLog', action: complete ? 'reopen' : 'complete', message: complete ? 'Day reopened.' : 'Day marked complete.' },
      (previous, { now, actor, updated }) => {
        const current = forProject(previous.dailyLogs, project.id).find((record) => record.date === selected)
        if (!current || (current.status === 'Complete') !== complete) return
        if (!complete && !items(previous.dailyLogEntries).some((entry) => entry.dailyLogId === current.id)) return
        const next = { ...current, status, completedAt: complete ? null : now, completedById: complete ? null : actor, ...updated }
        return { entityId: current.id, previousStatus: current.status || 'Open', newStatus: status,
          patch: { dailyLogs: replaceRecord(previous.dailyLogs, next) } }
      })
    if (!saved) return 'This day is no longer available for this action.'
  }

  function saveEntry(type, entry, details, deleting = false) {
    const action = deleting ? 'delete_entry' : entry ? 'edit_entry' : 'add_entry'
    const saved = commit({ projectId: project.id, entityType: 'dailyLog', action,
      message: deleting ? 'Entry removed.' : entry ? 'Entry saved.' : 'Entry added.' }, (previous, { created, updated }) => {
      const days = items(previous.dailyLogs)
      const entries = items(previous.dailyLogEntries)
      const current = forProject(days, project.id).find((record) => record.date === selected)
      if (current?.status === 'Complete') return
      const existing = entry && entries.find((item) => item.id === entry.id && item.dailyLogId === current?.id && item.type === type)
      if (entry && !existing) return
      const nextDay = current ? { ...current, ...updated } : {
        id: makeId(), projectId: project.id, date: selected, status: 'Open', completedAt: null, completedById: null, ...created, ...updated,
      }
      const id = existing?.id || makeId()
      const nextEntry = existing ? { ...existing, details: { ...existing.details, ...details }, ...updated }
        : { id, dailyLogId: nextDay.id, type, details, ...created }
      const dailyLogEntries = deleting ? entries.filter((item) => item.id !== id)
        : existing ? replaceRecord(entries, nextEntry) : [...entries, nextEntry]
      return {
        entityId: nextDay.id, relatedId: id, entryType: type,
        patch: { dailyLogs: current ? replaceRecord(days, nextDay) : [...days, nextDay], dailyLogEntries },
      }
    })
    if (!saved) return 'This entry is no longer available for editing.'
  }

  return <>
    <PageHeader title="Daily Log" kicker="Project tools" status={day?.status || 'Open'}
      actions={<Button primary disabled={!complete && !dayEntries.length} onClick={() => setModal({ mode: 'complete' })}>{completeLabel}</Button>}>
      {dateLabel(selected, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      {day?.completedAt && ' · Completed ' + dateLabel(day.completedAt)}
    </PageHeader>
    <div className="date-toolbar">
      <Button aria-label="Previous day" onClick={() => go(shiftedDate(selected, -1))}>← Previous</Button>
      <Field label="Log Date" type="date" value={selected} onChange={(event) => go(event.target.value)} />
      <Button aria-label="Next day" onClick={() => go(shiftedDate(selected, 1))}>Next →</Button>
      <Button onClick={() => go(localDate())} disabled={selected === localDate()}>Today</Button>
      {!!recordedDates.length && <div className="field"><label htmlFor="recorded-days">Recorded Days</label>
        <select id="recorded-days" value={recordedDates.includes(selected) ? selected : ''} onChange={(event) => go(event.target.value)}>
          <option value="">Jump to a recorded day</option>
          {recordedDates.map((date) => <option key={date} value={date}>{dateLabel(date)}</option>)}
        </select>
      </div>}
    </div>
    <div className="stack">
      {entryTypes.map((type) => {
        const entries = dayEntries.filter((entry) => entry.type === type.key)
        const crewHours = entries.reduce((sum, { details }) =>
          sum + ((Number(details?.workerCount) || 0) * (Number(details?.hoursPerWorker) || 0)), 0)
        return <section className="panel day-section" key={type.key} aria-label={type.label}>
          <div className="section-heading">
            <div><h2>{type.label}</h2>
              {type.key === 'manpower' && !!entries.length && <p className="muted">{formatQuantity(crewHours)} total crew-hours</p>}
            </div>
            {!complete && <Button onClick={() => setModal({ mode: 'entry', type })}>+ Add {type.singular}</Button>}
          </div>
          {entries.length ? <ul className="record-items">{entries.map((entry) => <li key={entry.id}>
            <div className="item-header">
              <EntrySummary entry={entry} state={state} />
              {!complete && <div className="actions">
                <Button aria-label={'Edit ' + type.singular + ' entry'} onClick={() => setModal({ mode: 'entry', type, entry })}>Edit</Button>
                <Button aria-label={'Remove ' + type.singular + ' entry'} onClick={() => setModal({ mode: 'delete', type, entry })}>Remove</Button>
              </div>}
            </div>
          </li>)}</ul> : <p className="quiet">No entries recorded.</p>}
        </section>
      })}
      {day && <History type="dailyLog" record={day} />}
    </div>
    {modal?.mode === 'entry' && <EntryEditor {...{ project }} type={modal.type} entry={modal.entry} onClose={close}
      onSave={(details) => saveEntry(modal.type.key, modal.entry, details)} />}
    {modal?.mode === 'delete' && <Dialog confirm title="Remove Entry" submitLabel="Remove Entry" onClose={close}
      onSave={() => saveEntry(modal.type.key, modal.entry, null, true)}><p>Remove this {modal.type.singular.toLowerCase()} entry from the daily log?</p></Dialog>}
    {modal?.mode === 'complete' && <Dialog confirm title={completeLabel} submitLabel={completeLabel} onClose={close} onSave={transition}>
      <p>{complete ? 'Reopen this day to make changes to its entries.' : 'Mark this day complete and lock its entries.'}</p>
    </Dialog>}
  </>
}

const formatQuantity = (value) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(value)

function EntrySummary({ entry, state }) {
  const d = entry.details || {}
  const company = nameOf(state.companies, d.companyId, '')
  if (entry.type === 'weather') return <div><strong>{d.condition || 'Weather observation'}</strong>
    <p className="muted">{[d.tempF != null ? d.tempF + '°F' : '', d.observedAt].filter(Boolean).join(' · ')}</p>
    {d.notes && <p className="prose">{d.notes}</p>}</div>
  if (entry.type === 'manpower') return <div><strong>{company || 'Crew'}</strong>
    <p className="muted">{[d.workerCount != null ? d.workerCount + ' workers' : '', d.hoursPerWorker != null ? d.hoursPerWorker + ' hr each' : '',
      d.workerCount != null && d.hoursPerWorker != null ? formatQuantity(d.workerCount * d.hoursPerWorker) + ' crew-hours' : '', d.location].filter(Boolean).join(' · ')}</p>
    {d.description && <p className="prose">{d.description}</p>}</div>
  if (entry.type === 'delivery') return <div><strong>{d.material || 'Delivery'}</strong>
    <p className="muted">{[[d.quantity, d.unit].filter((value) => value != null && value !== '').join(' '), company, d.receivedAt].filter(Boolean).join(' · ')}</p>
    {d.notes && <p className="prose">{d.notes}</p>}</div>
  return <div><p className="prose">{d.text || '—'}</p>{d.location && <span className="muted">{d.location}</span>}</div>
}

function EntryEditor({ project, type, entry, onClose, onSave }) {
  const { state } = useWorkspace()
  const { values, bind } = useFields(entry?.details || {})
  const availableCompanies = companies(state, project)
  const specs = fieldSpecs[type.key]

  return <Dialog title={(entry ? 'Edit ' : 'Add ') + type.singular} onClose={onClose} onSave={() => {
    const details = {}
    for (const spec of specs) {
      const value = String(values[spec.name] ?? '').trim()
      details[spec.name] = spec.type === 'number' ? Number(value) : value
    }
    return onSave(details)
  }}>
    {specs.map(({ name, ...spec }) => <Field key={name} {...spec} {...bind(name)}
      options={name === 'companyId' ? availableCompanies : undefined}
      validate={['hoursPerWorker', 'quantity'].includes(name) ? (value) => Number(value) > 0 ? '' : 'Enter a number greater than zero.' : undefined} />)}
  </Dialog>
}
