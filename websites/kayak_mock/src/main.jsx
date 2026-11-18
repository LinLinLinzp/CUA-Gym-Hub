import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { createInitialData } from './data/seed'
import { AccountProvider, APP } from './store'
import { loadState } from './utils/dataManager'
import { installStateTransport } from './utils/stateTransport'
import './styles.css'

const root = createRoot(document.getElementById('root'))
installStateTransport()
root.render(<main className="boot" role="status">Loading your account…</main>)

async function start() {
  try {
    const world = await loadState(APP, createInitialData)
    root.render(<BrowserRouter><AccountProvider initialWorld={world}><App /></AccountProvider></BrowserRouter>)
  } catch {
    root.render(<main className="boot" role="alert">Your account could not be loaded. Refresh the page to try again.</main>)
  }
}

start()
