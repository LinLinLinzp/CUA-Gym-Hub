import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createInitialData } from './data/seed.js'
import { loadWorkspace, saveWorkspace } from './utils/stateSync.js'

const Workspace = createContext(null)

export function WorkspaceProvider({ children }) {
  const current = useRef(null)
  const [state, setState] = useState(null)
  const [notice, setNotice] = useState('')
  const [loadError, setLoadError] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const inFlight = useRef(false)

  useEffect(() => {
    loadWorkspace(createInitialData).then((data) => {
      current.current = data
      setState(data)
    }).catch(() => setLoadError(true))
  }, [])

  async function commit(change, message) {
    if (inFlight.current) return false
    const state = current.current
    const stamp = { updatedAt: new Date().toISOString(), updatedBy: state.account.currentUserId }
    const result = change(state, stamp)
    if (!result) return null
    const activity = result.events.map(([type, targetId, details]) => ({
      id: makeId('activity'), type, targetId, details, targetType: type.split('.')[0],
      actorId: stamp.updatedBy, createdAt: stamp.updatedAt,
    }))
    const next = { ...state, ...result.patch, activity: [...state.activity, ...activity] }
    inFlight.current = true
    setSaving(true)
    setNotice('')
    setSaveError('')
    try {
      await saveWorkspace(next)
      current.current = next
      setState(next)
      setNotice(message)
      return true
    } catch {
      setSaveError('The workspace could not save your change. Try again.')
      return false
    } finally {
      inFlight.current = false
      setSaving(false)
    }
  }

  return <Workspace.Provider value={{ state, commit, notice, setNotice, loadError, saving, saveError }}>{children}</Workspace.Provider>
}

export const useWorkspace = () => useContext(Workspace)
export const makeId = (prefix) => `${prefix}_${crypto.randomUUID()}`
