import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App.jsx'
import { Workspace, APP } from './workspace.jsx'
import { createInitialData } from './data/seed.js'
import { loadState } from './utils/dataManager.js'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<main className="boot" role="status">Loading workspace…</main>)
loadState(APP, createInitialData).then((initial) => {
  root.render(<BrowserRouter><Workspace initial={initial}><App /></Workspace></BrowserRouter>)
}).catch(() => {
  root.render(<main className="boot" role="alert">
    <p>The workspace could not load.</p><button onClick={() => window.location.reload()}>Try again</button>
  </main>)
})
