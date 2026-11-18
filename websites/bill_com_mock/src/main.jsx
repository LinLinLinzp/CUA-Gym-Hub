import { createRoot } from 'react-dom/client'
import { createInitialData } from './data/seed.js'
import { App } from './App.jsx'
import { APP, Store } from './store.jsx'
import { loadState } from './utils/dataManager.js'
import './style.css'

const root = createRoot(document.getElementById('root'))

loadState(APP, createInitialData).then(state => {
  root.render(<Store initialState={state}><App /></Store>)
}).catch(() => {
  root.render(<main className="loading" role="alert">The workspace could not be loaded. Reload to try again.</main>)
})
