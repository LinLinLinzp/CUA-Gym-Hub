import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { loadState, saveState } from './utils/dataManager.js'
import { createInitialData } from './data/seed.js'

const APP = 'yelp_mock'
const Context = createContext(null)

export const useWorld = () => useContext(Context)

export function Store({ children }) {
  const [world, setWorld] = useState(null)
  const [message, setMessage] = useState('')
  const current = useRef(null)

  useEffect(() => {
    loadState(APP, createInitialData).then(data => {
      current.current = data
      setWorld(data)
    })
  }, [])

  function mutate(transform, feedback) {
    const next = transform(current.current)
    if (!next || next === current.current) return false
    current.current = next
    saveState(APP, next)
    setWorld(next)
    if (feedback) setMessage(feedback)
    return true
  }

  if (!world) return <main className="loading" role="status">Loading your account…</main>

  return <Context.Provider value={{ world, mutate }}>
    {children}
    <div role="status" aria-live="polite" className="toast-region">
      {message && <div className="toast"><span>{message}</span><button type="button" onClick={() => setMessage('')} aria-label="Dismiss notification">×</button></div>}
    </div>
  </Context.Provider>
}
