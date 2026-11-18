import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { createInitialData } from './data/seed'
import { loadState } from './utils/dataManager'
import { serializeStatePosts } from './utils/stateTransport'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<main className="boot" role="status">Loading Venmo…</main>)

serializeStatePosts()
loadState('venmo', createInitialData).then(
  (state) => root.render(<BrowserRouter><App initialState={state} /></BrowserRouter>),
  () => root.render(<main className="boot"><p>Venmo couldn’t open your account.</p><button onClick={() => location.reload()}>Try again</button></main>),
)
