import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App.jsx'
import { createInitialData } from './data/seed.js'
import { AccountProvider } from './store.jsx'
import { loadState } from './utils/dataManager.js'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<main className="boot" role="status">Loading your account…</main>)

loadState('ikea', createInitialData).then((initialState) => {
  root.render(
    <BrowserRouter>
      <AccountProvider initialState={initialState}>
        <App />
      </AccountProvider>
    </BrowserRouter>,
  )
}).catch(() => {
  root.render(<main className="boot" role="alert">We couldn’t load your account. Reload the page to try again.</main>)
})
