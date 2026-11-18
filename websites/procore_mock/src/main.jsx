import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { createInitialData } from './data/seed'
import { WorkspaceProvider } from './state'
import { loadState } from './utils/dataManager'
import './styles.css'

const root = document.getElementById('root')
loadState('procore', createInitialData).then((initialState) => {
  root.removeAttribute('role')
  createRoot(root).render(<BrowserRouter>
    <WorkspaceProvider initialState={initialState}><App /></WorkspaceProvider>
  </BrowserRouter>)
}).catch(() => {
  root.textContent = 'The workspace could not load. Reload the page to try again.'
})
