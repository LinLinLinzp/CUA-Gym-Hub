import { createRoot } from 'react-dom/client'
import { App } from './App.jsx'
import { createInitialData } from './data/seed.js'
import { loadState } from './utils/dataManager.js'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<div className="loading" role="status">Loading workspace…</div>)

async function boot() {
  try {
    const initialState = await loadState('brex', createInitialData)
    root.render(<App initialState={initialState} />)
  } catch {
    root.render(<div className="loading" role="alert">The workspace could not load. <button type="button" onClick={() => window.location.reload()}>Reload workspace</button></div>)
  }
}

boot()
