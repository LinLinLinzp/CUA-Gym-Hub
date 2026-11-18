import { find, number, plusDays, round, today } from './model.js'
import { itemStock, stockMetrics } from './derived.js'
import { requireFields, requireLines, requireValue, transaction, validNumber } from './ledger.js'
import { activeReference, defaultsForParty, orderDraft, saveOrderIn } from './orders.js'

export function orderItems(state, locationId, selections) {
  return transaction(state, (env) => {
    const location = activeReference(state, 'locations', locationId)
    requireFields({ Location: location })
    requireLines(selections)
    const grouped = new Map()
    const seen = new Set()
    for (const entry of selections) {
      const item = activeReference(state, 'items', entry.itemId)
      const vendor = item && activeReference(state, 'vendors', item.preferredVendorId)
      requireValue(item?.type === 'inventoryItem' && vendor && itemStock(item, locationId) && stockMetrics(state, item, locationId).low && !seen.has(item.id),
        'A selected item is no longer eligible for reorder.')
      requireValue(validNumber(entry.quantity) && number(entry.quantity) > 0, 'Enter a positive quantity for each selected item.')
      seen.add(item.id)
      if (!grouped.has(vendor.id)) grouped.set(vendor.id, [])
      grouped.get(vendor.id).push({ itemId: item.id, quantity: number(entry.quantity), rate: number(item.purchasePrice),
        description: item.purchaseDescription || item.displayName || '' })
    }
    const date = today()
    return [...grouped].map(([vendorId, lines]) => saveOrderIn(env, 'purchord', {
      ...orderDraft(state, 'purchord'), ...defaultsForParty(state, 'purchord', vendorId),
      vendorId, locationId: location.id, tranDate: date, dueDate: plusDays(date, 14), lines,
    }))[0]
  })
}

export function suggestedQuantity(row) {
  return Math.max(1, round(number(row.preferredStockLevel || row.reorderPoint) - row.available - row.onOrder, 4))
}

export const preferredVendor = (state, row) => find(state, 'vendors', row.item.preferredVendorId)
