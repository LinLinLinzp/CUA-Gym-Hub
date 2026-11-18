import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { Store } from './store'
import { createInitialData } from './data/seed'
import { loadState } from './utils/dataManager'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<p className="loading" role="status">Loading My Redfin…</p>)

loadState('redfin', createInitialData).then(initial => {
  root.render(<BrowserRouter><Store initial={initial}><App /></Store></BrowserRouter>)
}).catch(() => {
  root.render(<main className="loading"><p>My Redfin could not load.</p><button onClick={() => window.location.reload()}>Try again</button></main>)
})
