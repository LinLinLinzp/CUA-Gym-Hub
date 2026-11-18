import { actor, event, newId, requireThat, stamp, upsert } from './commands.js'
import { eligibleRetainer, periodRow } from './periods.js'
import { find, today, validDate, visible } from '../utils/format.js'

export function durationMinutes(input) {
  const value = String(input || '').trim().toLowerCase()
  if (/^\d+(?:\.\d+)?$|^\.\d+$/.test(value)) return Math.round(Number(value) * 60)
  const clock = /^(\d+):([0-5]?\d)$/.exec(value)
  if (clock) return Number(clock[1]) * 60 + Number(clock[2])
  const text = /^(?:(\d+)\s*h(?:ours?)?\s*)?(?:(\d+)\s*m(?:in(?:utes?)?)?)?$/.exec(value)
  return text ? Number(text[1] || 0) * 60 + Number(text[2] || 0) : NaN
}
export const editableDuration = minutes => `${Math.floor((Number(minutes) || 0) / 60)}:${String((Number(minutes) || 0) % 60).padStart(2, '0')}`
export function timeForm(state, entry, date, user) {
  return {
    userId: entry?.userId || user || actor(state), workDate: entry?.workDate || date || today(),
    clientId: entry?.clientId || '', projectId: entry?.projectId || '', serviceId: entry?.serviceId || '',
    notes: entry?.notes || '', billable: Boolean(entry?.billable), applyToRetainer: entry ? Boolean(entry.retainerId || entry.applyToRetainer) : null,
    duration: entry?.durationMinutes ? editableDuration(entry.durationMinutes) : '',
  }
}
export const linkedInvoice = (state, id) => id && state.invoices.some(row => row.id === id && !visible(row, 'deleted'))
export function timeLocked(state, entry) {
  return linkedInvoice(state, entry?.invoiceId) || Boolean(entry && state.invoices.some(invoice => invoice.kind === 'retainer_excess' && !visible(invoice, 'deleted') &&
    invoice.lines?.some(line => line.sources?.some(source => source.type === 'time_entry' && source.id === entry.id))))
}
function assignment(state, form, old, loose = false) {
  const client = find(state.clients, form.clientId), project = find(state.projects, form.projectId)
  requireThat(validDate(form.workDate), 'Choose a work date.')
  requireThat(loose || find(state.users, form.userId) || old?.userId === form.userId, 'Choose a team member.')
  requireThat(!form.clientId || client || old?.clientId === form.clientId, 'Choose an available client.')
  requireThat(!form.projectId || (project && project.clientId === form.clientId) || (old?.projectId === form.projectId && old?.clientId === form.clientId), 'Choose a project belonging to the client.')
  requireThat(!form.serviceId || find(state.services, form.serviceId) || old?.serviceId === form.serviceId, 'Choose an available service.')
  return {
    userId: form.userId, workDate: form.workDate, clientId: form.clientId || null, projectId: form.projectId || null, serviceId: form.serviceId || null,
    notes: String(form.notes || '').trim(), billable: Boolean(form.billable),
  }
}
export function writeTime(state, form, id, timerId) {
  const old = find(state.timeEntries, id)
  requireThat(!id || (old && visible(old)), 'This time entry is unavailable for editing.')
  const duration = durationMinutes(form.duration)
  requireThat(Number.isSafeInteger(duration) && duration > 0, 'Enter a positive duration, such as 1.5, 1h 30m or 1:30.')
  const fields = assignment(state, form, old)
  const locked = timeLocked(state, old)
  if (locked) {
    requireThat(['userId', 'workDate', 'clientId', 'projectId', 'serviceId', 'billable'].every(key => (old[key] ?? (key === 'billable' ? false : null)) === fields[key]) && old.durationMinutes === duration,
      'Only notes can be changed while time is linked to a live invoice.')
    const entry = { ...old, ...stamp(state, old), notes: fields.notes }
    return { ...state, timeEntries: upsert(state.timeEntries, entry) }
  }
  const eligible = eligibleRetainer(state, fields)
  const attach = eligible && form.applyToRetainer !== false
  const historical = old?.retainerId && form.applyToRetainer && !eligible && old.clientId === fields.clientId && old.workDate === fields.workDate
  let periods = state.retainerPeriods
  if (attach) {
    const period = periodRow(state, ...eligible)
    if (!find(periods, period.id)) periods = [...periods, period]
  }
  const invoiceId = null
  const billable = Boolean(attach || historical || fields.billable)
  const existingManual = billable && old?.status === 'billed' && !old.invoiceId && !old.retainerId && old.clientId === fields.clientId
  const entry = {
    ...old, ...fields, ...stamp(state, old), id: old?.id || newId('te'), durationMinutes: duration,
    billable, status: attach || historical || existingManual ? 'billed' : billable ? 'unbilled' : 'non_billable',
    invoiceId, retainerId: attach ? eligible[0].id : historical ? old.retainerId : null,
    retainerPeriodStart: attach ? eligible[1].startDate : historical ? old.retainerPeriodStart : null,
    timerId: timerId || old?.timerId || null, visibility: 'active',
  }
  return { ...state, retainerPeriods: periods, timeEntries: upsert(state.timeEntries, entry) }
}
export function saveTime(state, form, id) {
  const next = writeTime(state, form, id)
  const entry = id ? find(next.timeEntries, id) : next.timeEntries.at(-1)
  return event(next, id ? 'time.updated' : 'time.created', 'time_entry', entry.id, [entry.userId, entry.clientId, entry.projectId, entry.serviceId, entry.retainerId, entry.invoiceId])
}
export function canChangeBilling(state, entry) {
  return visible(entry) && entry.billable && !entry.retainerId && !timeLocked(state, entry)
}
export function changeTime(state, ids, action) {
  const selected = state.timeEntries.filter(row => ids.includes(row.id) && (action === 'deleted'
    ? visible(row) && !timeLocked(state, row) : canChangeBilling(state, row) && row.status !== action))
  requireThat(selected.length, 'No selected entries are eligible for this action.')
  const changed = new Set(selected.map(row => row.id))
  return event({ ...state, timeEntries: state.timeEntries.map(row => changed.has(row.id)
    ? { ...row, ...stamp(state, row), ...(action === 'deleted' ? { visibility: 'deleted' } : { status: action, invoiceId: null }) }
    : row) }, action === 'deleted' ? 'time.deleted' : 'time.billing_changed', 'time_entry', selected[0].id,
  [...changed, ...selected.flatMap(row => [row.clientId, row.projectId, row.retainerId])])
}
export function elapsedSeconds(timer, now = new Date()) {
  const started = Date.parse(timer.startedAt)
  return (Number(timer.accumulatedSeconds) || 0) + (timer.status === 'running' && Number.isFinite(started) ? Math.max(0, Math.floor((now - started) / 1000)) : 0)
}
export function changeTimer(state, intent, form) {
  const old = state.activeTimer
  if (intent === 'started') {
    requireThat(!old, 'A timer is already running or paused.')
    const timer = {
      ...stamp(state), id: newId('timer'), userId: actor(state), workDate: today(),
      clientId: null, projectId: null, serviceId: null, notes: '', billable: false, applyToRetainer: false,
      status: 'running', startedAt: new Date().toISOString(), accumulatedSeconds: 0,
    }
    return event({ ...state, activeTimer: timer }, 'timer.started', 'timer', timer.id, [timer.userId])
  }
  requireThat(old, 'There is no active timer.')
  if (intent === 'discarded') return event({ ...state, activeTimer: null }, 'timer.discarded', 'timer', old.id, [old.clientId, old.projectId])
  if (intent === 'logged') {
    const duration = String(form.duration || '').trim() ? durationMinutes(form.duration) : Math.round(elapsedSeconds(old) / 60)
    requireThat(Number.isSafeInteger(duration) && duration > 0, 'Enter a duration or let the timer run for at least 30 seconds.')
    const next = writeTime(state, { ...form, duration: editableDuration(duration) }, null, old.id)
    const entry = next.timeEntries.at(-1)
    return event({ ...next, activeTimer: null }, 'timer.logged', 'timer', old.id, [entry.id, entry.userId, entry.clientId, entry.projectId, entry.serviceId, entry.retainerId])
  }
  const pause = intent === 'paused'
  requireThat(pause ? old.status === 'running' : old.status === 'paused', 'The timer has already changed.')
  const fields = assignment(state, form, old, true)
  const applyToRetainer = Boolean(eligibleRetainer(state, fields) && form.applyToRetainer !== false)
  const timer = {
    ...old, ...fields, ...stamp(state, old), applyToRetainer, status: pause ? 'paused' : 'running',
    startedAt: pause ? null : new Date().toISOString(), accumulatedSeconds: elapsedSeconds(old),
  }
  return event({ ...state, activeTimer: timer }, 'timer.' + intent, 'timer', old.id, [timer.userId, timer.clientId, timer.projectId, timer.serviceId])
}

