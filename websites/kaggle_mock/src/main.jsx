import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { createInitialData } from './data/seed.js'
import { APP, StoreProvider } from './store.jsx'
import { loadState } from './utils/dataManager.js'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<main className="boot"><span className="wordmark">Kaggle</span><p role="status">Loading your workspace…</p></main>)
loadState(APP, createInitialData).then(initial => {
  root.render(<StoreProvider initial={initial}><App /></StoreProvider>)
}).catch(() => {
  root.render(<main className="boot"><span className="wordmark">Kaggle</span><p role="alert">The workspace could not load.</p>
    <button className="button" onClick={() => location.reload()}>Try again</button></main>)
})
