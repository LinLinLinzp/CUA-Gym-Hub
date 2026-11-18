export const list = value => Array.isArray(value) ? value.filter(Boolean) : []
export const label = property => String(property?.siteUrl || 'Unnamed property').replace(/^sc-domain:/i, '')
export const activeProperty = state => list(state.properties).find(p => p.status === 'verified' && p.id === state.account?.activePropertyId)
  || list(state.properties).find(p => p.status === 'verified')
export const scoped = (rows, property) => property ? list(rows).filter(row => row.propertyId === property.id) : []
export const latest = (rows, key = 'createdAt') => [...rows].reverse().sort((a, b) => String(b[key] || '').localeCompare(String(a[key] || '')))
export const dateLabel = value => {
  const date = new Date(value)
  return value && Number.isFinite(date.getTime())
    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    : '—'
}
export const countLabel = value => typeof value === 'number' ? value.toLocaleString('en-US') : '—'

function webUrl(value, base) {
  try {
    const input = value.trim()
    if (!input || /[\s\\]/.test(input) || (!base && !/^https?:\/\/[^/]/i.test(input))) return null
    const url = new URL(input, base)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || /^(?:https?:)?\/\/[^/?#]*@/i.test(input)) return null
    return url
  } catch {
    return null
  }
}

export function normalizeProperty(type, input) {
  if (type === 'domain') {
    const value = input.trim().replace(/[。．｡]/g, '.').replace(/\.$/, '').replace(/^www\./i, '')
    if (/[\s*:/?#@%\\]/.test(value) || !value.includes('.')) return null
    const url = webUrl('https://' + value)
    if (!url || /^[\d.]+$/.test(url.hostname) || url.hostname.length > 253
      || !url.hostname.split('.').every(part => /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(part))) return null
    return 'sc-domain:' + url.hostname
  }
  const url = webUrl(input)
  if (!url || /[?#]/.test(input)) return null
  if (!url.pathname.endsWith('/')) url.pathname += '/'
  return url.href
}

export const propertyBase = property => property?.type === 'domain'
  ? 'https://' + label(property) + '/' : property?.siteUrl || ''

export function scopedUrl(input, property, sitemap = false) {
  if (!property) return { error: 'Choose a verified property first.' }
  const base = propertyBase(property)
  const url = webUrl(input, sitemap ? base : undefined)
  if (!url) return { error: sitemap ? 'Enter a valid sitemap URL or relative path.' : 'Enter a full URL beginning with http:// or https://.' }
  if (sitemap && input.includes('#')) return { error: 'A sitemap URL cannot contain a fragment.' }
  const scope = webUrl(base)
  const host = url.hostname.replace(/\.$/, '')
  const domain = scope?.hostname.replace(/\.$/, '')
  const matches = scope && (property.type === 'domain'
    ? host === domain || host.endsWith('.' + domain)
    : scope.origin === url.origin && url.pathname.startsWith(scope.pathname))
  if (!matches) return { error: 'This URL is outside ' + label(property) + '.' }
  url.hash = ''
  return { url: url.href }
}

export const fixtureFor = (state, property, url) => scoped(state.pages, property).find(p => webUrl(p.url)?.href.split('#')[0] === url)
export const unknownIndex = {
  verdict: 'unknown', reason: 'URL is unknown to Google', lastCrawlAt: null, crawlAllowed: null,
  pageFetch: null, indexingAllowed: null, userCanonical: null, googleCanonical: null, sitemapIds: [], referringUrls: [],
}
export const defaultLive = { status: 'indexable', reason: null, crawlAllowed: true, pageFetch: 'Successful', indexingAllowed: true }
export const eligible = result => result?.status === 'indexable' && result.crawlAllowed !== false && result.indexingAllowed !== false
export const lookupInspection = (state, property, url, id) => {
  const rows = latest(scoped(state.inspections, property).filter(row => scopedUrl(row.url, property).url === url))
  return rows.find(row => row.id === id) || rows[0]
}

const entry = (state, prefix) => ({
  id: prefix + '_' + crypto.randomUUID(),
  actorId: state.account?.id || null,
  createdAt: new Date().toISOString(),
})
const updateOrAppend = (rows, row) => list(rows).some(item => item.id === row.id)
  ? list(rows).map(item => item.id === row.id ? row : item) : [...list(rows), row]
const activate = (state, propertyId) => ({ ...state.account, activePropertyId: propertyId })
const propertyEvent = (state, property, type, status = property.status) => ({
  ...entry(state, 'pe'), propertyId: property.id, type, status,
})
const sitemapEvent = (state, map, type) => ({
  ...entry(state, 'se'), sitemapId: map.id, propertyId: map.propertyId, url: map.url, type, status: map.status,
})

export function selectProperty(state, property) {
  if (property.status !== 'verified') return null
  return {
    ...state, account: activate(state, property.id),
    propertyEvents: [...list(state.propertyEvents), propertyEvent(state, property, 'selected')],
  }
}

export const findProperty = (state, type, siteUrl, removed = false) => list(state.properties).find(p =>
  (p.status === 'removed') === removed && p.type === type && normalizeProperty(type, label(p)) === siteUrl)

export function saveProperty(state, { type, siteUrl, method, pending, verify }) {
  if (verify ? verify.status !== 'pending' : findProperty(state, type, siteUrl)) return null
  const restored = verify ? null : findProperty(state, type, siteUrl, true)
  const stamp = entry(state, 'prop')
  const previous = verify || restored
  const property = {
    ...previous, id: previous?.id || stamp.id, type, siteUrl, status: pending ? 'pending' : 'verified',
    permissionLevel: pending ? 'siteUnverifiedUser' : 'siteOwner', verificationMethod: method,
    createdAt: previous?.createdAt || stamp.createdAt, createdBy: previous?.createdBy || stamp.actorId,
    verifiedAt: pending ? null : stamp.createdAt, verifiedBy: pending ? null : stamp.actorId,
    removedAt: null, removedBy: null,
  }
  const events = []
  if (!verify) events.push(propertyEvent(state, property, restored ? 'restored' : 'added', 'pending'))
  if (!pending) events.push(propertyEvent(state, property, 'verified'))
  return {
    property,
    state: {
      ...state, properties: updateOrAppend(state.properties, property),
      account: pending ? state.account : activate(state, property.id),
      propertyEvents: [...list(state.propertyEvents), ...events],
    },
  }
}

export function removeProperty(state, property) {
  const event = propertyEvent(state, property, 'removed', 'removed')
  const properties = updateOrAppend(state.properties, {
    ...property, status: 'removed', removedAt: event.createdAt, removedBy: event.actorId,
  })
  const wasActive = state.account?.activePropertyId === property.id || activeProperty(state)?.id === property.id
  return {
    ...state, properties, propertyEvents: [...list(state.propertyEvents), event],
    account: wasActive ? activate(state, properties.find(p => p.status === 'verified')?.id ?? null) : state.account,
  }
}

export function inspectPage(state, property, url) {
  const page = fixtureFor(state, property, url)
  const inspection = {
    ...entry(state, 'insp'), propertyId: property.id, pageId: page?.id ?? null, url,
    index: { ...unknownIndex, ...page?.index },
  }
  return { inspection, state: { ...state, inspections: [...list(state.inspections), inspection] } }
}

export function testLive(state, inspection, url, result) {
  const test = {
    ...entry(state, 'live'), inspectionId: inspection.id, propertyId: inspection.propertyId, url, result,
  }
  return { ...state, liveTests: [...list(state.liveTests), test] }
}

export function queueIndexing(state, inspection, url, liveTest) {
  const request = {
    ...entry(state, 'req'), inspectionId: inspection.id, propertyId: inspection.propertyId,
    liveTestId: liveTest?.id ?? null, url, status: 'queued',
  }
  return { ...state, indexingRequests: [...list(state.indexingRequests), request] }
}

export function submitSitemap(state, property, url) {
  const previous = scoped(state.sitemaps, property).find(map => scopedUrl(map.url, property, true).url === url)
  const stamp = entry(state, 'sm')
  const map = {
    id: stamp.id, type: 'unknown', createdAt: stamp.createdAt, createdBy: stamp.actorId,
    lastReadAt: null, discoveredPages: null, discoveredVideos: null, issues: [],
    ...previous, propertyId: property.id, url, status: 'pending',
    lastSubmittedAt: stamp.createdAt, lastSubmittedBy: stamp.actorId, submissionCount: (Number(previous?.submissionCount) || 0) + 1,
    removedAt: null, removedBy: null,
  }
  return {
    ...state, sitemaps: updateOrAppend(state.sitemaps, map),
    sitemapEvents: [...list(state.sitemapEvents), sitemapEvent(state, map, previous ? 'resubmitted' : 'submitted')],
  }
}

export function removeSitemap(state, map) {
  const event = sitemapEvent(state, { ...map, status: 'removed' }, 'removed')
  return {
    ...state,
    sitemaps: updateOrAppend(state.sitemaps, { ...map, status: 'removed', removedAt: event.createdAt, removedBy: event.actorId }),
    sitemapEvents: [...list(state.sitemapEvents), event],
  }
}
