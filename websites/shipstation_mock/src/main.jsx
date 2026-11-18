import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App.jsx'
import { createInitialData } from './data/seed.js'
import { APP, Workspace } from './workspace.jsx'
import { loadState } from './utils/dataManager.js'
import './styles.css'

const element = document.getElementById('root')
loadState(APP, createInitialData).then(state => {
  createRoot(element).render(<BrowserRouter><Workspace initial={state}><App /></Workspace></BrowserRouter>)
}).catch(() => {
  element.textContent = 'The workspace could not load. Reload the page to retry.'
})

