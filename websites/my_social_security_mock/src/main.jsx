import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { APP, AccountProvider } from './account.jsx'
import { createInitialData } from './data/seed.js'
import { loadAccountState } from './utils/accountTransport.js'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<main className="loading" role="status">Loading your account…</main>)

loadAccountState(APP, createInitialData).then(state => {
  root.render(
    <BrowserRouter>
      <AccountProvider initialState={state}><App /></AccountProvider>
    </BrowserRouter>,
  )
}).catch(() => {
  root.render(<main className="loading" role="alert">Your account could not be loaded. Reload the page to try again.</main>)
})
