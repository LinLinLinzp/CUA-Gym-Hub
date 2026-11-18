import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { CalendarDays, CheckSquare, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { AppLink, eventPath, projectPath, taskPath, useAppNavigate, useQuery } from '../components/navigation.jsx'
import { safeUrl } from '../components/richText.jsx'
import { EventForm } from '../components/EventForm.jsx'
import { Avatar, Avatars, personName, resolvePeople } from '../components/people.jsx'
import { ActionMenu, Breadcrumbs, Empty, PageHeading, TrashDialog, Unavailable } from '../components/ui.jsx'
import { recurrenceOptions, recurring } from '../utils/recurrence.js'
import { useProject, useStore } from '../store.jsx'
import { agendaSources, compareAgenda, nearestAgendaDate } from '../utils/agenda.js'
import { dateInZone, eventDays, formatDay, formatInstant, monthEnd, monthStart, parseDay, plusDays, shiftMonth, validDate, validZone } from '../utils/dates.js'
import { byId, membersOf, scheduleEntries, scheduleOf } from '../utils/records.js'

const schedulePath = (project) => projectPath(project) + '/schedule'
const scheduleTitle = (schedule) => schedule.title || 'Schedule'
const eventTitle = (entry) => entry.title || 'Untitled event'
const dayHeading = { weekday: 'long', month: 'long', day: 'numeric' }
const monthHeading = { month: 'long', year: 'numeric' }
const timeOptions = { hour: 'numeric', minute: '2-digit' }
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function ScheduleBreadcrumbs({ schedule, tail }) {
  const project = useProject()
  const items = [{ label: project.name || 'Project', to: projectPath(project) },
    { label: scheduleTitle(schedule), to: tail ? schedulePath(project) : null }]
  if (tail) items.push({ label: tail })
  return <Breadcrumbs items={items} />
}

function MissingSchedule() {
  const project = useProject()
  return <Unavailable title="Schedule unavailable" to={projectPath(project)} label="Back to project" />
}

function Calendar({ selected, today, dates, select }) {
  const month = monthStart(selected)
  const previous = shiftMonth(month, -1)
  const next = shiftMonth(month, 1)
  const startOffset = parseDay(month).getUTCDay()
  return <div className="calendar">
    <div className="calendar-toolbar">
      <button type="button" className="icon-button" aria-label="Previous month" disabled={!previous}
        onClick={() => select(previous)}><ChevronLeft size={20} /></button>
      <h2>{formatDay(month, monthHeading)}</h2>
      <button type="button" className="icon-button" aria-label="Next month" disabled={!next}
        onClick={() => select(next)}><ChevronRight size={20} /></button>
    </div>
    <div className="calendar-grid">
      {weekdays.map((day) => <div key={day} className="weekday">{day}</div>)}
      {Array.from({ length: startOffset }, (_, index) => <div key={'spacer' + index} aria-hidden="true" />)}
      {[...dates].map(([day, items]) => {
        const count = items.length
        return <button type="button" key={day} aria-pressed={day === selected} aria-current={day === today ? 'date' : undefined}
          aria-label={formatDay(day, { ...dayHeading, year: 'numeric' }) + (count ? `, ${count} scheduled ${count === 1 ? 'item' : 'items'}` : '')}
          className="calendar-day" onClick={() => select(day)}>
          {Number(day.slice(-2))}{count > 0 && <span className="day-dot" />}
        </button>
      })}
    </div>
    <div className="calendar-controls">
      <button type="button" className="button secondary" onClick={() => select(today)}>Today</button>
      <label><span>Jump to month</span><input type="month" value={month.slice(0, 7)} onChange={(event) => {
        const first = event.target.value + '-01'
        if (validDate(first)) select(first)
      }} /></label>
    </div>
  </div>
}

function AgendaRow({ item, date, zone }) {
  const project = useProject()
  const { state } = useStore()
  const { kind, record, start, end } = item
  const todo = kind === 'todo'
  const people = resolvePeople(state.people, todo ? record.assigneeIds : record.participantIds)
  const startTime = formatInstant(record.startsAt, zone, timeOptions)
  const endTime = formatInstant(record.endsAt, zone, timeOptions)
  let when = 'All day'
  if (todo) when = <><CheckSquare size={14} aria-hidden="true" /> To-do</>
  else if (kind === 'event') {
    if (date === start && date === end) when = startTime ? [startTime, endTime].filter(Boolean).join(' – ') : 'Time unavailable'
    else if (date === start) when = startTime || 'Starts'
    else if (date === end) when = endTime ? 'Until ' + endTime : 'Ends'
    else when = 'Continues'
  }

  return <li className="agenda-row">
    <span className="agenda-time">{when}</span>
    <AppLink to={todo ? taskPath(project, record) : eventPath(project, record)}>{record.title || (todo ? 'Untitled to-do' : 'Untitled event')}</AppLink>
    <Avatars people={people} limit={4} size={23} />
  </li>
}

function Agenda({ selected, dates, zone, jump, today, select }) {
  const project = useProject()
  const base = schedulePath(project)
  const groups = [...dates].filter(([date]) => date >= selected && (date === selected || dates.get(date).length > 0))
  if (!groups.some(([date]) => date === selected)) groups.unshift([selected, []])
  const noItems = !groups.some(([, rows]) => rows.length)
  return <div className="agenda" aria-label="Agenda">
    <div className="section-heading">
      <div><h2>Agenda</h2><p className="small muted">{zone.replaceAll('_', ' ')}</p></div>
      {jump && jump !== selected && noItems && <button type="button" className="button secondary" onClick={() => select(jump)}>
        {jump >= today ? 'Jump to upcoming work' : 'Jump to most recent work'}
      </button>}
    </div>
    {groups.map(([date, rows]) => <section className="agenda-group" key={date}>
      <div className="agenda-day-heading">
        <h3>{formatDay(date, dayHeading)}</h3>
        <AppLink to={base + '/new?date=' + date} className="button day-add"><Plus size={14} />Add an event</AppLink>
      </div>
      {rows.length ? <ul className="agenda-rows">{rows.map((item) =>
        <AgendaRow key={item.kind + '-' + item.record.id + '-' + item.record.startsOn + '-' + item.record.startsAt} date={date} item={item} zone={zone} />)}</ul>
        : <Empty>No items scheduled for this day.</Empty>}
    </section>)}
  </div>
}

export function Schedule() {
  const project = useProject()
  const { state } = useStore()
  const schedule = scheduleOf(state, project)
  const [params, setQuery] = useQuery()
  if (!schedule) return <MissingSchedule />
  const zone = validZone(state.workspace?.timeZone)
  const today = dateInZone(new Date(), zone)
  const date = params.get('date')
  const selected = validDate(date) ? date : today
  const select = (date) => setQuery({ date }, { replace: false })
  const eventsOnly = params.get('view') === 'events'
  const participant = params.get('participant') ?? ''
  const first = monthStart(selected)
  const last = monthEnd(first)
  const options = { eventsOnly, participant }
  const sources = agendaSources(state, project, schedule, zone, { ...options, first, last })
  const dates = new Map()
  for (let offset = 0; offset < parseDay(last).getUTCDate(); offset += 1) {
    const day = plusDays(first, offset)
    dates.set(day, sources.filter((item) => item.start <= day && item.end >= day).sort(compareAgenda))
  }

  const visibleWork = [...dates].some(([day, items]) => day >= selected && items.length)
  const jump = visibleWork ? null : nearestAgendaDate(agendaSources(state, project, schedule, zone, { ...options, around: today }), today)

  return <>
    <ScheduleBreadcrumbs schedule={schedule} />
    <PageHeading title={scheduleTitle(schedule)} icon={CalendarDays}
      action={<AppLink className="button primary" to={schedulePath(project) + '/new?date=' + selected}><Plus size={16} />New event</AppLink>} />
    <div className="filters">
      <label>Show<select value={eventsOnly ? 'events' : ''} onChange={(event) => setQuery({ view: event.target.value })}>
        <option value="">Events and to-dos</option><option value="events">Events only</option>
      </select></label>
      <label>Participant<select value={participant} onChange={(event) => setQuery({ participant: event.target.value })}>
        <option value="">Everyone</option>
        {membersOf(state, project).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
      </select></label>
    </div>
    <div className="card schedule-card">
      <Calendar selected={selected} today={today} dates={dates} select={select} />
      <Agenda selected={selected} dates={dates} zone={zone} jump={jump} today={today} select={select} />
    </div>
  </>
}

function MissingEvent() {
  const project = useProject()
  return <Unavailable title="Event unavailable" to={schedulePath(project)} label="Back to Schedule" />
}

export function ScheduleEditor() {
  const { entryId } = useParams()
  const project = useProject()
  const { state, add, update } = useStore()
  const [params] = useQuery()
  const navigate = useAppNavigate()
  const schedule = scheduleOf(state, project)
  if (!schedule) return <MissingSchedule />
  const entry = byId(scheduleEntries(state, project, schedule), entryId)
  if (entryId && !entry) return <MissingEvent />
  const zone = validZone(state.workspace?.timeZone)
  const date = params.get('date')
  const selected = validDate(date) ? date : dateInZone(new Date(), zone)
  const title = entry ? 'Edit event' : 'New event'

  return <div className="reading-width">
    <ScheduleBreadcrumbs schedule={schedule} tail={title} />
    <PageHeading title={title} icon={CalendarDays} />
    <EventForm key={entry ? 'event:' + entry.id : 'new'} entry={entry} selected={selected} workspaceZone={zone}
      people={membersOf(state, project)}
      cancelTo={entry ? eventPath(project, entry) : schedulePath(project) + '?date=' + selected}
      onSave={(fields) => {
        const id = entry ? entry.id : add('scheduleEntries', 'event', {
          ...fields, projectId: String(project.id), scheduleId: String(schedule.id), status: 'active',
        })
        if (entry) update('scheduleEntries', id, fields)
        if (id != null) navigate(eventPath(project, { id }))
      }} />
  </div>
}

const dateAndTime = { ...dayHeading, year: 'numeric', ...timeOptions, timeZoneName: 'short' }

function whenLabel(entry, zone) {
  if (entry.allDay) {
    const start = formatDay(entry.startsOn)
    const end = entry.endsOn !== entry.startsOn ? formatDay(entry.endsOn) : ''
    return ['All day', [start, end].filter(Boolean).join(' – ')].filter(Boolean).join(' · ')
  }
  const start = formatInstant(entry.startsAt, zone, dateAndTime)
  const end = formatInstant(entry.endsAt, zone, dateAndTime)
  return [start, end].filter(Boolean).join(' – ') || formatDay(entry.startsOn) || 'Time unavailable'
}

export function ScheduleDetail() {
  const { entryId } = useParams()
  const project = useProject()
  const { state } = useStore()
  const schedule = scheduleOf(state, project)
  if (!schedule) return <MissingSchedule />
  const entry = byId(scheduleEntries(state, project, schedule), entryId)
  if (!entry) return <MissingEvent />
  return <EventArticle key={entry.id} schedule={schedule} entry={entry} />
}

function EventArticle({ schedule, entry }) {
  const project = useProject()
  const { state, update } = useStore()
  const navigate = useAppNavigate()
  const [trashing, setTrashing] = useState(false)
  const zone = validZone(state.workspace?.timeZone)
  const [day] = eventDays(entry, zone)
  const author = byId(state.people, entry.createdById)
  const participants = resolvePeople(state.people, entry.participantIds)
  const joinUrl = safeUrl(entry.joinUrl)
  const back = schedulePath(project) + (day ? '?date=' + day : '')

  return <div className="reading-width">
    <ScheduleBreadcrumbs schedule={schedule} tail={eventTitle(entry)} />
    <article className="card event-article">
      <PageHeading title={eventTitle(entry)} icon={CalendarDays} action={<>
        <AppLink className="button secondary" to={eventPath(project, entry) + '/edit'}>Edit</AppLink>
        <ActionMenu label="Event options">
          <button type="button" className="destructive" onClick={() => setTrashing(true)}>{recurring(entry.recurrence?.frequency) ? 'Put series in the trash' : 'Put in the trash'}</button>
        </ActionMenu>
      </>} />
      <div className="byline"><Avatar person={author} />
        <div><strong>{personName(state.people, entry.createdById)}</strong>
          <time dateTime={entry.createdAt}>{formatInstant(entry.createdAt, zone)}</time></div>
      </div>
      <dl className="event-info">
        <div><dt>When</dt><dd>{whenLabel(entry, zone)}</dd></div>
        {!entry.allDay && <div><dt>Time zone</dt><dd>{zone.replaceAll('_', ' ')}</dd></div>}
        {recurring(entry.recurrence?.frequency) && <div><dt>Repeats</dt>
          <dd>{recurrenceOptions[entry.recurrence.frequency]}{formatDay(entry.recurrence.untilOn) && ' until ' + formatDay(entry.recurrence.untilOn)}</dd>
        </div>}
        <div><dt>Participants</dt><dd>{participants.length ? <div className="chips">{participants.map((person) =>
          <span className="chip" key={person.id}><Avatar person={person} size={20} />{person.name}</span>)}</div> : 'No participants'}</dd></div>
        {joinUrl && <div><dt>Video link</dt><dd className="rich-link">{joinUrl}</dd></div>}
        {entry.notes && <div><dt>Notes</dt><dd className="preserve-lines">{entry.notes}</dd></div>}
      </dl>
      <AppLink to={back}>View in Schedule</AppLink>
    </article>
    {trashing && <TrashDialog title={eventTitle(entry)} onClose={() => setTrashing(false)} onConfirm={() => {
      update('scheduleEntries', entry.id, { status: 'trashed' })
      navigate(back)
    }} />}
  </div>
}
