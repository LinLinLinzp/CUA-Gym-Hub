import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { AccountProvider, APP } from './context/Account.jsx'
import { loadState } from './utils/dataManager.js'
import { createInitialData } from './data/seed.js'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<p className="loading" role="status">Loading your account…</p>)

loadState(APP, createInitialData).then((state) => {
  root.render(<AccountProvider initialState={state}><App /></AccountProvider>)
}).catch(() => {
  root.render(<p className="loading" role="alert">We couldn’t load your account. Refresh this page to try again.</p>)
})
