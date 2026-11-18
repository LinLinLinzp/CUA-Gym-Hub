import { useEffect, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { useWorkspace } from './store'
import { Icon, Link, NavLink } from './ui'
import { kinds } from './workspace'
import { Catalog, Overview } from './Catalog'
import { Detail, NewRepository } from './Repository'
import { Access, Activity } from './Access'

const navigation = [
  ['Overview', '/', 'home'],
  ...Object.entries(kinds).map(([kind, { label, icon }]) => [label, '/' + kind, icon]),
  ['Access', '/access', 'access'],
  ['Activity', '/activity', 'activity'],
]

export default function App() {
  const { state, notice } = useWorkspace()
  const account = state.account || {}
  const name = account.displayName || account.username || 'Account'
  const initials = name.trim().split(/\s+/).slice(0, 2).map((segment) => segment[0]).join('').toUpperCase()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [section, owner, slug, tab] = location.pathname.split('/').slice(1)
  const current = navigation.find(([, path]) => path === '/' + (section || ''))?.[0]
  useEffect(() => {
    setMenuOpen(false)
    window.scrollTo(0, 0)
  }, [location.pathname, location.search])

  return <div className="workspace">
    <a className="skip" href="#main">Skip to content</a>
    <aside className={'rail' + (menuOpen ? ' rail-open' : '')} id="workspace-navigation">
      <Link className="brand" to="/"><span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>Hugging Face</Link>
      <nav aria-label="Workspace">
        {navigation.map(([word, path, icon]) => <NavLink key={path} to={path} end={path === '/'}><Icon name={icon} />{word}</NavLink>)}
      </nav>
      <div className="account"><div className="avatar" aria-hidden="true">{initials}</div><div><strong>{name}</strong>{account.username && <span>@{account.username}</span>}</div></div>
    </aside>
    <div className="frame">
      <header className="utility">
        <button className="button secondary mobile-menu" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-controls="workspace-navigation"><Icon name="menu" /> Menu</button>
        <nav aria-label="Breadcrumb" className="breadcrumbs">
          <Link to="/">Workspace</Link><Icon name="chevron" />
          {owner && current ? <Link to={'/' + section}>{current}</Link> : <span aria-current="page">{current || 'Page unavailable'}</span>}
          {owner && <><Icon name="chevron" /><span aria-current={tab ? undefined : 'page'}>{slug || (owner === 'new' ? 'New repository' : owner)}</span></>}
          {tab && <><Icon name="chevron" /><span aria-current="page">{tab === 'files' ? 'Files' : 'Settings'}</span></>}
        </nav>
      </header>
      <main id="main" className="main" tabIndex="-1">
        <Routes>
          <Route path="/" element={<Overview />} />
          {Object.keys(kinds).map((kind) => <Route key={kind} path={kind}>
            <Route index element={<Catalog key={kind} kind={kind} />} />
            <Route path="new" element={<NewRepository key={kind} kind={kind} />} />
            {['', '/files', '/settings'].map((suffix) => <Route key={suffix} path={':owner/:slug' + suffix} element={<Detail kind={kind} section={suffix.slice(1) || 'overview'} />} />)}
          </Route>)}
          <Route path="access" element={<Access />} />
          <Route path="activity" element={<Activity />} />
          <Route path="*" element={<section className="panel empty"><h1>Page unavailable</h1><p>Check the address or return to your workspace.</p><Link to="/" className="button primary">Back to Overview</Link></section>} />
        </Routes>
      </main>
      <div className="status-region" role="status" aria-live="polite">{notice && <div className="toast" key={notice.id}><Icon name="check" />{notice.message}</div>}</div>
    </div>
  </div>
}
