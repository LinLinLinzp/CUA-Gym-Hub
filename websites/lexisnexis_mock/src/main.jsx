import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App.jsx'
import { createInitialData } from './data/seed.js'
import { APP, WorkspaceProvider } from './store.jsx'
import { loadState } from './utils/dataManager.js'
import '@fontsource/source-serif-4/latin-400.css'
import './styles.css'

function Boot() {
  const [state, setState] = useState(null)
  useEffect(() => { loadState(APP, createInitialData).then(setState) }, [])
  if (!state) return <main className="boot" role="status">Loading research workspace…</main>
  return <BrowserRouter useTransitions={false}><WorkspaceProvider initialState={state}><App /></WorkspaceProvider></BrowserRouter>
}

createRoot(document.getElementById('root')).render(<Boot />)
