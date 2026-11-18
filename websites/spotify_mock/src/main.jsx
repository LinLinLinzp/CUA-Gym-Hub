import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App.jsx'
import { StateProvider } from './store.jsx'
import { loadState } from './utils/dataManager.js'
import { createInitialData } from './data/seed.js'
import './styles.css'

async function loadAccount() {
  const fetch = window.fetch
  let baseline
  // The shared loader starts its baseline POST without waiting for it.
  window.fetch = (path, options) => {
    const response = fetch.call(window, path, options)
    if (options?.method === 'POST' && typeof path === 'string' && path.split('?')[0] === '/post') {
      baseline = response.catch(() => {})
    }
    return response
  }
  try {
    const state = await loadState('spotify', createInitialData)
    await baseline
    return state
  } finally {
    window.fetch = fetch
  }
}

const root = createRoot(document.getElementById('root'))
root.render(<main className="boot" role="status">Loading your collection…</main>)
loadAccount().then((state) => {
  root.render(
    <BrowserRouter>
      <StateProvider initialState={state}><App /></StateProvider>
    </BrowserRouter>,
  )
}).catch(() => {
  root.render(<main className="boot" role="alert">Your collection couldn’t load. Refresh to try again.</main>)
})

