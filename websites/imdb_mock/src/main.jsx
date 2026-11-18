import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App.jsx'
import { APP, AccountProvider } from './store.jsx'
import { createInitialData } from './data/seed.js'
import { loadAccountState } from './utils/persist.js'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<main className="boot" role="status">Loading your activity…</main>)

async function boot() {
  try {
    const state = await loadAccountState(APP, createInitialData)
    root.render(<BrowserRouter><AccountProvider initialState={state}><App /></AccountProvider></BrowserRouter>)
  } catch {
    root.render(<main className="boot"><p>Unable to load your activity.</p><button onClick={() => window.location.reload()}>Try again</button></main>)
  }
}

boot()
