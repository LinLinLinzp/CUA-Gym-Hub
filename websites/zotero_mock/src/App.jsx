import { Link, Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { useStore } from './store.jsx'
import { active, records } from './utils/model.js'
import { appPath, libraryPath } from './utils/routes.js'
import { Empty } from './components/ui.jsx'
import { Directory } from './components/Libraries.jsx'
import Workspace from './components/Workspace.jsx'
import { CitationHistory } from './components/Citations.jsx'

export default function App() {
  const { state, message, announce } = useStore()
  const homeLibrary = records(state.libraries).find((library) => active(library) && library.kind === 'personal')
  const accountName = state.account?.name || state.account?.email || 'Research account'
  const initials = accountName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')

  return <>
    <header className="site-header">
      <div className="header-inner">
        <Link className="wordmark" to={appPath('/')}>Zotero</Link>
        <nav aria-label="Main navigation">
          <NavLink to={appPath('/libraries')}>Libraries</NavLink>
          <NavLink to={appPath('/citations')}>Citations</NavLink>
        </nav>
        <div className="identity" title={state.account?.email}><span className="initials" aria-hidden="true">{initials}</span><span>{accountName}</span></div>
      </div>
    </header>
    <main className="page">
      <Routes>
        <Route path="/" element={<Navigate replace to={homeLibrary ? libraryPath(homeLibrary.id) : appPath('/libraries')} />} />
        <Route path="/libraries" element={<Directory />} />
        <Route path="/libraries/:libraryId" element={<Workspace />} />
        <Route path="/libraries/:libraryId/collections/:collectionId" element={<Workspace />} />
        <Route path="/libraries/:libraryId/items/:itemId" element={<Workspace />} />
        <Route path="/citations" element={<CitationHistory />} />
        <Route path="*" element={<Empty title="Page unavailable"><Link to={appPath('/libraries')}>Browse libraries</Link></Empty>} />
      </Routes>
    </main>
    <div className="feedback" role="status" aria-live="polite">
      {message && <div className={message.kind === 'error' ? 'notice notice-error' : 'notice'}>
        <span>{message.text}</span><button className="icon-button" type="button" aria-label="Dismiss message" onClick={() => announce(null)}>×</button>
      </div>}
    </div>
  </>
}
