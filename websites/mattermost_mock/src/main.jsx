import { createRoot } from 'react-dom/client'
import '@fontsource/open-sans/latin-400.css'
import '@fontsource/open-sans/latin-600.css'
import '@fontsource/open-sans/latin-700.css'
import './styles.css'
import { App } from './App.jsx'
import { UploadQueueProvider } from './components/UploadQueue.jsx'
import { APP, StoreProvider } from './store.jsx'
import { createInitialData } from './data/seed.js'
import { FeedbackProvider } from './components/Feedback.jsx'
import { loadState, withSid } from './utils/dataManager.js'
import { createStateTransport } from './utils/stateTransport.js'

const root = createRoot(document.getElementById('root'))
root.render(<main className="loading" role="status">Loading Mattermost…</main>)

async function start() {
  try {
    const transport = createStateTransport({
      app: APP, postUrl: withSid('/post'), storage: sessionStorage, fetch: window.fetch.bind(window),
    })
    window.fetch = transport.intercept
    const initial = await loadState(APP, createInitialData)
    root.render(<StoreProvider initial={transport.restore(initial)} transport={transport}>
      <FeedbackProvider><UploadQueueProvider><App /></UploadQueueProvider></FeedbackProvider>
    </StoreProvider>)
  } catch {
    root.render(<main role="alert">Mattermost could not load. Reload to try again.</main>)
  }
}

start()
