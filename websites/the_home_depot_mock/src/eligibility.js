
import { find, records, whole } from './shared.jsx'

export const orderCancellationReasons = {
  ordered_by_mistake: 'Ordered by mistake', changed_mind: 'Changed my mind',
  no_longer_needed: 'No longer needed', other: 'Other',
}
export const returnReasons = {
  no_longer_needed: 'No longer needed', wrong_item: 'Wrong item', damaged: 'Arrived damaged',
  did_not_fit: 'Did not fit', other: 'Other',
}
export const durationOptions = { 4: '4 hours', 24: '1 day', 168: '1 week' }
export const rateKeys = { 4: 'fourHours', 24: 'daily', 168: 'weekly' }
export const canCancelOrder = (order) => ['processing', 'ready_for_pickup'].includes(order?.status)

function localDay(now) {
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
}

export function returnableLines(state, order, now = new Date()) {
  if (!['delivered', 'picked_up', 'purchased'].includes(order?.status)) return []
  const used = new Map()
  for (const request of records(state.returns)) {
    if (request.orderId !== order.id || request.status === 'cancelled') continue
    for (const item of records(request.items)) {
      if (whole(item.quantity)) used.set(item.orderItemId, (used.get(item.orderItemId) || 0) + Number(item.quantity))
    }
  }
  return records(order.items).flatMap((line) => {
    if (line.id == null || !whole(line.quantity) || (line.returnBy && line.returnBy < localDay(now))) return []
    const configured = line.returnMethods ?? (order.fulfillment === 'ship_to_home' ? ['in_store', 'mail'] : ['in_store'])
    const methods = Array.isArray(configured) ? configured.filter((value) => value === 'in_store' || value === 'mail') : []
    const available = Number(line.quantity) - (used.get(line.id) || 0)
    const product = find(state.products, line.productId)
    const rawPrice = line.unitPrice ?? product?.unitPrice
    if (available <= 0 || methods.length === 0 || rawPrice == null || rawPrice === '' || !Number.isFinite(Number(rawPrice)) || Number(rawPrice) < 0) return []
    return [{ ...line, name: line.name || product?.name || 'Order item', unitPrice: Number(rawPrice), available, methods }]
  })
}

export function rentalConflict(state, toolId, storeId, pickupAt, durationHours) {
  const start = Date.parse(pickupAt)
  const end = start + durationHours * 3600000
  return records(state.rentals).some((rental) => {
    if (!['reserved', 'active'].includes(rental.status) || rental.toolId !== toolId || rental.storeId !== storeId || !whole(rental.durationHours)) return false
    const existing = Date.parse(rental.pickupAt)
    return start < existing + rental.durationHours * 3600000 && existing < end
  })
}
