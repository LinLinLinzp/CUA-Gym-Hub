import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { createInitialData } from './data/seed'
import { loadState } from './utils/dataManager'
import { APP, WorkspaceProvider } from './store'
import App from './App'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<div role="status" className="boot">Loading workspace…</div>)
const state = await loadState(APP, createInitialData)
root.render(
  <BrowserRouter>
    <WorkspaceProvider initial={state}><App /></WorkspaceProvider>
  </BrowserRouter>,
)
