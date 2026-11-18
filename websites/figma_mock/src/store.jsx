import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { createInitialData } from './data/seed.js'
import { loadState, saveState, withSid } from './utils/dataManager.js'

const APP = 'figma'
const Store = createContext(null)

export function WorkspaceProvider({ children }) {
  const current = useRef(null)
  const [state, setState] = useState(null)
  const [error, setError] = useState(false)
  const [notice, setNotice] = useState('')
  const timer = useRef(null)

  useEffect(() => {
    let mounted = true
    loadState(APP, createInitialData).then((loaded) => {
      if (!mounted) return
      current.current = loaded
      setState(loaded)
    }).catch(() => { if (mounted) setError(true) })
    return () => {
      mounted = false
      clearTimeout(timer.current)
    }
  }, [])

  function commit(transaction) {
    const next = transaction(current.current)
    if (next === current.current) return false
    saveState(APP, next)
    current.current = next
    setState(next)
    return true
  }

  function notify(message) {
    clearTimeout(timer.current)
    setNotice(message)
    timer.current = setTimeout(() => setNotice(''), 3200)
  }

  if (error) return <main className="boot"><p>Unable to open the workspace.</p><button onClick={() => location.reload()}>Try again</button></main>
  if (!state) return <main className="boot" role="status">Opening workspace…</main>
  return <Store.Provider value={{ state, commit, notify }}>
    {children}
    {notice && <div className="toast" role="status">{notice}</div>}
  </Store.Provider>
}

export const useWorkspace = () => useContext(Store)

export function SessionLink({ to, ...props }) {
  return <Link to={withSid(to)} {...props} />
}