export function saveWeek(state, cells) {
  let next = state
  const changed = []
  for (const cell of cells) {
    if (!String(cell.duration || '').trim()) continue
    const duration = durationMinutes(cell.duration)
    requireThat(Number.isInteger(duration) && duration > 0, 'Enter a positive duration in every changed cell.')
    const same = next.timeEntries.filter(row => visible(row) && row.workDate === cell.workDate && row.userId === cell.userId &&
      ['clientId', 'projectId', 'serviceId'].every(key => (row[key] || '') === (cell[key] || '')))
    const previous = same.find(row => !timeLocked(next, row))
    const allMinutes = same.reduce((sum, row) => sum + (Number(row.durationMinutes) || 0), 0)
    if (duration === allMinutes) continue
    const otherMinutes = allMinutes - (Number(previous?.durationMinutes) || 0)
    requireThat(duration > otherMinutes, 'Enter a duration greater than the other entries already recorded in that cell.')
    if (!previous && duration < allMinutes) throw new Error('Invoiced entries cannot be reduced.')
    const project = find(state.projects, cell.projectId)
    const fields = previous ? timeForm(next, previous) : {
      ...timeForm(next, null, cell.workDate, cell.userId), clientId: cell.clientId, projectId: cell.projectId, serviceId: cell.serviceId,
      billable: project ? project.billingType === 'hourly' : Boolean(cell.clientId),
    }
    next = writeTime(next, { ...fields, duration: editableDuration(duration - otherMinutes) }, previous?.id)
    changed.push(previous ? find(next.timeEntries, previous.id) : next.timeEntries.at(-1))
  }
  return changed.length ? event(next, 'time.week_saved', 'time_entry', changed[0].id, changed.flatMap(row => [row.id, row.userId, row.clientId, row.projectId, row.serviceId, row.retainerId])) : state
}
