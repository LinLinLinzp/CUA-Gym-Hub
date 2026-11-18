import { addDays, cents, dateKey, find, today, validDate, visible } from '../utils/format.js'
import { requireThat, stamp } from './commands.js'

export function boundary(anchor, unit, size, index) {
  if (!validDate(anchor) || !Number.isFinite(index)) return ''
  if (unit === 'weekly' || unit === 'custom') return addDays(anchor, index * (unit === 'weekly' ? 7 : (Number(size) || 1)))
  const [year, month, day] = anchor.split('-').map(Number)
  const offset = unit === 'yearly' ? index * 12 : index
  const lastDay = new Date(Date.UTC(year, month + offset, 0)).getUTCDate()
  return dateKey(new Date(Date.UTC(year, month - 1 + offset, Math.min(day, lastDay))))
}
export function windowAt(retainer, index) {
  return {
    startDate: boundary(retainer.startDate, retainer.periodUnit, retainer.customPeriodDays, index),
    endDate: boundary(retainer.startDate, retainer.periodUnit, retainer.customPeriodDays, index + 1),
  }
}
export function windowFor(retainer, date) {
  if (!validDate(date) || !validDate(retainer.startDate) || date < retainer.startDate) return null
  const [year, month] = date.split('-').map(Number)
  const [startYear, startMonth] = retainer.startDate.split('-').map(Number)
  const days = (Date.parse(date) - Date.parse(retainer.startDate)) / 86400000
  let index
  switch (retainer.periodUnit) {
    case 'weekly': index = Math.floor(days / 7); break
    case 'custom': index = Math.floor(days / (Number(retainer.customPeriodDays) || 1)); break
    case 'yearly': index = year - startYear; break
    default: index = (year - startYear) * 12 + month - startMonth
  }
  const window = windowAt(retainer, index)
  return date < window.startDate ? windowAt(retainer, index - 1) : window
}
export function periodTerms(retainer) {
  return {
    includedMinutes: Number(retainer.includedMinutes) || 0, feePerPeriod: Number(retainer.feePerPeriod) || 0,
    excessHourlyRate: Number(retainer.excessHourlyRate) || 0, currency: retainer.currency || 'USD',
  }
}
export function periodRow(state, retainer, window) {
  return state.retainerPeriods.find(row => row.retainerId === retainer.id && row.startDate === window.startDate) ||
    { ...stamp(state), id: `rp_${retainer.id.replace(/^ret_/, '')}_${window.startDate}`, retainerId: retainer.id, ...window, ...periodTerms(retainer), feeInvoiceId: null }
}
export function eligibleRetainer(state, form) {
  const project = find(state.projects, form.projectId)
  const active = row => row.clientId === form.clientId && row.status === 'active' && !visible(row, 'deleted') && windowFor(row, form.workDate)
  const retainer = state.retainers.find(row => row.id === project?.retainerId && active(row)) || state.retainers.find(active)
  if (!retainer) return null
  return [retainer, windowFor(retainer, form.workDate)]
}
export function allocatedMinutes(state, retainerId, start, ignoreId) {
  const totals = new Map()
  for (const invoice of state.invoices) {
    if (invoice.id === ignoreId || invoice.kind !== 'retainer_excess' || invoice.retainerId !== retainerId || invoice.retainerPeriodStart !== start || visible(invoice, 'deleted')) continue
    for (const line of invoice.lines || []) for (const source of line.sources || []) {
      if (source.type === 'time_entry') totals.set(source.id, (totals.get(source.id) || 0) + (Number(source.minutes) || 0))
    }
  }
  return totals
}
export function periodWork(state, retainerId, start) {
  return state.timeEntries.filter(row => row.retainerId === retainerId && row.retainerPeriodStart === start && visible(row))
}
export function periodStats(state, period, ignoreId) {
  const entries = periodWork(state, period.retainerId, period.startDate)
  const logged = entries.reduce((sum, row) => sum + (Number(row.durationMinutes) || 0), 0)
  const included = Number(period.includedMinutes) || 0
  const allocated = allocatedMinutes(state, period.retainerId, period.startDate, ignoreId)
  const billed = [...allocated.values()].reduce((sum, minutes) => sum + minutes, 0)
  const excess = Math.max(0, logged - included)
  return { entries, logged, included, remaining: Math.max(0, included - logged), excess, billed, openExcess: Math.max(0, excess - billed), allocated }
}
export function validateExcess(state, invoice) {
  const period = state.retainerPeriods.find(row => row.retainerId === invoice.retainerId && row.startDate === invoice.retainerPeriodStart)
  const retainer = find(state.retainers, invoice.retainerId)
  const original = find(state.invoices, invoice.id)
  if (original && !visible(original, 'deleted')) {
    const allocation = row => (row.lines || []).flatMap(line => line.sources || []).sort((a, b) => a.id.localeCompare(b.id))
    requireThat(JSON.stringify(allocation(original)) === JSON.stringify(allocation(invoice)), 'Keep the original excess allocations on an issued invoice.')
    return
  }
  requireThat(period && retainer && retainer.clientId === invoice.clientId && (original || !visible(retainer, 'deleted')) && period.currency === invoice.currency && validDate(period.endDate) && period.endDate <= today() && period.excessHourlyRate > 0, 'Excess can only be billed for a closed period with an excess rate.')
  const stats = periodStats(state, period, invoice.id)
  const used = new Set()
  let total = 0
  for (const source of (invoice.lines || []).flatMap(line => line.sources || [])) {
    const entry = find(stats.entries, source.id)
    requireThat(source.type === 'time_entry' && entry && !used.has(source.id) && Number.isInteger(source.minutes) && source.minutes > 0 &&
      source.minutes <= Number(entry.durationMinutes) - (stats.allocated.get(source.id) || 0) &&
      cents(source.amount) === cents(source.minutes * period.excessHourlyRate / 60), 'Some excess time is no longer available. Review the period again.')
    used.add(source.id)
    total += source.minutes
  }
  requireThat(total > 0 && total <= stats.openExcess, 'Some excess time is no longer available. Review the period again.')
}
