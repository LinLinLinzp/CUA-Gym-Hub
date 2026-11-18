import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { createInitialData } from './data/seed'
import { loadState } from './utils/dataManager'
import './styles.css'

export const APP = 'google_search_console'
const root = createRoot(document.getElementById('root'))
root.render(<main className="loading" role="status">Loading Search Console…</main>)

loadState(APP, createInitialData).then(state => {
  root.render(<BrowserRouter><App initialState={state} appName={APP} /></BrowserRouter>)
}).catch(() => {
  root.render(<main className="loading" role="alert">Search Console could not load. Reload the page to try again.</main>)
})
