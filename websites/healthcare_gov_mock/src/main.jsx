import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { StoreProvider } from './store'
import { createInitialData } from './data/seed'
import { loadState } from './utils/dataManager'
import './styles.css'

export const APP = 'healthcare_gov_mock'
const root = createRoot(document.getElementById('root'))
root.render(<main className="container" aria-busy="true"><p role="status">Loading your account…</p></main>)
loadState(APP, createInitialData).then((initial) => {
  root.render(<StoreProvider initial={initial}><BrowserRouter><App /></BrowserRouter></StoreProvider>)
})
