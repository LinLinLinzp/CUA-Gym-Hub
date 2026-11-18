import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { createInitialData } from './data/seed.js'
import { loadState } from './utils/dataManager.js'
import { APP, StoreProvider } from './store.jsx'
import { App } from './App.jsx'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<main className="loading" aria-busy="true">Loading workspace…</main>)
loadState(APP, createInitialData).then(initial => {
  root.render(<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <StoreProvider initial={initial}><App /></StoreProvider>
  </BrowserRouter>)
}).catch(() => {
  root.render(<main className="loading"><h1>Workspace unavailable</h1><p>Reload the page to try again.</p></main>)
})
