import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { loadState } from './utils/dataManager.js'
import { createInitialData } from './data/seed.js'
import { APP, AccountProvider } from './store.jsx'
import App from './App.jsx'
import './styles.css'

async function start() {
  const initialState = await loadState(APP, createInitialData)
  createRoot(document.getElementById('root')).render(
    <BrowserRouter><AccountProvider initialState={initialState}><App /></AccountProvider></BrowserRouter>,
  )
}

start().catch(() => {
  document.querySelector('.loading').textContent = 'Your account could not load. Refresh the page to try again.'
})
