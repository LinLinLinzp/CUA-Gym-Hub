import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createInitialData } from './data/seed.js'
import { loadState, saveState } from './utils/dataManager.js'

const app = 'okta_mock'
const WorkspaceContext = createContext(null)
let boot

export function Store({ children }) {
  const current = useRef(null)
  const [state, setState] = useState(null)
  const [notice, setNotice] = useState('')
  const noticeTimer = useRef(null)

  useEffect(() => {
    boot ??= loadState(app, createInitialData)
    let mounted = true
    boot.then(data => {
      if (mounted) {
        current.current = data
        setState(data)
      }
    })
    return () => {
      mounted = false
      clearTimeout(noticeTimer.current)
    }
  }, [])

  function announce(message) {
    clearTimeout(noticeTimer.current)
    setNotice(message)
    noticeTimer.current = setTimeout(() => setNotice(''), 4200)
  }

  function commit(change, message) {
    const snapshot = current.current
    const time = new Date().toISOString()
    const actor = snapshot.workspace?.admin?.id || 'admin-001'
    const created = { createdAt: time, createdBy: actor }
    const updated = { updatedAt: time, updatedBy: actor }
    const id = prefix => prefix + '-' + crypto.randomUUID()
    const events = []
    const event = (action, targetType, targetId, details = {}) => {
      events.push({ id: id('evt'), action, targetType, targetId, actorId: actor, createdAt: time, details })
    }
    const patch = change(snapshot, { id, created, updated, event })
    if (!patch) return false
    const next = { ...snapshot, ...patch, activityEvents: [...snapshot.activityEvents, ...events] }
    current.current = next
    saveState(app, next)
    setState(next)
    if (message) announce(message)
    return true
  }

  if (!state) return <main className="boot" role="status">Loading workspace…</main>
  return <WorkspaceContext.Provider value={{ state, commit, notice }}>{children}</WorkspaceContext.Provider>
}

export const useWorkspace = () => useContext(WorkspaceContext)
