import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import { AccountProvider, APP } from './context/AccountContext.jsx'
import { createInitialData } from './data/seed.js'
import { loadInitialState } from './utils/loadInitialState.js'
import { getSessionId } from './utils/dataManager.js'
import { readCurrentState } from './utils/stateWrites.js'

const root = createRoot(document.getElementById('root'))
root.render(<main className="wrap loading" role="status">Loading your account…</main>)

async function loadAccount() {
  const stored = await readCurrentState(null)
  const sid = getSessionId() || '_default'
  const key = `${APP}:current:${sid}`
  if (stored && (localStorage.getItem(key) || Object.keys(createInitialData()).every(field => Object.hasOwn(stored, field)))) {
    localStorage.setItem(key, JSON.stringify(stored))
    return stored
  }
  return loadInitialState(APP, createInitialData)
}

loadAccount().then(initialState => {
  root.render(<AccountProvider initialState={initialState}><App /></AccountProvider>)
}).catch(() => {
  root.render(<main className="wrap loading" role="alert">Your account could not load. Reload the page to try again.</main>)
})
