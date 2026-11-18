import { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager'

const Store = createContext(null)
const Feedback = createContext(null)

export const APP = 'soundcloud'
export const records = (value) => Array.isArray(value) ? value.filter((record) => record?.id) : []
export const titleOf = (record, fallback = 'Untitled') => record?.title || fallback
export const nameOf = (users, id) => users.find((user) => user.id === id)?.displayName || 'Unknown artist'
export const active = (comment) => comment.status !== 'deleted'
export const newest = (a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
export const clockTime = (seconds) => Number.isFinite(seconds)
  ? Math.floor(seconds / 60) + ':' + String(Math.floor(seconds) % 60).padStart(2, '0') : '—'
export const formatDate = (date) => {
  const value = new Date(date)
  return Number.isFinite(value.getTime())
    ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(value)
    : '—'
}
export const newId = (prefix) => prefix + '-' + crypto.randomUUID()
export const now = () => new Date().toISOString()
export const updateRecord = (items, id, fields) => records(items).map((item) => item.id === id ? { ...item, ...fields } : item)

export function StoreProvider({ initial, children }) {
  const [state, setState] = useState(initial)
  const latest = useRef(initial)
  const userId = state.account?.userId
  const users = records(state.users)
  const tracks = records(state.tracks)
  const ownedTracks = tracks.filter((track) => track.ownerId === userId)

  function commit(change) {
    const next = change(latest.current)
    latest.current = next
    saveState(APP, next)
    setState(next)
  }

  return <Store.Provider value={{
    state, userId, users, tracks, ownedTracks, commit,
    playlists: records(state.playlists), comments: records(state.comments),
    artistName: users.find((user) => user.id === userId)?.displayName || 'Creator',
  }}>{children}</Store.Provider>
}

export function FeedbackProvider({ children }) {
  const [message, setMessage] = useState('')
  return <Feedback.Provider value={setMessage}>
    {children}
    <div className={message ? 'toast' : 'sr-only'} role="status">
      {message}
      {message && <button type="button" aria-label="Dismiss message" onClick={() => setMessage('')}>×</button>}
    </div>
  </Feedback.Provider>
}

export const useStore = () => useContext(Store)
export const useFeedback = () => useContext(Feedback)
