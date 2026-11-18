import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App.jsx'
import { Store, APP } from './store.jsx'
import { createInitialData } from './data/seed.js'
import { loadState } from './utils/dataManager.js'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<main className="loading" role="status">Loading seller workspace…</main>)

async function start() {
  const state = await loadState(APP, createInitialData)
  root.render(<Store initialState={state}><BrowserRouter><App /></BrowserRouter></Store>)
}

start().catch(() => root.render(<main className="loading" role="alert">The workspace could not load. Please refresh the page.</main>))
