const actorId = 'acct_maya'
const date = (day, hour = 9) => new Date(Date.UTC(2026, 9, day, hour)).toISOString()
const propertySeeds = [
  ['northwind', 'northwind.example'], ['harbor', 'harbor-supply.example'],
  ['docs', 'https://docs.northwind.example/guides/'], ['cedar', 'cedar-studio.example'],
  ['atlas', 'atlas-outfitters.example', 'pending'], ['fieldnotes', 'https://fieldnotes.example/journal/', 'pending'],
  ['oldport', 'old-port.example', 'removed'],
  ...['ashbury-cycles', 'birch-kitchen', 'copper-works', 'daybreak-press', 'eastline-tools',
    'fern-goods', 'granite-rail', 'heath-ceramics', 'iris-market', 'juniper-labs', 'kite-stationery',
    'lark-travel', 'maple-textiles', 'oak-workshop', 'pine-library', 'ridge-garden', 'summit-parts']
    .map((name, i) => [name, i % 4 === 0 ? 'https://' + name + '.example/' : name + '.example']),
]
const topics = [
  'guides/spring-care', 'private/preview', 'guides/start', 'products/commuter-pack',
  'products/studio-lamp', 'collections/field-gear', 'support/returns', 'guides/size-chart',
  'products/coastal-shell', 'archive/field-gear', 'support/shipping', 'guides/materials',
  'products/rain-cover', 'collections/travel', 'guides/winter-storage', 'support/warranty',
  'products/waxed-tote', 'guides/packing-light', 'collections/workshop', 'products/desk-tray',
  'journal/repair-week', 'guides/catalog', 'support/order-tracking', 'products/utility-roll',
  'collections/all-weather', 'guides/cleaning', 'products/canvas-kit', 'journal/supplier-notes',
  'support/contact', 'guides/route-planning', 'products/day-bag', 'archive/sale',
  'collections/seasonal', 'guides/first-ride', 'products/saddle-bag', 'journal/field-notes',
]
const reports = [
  ['not_indexed', 'Crawled – currently not indexed', true, 'Successful', true],
  ['not_indexed', 'Excluded by “noindex” tag', true, 'Successful', false],
  ['indexed', 'Page is indexed', true, 'Successful', true],
  ['indexed', 'Page is indexed', true, 'Successful', true],
  ['indexed_with_issues', 'Indexed, with page experience issues', true, 'Successful', true],
  ['indexed', 'Page is indexed', true, 'Successful', true],
  ['not_indexed', 'Discovered – currently not indexed', null, null, null],
  ['indexed', 'Page is indexed', true, 'Successful', true],
  ['not_indexed', 'Not found (404)', true, 'Not found (404)', null],
  ['not_indexed', 'Duplicate, Google chose a different canonical', true, 'Successful', true],
  ['not_indexed', 'Blocked by robots.txt', false, 'Blocked by robots.txt', null],
  ['indexed', 'Page is indexed', true, 'Successful', true],
]
const mapNames = [
  'root', 'products', 'guides', 'videos', 'legacy', 'articles', 'collections', 'archive',
  'support', 'catalog', 'hardware', 'outdoor', 'parts', 'accessories', 'journal', 'materials',
  'retail', 'seasonal', 'repairs', 'lookbook', 'pages', 'resources', 'stories', 'retired',
]
const scopes = [
  ['northwind', 'https://northwind.example/', 36, 24],
  ['harbor', 'https://harbor-supply.example/', 14, 8],
  ['docs', 'https://docs.northwind.example/guides/', 10, 4],
]
const serial = (prefix, i) => prefix + '_' + String(i + 1).padStart(3, '0')
const after = (stamp) => new Date(Date.parse(stamp) + 60000).toISOString()

function seedMaps() {
  return scopes.flatMap(([key, base, , count]) => mapNames.slice(0, count).map((name, i) => {
    const status = ({ 3: 'has_errors', 4: 'could_not_fetch', 7: 'pending', 23: 'removed' })[i] || 'success'
    const issues = status === 'has_errors' ? [{ code: 'invalid_date', message: 'Invalid last modified date', row: 18 }]
      : status === 'could_not_fetch' ? [{ code: 'http_404', message: 'The sitemap returned HTTP 404.', row: null }] : []
    return {
      id: 'sm_' + key + '_' + name, propertyId: 'prop_' + key,
      url: base + (i ? 'sitemaps/' + name + '.xml' : 'sitemap.xml'),
      type: i ? 'sitemap' : 'sitemap_index', status, createdAt: date(i + 1), createdBy: actorId,
      lastSubmittedAt: date(i + 3), lastSubmittedBy: actorId, submissionCount: 2,
      lastReadAt: status === 'pending' ? date(i + 2) : date(i + 4),
      discoveredPages: status === 'could_not_fetch' ? 0 : 265 - i * 17 % 245,
      discoveredVideos: i === 3 ? 14 : 0, issues,
      removedAt: status === 'removed' ? date(30) : null, removedBy: status === 'removed' ? actorId : null,
    }
  }))
}

