import { byId, list } from '../utils/read.js'
import { lineIssue, lineItem, positiveInt, validCents } from './inventory.js'

export const identifier = (prefix) => `${prefix}-${crypto.randomUUID()}`
export const nowIso = () => new Date().toISOString()
export const actor = (state) => state.guest?.id
export const audit = (state, prefix, createdAt) => ({ id: identifier(prefix), actorId: actor(state), createdAt })
const fail = (error) => ({ error })
const sameKey = (a, b) => a.productId === b.productId && a.variantId === b.variantId &&
  a.fulfillment === b.fulfillment && (a.storeId ?? null) === (b.storeId ?? null)

export function eventLine(state, line) {
  const livePrice = lineItem(state, line).variant?.priceCents
  const unitPriceCents = validCents(livePrice) ? livePrice : line.unitPriceCents ?? 0
  return {
    lineId: line.id, productId: line.productId, variantId: line.variantId, fulfillment: line.fulfillment,
    storeId: line.storeId ?? null, quantity: line.quantity, unitPriceCents, amountCents: unitPriceCents * (line.quantity || 0),
  }
}

export function cartEvent(state, { action, source = 'cart', before = [], after = [], fromList = null, toList = null, ...rest }, now) {
  return {
    ...audit(state, 'cart-event', now), action, source, fromList, toList,
    before: before.map((line) => eventLine(state, line)), after: after.map((line) => eventLine(state, line)), ...rest,
  }
}

function commit(state, items, savedItems, event, now, line) {
  return {
    state: { ...state, cart: { ...state.cart, items, savedItems, updatedAt: now }, cartEvents: [...list(state.cartEvents), cartEvent(state, event, now)] },
    line,
  }
}

function updatedLine(state, line, now) {
  const { product, variant } = lineItem(state, line)
  if (!product || !variant) return { ...line, updatedAt: now }
  return {
    ...line, title: product.title || line.title || 'Product unavailable', variantLabel: variant.label || 'Standard',
    unitPriceCents: variant.priceCents ?? line.unitPriceCents, updatedAt: now,
  }
}

function replace(lines, line) {
  return lines.map((existing) => existing.id === line.id ? line : existing)
}

export function addToCart(state, { productId, variantId, quantity, fulfillment, storeId, source = 'product' }) {
  if (!actor(state)) return fail('Guest information is unavailable.')
  if (!positiveInt(quantity)) return fail('Choose a valid quantity.')
  const items = list(state.cart?.items)
  const now = nowIso()
  const requested = { productId, variantId, quantity, fulfillment, storeId: fulfillment === 'pickup' ? storeId ?? null : null }
  const match = items.find((line) => sameKey(line, requested))
  const line = match
    ? updatedLine(state, { ...match, quantity: match.quantity + quantity }, now)
    : updatedLine(state, { ...audit(state, 'cart-line', now), ...requested }, now)
  const next = match ? replace(items, line) : [...items, line]
  const error = lineIssue(state, line, next, new Date(now))
  return error ? fail(error) : commit(state, next, list(state.cart?.savedItems),
    { action: 'add', source, before: match ? [match] : [], after: [line], fromList: match ? 'items' : null, toList: 'items' }, now, line)
}

export function changeCart(state, { id, action, quantity, fulfillment, storeId, saved = false }) {
  if (!actor(state)) return fail('Guest information is unavailable.')
  const items = list(state.cart?.items)
  const savedItems = list(state.cart?.savedItems)
  const line = byId(saved ? savedItems : items, id)
  if (!line) return fail('This cart item is no longer available.')
  const now = nowIso()
  const remove = (lines) => lines.filter((item) => item.id !== id)
  const fromList = saved ? 'savedItems' : 'items'
  const event = { action, before: [line], fromList }

  if (action === 'remove') {
    return commit(state, saved ? items : remove(items), saved ? remove(savedItems) : savedItems, event, now, line)
  }
  if (action === 'save_for_later' && !saved) {
    const nextLine = { ...line, updatedAt: now }
    return commit(state, remove(items), [...savedItems, nextLine], { ...event, after: [nextLine], toList: 'savedItems' }, now, nextLine)
  }

  let incoming
  if (action === 'move_to_cart' && saved) {
    incoming = line
  } else if (action === 'quantity_change' && !saved) {
    if (quantity === line.quantity) return { line }
    incoming = { ...line, quantity }
  } else if (action === 'fulfillment_change' && !saved) {
    incoming = { ...line, fulfillment, storeId: fulfillment === 'pickup' ? storeId ?? null : null }
    if (sameKey(line, incoming)) return { line }
  } else {
    return fail('This cart change is unavailable.')
  }

  const match = action === 'quantity_change' ? null : items.find((item) => item.id !== id && sameKey(item, incoming))
  const nextLine = updatedLine(state, match ? { ...match, quantity: match.quantity + incoming.quantity } : incoming, now)
  const nextItems = match ? replace(remove(items), nextLine) : saved ? [...items, nextLine] : replace(items, nextLine)
  const error = lineIssue(state, nextLine, nextItems, new Date(now))
  if (error) return fail(error)
  return commit(state, nextItems, saved ? remove(savedItems) : savedItems, {
    ...event, before: match ? [line, match] : [line], after: [nextLine], toList: 'items',
  }, now, nextLine)
}

export function selectStore(state, storeId) {
  if (!actor(state)) return fail('Guest information is unavailable.')
  if (!byId(state.stores, storeId)) return fail('This store is unavailable.')
  const fromStoreId = state.guest.preferredStoreId ?? null
  if (fromStoreId === storeId) return {}
  const now = nowIso()
  return { state: {
    ...state, guest: { ...state.guest, preferredStoreId: storeId, updatedAt: now },
    cartEvents: [...list(state.cartEvents), cartEvent(state, {
      action: 'store_select', source: 'store_selector', fromStoreId, toStoreId: storeId,
    }, now)],
  } }
}
