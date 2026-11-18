import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import { AccountProvider, APP } from './context/AccountContext.jsx'
import { createInitialData } from './data/seed.js'
import { loadState } from './utils/dataManager.js'

const root = createRoot(document.getElementById('root'))
root.render(<main className="wrap loading" role="status">Loading your account…</main>)
loadState(APP, createInitialData).then(initialState => {
  root.render(<AccountProvider initialState={initialState}><App /></AccountProvider>)
})
