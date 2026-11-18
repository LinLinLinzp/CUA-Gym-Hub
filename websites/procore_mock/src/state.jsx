import { createContext, useContext, useRef, useState } from 'react'
import { items, makeId } from './domain'
import { saveState } from './utils/dataManager'

const WorkspaceContext = createContext(null)

export function WorkspaceProvider({ initialState, children }) {
  const [state, setState] = useState(initialState)
  const current = useRef(initialState)
  const [notice, setNotice] = useState(null)

  function commit({ projectId, entityType, action, message }, update) {
    const previous = current.current
    const now = new Date().toISOString()
    const actor = previous.account?.currentUserId ?? null
    const created = { createdAt: now, createdById: actor }
    const updated = { updatedAt: now, updatedById: actor }
    const change = update(previous, { now, actor, created, updated })
    if (!change) return false
    const { patch, entityId, ...links } = change
    const event = { id: makeId(), projectId, entityType, entityId, action, ...created, ...links }
    const next = { ...previous, ...patch, activity: [...items(previous.activity), event] }
    current.current = next
    setState(next)
    saveState('procore', next)
    setNotice({ message, id: event.id })
    return true
  }

  return <WorkspaceContext.Provider value={{ state, commit }}>
    {children}
    <div className="toast-slot" aria-live="polite">
      {notice && <div className="toast" key={notice.id}>
        <span>{notice.message}</span>
        <button type="button" className="icon-button" aria-label="Dismiss notification" onClick={() => setNotice(null)}>×</button>
      </div>}
    </div>
  </WorkspaceContext.Provider>
}

export const useWorkspace = () => useContext(WorkspaceContext)

