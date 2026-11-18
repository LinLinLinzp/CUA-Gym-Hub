import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { APP, WorkspaceProvider } from './state.jsx'
import { createInitialData } from './data/seed.js'
import { loadState } from './utils/dataManager.js'
import './styles.css'

async function start() {
  const root = createRoot(document.getElementById('root'))
  root.render(<main className="participant"><p role="status">Loading workspace…</p></main>)
  const state = await loadState(APP, createInitialData)
  root.render(<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <WorkspaceProvider initialState={state}><App/></WorkspaceProvider>
  </BrowserRouter>)
}

start()
