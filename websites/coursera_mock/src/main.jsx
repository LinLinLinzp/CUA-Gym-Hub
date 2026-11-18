import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { WorkspaceProvider } from './context/Workspace.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <BrowserRouter><WorkspaceProvider><App /></WorkspaceProvider></BrowserRouter>,
)
