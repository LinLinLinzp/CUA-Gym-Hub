import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createInitialData } from './data/seed'
import { getSessionId, loadState, saveState } from './utils/dataManager'

const Context = createContext(null)
const APP = 'dropbox'

export const useStore = () => useContext(Context)

export function Store({ children }) {
  const [state, setState] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const current = useRef(null)
  const noticeTimer = useRef()
  const storageKey = useRef()
  useEffect(() => {
    storageKey.current = APP + ':current:' + (getSessionId() || '_default')
    function sync(event) {
      if (event.storageArea !== localStorage || event.key !== storageKey.current || !event.newValue) return
      const data = JSON.parse(localStorage.getItem(storageKey.current) || event.newValue)
      current.current = data
      setState(data)
    }
    window.addEventListener('storage', sync)
    loadState(APP, createInitialData).then(data => {
      current.current = data
      setState(data)
    }).catch(() => setError('The workspace could not load. Reload to try again.'))
    return () => {
      window.removeEventListener('storage', sync)
      clearTimeout(noticeTimer.current)
    }
  }, [])

  function commit(mutate) {
    const stored = localStorage.getItem(storageKey.current)
    const previous = stored ? JSON.parse(stored) : current.current
    const next = mutate(previous)
    if (next === previous) return
    saveState(APP, next)
    current.current = next
    setState(next)
  }

  function notify(message) {
    clearTimeout(noticeTimer.current)
    setNotice(message)
    noticeTimer.current = setTimeout(() => setNotice(''), 3800)
  }

  if (!state) return <main className="loading" role={error ? 'alert' : 'status'}>{error || 'Loading Dropbox…'}</main>
  return <Context.Provider value={{ state, commit, notify }}>
    {children}
    <div className={notice ? 'toast' : 'sr-only'} role="status">{notice}</div>
  </Context.Provider>
}
