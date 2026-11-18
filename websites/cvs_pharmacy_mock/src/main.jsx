import { createRoot } from 'react-dom/client'
import { App } from './App.jsx'
import { loadAccount } from './state.jsx'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<main className="workspace" role="status">Loading your account…</main>)

loadAccount().then((initialState) => root.render(<App initialState={initialState}/>)).catch(() => {
  root.render(<main className="workspace" role="alert">We couldn’t load your pharmacy account. Reload this page to try again.</main>)
})
