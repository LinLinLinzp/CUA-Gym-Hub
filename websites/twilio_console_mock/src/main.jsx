import { createRoot } from 'react-dom/client'
import { App } from './App.jsx'
import { createInitialData } from './data/seed.js'
import { APP, StateProvider } from './store.jsx'
import { loadState } from './utils/dataManager.js'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<p className="boot" role="status">Loading workspace…</p>)

async function start() {
  try {
    const initial = await loadState(APP, createInitialData)
    root.render(<StateProvider initial={initial}><App /></StateProvider>)
  } catch {
    root.render(<p className="boot" role="alert">The workspace could not load. Reload the page to retry.</p>)
  }
}

start()
