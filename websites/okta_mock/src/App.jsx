import { BrowserRouter, Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { Store, useWorkspace } from './state'
import { Directory } from './Directory'
import { Details } from './Details'

import { directories, Missing, useRouteLink } from './routes'

function Workspace() {
  const { state, notice } = useWorkspace()
  const to = useRouteLink()
  const { pathname } = useLocation()
  const { name = 'Acme Workspace', admin = {} } = state.workspace
  const initials = (admin.name || 'Admin').split(/\s+/).map(part => part[0]).slice(0, 2).join('')
  return <>
    <a className="skip-link" href="#work-area">Skip to content</a>
    <header className="masthead">
      <div className="mast-inner">
        <div className="identity">
          <Link className="wordmark" to={to('/')}>Okta</Link>
          <span className="workspace-name">{name}</span>
        </div>
        <nav className="primary-nav" aria-label="Workspace navigation">
          {Object.entries(directories).map(([kind, { title, path }]) =>
            <NavLink key={kind} to={to(path)} className={({ isActive }) =>
              isActive || (kind === 'people' && pathname === '/') ? 'selected' : ''
            } aria-current={kind === 'people' && pathname === '/' ? 'page' : undefined}>{title}</NavLink>
          )}
        </nav>
        <div className="admin" title={admin.email}>
          <span className="tile admin-tile" aria-hidden="true">{initials}</span>
          <div><strong>{admin.name || 'Administrator'}</strong><small>{admin.role || 'Organization Administrator'}</small></div>
        </div>
      </div>
    </header>
    <main id="work-area" className="work-area" tabIndex={-1}>
      <Routes>
        <Route path="/" element={<Directory key="home" kind="people" />} />
        {Object.entries(directories).map(([kind, section]) => <Route key={kind} path={section.path}>
          <Route index element={<Directory key={kind} kind={kind} />} />
          <Route path=":id" element={<Details key={kind} kind={kind} />} />
        </Route>)}
        <Route path="*" element={<Missing />} />
      </Routes>
    </main>
    <div role="status" className={notice ? 'notice' : 'sr-only'}>{notice}</div>
  </>
}

export function App() {
  return <BrowserRouter><Store><Workspace /></Store></BrowserRouter>
}
