import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createInitialData } from './data/seed'
import { idFor } from './model'
import { loadState, saveState } from './utils/dataManager'

const APP = 'sharepoint'
const WorkspaceContext = createContext(null)

export const useWorkspace = () => useContext(WorkspaceContext)

export function Workspace({ children }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)
  const [notice, setNotice] = useState(null)
  const current = useRef(null)
  const announcement = useRef(0)

  useEffect(() => {
    let active = true
    loadState(APP, createInitialData).then((loaded) => {
      if (!active) return
      current.current = loaded
      setData(loaded)
    }).catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 5000)
    return () => clearTimeout(timer)
  }, [notice])

  if (error) return <div className="boot">SharePoint could not load. <button onClick={() => window.location.reload()}>Reload</button></div>
  if (!data) return <div className="boot" role="status">Loading workspace…</div>

  const actor = data.users.find((user) => user.id === data.account.userId)
  const notify = (message) => setNotice({ id: ++announcement.current, message })

  function commit(change, message) {
    const previous = current.current
    const actorId = previous.account.userId
    const now = new Date().toISOString()
    const modified = { updatedBy: actorId, updatedAt: now }
    const created = { createdBy: actorId, createdAt: now, ...modified }
    const removal = (kind, scopeId, recordIds) => ({
      id: idFor('removal'), kind, scopeId, recordIds, createdBy: actorId, createdAt: now,
    })
    const next = change(previous, { actorId, now, modified, created, removal })
    if (next === previous) return
    saveState(APP, next)
    current.current = next
    setData(next)
    if (message) notify(message)
  }

  return <WorkspaceContext.Provider value={{
    data, commit, notify, notice,
    actorName: actor?.displayName || 'Workspace member',
  }}>{children}</WorkspaceContext.Provider>
}
