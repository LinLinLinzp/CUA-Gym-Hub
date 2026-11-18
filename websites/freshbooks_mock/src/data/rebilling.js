import { expenseSource, manualLine, timeSource } from './invoice.js'
import { cents, find, inRange, nameOf, visible } from '../utils/format.js'

export function buildImport(state, scope, excluded = []) {
  const skip = new Set(excluded.map(source => `${source.type}:${source.id}`))
  const applies = (row, date, type) => visible(row) && row.billable && row.status === 'unbilled' && !row.invoiceId &&
    row.clientId === scope.clientId && scope.projects.includes(row.projectId || '') && inRange(date, scope.from, scope.to) && !skip.has(`${type}:${row.id}`)
  const ordered = key => (a, b) => (a[key] || '').localeCompare(b[key] || '') || a.id.localeCompare(b.id)
  const client = find(state.clients, scope.clientId)
  const tracks = (client?.currency || state.business?.currency || 'USD') === scope.currency ? state.timeEntries
    .filter(row => !row.retainerId && row.durationMinutes > 0 && applies(row, row.workDate, 'time_entry')).sort(ordered('workDate')) : []
  const expenses = scope.expenses ? state.expenses.filter(row => row.currency === scope.currency && applies(row, row.expenseDate, 'expense')).sort(ordered('expenseDate')) : []
  const groups = new Map()
  for (const row of tracks) {
    const { rate, source } = timeSource(state, row)
    const key = scope.format === 'simple' ? 'all' : scope.format === 'grouped' ? JSON.stringify([row.projectId, row.serviceId, rate]) : row.id
    const group = groups.get(key) || {
      rate, serviceId: scope.format === 'simple' ? null : row.serviceId || null,
      name: scope.format === 'simple' ? 'Billable Time' : row.serviceId ? nameOf(state.services, row.serviceId) : 'Billable Time',
      description: scope.format === 'detailed' ? [row.workDate, row.projectId && nameOf(state.projects, row.projectId), row.notes].filter(Boolean).join(' · ')
        : scope.format === 'grouped' ? (row.projectId ? nameOf(state.projects, row.projectId) : 'No Project') : 'Summary of tracked work',
      sources: [],
    }
    group.sources.push(source)
    groups.set(key, group)
  }
  const lines = [...groups.values()].map(({ sources, rate, ...group }) => {
    const minutes = sources.reduce((sum, source) => sum + source.minutes, 0)
    const quantity = Math.round(minutes * 100 / 60) / 100
    const subtotal = sources.reduce((sum, source) => sum + cents(source.amount), 0)
    return manualLine({ ...group, kind: 'time', quantity, rate: scope.format === 'simple' ? Math.round(subtotal * 60 / minutes) / 100 : rate, sources })
  })
  for (const row of expenses) {
    const source = expenseSource(row)
    lines.push(manualLine({ kind: 'expense', name: row.merchant || 'Expense', description: row.description || 'Billable expense', rate: source.amount, sources: [source] }))
  }
  return lines
}
