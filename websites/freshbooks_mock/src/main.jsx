import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import App from './App.jsx'
import { createInitialData } from './data/seed.js'
import './styles.css'
import { APP } from './context/AppContext.jsx'
import { loadState } from './utils/dataManager.js'

const root = createRoot(document.getElementById('root'))
root.render(<main className="loading" role="status">Loading workspace…</main>)
loadState(APP, createInitialData)
  .then(initial => root.render(<App initial={initial} />))
  .catch(() => root.render(<main className="loading" role="alert">The workspace could not load. Refresh the page to try again.</main>))
