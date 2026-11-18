import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App.jsx'
import { StoreProvider } from './store.jsx'
import { APP } from './utils/format.js'
import { loadState } from './utils/dataManager.js'
import { createInitialData } from './data/seed.js'
import './style.css'

const root = createRoot(document.getElementById('root'))
root.render(<main className="loading" role="status">Loading workspace…</main>)
loadState(APP, createInitialData).then(initial => {
  root.render(<BrowserRouter><StoreProvider initial={initial}><App /></StoreProvider></BrowserRouter>)
}).catch(() => {
  root.render(<main className="loading" role="alert">The workspace could not load. Reload the page to try again.</main>)
})
