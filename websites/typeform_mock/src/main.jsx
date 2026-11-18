import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { loadState } from './utils/dataManager.js'
import { createInitialData } from './data/seed.js'
import { APP, StateProvider } from './state.jsx'
import App from './App.jsx'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<div className="loading" role="status">Loading Typeform…</div>)
loadState(APP, createInitialData).then((initial) => {
  root.render(<BrowserRouter><StateProvider initial={initial}><App /></StateProvider></BrowserRouter>)
}).catch(() => {
  root.render(<div className="loading" role="alert">Typeform could not load. Refresh to try again.</div>)
})
