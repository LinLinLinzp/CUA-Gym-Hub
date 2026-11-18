import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AccountProvider, APP } from './store.jsx'
import { createInitialData } from './data/seed.js'
import { loadState } from './utils/dataManager.js'
import App from './App.jsx'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<main className="loading" aria-busy="true">Loading your StudentAid.gov account…</main>)
loadState(APP, createInitialData).then(state => {
  root.render(<BrowserRouter><AccountProvider initialState={state}><App /></AccountProvider></BrowserRouter>)
}).catch(() => {
  root.render(<main className="loading" role="alert">Your account could not be loaded. Refresh the page to try again.</main>)
})
