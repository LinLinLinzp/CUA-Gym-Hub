import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { createInitialData } from './data/seed.js'
import { loadState } from './utils/dataManager.js'
import { installStateTransport } from './utils/stateTransport.js'
import { WorkspaceProvider } from './store.jsx'
import App from './App.jsx'
import './styles.css'

const root = createRoot(document.getElementById('root'))
installStateTransport()
root.render(<main className="boot" role="status">Loading workspace…</main>)
loadState('loom', createInitialData).then((state) => {
  root.render(
    <BrowserRouter>
      <WorkspaceProvider initialState={state}><App /></WorkspaceProvider>
    </BrowserRouter>,
  )
})
