import { defaultNameServers, images, planConfig, plans, regions } from './catalog.js'

export function createInitialData() {
  const account = { id: 'usr-maya', name: 'Maya Chen', email: 'maya@example.com', teamName: 'Northline Studio' }
  const projects = [
    { id: 'prj-northline', name: 'Northline Platform', environment: 'production' },
    { id: 'prj-harbor', name: 'Harbor Services', environment: 'staging' },
    { id: 'prj-fieldwork', name: 'Fieldwork Lab', environment: 'development' },
  ]
  const pad = number => String(number).padStart(2, '0')
  const date = (day, hour = 14) => new Date(Date.UTC(2026, 9, day, hour)).toISOString()
  const stamp = day => ({ createdBy: account.id, createdAt: date(day) })
  const prefixes = ['web-edge', 'api-staging', 'worker-queue', 'db-replica', 'cache-node', 'build-runner']

  const droplets = Array.from({ length: 36 }, (_, index) => {
    const group = Math.floor(index / 6)
    const suffix = pad(index % 6 + 1)
    return {
      id: `drp-${prefixes[group].split('-')[0]}-${suffix}`,
      name: `${prefixes[group]}-${suffix}`,
      projectId: projects[(group + index) % projects.length].id,
      region: regions[(group + index) % regions.length][0],
      imageSlug: images[index % images.length][0],
      ...planConfig(plans[(index + 2) % plans.length]),
      ipv4: `192.0.2.${24 + index}`,
      status: index % 4 === 1 ? 'off' : 'active',
      ...stamp(1 + index % 16),
    }
  })

  const zones = [
    'northline', 'harbor-services', 'fieldwork-lab', 'northline-api', 'harbor-preview', 'fieldwork-sandbox',
    'northline-assets', 'harbor-edge', 'fieldwork-builds', 'northline-status', 'harbor-events', 'fieldwork-tools',
    'northline-metrics', 'harbor-docs', 'fieldwork-data', 'northline-cache', 'harbor-gateway', 'fieldwork-portal',
    'northline-mail', 'harbor-jobs', 'fieldwork-ops', 'northline-auth', 'harbor-releases', 'fieldwork-archive',
  ]
  const domains = zones.map((name, index) => ({
    id: `dom-${name}`, name: `${name}.example`, projectId: projects[index % projects.length].id,
    status: 'active', ...stamp(index % 12 + 2),
  }))
  const dnsRecords = domains.flatMap((domain, index) => {
    const candidate = droplets[index]
    const droplet = candidate.projectId === domain.projectId ? candidate : droplets.find(row => row.projectId === domain.projectId)
    const variants = [
      { type: 'AAAA', name: '@', data: `2001:db8::${24 + index}` },
      { type: 'CNAME', name: 'www', data: `${domain.name}.` },
      { type: 'MX', name: '@', data: 'mail.example.', priority: 10 },
      { type: 'TXT', name: '@', data: 'v=spf1 -all' },
      { type: 'SRV', name: '_sip._tcp', data: 'voice.example.', priority: 10, weight: 5, port: 5060 },
      { type: 'CAA', name: '@', data: 'example.com', flags: 0, tag: 'issue' },
    ]
    const suffix = pad(index + 1)
    const base = { domainId: domain.id, ttl: 3600, ...stamp(index % 12 + 3) }
    return [
      { ...base, id: `dns-web-${suffix}`, type: 'A', name: '@', data: droplet.ipv4, dropletId: droplet.id },
      { ...base, id: `dns-zone-${suffix}`, ...variants[index % variants.length] },
      ...defaultNameServers(domain.id, domain.createdBy, domain.createdAt, number => `dns-ns-${suffix}-${number}`),
    ]
  })

  const snapshots = Array.from({ length: 24 }, (_, index) => {
    const source = droplets[index]
    const archived = index === 23
    const id = index === 0 ? 'snap-web-01' : `snap-image-${pad(index + 1)}`
    const sourceDropletName = archived ? 'legacy-proxy-01' : source.name
    return {
      id, name: index === 0 ? 'web-edge-before-release' : `${sourceDropletName}-${['baseline', 'before-release', 'recovery'][index % 3]}`,
      sourceDropletId: archived ? 'drp-legacy-proxy-01' : source.id, sourceDropletName,
      imageSlug: `snapshot-${id}`,
      regions: index % 5 === 0 ? [source.region, regions[(index + 1) % regions.length][0]] : [source.region],
      sizeGb: 12.5 + index / 2, minDiskGb: source.diskGb, status: 'available', ...stamp(index % 12 + 17),
    }
  })

  const activity = Array.from({ length: 12 }, (_, index) => {
    const entities = [
      ['droplet', droplets[index], { projectId: droplets[index].projectId }],
      ['domain', domains[index], { projectId: domains[index].projectId, recordIds: dnsRecords.filter(record => record.domainId === domains[index].id && record.type === 'NS').map(record => record.id) }],
      ['dns_record', dnsRecords[index * 5], { domainId: dnsRecords[index * 5].domainId }],
      ['snapshot', snapshots[index], { sourceDropletId: snapshots[index].sourceDropletId }],
    ]
    const [entityType, entity, related] = entities[index % entities.length]
    return {
      id: `act-seed-${pad(index + 1)}`, kind: `${entityType}.created`, entityType, entityId: entity.id,
      actorId: account.id, status: 'completed', createdAt: entity.createdAt, details: { ...related, after: entity },
    }
  })

  return { account, projects, droplets, domains, dnsRecords, snapshots, activity }
}
