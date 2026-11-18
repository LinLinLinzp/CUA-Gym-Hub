import { accountEmails, addressText, array, displayAddress, emailValid, folderExists, id, isDraft, lower, snippetOf, subjectOf, uniqueAddresses } from './model.js'
import { attachmentBytes, attachmentLimit } from './filesAccess.js'

export function initDraft(state, values = {}) {
  const user = state.currentUser
  const writing = state.settings?.writing
  const email = accountEmails(user).find(item => lower(item) === lower(writing?.defaultFrom)) || user?.email || ''
  const body = writing?.signature?.enabled && writing.signature.text ? '\n\n' + writing.signature.text : ''
  const now = new Date().toISOString()
  return {
    id: id('msg'), conversationId: id('cnv'), folderId: 'draft', status: 'draft', isDraft: true, isRead: true,
    category: 'primary', from: { name: user?.name || '', email },
    to: [], cc: [], bcc: [], subject: '', body, bodyHtml: null, snippet: snippetOf(body),
    attachments: [], date: now, createdAt: now, updatedAt: now, ...values,
  }
}

export function replyFields(state, original, type) {
  const mine = accountEmails(state.currentUser)
  const sender = original.replyTo?.email ? original.replyTo : original.from
  const mineFrom = mine.map(lower).includes(lower(sender?.email))
  if (type === 'forward') return {
    quotedText: quoteText(original, type), forwardedFromId: original.id, replyType: type, subject: 'Fwd: ' + subjectOf(original).replace(/^(?:(?:fwd?|fw):\s*)+/i, ''),
    attachments: array(original.attachments).map(file => ({ ...file, id: id('att'), source: 'forward', sourceMessageId: original.id, sourceAttachmentId: file.id })),
  }
  const visibleTo = uniqueAddresses(array(original.to), mine)
  const fallback = visibleTo[0] || uniqueAddresses(array(original.cc), mine)[0]
  const to = type === 'replyAll'
    ? uniqueAddresses([sender, ...visibleTo], mine)
    : uniqueAddresses([mineFrom ? fallback : sender], mine)
  const cc = type === 'replyAll' ? uniqueAddresses(array(original.cc), [...mine, ...to.map(address => address.email)]) : []
  return {
    quotedText: quoteText(original, type), inReplyToId: original.id, replyType: type, conversationId: original.conversationId || original.id,
    subject: 'Re: ' + subjectOf(original).replace(/^(?:re:\s*)+/i, ''), to, cc,
  }
}

export const ruleFields = { from: 'From', toCc: 'To/Cc', subject: 'Subject', body: 'Body' }
export const operators = ['contains', 'does not contain', 'begins with', 'ends with']

export function filterMatches(filter, message) {
  const text = {
    from: addressText(message.from),
    toCc: [...array(message.to), ...array(message.cc)].map(addressText).join(' '),
    subject: message.subject || '', body: message.body || '',
  }
  const populated = Object.entries(ruleFields).map(([field]) => [field, filter.rules?.[field]]).filter(([, rule]) => rule?.value?.trim())
  return populated.length > 0 && populated.every(([field, rule]) => {
    const source = rule.matchCase ? text[field] : lower(text[field])
    const target = rule.matchCase ? rule.value : lower(rule.value)
    switch (rule.operator) {
      case 'does not contain': return !source.includes(target)
      case 'begins with': return source.startsWith(target)
      case 'ends with': return source.endsWith(target)
      case 'contains': return source.includes(target)
      default: return false
    }
  })
}

export function hasPendingRecipients(draft) {
  return Object.values(draft?.recipientInput || {}).some(value => typeof value === 'string' ? Boolean(value.trim()) : Boolean(value))
}

export function prepareSend(state, draft) {
  if (!isDraft(draft) || attachmentBytes(draft.attachments) > attachmentLimit) return null
  const addresses = [...array(draft.to), ...array(draft.cc), ...array(draft.bcc)]
  if (!addresses.length || !addresses.every(address => emailValid(address?.email)) || hasPendingRecipients(draft)) return null
  const now = new Date().toISOString()
  const originalId = draft.inReplyToId || draft.forwardedFromId || null
  const { recipientInput, ...content } = draft
  const sent = { ...content, folderId: 'sent', status: 'sent', isDraft: false, isRead: true, sentAt: now, date: now, updatedAt: now }
  const type = { reply: 'message.reply', replyAll: 'message.reply_all', forward: 'message.forward' }[draft.replyType] || 'message.send'
  const mine = accountEmails(state.currentUser).map(lower)
  let incoming = null
  let filter = null
  if (addresses.some(address => mine.includes(lower(address.email)))) {
    incoming = {
      ...sent, id: id('msg'), receivedCopyOfId: sent.id, folderId: 'inbox', status: 'received',
      appliedFilterId: null, bcc: [], isRead: false, isStarred: false, sentAt: null, createdAt: now,
      attachments: array(sent.attachments).map(file => ({ ...file, id: id('att') })),
    }
    filter = array(state.filters).find(rule => filterMatches(rule, incoming))
    if (filter) {
      incoming.appliedFilterId = filter.id
      if (filter.action?.folderId !== 'draft' && folderExists(state.folders, filter.action?.folderId)) incoming.folderId = filter.action.folderId
    }
  }
  const messages = array(state.messages).map(message => {
    if (message.id === draft.id) return sent
    if (originalId && message.id === originalId) return { ...message, [draft.replyType === 'forward' ? 'forwardedAt' : 'repliedAt']: now, updatedAt: now }
    return message
  })
  if (incoming) messages.push(incoming)
  const details = {
    to: array(sent.to), cc: array(sent.cc), bcc: array(sent.bcc), subject: sent.subject || '',
    attachmentIds: array(sent.attachments).map(file => file.id), originalMessageId: originalId,
    incomingCopyIds: incoming ? [incoming.id] : [],
  }
  return { messages, sent, incoming, filter, type, details }
}

export function quoteText(original, type) {
  const sender = displayAddress(original.from)
  return type === 'forward'
    ? ['---------- Forwarded message ----------', 'From: ' + addressText(original.from), 'Date: ' + (original.date || ''), 'Subject: ' + subjectOf(original), 'To: ' + array(original.to).map(addressText).join(', '), '', original.body || ''].join('\n')
    : 'On ' + (original.date ? new Date(original.date).toLocaleDateString() : 'an earlier date') + ', ' + sender + ' wrote:\n' + (original.body || '')
}
