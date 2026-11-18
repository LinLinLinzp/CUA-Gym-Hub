import { useState } from 'react'
import { Badge, CategoryField, Confirm, Dialog, Empty, Heading, categoryName } from '../common.jsx'
import { appendChanges, audit, editRecord, editSettings, makeId, useWorkspace } from '../workspace.jsx'
import { addDays, agendaBetween, CHANNEL_ZONE, displayDate, displayTime, monthStart, moveMonth,
  onVacation, wallTime, weekdayOf, weekdays, zonedParts } from '../utils/calendar.js'

function ScheduleEditor({ entry, defaultDate, zone, close, onAdded }) {
  const { state, commit } = useWorkspace()
  const entryZone = entry?.timezone || zone
  const anchor = entry?.startsAt && zonedParts(entry.startsAt, entryZone)
  const [title, setTitle] = useState(entry?.title ?? '')
  const [categoryId, setCategory] = useState(entry?.categoryId ?? '')
  const [date, setDate] = useState(anchor?.date ?? defaultDate)
  const [time, setTime] = useState(anchor?.time.slice(0, 5) ?? '18:00')
  const [duration, setDuration] = useState(entry?.durationMinutes ?? 60)
  const [recurrence, setRecurrence] = useState(entry?.recurrence === 'weekly' ? 'weekly' : 'once')
  const [days, setDays] = useState([entry?.weekday || weekdayOf(anchor?.date ?? defaultDate)])
  const [error, setError] = useState(null)
  const weekly = recurrence === 'weekly'
  const dialogTitle = entry ? weekly ? 'Edit Weekly Series' : 'Edit Stream' : 'Add Stream'
  const helpFor = field => error?.field === field ? 'schedule-error' : undefined

  async function submit(event) {
    event.preventDefault()
    if (!title.trim() || title.trim().length > 140) {
      setError({ field: 'title', text: 'Enter a stream title of up to 140 characters.' })
      return
    }
    if (weekly && !days.length) {
      setError({ field: 'weekday', text: 'Choose at least one weekday.' })
      return
    }
    const minutes = Number(duration)
    if (!Number.isInteger(minutes) || minutes < 30 || minutes > 1380) {
      setError({ field: 'duration', text: 'Enter a whole number from 30 to 1,380 minutes.' })
      return
    }
    const rows = (weekly ? [...days].sort((a, b) => a - b) : [null]).map(weekday => {
      const day = weekday ? addDays(date, (weekday - weekdayOf(date) + 7) % 7) : date
      const unchangedLocal = day === anchor?.date && time === anchor.time.slice(0, 5)
      return { title: title.trim(), categoryId, startsAt: unchangedLocal ? entry.startsAt : wallTime(day, time, entryZone),
        timezone: entryZone, durationMinutes: minutes, recurrence, weekday }
    })
    if (rows.some(row => !row.startsAt)) {
      setError({ field: 'time', text: 'Choose a valid local date and time in ' + entryZone + '.' })
      return
    }
    if (entry) {
      await commit((current, tx) => editRecord(current, 'scheduleEntries', entry.id, rows[0], tx, 'update_schedule_entry', 'scheduleEntry'),
        weekly ? 'Weekly series updated.' : 'Stream updated.')
    } else {
      await commit((current, tx) => {
        const records = rows.map(row => ({ ...row, id: makeId('slot'), status: 'scheduled', createdAt: tx.now, updatedAt: tx.now }))
        return { ...current, scheduleEntries: [...(current.scheduleEntries ?? []), ...records], stateChanges: appendChanges(current,
          records.map(record => audit(tx, 'create_schedule_entry', 'scheduleEntry', record.id, null, record))) }
      }, rows.length === 1 ? 'Stream added.' : 'Weekly streams added.')
      const earliest = rows.map(row => row.startsAt).sort()[0]
      onAdded(zonedParts(earliest, zone).date)
    }
    close()
  }

  return <Dialog title={dialogTitle} close={close}>
    <form className="form" onSubmit={submit}>
      <label>Title<input autoFocus required maxLength={140} value={title} onChange={event => setTitle(event.target.value)} aria-describedby={helpFor('title')} /></label>
      <CategoryField required categories={state.categories ?? []} value={categoryId} onChange={setCategory} />
      {!entry ? <label>Repeat<select value={recurrence} onChange={event => setRecurrence(event.target.value)}>
        <option value="once">One time</option><option value="weekly">Weekly</option>
      </select></label> : <p className="meta">{weekly ? 'Changes apply to this weekly series.' : 'This is a one-time stream.'}</p>}
      <div className="fields">
        <label>{weekly ? 'Start on or after' : 'Date'}<input type="date" required value={date} onChange={event => {
          setDate(event.target.value)
          if (!entry && !weekly && event.target.value) setDays([weekdayOf(event.target.value)])
        }} /></label>
        <label>Time<input type="time" required value={time} onChange={event => setTime(event.target.value)} aria-describedby={helpFor('time')} /></label>
      </div>
      {weekly && <fieldset aria-describedby={helpFor('weekday')}><legend>{entry ? 'Weekday' : 'Weekdays'}</legend>
        <div className="weekday-fields">{weekdays.map((name, index) => {
          const value = index + 1
          return <label key={name} className="check"><input type={entry ? 'radio' : 'checkbox'} name="weekday" checked={days.includes(value)}
            onChange={event => setDays(current => entry ? [value] : event.target.checked ? [...current, value] : current.filter(day => day !== value))} />{name}</label>
        })}</div>
      </fieldset>}
      <div className="fields"><label>Duration in minutes<input type="number" min="30" max="1380" step="1" required value={duration}
        aria-describedby={helpFor('duration')} onChange={event => setDuration(event.target.value)} /></label>
        <div className="static-field"><strong>Timezone</strong><span>{entryZone}</span></div></div>
      {error && <p className="error" id="schedule-error" role="alert">{error.text}</p>}
      <div className="dialog-actions"><button type="button" onClick={close}>Cancel</button><button className="primary">{entry ? 'Save' : 'Add Stream'}</button></div>
    </form>
  </Dialog>
}

