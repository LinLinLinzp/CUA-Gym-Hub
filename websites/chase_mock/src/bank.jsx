import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createInitialData } from './data/seed'
import { loadState, saveState } from './utils/dataManager'

const APP = 'chase_mock'
const Bank = createContext(null)

export function BankProvider({ children }) {
  const [state, setState] = useState(null)
  const [failed, setFailed] = useState(false)
  const latest = useRef(null)

  useEffect(() => {
    let mounted = true
    loadState(APP, createInitialData).then((initial) => {
      if (!mounted) return
      latest.current = initial
      setState(initial)
    }).catch(() => { if (mounted) setFailed(true) })
    return () => { mounted = false }
  }, [])

  function commit(change) {
    const current = latest.current
    const next = change(current)
    if (next === current) return false
    latest.current = next
    saveState(APP, next)
    setState(next)
    return true
  }

  if (!state) return <main className="boot" role="status">
    {failed ? 'Your accounts could not load. Refresh to try again.' : 'Loading your accounts…'}
  </main>
  return <Bank.Provider value={{ state, commit }}>{children}</Bank.Provider>
}

export function useBank() {
  return useContext(Bank)
}
