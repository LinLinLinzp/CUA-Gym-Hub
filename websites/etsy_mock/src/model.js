export const list = (value) => Array.isArray(value) ? value.filter(Boolean) : []
export const byId = (rows, id) => list(rows).find((row) => row.id === id)
export const owned = (rows, buyer) => list(rows).filter((row) => !row.buyerId || row.buyerId === buyer.id)
export const newest = (rows, key = 'createdAt') => [...rows].sort((a, b) => String(b[key] || '').localeCompare(a[key] || ''))
export const chronological = (rows) => [...rows].sort((a, b) => String(a.createdAt || '').localeCompare(b.createdAt || ''))
export const uid = (prefix) => {
  const words = crypto.getRandomValues(new Uint32Array(4))
  return prefix + '_' + Array.from(words, (word) => word.toString(16).padStart(8, '0')).join('')
}
export const cents = (value) => Math.round((Number(value) || 0) * 100)
export const money = (value, currency = 'USD') => {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(value) || 0) }
  catch { return '$' + (Number(value) || 0).toFixed(2) }
}
export const date = (value, time = false) => {
  const parsed = new Date(value || '')
  return Number.isNaN(+parsed) ? 'Date unavailable' : parsed.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', ...(time ? { hour: 'numeric', minute: '2-digit' } : {}),
  })
}
export const human = (value = 'unknown') => String(value ?? 'unknown').replaceAll('_', ' ').replace(/^./, (first) => first.toUpperCase())
export const required = (condition, message) => { if (!condition) throw new Error(message) }
export const sum = (rows, key) => rows.reduce((total, row) => total + cents(row[key]), 0) / 100
export const append = (state, key, row) => ({ ...state, [key]: [...list(state[key]), row] })
export const replace = (rows, row) => list(rows).map((old) => old.id === row.id ? row : old)
export const findFavorite = (state, type, id) => owned(state.favorites, state.buyer).find((row) => row.targetType === type && row.targetId === id)
export const hasMembership = (state, collectionId, listingId) => owned(state.collectionItems, state.buyer).find((row) => row.collectionId === collectionId && row.listingId === listingId)
export const returnPolicy = (policy) => policy?.summary || (policy?.accepted === true
  ? 'Returns accepted' + (policy.windowDays ? ' within ' + policy.windowDays + ' days of delivery.' : '.')
  : policy?.accepted === false ? 'Standard returns are unavailable for this item.' : 'Contact the shop for its return policy.')
export const REASONS = { damaged: 'Item arrived damaged', not_as_described: 'Item was not as described', non_delivery: 'Item did not arrive' }
export const RESOLUTIONS = { information: 'Seller assistance', return: 'Return', exchange: 'Exchange', refund: 'Refund' }
export const PREFERENCES = { original_payment: 'Original payment method', etsy_credit: 'Etsy credit' }

const addDays = (time, days) => new Date(+new Date(time) + days * 86400000).toISOString()
const patch = (rows, record) => byId(rows, record.id) ? replace(rows, record) : [...list(rows), record]
const without = (rows, id) => list(rows).filter((row) => row.id !== id)
const validPrice = (value) => value !== '' && value != null && Number.isFinite(Number(value)) && Number(value) >= 0
const quantityOK = (value) => Number.isSafeInteger(value) && value > 0
const actor = (state, at) => ({ actorId: state.buyer.id, createdAt: at })

export function configuration(listing, quantity, selected, input) {
  required(listing, 'This listing is unavailable.')
  required(quantityOK(quantity), 'Enter a whole quantity of at least one.')
  required(quantity <= Number(listing.stock), 'Only ' + (Number(listing.stock) || 0) + ' available.')
  required(validPrice(listing.price), 'This listing has no available price.')
  const variants = list(listing.variants).map((group) => {
    const option = byId(group.options, selected[group.id])
    required(option, 'Choose ' + (group.name || 'an option') + '.')
    return { groupId: group.id, optionId: option.id, label: option.label || option.id }
  })
  const personalization = listing.personalization ? String(input || '').trim() : ''
  required(!listing.personalization?.required || personalization, 'Enter your personalization.')
  required(personalization.length <= (listing.personalization?.maxLength ?? 200), 'Shorten your personalization.')
  return {
    listingId: listing.id, shopId: listing.shopId, quantity, variants, personalization,
    unitPrice: Number(listing.price), currency: listing.currency || 'USD',
  }
}

