import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { APP, WorkspaceProvider } from './store'
import { createInitialData } from './data/seed'
import { loadState } from './utils/dataManager'
import './styles.css'

async function bootstrap() {
  const initial = await loadState(APP, createInitialData)
  createRoot(document.getElementById('root')).render(
    <WorkspaceProvider initial={initial}><BrowserRouter><App /></BrowserRouter></WorkspaceProvider>,
  )
}

bootstrap()
