import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { APP, StoreProvider } from './store.jsx'
import { loadState } from './utils/dataManager.js'
import { createInitialData } from './data/seed.js'
import './styles.css'

const container = document.getElementById('root')

async function start() {
  const initial = await loadState(APP, createInitialData)
  createRoot(container).render(
    <BrowserRouter>
      <StoreProvider initial={initial}>
        <App />
      </StoreProvider>
    </BrowserRouter>,
  )
}

start().catch(() => {
  container.textContent = 'The account could not load. Refresh to try again.'
})
