import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App.jsx'
import { StoreProvider } from './store.jsx'
import { createInitialData } from './data/seed.js'
import { loadInitialState } from './utils/loadInitialState.js'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<main className="loading" role="status">Loading your travel account…</main>)

loadInitialState('delta_mock', createInitialData).then((initialState) => {
  root.render(
    <BrowserRouter>
      <StoreProvider initialState={initialState}>
        <App />
      </StoreProvider>
    </BrowserRouter>,
  )
}).catch(() => {
  root.render(<main className="loading" role="alert">Your account couldn’t load. Reload the page to try again.</main>)
})
