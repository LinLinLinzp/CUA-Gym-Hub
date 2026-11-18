import { useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { byId, useStore } from './store.jsx'
import { AppLink, AppNav, Icon, Missing, useDestination } from './ui.jsx'
import { PackageDetail, PackageInventory } from './pages/Packages.jsx'
import { TokenDetail, TokenForm, TokenInventory } from './pages/Tokens.jsx'
import { OrganizationDetail, OrganizationForm, OrganizationInventory } from './pages/Organizations.jsx'

const areas = [
  ['/packages', 'Packages', 'packages'],
  ['/access-tokens', 'Access Tokens', 'tokens'],
  ['/organizations', 'Organizations', 'organizations'],
]
const decodeSegment = (value) => { try { return decodeURIComponent(value) } catch { return value } }
const segments = { new: 'Create', settings: 'Settings', packages: 'Packages', members: 'Members', teams: 'Teams' }

function Breadcrumbs() {
  const { pathname, search } = useLocation()
  const { world } = useStore()
  const [, area, id, view, teamId] = pathname.split('/')
  const path = '/' + area
  const section = areas.find(([to]) => to === path)
  const items = section ? [[path, section[1]]] : []
  if (id === 'new' && area !== 'packages') {
    items.push([pathname, area === 'access-tokens' ? 'Generate token' : 'Create organization'])
  } else if (id) {
    const decoded = decodeSegment(id)
    const record = area === 'packages' ? byId(world.packages, decoded)
      : area === 'access-tokens' ? byId(world.tokens, decoded) : byId(world.organizations, decoded)
    items.push([path + '/' + id, record?.name || 'Details'])
    if (view) items.push([path + '/' + id + '/' + view, segments[view] || 'Details'])
    if (teamId) items.push([pathname, byId(world.teams, decodeSegment(teamId))?.name || 'Team'])
    if (area === 'packages' && new URLSearchParams(search).get('tab') === 'versions') items.push([pathname, 'Versions'])
  }
  return <nav aria-label="Breadcrumb" className="breadcrumbs"><ol>
    <li>Registry</li>
    {items.map(([to, name], index) => <li key={to + name}>
      {index < items.length - 1 ? <AppLink to={to}>{name}</AppLink> : <span aria-current="page">{name}</span>}
    </li>)}
  </ol></nav>
}

function Shell() {
  const { world, notice, setNotice } = useStore()
  const { pathname } = useLocation()
  const accountName = world.account.displayName || world.account.username || 'Account'
  const initials = accountName.split(/\s+/).slice(0, 2).map(part => part[0]).join('')
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return <div className="workspace">
    <a className="skip" href="#content">Skip to content</a>
    <aside className="rail">
      <AppLink className="wordmark" to="/packages" aria-label="npm home">npm</AppLink>
      <nav aria-label="Account navigation" className="rail-nav">
        {areas.map(([to, label, glyph]) => <AppNav key={to} to={to}><Icon name={glyph} />{label}</AppNav>)}
      </nav>
      <div className="rail-account"><div className="avatar">{initials}</div><div><strong>{accountName}</strong><small>{world.account.username ? '@' + world.account.username : 'Signed in'}</small></div></div>
    </aside>
    <div className="main-column">
      <header className="context-bar"><Breadcrumbs /><span className="context-account"><i />Account workspace</span></header>
      <main id="content" className="content"><Outlet /></main>
      {notice && <div className="notice" role="status"><span>{notice}</span><button type="button" className="icon-button" aria-label="Dismiss notification" onClick={() => setNotice(null)}>×</button></div>}
    </div>
  </div>
}

export function App() {
  const destination = useDestination()
  return <Routes>
    <Route element={<Shell />}>
      <Route index element={<Navigate to={destination('/packages')} replace />} />
      <Route path="packages" element={<PackageInventory />} />
      <Route path="packages/:packageId" element={<PackageDetail />} />
      <Route path="packages/:packageId/settings" element={<PackageDetail settings />} />
      <Route path="access-tokens" element={<TokenInventory />} />
      <Route path="access-tokens/new" element={<TokenForm />} />
      <Route path="access-tokens/:tokenId" element={<TokenDetail />} />
      <Route path="organizations" element={<OrganizationInventory />} />
      <Route path="organizations/new" element={<OrganizationForm />} />
      <Route path="organizations/:organizationId" element={<OrganizationDetail />} />
      <Route path="organizations/:organizationId/members" element={<OrganizationDetail view="members" />} />
      <Route path="organizations/:organizationId/teams" element={<OrganizationDetail view="teams" />} />
      <Route path="organizations/:organizationId/teams/:teamId" element={<OrganizationDetail view="team" />} />
      <Route path="organizations/:organizationId/packages" element={<OrganizationDetail view="packages" />} />
      <Route path="*" element={<Missing title="Page unavailable" to="/packages" label="Return to Packages" />} />
    </Route>
  </Routes>
}
