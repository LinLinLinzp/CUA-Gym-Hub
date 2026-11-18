export const rows = (value) => Array.isArray(value) ? value.filter((entry) => entry && typeof entry === 'object') : []
export const active = (value) => rows(value).filter((entry) => !entry.deletedAt)
export const text = (value) => String(value ?? '').trim()
export const newId = (prefix) => prefix + '-' + crypto.randomUUID()
export const issuesForProduct = (state, id) => rows(state.issues).filter((issue) => id && issue.productId === id)
export const isActiveIssue = (issue) => issue.status === 'open' || issue.status === 'under_review'

export const productFields = ['title', 'offerId', 'description', 'brand', 'condition', 'price', 'currency', 'availability', 'country', 'language', 'link', 'imageLink', 'gtin', 'mpn']
export const conditions = ['new', 'refurbished', 'used']
export const availabilities = ['in_stock', 'out_of_stock', 'preorder', 'backorder']
export const approvals = ['approved', 'limited', 'disapproved', 'pending']
export const visibilityOptions = ['visible', 'hidden']
export const supportedCurrencies = ['USD', 'CAD', 'GBP', 'AUD', 'EUR', 'JPY']

export function isWebUrl(value) {
  if (!/^https?:\/\//i.test(value) || /\s/.test(value)) return false
  try { return Boolean(new URL(value).hostname) } catch { return false }
}

export function validGtin(value) {
  if (!/^(?:\d{8}|\d{12,14})$/.test(value)) return false
  const digits = [...value].reverse().map(Number)
  return digits.reduce((sum, digit, index) => sum + digit * (index % 2 ? 3 : 1), 0) % 10 === 0
}

export function numericPrice(value) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(text(value))) return null
  const price = Number(value)
  return Number.isFinite(price) && price >= 0 ? price : null
}

export function offerKey(country, language, offerId) {
  return JSON.stringify([text(country).toUpperCase(), text(language).toLowerCase(), text(offerId)])
}

export function changesBetween(previous, next, keys) {
  const changes = {}
  for (const key of keys) {
    const before = previous?.[key] ?? null
    const after = next[key] ?? null
    if (JSON.stringify(before) !== JSON.stringify(after)) changes[key] = { before, after }
  }
  return changes
}

export function replaceById(items, replacements) {
  return items.map((item) => replacements.get(item.id) ?? item)
}

export function changeRecord(prefix, association, action, changes, meta) {
  return { id: newId(prefix), ...association, action, changes, ...meta }
}

const fixes = {
  missing_gtin: { field: 'gtin', valid: validGtin },
  missing_image: { field: 'imageLink', valid: isWebUrl },
}
export const fixField = (code) => fixes[code]?.field

function resolvedIssue(issue, resolution, meta) {
  return { ...issue, status: 'resolved', resolution, resolvedAt: meta.createdAt, updatedAt: meta.createdAt }
}

export function issueAction(issue, action, details, meta) {
  return {
    id: newId('iac'), issueId: issue.id, productId: issue.productId ?? null, feedId: issue.feedId ?? null,
    action, status: issue.status, ...details, ...meta,
  }
}

export function approvalFor(issues) {
  if (issues.some((issue) => issue.status === 'open' && issue.severity === 'error')) return 'disapproved'
  if (issues.some((issue) => issue.status === 'open' && issue.severity === 'warning')) return 'limited'
  if (issues.some((issue) => issue.status === 'under_review')) return 'pending'
  return 'approved'
}

export function resolveProductCorrections(issues, previous, next, issueUpdates, issueActions, meta) {
  const linked = issues.filter((issue) => issue.productId === next.id)
  let resolved = false
  for (const issue of linked) {
    const rule = fixes[issue.code]
    if (issue.status !== 'open' || !rule || previous?.[rule.field] === next[rule.field] || !rule.valid(next[rule.field])) continue
    const updated = resolvedIssue(issue, 'data_corrected', meta)
    issueUpdates.set(issue.id, updated)
    issueActions.push(issueAction(updated, 'resolved', { resolution: 'data_corrected' }, meta))
    resolved = true
  }
  return resolved ? { ...next, status: approvalFor(replaceById(linked, issueUpdates)) } : next
}

export function addProductChanges(state, products, changes, issueUpdates = new Map(), actions = []) {
  return {
    ...state, products, productChanges: [...rows(state.productChanges), ...changes],
    ...(issueUpdates.size ? { issues: replaceById(rows(state.issues), issueUpdates), issueActions: [...rows(state.issueActions), ...actions] } : {}),
  }
}

export function tombstoneProducts(state, targetIds, meta, removedFeed) {
  const timestamp = meta.createdAt
  const productUpdates = new Map()
  const changes = []
  for (const item of active(state.products)) {
    if (!targetIds.has(item.id)) continue
    const updated = { ...item, deletedAt: timestamp, updatedAt: timestamp }
    productUpdates.set(item.id, updated)
    changes.push(changeRecord('pchg', { productId: item.id }, 'removed', changesBetween(item, updated, ['deletedAt']), meta))
  }

  const currentProducts = new Map(active(state.products).map((product) => [product.id, product]))
  const issueUpdates = new Map()
  const actions = []
  for (const issue of rows(state.issues)) {
    if (!isActiveIssue(issue)) continue
    const removedProduct = productUpdates.has(issue.productId)
    const productIssue = issue.scope === 'product' || (issue.scope == null && issue.productId != null)
    const movedProduct = currentProducts.get(issue.productId)
    const movedToOtherSource = productIssue && movedProduct && movedProduct.feedId !== removedFeed?.id
    const removedSource = removedFeed && issue.feedId === removedFeed.id
      && (removedFeed.type === 'primary' ? !movedToOtherSource : issue.scope === 'feed' || (!issue.scope && !issue.productId))
    if (!removedProduct && !removedSource) continue
    const resolution = removedProduct ? 'product_removed' : 'feed_removed'
    const updated = resolvedIssue(issue, resolution, meta)
    issueUpdates.set(issue.id, updated)
    actions.push(issueAction(updated, 'resolved', { resolution }, meta))
  }

  if (!productUpdates.size && !issueUpdates.size) return state
  if (!productUpdates.size) {
    return { ...state, issues: replaceById(rows(state.issues), issueUpdates), issueActions: [...rows(state.issueActions), ...actions] }
  }
  return addProductChanges(state, replaceById(rows(state.products), productUpdates), changes, issueUpdates, actions)
}

