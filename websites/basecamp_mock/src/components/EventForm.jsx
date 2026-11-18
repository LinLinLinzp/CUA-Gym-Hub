import { useState } from 'react'
import { AppLink } from './navigation.jsx'
import { PeoplePicker } from './people.jsx'
import { safeUrl } from './richText.jsx'
import { FieldError } from './ui.jsx'
import { dateInZone, localInstant, timeInZone, validDate, validInstant, validZone } from '../utils/dates.js'
import { recurrenceOptions, recurring } from '../utils/recurrence.js'

function initialFields(entry, selected, zone) {
  const starts = !entry?.allDay && validInstant(entry?.startsAt) ? new Date(entry.startsAt) : null
  const ends = !entry?.allDay && validInstant(entry?.endsAt) ? new Date(entry.endsAt) : null
  const startDay = entry?.allDay || !starts ? entry?.startsOn ?? selected : dateInZone(starts, zone)
  const endDay = entry?.allDay || !ends ? entry?.endsOn ?? startDay : dateInZone(ends, zone)
  return {
    title: entry?.title ?? '', notes: entry?.notes ?? '', joinUrl: entry?.joinUrl ?? '',
    allDay: Boolean(entry?.allDay), startsOn: startDay, endsOn: endDay,
    frequency: recurring(entry?.recurrence?.frequency) ? entry.recurrence.frequency : '',
    untilOn: entry?.recurrence?.untilOn ?? '',
    startTime: starts ? timeInZone(starts, zone) : '09:00',
    endTime: ends ? timeInZone(ends, zone) : '10:00',
  }
}

function validateEvent(fields, initial, entry, zone) {
  const errors = {}
  const { allDay, startsOn, endsOn, startTime, endTime, participantIds, frequency, untilOn } = fields
  const title = fields.title.trim()
  const notes = fields.notes.trim()
  const link = fields.joinUrl.trim()
  const joinUrl = link ? safeUrl(link) : null
  if (!title) errors.title = 'Enter an event title.'
  if (link && !joinUrl) errors.link = 'Enter a valid HTTP or HTTPS URL.'
  if (!validDate(startsOn)) errors.startsOn = 'Choose a start date.'
  if (!validDate(endsOn)) errors.endsOn = 'Choose an end date.'
  else if (validDate(startsOn) && endsOn < startsOn) errors.endsOn = 'The end date must be on or after the start.'

  if (frequency && untilOn && (!validDate(untilOn) || untilOn < startsOn)) errors.until = 'Choose an end date on or after the start.'

  let startsAt = null
  let endsAt = null
  if (!allDay) {
    startsAt = !entry?.allDay && startsOn === initial.startsOn && startTime === initial.startTime && validInstant(entry?.startsAt)
      ? entry.startsAt : localInstant(startsOn, startTime, zone)
    endsAt = !entry?.allDay && endsOn === initial.endsOn && endTime === initial.endTime && validInstant(entry?.endsAt)
      ? entry.endsAt : localInstant(endsOn, endTime, zone)
    if (!startsAt && !errors.startsOn) errors.startTime = startTime ? 'This time is unavailable in the event time zone.' : 'Choose a start time.'
    if (!endsAt && !errors.endsOn) errors.endTime = endTime ? 'This time is unavailable in the event time zone.' : 'Choose an end time.'
    if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt) && !errors.endsOn) {
      errors.endTime = 'The end time must be after the start.'
    }
  }

  return {
    errors,
    values: {
      title, notes, joinUrl, allDay, startsOn, endsOn, startsAt, endsAt, timeZone: zone,
      ...(!entry || participantIds !== undefined ? { participantIds: participantIds ?? [] } : {}),
      recurrence: frequency ? { frequency, untilOn: untilOn || null } : null,
    },
  }
}

