import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App.jsx'
import { Workspace, APP } from './store.jsx'
import { loadState } from './utils/dataManager.js'
import { createInitialData } from './data/seed.js'
import './style.css'

async function boot() {
  const initial = await loadState(APP, createInitialData)
  const root = createRoot(document.getElementById('root'))
  root.render(<BrowserRouter><Workspace initial={initial}><App /></Workspace></BrowserRouter>)
}

boot()

