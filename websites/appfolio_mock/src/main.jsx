import React from 'react'
import App from './App.jsx'
import './styles.css'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { createInitialData } from './data/seed.js'
import { loadState } from './utils/dataManager.js'
import { APP, StoreProvider } from './store.jsx'

const root = createRoot(document.querySelector('#root'))
root.render(<main aria-busy="true">Loading workspace…</main>)

loadState(APP, createInitialData).then(initialState => {
  root.render(
    <StoreProvider initialState={initialState}>
      <BrowserRouter><App /></BrowserRouter>
    </StoreProvider>,
  )
}).catch(() => {
  root.render(<main role="alert">The workspace could not load. Reload the page to try again.</main>)
})
