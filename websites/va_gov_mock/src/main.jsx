import { createRoot } from 'react-dom/client'
import App from './App'
import { Store } from './state'
import { createInitialData } from './data/seed'
import { loadState } from './utils/dataManager'
import './styles.css'
import './service.css'

export const APP = 'va_gov_mock'

const root = document.getElementById('root')
loadState(APP, createInitialData).then(state => {
  createRoot(root).render(<Store app={APP} initialState={state}><App /></Store>)
}).catch(() => {
  root.innerHTML = '<main class="workspace"><h1>Account unavailable</h1><p>Reload the page to try again.</p></main>'
})
