import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { APP, FeedbackProvider, StoreProvider } from './store'
import { createInitialData } from './data/seed'
import { loadState } from './utils/dataManager'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<main className="loading" role="status">Loading creator workspace…</main>)

loadState(APP, createInitialData).then((initial) => {
  root.render(<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <StoreProvider initial={initial}><FeedbackProvider><App /></FeedbackProvider></StoreProvider>
  </BrowserRouter>)
}).catch(() => {
  root.render(<main className="loading"><p role="alert">The workspace could not load.</p>
    <button className="button" onClick={() => window.location.reload()}>Try again</button>
  </main>)
})
