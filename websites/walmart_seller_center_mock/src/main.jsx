import { useRef, useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { StoreContext } from './model.js'
import { createInitialData } from './data/seed.js'
import { loadState, saveState } from './utils/dataManager.js'
import './styles.css'

const APP = 'walmart_seller_center'

function Workspace({ initial }) {
  const latest = useRef(initial)
  const [state, setState] = useState(initial)
  const [notice, setNotice] = useState(null)

  function commit(mutation, message) {
    const next = mutation(latest.current)
    if (typeof next === 'string') return next
    if (next === latest.current) return 'There are no changes to save.'
    latest.current = next
    saveState(APP, next)
    setState(next)
    setNotice({ message })
    return ''
  }

  return <StoreContext.Provider value={{ state, commit }}>
    <BrowserRouter><App notice={notice} dismissNotice={() => setNotice(null)} /></BrowserRouter>
  </StoreContext.Provider>
}

const root = createRoot(document.getElementById('root'))
root.render(<main className="boot" role="status">Loading workspace…</main>)
loadState(APP, createInitialData).then(
  (initial) => root.render(<Workspace initial={initial} />),
  () => root.render(<main className="boot"><p>The workspace could not be loaded.</p><button className="button" onClick={() => window.location.reload()}>Retry</button></main>),
)
