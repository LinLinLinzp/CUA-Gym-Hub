import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App.jsx'
import { createInitialData } from './data/seed.js'
import { APP, StoreProvider } from './data/store.jsx'
import { loadState } from './utils/dataManager.js'
import './styles.css'

const root = createRoot(document.getElementById('root'))

async function boot() {
  try {
    const initial = await loadState(APP, createInitialData)
    root.render(<StoreProvider initial={initial}><BrowserRouter><App /></BrowserRouter></StoreProvider>)
  } catch {
    root.render(<p className="loading" role="alert">The workspace could not load. Reload the page to try again.</p>)
  }
}

void boot()
