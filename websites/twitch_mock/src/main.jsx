import { createRoot } from 'react-dom/client'
import { App } from './App.jsx'
import { WorkspaceProvider } from './workspace.jsx'
import { loadState } from './utils/dataManager.js'
import { createInitialData } from './data/seed.js'
import { queueStatePosts } from './utils/statePosts.js'
import './styles.css'

queueStatePosts()

const root = createRoot(document.getElementById('root'))
root.render(<main className="wrap main" role="status">Loading creator workspace…</main>)

async function boot() {
  try {
    const initial = await loadState('twitch', createInitialData)
    root.render(<WorkspaceProvider initial={initial}><App /></WorkspaceProvider>)
  } catch {
    root.render(<main className="wrap main"><h1>Workspace unavailable</h1>
      <p>The creator workspace could not load.</p><button onClick={() => location.reload()}>Retry</button></main>)
  }
}

boot()

