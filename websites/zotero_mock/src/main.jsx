import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { StoreProvider, APP } from './store.jsx'
import { createInitialData } from './data/seed.js'
import { loadState } from './utils/dataManager.js'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<div className="boot" role="status">Loading your library…</div>)

async function start() {
  try {
    const initial = await loadState(APP, createInitialData)
    root.render(<BrowserRouter><StoreProvider initial={initial}><App /></StoreProvider></BrowserRouter>)
  } catch {
    root.render(<div className="boot" role="alert">Your library could not be loaded. <button onClick={() => location.reload()}>Reload</button></div>)
  }
}

start()
