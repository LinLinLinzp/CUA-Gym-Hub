import { allowedModes, array, cartStore, find, priceLine, productTitle, quantityLimit, snapshot } from './model.js'

const fields = line => line ? { quantity: line.quantity ?? 0, fulfillmentMode: line.fulfillmentMode ?? null, status: line.status ?? null } : null

export function cartChange(state, before, after) {
  const line = after || before
  return { lineId: line.id, productId: line.productId ?? null, unitPrice: find(state.catalog, line.productId)?.price ?? null, before: fields(before), after: fields(after) }
}

export function cartEvent(state, context, type, lines, changes, extras) {
  const cart = { ...state.cart, lines, events: [...array(state.cart?.events), context.event(type, { changes, ...extras })] }
  return { ...state, cart }
}

export function putActiveLine(state, lines, input, context) {
  const { productId, fulfillmentMode, quantity, source } = input
  const product = find(state.catalog, productId)
  const limit = quantityLimit(product, fulfillmentMode, cartStore(state, context.now))
  const existing = lines.find(line => line !== source && line.status === 'active' && line.productId === productId && line.fulfillmentMode === fulfillmentMode)
  const nextQuantity = (Number(existing?.quantity) || 0) + quantity
  if (!allowedModes.includes(fulfillmentMode) || !Number.isInteger(quantity) || quantity < 1) return { error: 'Enter a whole quantity of at least 1.' }
  if (!limit) return { error: `${productTitle(product)} is unavailable for this fulfillment option.` }
  if (nextQuantity > limit) return { error: `Only ${limit} available per order for ${productTitle(product)}.` }

  const before = existing || source
  const after = before ? { ...before, ...context.touch, quantity: nextQuantity, fulfillmentMode, status: 'active' }
    : { id: context.id('cart-line'), productId, fulfillmentMode, quantity, status: 'active', ...context.created }
  const nextLines = lines.filter(line => !(existing && line === source)).map(line => line === before ? after : line)
  if (!before) nextLines.push(after)
  const changes = [cartChange(state, before, after)]
  if (existing && source) changes.push(cartChange(state, source, null))
  return { lines: nextLines, changes }
}

export function addToCart(state, input, context) {
  const result = putActiveLine(state, array(state.cart?.lines), input, context)
  return result.error ? result : { state: cartEvent(state, context, 'added', result.lines, result.changes) }
}

export function updateCart(state, { lineId, type, quantity, mode }, context) {
  const lines = array(state.cart?.lines)
  const line = find(lines, lineId)
  if (!line) return { error: 'This cart item is unavailable.' }

  if (type === 'restored' || type === 'fulfillment_changed') {
    const expectedStatus = type === 'restored' ? 'saved' : 'active'
    if (line.status !== expectedStatus) return { error: 'This cart item has changed. Try again.' }
    if (type === 'fulfillment_changed' && mode === line.fulfillmentMode) return {}
    const result = putActiveLine(state, lines, {
      productId: line.productId,
      fulfillmentMode: mode || line.fulfillmentMode,
      quantity: Number(line.quantity),
      source: line,
    }, context)
    return result.error ? result : { state: cartEvent(state, context, type, result.lines, result.changes) }
  }

  let updated
  if (type === 'quantity_changed' && line.status === 'active') {
    if (quantity === line.quantity) return {}
    const product = find(state.catalog, line.productId)
    const limit = quantityLimit(product, line.fulfillmentMode, cartStore(state, context.now))
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > limit) return { error: limit ? `Choose a quantity from 1 to ${limit}.` : 'This item is currently unavailable.' }
    updated = { ...line, quantity, ...context.touch }
  } else if (type === 'saved' && line.status === 'active') {
    updated = { ...line, status: 'saved', ...context.touch }
  } else if (type !== 'removed') {
    return { error: 'This cart change is unavailable.' }
  }

  const nextLines = updated ? lines.map(item => item === line ? updated : item) : lines.filter(item => item !== line)
  return { state: cartEvent(state, context, type, nextLines, [cartChange(state, line, updated)]) }
}

export function cartOrderLine(product, quantity, id) {
  const returnPolicy = product.returnPolicy
  return priceLine({
    id, productId: product.id, product: snapshot(product), unitPrice: product.price, taxRate: product.taxRate ?? 0,
    ...(returnPolicy ? { returnPolicy: structuredClone(returnPolicy) } : {}),
  }, quantity)
}
