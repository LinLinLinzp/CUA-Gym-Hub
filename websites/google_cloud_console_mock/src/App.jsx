import React, { useEffect, useRef, useState } from 'react'
import { NavLink, Route, Routes, useLocation, useMatch } from 'react-router-dom'
import { Icon } from './icons.jsx'
import { Missing, Select } from './components.jsx'
import { byId, RouteLink, useGo, useRoutePath, useScope, useWorkspace } from './workspace.jsx'
import { Overview } from './pages/Overview.jsx'
import { IAM } from './pages/IAM.jsx'
import { Instances, InstanceDetail } from './pages/Compute.jsx'
import { Buckets, BucketDetail } from './pages/Storage.jsx'
import { Billing } from './pages/Billing.jsx'

const navigation = [
  ['/', 'overview', 'Overview'], ['/iam', 'iam', 'IAM'],
  ['/compute/instances', 'compute', 'VM instances'], ['/storage/buckets', 'storage', 'Buckets'],
  ['/billing', 'billing', 'Billing'],
]
const clearFilters = { tab: null, reportProject: null, reportThrough: null }

export function App() {
  const { pathname, search } = useLocation()
  const vm = useMatch('/compute/instances/:vmId')
  const bucket = useMatch('/storage/buckets/:bucketId')
  const billing = pathname === '/billing' || pathname.startsWith('/billing/')
  const { state } = useWorkspace()
  const inferred = byId(state.vmInstances, vm?.params.vmId)?.projectId || byId(state.buckets, bucket?.params.bucketId)?.projectId
  const project = useScope('project', inferred)
  const account = useScope('account')
  const to = useRoutePath()
  const go = useGo()
  const [menu, setMenu] = useState(false)
  const menuTrigger = useRef(null)
  const rail = useRef(null)
  const person = state.currentUser?.displayName || state.currentUser?.email || 'Account user'
  const initials = person.split(/\s+/).slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('')

  useEffect(() => {
    const heading = document.querySelector('main h1')
    heading?.setAttribute('tabindex', '-1')
    heading?.focus({ preventScroll: true })
  }, [pathname])

  useEffect(() => {
    if (menu) (rail.current?.querySelector('nav .active') || rail.current?.querySelector('nav a'))?.focus()
  }, [menu])

  return <div className="shell">
    <a className="skip-link" href="#workspace">Skip to workspace</a>
    <aside id="product-nav" ref={rail} onKeyDown={e => {
      if (e.key === 'Escape' && menu) {
        setMenu(false)
        menuTrigger.current?.focus()
      }
    }} className={'rail' + (menu ? ' open' : '')}>
      <RouteLink to="/" scope={{ ...clearFilters, project: project.id }} className="brand" onClick={() => setMenu(false)}><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span> Google Cloud Console</RouteLink>
      <nav aria-label="Products">{navigation.map(([path, icon, label]) => <NavLink key={path} end={path === '/'} to={to(path, { ...clearFilters, project: project.id })} onClick={() => setMenu(false)}>
        <Icon name={icon} />{label}
      </NavLink>)}</nav>
    </aside>
    <div className="work-area">
      <header className="topbar">
        <button ref={menuTrigger} className="icon-button mobile-nav" type="button" aria-label="Toggle navigation" aria-controls="product-nav" aria-expanded={menu} onClick={() => setMenu(!menu)}><Icon name="menu" /></button>
        {billing ? <div className="scope-control"><label htmlFor="account-scope">Billing account</label><Select id="account-scope" value={account.record ? account.id : ''} options={account.options.map(r => [r.id, r.name || r.id])} placeholder={account.record ? undefined : 'Select an account'} onChange={e => go(pathname, { account: e.target.value })} /></div>
          : <div className="scope-control"><label htmlFor="project-scope">Project</label><Select id="project-scope" value={project.record ? project.id : ''} options={project.options.map(r => [r.id, r.name || r.id])} placeholder={project.record ? undefined : 'Select a project'} onChange={e => go(vm ? '/compute/instances' : bucket ? '/storage/buckets' : pathname, { project: e.target.value })} /></div>}
        <div className="identity"><span className="avatar" aria-hidden="true">{initials}</span><span title={state.currentUser?.email}>{person}</span></div>
      </header>
      <main id="workspace" className="workspace" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Overview key={project.id} project={project} />} />
          <Route path="/iam" element={<IAM key={project.id} project={project} />} />
          <Route path="/compute/instances" element={<Instances key={project.id} project={project} />} />
          <Route path="/compute/instances/:vmId" element={<InstanceDetail key={pathname + search} project={project} />} />
          <Route path="/storage/buckets" element={<Buckets key={project.id} project={project} />} />
          <Route path="/storage/buckets/:bucketId" element={<BucketDetail key={pathname + search} project={project} />} />
          <Route path="/billing/*" element={<Billing key={account.id} account={account} />} />
          <Route path="*" element={<Missing message="Page unavailable"><RouteLink to="/">Back to Overview</RouteLink></Missing>} />
        </Routes>
      </main>
    </div>
  </div>
}
