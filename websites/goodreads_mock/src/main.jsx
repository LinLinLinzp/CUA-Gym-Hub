import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App.jsx'
import { Store, APP } from './store.jsx'
import { createInitialData } from './data/seed.js'
import { loadState } from './utils/dataManager.js'
import './styles.css'

const root = document.getElementById('root')

async function start() {
  const initial = await loadState(APP, createInitialData)
  createRoot(root).render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Store initial={initial}>
        <App />
      </Store>
    </BrowserRouter>,
  )
}

start().catch(() => {
  root.innerHTML = '<main class="boot" role="alert">Your reading journal could not load. Refresh to try again.</main>'
})

