import React, { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager'

const Context = createContext(null)

export function Store({ initial, children }) {
  const [state, setState] = useState(initial)
  const [notice, setNotice] = useState(null)
  const current = useRef(initial)

  function commit(update, message) {
    const previous = current.current
    const next = update(previous, new Date().toISOString())
    if (next === previous) return false
    current.current = next
    setState(next)
    saveState('redfin', next)
    setNotice({ message, id: makeId('notice') })
    return true
  }

  return <Context.Provider value={{ state, commit }}>
    {children}
    <div className="notification-region" role="status" aria-live="polite">
      {notice && <div key={notice.id} className="notification">{notice.message}
        <button type="button" aria-label="Dismiss notification" onClick={() => setNotice(null)}>×</button>
      </div>}
    </div>
  </Context.Provider>
}

export const useStore = () => useContext(Context)
export const owned = (records, buyer) => records.filter(record => record.actorId === buyer)
export const lookup = (records, id) => id ? records.find(record => record.id === id) : undefined
export const replace = (records, row) => records.map(record => record.id === row.id ? row : record)
export function makeId(kind) {
  // randomUUID may be unavailable when the offline host uses plain HTTP.
  const suffix = crypto.randomUUID?.() || Array.from(crypto.getRandomValues(new Uint8Array(16)),
    byte => byte.toString(16).padStart(2, '0')).join('')
  return kind + '-' + suffix
}
export const timeValue = value => {
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY
}
export const sortNewest = field => (a, b) => timeValue(b[field]) - timeValue(a[field]) || String(a.id).localeCompare(String(b.id))
export const activeTour = (row, now = new Date()) => ['requested', 'confirmed'].includes(row.status) && new Date(row.scheduledAt) > now
export const activeOffer = row => ['draft', 'submitted'].includes(row.status)

export function unread(thread, state) {
  const lastRead = timeValue(thread.lastReadAt)
  return state.messages.some(message => message.threadId === thread.id && message.recipientId === state.account.id &&
    message.senderId !== state.account.id && timeValue(message.createdAt) > lastRead)
}

export function useReadThread() {
  const { commit } = useStore()
  return (threadId, event) => {
    if (event && (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.button !== 0)) return
    commit((world, now) => {
      const thread = lookup(owned(world.messageThreads, world.account.id), threadId)
      if (!thread || !unread(thread, world)) return world
      return { ...world, messageThreads: replace(world.messageThreads, { ...thread, lastReadAt: now, readById: world.account.id }) }
    }, 'Conversation marked as read.')
  }
}
