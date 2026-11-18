import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { loadState } from './utils/dataManager.js'
import { createInitialData } from './data/seed.js'
import { APP, Store } from './store.jsx'
import App from './App.jsx'
import './style.css'

const root = createRoot(document.getElementById('root'))
root.render(<div className="loading" role="status">Loading workspace…</div>)
loadState(APP, createInitialData).then(initial => {
  root.render(<Store initial={initial}><BrowserRouter><App /></BrowserRouter></Store>)
}).catch(() => {
  root.render(<div className="loading" role="alert">The workspace could not load. Reload the page to try again.</div>)
})

