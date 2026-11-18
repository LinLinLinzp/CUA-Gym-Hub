import { documentNo, find, linesOf, nameOf, number, plusDays, round, rows, sum, today } from './model.js'
import { eligible, eligibleQuantity, isStock, onHand, purchaseStatus, salesStatus } from './derived.js'
import { assignLineIds, createRecord, existing, requireFields, requireLines, requireValue, transaction, updateRecord, validDate, validNumber } from './ledger.js'
import { changeStock } from './stock.js'

export const sourceCode = (code) => ['itemship', 'custinvc'].includes(code) ? 'salesord' : 'purchord'
export const sourceKey = (code) => sourceCode(code) === 'salesord' ? 'salesOrders' : 'purchaseOrders'

export function sourceLines(state, code, source, prior) {
  return linesOf(source).map((line) => {
    const previous = linesOf(prior).find((entry) => entry.orderLineId === line.lineId)
    const isClosed = ['Closed', 'Cancelled'].includes(source?.status) || line.isClosed
    const maximum = prior && isClosed ? number(previous?.quantity) : eligibleQuantity(state, code, line, number(previous?.quantity))
    return { ...line, selected: prior ? !!previous : maximum > 0, quantity: prior ? previous?.quantity ?? maximum : maximum,
      orderLineId: line.lineId, maximum, childLineId: previous?.lineId, ...(previous && { rate: previous.rate }) }
  }).filter((line) => line.maximum > 0)
}

export function conversionDraft(state, code, source, record) {
  const date = record?.tranDate || today()
  const termsId = record?.termsId || source.termsId || ''
  const shipUsed = rows(state, 'invoices').some((invoice) => invoice.createdFromId === source.id && invoice.status !== 'Voided' &&
    invoice.id !== record?.id && number(invoice.shippingCost) > 0)
  return {
    locationId: source.shipToLocationId || source.locationId || '', customerId: source.customerId, vendorId: source.vendorId,
    tranDate: date, termsId, dueDate: plusDays(date, find(state, 'terms', termsId)?.days), status: 'Shipped',
    billAddress: source.billAddress || '', shipDate: source.shipDate || '', shipMethodId: source.shipMethodId || '',
    shipAddress: source.shipAddress || '', salesRepId: source.salesRepId || '', otherRefNum: source.otherRefNum || '',
    taxItemId: source.taxItemId || '', taxRate: number(source.taxRate), discountRate: number(source.discountRate),
    shippingCost: shipUsed ? 0 : number(source.shippingCost),
    ...record, lines: sourceLines(state, code, source, record),
  }
}

const titleFor = (code) => ({ itemship: 'fulfill', itemrcpt: 'receive', vendbill: 'bill', custinvc: 'bill' }[code])

export function linkedLines(state, code, source, draft, prior) {
  const requested = linesOf(draft).filter((row) => row.selected)
  requireLines(requested)
  const oldLines = linesOf(prior)
  const validLines = sourceLines(state, code, source, prior)
  const seen = new Set()
  const lines = requested.map((entry) => {
    const original = validLines.find((line) => line.orderLineId === entry.orderLineId)
    requireValue(original && !seen.has(entry.orderLineId), 'A selected source line is no longer eligible.')
    seen.add(entry.orderLineId)
    const item = find(state, 'items', original.itemId)
    requireValue(item, 'A selected item is no longer available.')
    const sku = item.itemId || item.displayName || item.id
    const qty = number(entry.quantity)
    requireValue(validNumber(entry.quantity) && qty > 0, 'Quantity must be greater than zero.')
    const over = code === 'vendbill'
      ? `The quantity billed (${qty}) exceeds the quantity received and not yet billed (${original.maximum}) for item ${sku}.`
      : `You can not ${titleFor(code)} more than the remaining quantity (${original.maximum}) for item ${sku}.`
    requireValue(qty <= original.maximum, over)
    const usesLocation = code === 'itemship' || code === 'itemrcpt'
    const row = {
      lineId: original.childLineId, orderLineId: original.orderLineId, itemId: original.itemId,
      description: original.description || item.description || item.displayName || '', quantity: qty, units: original.units || item.units || 'Ea',
      ...(usesLocation && { locationId: original.locationId || source.shipToLocationId || source.locationId }),
    }
    if (code !== 'itemship') {
      const rate = code === 'custinvc' ? number(entry.rate ?? original.rate) : number(original.rate)
      requireValue(rate >= 0, 'Rate must be zero or greater.')
      row.rate = round(rate, 4)
      row.amount = round(row.rate * qty)
    }
    if (code === 'custinvc') row.taxable = original.taxable ?? item.taxable !== false
    return row
  })
  return assignLineIds(lines, oldLines)
}

