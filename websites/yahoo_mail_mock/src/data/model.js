export const array = value => Array.isArray(value) ? value : []
export const id = prefix => prefix + '_' + crypto.randomUUID()
export const lower = value => String(value ?? '').toLowerCase()
export const unique = values => [...new Set(values.filter(Boolean))]
export const emailValid = value => /^[^\s@,<>;]+@[^\s@,<>;]+\.[^\s@,<>;]+$/.test(value || '')
export const addressText = address => [address?.name, address?.email].filter(Boolean).join(' ')
export const displayAddress = address => address?.name || address?.email || 'Unknown sender'
export const contactName = contact => [contact?.firstName, contact?.lastName].filter(Boolean).join(' ') || contact?.nickname || primaryEmail(contact) || 'Unnamed contact'
export const primaryEmail = contact => array(contact?.emails).find(item => item?.address)?.address || ''
export const memberCountLabel = count => count + (count === 1 ? ' member' : ' members')
export const isDraft = message => message?.isDraft || message?.status === 'draft' || message?.folderId === 'draft'
export const isReceived = message => !isDraft(message) && message?.status !== 'sent' && message?.folderId !== 'sent'
export const visibleMail = message => !['trash', 'spam'].includes(message.folderId)
export const subjectOf = message => message?.subject || '(No subject)'
export const timeOf = message => Date.parse(message.date || message.createdAt || '') || 0
export const conversationKey = message => message.conversationId || message.id
export const snippetOf = body => String(body ?? '').replace(/\s+/g, ' ').trim().slice(0, 140)
export const listRecipients = (list, contacts) => array(list?.contactIds)
  .map(contactId => array(contacts).find(contact => contact.id === contactId))
  .filter(contact => emailValid(primaryEmail(contact)))
  .map(contact => ({ name: contactName(contact), email: primaryEmail(contact) }))
export const accountEmails = user => unique([user?.email, ...array(user?.aliases).map(alias => typeof alias === 'string' ? alias : alias?.email)])
export const categories = { all: 'All', primary: 'Priority', offers: 'Offers', social: 'Social', newsletters: 'Newsletters' }
export const views = { attachments: 'Attachments', photos: 'Photos', documents: 'Documents', orders: 'Orders', travel: 'Travel', subscriptions: 'Subscriptions' }
export const sections = { appearance: 'Appearance', inbox: 'Inbox', viewing: 'Viewing email', writing: 'Writing email', filters: 'Filters', privacy: 'Security and privacy', vacation: 'Vacation response' }
export const systemFolders = { inbox: 'Inbox', draft: 'Drafts', sent: 'Sent', archive: 'Archive', spam: 'Spam', trash: 'Trash' }
export const folderName = (folders, folderId) => array(folders).find(folder => folder.id === folderId)?.name || (Object.hasOwn(systemFolders, folderId) ? systemFolders[folderId] : 'Unknown folder')
export const folderExists = (folders, folderId) => Object.hasOwn(systemFolders, folderId) || array(folders).some(folder => folder.id === folderId)
export const allFolders = folders => [
  ...Object.entries(systemFolders).map(([folderId, name]) => ({ id: folderId, name, type: 'system' })),
  ...array(folders).filter(folder => !Object.hasOwn(systemFolders, folder.id)),
]

export function folderTree(folders, query = '') {
  const items = array(folders).filter(folder => !Object.hasOwn(systemFolders, folder.id))
  const byId = new Map(items.map(folder => [folder.id, folder]))
  const children = new Map()
  for (const item of [...items].sort((a, b) => (a.name || '').localeCompare(b.name || '') || (a.order ?? 0) - (b.order ?? 0))) {
    const parent = byId.has(item.parentId) ? item.parentId : null
    if (!children.has(parent)) children.set(parent, [])
    children.get(parent).push(item)
  }
  const included = new Set()
  for (const item of items) {
    if (!lower(item.name).includes(lower(query))) continue
    for (let ancestor = item; ancestor && !included.has(ancestor.id); ancestor = byId.get(ancestor.parentId)) included.add(ancestor.id)
  }
  const rows = []
  const visited = new Set()
  function visit(folder, depth) {
    if (visited.has(folder.id) || !included.has(folder.id)) return
    visited.add(folder.id)
    rows.push({ folder, depth })
    for (const child of children.get(folder.id) || []) visit(child, depth + 1)
  }
  for (const root of children.get(null) || []) visit(root, 0)
  for (const item of items) visit(item, 0)
  return rows
}

export function shortDate(value) {
  const date = new Date(value || '')
  if (Number.isNaN(+date)) return ''
  const now = new Date()
  if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', ...(date.getFullYear() !== now.getFullYear() && { year: 'numeric' }) })
}

export function dateGroup(value) {
  const date = new Date(value || '')
  if (Number.isNaN(+date)) return 'Undated'
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const week = new Date(now)
  week.setDate(now.getDate() - 7)
  if (date.toDateString() === now.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  if (date <= now && date >= week) return 'Last week'
  return date.toLocaleDateString([], { month: 'long', year: 'numeric' })
}

export function uniqueAddresses(addresses, excluded = []) {
  const seen = new Set(excluded.map(lower))
  return addresses.filter(address => {
    const key = lower(address?.email)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}
