export const tools = [
  { slug: 'rfis', label: 'RFIs', icon: 'question', key: 'rfis', entity: 'rfi', singular: 'RFI', status: 'Open' },
  { slug: 'submittals', label: 'Submittals', icon: 'layers', key: 'submittals', entity: 'submittal', singular: 'submittal', status: 'In Review' },
  { slug: 'daily-log', label: 'Daily Log', icon: 'calendar', key: 'dailyLogs', entity: 'dailyLog', singular: 'daily log', status: 'Complete' },
  { slug: 'change-orders', label: 'Change Orders', icon: 'contract', key: 'changeOrders', entity: 'changeOrder', singular: 'change order', status: 'Pending Approval' },
]

export const items = (value) => Array.isArray(value) ? value.filter(Boolean) : []
export const byId = (list, id) => id == null ? undefined : items(list).find((item) => item.id === id)
export const forProject = (list, id) => items(list).filter((item) => item.projectId === id)
export const members = (state, project) => items(state.people).filter((person) => items(project.memberIds).includes(person.id))
export const companies = (state, project) => items(state.companies).filter((company) => items(company.projectIds).includes(project.id))
export const nameOf = (list, id, empty = '—') => byId(list, id)?.name || (id ? 'Unavailable' : empty)

export function localDate(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('-')
}

export function dateLabel(value, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!value) return '—'
  const match = /^\d{4}-\d{2}-\d{2}$/.test(value)
  const date = new Date(match ? value + 'T12:00:00' : value)
  return Number.isNaN(+date) ? '—' : date.toLocaleDateString('en-US', options)
}

export const money = (value) => Number.isFinite(Number(value)) && value != null
  ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value) : '—'

export function newNumber(records, prefix) {
  const pattern = new RegExp('^' + prefix + '-(\\d+)$', 'i')
  let highest = 0n
  for (const record of records) {
    const match = pattern.exec(record.number || '')
    if (match) {
      const number = BigInt(match[1])
      if (number > highest) highest = number
    }
  }
  return prefix + '-' + String(highest + 1n).padStart(3, '0')
}

export const makeId = () => globalThis.crypto?.randomUUID?.() || 'record-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)
export const replaceRecord = (records, record) => items(records).map((item) => item.id === record.id ? record : item)
export function roundCost(value) {
  const cents = Math.abs(value) * 100
  return Math.sign(value) * Math.round(cents + cents * Number.EPSILON) / 100
}

