import { useState } from 'react'
import { ArrowUpRight, Bookmark, FileText, House, Menu, Plus, Settings, ShieldCheck, Users, X } from 'lucide-react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useStore, nameOf } from '../state/Store.jsx'
import { withSid } from '../utils/dataManager.js'
import { initials } from '../utils/format.js'

export const workspace = '/publish'
export const createArticle = '/publish/posts/new'

export function AppLink({ to, ...props }) {
  return <Link to={withSid(to)} {...props} />
}

export function useAppNavigate() {
  const navigate = useNavigate()
  return (to, options) => navigate(withSid(to), options)
}

export function Mark({ brand = false }) {
  return brand
    ? <span className="brand-mark" aria-hidden="true"><Bookmark size={18} strokeWidth={2.25} /></span>
    : <span className="publication-mark" aria-hidden="true">SM</span>
}

export function Avatar({ name, className = '' }) {
  return <span aria-hidden="true" className={`avatar ${className}`}>{initials(name)}</span>
}

const navigation = [
  { group: 'Workspace', links: [
    ['Home', workspace, House],
    ['Posts', '/publish/posts', FileText],
    ['Subscribers', '/publish/subscribers', Users],
  ] },
  { group: 'Manage', links: [
    ['Moderation', '/publish/moderation', ShieldCheck],
    ['Settings', '/publish/settings', Settings],
  ] },
]

export function Shell() {
  const { state } = useStore()
  const location = useLocation()
  const [drawer, setDrawer] = useState(false)
  const [create, setCreate] = useState(false)
  const actor = state.users.some(user => user.id === state.currentUserId) ? nameOf(state, state.currentUserId) : 'Publisher'
  return (
    <div className="app-shell">
      <header className="masthead">
        <div className="mast-left">
          <button className="icon-button mobile-nav" aria-label={drawer ? 'Close navigation' : 'Open navigation'} aria-expanded={drawer} onClick={() => setDrawer(!drawer)}>{drawer ? <X size={19} /> : <Menu size={19} />}</button>
          <AppLink className="wordmark" to={workspace}><Mark brand />Substack</AppLink>
          <span className="mast-divider" />
          <AppLink className="publication-name" to={workspace}>{state.publication.name}</AppLink>
        </div>
        <div className="mast-right">
          <AppLink className="publication-link" to="/publication">View publication <ArrowUpRight size={15} /></AppLink>
          <span className="account" title={actor}><Avatar name={actor} /><span>{actor}</span></span>
        </div>
      </header>
      <aside className={`rail ${drawer ? 'rail-open' : ''}`} aria-label="Publisher workspace">
        <div className="rail-publication"><Mark /><div><strong>{state.publication.name}</strong><small>Publisher dashboard</small></div></div>
        <div className="create-control">
          <button className="button primary create-button" aria-expanded={create} onClick={() => setCreate(!create)}><Plus size={17} /> Create</button>
          {create && <div className="create-menu menu-panel"><AppLink to={createArticle} onClick={() => { setDrawer(false); setCreate(false) }}><FileText size={16} /> Article</AppLink></div>}
        </div>
        <nav aria-label="Publisher navigation">
          {navigation.map(({ group, links }) => <div className="nav-group" key={group}>
            <div className="nav-label">{group}</div>
            {links.map(([label, path, Icon]) => {
              const active = path === workspace ? [workspace, '/'].includes(location.pathname) : location.pathname.startsWith(path)
              return <AppLink aria-current={active ? 'page' : undefined} data-active={active} key={path} to={path} onClick={() => { setDrawer(false); setCreate(false) }}><Icon size={17} /> {label}</AppLink>
            })}
          </div>)}
        </nav>
      </aside>
      <main className="workspace"><Outlet /></main>
    </div>
  )
}
