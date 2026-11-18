import { createContext, useContext, useRef, useState } from 'react'
import { createInitialData } from '../data/seed'
import { loadState, saveState } from '../utils/dataManager'

const APP = 'moodle'
const Workspace = createContext(null)

export async function bootWorkspace() {
  return loadState(APP, createInitialData)
}

export function WorkspaceProvider({ initial, children }) {
  const snapshot = useRef(initial)
  const [state, setState] = useState(initial)
  const [notice, notify] = useState(null)

  function commit(change) {
    const next = change(snapshot.current, new Date().toISOString())
    if (next === snapshot.current) return false
    snapshot.current = next
    setState(next)
    saveState(APP, next)
    return true
  }

  return <Workspace.Provider value={{ state, commit, notice, notify }}>{children}</Workspace.Provider>
}

export const useWorkspace = () => useContext(Workspace)

function recordId(prefix) {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return prefix + '-' + Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

export function upsert(rows, existing, fields, actorId, timestamp, prefix) {
  const changed = {
    ...existing,
    ...fields,
    id: existing?.id ?? recordId(prefix),
    actorId,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  }
  return {
    changed,
    rows: existing ? rows.map(row => row === existing ? changed : row) : [...rows, changed],
  }
}
