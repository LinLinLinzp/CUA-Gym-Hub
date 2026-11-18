import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App.jsx'
import { APP, Workspace } from './context/Workspace.jsx'
import { createInitialData } from './data/seed.js'
import { loadState } from './utils/dataManager.js'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<main className="boot" role="status">Loading your Udemy account…</main>)

loadState(APP, createInitialData).then(state => {
  root.render(<Workspace initial={state}><BrowserRouter><App /></BrowserRouter></Workspace>)
}).catch(() => {
  root.render(<main className="boot"><h1>Udemy</h1><p>Your account could not be loaded.</p><button onClick={() => window.location.reload()}>Try again</button></main>)
})
