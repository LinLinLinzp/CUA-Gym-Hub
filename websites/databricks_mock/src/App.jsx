import { useEffect, useState } from 'react'
import { Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useWorkspace } from './store.jsx'
import { Header, SiteLink, Status, sections } from './ui.jsx'
import { actionLabel, dateLabel, list, newest, routeId } from './model.js'
import { NotebookEditor, NotebookList } from './notebooks.jsx'
import { JobDetails, JobList, RunDetails } from './jobs.jsx'
import { ClusterDetails, ClusterList } from './clusters.jsx'
import { getSessionId } from './utils/dataManager.js'
import './styles.css'

function Shell() {
  const { state } = useWorkspace()
  const name = state.currentUser?.name ?? 'Workspace user'
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('')
  return <>
    <a href="#main" className="skip">Skip to content</a>
    <header className="masthead">
      <div className="brand-row width">
        <div className="identity"><SiteLink to="/" className="brand">Databricks</SiteLink>
          <span className="workspace-name">{state.workspace?.name ?? 'Acme Analytics'}</span></div>
        <div className="identity user"><span className="user-name">{name}</span><span className="avatar" aria-hidden="true">{initials}</span></div>
      </div>
      <nav className="width navigation" aria-label="Workspace navigation">
        <SiteLink nav end to="/">Overview</SiteLink>
        {Object.values(sections).map(({ to, label }) => <SiteLink nav key={to} to={to}>{label}</SiteLink>)}
      </nav>
    </header>
    <main id="main" className="width content"><Outlet /></main>
  </>
}

function Overview() {
  const { state } = useWorkspace()
  const notebooks = list(state.notebooks)
  const jobs = list(state.jobs)
  const clusters = list(state.clusters)
  const running = clusters.filter((cluster) => cluster.status === 'running')
  const events = newest([...list(state.activity), ...list(state.clusterEvents).map((event) => ({
    ...event, entityType: 'compute', entityId: event.clusterId, entityName: event.clusterName,
  }))]).slice(0, 8)
  const summaries = [
    { label: 'Notebooks', count: notebooks.length, detail: 'Workspace', to: '/workspace', mark: '▤' },
    { label: 'Jobs', count: jobs.length, detail: jobs.filter((job) => job.schedule && !job.schedule.paused).length + ' scheduled', to: '/jobs', mark: '↳' },
    { label: 'Compute', count: running.length, detail: 'Running clusters', to: '/compute', mark: '▥' },
  ]
  return <>
    <section className="hero panel">
      <div className="hero-inner">
        <div className="eyebrow"><span /> Workspace overview</div>
        <h1>{state.workspace?.name ?? 'Acme Analytics'}</h1>
        <p>Explore data in notebooks, automate jobs, and manage compute.</p>
        <div className="actions">
          <SiteLink className="button primary" to="/workspace?new=notebook">+ New notebook</SiteLink>
          <SiteLink className="button" to="/jobs?new=job">+ Create job</SiteLink>
          <SiteLink className="button" to="/compute?new=cluster">+ Create compute</SiteLink>
        </div>
      </div>
    </section>
    <section className="metrics" aria-label="Workspace totals">
      {summaries.map((item) => <SiteLink className="panel metric" to={item.to} key={item.to}>
        <span className="metric-mark" aria-hidden="true">{item.mark}</span><span className="metric-arrow" aria-hidden="true">↗</span>
        <span className="metric-label">{item.label}</span>
        <strong>{item.count}</strong><small>{item.detail}</small>
      </SiteLink>)}
    </section>
    <div className="overview-grid">
      <section className="panel"><div className="panel-head"><h2>Recent activity</h2></div>
        {events.length ? <ul className="overview-list">{events.map((event) => {
          const group = event.entityType === 'notebook' ? 'workspace' : event.entityType === 'job' ? 'jobs' : 'compute'
          const to = group === 'workspace' ? '/workspace/notebooks/' : '/' + group + '/'
          return <li key={event.id}><span className="event-mark" aria-hidden="true">↳</span><div>
            <SiteLink to={to + routeId(event.entityId)}>{event.entityName ?? 'Untitled'}</SiteLink>
            <small>{actionLabel(event.entityType, event.action)}</small></div><time>{dateLabel(event.createdAt)}</time></li>
        })}</ul> : <p className="pad muted">No activity yet.</p>}
      </section>
      <section className="panel"><div className="panel-head"><h2>Running compute</h2><SiteLink to="/compute">View all</SiteLink></div>
        {running.length ? <ul className="overview-list">{running.slice(0, 5).map((cluster) => <li key={cluster.id}>
          <div><SiteLink to={'/compute/' + routeId(cluster.id)}>{cluster.name ?? 'Untitled'}</SiteLink><small>{cluster.runtime ?? '—'}</small></div>
          <Status value={cluster.status} /></li>)}</ul> : <p className="pad muted">No running clusters.</p>}
      </section>
    </div>
  </>
}

export default function App() {
  const location = useLocation()
  const [notebookDrafts, setNotebookDrafts] = useState(() => new Map())
  const draftKey = JSON.stringify([getSessionId(), location.pathname])
  function setNotebookDraft(cells) {
    setNotebookDrafts((drafts) => {
      const next = new Map(drafts)
      if (cells === null) next.delete(draftKey)
      else next.set(draftKey, cells)
      return next
    })
  }
  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])
  return <Routes>
    <Route element={<Shell />}>
      <Route index element={<Overview />} />
      <Route path="workspace" element={<NotebookList />} />
      <Route path="workspace/notebooks/:notebookId" element={<NotebookEditor key={draftKey}
        draft={notebookDrafts.get(draftKey)} setDraft={setNotebookDraft} />} />
      <Route path="jobs" element={<JobList />} />
      <Route path="jobs/:jobId" element={<JobDetails key={location.pathname} />} />
      <Route path="jobs/:jobId/runs/:runId" element={<RunDetails />} />
      <Route path="compute" element={<ClusterList />} />
      <Route path="compute/:clusterId" element={<ClusterDetails key={location.pathname} />} />
      <Route path="*" element={<Header title="Page unavailable"><SiteLink to="/">Return to Overview</SiteLink></Header>} />
    </Route>
  </Routes>
}
