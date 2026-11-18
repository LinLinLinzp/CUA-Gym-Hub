import { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager'

const Workspace = createContext(null)

export function WorkspaceProvider({ initialState, children }) {
  const currentState = useRef(initialState)
  const [state, setState] = useState(initialState)
  const [notice, setNotice] = useState(null)

  function commit(action, message, change) {
    const current = currentState.current
    const createdAt = new Date().toISOString()
    const actorId = current.operator.id
    const projectId = current.project.id
    const result = change(current, { createdAt, actorId, projectId })
    const event = {
      id: newId('activity'), projectId, actorId, createdAt, action,
      targetId: result.targetId, details: result.details,
    }
    const next = { ...current, ...result.patch, activity: [...current.activity, event] }
    saveState('firebase', next)
    currentState.current = next
    setState(next)
    setNotice({ message, id: event.id })
  }

  return <Workspace.Provider value={{ state, commit, notice, dismissNotice: () => setNotice(null) }}>{children}</Workspace.Provider>
}

export const useWorkspace = () => useContext(Workspace)
export const randomToken = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('')
export const newId = (prefix) => `${prefix}_${randomToken()}`
export const searchText = (value) => String(value ?? '').toLowerCase()
export const newestFirst = (a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')

const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' })
const timeFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })
export function formatDate(value, includeTime = false) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : (includeTime ? timeFormat : dateFormat).format(date)
}
