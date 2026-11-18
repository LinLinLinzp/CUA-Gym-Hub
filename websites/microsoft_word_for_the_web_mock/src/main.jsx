import { createRoot } from 'react-dom/client'
import { App } from './App.jsx'
import { loadWorkspace, StoreProvider } from './data/store.jsx'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<main className="loading" role="status">Loading documents…</main>)
loadWorkspace().then((state) => root.render(<StoreProvider initialState={state}><App /></StoreProvider>))
