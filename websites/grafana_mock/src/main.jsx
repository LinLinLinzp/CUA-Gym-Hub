import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { createInitialData } from './data/seed.js'
import { loadState } from './utils/dataManager.js'
import { APP, WorkspaceProvider } from './workspace.jsx'
import App from './App.jsx'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<p className="loading" role="status">Loading workspace…</p>)

loadState(APP, createInitialData).then((initial) => {
  root.render(<BrowserRouter><WorkspaceProvider initial={initial}><App /></WorkspaceProvider></BrowserRouter>)
}).catch(() => {
  root.render(<p className="loading" role="alert">The workspace could not load. Reload to try again.</p>)
})
