import React from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { LocalLink, list, useWorkspace } from './workspace.jsx'
import { Button, Icon, Empty } from './ui.jsx'
import { Tables } from './Tables.jsx'
import { Auth } from './Auth.jsx'
import { Storage } from './Storage.jsx'
import { Policies } from './Policies.jsx'

const sections = [
  { route: '/', title: 'Overview', icon: 'overview' },
  { route: '/tables', title: 'Tables', icon: 'tables', key: 'tables', unit: 'tables', description: 'Browse schemas, edit columns, and work with records.' },
  { route: '/auth/users', title: 'Authentication', icon: 'users', key: 'authUsers', unit: 'users', description: 'Manage project accounts, invitations, and sign-in access.' },
  { route: '/storage', title: 'Storage', icon: 'storage', key: 'buckets', unit: 'buckets', description: 'Organize files and set bucket upload restrictions.' },
  { route: '/policies', title: 'Policies', icon: 'policies', key: 'policies', unit: 'policies', description: 'Configure row-level access for tables and buckets.' },
]

function Overview() {
  const { state } = useWorkspace()
  return <>
    <section className="hero">
      <div className="hero-content">
        <div className="eyebrow">{state.project?.organization || 'Project workspace'}</div>
        <h1>{state.project?.name || 'Project'} overview</h1>
        <p>Manage your project’s data, accounts, files, and access rules.</p>
        <div className="project-id"><span>Project ID</span><code>{state.project?.id || '—'}</code></div>
      </div>
    </section>
    <section className="areas" aria-labelledby="areas-title">
      <h2 id="areas-title">Project tools</h2>
      <div className="overview-grid">{sections.slice(1).map(section =>
        <LocalLink key={section.route} className="area-card" to={section.route}>
          <div className="area-top"><span className="area-icon"><Icon name={section.icon} size={22} /></span><Icon name="arrow" /></div>
          <h3>{section.title}</h3><p>{section.description}</p>
          <div className="area-count"><strong>{list(state[section.key]).length.toLocaleString('en-US')}</strong> {section.unit}</div>
        </LocalLink>
      )}</div>
    </section>
  </>
}

export function App() {
  const { state, notice, clearNotice } = useWorkspace()
  const { pathname } = useLocation()
  const operator = state.currentUser?.name || 'Project operator'
  const initials = operator.split(/\s+/).slice(0, 2).map(word => word[0]).join('')
  return <>
    <a className="skip" href="#main">Skip to content</a>
    <header className="utility"><div className="frame utility-inner">
      <LocalLink to="/" className="wordmark">Supabase</LocalLink>
      <div className="project"><Icon name="chevron" size={14} />{state.project?.name || 'Project'}</div>
      <div className="operator"><span className="initials" aria-hidden="true">{initials}</span><span>{operator}</span></div>
    </div></header>
    <nav className="navigation" aria-label="Project navigation"><div className="frame nav-inner">
      {sections.map(section => <LocalLink nav end={section.route === '/'} key={section.route} to={section.route}><Icon name={section.icon} />{section.title}</LocalLink>)}
    </div></nav>
    <main id="main" tabIndex={-1} className="frame main" key={pathname.split('/')[1]}>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/tables" element={<Tables />} />
        <Route path="/tables/:tableId" element={<Tables />} />
        <Route path="/auth/users" element={<Auth />} />
        <Route path="/storage" element={<Storage />} />
        <Route path="/storage/:bucketId" element={<Storage />} />
        <Route path="/policies" element={<Policies />} />
        <Route path="*" element={<Empty title="Page unavailable"><LocalLink to="/">Back to project overview</LocalLink></Empty>} />
      </Routes>
    </main>
    {notice && <div className="toast" key={notice.id}><span role="status"><Icon name="check" />{notice.message}</span>
      <Button aria-label="Dismiss notification" variant="quiet" icon="close" onClick={clearNotice} />
    </div>}
  </>
}
