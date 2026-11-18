import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { StoreProvider } from './store.jsx'
import { loadMailbox } from './data/persistence.js'
import { createInitialData } from './data/seed.js'
import './styles.css'
const root = createRoot(document.getElementById('root'))
loadMailbox(createInitialData).then(state => root.render(<BrowserRouter><StoreProvider initialState={state}><App /></StoreProvider></BrowserRouter>)).catch(() => root.render(<p>Unable to open your mailbox. Please reload to try again.</p>))
