import { generateAudit } from './auditFixture.js'

const fixtures = [
  ['northstar', 'Northstar Supply', 'northstar-supply', 'Retail', 'shipping supplies', 'packaging'],
  ['alder', 'Alder Trail Outfitters', 'alder-trail', 'Retail', 'hiking gear', 'trail equipment'],
  ['harborlight', 'Harborlight Finance', 'harborlight-finance', 'Finance', 'small business loans', 'cash flow'],
  ['lumen', 'Lumen Desk', 'lumen-desk', 'Retail', 'standing desks', 'home office furniture'],
  ['juniper', 'Juniper Studio', 'juniper-studio', 'Services', 'brand strategy', 'design services'],
  ['cobalt', 'Cobalt Forms', 'cobalt-forms', 'SaaS', 'online forms', 'form builder'],
  ['bracken', 'Bracken Garden Works', 'bracken-garden', 'Retail', 'raised garden beds', 'garden tools'],
  ['windrow', 'Windrow Foods', 'windrow-foods', 'Retail', 'whole grain snacks', 'pantry staples'],
  ['morrow', 'Morrow Kitchens', 'morrow-kitchens', 'Services', 'kitchen remodeling', 'cabinet design'],
  ['sable', 'Sable Freight', 'sable-freight', 'Logistics', 'freight forwarding', 'shipping rates'],
  ['orchard', 'Orchard Analytics', 'orchard-analytics', 'SaaS', 'customer analytics', 'reporting dashboards'],
  ['fenway', 'Fenway Coffee Works', 'fenway-coffee-works', 'Retail', 'fresh roasted coffee', 'coffee subscription'],
  ['copper', 'Copperleaf Advisory', 'copperleaf-advisory', 'Finance', 'retirement planning', 'financial advice'],
  ['terrace', 'Terrace Learning', 'terrace-learning', 'Education', 'online courses', 'teacher resources'],
  ['willow', 'Willow Pet Goods', 'willow-pet-goods', 'Retail', 'dog harnesses', 'pet travel'],
  ['redwood', 'Redwood Fleet', 'redwood-fleet', 'Logistics', 'fleet management', 'vehicle tracking'],
  ['pinnacle', 'Pinnacle Fixtures', 'pinnacle-fixtures', 'Retail', 'bathroom fixtures', 'modern lighting'],
  ['cloudline', 'Cloudline Reports', 'cloudline-reports', 'SaaS', 'automated reports', 'data connectors'],
  ['hightide', 'Hightide Bicycles', 'hightide-bicycles', 'Retail', 'commuter bicycles', 'bike accessories'],
  ['fieldstone', 'Fieldstone Learning', 'fieldstone-learning', 'Education', 'math tutoring', 'study plans'],
  ['ember', 'Ember Audio', 'ember-audio', 'Retail', 'studio headphones', 'home audio'],
  ['basin', 'Basin Water Systems', 'basin-water', 'Services', 'water filtration', 'whole house filters'],
  ['prairie', 'Prairie Ledger', 'prairie-ledger', 'Finance', 'bookkeeping software', 'invoice tracking'],
  ['tandem', 'Tandem Hiring', 'tandem-hiring', 'SaaS', 'hiring software', 'candidate management'],
  ['opal', 'Opal Home Goods', 'opal-home-goods', 'Retail', 'linen sheets', 'bedroom textiles'],
  ['cedar', 'Cedar Parcel', 'cedar-parcel', 'Logistics', 'parcel delivery', 'last mile delivery'],
  ['meadow', 'Meadow Metrics', 'meadow-metrics', 'SaaS', 'marketing metrics', 'campaign reports'],
  ['ridge', 'Ridge Tech Academy', 'ridge-tech-academy', 'Education', 'web development classes', 'coding courses'],
  ['sandbar', 'Sandbar Workwear', 'sandbar-workwear', 'Retail', 'work jackets', 'durable workwear'],
  ['bay', 'Bay Foundry', 'bay-foundry', 'Services', 'metal fabrication', 'industrial casting'],
  ['summit', 'Summit Luggage', 'summit-luggage', 'Retail', 'carry on luggage', 'travel accessories'],
  ['greenway', 'Greenway Tax', 'greenway-tax', 'Finance', 'local tax planning', 'business tax filing'],
]
const owners = [['user-maya', 'Maya Chen'], ['user-elias', 'Elias Brooks'], ['user-naomi', 'Naomi Patel'], ['user-jordan', 'Jordan Miles']]
const featuredTerms = [
  'insulated shipping boxes', 'recycled mailers', 'folding cartons', 'bulk shipping boxes', 'custom printed boxes',
  'kraft paper tape', 'padded paper envelopes', 'thermal shipping labels', 'wholesale cardboard boxes',
  'compostable mailers', 'corrugated packaging', 'retail shipping kits', 'shipping supplies wholesale',
  'shipping labels for small business', 'cold chain packaging', 'paper void fill', 'reusable storage totes',
  'bulk packing materials', 'shipping box size guide', 'mailing tubes', 'recycled packaging supplies',
  'water activated tape', 'temperature controlled shipping', 'flat rate shipping boxes', 'warehouse packaging',
  'custom mailer boxes', 'double wall cartons', 'shipping fragile items', 'document envelopes',
  'eco friendly packaging', 'protector corners', 'insulated box liners', 'packaging tape dispenser',
  'bulk padded mailers', 'paper cushioning rolls', 'return shipping labels', 'right size packaging', 'branded packing slips',
]
const dateAt = (day, hour = '15') => '2026-10-' + String(day).padStart(2, '0') + 'T' + hour + ':00:00.000Z'
const identity = (id, day, createdBy = owners[0][0]) => ({ id, createdAt: dateAt(day), createdBy })
const pad = (index) => String(index).padStart(2, '0')

