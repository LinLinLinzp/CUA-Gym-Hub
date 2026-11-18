import { Outlet } from 'react-router-dom'
import { Activity, Missing, PageTitle, SiteLink } from './components/ui.jsx'
import { byId, byRecent, list } from './model.js'
import { useAccount } from './store.jsx'
import { Warehouses, WarehouseDetail } from './pages/Warehouses.jsx'
import { Worksheets, WorksheetDetail } from './pages/Worksheets.jsx'
import { Roles, RoleDetail } from './pages/Roles.jsx'
import { QueryHistory } from './pages/QueryHistory.jsx'

const areas = [
  ['Warehouses', 'warehouses', 'Compute resources', 'warehouse'],
  ['Worksheets', 'worksheets', 'Saved SQL work', 'worksheet'],
  ['Roles', 'roles', 'Account access', 'role'],
]

function MetricIcon({ type }) {
  const paths = {
    warehouse: 'M4 5h16v5H4z M4 14h16v5H4z M8 7.5h.1 M8 16.5h.1',
    worksheet: 'M6 3h8l4 4v14H6z M13 3v5h5 M9 12l-2 2 2 2 M14 12l2 2-2 2',
    role: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z M9 12l2 2 4-4',
  }
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[type]} /></svg>
}

export function Loading() {
  return <main className="loading" role="status">Loading account…</main>
}

export function App() {
  const { state } = useAccount()
  const user = byId(state.users, state.account?.activeUserId)
  const name = user?.displayName ?? user?.name ?? 'Account user'
  const initials = name.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase()
  return <>
    <header className="account-bar">
      <div className="bar-inner">
        <SiteLink to="/" className="wordmark">Snowflake</SiteLink>
        <nav aria-label="Main navigation">
          <SiteLink nav end to="/">Overview</SiteLink>
          {areas.map(([title, path]) => <SiteLink nav key={path} to={'/' + path}>{title}</SiteLink>)}
        </nav>
        <div className="account-identity">
          <div><strong>{state.account?.name ?? 'Account'}</strong><span>{state.account?.locator ?? '—'}</span></div>
          <span className="avatar" title={name} aria-hidden="true">{initials}</span><span className="active-user">{name}</span>
        </div>
      </div>
    </header>
    <main className="container"><Outlet /></main>
  </>
}

function Overview() {
  const { state } = useAccount()
  const started = list(state.warehouses).filter(warehouse => warehouse.status === 'STARTED').length
  const activeGrants = list(state.grants).filter(grant => grant.status === 'ACTIVE').length
  const recent = [...list(state.activity)].sort(byRecent).slice(0, 5)
  return <>
    <PageTitle title="Account overview" description={[state.account?.name, state.account?.region].filter(Boolean).join(' · ')} />
    <section className="metrics" aria-label="Account resources">
      {areas.map(([title, path, summary, icon]) => <SiteLink to={'/' + path} className="metric" key={path}>
        <span className="metric-icon"><MetricIcon type={icon} /></span>
        <span className="metric-label">{title}</span>
        <strong>{list(state[path]).length}</strong>
        <span className="muted">{summary}</span><span className="metric-arrow" aria-hidden="true">↗</span>
      </SiteLink>)}
    </section>
    <div className="detail-grid overview-panels">
      <section className="panel"><h2>Recent account activity</h2><Activity items={recent} users={list(state.users)} /></section>
      <aside className="panel"><h2>Account details</h2><dl className="details">
        <div><dt>Account locator</dt><dd className="mono">{state.account?.locator ?? '—'}</dd></div>
        <div><dt>Started warehouses</dt><dd>{started}</dd></div>
        <div><dt>Active grants</dt><dd>{activeGrants}</dd></div>
        <div><dt>Active role</dt><dd className="mono">{byId(state.roles, state.account?.activeRoleId)?.name ?? '—'}</dd></div>
      </dl></aside>
    </div>
  </>
}

export const routes = [
  { index: true, element: <Overview /> },
  { path: 'warehouses', element: <Warehouses /> },
  { path: 'warehouses/:id', element: <WarehouseDetail /> },
  { path: 'worksheets', element: <Worksheets /> },
  { path: 'worksheets/:id', element: <WorksheetDetail /> },
  { path: 'roles', element: <Roles /> },
  { path: 'roles/:id', element: <RoleDetail /> },
  { path: 'query-history', element: <QueryHistory /> },
  { path: '*', element: <Missing /> },
]