const revalidate = (state, line) => ({
  ...line,
  ...configuration(byId(state.listings, line.listingId), line.quantity,
    Object.fromEntries(list(line.variants).map((value) => [value.groupId, value.optionId])), line.personalization),
})
const variantsKey = (variants) => JSON.stringify(list(variants).map(({ groupId, optionId }) => [groupId, optionId]).sort())
const sameConfiguration = (line, draft) => line.listingId === draft.listingId &&
  variantsKey(line.variants) === variantsKey(draft.variants) && (line.personalization || '') === draft.personalization
const units = (lines, listingId) => lines.filter((line) => line.listingId === listingId).reduce((total, line) => total + (Number(line.quantity) || 0), 0)
const cartEvent = (state, line, action, previousQuantity, quantity, at, orderId) => ({
  id: uid('cart_event'), ...actor(state, at), action, cartItemId: line.id, listingId: line.listingId,
  shopId: line.shopId, previousQuantity, quantity, unitPrice: line.unitPrice, currency: line.currency,
  ...(orderId ? { orderId } : {}),
})

export function changeCart(state, input, at) {
  const cart = owned(state.cartItems, state.buyer)
  const previous = input.id ? byId(cart, input.id) : cart.find((line) => sameConfiguration(line, input.draft))
  required(!input.id || previous, 'This item is already out of your cart.')
  const before = Number(previous?.quantity) || 0
  const requested = input.id ? input.quantity : before + input.draft.quantity
  if (requested === 0) {
    return append({ ...state, cartItems: without(state.cartItems, previous.id) }, 'cartActivity', cartEvent(state, previous, 'removed', before, 0, at))
  }
  if (input.id && requested === before) return state
  const line = revalidate(state, {
    ...(previous || input.draft), id: previous?.id || uid('cart'), createdAt: previous?.createdAt || at,
    buyerId: state.buyer.id, updatedAt: at, quantity: requested,
  })
  required(units(cart.filter((row) => row.id !== line.id), line.listingId) + requested <= Number(byId(state.listings, line.listingId).stock),
    'Your cart would exceed available stock for this item.')
  return append({ ...state, cartItems: patch(state.cartItems, line) }, 'cartActivity',
    cartEvent(state, line, previous ? 'quantity_changed' : 'added', before, requested, at))
}

export function checkoutGroups(state, rawLines) {
  required(rawLines.length, 'Add an item to your cart to check out.')
  const lines = rawLines.map((line) => revalidate(state, line))
  for (const listingId of new Set(lines.map((line) => line.listingId))) {
    const listing = byId(state.listings, listingId)
    required(units(lines, listingId) <= Number(listing.stock), listing.title + ' exceeds available stock. Update your cart quantities.')
  }
  return [...new Set(lines.map((line) => line.shopId))].map((shopId) => {
    const items = lines.filter((line) => line.shopId === shopId)
    const shop = byId(state.shops, shopId)
    required(shop, 'A shop in your checkout is unavailable. Remove its items and try again.')
    const currency = items[0].currency
    required(currency === lines[0].currency, 'Please check out in one currency at a time.')
    required(items.every((line) => line.currency === currency), 'Please check out in one currency at a time.')
    const products = items.map((line) => byId(state.listings, line.listingId))
    const subtotal = items.reduce((total, line) => total + cents(line.unitPrice) * line.quantity, 0)
    const shipping = Math.max(0, ...products.map((product) => cents(product.shippingPrice)))
    const delivery = [Math.max(...products.map((row) => Number(row.deliveryDays?.[0]) || 3)),
      Math.max(...products.map((row) => Number(row.deliveryDays?.[1]) || 7))]
    return { shop, items, currency, subtotal: subtotal / 100, shipping: shipping / 100, tax: 0, total: (subtotal + shipping) / 100, delivery }
  })
}

