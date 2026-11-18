const stamp = (day) => `2026-10-${String(day).padStart(2, '0')}T14:30:00.000Z`
const id = (prefix, index) => `${prefix}-${String(index + 1).padStart(3, '0')}`
const actor = 'usr-maya'
const countries = ['US', 'CA', 'GB']
const collections = ['Cedar Ridge', 'Juniper Valley', 'Alder Creek', 'Granite Peak', 'Willow Bend', 'Silver Lake', 'Pine Basin', 'Birch Point']
const goods = [
  ['28 L Daypack', 'TRAIL', 84.95, 'pack'], ['Insulated Bottle', 'BOTTLE', 28, 'bottle'],
  ['Camp Lantern', 'LANTERN', 39, 'lantern'], ['Wool Throw', 'THROW', 59, 'throw'],
  ['Travel Pouch', 'POUCH', 21.5, 'pouch'], ['Enamel Mug', 'MUG', 16, 'mug'],
]
const sourceNames = ['North America storefront', 'Canada outdoor catalog', 'UK home collection', 'Seasonal trail assortment', 'Lodge accessories', 'Weekend market', 'US gift collection', 'Canadian lifestyle', 'UK warehouse']
export const currencies = { US: 'USD', CA: 'CAD', GB: 'GBP', AU: 'AUD', DE: 'EUR', FR: 'EUR', JP: 'JPY' }
export const languages = ['en', 'fr', 'de', 'es', 'ja']
export const sampleUrl = 'https://feeds.northline.example/catalog.tsv'
export const fixtureKeyFor = (url) => url === sampleUrl ? 'north-america-catalog' : null
export const fixtureText = 'id\ttitle\tprice\tavailability\tlink\nNL-LOCAL-001\tCedar Ridge Trail Tumbler\t24.95\tin_stock\thttps://northline.example/products/trail-tumbler\nNL-LOCAL-002\tAlder Creek Camp Bowl\t18.50\tin_stock\thttps://northline.example/products/camp-bowl'
const issueDefinitions = {
  missing_gtin: ['Missing GTIN', 'Enter a valid GTIN from the packaging or manufacturer.', 'gtin'],
  missing_image: ['Missing product image', 'Enter an image URL for a clear image of the product.', 'imageLink'],
  price_mismatch: ['Price mismatch', 'Match the catalog price to the price on the landing page and request a website check.', 'price'],
  availability_mismatch: ['Availability mismatch', 'Verify the listing and landing page show the same availability.', 'availability'],
  feed_validation: ['Source rows rejected', 'Open the source update history and correct the rejected rows in your next upload.', null],
  setup_policy: ['Store information needs review', 'Review the store information shown on your storefront before requesting review.', null],
}

