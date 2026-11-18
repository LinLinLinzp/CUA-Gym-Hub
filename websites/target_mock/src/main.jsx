import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { boot } from './store.jsx'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<main className="container page" role="status">Loading Target…</main>)

boot().then((state) => {
  root.render(<App initialState={state} />)
}).catch(() => {
  root.render(<main className="container page"><h1>Target couldn’t load</h1><p>Please reload to try again.</p></main>)
})
