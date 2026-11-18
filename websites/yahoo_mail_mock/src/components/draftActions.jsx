import { activity, record, useStore } from '../store.jsx'
import { array, isDraft } from '../data/model.js'
import { initDraft, replyFields } from '../data/drafts.js'

export function useDraftActions() {
  const { dispatch, dispatchChange } = useStore()

  async function save(draftId, patch, attachedEvents = []) {
    let saved = null
    const done = await dispatch(state => {
      const messages = array(state.messages)
      const before = draftId ? messages.find(message => message.id === draftId && isDraft(message)) : null
      if (draftId && !before) return state
      const values = (typeof patch === 'function' ? patch(before) : patch) || {}
      const changedFields = Object.keys(values).filter(key => JSON.stringify(before?.[key]) !== JSON.stringify(values[key]))
      if (!changedFields.length) return state
      saved = before ? { ...before, ...values, folderId: 'draft', status: 'draft', isDraft: true, updatedAt: new Date().toISOString() } : initDraft(state, values)
      if (before) for (const key of ['folderId', 'status', 'isDraft']) {
        if (before[key] !== saved[key]) changedFields.push(key)
      }
      const links = { messageIds: [saved.id] }
      const events = attachedEvents.map(({ type, details }) => activity(state, type, details, links))
      return record(state, { messages: before ? messages.map(message => message.id === saved.id ? saved : message) : [...messages, saved] },
        activity(state, 'draft.save', { changedFields, isNew: !before }, links), ...events)
    })
    return done ? saved : null
  }

  async function startReply(original, type) {
    let draft
    const done = await dispatch(state => {
      const fields = replyFields(state, original, type)
      draft = initDraft(state, fields)
      return record(state, { messages: [...array(state.messages), draft] },
        activity(state, 'draft.save', { changedFields: Object.keys(fields), isNew: true, originalMessageId: original.id }, { messageIds: [draft.id] }))
    })
    return done ? draft : null
  }

  function discard(draftIds) {
    return dispatchChange({ type: 'discard', ids: draftIds }, draftIds.length === 1 ? 'Discard draft' : 'Discard drafts')
  }

  function send(draft, allowEmptySubject) {
    return dispatchChange({ type: 'send', draftId: draft.id, updatedAt: draft.updatedAt, allowEmptySubject }, 'Send message')
  }

  return { save, startReply, discard, send }
}
