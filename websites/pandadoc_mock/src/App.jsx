import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { useWorkspace } from './store.jsx'
import { withSid } from './utils/dataManager.js'
import { items } from './pricing.js'
import { Empty, LocalLink, initials } from './ui.jsx'
import { Documents, Overview } from './register.jsx'
import { Catalog, Contacts, Templates } from './library.jsx'
import { EditorRoute, NewDocument } from './editor.jsx'
import { Sign } from './sign.jsx'

const links = [
  ['/', 'Overview'], ['/documents', 'Documents'], ['/templates', 'Templates'], ['/catalog', 'Catalog'], ['/contacts', 'Contacts'],
]

function Masthead({ signing }) {
  const { state } = useWorkspace()
  const user = items(state.users).find(entry => entry.id === state.workspace?.currentUserId)
  return <header className="masthead">
    <div className="mast-inner">
      {signing ? <span className="wordmark">PandaDoc</span> : <LocalLink className="wordmark" to="/">PandaDoc</LocalLink>}
      {signing ? <span className="mast-workspace">Document review</span> : <>
        <nav aria-label="Workspace navigation">{links.map(([path, label]) =>
          <NavLink key={path} end={path === '/'} to={withSid(path)}>{label}</NavLink>,
        )}</nav>
        <div className="identity">
          <span className="avatar">{initials(user?.name)}</span>
          <div><strong>{user?.name || 'Workspace user'}</strong><span>{state.workspace?.name || 'Workspace'}</span></div>
        </div>
      </>}
    </div>
  </header>
}

export default function App() {
  const { pathname } = useLocation()
  return <>
    <Masthead signing={pathname.startsWith('/sign/')} />
    <Routes>
      <Route path="/" element={<Overview />} />
      <Route path="/documents" element={<Documents />} />
      <Route path="/documents/new" element={<NewDocument />} />
      <Route path="/documents/:documentId" element={<EditorRoute />} />
      <Route path="/templates" element={<Templates />} />
      <Route path="/catalog" element={<Catalog />} />
      <Route path="/contacts" element={<Contacts />} />
      <Route path="/sign/:documentId/:recipientId" element={<Sign />} />
      <Route path="*" element={<main className="page"><Empty title="Page unavailable"><LocalLink to="/">Return to overview</LocalLink></Empty></main>} />
    </Routes>
  </>
}
