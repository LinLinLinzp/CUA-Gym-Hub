export const auditChecks = [
  ['broken_internal_links', 'Broken internal links', 'error', 'An internal link leads to a page returning HTTP 404.', 'Update links to point to a working page or restore the missing resource.'],
  ['server_error', 'Pages returning server errors', 'error', 'A page returned a 5xx status when requested.', 'Check the server logs and resolve the error before crawling again.'],
  ['duplicate_title', 'Duplicate title tags', 'warning', 'Multiple pages use the same title tag.', 'Write a unique title that describes each page’s content.'],
  ['missing_meta_description', 'Missing meta descriptions', 'warning', 'The page has no meta description.', 'Add a concise description specific to each affected page.'],
  ['temporary_redirect', 'Temporary redirects', 'notice', 'A URL responds with a temporary redirect.', 'Use a permanent redirect if the page has moved permanently.'],
  ['internal_nofollow', 'Internal links marked nofollow', 'notice', 'An internal link uses the nofollow attribute.', 'Review whether the attribute is intentional and remove it where the link should be followed.'],
  ['deep_pages', 'Pages with a long click path', 'notice', 'A page sits three or more levels below the crawl entry point.', 'Add a link from a relevant page closer to the homepage.'],
].map(([checkKey, title, severity, description, remediation]) => ({ checkKey, title, severity, description, remediation }))

const groups = {
  products: ['folding-cartons', 'insulated-boxes', 'recycled-mailers', 'paper-tape', 'shipping-labels', 'padded-envelopes', 'storage-totes', 'shipping-kits'],
  collections: ['shipping', 'warehouse', 'retail', 'new-arrivals', 'recycled', 'custom-print'],
  resources: ['size-guide', 'shipping-calculator', 'bulk-ordering', 'sustainability', 'returns', 'freight'],
  stories: ['field-notes', 'material-guide', 'operations', 'packaging', 'holiday-prep'],
  company: ['about', 'contact', 'careers', 'partners', 'press'],
  support: ['help', 'delivery', 'order-status', 'warranty'],
}
const defaultPaths = ['/', ...Object.entries(groups).flatMap(([group, names]) => ['/' + group, ...names.map(name => '/' + group + '/' + name)])]
const supplementalPaths = Array.from({ length: 24 }, (_, index) => '/catalog/series-' + (index + 1) + '/specifications')
const titleOf = (path) => path === '/' ? 'Home' : path.split('/').at(-1).replace(/[-_]+/g, ' ').replace(/\b[a-z]/g, letter => letter.toUpperCase())
const pathOnly = (value) => {
  const path = String(value || '').split(/[?#]/)[0].replace(/\/+/g, '/').replace(/\/$/, '')
  return path || '/'
}
const within = (path, prefix) => prefix === '/' || path === prefix || path.startsWith(prefix + '/')

export function generateAudit({ settings, runId, make, seedOffset = 0 }) {
  let origin = 'https://site.example'
  let scope = '/'
  try {
    const url = new URL(settings.scope.includes('://') ? settings.scope : 'https://' + settings.scope)
    origin = url.origin
    scope = pathOnly(url.pathname)
  } catch { /* Partial configurations use a local example. */ }
  const allow = (settings.allowPaths || []).map(pathOnly)
  const disallow = (settings.disallowPaths || []).map(pathOnly)
  const candidates = [...defaultPaths, ...supplementalPaths]
  const known = candidates.some(path => within(path, scope))
  const scoped = scope !== '/' && !known
    ? [scope, ...candidates.slice(1).map(path => scope + path)] : candidates
  const eligible = scoped.filter(path => within(path, scope)
    && (!allow.length || allow.some(prefix => within(path, prefix)))
    && !disallow.some(prefix => within(path, prefix)))
  const pages = eligible.slice(0, settings.pageLimit).map(path => {
    const serial = scoped.indexOf(path)
    const kind = serial + seedOffset
    const httpStatus = path === scope ? 200 : kind % 23 === 9 ? 503 : kind % 11 === 3 ? 404 : kind % 9 === 5 ? 302 : 200
    return { ...make('adp', serial + 1), runId, url: origin + path, httpStatus, depth: path.split('/').filter(Boolean).length, title: titleOf(path) }
  })
  const matching = [
    (page) => page.httpStatus === 404,
    (page) => page.httpStatus >= 500,
    (page, index) => page.httpStatus === 200 && (index + seedOffset) % 10 === 4,
    (page, index) => page.httpStatus === 200 && (index + seedOffset) % 6 === 2,
    (page) => page.httpStatus === 302,
    (page, index) => page.httpStatus === 200 && (index + seedOffset) % 12 === 6,
    (page) => page.depth >= 3,
  ]
  const issues = auditChecks.flatMap((check, i) => {
    if ((settings.excludedCheckKeys || []).includes(check.checkKey)) return []
    const affectedPageIds = pages.filter(matching[i]).map(page => page.id)
    return affectedPageIds.length ? [{ ...make('adi', i + 1), ...check, runId, affectedPageIds }] : []
  })
  const weights = { error: 4, warning: 2, notice: 1 }
  const penalty = issues.reduce((total, issue) => total + weights[issue.severity] * issue.affectedPageIds.length, 0)
  const healthScore = pages.length ? Math.max(0, 100 - Math.round(penalty * 18 / pages.length)) : null
  return { pages, issues, healthScore }
}

