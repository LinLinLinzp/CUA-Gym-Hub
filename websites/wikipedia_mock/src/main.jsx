import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { createInitialData } from './data/seed.js'
import { loadState } from './utils/dataManager.js'
import { APP } from './workspace.js'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<p className="loading" role="status">Loading workspace…</p>)
loadState(APP, createInitialData)
  .then(state => root.render(<BrowserRouter><App initialState={state} /></BrowserRouter>))
  .catch(() => root.render(<p className="loading" role="alert">The workspace could not load. Reload this page to try again.</p>))
