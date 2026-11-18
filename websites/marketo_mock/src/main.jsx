import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App.jsx'
import { APP, WorkspaceProvider } from './store.jsx'
import { createInitialData } from './data/seed.js'
import { loadState } from './utils/dataManager.js'
import './styles.css'

const container = document.getElementById('root')

loadState(APP, createInitialData).then((state) => {
  createRoot(container).render(
    <BrowserRouter useTransitions={false}>
      <WorkspaceProvider initialState={state}><App /></WorkspaceProvider>
    </BrowserRouter>,
  )
}).catch(() => {
  container.textContent = 'The workspace could not load. Refresh the page to try again.'
})

