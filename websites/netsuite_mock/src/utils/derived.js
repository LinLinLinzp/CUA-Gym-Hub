import { find, linesOf, number, round, rows, sum, today } from './model.js'

export const salesOpen = ['Pending Fulfillment', 'Partially Fulfilled', 'Pending Billing/Partially Fulfilled', 'Pending Billing']
export const purchaseOpen = ['Pending Receipt', 'Partially Received', 'Pending Billing/Partially Received', 'Pending Bill']
export const isStock = (state, id) => find(state, 'items', id)?.type === 'inventoryItem'
export const itemStock = (item, locationId) => rows(item, 'locations').find((stock) => stock.locationId === locationId)
export const onHand = (state, itemId, locationId) => number(itemStock(find(state, 'items', itemId), locationId)?.onHand)
export const overdue = (record, date = today()) => record.status === 'Open' && !!record.dueDate && record.dueDate < date

export function salesStatus(order, state) {
  if (['Pending Approval', 'Closed', 'Cancelled'].includes(order.status)) return order.status
  const lines = linesOf(order)
  const open = lines.filter((line) => !line.isClosed)
  const stock = open.filter((line) => isStock(state, line.itemId))
  if (!lines.length) return order.status
  if (lines.every((line) => number(line.quantityBilled) >= number(line.isClosed ? line.quantityFulfilled : line.quantity))) return 'Billed'
  if (stock.every((line) => number(line.quantityFulfilled) >= number(line.quantity))) return 'Pending Billing'
  if (stock.some((line) => number(line.quantityFulfilled) > 0)) {
    return open.some((line) => eligibleQuantity(state, 'custinvc', line) > 0) ? 'Pending Billing/Partially Fulfilled' : 'Partially Fulfilled'
  }
  return 'Pending Fulfillment'
}

export function purchaseStatus(order) {
  if (['Pending Supervisor Approval', 'Rejected by Supervisor', 'Closed'].includes(order.status)) return order.status
  const lines = linesOf(order).filter((line) => !line.isClosed)
  if (!lines.length) return order.status
  const billable = lines.some((line) => number(line.quantityReceived) > number(line.quantityBilled))
  if (lines.every((line) => number(line.quantityBilled) >= number(line.quantity))) return 'Fully Billed'
  if (lines.every((line) => number(line.quantityReceived) >= number(line.quantity))) return billable ? 'Pending Bill' : 'Fully Billed'
  if (lines.some((line) => number(line.quantityReceived) > 0)) return billable ? 'Pending Billing/Partially Received' : 'Partially Received'
  return 'Pending Receipt'
}

export function eligibleQuantity(state, code, line, restore = 0) {
  if (line.isClosed && !restore) return 0
  const ordered = number(line.quantity)
  const fulfilled = number(line.quantityFulfilled)
  const received = number(line.quantityReceived)
  const billed = number(line.quantityBilled)
  const stock = isStock(state, line.itemId)
  const remaining = {
    itemship: stock ? ordered - fulfilled : 0,
    itemrcpt: ordered - received,
    vendbill: received - billed,
    custinvc: (stock ? fulfilled : ordered) - billed + restore,
  }[code]
  return Math.max(0, round(remaining || 0, 8))
}

export function eligible(state, code, order) {
  const allowed = ['itemship', 'custinvc'].includes(code) ? salesOpen : purchaseOpen
  return !!order && allowed.includes(order.status) && linesOf(order).some((line) => eligibleQuantity(state, code, line) > 0)
}

export function totals(lines, { taxRate, discountRate, shippingCost } = {}) {
  const subtotal = round(sum(lines, (line) => line.amount))
  const discountTotal = round(-subtotal * number(discountRate) / 100) || 0
  const taxTotal = round(sum(lines.filter((line) => line.taxable), (line) => line.amount) * (1 - number(discountRate) / 100) * number(taxRate) / 100)
  return { subtotal, discountTotal, taxTotal, total: round(subtotal + discountTotal + taxTotal + number(shippingCost)) }
}

export function balanceOf(state, key, partyId) {
  return round(sum(rows(state, key).filter((record) => record.status === 'Open' && (record.customerId || record.vendorId) === partyId), (record) => record.amountRemaining))
}

export function stockMetrics(state, item, locationId) {
  const stock = itemStock(item, locationId)
  const present = number(stock?.onHand)
  const openSales = rows(state, 'salesOrders').filter((order) => salesOpen.includes(order.status))
  const openPurchases = rows(state, 'purchaseOrders').filter((order) => purchaseOpen.includes(order.status) && (order.shipToLocationId || order.locationId) === locationId)
  const remaining = item?.type === 'inventoryItem' ? sum(openSales, (order) => sum(linesOf(order).filter((line) =>
    line.itemId === item.id && !line.isClosed && (line.locationId || order.locationId) === locationId
  ), (line) => Math.max(0, number(line.quantity) - number(line.quantityFulfilled)))) : 0
  const committed = Math.min(Math.max(0, present), remaining)
  const available = Math.max(0, present - committed)
  const onOrder = item?.type === 'inventoryItem' ? sum(openPurchases, (order) => sum(linesOf(order)
    .filter((line) => line.itemId === item.id && !line.isClosed), (line) => Math.max(0, number(line.quantity) - number(line.quantityReceived)))) : 0
  return {
    onHand: present, committed, available, backOrdered: remaining - committed, onOrder,
    value: round(present * number(item?.averageCost)),
    reorderPoint: stock?.reorderPoint ?? null, preferredStockLevel: stock?.preferredStockLevel ?? null,
    low: number(stock?.reorderPoint) > 0 && available + onOrder <= number(stock?.reorderPoint),
  }
}
