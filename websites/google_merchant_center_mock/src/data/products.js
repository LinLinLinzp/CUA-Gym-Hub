import {
  active, addProductChanges, availabilities, changeRecord, changesBetween, conditions, isWebUrl,
  newId, numericPrice, offerKey, productFields, replaceById, resolveProductCorrections, rows, supportedCurrencies, text, tombstoneProducts, validGtin,
} from './records.js'

export function saveProduct(state, meta, id, draft) {
  const products = active(state.products)
  const previous = id ? products.find((item) => item.id === id) : null
  if (id && !previous) return { error: 'This product is no longer available.' }
  const fields = Object.fromEntries(productFields.map((name) => [name, text(draft[name])]))
  if (previous) fields.offerId = text(previous.offerId)
  fields.country = fields.country.toUpperCase()
  fields.language = fields.language.toLowerCase()
  fields.currency = fields.currency.toUpperCase()
  fields.price = numericPrice(fields.price)
  const changed = (key) => !previous || (draft[key] ?? '') !== (previous[key] ?? '')
  const errors = {}
  if (changed('title') && !fields.title) errors.title = 'Enter a product title.'
  if (!fields.offerId && !previous) errors.offerId = 'Enter an offer ID.'
  if (fields.offerId && (changed('country') || changed('language')) && products.some((item) => item.id !== id && offerKey(item.country, item.language, item.offerId) === offerKey(fields.country, fields.language, fields.offerId))) {
    errors[previous ? 'country' : 'offerId'] = 'An active offer already uses this ID for the selected market and language.'
  }
  if (changed('condition') && !conditions.includes(fields.condition)) errors.condition = 'Choose a condition.'
  if (changed('price') && fields.price === null) errors.price = 'Enter a nonnegative price with up to two decimal places.'
  if (changed('currency') && !supportedCurrencies.includes(fields.currency)) errors.currency = 'Choose a currency.'
  if (changed('availability') && !availabilities.includes(fields.availability)) errors.availability = 'Choose an availability.'
  if (changed('country') && !/^[A-Z]{2}$/.test(fields.country)) errors.country = 'Choose a market.'
  if (changed('language') && !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(fields.language)) errors.language = 'Choose a language.'
  if (changed('link') && !isWebUrl(fields.link)) errors.link = 'Enter a complete HTTP or HTTPS landing-page URL.'
  if (changed('imageLink') && fields.imageLink && !isWebUrl(fields.imageLink)) errors.imageLink = 'Enter a complete HTTP or HTTPS image URL.'
  if (changed('gtin') && fields.gtin && !validGtin(fields.gtin)) errors.gtin = 'Enter a valid 8-, 12-, 13- or 14-digit GTIN including its check digit.'
  if (Object.keys(errors).length) return { errors }

  const updateFields = Object.fromEntries(productFields.filter((key) => key !== 'offerId' && changed(key)).map((key) => [key, fields[key]]))
  const candidate = previous ? { ...previous, ...updateFields } : {
    id: newId('prd'), ...fields, status: 'pending', visibility: 'visible', feedId: null,
    actor: meta.actor, createdAt: meta.createdAt, deletedAt: null,
  }
  const issueUpdates = new Map()
  const actions = []
  const next = previous ? resolveProductCorrections(rows(state.issues), previous, candidate, issueUpdates, actions, meta) : candidate
  const changes = changesBetween(previous, next, [...productFields, 'feedId', 'status', 'visibility'])
  if (!Object.keys(changes).length) return { id }
  next.updatedAt = meta.createdAt
  const all = rows(state.products)
  const productsAfter = previous ? replaceById(all, new Map([[id, next]])) : [...all, next]
  const entry = changeRecord('pchg', { productId: next.id }, previous ? 'updated' : 'created', changes, meta)
  if (!previous) changes.feedId = { before: null, after: null }
  return { id: next.id, state: addProductChanges(state, productsAfter, [entry], issueUpdates, actions) }
}

export function changeVisibility(state, meta, ids, visibility) {
  const updates = new Map()
  const changes = []
  for (const item of active(state.products)) {
    if (!ids.has(item.id) || item.visibility === visibility) continue
    const next = { ...item, visibility, updatedAt: meta.createdAt }
    updates.set(item.id, next)
    changes.push(changeRecord('pchg', { productId: item.id }, 'visibility_changed', changesBetween(item, next, ['visibility']), meta))
  }
  if (!updates.size) return { count: 0 }
  return { count: updates.size, state: addProductChanges(state, replaceById(rows(state.products), updates), changes) }
}

export function removeProduct(state, meta, id) {
  const product = active(state.products).find((item) => item.id === id)
  if (!product || product.feedId) return { error: 'Remove this product through its data source.' }
  return { state: tombstoneProducts(state, new Set([id]), meta) }
}

