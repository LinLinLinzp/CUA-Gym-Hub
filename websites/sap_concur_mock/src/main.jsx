import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { WorkspaceProvider, APP } from './workspace.jsx'
import { loadState } from './utils/dataManager.js'
import { createInitialData } from './data/seed.js'
import './styles.css'
import './library.css'
import './documents.css'

const root = createRoot(document.getElementById('root'))
root.render(<main className="boot" role="status">Loading workspace…</main>)

async function start() {
  try {
    const initial = await loadState(APP, createInitialData)
    root.render(<WorkspaceProvider initial={initial}>
      <BrowserRouter future={{ v7_relativeSplatPath: true }}><App /></BrowserRouter>
    </WorkspaceProvider>)
  } catch {
    root.render(<main className="boot"><p>The workspace could not load.</p><button onClick={() => location.reload()}>Try again</button></main>)
  }
}

start()
