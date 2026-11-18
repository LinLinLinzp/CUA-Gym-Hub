import { entities, transactions } from './model.js'

export const accounting = '/app/accounting/transactions'
export const homePath = '/app/center/card.nl'
export const stockPath = '/app/reporting/reportrunner?reporttype=INVSTATUS'
export const queuePath = (name, query = '') => `${accounting}/${name}.nl${query ? `?${query}` : ''}`
export const transactionPath = (code, query = '') => queuePath(code, query)
export const listPath = (code, params = {}) => {
  const entity = entities[code]
  const search = new URLSearchParams(entity ? params : { Transaction_TYPE: code, ...params })
  const base = entity ? `/app/common/${entity.directory}/${entity.list}.nl` : `${accounting}/transactionlist.nl`
  return search.size ? `${base}?${search}` : base
}
export const recordPath = (code, record, edit = false) => {
  const entity = entities[code]
  const base = entity ? `/app/common/${entity.directory}/${code}.nl` : transactionPath(code)
  if (!record) return base
  const search = new URLSearchParams({ id: record.internalId ?? record.id ?? 'unavailable' })
  if (edit) search.set('e', 'T')
  return `${base}?${search}`
}
export const sourcePath = (code, record) => transactionPath(code, new URLSearchParams({ source: record.internalId ?? record.id }))
export function resolveRoute(path, search) {
  const query = new URLSearchParams(search)
  if (path === '/' || /^\/app\/center\/card(?:\.nl)?\/?$/i.test(path)) return { page: 'home' }
  if (/^\/app\/reporting\/reportrunner(?:\.nl)?\/?$/i.test(path) && (query.get('reporttype') || '').toUpperCase() === 'INVSTATUS') return { page: 'stock' }
  const transaction = /^\/app\/accounting\/transactions\/([a-z]+)(?:\.nl)?\/?$/i.exec(path)
  if (transaction) {
    const section = transaction[1].toLowerCase()
    if (section === 'transactionlist') {
      const code = (query.get('Transaction_TYPE') || query.get('type') || '').toLowerCase()
      if (Object.hasOwn(transactions, code)) return { page: 'list', code }
    }
    const queues = {
      approvesalesorders: ['salesord', 'approveSales'],
      itemshipmanager: ['salesord', 'fulfill'],
      approvetransactions: ['purchord', 'approvePurchase'],
      receiveorders: ['purchord', 'receive'],
      billingmanager: /purchase|vendor|purchord/i.test(query.get('group') || query.get('mode') || query.get('type') || '') ? ['purchord', 'billPurchase'] : ['salesord', 'billSales'],
      orderitems: ['purchord', 'orderItems'],
      paybills: ['vendpymt', 'payBills'],
      transactionsearch: ['salesord', 'search'],
    }
    if (Object.hasOwn(queues, section)) return { page: 'queue', code: queues[section][0], queue: queues[section][1] }
    if (Object.hasOwn(transactions, section)) return { page: 'record', code: section }
  }
  const entity = /^\/app\/common\/(entity|item)\/([a-z]+)(?:\.nl)?\/?$/i.exec(path)
  if (entity) {
    const [, directory, section] = entity.map((value) => value.toLowerCase())
    for (const [code, config] of Object.entries(entities)) {
      if (config.directory !== directory) continue
      if (section === code) return { page: 'record', code }
      if ([config.list, config.plural.toLowerCase(), code === 'custjob' ? 'customerlist' : ''].includes(section)) return { page: 'list', code }
    }
    if (directory === 'entity' && section === 'entitylist') return { page: 'list', code: /vendor/i.test(query.get('type') || '') ? 'vendor' : 'custjob' }
  }
  if (/^\/app\/workspace\/(preferences|tasks|notes|shortcuts)\/?$/.test(path)) return { page: 'workspace', section: path.split('/').filter(Boolean).at(-1) }
  return { page: 'missing' }
}
