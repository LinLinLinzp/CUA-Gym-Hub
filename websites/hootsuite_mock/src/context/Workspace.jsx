import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { loadState, saveState } from '../utils/dataManager.js'
import { createInitialData } from '../data/seed.js'
import { findRecord } from '../utils/records.js'

const Workspace = createContext(null)
const app = 'hootsuite'

export function WorkspaceProvider({ children }) {
  const [state, setState] = useState(null)
  const current = useRef(null)

  useEffect(() => {
    loadState(app, createInitialData).then((loaded) => {
      current.current = loaded
      setState(loaded)
    })
  }, [])

  function commit(update) {
    const previous = current.current
    const actor = findRecord(previous.users, previous.workspace?.currentUserId)
    if (!actor) return 'The signed-in team member is unavailable.'
    const next = update(previous, { actorId: actor.id, now: new Date().toISOString() })
    if (typeof next === 'string') return next
    current.current = next
    saveState(app, next)
    setState(next)
    return ''
  }

  if (!state) return <main className="loading" role="status">Loading workspace…</main>
  const actor = findRecord(state.users, state.workspace?.currentUserId)
  return <Workspace.Provider value={{ state, actor, commit }}>{children}</Workspace.Provider>
}

export function useWorkspace() {
  return useContext(Workspace)
}
