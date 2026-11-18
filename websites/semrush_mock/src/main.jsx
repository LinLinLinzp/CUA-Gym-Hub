import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { APP, WorkspaceProvider } from './store.jsx'
import { createInitialData } from './data/seed.js'
import { loadState } from './utils/dataManager.js'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<main className="loading" role="status">Loading workspace…</main>)
loadState(APP, createInitialData).then(initial => {
  root.render(<WorkspaceProvider initial={initial}><App /></WorkspaceProvider>)
}).catch(() => {
  root.render(<main className="loading" role="alert">The workspace could not load. Reload the page to try again.</main>)
})
