import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { durationMinutes, editableDuration, saveWeek } from '../data/time.js'
import { addDays, dateKey, dateLabel, hours, nameOf } from '../utils/format.js'
import { ErrorNote, Field, Pick } from './ui.jsx'

export function TimeCalendar({ date, entries, onSelect }) {
  const first = date.slice(0, 7) + '-01'
  const month = new Date(first)
  const count = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate()
  const offset = (month.getUTCDay() + 6) % 7
  const days = Array.from({ length: Math.ceil((count + offset) / 7) * 7 }, (_, i) => addDays(first, i - offset))
  const totals = entries.reduce((map, row) => map.set(row.workDate, (map.get(row.workDate) || 0) + (Number(row.durationMinutes) || 0)), new Map())
  return <div className="calendar-grid">
    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <small className="weekday" key={day}>{day}</small>)}
    {days.map(day => <button type="button" key={day} className={`${day === date ? 'selected' : ''} ${day.slice(0, 7) !== first.slice(0, 7) ? 'off-month' : ''}`}
      aria-pressed={day === date} aria-label={dateLabel(day) + (totals.has(day) ? ', ' + hours(totals.get(day)) : '')} onClick={() => onSelect(day)}>
      <strong>{Number(day.slice(-2))}</strong><small>{totals.has(day) ? hours(totals.get(day)) : '—'}</small>
    </button>)}
  </div>
}

const fields = row => ({ clientId: row.clientId || '', projectId: row.projectId || '', serviceId: row.serviceId || '' })
const groupKey = row => JSON.stringify(Object.values(fields(row)))
const cellKey = (group, day) => group + ':' + day
export function WeekGrid({ days, entries, userId }) {
  const { state, commit } = useApp()
  const [pending, setPending] = useState({})
  const [extra, setExtra] = useState([])
  const [adding, setAdding] = useState(false)
  const [newRow, setNewRow] = useState(fields({}))
  const [error, setError] = useState('')
  const groups = new Map()
  for (const entry of entries) {
    if (!days.includes(entry.workDate)) continue
    const key = groupKey(entry)
    const row = groups.get(key) || { ...fields(entry), amounts: {} }
    row.amounts[entry.workDate] = (row.amounts[entry.workDate] || 0) + (Number(entry.durationMinutes) || 0)
    groups.set(key, row)
  }
  for (const row of extra) if (!groups.has(groupKey(row))) groups.set(groupKey(row), { ...row, amounts: {} })
  const dailyTotals = days.map(() => 0)
  const rows = [...groups.entries()].map(([key, row]) => {
    const values = days.map((day, index) => {
      const value = pending[cellKey(key, day)] ?? (row.amounts[day] ? editableDuration(row.amounts[day]) : '')
      dailyTotals[index] += value.trim() ? durationMinutes(value) || 0 : row.amounts[day] || 0
      return value
    })
    return { key, row, values }
  })
  function submit(e) {
    e.preventDefault(); setError('')
    const cells = rows.flatMap(({ key, row }) => days.flatMap(day => cellKey(key, day) in pending
      ? [{ ...fields(row), workDate: day, userId, duration: pending[cellKey(key, day)] }] : []))
    try { commit(current => saveWeek(current, cells), 'Week saved'); setPending({}); setExtra([]) }
    catch (failure) { setError(failure.message) }
  }
  return <section className="card ledger">
    <form onSubmit={submit} noValidate>
      <div className="ledger-bar"><h2>Week of {dateLabel(days[0])}</h2><strong>Week Total {hours(dailyTotals.reduce((sum, minutes) => sum + minutes, 0))}</strong></div>
      <div className="table-scroll week-grid"><table>
        <thead><tr><th>Client / Project / Service</th>{days.map(day => <th key={day}>{dateLabel(day, { weekday: 'short', day: 'numeric' })}</th>)}</tr></thead>
        <tbody>{rows.map(({ key, row, values }) => {
          const label = [row.clientId ? nameOf(state.clients, row.clientId) : 'No Client', row.projectId && nameOf(state.projects, row.projectId), row.serviceId && nameOf(state.services, row.serviceId)].filter(Boolean).join(' / ')
          return <tr key={key}><td>{label}</td>{days.map((day, i) => <td key={day}><input aria-label={`Duration for ${label}, ${dateLabel(day)}`} value={values[i]} placeholder="—" onChange={e => setPending(old => ({ ...old, [cellKey(key, day)]: e.target.value }))} /></td>)}</tr>
        })}</tbody>
        <tfoot><tr><td><strong>Daily Total</strong></td>{dailyTotals.map((minutes, i) => <td key={days[i]}>{hours(minutes)}</td>)}</tr></tfoot>
      </table></div>
      {adding && <div className="inline-editor form-stack week-add">
        <h3>New Row</h3><div className="form-grid">
          <Field label="Client"><Pick rows={state.clients} value={newRow.clientId} empty="No Client" onChange={clientId => setNewRow(old => ({ ...old, clientId, projectId: '' }))} /></Field>
          <Field label="Project"><Pick rows={state.projects.filter(row => row.clientId === newRow.clientId)} value={newRow.projectId} onChange={projectId => setNewRow(old => ({ ...old, projectId }))} empty="No Project" /></Field>
          <Field label="Service"><Pick rows={state.services.filter(row => row.active !== false)} value={newRow.serviceId} onChange={serviceId => setNewRow(old => ({ ...old, serviceId }))} empty="No Service" /></Field>
        </div><div className="form-actions">
          <button className="button" type="button" onClick={() => setAdding(false)}>Cancel</button>
          <button className="button primary" type="button" onClick={() => {
            if (groups.has(groupKey(newRow))) { setError('A row already exists for this client, project and service.'); return }
            setExtra(old => [...old, newRow]); setAdding(false); setError('')
          }}>Add Row</button>
        </div>
      </div>}
      <div className="ledger-bar">
        <button className="button" type="button" onClick={() => { setAdding(!adding); setError(''); setNewRow(fields({})) }}><Plus size={16} />New Row</button>
        <ErrorNote>{error}</ErrorNote><button className="button positive" type="submit" disabled={!Object.keys(pending).length}>Save</button>
      </div>
    </form>
  </section>
}
export function moveMonth(date, offset) {
  const value = new Date(date)
  const year = value.getUTCFullYear(), month = value.getUTCMonth() + offset
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return dateKey(new Date(Date.UTC(year, month, Math.min(last, value.getUTCDate()))))
}
