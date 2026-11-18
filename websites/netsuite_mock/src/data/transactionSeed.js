import { postingPeriod, round } from '../utils/model.js'
import { itemIdFor } from './reference.js'

const prefixes = {
  salesOrder: ['so', 'SO'], itemFulfillment: ['if', 'IF'], invoice: ['inv', 'INV'], customerPayment: ['pymt', 'PYMT'],
  purchaseOrder: ['po', 'PO'], itemReceipt: ['ir', 'IR'], vendorBill: ['bill', 'BILL'], vendorPayment: ['vp', 'VP'],
  inventoryAdjustment: ['adj', 'ADJ'], inventoryTransfer: ['trf', 'TRF'],
}
export const in2026 = (date) => `2026-${date}`
export const when = (date, hour = '16') => `${date}T${hour}:00:00.000Z`

export function header(type, internalId, tranDate, fields = {}) {
  const [id, tranId] = prefixes[type]
  const createdById = fields.createdById || 'emp_101'
  const createdAt = when(tranDate)
  return {
    type, internalId, id: `${id}_${internalId}`, tranId: `${tranId}${internalId}`, tranDate, postingPeriod: postingPeriod(tranDate),
    memo: '', departmentId: null, classId: null, locationId: null, createdFromId: null, createdFromType: null,
    status: '', createdById, createdAt, lastModifiedAt: createdAt, lastModifiedById: createdById, ...fields,
  }
}

export function priceLine(state, [sku, quantity, override], index, purchase = false) {
  const itemId = itemIdFor(sku)
  const item = state.items.find((row) => row.id === itemId)
  const rate = override ?? (purchase ? item.purchasePrice : item.basePrice) ?? 0
  return {
    lineId: `l${index + 1}`, line: index + 1, itemId,
    description: (purchase ? item.purchaseDescription : item.salesDescription) || item.displayName,
    quantity, units: (purchase ? item.purchaseUnit : item.saleUnit) || 'Ea', rate, amount: round(quantity * rate),
    ...(purchase ? { vendorCode: item.vendors[0]?.vendorCode || '' } : { taxable: item.taxable }),
  }
}

export function linkedPriceLine(line, quantity, index) {
  return {
    lineId: `l${index + 1}`, line: index + 1, orderLineId: line.lineId, itemId: line.itemId, description: line.description,
    quantity, units: line.units, rate: line.rate, amount: round(quantity * line.rate),
  }
}
