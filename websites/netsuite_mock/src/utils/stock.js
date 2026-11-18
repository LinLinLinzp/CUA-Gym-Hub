import { itemStock } from './derived.js'
import { find, number, round, rows, sum } from './model.js'
import { list, requireValue } from './ledger.js'

export function changeStock(env, itemId, locationId, delta, receiptRate) {
  const item = find(env.state, 'items', itemId)
  requireValue(item?.type === 'inventoryItem', 'The inventory item is no longer available.')
  const opening = sum(rows(item, 'locations'), (stock) => stock.onHand)
  let stock = itemStock(item, locationId)
  if (!stock) {
    stock = { locationId, onHand: 0, reorderPoint: null, preferredStockLevel: null }
    list(item, 'locations').push(stock)
  }
  stock.onHand = round(number(stock.onHand) + delta, 8)
  if (receiptRate != null) {
    item.averageCost = opening <= 0 ? receiptRate : round((opening * number(item.averageCost) + delta * receiptRate) / (opening + delta), 4)
    item.lastPurchasePrice = receiptRate
  }
  return stock.onHand
}
