export const EXPENSE = 'expense_report'
export const TRAVEL = 'travel_request'

export const schemas = {
  [EXPENSE]: { key: 'expenseReports', lines: 'entries', total: 'totalAmount', path: '/expense', label: 'Expense report', noun: 'Report', plural: 'Expense reports', lineLabel: 'Expense', lineHeading: 'Expenses', prefix: 'ER', linePrefix: 'EE' },
  [TRAVEL]: { key: 'travelRequests', lines: 'expectedExpenses', total: 'estimatedTotal', path: '/requests', label: 'Travel request', noun: 'Request', plural: 'Travel requests', lineLabel: 'Estimate', lineHeading: 'Expected expenses', prefix: 'TR', linePrefix: 'XE' },
}

export const categories = ['Airfare', 'Lodging', 'Ground Transport', 'Meals', 'Office Supplies', 'Other']
export const paymentTypes = { out_of_pocket: 'Out of pocket', company_card: 'Company card' }
export const statuses = {
  draft: 'Draft', pending_approval: 'Pending approval', pending: 'Pending approval',
  sent_back: 'Sent back', approved: 'Approved', paid: 'Paid', recalled: 'Recalled', deleted: 'Deleted',
}
export const list = value => Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : []
export const activeId = state => state.account?.activeUserId
export const userById = (state, id) => list(state.users).find(user => user.id === id)
export const activeUser = state => userById(state, activeId(state))
export const editable = document => ['draft', 'sent_back'].includes(document?.status)
export const docs = (state, type) => list(state[schemas[type]?.key])
export const documentById = (state, type, id) => docs(state, type).find(document => document.id === id)
export const lines = (type, document) => list(document?.[schemas[type].lines])
export const documentTotal = (type, document) => document?.[schemas[type].total] ?? totalLines(type, lines(type, document))
export const cents = value => Math.round(Number(value) * 100)
export const lineTotal = (type, line) => type === EXPENSE ? line.amount : line.lineTotal ?? cents(line.unitAmount ?? 0) * Number(line.quantity ?? 0) / 100
export const totalLines = (type, entries) => entries.reduce((total, line) => total + (cents(lineTotal(type, line)) || 0), 0) / 100
export const documentPath = (type, id) => schemas[type].path + '/' + encodeURIComponent(id)
export const approvalPath = approval => '/approvals/' + encodeURIComponent(approval.subjectType) + '/' + encodeURIComponent(approval.subjectId) + '?approvalId=' + encodeURIComponent(approval.id)
export const isAssigned = (state, approval) => Boolean(activeId(state) && approval.approverId === activeId(state) && approval.submitterId !== activeId(state))

export function canDecide(state, approval) {
  if (!approval || !isAssigned(state, approval) || approval.status !== 'pending') return false
  const document = documentById(state, approval.subjectType, approval.subjectId)
  return Boolean(document?.status === 'pending_approval' && document.ownerId === approval.submitterId &&
    document.ownerId !== activeId(state) && (!document.approverId || document.approverId === activeId(state)))
}

export const inbox = state => list(state.approvals).filter(approval => canDecide(state, approval))
export const cyclesFor = (state, type, id) => list(state.approvals)
  .filter(approval => approval.subjectType === type && approval.subjectId === id)
  .reverse().sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
export const newest = (a, b, key = 'updatedAt') => String(b[key] ?? '').localeCompare(String(a[key] ?? '')) || String(a.id).localeCompare(String(b.id))
export const eligibleReviewers = (state, ownerId) => list(state.users).filter(user => user.id && user.id !== ownerId)
export function assignedReviewer(state, document) {
  const candidates = eligibleReviewers(state, document.ownerId)
  return candidates.find(user => user.id === document.approverId) ??
    candidates.find(user => user.id === userById(state, document.ownerId)?.managerId)
}

export const today = () => {
  const now = new Date()
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
}
const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
export function dateLabel(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? '—' : dateFormatter.format(date)
}
const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
export const money = value => Number.isFinite(Number(value)) && value != null ? dollars.format(value) : '—'
export const rangeLabel = (start, end) => start && end && start !== end ? dateLabel(start) + ' – ' + dateLabel(end) : dateLabel(start || end)

export function receiptPath(receipt) {
  const path = receipt?.url
  return typeof path === 'string' && /^\/(?:receipts|files)\/[a-zA-Z0-9_./-]+$/.test(path) && !path.split('/').includes('..') ? path : null
}