function seedPages() {
  return scopes.flatMap(([key, base, count]) => topics.slice(0, count).map((topic, i) => {
    const url = base + (key === 'docs' ? topic.replace(/^guides\//, '') : topic)
    const [verdict, reason, crawlAllowed, pageFetch, indexingAllowed] = reports[i % reports.length]
    const status = pageFetch === 'Not found (404)' ? 'fetch_failed'
      : crawlAllowed === false || indexingAllowed === false ? 'blocked' : 'indexable'
    return {
      id: key === 'docs' && i === 2 ? 'page_guide_start' : serial('page_' + key, i),
      propertyId: 'prop_' + key, url,
      index: {
        verdict, reason, lastCrawlAt: crawlAllowed === null ? null : date(10 + i % 19),
        crawlAllowed, pageFetch, indexingAllowed, userCanonical: indexingAllowed ? url : null,
        googleCanonical: verdict.startsWith('indexed') ? url : i === 9 ? base + 'collections/field-gear' : null,
        sitemapIds: ['sm_' + key + '_' + (topic.startsWith('products/') ? 'products' : 'root')],
        referringUrls: i % 3 === 0 ? [base] : [],
      },
      live: {
        status, reason: status === 'indexable' ? null : reason,
        crawlAllowed: crawlAllowed !== false, pageFetch: status === 'indexable' ? 'Successful' : pageFetch,
        indexingAllowed: status === 'indexable' ? true : indexingAllowed,
      },
    }
  }))
}

export function createInitialData() {
  const properties = propertySeeds.map(([key, scope, status = 'verified'], i) => {
    const type = scope.startsWith('https:') ? 'url_prefix' : 'domain'
    const createdAt = date(i - 6)
    const owner = status !== 'pending'
    return {
      id: 'prop_' + key, type, siteUrl: type === 'domain' ? 'sc-domain:' + scope : scope,
      status, permissionLevel: owner ? 'siteOwner' : 'siteUnverifiedUser',
      verificationMethod: type === 'domain' ? 'dns_txt' : 'html_file',
      createdAt, createdBy: actorId, verifiedAt: owner ? createdAt : null,
      verifiedBy: owner ? actorId : null, removedAt: status === 'removed' ? date(24) : null,
      removedBy: status === 'removed' ? actorId : null,
    }
  })
  const propertyEvents = properties.flatMap(p => {
    const changes = [['added', 'pending', p.createdAt]]
    if (p.verifiedAt) changes.push(['verified', 'verified', p.verifiedAt])
    if (p.removedAt) changes.push(['removed', 'removed', p.removedAt])
    return changes.map(([type, status, createdAt]) => ({
      id: 'pe_' + p.id + '_' + type, propertyId: p.id, type, status, actorId, createdAt,
    }))
  })
  const pages = seedPages()
  const sitemaps = seedMaps()
  const sitemapEvents = sitemaps.flatMap(s => {
    const changes = [['submitted', 'pending', s.createdAt], ['resubmitted', 'pending', s.lastSubmittedAt]]
    if (s.removedAt) changes.push(['removed', 'removed', s.removedAt])
    return changes.map(([type, status, createdAt]) => ({
      id: 'se_' + s.id + '_' + type, sitemapId: s.id, propertyId: s.propertyId,
      url: s.url, type, status, actorId, createdAt,
    }))
  })
  const history = [...pages.slice(2, 23), ...pages.slice(38, 43), ...pages.slice(52, 56), pages[3], pages[6]]
  const inspections = history.map((p, i) => ({
    id: serial('insp', i), propertyId: p.propertyId, pageId: p.id,
    url: p.url, index: p.index, actorId, createdAt: date(15 + Math.floor(i / 2), 9 + i % 2),
  }))
  const liveTests = [0, 1, 2, 3, 4, 5, 6, 7, 9, 11, 22, 26].map((index, i) => {
    const report = inspections[index]
    return {
      id: serial('live', i), propertyId: report.propertyId, inspectionId: report.id,
      url: report.url, result: history[index].live, actorId, createdAt: after(report.createdAt),
    }
  })
  const indexingRequests = liveTests.filter(test => test.result.status === 'indexable').slice(0, 8).map((test, i) => ({
    id: serial('req', i), propertyId: test.propertyId, inspectionId: test.inspectionId,
    liveTestId: test.id, url: test.url, status: 'queued', actorId, createdAt: after(test.createdAt),
  }))
  return {
    account: { id: actorId, name: 'Maya Chen', email: 'maya.chen@northwind.example', activePropertyId: 'prop_northwind' },
    properties, propertyEvents, pages, inspections, liveTests, indexingRequests, sitemaps, sitemapEvents,
  }
}
