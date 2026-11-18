import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App.jsx'
import { Workspace, APP } from './workspace.jsx'
import { createInitialData } from './data/seed.js'
import { loadState } from './utils/dataManager.js'
import './style.css'

const root = createRoot(document.getElementById('root'))
root.render(<main className="loading" role="status">Opening Supabase workspace…</main>)
loadState(APP, createInitialData).then(state => {
  root.render(<BrowserRouter><Workspace initialState={state}><App /></Workspace></BrowserRouter>)
}).catch(() => {
  root.render(<main className="loading" role="alert">The workspace could not open. Reload the page to try again.</main>)
})
