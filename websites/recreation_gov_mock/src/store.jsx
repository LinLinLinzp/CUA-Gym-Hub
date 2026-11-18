import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { createInitialData } from './data/seed'
import { transact } from './data/domain'
import { getSessionId, loadState, saveState, withSid } from './utils/dataManager'

const APP = 'recreation_gov_mock'
const StoreContext = createContext(null)

export function StateProvider({ children }) {
  const location = useLocation()
  const sid = getSessionId()
  return <SessionStore key={sid} sid={sid} location={location}>{children}</SessionStore>
}

function SessionStore({ sid, location, children }) {
  const [state, setState] = useState(null)
  const [bootError, setBootError] = useState(false)
  const [notice, setNotice] = useState('')
  const current = useRef(null)

  useEffect(() => {
    let active = true
    const update = (snapshot) => {
      if (!active) return
      current.current = snapshot
      setState(snapshot)
    }
    loadState(APP, createInitialData).then(update).catch(() => {
      if (active) setBootError(true)
    })
    const sync = (event) => {
      if (event.key === `${APP}:current:${sid || '_default'}` && event.newValue) {
        update(JSON.parse(event.newValue))
      }
    }
    window.addEventListener('storage', sync)
    return () => {
      active = false
      window.removeEventListener('storage', sync)
    }
  }, [sid])

  function commit(action, message) {
    const result = transact(current.current, action)
    if (result.error) return result
    saveState(APP, result.state)
    current.current = result.state
    setState(result.state)
    setNotice(message)
    return result
  }

  if (bootError) return <main className="boot" role="alert">Account data is unavailable. <a href={withSid(location.pathname)}>Reload this page</a></main>
  if (!state) return <main className="boot" role="status">Loading your Recreation.gov account…</main>
  return <StoreContext.Provider value={{ state, commit, notice, path: location.pathname, sid }}>
    {children}
  </StoreContext.Provider>
}

export const useStore = () => useContext(StoreContext)

export function useRoute() {
  const location = useLocation()
  const navigate = useNavigate()
  const { sid } = useStore()
  function target(path) {
    const [beforeHash, hash] = path.split('#')
    const [pathname, query] = beforeHash.split('?')
    const params = new URLSearchParams(query)
    if (sid) params.set('sid', sid)
    const search = params.toString()
    return { pathname, search: search ? `?${search}` : '', hash: hash ? `#${hash}` : '' }
  }
  return { target, go: (path, options) => navigate(target(path), options), location }
}
