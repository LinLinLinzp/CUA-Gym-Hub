export const services = [
  { carrier: 'USPS', service: 'Ground Advantage', cents: 550 },
  { carrier: 'USPS', service: 'Priority Mail', cents: 780 },
  { carrier: 'UPS', service: 'Ground', cents: 815 },
  { carrier: 'FedEx', service: '2Day', cents: 1730 },
]

export const rows = value => Array.isArray(value) ? value.filter(Boolean) : []
export const cents = value => Math.round(Number(value) * 100)
export const money = value => value == null ? '—' : new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD',
}).format(value)

export const completeAddress = address =>
  ['line1', 'city', 'region', 'postalCode', 'country'].every(key => String(address?.[key] ?? '').trim())

const positive = value => Number.isFinite(Number(value)) && Number(value) > 0

export function quote(options) {
  const service = services.find(entry => entry.carrier === options?.carrier && entry.service === options?.service)
  if (!service || !['Box', 'Mailer'].includes(options.packageType) || !positive(options.weightOz)
    || !['length', 'width', 'height'].every(key => positive(options.dimensionsIn?.[key]))) return null
  const total = service.cents + Math.ceil(Number(options.weightOz) / 16) * 35 + (options.packageType === 'Box' ? 60 : 0)
  return Number.isSafeInteger(total) ? total : null
}

export const openBatches = (state, id) => rows(state.batches)
  .filter(batch => batch.status === 'open' && rows(batch.orderIds).includes(id))

export const activeLabel = (state, id) => rows(state.labels)
  .some(label => label.orderId === id && label.direction === 'outbound' && label.status === 'active')

export function outboundIssue(state, order, options, batchId) {
  if (!order) return 'Order is missing.'
  if (!(batchId ? ['awaiting_shipment'] : ['awaiting_shipment', 'on_hold']).includes(order.status)) {
    return 'Order status does not allow label creation.'
  }
  if (openBatches(state, order.id).some(batch => batch.id !== batchId)) return 'Order belongs to another open batch.'
  if (activeLabel(state, order.id)) return 'Order already has an active outbound label.'
  if (!order.recipient?.name || !completeAddress(order.shipTo)) return 'Recipient and a complete shipping address are required.'
  const origin = rows(state.locations).find(location => location.id === options?.shipFromId)
  if (!completeAddress(origin?.address)) return 'Select a ship-from location with a complete address.'
  if (origin.address.country !== order.shipTo.country) return 'Ship-from and delivery addresses must be in the same country.'
  if (quote(options) === null) return 'Complete the service, package, weight, and dimensions.'
  return ''
}

export const unusedLabel = label => label?.status === 'active' && label.trackingStatus === 'label_created'

export function returnable(state, order, item) {
  const used = rows(state.returns)
    .filter(entry => entry.orderId === order.id && ['outstanding', 'received'].includes(entry.status))
    .flatMap(entry => rows(entry.items))
    .filter(entry => entry.orderItemId === item.id)
    .reduce((total, entry) => total + (Number(entry.quantity) || 0), 0)
  return Math.max(0, (Number(item.quantity) || 0) - used)
}

export function returnIssue(state, order) {
  if (order?.status !== 'shipped') return 'Choose a shipped order.'
  if (!order.recipient?.name || !completeAddress(order.shipTo)) return 'A complete recipient and shipping address are required.'
  if (!rows(order.items).some(item => item.id && returnable(state, order, item) > 0)) return 'This order has no returnable items.'
  if (!rows(state.locations).some(location => completeAddress(location.address) && location.address.country === order.shipTo.country)) {
    return 'A warehouse in the recipient’s country is required.'
  }
  return ''
}

