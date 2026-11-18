import { array, find, signedIn, snapshot, time } from './model.js'

export const registryTypes = { baby: 'Baby', wedding: 'Wedding', classroom: 'Classroom' }
export const activeRegistry = registry => registry && registry.status !== 'deleted'
export const ownedRegistry = (state, registry) => activeRegistry(registry) && registry.ownerId === signedIn(state)
export const registryPath = registry => `/registry/${encodeURIComponent(registry.id)}`
export const registryTitle = registry => registry.name || 'Gift registry'

function setRegistry(state, before, after) {
  const records = array(state.registries)
  return { ...state, registries: before ? records.map(registry => registry === before ? after : registry) : [...records, after] }
}

export function registryChanges(before, after, keys) {
  return keys.flatMap(field => {
    const oldValue = before?.[field] ?? null
    const newValue = after?.[field] ?? null
    return oldValue === newValue ? [] : [{ field, before: oldValue, after: newValue }]
  })
}

function updateRegistry(state, registry, updates, type, event, context) {
  const record = { ...registry, ...updates, ...context.touch, events: [...array(registry.events), context.event(type, event)] }
  return { state: setRegistry(state, registry, record), registry: record }
}

export function saveRegistry(state, { registryId, values }, context) {
  const previous = find(state.registries, registryId)
  if (registryId && !ownedRegistry(state, previous)) return { error: 'This registry is unavailable to manage.' }
  const { type, eventDate, addressId, visibility } = values
  const name = values.name.trim()
  const registrantName = values.registrantName.trim()
  const date = time(eventDate)
  if (!name || !registrantName || name.length > 100 || registrantName.length > 100) return { error: 'Enter a registry title and registrant name up to 100 characters each.' }
  if (!Object.hasOwn(registryTypes, type) || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || !Number.isFinite(date) || new Date(date).toISOString().slice(0, 10) !== eventDate) return { error: 'Choose an event type and enter a valid event date.' }
  if (!find(state.profile?.addresses, addressId)) return { error: 'Select a saved gift shipping address.' }
  if (!['public', 'private'].includes(visibility)) return { error: 'Choose who can find your registry.' }
  const fields = { type, name, registrantName, eventDate, addressId, visibility }
  const changes = registryChanges(previous, fields, Object.keys(fields))
  if (previous) {
    if (!changes.length) return { error: 'Change a registry field before saving.' }
    return updateRegistry(state, previous, fields, 'updated', { changes }, context)
  }
  const registry = {
    id: context.id('registry'), ownerId: context.actorId, ...fields, status: 'active', ...context.created,
    items: [], events: [context.event('created', { changes })],
  }
  return { state: setRegistry(state, undefined, registry), registry }
}

export function deleteRegistry(state, { registryId }, context) {
  const registry = find(state.registries, registryId)
  if (!ownedRegistry(state, registry)) return { error: 'This registry is unavailable to manage.' }
  const updates = { status: 'deleted' }
  return updateRegistry(state, registry, updates, 'deleted', {
    changes: registryChanges(registry, updates, ['status']),
  }, context)
}

export const registryItems = registry => array(registry?.items).filter(item => item.status !== 'removed')
export const remainingGiftQuantity = item => Math.max(0, (Number(item.quantityRequested) || 0) - (Number(item.quantityPurchased) || 0))

function saveGift(state, registry, previous, item, type, context, purchaseId) {
  const items = array(registry.items)
  const updates = { items: previous ? items.map(value => value === previous ? item : value) : [...items, item] }
  const event = {
    itemId: item.id, productId: item.productId ?? null,
    changes: registryChanges(previous, item, ['quantityRequested', 'quantityPurchased', 'status']),
    ...(purchaseId ? { purchaseId } : {}),
  }
  return updateRegistry(state, registry, updates, type, event, context)
}

export function editGift(state, { registryId, itemId, productId, quantity, type }, context) {
  const registry = find(state.registries, registryId)
  if (!ownedRegistry(state, registry)) return { error: 'This registry is unavailable to manage.' }
  if (type === 'add') {
    const product = find(state.catalog, productId)
    if (!product?.registryEligible) return { error: 'This product cannot be added to a registry.' }
    if (!Number.isSafeInteger(quantity) || quantity < 1) return { error: 'Enter a positive whole quantity.' }
    const previous = registryItems(registry).find(item => item.productId === productId)
    const quantityRequested = (Number(previous?.quantityRequested) || 0) + quantity
    if (!Number.isSafeInteger(quantityRequested)) return { error: 'Enter a smaller quantity.' }
    const item = previous ? { ...previous, quantityRequested, ...context.touch } : {
      id: context.id('registry-item'), productId, product: snapshot(product), status: 'active',
      quantityRequested, quantityPurchased: 0, purchases: [], ...context.created,
    }
    return saveGift(state, registry, previous, item, previous ? 'item_updated' : 'item_added', context)
  }

  const previous = find(registryItems(registry), itemId)
  if (!previous) return { error: 'This gift is no longer available.' }
  if (type === 'remove') return saveGift(state, registry, previous, { ...previous, ...context.touch, status: 'removed' }, 'item_removed', context)
  if (type !== 'quantity') return { error: 'This gift change is unavailable.' }
  if (!Number.isSafeInteger(quantity) || quantity < Math.max(1, Number(previous.quantityPurchased) || 0)) return { error: 'Requested quantity must be at least one and cannot be below the purchased quantity.' }
  if (quantity === previous.quantityRequested) return { error: 'Change the requested quantity before saving.' }
  return saveGift(state, registry, previous, { ...previous, quantityRequested: quantity, ...context.touch }, 'item_updated', context)
}

export function purchaseGift(state, { registryId, itemId, quantity, giverName, retailer, reference }, context) {
  const registry = find(state.registries, registryId)
  if (!activeRegistry(registry)) return { error: 'This registry is unavailable.' }
  const item = find(registryItems(registry), itemId)
  if (!item || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > remainingGiftQuantity(item)) return { error: 'Choose a quantity that is still requested.' }
  const giver = giverName.trim()
  const purchaseRetailer = retailer.trim()
  const purchaseReference = reference?.trim()
  if (!giver || !purchaseRetailer || [giver, purchaseRetailer, purchaseReference].some(value => value?.length > 100)) return { error: 'Enter a giver name and retailer, up to 100 characters each.' }
  const product = find(state.catalog, item.productId)
  const purchase = {
    id: context.id('registry-purchase'), quantity, giverName: giver, retailer: purchaseRetailer, actorId: context.actorId, createdAt: context.createdAt,
    ...(Number.isFinite(product?.price) ? { unitPrice: product.price } : {}),
    ...(purchaseReference ? { reference: purchaseReference } : {}),
  }
  const after = { ...item, ...context.touch, quantityPurchased: (Number(item.quantityPurchased) || 0) + quantity, purchases: [...array(item.purchases), purchase] }
  return saveGift(state, registry, item, after, 'item_purchased', context, purchase.id)
}
