import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { createInitialData } from './data/seed.js'
import { loadState } from './utils/dataManager.js'
import { APP, Store } from './store.jsx'
import App from './App.jsx'

const root = createRoot(document.getElementById('root'))
root.render(<main role="status">Loading workspace…</main>)
loadState(APP, createInitialData).then((state) => {
  root.render(<BrowserRouter><Store initialState={state}><App /></Store></BrowserRouter>)
}).catch(() => {
  root.render(<main role="alert">Could not load the workspace. Reload the page to try again.</main>)
})
