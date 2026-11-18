import { nearbyOccurrences, occurrenceRecords } from './recurrence.js'
import { eventDays, validDate } from './dates.js'
import { hasId, idOrder, projectTasks, scheduleEntries } from './records.js'

export function agendaSources(state, project, schedule, zone, { eventsOnly, participant, first, last, around } = {}) {
  const events = scheduleEntries(state, project, schedule).flatMap((record) => {
    if (participant && !hasId(record.participantIds, participant)) return []
    const occurrences = around ? nearbyOccurrences(record, zone, around) : occurrenceRecords(record, zone, first, last)
    return occurrences.flatMap((occurrence) => {
      const [start, end] = eventDays(occurrence, zone)
      return start ? [{ record: occurrence, start, end, kind: record.allDay ? 'all-day' : 'event' }] : []
    })
  })
  if (eventsOnly) return events

  const tasks = projectTasks(state, project).flatMap((record) => {
    if (record.completed || participant && !hasId(record.assigneeIds, participant)) return []
    const end = validDate(record.dueOn) ? record.dueOn : record.startsOn
    if (!validDate(end)) return []
    const start = validDate(record.startsOn) && record.startsOn <= end ? record.startsOn : end
    return [{ record, start, end, kind: 'todo' }]
  })
  return [...events, ...tasks]
}

const order = { 'all-day': 0, event: 1, todo: 2 }
export function compareAgenda(a, b) {
  const byKind = order[a.kind] - order[b.kind]
  if (byKind) return byKind
  if (a.kind === 'event') {
    const start = (a.record.startsAt ?? '').localeCompare(b.record.startsAt ?? '')
    if (start) return start
  }
  return (a.record.title ?? '').localeCompare(b.record.title ?? '') || idOrder(a.record, b.record)
}

export function nearestAgendaDate(sources, today) {
  let next = null
  let last = null
  for (const { start, end } of sources) {
    if (end >= today) {
      const date = start >= today ? start : today
      if (!next || date < next) next = date
    } else if (!last || end > last) last = end
  }
  return next ?? last
}
