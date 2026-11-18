import { addressText, array, conversationKey, folderExists, isDraft, isReceived, lower, timeOf, unique, visibleMail } from './model.js'

export const sortOptions = { date_desc: 'Newest first', date_asc: 'Oldest first', unread: 'Unread first', starred: 'Starred first', sender: 'Sender' }

function searchMatches(message, criteria) {
  const sender = addressText(message.from)
  const recipients = [...array(message.to), ...array(message.cc), ...array(message.bcc)].map(addressText).join(' ')
  const keyword = [sender, recipients, message.subject, message.body, ...array(message.attachments).map(file => file.name)].join(' ')
  const checks = { q: keyword, from: sender, to: recipients, subject: message.subject }
  if (Object.entries(checks).some(([name, value]) => !lower(value).includes(lower(criteria.get(name))))) return false
  const folder = criteria.get('folder')
  if (folder && folder !== '*' && message.folderId !== folder) return false
  if (!folder && (!visibleMail(message) || isDraft(message))) return false
  const after = criteria.get('after')
  const before = criteria.get('before')
  const date = timeOf(message)
  return (!criteria.has('attachment') || array(message.attachments).length > 0)
    && (!after || date >= +new Date(after + 'T00:00:00'))
    && (!before || date <= +new Date(before + 'T23:59:59.999'))
}

export function mailboxLocation(path) {
  const url = new URL(path, 'http://mail.local')
  const [, , route, segment = ''] = url.pathname.split('/')
  let parameter = null
  try { parameter = decodeURIComponent(segment) } catch { /* Invalid URL segment. */ }
  return { route, parameter, criteria: url.searchParams }
}

export function mailScope(state, { route, parameter, criteria }) {
  return array(state.messages).filter(message => {
    if (route === 'inbox') return message.folderId === 'inbox' && !isDraft(message) && (parameter === 'all' || state.settings?.inbox?.categoriesEnabled === false || message.category === parameter)
    if (route === 'folders') return parameter === 'draft' ? isDraft(message) : !isDraft(message) && message.folderId === parameter
    if (route === 'starred') return message.isStarred && !isDraft(message) && visibleMail(message)
    if (route === 'unread') return isReceived(message) && visibleMail(message) && !message.isRead
    if (route === 'search') return searchMatches(message, criteria)
    return true
  })
}

export function sortedMail(messages, sort) {
  return [...messages].sort((a, b) => {
    const date = timeOf(b) - timeOf(a)
    const tie = String(a.id).localeCompare(String(b.id))
    if (sort === 'date_asc') return -date || tie
    if (sort === 'unread') return Number(Boolean(a.isRead)) - Number(Boolean(b.isRead)) || date || tie
    if (sort === 'starred') return Number(Boolean(b.isStarred)) - Number(Boolean(a.isStarred)) || date || tie
    if (sort === 'sender') return lower(addressText(a.from)).localeCompare(lower(addressText(b.from))) || date || tie
    return date || tie
  })
}

export function mailboxRows(state, messages) {
  const groups = new Map()
  for (const message of sortedMail(messages, state.settings?.inbox?.sort)) {
    const key = state.settings?.viewing?.conversations === false || isDraft(message) ? message.id : conversationKey(message)
    const group = groups.get(key)
    if (group) group.ids.push(message.id)
    else groups.set(key, { message, ids: [message.id] })
  }
  return [...groups.values()]
}

export function readGroup(state, message) {
  if (state.settings?.viewing?.conversations === false) return [message]
  return sortedMail(array(state.messages).filter(item => conversationKey(item) === conversationKey(message) &&
    (item.id === message.id || !isDraft(item) && (visibleMail(item) || item.folderId === message.folderId))), 'date_asc')
}

export function mailChange(state, ids, action, target) {
  const flag = { read: ['isRead', true], unread: ['isRead', false], star: ['isStarred', true], unstar: ['isStarred', false] }[action]
  const nextFolder = { archive: 'archive', delete: 'trash', spam: 'spam', move: target }[action]
  if (action === 'move' && (target === 'draft' || !folderExists(state.folders, target))) return null
  const restoring = action === 'restore' || action === 'not_spam'
  const now = new Date().toISOString()
  const inverses = []
  const changes = []
  const selected = new Set(ids)
  const messages = array(state.messages).map(message => {
    if (!selected.has(message.id) || isDraft(message)) return message
    let before
    let after
    if (flag) {
      const [field, value] = flag
      if (Boolean(message[field]) === value) return message
      changes.push({ messageId: message.id, field, before: Boolean(message[field]), after: value })
      before = { [field]: message[field] }
      after = { [field]: value }
    } else {
      if (action === 'restore' && !['trash', 'archive'].includes(message.folderId) || action === 'not_spam' && message.folderId !== 'spam') return message
      const prior = message.previousFolderId
      const validPrior = prior && prior !== 'draft' && prior !== message.folderId && folderExists(state.folders, prior)
      const destination = restoring ? (message.folderId !== 'archive' && validPrior ? prior : 'inbox') : nextFolder
      if (!destination || destination === message.folderId) return message
      before = { folderId: message.folderId, previousFolderId: prior, movedAt: message.movedAt }
      after = { folderId: destination, previousFolderId: restoring ? null : message.folderId, movedAt: now }
      changes.push({ messageId: message.id, fromFolderId: message.folderId ?? null, toFolderId: destination, previousFolderIdBefore: prior ?? null })
    }
    inverses.push({ id: message.id, before, after })
    return { ...message, ...after, updatedAt: now }
  })
  if (!changes.length) return null
  return { messages, inverses, changes, messageIds: changes.map(change => change.messageId), folderIds: unique(changes.flatMap(change => [change.fromFolderId, change.toFolderId])) }
}

export function undoMail(state, inverses) {
  const snapshots = new Map(inverses.map(item => [item.id, item]))
  const messageIds = []
  const now = new Date().toISOString()
  const messages = array(state.messages).map(message => {
    const item = snapshots.get(message.id)
    if (!item || !Object.entries(item.after).every(([field, value]) => message[field] === value)) return message
    const updated = { ...message, updatedAt: now }
    for (const field of Object.keys(item.after)) {
      const value = item.before[field]
      if (value === undefined) delete updated[field]
      else updated[field] = value
    }
    messageIds.push(message.id)
    return updated
  })
  return { messages, messageIds }
}
