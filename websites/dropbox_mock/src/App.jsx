import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Archive, Files, Inbox, Search, Users } from 'lucide-react'
import { useState } from 'react'
import { useStore } from './store'
import { withSid } from './utils/dataManager'
import { Empty, userName } from './ui'
import { FilesPage, DeletedPage } from './pages/Files'
import { PreviewPage, SharedLinkPage } from './pages/Preview'
import { SharedPage } from './pages/Shared'
import { RequestsPage, RequestPage, ReceivePage } from './pages/Requests'

const tabs = [
  ['/files', 'Files', Files],
  ['/shared', 'Shared', Users],
  ['/requests', 'File requests', Inbox],
  ['/deleted', 'Deleted files', Archive],
]

export function App() {
  const { state } = useStore()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const [accountOpen, setAccountOpen] = useState(false)
  const recipient = pathname.startsWith('/receive/') || pathname.startsWith('/shared-link/')
  const active = tabs.find(([path]) => pathname === path || pathname.startsWith(path + '/'))?.[0] || '/files'
  const name = userName(state, state.account?.userId)
  const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
  const searchValue = new URLSearchParams(search).get('q') || ''

  return <>
    <header className="header">
      <div className="header-inner">
        <Link className="brand" to={withSid('/files')}>Dropbox</Link>
        {!recipient && <>
          <nav aria-label="Workspace">
            {tabs.map(([path, label, Icon]) => <Link key={path} to={withSid(path)} aria-current={active === path ? 'page' : undefined}><Icon size={17} />{label}</Link>)}
          </nav>
          <form key={searchValue} className="search" role="search" onSubmit={event => {
            event.preventDefault()
            const value = event.currentTarget.elements.query.value.trim()
            navigate(withSid('/files' + (value ? '?q=' + encodeURIComponent(value) : '')))
          }}>
            <button type="submit" aria-label="Run search"><Search size={17} /></button>
            <input id="workspace-search" name="query" type="search" aria-label="Search files and folders" placeholder="Search files and folders" defaultValue={searchValue} />
          </form>
          <button className="avatar account" aria-label={'Account for ' + name} aria-expanded={accountOpen} onClick={() => setAccountOpen(!accountOpen)}>{initials}
            {accountOpen && <span className="account-info"><strong>{name}</strong><span>{state.account?.teamName || 'Dropbox workspace'}</span></span>}
          </button>
        </>}
      </div>
    </header>
    <main className={'canvas' + (recipient ? ' recipient' : '')}>
      <Routes>
        <Route path="/" element={<FilesPage key={pathname + search} />} />
        <Route path="/files" element={<FilesPage key={pathname + search} />} />
        <Route path="/folder/:id" element={<FilesPage key={pathname + search} />} />
        <Route path="/file/:id" element={<PreviewPage key={pathname} />} />
        <Route path="/file/:id/versions" element={<PreviewPage history key={pathname} />} />
        <Route path="/shared" element={<SharedPage />} />
        <Route path="/requests" element={<RequestsPage />} />
        <Route path="/requests/:id" element={<RequestPage key={pathname} />} />
        <Route path="/receive/:token" element={<ReceivePage key={pathname} />} />
        <Route path="/shared-link/:token" element={<SharedLinkPage key={pathname} />} />
        <Route path="/deleted" element={<DeletedPage />} />
        <Route path="*" element={<Empty title="Page unavailable" text="Open the file index to continue." action={<Link className="button" to={withSid('/files')}>All files</Link>} />} />
      </Routes>
    </main>
  </>
}