function VacationEditor({ settings, zone, today, close }) {
  const { commit } = useWorkspace()
  const [enabled, setEnabled] = useState(Boolean(settings.vacationEnabled))
  const [start, setStart] = useState(settings.vacationStartDate ?? today)
  const [end, setEnd] = useState(settings.vacationEndDate ?? today)
  const [error, setError] = useState(false)
  async function save(event) {
    event.preventDefault()
    if (enabled && end < start) {
      setError(true)
      return
    }
    const patch = { vacationEnabled: enabled, vacationStartDate: enabled ? start : null, vacationEndDate: enabled ? end : null }
    await commit((state, tx) => editSettings(state, 'scheduleSettings', patch, tx, 'update_vacation'), 'Vacation settings saved.')
    close()
  }
  return <Dialog title="Vacation Mode" close={close}>
    <form className="form" onSubmit={save}>
      <p className="muted">Mark vacation dates on the agenda. Dates are inclusive in {zone}.</p>
      <label className="check"><input type="checkbox" checked={enabled} onChange={event => {
        setEnabled(event.target.checked); setError(false)
      }} />Enable Vacation Mode</label>
      <fieldset disabled={!enabled} className="fields">
        <label>Start date<input type="date" required value={start} onChange={event => { setStart(event.target.value); setError(false) }} /></label>
        <label>End date<input type="date" required value={end} aria-invalid={error}
          aria-describedby={error ? 'vacation-error' : undefined} onChange={event => { setEnd(event.target.value); setError(false) }} /></label>
      </fieldset>
      {error && <p className="error" id="vacation-error" role="alert">End date must be on or after the start date.</p>}
      <div className="dialog-actions"><button type="button" onClick={close}>Cancel</button><button className="primary">Save</button></div>
    </form>
  </Dialog>
}