export function createInitialData() {
  const account = { id: 'mc-northline-01', name: 'Northline Supply Co.', actorId: actor, actorName: 'Maya Chen', defaultCountry: 'US', defaultCurrency: 'USD' }
  const feeds = Array.from({ length: 24 }, (_, i) => {
    const method = i % 2 ? 'file_upload' : 'scheduled_fetch'
    const status = ['success', 'partial', 'failed', 'never_run', 'success', 'success'][i % 6]
    return {
      id: id('feed', i), name: i < sourceNames.length ? sourceNames[i] : `${collections[i % 8]} ${['catalog', 'stock updates', 'assortment'][i % 3]}`,
      type: i % 4 === 3 ? 'supplemental' : 'primary', method, country: countries[i % 3], language: 'en',
      sourceUrl: method === 'scheduled_fetch' ? (i === 0 ? sampleUrl : `https://feeds.northline.example/source-${i + 1}.tsv`) : '',
      schedule: method === 'scheduled_fetch' ? { frequency: ['daily', 'weekly', 'monthly'][i % 3], time: '06:30', timezone: i % 3 === 2 ? 'Europe/London' : 'America/New_York' } : null,
      fixtureKey: i === 0 ? fixtureKeyFor(sampleUrl) : null, status,
      lastRunId: status === 'never_run' ? null : id('run', i),
      lastRunAt: status === 'never_run' ? null : stamp(18 + i % 8), actor, createdAt: stamp(2), updatedAt: stamp(18 + i % 8), deletedAt: null,
    }
  })
  const feedRuns = feeds.flatMap((feed, i) => {
    if (!feed.lastRunId) return []
    const acceptedCount = { success: 12, partial: 9, failed: 0 }[feed.status]
    const rejectedCount = acceptedCount ? 12 - acceptedCount : 2
    const input = feed.method === 'file_upload' ? { fileName: `northline-${i + 1}.tsv`, sizeBytes: 4810 } : { sourceUrl: feed.sourceUrl, fixtureKey: feed.fixtureKey }
    const trigger = feed.method === 'file_upload' ? 'upload' : 'manual_update'
    const latest = {
      id: feed.lastRunId, feedId: feed.id, trigger, status: feed.status, input, receivedCount: acceptedCount + rejectedCount, acceptedCount, rejectedCount,
      errors: Array.from({ length: rejectedCount }, (_, row) => ({ row: row + 4, offerId: `NL-IMPORT-${row + 1}`, code: 'invalid_price', message: 'Enter a valid price.' })),
      actor, createdAt: feed.lastRunAt,
    }
    return i < 3 ? [{ ...latest, id: id('run-history', i), createdAt: stamp(12) }, latest] : [latest]
  })
  const products = Array.from({ length: 60 }, (_, i) => {
    const [name, skuPrefix, price, thumbnailKey] = goods[i % goods.length]
    const collection = collections[Math.floor(i / goods.length) % collections.length]
    const country = countries[i < 48 ? Math.floor(i / 6) % 3 : (i + 1) % 3]
    const sku = `${skuPrefix}-${String(i + 28).padStart(3, '0')}`
    const feed = i % 5 ? feeds.filter((item) => item.type === 'primary' && item.country === country)[i % 5] : null
    return {
      id: id('prd', i), sku, offerId: `NL-${sku}`, title: `${collection} ${name}`,
      description: `${name} from Northline’s ${collection} collection, designed for everyday use and weekend trips.`,
      brand: 'Northline', condition: i % 16 === 8 ? 'refurbished' : i % 16 === 12 ? 'used' : 'new',
      price, currency: currencies[country], availability: i % 5 === 3 ? 'in_stock' : ['in_stock', 'in_stock', 'out_of_stock', 'preorder', 'backorder'][i % 5],
      status: ['approved', 'approved', 'approved', 'pending', 'approved', 'approved'][i % 6], visibility: i % 9 === 6 ? 'hidden' : 'visible',
      country, language: 'en', link: `https://northline.example/products/${sku.toLowerCase()}`,
      imageLink: i % 7 === 4 ? '' : `https://northline.example/images/${sku.toLowerCase()}.jpg`,
      gtin: i % 6 ? '036000291452' : '', mpn: sku, thumbnailKey, feedId: feed?.id ?? null,
      actor, createdAt: stamp(4 + i % 5), updatedAt: stamp(15 + i % 12), deletedAt: null,
    }
  })
  const issueSeeds = [
    ['missing_gtin', 0, 'open', 'warning'], ['price_mismatch', 0, 'open', 'error'], ['missing_image', 4, 'open', 'error'],
    ['availability_mismatch', 1, 'open', 'warning'], ['feed_validation', null, 'open', 'error', 1], ['setup_policy', null, 'open', 'warning'],
  ]
  const issueCodes = Object.keys(issueDefinitions)
  for (let i = 6; i < 36; i++) {
    const code = issueCodes[i % 6]
    issueSeeds.push([code, i % 6 < 4 ? (i % 6 === 1 ? i - 3 : i) : null, i % 9 === 0 ? 'under_review' : i % 5 === 0 ? 'resolved' : 'open', i % 2 ? 'warning' : 'error', i % 6 === 4 ? i % feeds.length : null])
  }
  const issues = issueSeeds.map(([code, productIndex, status, severity, feedIndex], i) => {
    const [title, remediation, field] = issueDefinitions[code]
    const product = products[productIndex]
    const feed = feeds[feedIndex]
    if (product && status !== 'resolved' && code === 'missing_image') product.imageLink = ''
    const detail = {
      missing_gtin: 'The listing is missing the unique identifier supplied by its manufacturer.',
      missing_image: 'The listing is missing a product image URL.',
      price_mismatch: 'The price reported for this offer differs from the storefront price.',
      availability_mismatch: 'The availability reported for this offer differs from the storefront.',
      feed_validation: 'The last source update included rows that did not pass validation.',
      setup_policy: 'Some storefront details need attention before listings can be fully eligible.',
    }
    return {
      id: id('iss', i), code, title, description: detail[code], remediation, field, observedValue: product?.[field] ?? null,
      severity, scope: product ? 'product' : feed ? 'feed' : 'account', status, country: product?.country ?? feed?.country ?? countries[i % 3],
      productId: product?.id ?? null, feedId: feed?.id ?? product?.feedId ?? null,
      reviewOptions: code === 'missing_gtin' || code === 'missing_image' ? [] : code.endsWith('mismatch') ? ['website_check', 'fixed', 'disagree'] : ['fixed', 'disagree'],
      latestReviewId: status === 'under_review' ? id('rev', i) : null,
      resolution: status === 'resolved' ? 'data_corrected' : null,
      resolvedAt: status === 'resolved' ? stamp(24) : null,
      actor, createdAt: stamp(13 + i % 6), updatedAt: stamp(24),
    }
  })
  for (const product of products) {
    const linked = issues.filter((issue) => issue.productId === product.id && issue.status !== 'resolved')
    if (linked.length) product.status = linked.some((issue) => issue.status === 'open' && issue.severity === 'error') ? 'disapproved'
      : linked.some((issue) => issue.status === 'open') ? 'limited' : 'pending'
  }
  const issueReviews = issues.filter((issue) => issue.latestReviewId).map((issue) => ({
    id: issue.latestReviewId, issueId: issue.id, productId: issue.productId, feedId: issue.feedId,
    country: issue.country, reason: issue.reviewOptions.includes('website_check') ? 'website_check' : 'fixed', acknowledged: true,
    status: 'submitted', actor, createdAt: stamp(24),
  }))
  const issueActions = issues.flatMap((issue, i) => {
    if (issue.status === 'open') return []
    const resolution = issue.resolution ? { resolution: issue.resolution } : { reviewId: issue.latestReviewId }
    return [{ id: id('iac', i), issueId: issue.id, productId: issue.productId, feedId: issue.feedId,
      action: issue.resolution ? 'resolved' : 'review_requested', status: issue.status, ...resolution, actor, createdAt: stamp(24) }]
  })
  const productChanges = products.filter((item) => item.visibility === 'hidden').map((item, i) => ({
    id: id('pchg', i), productId: item.id, action: 'visibility_changed', changes: { visibility: { before: 'visible', after: 'hidden' } }, actor, createdAt: item.updatedAt,
  }))
  const feedChanges = feeds.slice(0, 5).map((item, i) => ({
    id: id('fchg', i), feedId: item.id, action: 'created', changes: Object.fromEntries(
      Object.entries(item).filter(([key]) => ['name', 'type', 'method', 'country', 'language', 'sourceUrl', 'schedule', 'fixtureKey'].includes(key))
        .map(([key, value]) => [key, { before: null, after: value }])), actor, createdAt: item.createdAt,
  }))
  return { account, products, feeds, feedRuns, issues, issueReviews, productChanges, feedChanges, issueActions }
}

