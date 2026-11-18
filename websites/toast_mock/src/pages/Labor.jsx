import { useState } from 'react'
import { Plus } from 'lucide-react'
import { amount, audit, dateLabel, localStamp, localTimeOptions, newId, parseMoney, replace, timeLabel, today, updateAudit, within } from '../data/model.js'
import { Badge, Button, Dialog, Field, Header, Ledger, SearchBox, Select } from '../ui.jsx'

const options = rows => rows.map(row => [row.id, row.name ?? row.id])
const editable = ['employeeId', 'jobId', 'businessDate', 'clockIn', 'clockOut', 'breakMinutes', 'workedMinutes', 'cashTipsCents', 'status']
const entrySnapshot = entry => Object.fromEntries(editable.map(field => [field, entry[field] ?? null]))

function clockChoices(stamp, zone, original) {
  if (!stamp) return []
  const originalMinute = original && Math.floor(Date.parse(original) / 60000)
  return localTimeOptions(stamp, zone).map(instant =>
    Math.floor(Date.parse(instant) / 60000) === originalMinute ? original : instant)
}

function ClockField({ label, value, onChange, choices, instant, onInstantChange, zone, required }) {
  const offset = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'shortOffset' })
  return <>
    <Field label={label}><input type="datetime-local" required={required} value={value} onChange={event => {
      onChange(event.target.value)
      onInstantChange('')
    }} /></Field>
    {choices.length > 1 && <Select label={label + ' occurrence'} value={instant ?? ''} onChange={onInstantChange}
      options={choices.map((time, index) => [time, (index === 0 ? 'First' : 'Second') + ' · ' +
        offset.formatToParts(new Date(time)).find(part => part.type === 'timeZoneName').value])} />}
  </>
}

export function Labor({ state, commit }) {
  const [query, setQuery] = useState('')
  const [jobId, setJobId] = useState('')
  const [date, setDate] = useState('')
  const [status, setStatus] = useState('')
  const [editor, setEditor] = useState(null)
  const employees = new Map(state.employees.map(row => [row.id, row.name]))
  const jobs = new Map(state.jobs.map(row => [row.id, row.name]))
  const zone = state.account.timeZone
  const rows = state.timeEntries.filter(row => within(query, employees.get(row.employeeId), row.employeeId) &&
    (!jobId || row.jobId === jobId) && (!date || row.businessDate === date) && (!status || row.status === status))
    .sort((a, b) => String(b.clockIn ?? '').localeCompare(String(a.clockIn ?? '')))
  return <>
    <Header title="Labor" subtitle="Review employee hours and time entry corrections." actions={
      <Button variant="primary" onClick={() => setEditor({})}><Plus size={17} />Add time entry</Button>} />
    <div className="filters">
      <SearchBox label="Search employees" value={query} onChange={setQuery} />
      <Select label="Job" options={options(state.jobs)} blank="All jobs" value={jobId} onChange={setJobId} />
      <Field label="Business date"><input type="date" value={date} onChange={event => setDate(event.target.value)} /></Field>
      <Select label="Entry status" options={[['open', 'Open'], ['closed', 'Closed']]} blank="All statuses" value={status} onChange={setStatus} />
    </div>
    <Ledger label="Time entries" rows={rows} queryKey={[query, jobId, date, status].join('|')} columns={[
      ['Employee', row => employees.get(row.employeeId) ?? 'Unknown employee'], ['Job', row => jobs.get(row.jobId) ?? '—'],
      ['Business date', row => dateLabel(row.businessDate)], ['In', row => timeLabel(row.clockIn, zone)],
      ['Out', row => {
        const stamp = localStamp(row.clockOut, zone)
        const overnight = stamp && stamp.slice(0, 10) !== localStamp(row.clockIn, zone).slice(0, 10)
        return overnight ? stamp.slice(11) + ' · ' + dateLabel(stamp.slice(0, 10)) : timeLabel(row.clockOut, zone)
      }],
      ['Break', row => (row.breakMinutes ?? 0) + ' min'], ['Hours', row => row.workedMinutes == null ? '—' : (row.workedMinutes / 60).toFixed(2)],
      ['Cash tips', row => amount(row.cashTipsCents)], ['Status', row => <Badge value={row.status} />],
      ['', row => <div className="actions">
        <button className="text-button" aria-label={'Correct time entry for ' + (employees.get(row.employeeId) ?? 'employee')} onClick={() => setEditor({ row })}>Correct</button>
        {row.status === 'open' && <button className="text-button" aria-label={'Close time entry for ' + (employees.get(row.employeeId) ?? 'employee')} onClick={() => setEditor({ row, closing: true })}>Close</button>}
      </div>],
    ]} />
    {editor && <EntryEditor {...{ state, commit }} entry={editor.row} closing={editor.closing} close={() => setEditor(null)} />}
  </>
}

