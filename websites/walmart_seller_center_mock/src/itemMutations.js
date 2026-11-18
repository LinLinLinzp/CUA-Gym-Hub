import { actionId, artKeys, categories, cents, list } from './model.js'

const contentFields = ['name', 'brand', 'category', 'productId', 'description']
export const itemStatuses = ['draft', 'published', 'unpublished', 'retired']
export const fulfillmentTypes = ['seller', 'walmart']

export function validateItem(values, fields) {
  const errors = {}
  for (const field of fields) {
    const value = String(values[field] ?? '').trim()
    if (['name', 'sku', 'brand'].includes(field) && !value) errors[field] = 'Enter a value.'
    if (field === 'category' && !value) errors[field] = 'Select a category.'
    if (field === 'fulfillment' && !fulfillmentTypes.includes(value)) errors[field] = 'Select a fulfillment method.'
    if (field === 'price' && (!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(value) || Number(value) <= 0 || !Number.isSafeInteger(cents(Number(value))))) {
      errors[field] = 'Enter a positive price with up to two decimal places.'
    }
    if (field === 'availableQuantity' && (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)))) {
      errors[field] = 'Enter a nonnegative whole number.'
    }
  }
  return errors
}

export function updateItem(state, { id, type, values = {}, status }) {
  const items = list(state.items)
  const existing = items.find((item) => item.id === id)
  const create = type === 'created'
  if (!create && !existing) return 'This item is unavailable.'
  const fields = {
    created: [...contentFields, 'sku', 'price', 'availableQuantity', 'fulfillment'],
    edited: contentFields,
    price_updated: ['price'],
    inventory_updated: ['availableQuantity'],
    retired: [],
    published: [],
  }[type]
  if (Object.keys(validateItem(values, fields)).length) return 'Check the highlighted fields.'
  const changes = Object.fromEntries(fields.map((field) => {
    const value = String(values[field] ?? '').trim()
    return [field, ['price', 'availableQuantity'].includes(field) ? Number(value) : value]
  }))
  if (create) {
    if (!['draft', 'published'].includes(status)) return 'Choose a listing status.'
    if (items.some((item) => String(item.sku).trim().toLowerCase() === changes.sku.toLowerCase())) return 'This SKU is already in use.'
    changes.status = status
  }
  if (type === 'inventory_updated' && existing.fulfillment !== 'seller') return 'Inventory is managed by Walmart for this item.'
  if (type === 'retired' && ['published', 'unpublished'].includes(existing.status)) changes.status = 'retired'
  if (type === 'published' && ['draft', 'unpublished', 'retired'].includes(existing.status)) {
    const listing = { ...existing, price: existing.price, availableQuantity: existing.availableQuantity }
    if (Object.keys(validateItem(listing, ['name', 'sku', 'category', 'brand', 'price', 'availableQuantity', 'fulfillment'])).length) {
      return 'Complete the required listing, price and inventory fields before publishing.'
    }
    changes.status = 'published'
  }
  if (changes.category && (create || changes.category !== existing.category)) changes.imageKey = artKeys[categories.indexOf(changes.category)] ?? 'home'

  const before = {}
  const after = {}
  for (const [key, value] of Object.entries(changes)) {
    if (!create && (existing[key] === value || existing[key] == null && value === '')) continue
    if (!create) before[key] = existing[key] ?? null
    after[key] = value
  }
  if (!Object.keys(after).length) return 'There are no changes to save.'
  const createdAt = new Date().toISOString()
  const actorId = state.account.actorId
  const item = { ...(create ? { id, createdAt } : existing), ...after, updatedAt: createdAt, updatedBy: actorId }
  const action = {
    id: actionId('ia'), itemId: id, sku: item.sku, type, actorId, createdAt, status: item.status, before, after,
    ...(type === 'inventory_updated' ? { location: state.account.inventoryLocation } : {}),
  }
  return {
    ...state,
    items: create ? [item, ...items] : items.map((entry) => entry.id === id ? item : entry),
    itemActions: [...list(state.itemActions), action],
  }
}
