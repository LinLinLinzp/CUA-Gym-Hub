import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { createInitialData } from './data/seed'
import { AccountProvider, APP } from './context/AccountContext'
import { loadState } from './utils/dataManager'
import { prepareStateTransport } from './utils/stateTransport'
import './style.css'

prepareStateTransport()

const root = createRoot(document.getElementById('root'))
root.render(<main className="loading" role="status">Loading your account…</main>)

let startup
function boot() {
  startup ??= loadState(APP, createInitialData).then(initial => {
    root.render(<AccountProvider initial={initial}><BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: true }}><App /></BrowserRouter></AccountProvider>)
  }).catch(() => {
    root.render(<main className="loading" role="alert">Your account could not load. Refresh to try again.</main>)
  })
  return startup
}

boot()