function EntryEditor({ state, commit, entry, closing, close }) {
  const zone = state.account.timeZone
  const openingStamp = localStamp(entry?.clockIn, zone)
  const closingStamp = localStamp(entry?.clockOut, zone)
  const [employeeId, setEmployee] = useState(entry?.employeeId ?? '')
  const [jobId, setJob] = useState(entry?.jobId ?? '')
  const [businessDate, setDate] = useState(entry?.businessDate ?? today(zone))
  const [start, setStart] = useState(openingStamp)
  const [end, setEnd] = useState(closingStamp)
  const [startChoice, setStartChoice] = useState(entry?.clockIn ?? '')
  const [endChoice, setEndChoice] = useState(entry?.clockOut ?? '')
  const [breakValue, setBreak] = useState(String(entry?.breakMinutes ?? 0))
  const [cash, setCash] = useState(((entry?.cashTipsCents ?? 0) / 100).toFixed(2))
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const employees = state.employees.filter(row => row.status !== 'inactive' || row.id === entry?.employeeId)
  const employee = employees.find(row => row.id === employeeId)
  const jobs = state.jobs.filter(row => !employee?.jobIds?.length || employee.jobIds.includes(row.id) ||
    (employeeId === entry?.employeeId && row.id === entry?.jobId))
  const requireEnd = closing || entry?.status === 'closed'
  const startOptions = clockChoices(start, zone, entry?.clockIn)
  const endOptions = clockChoices(end, zone, entry?.clockOut)
  const clockIn = startOptions.includes(startChoice) ? startChoice : startOptions[0]
  const clockOut = (endOptions.includes(endChoice) ? endChoice : endOptions[0]) ?? null

  function submit() {
    if (!employee || !jobs.some(row => row.id === jobId)) return setError('Choose an employee and one of their jobs.')
    if (!businessDate || !clockIn || ((end || requireEnd) && !clockOut)) return setError('Enter valid dates and clock times in ' + zone + '.')
    const from = Date.parse(clockIn)
    const to = clockOut ? Date.parse(clockOut) : Infinity
    if (to <= from) return setError('Clock-out must be later than clock-in.')
    const elapsed = clockOut ? Math.floor((to - from) / 60000) : Math.max(0, Math.floor((Date.now() - from) / 60000))
    const breakMinutes = Number(breakValue)
    if (!/^\d+$/.test(breakValue) || !Number.isSafeInteger(breakMinutes) || breakMinutes > elapsed) {
      return setError('Enter whole break minutes within the elapsed shift.')
    }
    const cashTipsCents = parseMoney(cash)
    if (cashTipsCents === null) return setError('Enter nonnegative cash tips with up to two decimal places.')
    if (entry && !reason.trim()) return setError('Enter a reason for the change.')
    const overlaps = state.timeEntries.some(row =>
      row.id !== entry?.id && row.employeeId === employeeId &&
      from < (row.clockOut ? Date.parse(row.clockOut) : Infinity) && Date.parse(row.clockIn) < to)
    if (overlaps) return setError('This time entry overlaps another entry for the employee.')
    const after = { employeeId, jobId, businessDate, clockIn, clockOut, breakMinutes, cashTipsCents,
      workedMinutes: clockOut ? elapsed - breakMinutes : null, status: clockOut ? 'closed' : 'open' }
    const changeType = !entry ? 'created' : entry.status === 'open' && clockOut ? 'closed' : 'corrected'
    commit(current => {
      const updated = entry ? { ...entry, ...after, ...updateAudit(current) } : { id: newId('te'), ...after, ...audit(current) }
      const change = {
        id: newId('tec'), timeEntryId: updated.id, changeType, reason: entry ? reason.trim() : null,
        before: entry ? entrySnapshot(entry) : null, after, ...audit(current),
      }
      return { ...current,
        timeEntries: entry ? replace(current.timeEntries, updated) : [updated, ...current.timeEntries],
        timeEntryChanges: [change, ...current.timeEntryChanges],
      }
    }, changeType === 'closed' ? 'Time entry closed.' : 'Time entry saved.')
    close()
  }
  return <Dialog title={closing ? 'Close time entry' : entry ? 'Correct time entry' : 'Add time entry'}
    submit={closing ? 'Close entry' : 'Save entry'} onClose={close} onSubmit={submit} error={error}>
    <p className="muted">Clock times use {zone}.</p>
    <div className="form-grid">
      <Select label="Employee" blank="Choose an employee" options={options(employees)} value={employeeId} onChange={value => { setEmployee(value); setJob('') }} required />
      <Select label="Job" blank="Choose a job" options={options(jobs)} value={jobId} onChange={setJob} required disabled={!employee} />
      <Field label="Business date"><input type="date" required value={businessDate} onChange={event => setDate(event.target.value)} /></Field>
      <Field label="Unpaid break minutes"><input type="number" min="0" step="1" required value={breakValue} onChange={event => setBreak(event.target.value)} /></Field>
      <ClockField label="Clock-in" value={start} onChange={setStart} choices={startOptions} instant={clockIn}
        onInstantChange={setStartChoice} zone={zone} required />
      <ClockField label="Clock-out" value={end} onChange={setEnd} choices={endOptions} instant={clockOut}
        onInstantChange={setEndChoice} zone={zone} required={requireEnd} />
      <Field label="Declared cash tips"><input inputMode="decimal" required value={cash} onChange={event => setCash(event.target.value)} /></Field>
      {entry && <Field label="Reason" wide><textarea rows={3} required value={reason} onChange={event => setReason(event.target.value)} /></Field>}
    </div>
  </Dialog>
}