function Calendar({ month, selected, today, grouped, settings, select, move, reset }) {
  const first = monthStart(month)
  const next = moveMonth(first, 1)
  const days = []
  for (let date = first; date < next; date = addDays(date, 1)) days.push(date)
  return <aside className="panel calendar stack">
    <div className="row between calendar-controls">
      <button className="icon-button" aria-label="Previous month" onClick={() => move(-1)}>‹</button>
      <h2>{displayDate(first, { month: 'long', year: 'numeric' })}</h2>
      <button className="icon-button" aria-label="Next month" onClick={() => move(1)}>›</button>
    </div>
    <div className="calendar-grid">
      {weekdays.map(name => <abbr title={name} key={name}>{name.slice(0, 2)}</abbr>)}
      {days.map((date, index) => <button key={date} type="button" aria-label={displayDate(date)} aria-pressed={date === selected}
        aria-current={date === today ? 'date' : undefined} className={onVacation(settings, date) ? 'vacation-day' : ''}
        style={index === 0 ? { gridColumnStart: weekdayOf(date) } : undefined} onClick={() => select(date)}>
        {Number(date.slice(-2))}{grouped.has(date) && <i aria-hidden="true" />}
      </button>)}
    </div>
    <div className="actions"><button onClick={reset}>Today</button><button aria-pressed={!selected} onClick={() => select(null)}>Full month</button></div>
  </aside>
}

