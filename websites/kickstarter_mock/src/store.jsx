import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createInitialData } from './data/seed'
import { loadState, saveState } from './utils/dataManager'
import { Empty } from './ui'

const APP = 'kickstarter_mock'
const Store = createContext(null)

export function StoreProvider({ children, sid }) {
  return <SessionStore key={sid}>{children}</SessionStore>
}

function SessionStore({ children }) {
  const [state, setState] = useState(null)
  const current = useRef(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    loadState(APP, createInitialData).then(
      data => {
        if (!active) return
        current.current = data
        setState(data)
      },
      () => { if (active) setFailed(true) },
    )
    return () => { active = false }
  }, [])

  function mutate(makeNext) {
    const next = makeNext(current.current)
    if (!next || next === current.current) return false
    saveState(APP, next)
    current.current = next
    setState(next)
    return true
  }

  if (failed) return <main className="container"><Empty title="Creator Studio could not load"><button className="button secondary" onClick={() => window.location.reload()}>Reload</button></Empty></main>
  if (!state) return <main className="container" role="status">Loading Creator Studio…</main>
  return <Store.Provider value={{ state, mutate }}>{children}</Store.Provider>
}

export const useStore = () => useContext(Store)

export function timestamp(account) {
  return { updatedBy: account.id, updatedAt: new Date().toISOString() }
}

export function creation(account, kind) {
  const stamp = timestamp(account)
  return { id: newId(kind), createdBy: stamp.updatedBy, createdAt: stamp.updatedAt, ...stamp }
}

export function newId(kind) {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16))
  return kind + '-' + Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

export function put(state, key, record) {
  const entries = Array.isArray(state[key]) ? state[key] : []
  const updated = entries.some(entry => entry?.id === record.id)
    ? entries.map(entry => entry?.id === record.id ? record : entry)
    : [...entries, record]
  return { ...state, [key]: updated }
}

