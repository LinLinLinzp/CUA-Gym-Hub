import React from 'react'
import {createRoot} from 'react-dom/client'
import {BrowserRouter, Route, Routes} from 'react-router-dom'
import {StoreProvider, APP} from './store.jsx'
import {createHarborSession} from './utils/harborSession.js'
import {Home} from './components/Home.jsx'
import {Workbook} from './components/Workbook.jsx'
import './styles.css'

const root = createRoot(document.getElementById('root'))
async function boot() {
  root.render(<main className="loading" role="status">Loading Excel…</main>)
  let session
  function render(state, pending, connecting = false) {
    root.render(<StoreProvider initial={state} pending={pending} connecting={connecting} session={session}><BrowserRouter><Routes>
      <Route path="/" element={<Home page="home"/>}/>
      <Route path="/create" element={<Home page="create"/>}/>
      <Route path="/my-content" element={<Home page="content"/>}/>
      <Route path="/workbook/:workbookId" element={<Workbook/>}/>
      <Route path="*" element={<Home page="home"/>}/>
    </Routes></BrowserRouter></StoreProvider>)
  }
  try {
    session = createHarborSession(APP, state => render(state, false, true))
    const {state, pending} = await session.load()
    render(state, pending)
  } catch {
    session?.close()
    root.render(<main className="loading">
      <p role="alert">Excel couldn’t load this session.</p>
      <button className="primary" onClick={boot}>Try again</button>
    </main>)
  }
}
boot()
