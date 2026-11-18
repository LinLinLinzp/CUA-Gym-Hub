import { activity, record } from './activity.js'
import { prepareSend } from './drafts.js'
import { undoMail } from './mailbox.js'
import { array, isDraft, unique } from './model.js'

export function applyMailboxChange(state, change) {
  switch (change.type) {
    case 'send': {
      const draft = array(state.messages).find(message => message.id === change.draftId)
      if (!draft || draft.updatedAt !== change.updatedAt || (!draft.subject?.trim() && !change.allowEmptySubject)) return state
      const result = prepareSend(state, draft)
      if (!result) return state
      const { messages, sent, incoming, filter, type, details } = result
      const events = [activity(state, type, details, { messageIds: [sent.id], folderIds: ['sent'] })]
      if (incoming && filter) events.push(activity(state, 'filter.apply', {
        sentMessageId: sent.id, fromFolderId: 'inbox', toFolderId: incoming.folderId,
      }, { messageIds: [incoming.id], filterIds: [filter.id], folderIds: [incoming.folderId] }))
      return record(state, { messages }, ...events)
    }
    case 'discard': {
      const ids = new Set(change.ids)
      const messages = array(state.messages)
      const removed = messages.filter(message => ids.has(message.id) && isDraft(message))
      if (!removed.length) return state
      return record(state, { messages: messages.filter(message => !ids.has(message.id) || !isDraft(message)) }, ...removed.map(before =>
        activity(state, 'draft.discard', { before, after: null }, { messageIds: [before.id] })))
    }
    case 'deleteMessages': {
      const { folderId } = change
      const selected = new Set(change.ids)
      const messages = array(state.messages)
      const removed = messages.filter(message => selected.has(message.id) && !isDraft(message) && message.folderId === (folderId || 'trash'))
      if (!removed.length) return state
      const removedIds = new Set(removed.map(message => message.id))
      const deletedMessages = removed.map(({ id, subject, folderId, conversationId }) => ({ id, subject: subject || '', folderId, conversationId: conversationId || null }))
      return record(state, { messages: messages.filter(message => !removedIds.has(message.id)) },
        activity(state, folderId ? 'folder.empty' : 'message.delete_forever', { deletedMessages, subjects: deletedMessages.map(item => item.subject) }, { messageIds: [...removedIds], folderIds: unique(removed.map(message => message.folderId)) }))
    }
    case 'deleteFilter': {
      const filters = array(state.filters)
      const before = filters.find(filter => filter.id === change.filterId)
      if (!before) return state
      return record(state, { filters: filters.filter(filter => filter !== before) }, activity(state, 'filter.delete', { before, after: null }, { filterIds: [before.id] }))
    }
    case 'undo': {
      const undone = undoMail(state, change.inverses)
      if (!undone.messageIds.length) return state
      return record(state, { messages: undone.messages }, activity(state, 'message.undo', { undoneActivityId: change.activityId }, { messageIds: undone.messageIds, folderIds: change.folderIds }))
    }
    default:
      return state
  }
}
