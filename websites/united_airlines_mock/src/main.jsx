import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { APP, StoreProvider } from './store.jsx'
import { createInitialData } from './data/seed.js'
import { loadState } from './utils/dataManager.js'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<main className="boot" role="status">Loading your account…</main>)
loadState(APP, createInitialData).then(initial => {
  root.render(<BrowserRouter><StoreProvider initial={initial}><App /></StoreProvider></BrowserRouter>)
}).catch(() => {
  root.render(<main className="boot"><p role="alert">Your account could not be loaded.</p>
    <button className="primary" onClick={() => window.location.reload()}>Try again</button></main>)
})
