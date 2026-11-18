import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { createInitialData } from './data/seed'
import { loadState } from './utils/dataManager'
import { WorkspaceProvider } from './workspace'
import App from './App'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<main className="boot" role="status">Loading workspace…</main>)

loadState('firebase', createInitialData).then((initialState) => {
  root.render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <WorkspaceProvider initialState={initialState}><App /></WorkspaceProvider>
    </BrowserRouter>,
  )
}).catch(() => root.render(<main className="boot" role="alert">Unable to load the workspace. Reload to try again.</main>))
