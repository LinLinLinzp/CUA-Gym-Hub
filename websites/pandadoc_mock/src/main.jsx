import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { WorkspaceProvider } from './store.jsx'
import App from './App.jsx'
import './style.css'

createRoot(document.getElementById('root')).render(
  <WorkspaceProvider><BrowserRouter><App /></BrowserRouter></WorkspaceProvider>,
)
