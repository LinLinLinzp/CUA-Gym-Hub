import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { App, Loading, routes } from './App.jsx'
import { AccountProvider, APP } from './store.jsx'
import { loadState } from './utils/dataManager.js'
import { createInitialData } from './data/seed.js'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<Loading />)
loadState(APP, createInitialData).then(state => {
  const router = createBrowserRouter([{ element: <App />, children: routes }])
  root.render(<AccountProvider initialState={state}><RouterProvider router={router} /></AccountProvider>)
}).catch(() => root.render(<main className="loading" role="alert">Unable to load the account. Reload the page to try again.</main>))