export function createInitialData() {
  const account = { id: 'user-maya', name: 'Maya Chen', workspaceName: 'Search Operations' }
  const projects = fixtures.map(([slug, name, host, sector], i) => {
    const [ownerId, ownerName] = owners[i % owners.length]
    return {
      ...identity('prj-' + slug, i === 0 ? 8 : 7 - i % 6, ownerId), name, domain: host + '.example', ownerId, ownerName,
      tags: [sector, ...(i % 5 === 0 ? ['Priority'] : i % 6 === 1 ? ['Growth'] : [])], pinned: [0, 3, 8].includes(i),
    }
  })
  const trackingCampaigns = []
  const trackedKeywords = []
  const trackingCompetitors = []
  const auditConfigs = []
  const auditRuns = []
  const auditIssues = []
  const auditPages = []

  function addTracking(project, index, featured = false, second = false) {
    const [slug, , , sector, firstTerm, nextTerm] = fixtures[index]
    const device = featured ? 'mobile' : second ? 'desktop' : ['desktop', 'mobile', 'tablet'][index % 3]
    const id = 'trk-' + slug + '-' + device
    const created = featured ? 8 : second ? 7 : 5
    const observations = featured ? 14 : 7
    const history = Array.from({ length: observations }, (_, i) => ({
      date: dateAt(i + created).slice(0, 10),
      visibility: Math.round((featured ? 19 + i * .7 + (i % 4) * .55 : 8 + index % 17 + i * .63) * 10) / 10,
      estimatedTraffic: featured ? 518 + 17 * i - (i % 3) * 13 : 130 + index * 12 + i * 14,
      averagePosition: Math.round((featured ? 23.8 - i * .42 : 41 - index % 13 - i * .75) * 10) / 10,
    }))
    trackingCampaigns.push({
      ...identity(id, created, project.ownerId), projectId: project.id, target: project.domain, targetType: 'root_domain',
      device, searchEngine: second || index % 7 === 5 ? 'bing' : 'google',
      location: featured ? 'Seattle, Washington, United States' : index % 4 === 1 ? 'Canada' : 'United States',
      language: 'English', status: 'active', startedAt: dateAt(created), history,
    })
    const terms = featured ? featuredTerms : [firstTerm, nextTerm, 'best ' + firstTerm, nextTerm + ' guide', firstTerm + ' comparison', firstTerm + ' pricing']
    trackedKeywords.push(...terms.map((term, i) => {
      const position = i === 0 && featured ? 8 : i % 9 === 8 ? null : 1 + (i * 7 + index * 4) % 94
      return {
        ...identity('kw-' + slug + '-' + device + '-' + pad(i + 1), created, project.ownerId), campaignId: id, term,
        tags: [featured ? ['Packaging', 'Shipping', 'Warehouse', 'Materials'][i % 4] : sector, ...(i % 6 === 0 ? ['Priority'] : [])],
        position, previousPosition: position == null ? null : i === 0 && featured ? 11 : Math.max(1, Math.min(100, position + (i % 7) - 3)),
        volume: i === 0 && featured ? 590 : i % 9 === 8 ? null : 40 + ((i * 43 + index * 7) % 160) * 10,
        landingUrl: position == null ? null : 'https://' + project.domain + '/products/' + (i === 0 && featured ? 'insulated-boxes' : term.replaceAll(' ', '-')),
      }
    }))
    const names = featured ? ['parcelworks', 'foldline-supply', 'paperbridge'] : [slug + '-market']
    trackingCompetitors.push(...names.map((name, i) => ({
      ...identity('cmp-' + slug + '-' + device + '-' + (i + 1), created, project.ownerId), campaignId: id, domain: name + '.example',
      visibility: 24.1 - i * 3.1 + index % 4, estimatedTraffic: 610 - i * 77 + index * 12, top10: 13 - i * 2 + index % 4,
    })))
  }

  for (const [i, project] of projects.entries()) {
    const [slug] = fixtures[i]
    if (i < 25) addTracking(project, i, i === 0)
    if (i === 0) addTracking(project, i, false, true)
    if (i < 2 || (i >= 4 && i < 28)) {
      const id = 'adc-' + slug
      const currentSettings = {
        scope: project.domain, pageLimit: i === 0 ? 36 : 12 + i % 10,
        crawlSource: 'website', sitemapUrl: null, crawlerDevice: i % 2 ? 'desktop' : 'mobile',
        allowPaths: [], disallowPaths: [], schedule: { frequency: 'once', weekday: null }, excludedCheckKeys: [],
      }
      auditConfigs.push({ ...identity(id, 7, project.ownerId), projectId: project.id, ...currentSettings })
      const count = i < 8 ? 2 : 1
      for (let runNumber = 1; runNumber <= count; runNumber++) {
        const runId = 'adr-' + slug + '-' + pad(runNumber)
        const day = 7 + runNumber * 5
        const make = (prefix, serial) => identity(prefix + '-' + slug + '-' + pad(runNumber) + '-' + String(serial).padStart(3, '0'), day, project.ownerId)
        const settings = { ...currentSettings, pageLimit: i === 0 && runNumber === 1 ? 27 : currentSettings.pageLimit }
        const { pages, issues, healthScore } = generateAudit({ settings, runId, make, seedOffset: runNumber - 2 })
        auditRuns.push({
          ...identity(runId, day, project.ownerId), projectId: project.id, auditConfigId: id, runNumber, status: 'completed',
          startedAt: dateAt(day), completedAt: dateAt(day, '16'), healthScore, pagesCrawled: pages.length, settingsSnapshot: settings,
        })
        auditIssues.push(...issues)
        auditPages.push(...pages)
      }
    }
  }
  return { account, projects, trackingCampaigns, trackedKeywords, trackingCompetitors, auditConfigs, auditRuns, auditIssues, auditPages, activity: [] }
}

