import { Route, Routes } from 'react-router-dom'
import { WorkspaceLink, ViewHeader, Empty } from './components'
import { formatDate, newestFirst, useWorkspace } from './workspace'
import Authentication from './pages/Authentication'
import Firestore from './pages/Firestore'
import Rules from './pages/Rules'
import Hosting from './pages/Hosting'

const products = [
  { path: '/authentication', label: 'Authentication', icon: 'auth', count: 'authUsers', unit: 'users' },
  { path: '/firestore', label: 'Firestore', icon: 'data', count: 'firestoreCollections', unit: 'collections' },
  { path: '/firestore/rules', label: 'Rules', icon: 'rules', count: 'ruleVersions', unit: 'versions' },
  { path: '/hosting', label: 'Hosting', icon: 'hosting', count: 'hostingSites', unit: 'sites' },
]

function ServiceIcon({ name }) {
  return <span className={`service-icon ${name}`} aria-hidden="true"><i /></span>
}

function Overview() {
  const { state } = useWorkspace()
  const { project, operator } = state
  const recent = state.activity.filter((event) => event.projectId === project.id).sort(newestFirst).slice(0, 7)
  return <>
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">Project overview</p>
        <h1 tabIndex={-1} id="view-title">{project.name || project.id}</h1>
        <p className="hero-description">Manage the accounts, data and releases behind your project.</p>
        <div className="hero-meta">
          <span><span className="meta-label">Project ID</span><code>{project.id}</code></span>
          {project.region && <span><span className="meta-label">Region</span>{project.region}</span>}
        </div>
      </div>
      <div className="project-diagram" aria-hidden="true">
        <div className="diagram-hub"><span /><span /><span /></div>
        {products.map(({ icon }) => <div key={icon} className={`diagram-node node-${icon}`}><ServiceIcon name={icon} /></div>)}
      </div>
    </section>
    <section className="service-grid" aria-label="Project products">
      {products.map(({ path, label, icon, count, unit }) => {
        const total = state[count].filter((row) => row.projectId === project.id).length
        return <WorkspaceLink key={path} to={path} className="service-card">
          <div className="service-top"><ServiceIcon name={icon} /><span className="service-arrow" aria-hidden="true">↗</span></div>
          <h2>{label}</h2><p><strong>{total}</strong> {total === 1 ? unit.slice(0, -1) : unit}</p>
        </WorkspaceLink>
      })}
    </section>
    <section className="panel">
      <header className="panel-heading"><h2>Recent activity</h2></header>
      {recent.length ? <ul className="activity-list">{recent.map((event) => (
        <li key={event.id}>
          <ServiceIcon name={products.find(({ path }) => {
            const product = event.action?.split('.')[0]
            return path === ({ auth: '/authentication', firestore: '/firestore', rules: '/firestore/rules', hosting: '/hosting' })[product]
          })?.icon || 'data'} />
          <div><strong>{activityLabels[event.action] || event.action || 'Workspace update'}</strong>
            <div className="muted activity-target">{event.details?.email || event.details?.hostname || event.targetId || '—'}</div></div>
          <small>{event.actorId === operator.id ? operator.displayName || operator.id : event.actorId || '—'}</small>
          <small>{formatDate(event.createdAt, true)}</small>
        </li>
      ))}</ul> : <Empty>No project activity yet.</Empty>}
    </section>
  </>
}

const activityLabels = {
  'auth.user.create': 'User added', 'auth.user.delete': 'User deleted', 'auth.user.enable': 'User enabled', 'auth.user.disable': 'User disabled',
  'firestore.collection.create': 'Collection created', 'firestore.collection.delete': 'Collection deleted',
  'firestore.document.create': 'Document created', 'firestore.document.delete': 'Document deleted',
  'firestore.field.add': 'Field added', 'firestore.field.update': 'Field updated', 'firestore.field.delete': 'Field deleted',
  'rules.publish': 'Rules published', 'rules.restore': 'Rules restored',
  'hosting.release.deploy': 'Release deployed', 'hosting.release.rollback': 'Release rolled back',
  'hosting.domain.add': 'Domain added', 'hosting.domain.remove': 'Domain removed',
}

export default function App() {
  const { state: { project, operator }, notice, dismissNotice } = useWorkspace()
  const initials = (operator.displayName || operator.id || 'Operator').split(/\s+/).filter(Boolean).slice(0, 2).map((name) => name[0]).join('').toUpperCase()
  return <>
    <a href="#main" className="skip-link">Skip to content</a>
    <header className="masthead">
      <div className="frame masthead-inner">
        <WorkspaceLink to="/" className="wordmark" aria-label="Firebase overview">Firebase</WorkspaceLink>
        <span className="masthead-project">{project.name || project.id}</span>
        <div className="operator" title={operator.email || undefined}>
          <span className="avatar" aria-hidden="true">{initials}</span>
          <span>{operator.displayName || operator.email || operator.id}</span>
        </div>
      </div>
    </header>
    <nav className="tabs" aria-label="Project navigation">
      <div className="frame tab-list">
        <WorkspaceLink tab end to="/">Overview</WorkspaceLink>
        {products.map(({ path, label }) => <WorkspaceLink tab end key={path} to={path}>{label}</WorkspaceLink>)}
      </div>
    </nav>
    <main className="frame main" id="main">
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/authentication" element={<Authentication />} />
        <Route path="/firestore" element={<Firestore />} />
        <Route path="/firestore/rules" element={<Rules />} />
        <Route path="/hosting" element={<Hosting />} />
        <Route path="*" element={<><ViewHeader title="Page not found" /><WorkspaceLink to="/">Return to Overview</WorkspaceLink></>} />
      </Routes>
    </main>
    <div className="notice-region" role="status" aria-live="polite">
      {notice && <div className="notice" key={notice.id}><span>{notice.message}</span><button className="icon-button" type="button" onClick={dismissNotice} aria-label="Dismiss notification">×</button></div>}
    </div>
  </>
}