export function purchase(state, { draft, addressId, paymentId }, at) {
  const rawLines = draft ? [draft] : owned(state.cartItems, state.buyer)
  const groups = checkoutGroups(state, rawLines)
  const shippingAddress = byId(state.buyer.addresses, addressId)
  const paymentMethod = byId(state.buyer.paymentMethods, paymentId)
  required(shippingAddress && paymentMethod, 'Choose a saved address and payment method.')
  const orders = groups.map(({ shop, items, currency, subtotal, shipping, tax, total, delivery }) => {
    const id = uid('order')
    return {
      id, orderNumber: 'ET-' + id.slice(6, 14).toUpperCase(), buyerId: state.buyer.id, shopId: shop.id, shopName: shop.name,
      status: 'paid', source: draft ? 'buy_now' : 'cart', currency, subtotal, shipping, tax, total, shippingAddress, paymentMethod,
      estimatedDeliveryStartAt: addDays(at, delivery[0]), estimatedDeliveryEndAt: addDays(at, delivery[1]), createdAt: at,
      items: items.map((line) => {
        const listing = byId(state.listings, line.listingId)
        return {
          id: uid('line'), listingId: line.listingId, title: listing.title, image: listing.image,
          quantity: line.quantity, unitPrice: line.unitPrice, lineTotal: cents(line.unitPrice) * line.quantity / 100,
          variants: line.variants, personalization: line.personalization, returnPolicy: listing.returnPolicy,
        }
      }),
    }
  })
  const validated = groups.flatMap((group) => group.items)
  const updated = {
    ...state, orders: [...list(state.orders), ...orders],
    listings: list(state.listings).map((listing) => {
      const quantity = units(validated, listing.id)
      return quantity ? { ...listing, stock: Number(listing.stock) - quantity, updatedAt: at, updatedBy: state.buyer.id } : listing
    }),
    ...(!draft ? {
      cartItems: list(state.cartItems).filter((line) => !validated.some((bought) => bought.id === line.id)),
      cartActivity: [...list(state.cartActivity), ...validated.map((line) =>
        cartEvent(state, line, 'purchased', line.quantity, 0, at, orders.find((order) => order.shopId === line.shopId).id))],
    } : {}),
  }
  return { updated, orderIds: orders.map((order) => order.id) }
}

function send(state, { shopId, listingId, orderId, subject, helpRequestId, body, threadId }, at) {
  body = String(body || '').trim()
  required(body && body.length <= 4000, 'Enter a message of 1 to 4,000 characters.')
  const threads = owned(state.threads, state.buyer)
  const existing = threadId ? byId(threads, threadId) : threads.find((row) => {
    if (row.shopId !== shopId) return false
    if (orderId) return row.orderId === orderId
    return !row.orderId && (row.listingId || null) === (listingId || null)
  })
  if (threadId) required(existing, 'This conversation is unavailable.')
  else {
    if (orderId) required(byId(owned(state.orders, state.buyer), orderId)?.shopId === shopId && shopId, 'This order is unavailable.')
    else {
      required(byId(state.shops, shopId), 'This shop is unavailable.')
      if (listingId) required(byId(state.listings, listingId)?.shopId === shopId, 'This listing is unavailable.')
    }
  }
  const thread = existing || {
    id: uid('thread'), buyerId: state.buyer.id, shopId, subject, unread: false, createdAt: at,
    ...(listingId ? { listingId } : {}), ...(orderId ? { orderId } : {}),
  }
  const message = {
    id: uid('message'), threadId: thread.id, ...actor(state, at), actorType: 'buyer', body,
    ...(thread.listingId ? { listingId: thread.listingId } : {}), ...(thread.orderId ? { orderId: thread.orderId } : {}),
    ...(helpRequestId ? { helpRequestId } : {}),
  }
  return {
    threadId: thread.id, messageId: message.id,
    updated: append({ ...state, threads: patch(state.threads,
      { ...thread, updatedAt: at, updatedBy: state.buyer.id, lastMessageId: message.id }) }, 'messages', message),
  }
}

export const sendMessage = send
export function readThread(state, id, at) {
  const thread = byId(owned(state.threads, state.buyer), id)
  if (!thread?.unread) return state
  return { ...state, threads: replace(state.threads, { ...thread, unread: false, readAt: at, updatedBy: state.buyer.id }) }
}

