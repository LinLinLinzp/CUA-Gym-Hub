import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { createInitialData } from './data/seed.js'
import { loadState } from './utils/dataManager.js'
import { AccountProvider } from './account.jsx'
import App from './App.jsx'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<main className="container main" role="status">Loading your account…</main>)

loadState('uber', createInitialData).then((data) => {
  root.render(<BrowserRouter><AccountProvider initialData={data}><App /></AccountProvider></BrowserRouter>)
}).catch(() => {
  root.render(<main className="container main"><h1>Account unavailable</h1><p>Reload the page to try again.</p></main>)
})
