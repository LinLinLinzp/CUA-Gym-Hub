
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { getSessionId, loadState, mergeWithDefaults, saveState, withSid } from './utils/dataManager.js'
import { createInitialData } from './data/seed.js'
import { AccountContext } from './shared.jsx'
import App from './App.jsx'
import './styles.css'

const APP = 'the_home_depot'
const cacheKey = APP + ':current:' + (getSessionId() || '_default')
const initialState = loadState(APP, createInitialData)

function Root() {
  const [state, setState] = useState(null)
  const current = useRef(null)
  const saving = useRef(false)

  useEffect(() => {
    function sync(event) {
      if (event.key !== cacheKey || !event.newValue) return
      const updated = JSON.parse(localStorage.getItem(cacheKey) || event.newValue)
      current.current = updated
      setState(updated)
    }
    window.addEventListener('storage', sync)
    initialState.then((loaded) => {
      if (current.current === null) {
        current.current = loaded
        setState(loaded)
      }
    })
    return () => window.removeEventListener('storage', sync)
  }, [])

  const mutate = useCallback(async (change) => {
    if (saving.current) return 'An account change is already in progress.'
    saving.current = true
    try {
      // Other browser contexts share the SID but have independent localStorage.
      const response = await fetch(withSid('/state'), { cache: 'no-store' })
      if (!response.ok) return 'Account changes are temporarily unavailable. Try again.'
      const { has_custom_state, stored_state } = await response.json()
      const previous = has_custom_state ? mergeWithDefaults(createInitialData(), stored_state) : current.current
      const next = change(previous)
      if (typeof next === 'string') {
        localStorage.setItem(cacheKey, JSON.stringify(previous))
        current.current = previous
        setState(previous)
        return next
      }
      if (next !== previous) {
        saveState(APP, next)
        current.current = next
        setState(next)
      }
      return ''
    } catch {
      return 'Account changes are temporarily unavailable. Try again.'
    } finally {
      saving.current = false
    }
  }, [])

  if (!state) return <main className="wrap loading" role="status">Loading your account…</main>
  return <BrowserRouter><AccountContext.Provider value={{ state, mutate }}>
    <App />
  </AccountContext.Provider></BrowserRouter>
}

createRoot(document.getElementById('root')).render(<Root />)
