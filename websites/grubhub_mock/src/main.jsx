import { createRoot } from 'react-dom/client'
import App from './App'
import { createInitialData } from './data/seed'
import { loadState } from './utils/dataManager'
import './styles.css'
import './shell.css'
import './workflows.css'

async function boot() {
  const state = await loadState('grubhub', createInitialData)
  createRoot(document.getElementById('root')).render(<App initialState={state} />)
}

boot().catch(() => {
  document.querySelector('.boot').textContent = 'Your account could not load. Reload the page to try again.'
})
