import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App.jsx'
import { installHarborTransport } from './utils/harborTransport.js'
import './styles.css'

installHarborTransport()

createRoot(document.getElementById('root')).render(
  <BrowserRouter><App /></BrowserRouter>,
)
