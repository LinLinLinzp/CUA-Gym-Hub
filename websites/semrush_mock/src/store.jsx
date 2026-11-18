import { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager.js'
import { list } from './model.js'

export const APP = 'semrush'
const Workspace = createContext(null)
export const useWorkspace = () => useContext(Workspace)

function recordUuid() {
  if (crypto.randomUUID) return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-')
}

export function WorkspaceProvider({ initial, children }) {
  const [state, setState] = useState(initial)
  const current = useRef(initial)
  const [toast, setToast] = useState('')
  const account = { id: 'user-maya', name: 'Maya Chen', workspaceName: 'Search Operations', ...state.account }

  function commit(build, message) {
    const previous = current.current
    const actorId = previous.account?.id || 'user-maya'
    const createdAt = new Date().toISOString()
    const make = (prefix) => ({ id: prefix + '-' + recordUuid(), createdAt, createdBy: actorId })
    const edit = { updatedAt: createdAt, updatedBy: actorId }
    const result = build(previous, { make, edit, actorId, createdAt })
    if (!result) return false
    const { changes, event } = result
    const next = {
      ...previous,
      ...changes,
      activity: [...list(previous.activity), { id: make('act').id, actorId, createdAt, ...event }],
    }
    current.current = next
    setState(next)
    saveState(APP, next)
    setToast(message)
    return true
  }

  return <Workspace.Provider value={{ state, account, commit }}>
    {children}
    {toast && <div className="toast" role="status">{toast}<button type="button" aria-label="Dismiss notification" onClick={() => setToast('')}>×</button></div>}
  </Workspace.Provider>
}