export function EventForm({ entry, people, selected, workspaceZone, onSave, cancelTo }) {
  const zone = validZone(entry?.timeZone, workspaceZone)
  const [initial] = useState(() => initialFields(entry, selected, zone))
  const [fields, setFields] = useState(initial)
  const [submitted, setSubmitted] = useState(false)
  const validation = submitted ? validateEvent(fields, initial, entry, zone) : null
  const errors = validation?.errors ?? {}
  // Native date inputs start at year 0001, while the Schedule includes ISO year 0000.
  const dateInput = [initial.startsOn, initial.endsOn, initial.untilOn].some((date) => date?.startsWith('0000-'))
    ? { type: 'text', placeholder: 'YYYY-MM-DD' }
    : { type: 'date' }
  const edit = (key, value) => setFields((previous) => ({ ...previous, [key]: value }))

  function submit(event) {
    event.preventDefault()
    const result = validation ?? validateEvent(fields, initial, entry, zone)
    setSubmitted(true)
    if (!Object.keys(result.errors).length) onSave(result.values)
  }

  return <form className="card form event-form" noValidate onSubmit={submit}>
    <label><span>Event title</span><input value={fields.title} aria-invalid={Boolean(errors.title)} autoFocus
      onChange={(event) => edit('title', event.target.value)} /><FieldError>{errors.title}</FieldError></label>
    <label className="check-label"><input type="checkbox" checked={fields.allDay}
      onChange={(event) => edit('allDay', event.target.checked)} />All day</label>
    <div className="field-grid">
      <fieldset>
        <legend>Starts</legend>
        <label><span>Start date</span><input {...dateInput} value={fields.startsOn} aria-invalid={Boolean(errors.startsOn)}
          onChange={(event) => {
            const startsOn = event.target.value
            setFields((previous) => ({
              ...previous, startsOn,
              endsOn: previous.endsOn === previous.startsOn || previous.endsOn < startsOn ? startsOn : previous.endsOn,
            }))
          }} /><FieldError>{errors.startsOn}</FieldError></label>
        {!fields.allDay && <label><span>Start time</span><input type="time" value={fields.startTime}
          aria-invalid={Boolean(errors.startTime)} onChange={(event) => edit('startTime', event.target.value)} />
          <FieldError>{errors.startTime}</FieldError></label>}
      </fieldset>
      <fieldset>
        <legend>Ends</legend>
        <label><span>End date</span><input {...dateInput} value={fields.endsOn} aria-invalid={Boolean(errors.endsOn)}
          onChange={(event) => edit('endsOn', event.target.value)} /><FieldError>{errors.endsOn}</FieldError></label>
        {!fields.allDay && <label><span>End time</span><input type="time" value={fields.endTime}
          aria-invalid={Boolean(errors.endTime)} onChange={(event) => edit('endTime', event.target.value)} />
          <FieldError>{errors.endTime}</FieldError></label>}
      </fieldset>
    </div>
    {!fields.allDay && <p className="small muted">Event time zone · {zone.replaceAll('_', ' ')}</p>}
    <div className="field-grid">
      <label><span>Repeats</span><select value={fields.frequency} onChange={(event) => edit('frequency', event.target.value)}>
        <option value="">Does not repeat</option>
        {Object.entries(recurrenceOptions).map(([value, name]) => <option key={value} value={value}>{name}</option>)}
      </select></label>
      {fields.frequency && <label><span>Repeat until</span><input {...dateInput} value={fields.untilOn}
        aria-invalid={Boolean(errors.until)} onChange={(event) => edit('untilOn', event.target.value)} />
        <FieldError>{errors.until}</FieldError></label>}
    </div>
    <PeoplePicker label="Participants" people={people} selected={fields.participantIds ?? entry?.participantIds}
      onChange={(ids) => edit('participantIds', ids)} />
    <label><span>Video link</span><input type="url" placeholder="https://…" value={fields.joinUrl} aria-invalid={Boolean(errors.link)}
      onChange={(event) => edit('joinUrl', event.target.value)} /><FieldError>{errors.link}</FieldError></label>
    <label><span>Notes</span><textarea value={fields.notes} onChange={(event) => edit('notes', event.target.value)} /></label>
    <div className="actions">
      <button className="button primary">{entry ? 'Save changes' : 'Add this event'}</button>
      <AppLink className="button secondary" to={cancelTo}>Cancel</AppLink>
    </div>
  </form>
}
