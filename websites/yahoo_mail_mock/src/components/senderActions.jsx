import { activity, record, useStore } from '../store.jsx'
import { array, emailValid, id, isReceived, lower } from '../data/model.js'
import { mailChange } from '../data/mailbox.js'
import { useInterface } from './ui.jsx'

export function useSenderActions() {
  const { dispatch } = useStore()
  const { confirm, notify } = useInterface()
  async function block(address, source, messageId) {
    const email = lower(address?.trim())
    if (!emailValid(email)) return 'Enter a valid email address.'
    const done = await dispatch(state => {
      const blocked = array(state.blockedAddresses)
      if (blocked.some(item => lower(item.email) === email)) return state
      const ids = array(state.messages).filter(message => isReceived(message) && lower(message.from?.email) === email).map(message => message.id)
      const moved = mailChange(state, ids, 'delete')
      const after = { id: id('blk'), email, source, createdAt: new Date().toISOString() }
      return record(state, { blockedAddresses: [...blocked, after], ...(moved && { messages: moved.messages }) },
        activity(state, 'sender.block', { email, before: null, after, changes: moved?.changes || [], sourceMessageId: messageId || null }, { messageIds: moved?.messageIds || [], folderIds: moved?.folderIds || [] }))
    })
    if (done) notify('Sender blocked')
    return done ? '' : 'This email address is already blocked.'
  }
  async function unblock(email) {
    if (await dispatch(state => {
      const before = array(state.blockedAddresses).find(item => lower(item.email) === lower(email))
      if (!before) return state
      return record(state, { blockedAddresses: array(state.blockedAddresses).filter(item => item.id !== before.id) },
        activity(state, 'sender.unblock', { before, after: null, email: before.email }))
    })) notify('Sender unblocked')
  }
  function unsubscribe(message) {
    const senderEmail = lower(message.from?.email)
    if (!emailValid(senderEmail)) return
    confirm({ title: 'Unsubscribe', text: 'Stop receiving newsletters from ' + (message.from?.name || senderEmail) + '?', action: 'Unsubscribe', onConfirm: async () => {
      const done = await dispatch(state => {
        const values = array(state.unsubscribes)
        if (values.some(item => lower(item.senderEmail) === senderEmail)) return state
        const after = { id: id('uns'), senderEmail, senderName: message.from?.name || senderEmail, messageId: message.id, createdAt: new Date().toISOString() }
        return record(state, { unsubscribes: [...values, after] }, activity(state, 'sender.unsubscribe', { unsubscribeId: after.id, senderEmail, after }, { messageIds: [message.id] }))
      })
      if (done) notify('Unsubscribed')
    } })
  }
  return { block, unblock, unsubscribe }
}
