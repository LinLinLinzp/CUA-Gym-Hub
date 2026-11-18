import React, { useState } from 'react'
import { ChevronDown, File, FileText, Images, LayoutDashboard, Menu, MessageSquare, Plus, X } from 'lucide-react'
import { commentsPath, dashboardPath, listPath, mediaPath, newPath, routePath, SiteLink } from '../utils/navigation.jsx'
import { rows } from '../utils/display.js'

export const workspace = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: dashboardPath },
  { key: 'posts', label: 'Posts', icon: FileText, to: listPath('post') },
  { key: 'media', label: 'Media', icon: Images, to: mediaPath },
  { key: 'pages', label: 'Pages', icon: File, to: listPath('page') },
  { key: 'comments', label: 'Comments', icon: MessageSquare, to: commentsPath },
]

export default function Shell({ active, state, children }) {
  const [navOpen, setNavOpen] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const navigation = workspace.find((item) => item.key === active)
  const user = rows(state.users).find((person) => person.id === state.currentUserId)
  const pending = rows(state.comments).filter((row) => row.status === 'pending').length
  const name = user?.name || 'Signed-in user'
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('')
  return (
    <div className="workspace">
      <a className="skip-link" href="#workspace-main">Skip to content</a>
      <aside className={'sidebar' + (navOpen ? ' open' : '')}>
        <SiteLink to={dashboardPath} className="brand" onClick={() => setNavOpen(false)}><span className="brand-mark" aria-hidden="true">W</span>WordPress.com</SiteLink>
        <div className="site-identity">{state.site?.name || 'Site'}</div>
        <nav aria-label="Workspace">
          {workspace.map(({ key, label, icon: Icon, to }) => (
            <SiteLink key={key} className="nav-item" to={to} aria-current={active === key ? 'page' : undefined} onClick={() => { setNavOpen(false); setNewOpen(false) }}>
              <Icon size={18} aria-hidden="true" /><span>{label}</span>
              {key === 'comments' && pending > 0 && <span className="nav-count" aria-label={pending + ' pending'}>{pending}</span>}
            </SiteLink>
          ))}
        </nav>
      </aside>
      {navOpen && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setNavOpen(false)} />}
      <div className="workspace-body">
        <header className="utility">
          <div className="utility-location">
            <button type="button" className="icon-button mobile-nav" aria-label={navOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={navOpen} onClick={() => setNavOpen(!navOpen)}>{navOpen ? <X size={19} /> : <Menu size={19} />}</button>
            <span>{navigation?.label || 'Workspace'}</span>
          </div>
          <div className="utility-actions">
            <div className="menu-anchor" onKeyDown={(event) => { if (event.key === 'Escape') { setNewOpen(false); event.currentTarget.querySelector('button')?.focus() } }}>
              <button type="button" className="button subtle" aria-expanded={newOpen} onClick={() => setNewOpen(!newOpen)}><Plus size={16} /> New <ChevronDown size={14} /></button>
              {newOpen && <><button className="menu-scrim" tabIndex={-1} aria-label="Close New menu" onClick={() => setNewOpen(false)} /><div className="popup">
                {[['Post', newPath('post')], ['Page', newPath('page')], ['Media', routePath(mediaPath, { add: '1' })]].map(([label, to]) => <SiteLink key={label} to={to} onClick={() => setNewOpen(false)}>{label}</SiteLink>)}
              </div></>}
            </div>
            <div className="profile"><span className="avatar" aria-hidden="true">{initials}</span><span>{name}</span></div>
          </div>
        </header>
        <main id="workspace-main" className="workspace-main" tabIndex={-1}>{children}</main>
      </div>
    </div>
  )
}
