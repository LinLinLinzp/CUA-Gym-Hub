import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { createInitialData } from './data/seed.js'
import { loadState } from './utils/dataManager.js'
import { APP, WorkspaceProvider } from './workspace.jsx'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<main className="workspace" role="status">Loading workspace…</main>)

loadState(APP, createInitialData).then(state => {
  root.render(
    <BrowserRouter>
      <WorkspaceProvider initialState={state}>
        <App />
      </WorkspaceProvider>
    </BrowserRouter>
  )
})
