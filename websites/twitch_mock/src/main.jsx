import { createRoot } from 'react-dom/client'
import { App } from './App.jsx'
import { WorkspaceProvider } from './workspace.jsx'
import { loadInitialState } from './utils/loadInitialState.js'
import { createInitialData } from './data/seed.js'
import './styles.css'


const root = createRoot(document.getElementById('root'))
root.render(<main className="wrap main" role="status">Loading creator workspace…</main>)

async function boot() {
  try {
    const initial = await loadInitialState('twitch', createInitialData)
    root.render(<WorkspaceProvider initial={initial}><App /></WorkspaceProvider>)
  } catch {
    root.render(<main className="wrap main"><h1>Workspace unavailable</h1>
      <p>The creator workspace could not load.</p><button onClick={() => location.reload()}>Retry</button></main>)
  }
}

boot()

