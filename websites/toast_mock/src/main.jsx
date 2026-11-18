import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App.jsx'
import { APP } from './data/model.js'
import { createInitialData } from './data/seed.js'
import { loadState } from './utils/dataManager.js'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<div className="loading" role="status">Loading workspace…</div>)
loadState(APP, createInitialData).then(state => {
  root.render(<BrowserRouter><App initialState={state} /></BrowserRouter>)
}).catch(() => {
  root.render(<div className="loading" role="alert">The workspace could not load. Refresh to try again.</div>)
})