function supportLines(order, quantities) {
  const lines = Object.entries(quantities).filter(([, quantity]) => quantity !== 0).map(([id, quantity]) => {
    const item = byId(order.items, id)
    required(item && quantityOK(quantity) && quantity <= Number(item.quantity) && validPrice(item.unitPrice),
      'Choose a quantity between one and the number purchased.')
    return { orderItemId: id, listingId: item.listingId, quantity, unitPrice: Number(item.unitPrice), amount: cents(item.unitPrice) * quantity / 100 }
  })
  required(lines.length, 'Select at least one affected item.')
  return lines
}

export function requestHelp(state, { orderId, reason, desiredResolution, quantities, body }, at) {
  const order = byId(owned(state.orders, state.buyer), orderId)
  required(order, 'This order is unavailable.')
  required(Object.hasOwn({ ...REASONS, other: 'Other' }, reason) && Object.hasOwn(RESOLUTIONS, desiredResolution),
    'Select an issue and the resolution you would like.')
  const lines = supportLines(order, quantities)
  const id = uid('help')
  const { updated, threadId, messageId } = send(state, {
    shopId: order.shopId, orderId, subject: 'Help with order ' + (order.orderNumber || order.id), body, helpRequestId: id,
  }, at)
  const base = { orderId, buyerId: state.buyer.id, shopId: order.shopId, reason, lines, createdAt: at }
  const next = append(updated, 'helpRequests', { ...base, id, desiredResolution, body: body.trim(), threadId, messageId, status: 'sent' })
  return {
    threadId, helpId: id,
    updated: desiredResolution === 'information' ? next : append(next, 'returnRequests', {
      ...base, id: uid('return'), helpRequestId: id, resolution: desiredResolution, status: 'requested',
      requestedAmount: sum(lines, 'amount'), currency: order.currency || 'USD',
    }),
  }
}

export function caseEligibility(state, order, now = new Date()) {
  const active = owned(state.cases, state.buyer).find((row) => row.orderId === order.id && row.status === 'open')
  if (active) return { active }
  const deliveryEnd = +new Date(order.estimatedDeliveryEndAt || '')
  const help = owned(state.helpRequests, state.buyer)
    .filter((row) => row.orderId === order.id && row.shopId === order.shopId && row.status === 'sent' && Number.isFinite(+new Date(row.createdAt || '')))
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))[0]
  if (!help) return { note: 'Send a help request to the shop before opening a case.' }
  if (!Number.isFinite(deliveryEnd)) return { note: 'A delivery estimate is needed before a case can be opened.' }
  const availableAt = Math.max(deliveryEnd, +new Date(help.createdAt) + 48 * 60 * 60 * 1000)
  if (+now < availableAt) return { note: 'You can open a case starting ' + date(availableAt, true) + '. Wait until the delivery window and the 48-hour seller response period have passed.' }
  return { help }
}

export function openCase(state, { orderId, reason, quantities, details, refundPreference }, at) {
  const order = byId(owned(state.orders, state.buyer), orderId)
  required(order, 'This order is unavailable.')
  const eligibility = caseEligibility(state, order, new Date(at))
  required(eligibility.help, eligibility.note || 'This order already has an open case.')
  required(Object.hasOwn(REASONS, reason) && Object.hasOwn(PREFERENCES, refundPreference), 'Select a case reason and refund preference.')
  const body = details.trim()
  required(body && body.length <= 4000, 'Enter supporting details of 1 to 4,000 characters.')
  const lines = supportLines(order, quantities)
  const id = uid('case')
  const record = {
    id, orderId, helpRequestId: eligibility.help.id, buyerId: state.buyer.id, shopId: order.shopId, reason, details: body,
    refundPreference, lines, requestedAmount: sum(lines, 'amount'), currency: order.currency || 'USD', status: 'open',
    log: [{ id: uid('case_log'), ...actor(state, at), actorType: 'buyer', action: 'opened', body }],
    createdAt: at, updatedAt: at, updatedBy: state.buyer.id,
  }
  return { updated: append(state, 'cases', record), caseId: id }
}

