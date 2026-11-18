import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App.jsx'
import { WorkspaceProvider } from './workspace.jsx'
import { createInitialData } from './data/seed.js'
import { loadState } from './utils/dataManager.js'
import './styles.css'

const appId = 'google_cloud_console_mock'
const boot = loadState(appId, createInitialData)

function Root() {
  const [state, setState] = useState(null)
  const [error, setError] = useState(false)
  useEffect(() => { boot.then(setState, () => setError(true)) }, [])
  if (error) return <main className="loading" role="alert">Could not load the workspace. <button onClick={() => location.reload()}>Reload</button></main>
  if (!state) return <main className="loading" role="status">Loading workspace…</main>
  return <BrowserRouter><WorkspaceProvider initial={state} appId={appId}><App /></WorkspaceProvider></BrowserRouter>
}

createRoot(document.getElementById('root')).render(<Root />)
