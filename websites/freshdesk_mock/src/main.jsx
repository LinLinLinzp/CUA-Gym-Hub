import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App.jsx'
import { APP, AccountProvider } from './store.jsx'
import { createInitialData } from './data/seed.js'
import { loadState } from './utils/dataManager.js'
import './styles.css'

async function loadAccount() {
  // The shared loader starts its baseline POST without waiting for it. Let it
  // finish before mounting forms that can send a newer account snapshot.
  const fetch = window.fetch
  let baseline
  window.fetch = (input, options) => {
    const request = fetch.call(window, input, options)
    if (typeof input === 'string' && input.split('?')[0] === '/post' && options?.method === 'POST') {
      baseline = request.catch(() => {})
    }
    return request
  }
  let state
  try {
    state = await loadState(APP, createInitialData)
  } finally {
    window.fetch = fetch
  }
  await baseline
  return state
}

loadAccount().then(state => {
  createRoot(document.getElementById('root')).render(
    <AccountProvider initialState={state}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><App /></BrowserRouter>
    </AccountProvider>,
  )
})
