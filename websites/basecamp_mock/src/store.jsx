import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { createInitialData } from './data/seed.js'
import { getSessionId, loadState, mergeWithDefaults, saveState } from './utils/dataManager.js'
import { applyMutation } from './utils/mutations.js'
import { pendingStatePost } from './utils/stateTransport.js'

const APP = 'basecamp'
const StoreContext = createContext(null)
const ProjectContext = createContext(null)
export const useStore = () => useContext(StoreContext)
export const useProject = () => useContext(ProjectContext)
export const ProjectProvider = ProjectContext.Provider

export function SessionStore({ children }) {
  const { search } = useLocation()
  const sid = new URLSearchParams(search).get('sid') || getSessionId()
  return <Store key={sid} sid={sid}>{children}</Store>
}

function withStateLock(work) {
  // Vite scopes state by SID, while Harbor scopes it to this site's origin.
  return navigator.locks ? navigator.locks.request(APP + ':state', work) : work()
}

function Store({ sid, children }) {
  const suffix = sid || '_default'
  const query = sid ? '?sid=' + encodeURIComponent(sid) : ''
  const loadedKey = `${APP}:loaded:${suffix}`
  const currentKey = `${APP}:current:${suffix}`
  const pendingKey = `${APP}:pending:${suffix}`
  const [state, setState] = useState(null)
  const [failed, setFailed] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const current = useRef(null)
  const acknowledged = useRef(null)
  const pending = useRef([])
  const sending = useRef(false)
  const mounted = useRef(false)

  async function readState() {
    const response = await fetch('/state' + query, { cache: 'no-store' })
    if (!response.ok) throw new Error('Could not read current state')
    const data = await response.json()
    return mergeWithDefaults(createInitialData(), data.has_custom_state ? data.stored_state : null)
  }

  function cacheAcknowledged(snapshot) {
    acknowledged.current = snapshot
    localStorage.setItem(currentKey, JSON.stringify(snapshot))
  }

  function showPending() {
    current.current = pending.current.reduce(applyMutation, acknowledged.current)
    setState(current.current)
  }

  function persistPending() {
    if (pending.current.length) sessionStorage.setItem(pendingKey, JSON.stringify(pending.current))
    else sessionStorage.removeItem(pendingKey)
  }

  useEffect(() => {
    mounted.current = true
    const ready = withStateLock(async () => {
      if (!mounted.current || getSessionId() !== sid) return
      const cached = localStorage.getItem(loadedKey) && localStorage.getItem(currentKey)
      let loaded = await loadState(APP, createInitialData)
      const baseline = pendingStatePost('/post' + query)
      if (!cached && baseline) {
        // The template marks its cache loaded before the baseline POST resolves.
        localStorage.removeItem(loadedKey)
        await baseline
        localStorage.setItem(loadedKey, '1')
      }
      if (cached) loaded = await readState()
      if (!mounted.current) return
      cacheAcknowledged(loaded)
      pending.current = JSON.parse(sessionStorage.getItem(pendingKey) || '[]')
      showPending()
      setSaveFailed(pending.current.length > 0)
    })
    ready.catch(() => { if (mounted.current) setFailed(true) })
    return () => { mounted.current = false }
  }, [])

  async function flushPending() {
    if (sending.current) return
    sending.current = true
    setSaveFailed(false)
    try {
      while (pending.current.length && mounted.current) {
        const saved = await withStateLock(async () => {
          if (!mounted.current) return false
          const latest = await readState()
          if (!mounted.current || getSessionId() !== sid) return false
          cacheAcknowledged(latest)
          const next = applyMutation(latest, pending.current[0])
          if (next !== latest) {
            saveState(APP, next)
            // The template caches optimistically. Leave only acknowledged data in its cache.
            localStorage.setItem(currentKey, JSON.stringify(latest))
            await pendingStatePost('/post' + query)
            cacheAcknowledged(next)
          }
          pending.current.shift()
          persistPending()
          return true
        })
        if (!saved) return
        if (mounted.current) showPending()
      }
    } catch {
      if (mounted.current) {
        showPending()
        setSaveFailed(true)
      }
    } finally {
      sending.current = false
    }
  }

  function commit(type, fields) {
    const previous = current.current
    const stamp = { updatedById: String(previous.workspace?.currentUserId ?? ''), updatedAt: new Date().toISOString() }
    const mutation = { type, ...fields(stamp), stamp }
    const next = applyMutation(previous, mutation)
    if (next === previous) return false
    pending.current.push(mutation)
    persistPending()
    current.current = next
    setState(next)
    if (!saveFailed) void flushPending()
    return true
  }

  function add(collection, prefix, fields) {
    const id = `${prefix}-${crypto.randomUUID()}`
    return commit('add', (stamp) => ({ collection, id, fields: typeof fields === 'function' ? fields(stamp) : fields })) ? id : null
  }

  function update(collection, id, fields) {
    return commit('update', (stamp) => ({ collection, id, fields: typeof fields === 'function' ? fields(stamp) : fields }))
  }

  if (failed) return <main className="workspace-content"><h1>Workspace unavailable</h1><p>Reload the page to try again.</p></main>
  if (!state) return <main className="workspace-content" aria-busy="true">Loading Basecamp…</main>
  return <StoreContext.Provider value={{ state, add, update, saveFailed, retrySave: flushPending,
    positionTodo: (fields) => commit('positionTodo', () => fields),
    restore: (collection, id, projectId) => commit('restore', () => ({ collection, id, projectId })),
  }}>{children}</StoreContext.Provider>
}
