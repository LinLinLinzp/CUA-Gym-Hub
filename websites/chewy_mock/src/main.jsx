import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { loadState } from './utils/dataManager'
import { createInitialData } from './data/seed'
import { AccountProvider, APP } from './store'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<main className="loading" role="status">Loading your account…</main>)
loadState(APP, createInitialData).then(state => {
  root.render(<BrowserRouter><AccountProvider initial={state}><App /></AccountProvider></BrowserRouter>)
}).catch(() => {
  root.render(<main className="loading"><p>Your account couldn’t load.</p><button onClick={() => location.reload()}>Try again</button></main>)
})