function ScheduleDay({ date, items, zone, onEdit, onRemove, onToggle, vacation, categories }) {
  return <section className="agenda-day">
    <div className="row between agenda-date"><h3>{displayDate(date, { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
      {vacation && <Badge status="unpublished">Vacation</Badge>}</div>
    {items.length ? <ul className="agenda-slots">{items.map(item => {
      const { entry, startsAt, status } = item
      const weekly = entry.recurrence === 'weekly'
      const cancelled = status === 'cancelled'
      return <li key={entry.id + (item.occurrenceDate || '')}>
        <div className="agenda-time metric"><strong>{displayTime(startsAt, zone)}</strong>
          {entry.durationMinutes != null && <small>{entry.durationMinutes} min</small>}</div>
        <div className="agenda-info"><h3>{entry.title || 'Untitled stream'}</h3>
          <small>{categoryName(categories, entry.categoryId)} · {weekly ? 'Weekly' : 'One time'}</small>
          <div><Badge status={status} /></div></div>
        <div className="actions slot-actions">
          <button onClick={() => onEdit(entry)}>{weekly ? 'Edit series' : 'Edit'}</button>
          <button onClick={() => onToggle(item)}>{(cancelled ? 'Restore ' : 'Cancel ') + (weekly ? 'occurrence' : 'stream')}</button>
          <button className="danger-text" onClick={() => onRemove(entry)}>{weekly ? 'Delete series' : 'Delete stream'}</button>
        </div>
      </li>
    })}</ul> : <p className="agenda-no-streams muted">No streams scheduled.</p>}
  </section>
}

export function Schedule() {
  const { state, commit } = useWorkspace()
  const settings = state.scheduleSettings
  const zone = settings.timezone || CHANNEL_ZONE
  const today = zonedParts(new Date(), zone).date
  const [month, setMonth] = useState(() => monthStart(today))
  const [selected, setSelected] = useState(null)
  const [editor, setEditor] = useState(null)
  const [remove, setRemove] = useState(null)
  const [vacation, setVacation] = useState(false)
  const first = monthStart(month)
  const last = addDays(moveMonth(first, 1), -1)
  const grouped = new Map()
  for (const item of agendaBetween(state, first, last)) {
    if (!grouped.has(item.date)) grouped.set(item.date, [])
    grouped.get(item.date).push(item)
  }
  const dates = selected ? [selected] : [...grouped.keys()]
  const defaultDate = selected || (monthStart(today) === month ? today : first)

  async function toggle(item) {
    const { entry, occurrenceDate } = item
    const restore = item.status === 'cancelled'
    await commit((current, tx) => {
      if (entry.recurrence !== 'weekly') return editRecord(current, 'scheduleEntries', entry.id,
        { status: restore ? 'scheduled' : 'cancelled' }, tx, restore ? 'restore_schedule_entry' : 'cancel_schedule_entry', 'scheduleEntry')
      const exceptions = current.scheduleExceptions ?? []
      const prior = exceptions.find(record => record.entryId === entry.id && record.occurrenceDate === occurrenceDate)
      const next = { ...prior, id: prior?.id ?? entry.id + ':' + occurrenceDate, entryId: entry.id, occurrenceDate,
        status: restore ? 'restored' : 'cancelled', createdAt: prior?.createdAt ?? tx.now, updatedAt: tx.now }
      return { ...current, scheduleExceptions: prior ? exceptions.map(record => record === prior ? next : record) : [...exceptions, next],
        stateChanges: appendChanges(current, [audit(tx, restore ? 'restore_occurrence' : 'cancel_occurrence', 'scheduleException', next.id, prior, next)]) }
    }, restore ? 'Stream restored.' : 'Stream cancelled.')
  }

  return <><Heading title="Schedule" description={'Plan upcoming streams in ' + zone + '.'}>
    <div className="actions"><button onClick={() => setVacation(true)}>Vacation Mode</button>
      <button className="primary" onClick={() => setEditor({})}>Add Stream</button></div>
    </Heading>
    {settings.vacationEnabled && <div className="vacation-banner">
      <strong>Vacation Mode</strong><span>{displayDate(settings.vacationStartDate)} through {displayDate(settings.vacationEndDate)}</span>
    </div>}
    <div className="schedule-grid">
      <Calendar month={month} selected={selected} today={today} grouped={grouped} settings={settings} select={setSelected}
        move={direction => { setMonth(moveMonth(month, direction)); setSelected(null) }}
        reset={() => { setMonth(monthStart(today)); setSelected(today) }} />
      <section className="panel stack agenda">
        <div className="row between"><h2>Agenda</h2><span className="meta">{selected ? displayDate(selected) : displayDate(first, { month: 'long', year: 'numeric' })}</span></div>
        {dates.length ? dates.map(date => <ScheduleDay key={date} date={date} items={grouped.get(date) ?? []} zone={zone}
          vacation={onVacation(settings, date)} categories={state.categories ?? []} onEdit={entry => setEditor({ entry })}
          onRemove={setRemove} onToggle={toggle} />) : <Empty title="No streams scheduled this month." />}
      </section>
    </div>
    {editor && <ScheduleEditor entry={editor.entry} defaultDate={defaultDate} zone={zone} close={() => setEditor(null)}
      onAdded={date => { setMonth(monthStart(date)); if (selected) setSelected(date) }} />}
    {vacation && <VacationEditor settings={settings} zone={zone} today={today} close={() => setVacation(false)} />}
    {remove && <Confirm title={remove.recurrence === 'weekly' ? 'Delete weekly series?' : 'Delete stream?'}
      verb={remove.recurrence === 'weekly' ? 'Delete series' : 'Delete stream'} close={() => setRemove(null)}
      confirm={async () => {
        await commit((current, tx) => editRecord(current, 'scheduleEntries', remove.id, { status: 'deleted', deletedAt: tx.now },
          tx, 'delete_schedule_entry', 'scheduleEntry'), 'Stream deleted.')
        setRemove(null)
      }}>
      {remove.recurrence === 'weekly' ? 'Remove all occurrences of “' : 'Remove “'}{remove.title || 'Untitled stream'}” from the schedule?
    </Confirm>}
  </>
}