export function updateCase(state, { id, body, close }, at) {
  const record = byId(owned(state.cases, state.buyer), id)
  required(record?.status === 'open', 'This case is closed or unavailable.')
  body = (body || '').trim()
  required(close || (body && body.length <= 4000), 'Enter a comment of 1 to 4,000 characters.')
  return { ...state, cases: replace(state.cases, {
    ...record, updatedAt: at, updatedBy: state.buyer.id,
    ...(close ? { status: 'closed', closedAt: at } : {}),
    log: [...list(record.log), { id: uid('case_log'), ...actor(state, at), actorType: 'buyer',
      action: close ? 'closed' : 'commented', ...(!close ? { body } : {}) }],
  }) }
}

const favoriteEvent = (state, fields, at) => append(state, 'favoriteActivity', { id: uid('favorite_event'), ...actor(state, at), ...fields })
export function toggleFavorite(state, targetType, targetId, at) {
  required(byId(targetType === 'listing' ? state.listings : state.shops, targetId), 'This favorite is unavailable.')
  const existing = findFavorite(state, targetType, targetId)
  const favoriteId = existing?.id || uid('favorite')
  const favorites = existing ? without(state.favorites, favoriteId) : [...list(state.favorites),
    { id: favoriteId, buyerId: state.buyer.id, targetType, targetId, createdAt: at }]
  const action = targetType === 'listing' ? (existing ? 'unfavorited' : 'favorited') : (existing ? 'unfollowed' : 'followed')
  return favoriteEvent({ ...state, favorites }, { action, targetType, targetId, favoriteId }, at)
}

export function saveCollection(state, { id, name, visibility, listingIds }, at) {
  const previous = id && byId(owned(state.collections, state.buyer), id)
  required(!id || previous, 'This collection is unavailable.')
  required(name.trim() && name.trim().length <= 80 && ['private', 'public'].includes(visibility), 'Enter a collection name and choose its visibility.')
  const collectionId = id || uid('collection')
  const changes = { name: name.trim(), visibility }
  const collection = { ...(previous || { id: collectionId, buyerId: state.buyer.id, createdAt: at }),
    ...changes, updatedAt: at, updatedBy: state.buyer.id }
  const metadataChanged = !previous || previous.name !== changes.name || previous.visibility !== visibility
  let next = metadataChanged ? favoriteEvent({ ...state, collections: patch(state.collections, collection) },
    { action: previous ? 'collection_updated' : 'collection_created', collectionId, ...changes }, at) : state
  if (!listingIds) return { updated: next, collectionId }
  const members = owned(state.collectionItems, state.buyer).filter((row) => row.collectionId === collectionId)
  for (const member of members) {
    if (!listingIds.includes(member.listingId)) next = setMembership(next, collectionId, member.listingId, false, at)
  }
  for (const listingId of new Set(listingIds)) {
    if (!hasMembership(next, collectionId, listingId)) next = setMembership(next, collectionId, listingId, true, at)
  }
  return { updated: next, collectionId }
}

export function setMembership(state, collectionId, listingId, selected, at) {
  required(byId(owned(state.collections, state.buyer), collectionId), 'This collection is unavailable.')
  const existing = hasMembership(state, collectionId, listingId)
  if (Boolean(existing) === selected) return state
  if (selected) required(byId(state.listings, listingId) && findFavorite(state, 'listing', listingId), 'Save this item before adding it to a collection.')
  const id = existing?.id || uid('membership')
  const collectionItems = selected ? [...list(state.collectionItems), { id, collectionId, listingId, buyerId: state.buyer.id, createdAt: at }]
    : without(state.collectionItems, id)
  return favoriteEvent({ ...state, collectionItems }, { action: selected ? 'collection_item_added' : 'collection_item_removed',
    targetType: 'listing', targetId: listingId, collectionId, collectionItemId: id }, at)
}

export function savePrivacy(state, fields, at) {
  required(Object.values(fields).every((value) => ['public', 'private'].includes(value)), 'Choose a visibility for items and shops.')
  if (Object.entries(fields).every(([key, value]) => state.buyer[key] === value)) return state
  return favoriteEvent({ ...state, buyer: { ...state.buyer, ...fields, updatedAt: at } }, { action: 'privacy_updated', ...fields }, at)
}
