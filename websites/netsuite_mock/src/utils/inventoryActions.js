import { find, linesOf, nameOf, number, round, rows, sum, today } from './model.js'
import { onHand } from './derived.js'
import { assignLineIds, createRecord, requireFields, requireLines, requireValue, transaction, validDate, validNumber } from './ledger.js'
import { activeReference } from './orders.js'
import { changeStock } from './stock.js'

export function stockDraft(state, code) {
  return { tranDate: today(), lines: [], accountId: '', memo: '',
    [code === 'invadjst' ? 'adjustmentLocationId' : 'fromLocationId']: state.preferences?.defaultLocationId || rows(state, 'locations')[0]?.id || '',
  }
}

export function saveStockMovement(state, code, draft) {
  return transaction(state, (env) => {
    const adjustment = code === 'invadjst'
    const from = activeReference(state, 'locations', adjustment ? draft.adjustmentLocationId : draft.fromLocationId)
    const to = activeReference(state, 'locations', draft.toLocationId)
    const account = activeReference(state, 'accounts', draft.accountId)
    requireFields({ Date: draft.tranDate, ...(adjustment ? { Location: from, 'Adjustment Account': account } : { 'From Location': from, 'To Location': to }) })
    requireValue(validDate(draft.tranDate), 'Enter a valid transaction date.')
    requireValue(adjustment || from.id !== to.id, 'From Location and To Location must be different.')
    requireLines(linesOf(draft))
    const lines = assignLineIds(linesOf(draft).map((line) => {
      const item = activeReference(state, 'items', line.itemId)
      requireValue(item?.type === 'inventoryItem', 'Select an active inventory item for every line.')
      const qty = number(line.quantity ?? line.adjustQtyBy)
      requireValue(validNumber(line.quantity ?? line.adjustQtyBy) && (adjustment ? qty !== 0 : qty > 0),
        adjustment ? 'Enter a nonzero adjustment quantity.' : 'Enter a positive transfer quantity.')
      const stock = onHand(env.state, item.id, from.id)
      const after = round(stock + (adjustment ? qty : -qty), 8)
      const sku = item.itemId || item.id
      requireValue(after >= 0 || !!state.preferences?.allowNegativeInventory, adjustment
        ? `Inventory for item ${sku} at ${nameOf(state, 'locations', from.id)} cannot go below zero (new quantity: ${after}).`
        : `Not enough inventory for item ${sku} at ${nameOf(state, 'locations', from.id)}. Available to transfer: ${stock}.`)
      const values = { itemId: item.id, units: item.stockUnit || item.units || 'Ea' }
      if (adjustment) {
        changeStock(env, item.id, from.id, qty)
        return { ...values, locationId: from.id, quantityOnHandBefore: stock, adjustQtyBy: qty, newQuantity: after,
          unitCost: number(item.averageCost), memo: line.memo || '' }
      }
      changeStock(env, item.id, from.id, -qty)
      changeStock(env, item.id, to.id, qty)
      return { ...values, description: item.salesDescription || item.displayName || '', quantityOnHandFrom: stock, quantity: qty }
    }))
    const fields = adjustment ? {
      accountId: account.id, adjustmentLocationId: from.id, customerId: draft.customerId || null,
      estimatedTotalValue: round(sum(lines, (line) => line.adjustQtyBy * line.unitCost)),
    } : { fromLocationId: from.id, toLocationId: to.id }
    return createRecord(env, code, { status: 'Posted', tranDate: draft.tranDate, locationId: from.id, memo: draft.memo || '', ...fields, lines })
  })
}

export function stockPreview(state, lines, locationId, adjustment) {
  const totals = new Map()
  return lines.map((line) => {
    const item = find(state, 'items', line.itemId)
    const before = totals.get(line.itemId) ?? onHand(state, line.itemId, locationId)
    const after = round(before + (adjustment ? 1 : -1) * number(line.quantity), 8)
    totals.set(line.itemId, after)
    return { ...line, before, after, estimated: round(number(line.quantity) * number(item?.averageCost)) }
  })
}
