export const APP = 'toast'
export const audit = state => ({ createdAt: new Date().toISOString(), createdBy: state.account.actor.id })
export const updateAudit = state => ({ updatedAt: new Date().toISOString(), updatedBy: state.account.actor.id })
export const newId = prefix => prefix + '-' + crypto.randomUUID()
export const replace = (rows, record) => rows.map(row => row.id === record.id ? record : row)
export const amount = cents => money.format((cents ?? 0) / 100)
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
export const within = (query, ...values) => values.some(value => String(value ?? '').toLowerCase().includes(query.trim().toLowerCase()))
export const parseMoney = value => /^\d+(\.\d{1,2})?$/.test(value.trim()) && Number.isSafeInteger(Math.round(Number(value) * 100))
  ? Math.round(Number(value) * 100) : null

export function localStamp(value, timeZone) {
  if (!value || !Number.isFinite(new Date(value).valueOf())) return ''
  const fields = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(value)).map(part => [part.type, part.value]))
  return fields.year + '-' + fields.month + '-' + fields.day + 'T' + fields.hour + ':' + fields.minute
}

export function localTimeOptions(value, timeZone) {
  const wallTime = Date.parse(value + ':00Z')
  if (!Number.isFinite(wallTime)) return []
  // Sample both sides of a time-zone transition to find the possible offsets.
  const day = 86400000
  const offsets = new Set([wallTime - day, wallTime, wallTime + day].map(instant =>
    Date.parse(localStamp(instant, timeZone) + ':00Z') - instant))
  return [...offsets].map(offset => wallTime - offset)
    .filter(instant => localStamp(instant, timeZone) === value)
    .sort((a, b) => a - b)
    .map(instant => new Date(instant).toISOString())
}
export const today = zone => localStamp(new Date(), zone).slice(0, 10)
export const timeLabel = (value, zone) => localStamp(value, zone).slice(11) || '—'
export function dateLabel(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(value))
}

export const serviceOptions = [['dine_in', 'Dine-in'], ['takeout', 'Takeout'], ['delivery', 'Delivery']]
export const tenderOptions = [['card', 'Card'], ['gift_card', 'Gift card'], ['cash', 'Cash']]
export const refundOptions = [['full', 'Full refund'], ['items', 'Item refund'], ['custom', 'Custom refund']]
export const optionLabel = (options, value) => options.find(([key]) => key === value)?.[1] ?? '—'
export const tenderLabel = payment => [optionLabel(tenderOptions, payment?.method), payment?.last4 && '•••• ' + payment.last4].filter(Boolean).join(' ')
export const checkLabel = order => '#' + (order?.checkNumber ?? order?.checkId ?? '—')
export const guestLabel = order => order.guestName || order.tableLabel || 'Walk-in'

export const catalogTypes = {
  menus: { singular: 'menu', label: 'Menus', fields: ['name'] },
  menuGroups: { singular: 'group', label: 'Groups', fields: ['name', 'menuId'] },
  menuItems: { singular: 'item', label: 'Items', fields: ['name', 'menuGroupId', 'description', 'priceCents', 'availability'] },
}
export const snapshot = (record, key) => Object.fromEntries(catalogTypes[key].fields.filter(field => record[field] !== undefined).map(field => [field, record[field]]))
export const liveSnapshot = (record, key) => record.published ?? (record.publicationStatus === 'published' ? snapshot(record, key) : undefined)
export const draftRecords = state => Object.keys(catalogTypes).flatMap(key =>
  state[key].filter(record => record.publicationStatus === 'draft').map(record => ({ key, record })))

export function publishedItems(state) {
  const menus = new Map(state.menus.map(row => [row.id, liveSnapshot(row, 'menus')]))
  const groups = new Map(state.menuGroups.map(row => [row.id, liveSnapshot(row, 'menuGroups')]))
  return state.menuItems.flatMap(item => {
    const live = liveSnapshot(item, 'menuItems')
    const group = groups.get(live?.menuGroupId)
    return live?.availability === 'available' && group && menus.get(group.menuId)
      ? [{ ...live, id: item.id, groupName: group.name }] : []
  })
}

export function totalsFor(lines, tipCents = 0) {
  const subtotalCents = lines.reduce((sum, line) => sum + (line.lineTotalCents ?? 0), 0)
  const taxCents = lines.reduce((sum, line) => sum + (line.taxCents ?? 0), 0)
  return { subtotalCents, taxCents, tipCents, totalCents: subtotalCents + taxCents + tipCents }
}

export function refundEligibility(state, order, payment) {
  if (order.status !== 'paid' || payment?.status !== 'settled' || payment.checkId !== order.checkId) return 'A settled payment on a paid check is required.'
  if (!['card', 'gift_card'].includes(payment.method)) return 'Cash payments are handled at the restaurant.'
  if (payment.refundedAmountCents > 0 || order.refundedAmountCents > 0 ||
      ['partial', 'full'].includes(payment.refundStatus) || ['partial', 'full'].includes(order.refundStatus) ||
      state.refunds.some(row => row.status === 'completed' && (row.paymentId === payment.id || row.orderId === order.id))) return 'A refund has already been recorded for this check.'
  if (!Number.isSafeInteger(payment.amountCents) || payment.amountCents <= 0) return 'This payment has no refundable balance.'
  if (payment.method === 'card') {
    const elapsed = Date.now() - Date.parse(payment.createdAt)
    if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed > 90 * 86400000) return 'Card payments can be refunded within 90 days of settlement.'
  }
  return ''
}

