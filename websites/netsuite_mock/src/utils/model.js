export const transactions = {
  salesord: { key: 'salesOrders', type: 'salesOrder', title: 'Sales Order', plural: 'Sales Orders', prefix: 'SO', party: 'customer' },
  itemship: { key: 'itemFulfillments', type: 'itemFulfillment', title: 'Item Fulfillment', plural: 'Item Fulfillments', prefix: 'IF', party: 'customer' },
  purchord: { key: 'purchaseOrders', type: 'purchaseOrder', title: 'Purchase Order', plural: 'Purchase Orders', prefix: 'PO', party: 'vendor' },
  itemrcpt: { key: 'itemReceipts', type: 'itemReceipt', title: 'Item Receipt', plural: 'Item Receipts', prefix: 'IR', party: 'vendor' },
  vendbill: { key: 'vendorBills', type: 'vendorBill', title: 'Vendor Bill', plural: 'Vendor Bills', prefix: 'BILL', party: 'vendor' },
  invadjst: { key: 'inventoryAdjustments', type: 'inventoryAdjustment', title: 'Inventory Adjustment', plural: 'Inventory Adjustments', prefix: 'ADJ' },
  invtrnfr: { key: 'inventoryTransfers', type: 'inventoryTransfer', title: 'Inventory Transfer', plural: 'Inventory Transfers', prefix: 'TRF' },
  custinvc: { key: 'invoices', type: 'invoice', title: 'Invoice', plural: 'Invoices', prefix: 'INV', party: 'customer' },
  custpymt: { key: 'customerPayments', type: 'customerPayment', title: 'Customer Payment', plural: 'Customer Payments', prefix: 'PYMT', party: 'customer' },
  vendpymt: { key: 'vendorPayments', type: 'vendorPayment', title: 'Vendor Payment', plural: 'Vendor Payments', prefix: 'VP', party: 'vendor' },
}

export const entities = {
  custjob: { key: 'customers', type: 'customer', title: 'Customer', plural: 'Customers', prefix: 'C', directory: 'entity', list: 'custjoblist' },
  vendor: { key: 'vendors', type: 'vendor', title: 'Vendor', plural: 'Vendors', prefix: 'V', directory: 'entity', list: 'vendorlist' },
  item: { key: 'items', type: 'item', title: 'Item', plural: 'Items', directory: 'item', list: 'itemlist' },
}
export const records = { ...transactions, ...entities }
export const codeOf = (type) => Object.keys(records).find((code) => records[code].type === type)
export const rows = (state, key) => Array.isArray(state?.[key]) ? state[key].filter(Boolean) : []
export const linesOf = (record) => rows(record, 'lines')
export const find = (state, key, id) => id == null || id === '' ? undefined : rows(state, key).find((record) => (record.id != null && String(record.id) === String(id)) || (record.internalId != null && String(record.internalId) === String(id)))
export const label = (record) => record?.companyName || record?.displayName || record?.name || record?.itemId || record?.tranId || record?.entityId || record?.id || '—'
export const nameOf = (state, key, id) => {
  const record = find(state, key, id)
  return record && key === 'accounts' ? `${record.number || ''} ${label(record)}`.trim() : label(record)
}
export const documentNo = (record) => record?.transactionNumber || record?.tranId || record?.entityId || record?.itemId || record?.id || '—'
export const partyOf = (state, record) => nameOf(state, record.vendorId ? 'vendors' : 'customers', record.vendorId || record.customerId)
export const locationOf = (row) => row.shipToLocationId || row.adjustmentLocationId || row.fromLocationId || row.locationId
export const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0
export function round(value, digits = 2) {
  if (!Number.isFinite(value)) return 0
  const [coefficient, exponent = '0'] = String(Math.abs(value)).split('e')
  const shifted = Number(`${coefficient}e${Number(exponent) + digits}`)
  if (!Number.isFinite(shifted)) return value
  const rounded = Math.round(shifted) / 10 ** digits
  return rounded ? Math.sign(value) * rounded : 0
}
export const money = (value) => number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const quantity = (value) => number(value).toLocaleString('en-US', { maximumFractionDigits: 4 })
export const sum = (list, get) => list.reduce((total, row) => total + number(get(row)), 0)
export const today = () => {
  const date = new Date()
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}
export const formatDate = (date) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date || '')
  return match ? `${+match[2]}/${+match[3]}/${match[1]}` : (date || '—')
}
export const plusDays = (date, days) => {
  const value = new Date(`${date}T00:00:00Z`)
  if (Number.isNaN(value.getTime())) return ''
  value.setUTCDate(value.getUTCDate() + number(days))
  return value.toISOString().slice(0, 10)
}
export const postingPeriod = (date) => date ? new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : ''
export const addressText = (value) => typeof value === 'string' ? value : [
  value?.addressee, value?.attention, value?.addr1, value?.addr2,
  [[value?.city, value?.state].filter(Boolean).join(', '), value?.zip].filter(Boolean).join(' '),
  value?.country,
].filter(Boolean).join('\n')
