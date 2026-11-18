export const regions = { us: 'United States', eu: 'Europe' }

export const dynoSizes = {
  eco: { label: 'Eco', max: 1 },
  basic: { label: 'Basic', max: 1 },
  'standard-1x': { label: 'Standard-1X', max: 10 },
  'standard-2x': { label: 'Standard-2X', max: 10 },
}

export const catalog = [
  {
    key: 'heroku-postgresql', name: 'Heroku Postgres', category: 'Database',
    description: 'Managed PostgreSQL for relational application data.',
    plans: [
      { key: 'essential-0', label: 'Essential-0', monthlyPrice: 5 },
      { key: 'essential-1', label: 'Essential-1', monthlyPrice: 9 },
      { key: 'essential-2', label: 'Essential-2', monthlyPrice: 20 },
    ],
  },
  {
    key: 'heroku-redis', name: 'Heroku Key-Value Store', category: 'Cache',
    description: 'Redis-compatible storage for caching and job queues.',
    plans: [
      { key: 'mini', label: 'Mini', monthlyPrice: 3 },
      { key: 'premium-0', label: 'Premium-0', monthlyPrice: 15 },
    ],
  },
  {
    key: 'papertrail', name: 'Papertrail', category: 'Logging',
    description: 'Search and retain application logs in one place.',
    plans: [
      { key: 'choklad', label: 'Choklad', monthlyPrice: 0 },
      { key: 'fixa', label: 'Fixa', monthlyPrice: 7 },
    ],
  },
]

export const appSections = [
  ['Overview', ''], ['Resources', '/resources'], ['Releases', '/releases'], ['Settings', '/settings'],
]

export const appPath = (appId, section = '') => '/apps/' + encodeURIComponent(appId) + section
