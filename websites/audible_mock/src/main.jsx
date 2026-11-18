import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App.jsx'
import { createInitialData } from './data/seed.js'
import { APP, AccountProvider } from './state/AccountProvider.jsx'
import { loadState } from './utils/dataManager.js'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<div className="boot" role="status">Loading your account…</div>)
loadState(APP, createInitialData).then((state) => {
  root.render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AccountProvider initialState={state}>
        <App />
      </AccountProvider>
    </BrowserRouter>,
  )
}).catch(() => {
  root.render(<div className="boot" role="alert">Your account could not load. Refresh to try again.</div>)
})
