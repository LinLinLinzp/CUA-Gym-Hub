import { createRoot } from 'react-dom/client'
import { WorkspaceProvider, bootWorkspace } from './context/Workspace'
import App from './App'
import './styles.css'

const root = createRoot(document.getElementById('root'))

async function start() {
  try {
    const initial = await bootWorkspace()
    root.render(<WorkspaceProvider initial={initial}><App /></WorkspaceProvider>)
  } catch {
    root.render(<p role="alert">Moodle could not load. Reload this page to try again.</p>)
  }
}

start()
