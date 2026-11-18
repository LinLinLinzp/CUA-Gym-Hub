import { find, rows, today, number, round } from './model.js'
import { createRecord, existing, requireFields, requireValue, transaction, updateRecord, validNumber } from './ledger.js'

function nonnegative(value, field, digits = 2) {
  if (value == null || value === '') return null
  requireValue(validNumber(value) && number(value) >= 0, `${field} must be zero or greater.`)
  return round(number(value), digits)
}

const itemFields = ['itemId', 'displayName', 'classId', 'departmentId', 'upcCode', 'manufacturer', 'mpn', 'unitsType',
  'stockUnit', 'saleUnit', 'purchaseUnit', 'salesDescription', 'purchaseDescription', 'preferredVendorId',
  'incomeAccountId', 'cogsAccountId', 'assetAccountId', 'expenseAccountId']
const picked = (values, fields) => Object.fromEntries(fields.map((field) => [field, values[field] ?? '']))

export function itemDraft(state, record) {
  return record ? { ...record, locations: rows(record, 'locations') } : {
    type: 'inventoryItem', classId: '', unitsType: 'Each', stockUnit: 'Ea', saleUnit: 'Ea', purchaseUnit: 'Ea', taxable: true,
    incomeAccountId: 'acct_4000', cogsAccountId: 'acct_5000', assetAccountId: 'acct_1200', inactive: false, locations: [],
  }
}

export function saveItem(state, draft, id) {
  return transaction(state, (env) => {
    const current = id ? existing(env.state, 'item', id) : null
    const sku = draft.itemId?.trim()
    const name = draft.displayName?.trim()
    requireFields({ 'Item Name / SKU': sku, 'Display Name': name })
    requireValue(!rows(state, 'items').some((item) => item.id !== current?.id && item.itemId?.toLowerCase() === sku.toLowerCase()), 'An item with this SKU already exists.')
    const type = current?.type || 'inventoryItem'
    const stock = type === 'inventoryItem'
    const locations = []
    const known = new Set([...rows(current, 'locations').map((row) => row.locationId), ...rows(draft, 'locations').map((row) => row.locationId)])
    if (stock) for (const locationId of known) {
      const before = rows(current, 'locations').find((row) => row.locationId === locationId)
      const input = rows(draft, 'locations').find((row) => row.locationId === locationId)
      if (!before && !find(state, 'locations', locationId)) continue
      locations.push({ ...before, locationId, onHand: current ? number(before?.onHand) : nonnegative(input?.onHand, 'Initial quantity', 8) || 0,
        reorderPoint: nonnegative(input?.reorderPoint ?? null, 'Reorder point', 8),
        preferredStockLevel: nonnegative(input?.preferredStockLevel ?? null, 'Preferred stock level', 8) })
    }
    const purchasePrice = nonnegative(draft.purchasePrice, 'Purchase price', 4) || 0
    const values = { ...picked(draft, itemFields), itemId: sku, displayName: name, type, inactive: !!draft.inactive,
      taxable: draft.taxable !== false, basePrice: nonnegative(draft.basePrice, 'Base price') || 0, purchasePrice, locations }
    if (!current && stock) Object.assign(values, { averageCost: purchasePrice, lastPurchasePrice: purchasePrice, costingMethod: 'Average', subtype: null })
    if (draft.preferredVendorId !== current?.preferredVendorId || !current) {
      const vendors = rows(current, 'vendors').map((vendor) => ({ ...vendor, preferred: vendor.vendorId === draft.preferredVendorId }))
      if (draft.preferredVendorId && !vendors.some((vendor) => vendor.vendorId === draft.preferredVendorId)) {
        vendors.push({ vendorId: draft.preferredVendorId, vendorCode: '', purchasePrice, preferred: true })
      }
      values.vendors = vendors
    }
    return current ? updateRecord(env, 'item', current, values, 'Edit', true) : createRecord(env, 'item', values)
  })
}

const commonFields = ['companyName', 'email', 'phone', 'fax', 'url', 'category', 'termsId', 'primaryContact', 'comments']
const customerFields = ['salesRepId', 'defaultLocationId', 'taxItemId', 'shipMethodId', 'status', 'priceLevel', 'creditHold']
const vendorFields = ['legalName', 'accountNumber', 'taxId', 'currency', 'defaultExpenseAccountId']
const addressFields = ['addressee', 'attention', 'addr1', 'addr2', 'city', 'state', 'zip', 'country']
export const blankAddress = { addressee: '', attention: '', addr1: '', addr2: '', city: '', state: '', zip: '', country: 'United States' }

export function partyDraft(state, code, record) {
  if (record) return { ...record }
  const defaults = { inactive: false, termsId: find(state, 'terms', 'term_n30')?.id || '', currency: state.company?.currency || 'USD' }
  return code === 'custjob' ? { ...defaults, status: 'CUSTOMER-Closed Won', creditHold: 'Auto', taxable: true, priceLevel: 'Base Price',
    defaultLocationId: state.preferences?.defaultLocationId || '', billAddress: blankAddress, shipAddress: blankAddress } : { ...defaults, address: blankAddress }
}

export function saveParty(state, code, draft, id) {
  return transaction(state, (env) => {
    const companyName = draft.companyName?.trim()
    requireFields({ 'Company Name': companyName })
    requireValue(!draft.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()), 'Enter a valid email address.')
    const current = id ? existing(env.state, code, id) : null
    const values = { ...picked(draft, commonFields), companyName, inactive: !!draft.inactive, email: draft.email?.trim() || '' }
    const address = (value) => typeof value === 'string' ? value : picked(value || blankAddress, addressFields)
    if (code === 'custjob') Object.assign(values, picked(draft, customerFields), {
      creditLimit: nonnegative(draft.creditLimit, 'Credit limit'), taxable: draft.taxable !== false,
      billAddress: address(draft.billAddress), shipAddress: address(draft.shipAddress), isPerson: !!current?.isPerson,
    })
    else Object.assign(values, picked(draft, vendorFields), {
      address: address(draft.address), is1099Eligible: !!draft.is1099Eligible, creditLimit: current?.creditLimit ?? null,
    })
    if (!current) values.dateCreated = today()
    return current ? updateRecord(env, code, current, values) : createRecord(env, code, values)
  })
}

