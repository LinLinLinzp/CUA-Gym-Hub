import { useEffect, useRef } from 'react'
import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router-dom'
import { WorkspaceProvider, useWorkspace } from './workspace.jsx'
import { LedgerPage } from './lists.jsx'
import { RecordDetail } from './details.jsx'
import { Overview } from './overview.jsx'
import { sections, useSiteLink } from './ui.jsx'

function Masthead() {
  const { state } = useWorkspace()
  const siteLink = useSiteLink()
  const name = state.currentUser?.name || 'Workspace user'
  const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join('')
  return <header className="masthead">
    <div className="masthead-inner">
      <div className="workspace-brand"><Link className="brand" to={siteLink('/')}>Brex</Link><span className="workspace-name">{state.workspace?.name || 'Workspace'}</span></div>
      <nav aria-label="Workspace">{sections.map(({ path, name: title }) => <NavLink key={path} to={siteLink(path)} end={path === '/'}>{title}</NavLink>)}</nav>
      <div className="account"><span className="avatar" aria-hidden="true">{initials}</span><span>{name}</span></div>
    </div>
  </header>
}

function Main() {
  const main = useRef(null)
  useEffect(() => {
    document.title = 'Brex'
  }, [])
  const siteLink = useSiteLink()
  return <>
    <a className="skip-link" href="#workspace-main" onClick={event => { event.preventDefault(); main.current?.focus() }}>Skip to content</a>
    <Masthead />
    <main id="workspace-main" ref={main} tabIndex={-1}>
      <Routes>
        <Route index element={<Overview />} />
        {sections.filter(section => section.entity).map(section => <Route key={section.entity} path={section.path} element={<LedgerPage key={section.entity} section={section} />}>
          <Route path=":id" element={<RecordDetail key={section.entity} section={section} />} />
        </Route>)}
        <Route path="*" element={<div className="empty"><h1>Page unavailable</h1><Link to={siteLink('/')}>Return to overview</Link></div>} />
      </Routes>
    </main>
  </>
}

export function App({ initialState }) {
  return <WorkspaceProvider initialState={initialState}><BrowserRouter useTransitions={false}><Main /></BrowserRouter></WorkspaceProvider>
}