export function applySourceDelta(env, code, source, added, removed = []) {
  const parentCode = sourceCode(code)
  const field = { itemship: 'quantityFulfilled', itemrcpt: 'quantityReceived', vendbill: 'quantityBilled', custinvc: 'quantityBilled' }[code]
  const lines = linesOf(source).map((line) => {
    const delta = sum(added.filter((entry) => entry.orderLineId === line.lineId), (entry) => entry.quantity)
      - sum(removed.filter((entry) => entry.orderLineId === line.lineId), (entry) => entry.quantity)
    return delta ? { ...line, [field]: Math.max(0, round(number(line[field]) + delta, 8)) } : line
  })
  const candidate = { ...source, lines }
  const status = parentCode === 'salesord' ? salesStatus(candidate, env.state) : purchaseStatus(candidate)
  if (status === source.status && lines.every((line, i) => line === linesOf(source)[i])) return source
  return updateRecord(env, parentCode, source, { status, lines }, 'Status')
}

export function saveMovement(state, code, sourceId, draft) {
  return transaction(state, (env) => {
    const source = existing(env.state, sourceCode(code), sourceId)
    requireValue(eligible(env.state, code, source), 'This order has no eligible quantities remaining.')
    requireFields({ Date: draft.tranDate })
    requireValue(validDate(draft.tranDate), 'Enter a valid transaction date.')
    const locationId = source.shipToLocationId || source.locationId
    const lines = linkedLines(env.state, code, source, draft)
    const values = { tranDate: draft.tranDate, locationId: locationId || null,
      createdFromId: source.id, createdFromType: sourceCode(code) === 'salesord' ? 'salesOrder' : 'purchaseOrder',
      departmentId: source.departmentId || null, classId: source.classId || null, memo: draft.memo || '', lines }
    if (code === 'itemship') {
      for (const line of lines) {
        const available = onHand(env.state, line.itemId, line.locationId)
        requireValue(find(env.state, 'locations', line.locationId), 'The source line requires a valid warehouse.')
        const item = find(env.state, 'items', line.itemId)
        requireValue(available >= line.quantity || !!state.preferences?.allowNegativeInventory,
          `Insufficient quantity on hand for item ${item.itemId || item.id} at location ${nameOf(env.state, 'locations', line.locationId)}. On hand: ${available}, requested: ${line.quantity}.`)
        changeStock(env, line.itemId, line.locationId, -line.quantity)
      }
      const status = ['Picked', 'Packed', 'Shipped'].includes(draft.status) ? draft.status : 'Shipped'
      Object.assign(values, { customerId: source.customerId, status, shipMethodId: draft.shipMethodId || null,
        shipAddress: draft.shipAddress || '', trackingNumbers: draft.trackingNumbers || '', shippedAt: status === 'Shipped' ? env.now : null })
    } else if (code === 'itemrcpt') {
      for (const line of lines) {
        requireValue(find(env.state, 'locations', line.locationId), 'The source line requires a valid warehouse.')
        if (isStock(env.state, line.itemId)) changeStock(env, line.itemId, line.locationId, line.quantity, line.rate)
      }
      Object.assign(values, { vendorId: source.vendorId, status: 'Received', total: round(sum(lines, (line) => line.amount)) })
    } else {
      requireFields({ 'Reference No.': draft.tranId?.trim(), 'Due Date': draft.dueDate })
      requireValue(validDate(draft.dueDate), 'Enter a valid due date.')
      const total = round(sum(lines, (line) => line.amount))
      Object.assign(values, { vendorId: source.vendorId, tranId: draft.tranId.trim(), termsId: draft.termsId || null,
        dueDate: draft.dueDate, apAccountId: 'acct_2000', status: total > 0 ? 'Open' : 'Paid In Full',
        expenses: [], total, amountPaid: 0, amountRemaining: total })
    }
    const child = createRecord(env, code, values)
    applySourceDelta(env, code, source, lines)
    return child
  })
}

export function shipmentStage(state, id, status) {
  return transaction(state, (env) => {
    const record = existing(env.state, 'itemship', id)
    requireValue((record.status === 'Picked' && status === 'Packed') || (['Picked', 'Packed'].includes(record.status) && status === 'Shipped'),
      'This fulfillment has already reached that stage.')
    return updateRecord(env, 'itemship', record, { status, ...(status === 'Shipped' && { shippedAt: env.now }) }, 'Status')
  })
}

export function sourceOption(row) {
  return { id: row.id, text: documentNo(row) }
}
