export const regions = [
  ['nyc3', 'New York'],
  ['sfo3', 'San Francisco'],
  ['ams3', 'Amsterdam'],
  ['fra1', 'Frankfurt'],
  ['sgp1', 'Singapore'],
  ['lon1', 'London'],
]

export const plans = [
  { slug: 's-1vcpu-1gb', vcpus: 1, memoryMb: 1024, diskGb: 25, monthlyPrice: 6 },
  { slug: 's-1vcpu-2gb', vcpus: 1, memoryMb: 2048, diskGb: 50, monthlyPrice: 12 },
  { slug: 's-2vcpu-4gb', vcpus: 2, memoryMb: 4096, diskGb: 80, monthlyPrice: 24 },
  { slug: 's-4vcpu-8gb', vcpus: 4, memoryMb: 8192, diskGb: 160, monthlyPrice: 48 },
  { slug: 's-8vcpu-16gb', vcpus: 8, memoryMb: 16384, diskGb: 320, monthlyPrice: 96 },
]

export const images = [
  ['ubuntu-24-04-x64', 'Ubuntu 24.04 LTS'],
  ['ubuntu-22-04-x64', 'Ubuntu 22.04 LTS'],
  ['debian-12-x64', 'Debian 12'],
  ['rockylinux-9-x64', 'Rocky Linux 9'],
]

export const regionLabel = (code) => regions.find(([value]) => value === code)?.[1] || code || '—'
export const imageLabel = (slug) => images.find(([value]) => value === slug)?.[1] || slug || '—'
export const planLabel = (plan) => plan?.vcpus != null && plan?.memoryMb != null
  ? `${plan.vcpus} vCPU · ${plan.memoryMb / 1024} GB RAM`
  : plan?.planSlug || '—'

export const canUseSnapshot = (snapshot, region, diskGb) =>
  snapshot?.status === 'available' &&
  (snapshot.regions ?? []).includes(region) &&
  Number.isFinite(snapshot.minDiskGb) &&
  diskGb >= snapshot.minDiskGb

export const planConfig = ({ slug, vcpus, memoryMb, diskGb, monthlyPrice }) =>
  ({ planSlug: slug, vcpus, memoryMb, diskGb, monthlyPrice })

export function syntheticIpv4(droplets) {
  const used = new Set(droplets.map(droplet => droplet.ipv4))
  for (const block of ['203.0.113', '198.51.100', '192.0.2']) {
    for (let number = 1; number < 255; number += 1) {
      const address = `${block}.${number}`
      if (!used.has(address)) return address
    }
  }
  return null
}

export const dnsTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA']
export const normalizeDomain = (value) => value.trim().toLowerCase().replace(/\.$/, '')
export const isHostLabel = (value) => /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(value)

export function isDomain(value) {
  const labels = value.split('.')
  return value.length <= 253 && labels.length >= 2 &&
    labels.every(isHostLabel) && !/^\d+$/.test(labels.at(-1))
}

export function defaultNameServers(domainId, createdBy, createdAt, makeId) {
  return [1, 2, 3].map(number => ({
    id: makeId(number), domainId, type: 'NS', name: '@',
    data: `ns${number}.digitalocean.com.`, ttl: 1800, createdBy, createdAt,
  }))
}
