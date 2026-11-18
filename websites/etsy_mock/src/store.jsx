import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { loadState, saveState, withSid } from './utils/dataManager.js'
import { createInitialData } from './data/seed.js'

const Context = createContext(null)
export const useStore = () => useContext(Context)
export function Store({ children }) {
  const [state, setState] = useState(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState(false)
  const current = useRef(null)
  useEffect(() => {
    let mounted = true
    loadState('etsy', createInitialData).then((data) => {
      if (!mounted) return
      current.current = data
      setState(data)
    }).catch(() => { if (mounted) setError(true) })
    return () => { mounted = false }
  }, [])
  const commit = (operation) => {
    const result = operation(current.current, new Date().toISOString())
    const next = result.updated || result
    if (next !== current.current) {
      saveState('etsy', next)
      current.current = next
      setState(next)
    }
    return result
  }
  if (!state) return <main className="boot"><span className="wordmark">Etsy</span>
    {error ? <p role="alert">Your account could not load. <button className="button" onClick={() => window.location.reload()}>Try again</button></p>
      : <p role="status">Loading your account…</p>}
  </main>
  return <Context.Provider value={{ state, commit, notify: setNotice }}>
    {children}
    <div className={notice ? 'toast visible' : 'toast'} role="status">{notice && <>{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}>×</button></>}</div>
  </Context.Provider>
}

export const LocalLink = ({ to, ...props }) => <Link to={withSid(to)} {...props} />
export const LocalNav = ({ to, ...props }) => <NavLink to={withSid(to)} {...props} />
export function useLocalNavigate() {
  const navigate = useNavigate()
  return (to, options) => navigate(withSid(to), options)
}
export const pathFor = (base, id) => '/' + base + '/' + encodeURIComponent(id)
export function useAction() {
  const [error, setError] = useState('')
  const run = (callback) => {
    setError('')
    try { return callback() }
    catch (failure) { setError(failure.message); return undefined }
  }
  return { run, error }
}
