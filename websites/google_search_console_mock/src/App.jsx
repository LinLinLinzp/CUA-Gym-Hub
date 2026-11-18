import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useMatch } from 'react-router-dom'
import { saveState } from './utils/dataManager'
import { activeProperty, inspectPage, label, list, scopedUrl, selectProperty } from './data/records'
import { Icon, Missing, Status, typeLabel, usePaths, inspectionQuery, propertyPath } from './ui'
import { Overview } from './pages/Overview'
import { Properties, PropertyDetail, PropertySheet } from './pages/Properties'
import { Inspection } from './pages/Inspection'
import { SitemapDetail, Sitemaps } from './pages/Sitemaps'

const navigation = [['/', 'Overview'], ['/properties', 'Properties'], ['/url-inspection', 'URL Inspection'], ['/sitemaps', 'Sitemaps']]

function PropertyPicker({ state, property, onSelect, openSheet }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const container = useRef()
  const trigger = useRef()
  const close = () => { setOpen(false); setSearch('') }
  useEffect(() => {
    if (!open) return
    const dismiss = event => { if (!container.current?.contains(event.target)) close() }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [open])
  const rows = list(state.properties).filter(p => p.status !== 'removed' && label(p).toLowerCase().includes(search.trim().toLowerCase()))
  return <div className="picker" ref={container} onKeyDown={event => {
    if (event.key === 'Escape' && open) { close(); trigger.current.focus() }
  }}>
    <button ref={trigger} className="workspace-control" aria-label={'Switch property, ' + (property ? label(property) : 'no property selected')}
      aria-expanded={open} aria-controls="workspace-properties" onClick={() => open ? close() : setOpen(true)}>
      <Icon name="globe" /><span>{property ? label(property) : 'Select a property'}</span><Icon name="down" size={15} />
    </button>
    {open && <section className="popover" id="workspace-properties" aria-label="Switch property">
      <label className="filter-label">Search properties<input autoFocus type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Domain or URL prefix" /></label>
      <div className="picker-rows">
        {rows.map(p => <button key={p.id} className={p.id === property?.id ? 'picker-row current' : 'picker-row'} onClick={() => {
          close()
          trigger.current.focus()
          if (p.status === 'pending') openSheet(p)
          if (p.status === 'verified') onSelect(p)
        }}>
          <span><strong>{label(p)}</strong><small>{typeLabel(p.type)}</small></span>
          {p.id === property?.id ? <span className="current-label"><Icon name="check" size={14} />Current</span> : <Status value={p.status} />}
        </button>)}
        {!rows.length && <p className="picker-empty">No matching properties.</p>}
      </div>
      <button className="picker-add" onClick={() => { close(); trigger.current.focus(); openSheet() }}><Icon name="plus" />Add property</button>
    </section>}
  </div>
}

function GlobalInspect({ property, onInspect }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  return <form className="global-form" aria-label="Global URL inspection" noValidate onSubmit={event => {
    event.preventDefault()
    const result = onInspect(value)
    setError(result || '')
    if (!result) setValue('')
  }}>
    <label className="global-input"><Icon name="search" /><span className="sr-only">Inspect a URL</span>
      <input value={value} onChange={e => { setValue(e.target.value); setError('') }} disabled={!property}
        placeholder={property ? 'Inspect any URL in this property' : 'Select a property to inspect a URL'}
        aria-invalid={Boolean(error)} aria-describedby={error ? 'global-error' : undefined} />
    </label>
    <button className="primary" disabled={!property}>Inspect</button>
    {error && <div className="global-error error" role="alert" id="global-error">{error}</div>}
  </form>
}

export function App({ initialState, appName }) {
  const [state, setState] = useState(initialState)
  const fresh = useRef(initialState)
  const [sheet, setSheet] = useState(null)
  const [notice, setNotice] = useState('')
  const location = useLocation()
  const go = useNavigate()
  const to = usePaths()
  const routeProperty = useMatch('/properties/:propertyId')
  const routeSitemap = useMatch('/sitemaps/:sitemapId')
  const path = location.pathname.replace(/\/$/, '') || '/'
  const search = new URLSearchParams(location.search)
  const queryId = search.get('property')
  const selected = activeProperty(state)
  const verified = list(state.properties).filter(p => p.status === 'verified')
  const map = routeSitemap && list(state.sitemaps).find(s => s.id === routeSitemap.params.sitemapId && s.status !== 'removed')
  const detailProperty = routeProperty && list(state.properties).find(p => p.id === routeProperty.params.propertyId && p.status !== 'removed')
  const contextId = routeProperty ? (detailProperty?.status === 'verified' ? detailProperty.id : queryId) : routeSitemap ? map?.propertyId : queryId
  const property = verified.find(p => p.id === contextId) || selected
  const url = search.get('url') || ''
  const tab = path.startsWith('/properties') ? '/properties' : path.startsWith('/sitemaps') ? '/sitemaps' : path
  const commit = change => {
    const next = typeof change === 'function' ? change(fresh.current) : change
    if (!next || next === fresh.current) return
    fresh.current = next
    setState(next)
    saveState(appName, next)
  }
  const choose = next => {
    if (next.id === property?.id) return
    commit(current => selectProperty(current, next))
    setNotice('')
    go(to(navigation.some(([href]) => href === tab) ? tab : '/', { property: next.id }))
  }
  const inspect = (value) => {
    const result = scopedUrl(value, property)
    if (result.error) return result.error
    const next = inspectPage(fresh.current, property, result.url)
    commit(next.state)
    setNotice('')
    go(to('/url-inspection', inspectionQuery(property, result.url, next.inspection.id)))
    return ''
  }
  const openSheet = pending => setSheet({ pending })
  const shared = { state, property, to, go, commit, choose, openSheet, setNotice }
  let page
  if (path === '/') page = <Overview {...shared} />
  else if (path === '/properties') page = <Properties {...shared} />
  else if (routeProperty) page = <PropertyDetail {...shared} key={routeProperty.params.propertyId} target={detailProperty} />
  else if (path === '/url-inspection') page = <Inspection {...shared} key={location.key} inspect={inspect} queryUrl={url}
    inspectionId={search.get('inspection')} verdict={search.get('verdict')} staleProperty={Boolean(queryId && !verified.some(p => p.id === queryId))} />
  else if (path === '/sitemaps') page = <Sitemaps {...shared} key={property?.id} filter={search.get('status') || ''} />
  else if (routeSitemap) page = <SitemapDetail {...shared} key={routeSitemap.params.sitemapId} map={map?.propertyId === property?.id ? map : null} />
  else page = <Missing title="Page unavailable" path={to('/')}>Return to overview</Missing>

  const account = state.account || {}
  const initials = String(account.name || account.email || 'Account').split(/\s+/).slice(0, 2).map(name => name[0]).join('').toUpperCase()

  return <>
    <a className="skip" href="#main">Skip to content</a>
    <header className="masthead">
      <div className="header-width masthead-inner">
        <Link className="brand" to={to('/', { property: property?.id })}>Google Search Console</Link>
        <PropertyPicker state={state} property={property} onSelect={choose} openSheet={openSheet} />
        <div className="account"><div><strong>{account.name || 'Signed-in account'}</strong><small>{account.email}</small></div><span className="avatar" aria-hidden="true">{initials}</span></div>
      </div>
    </header>
    <div className="navigation">
      <div className="header-width navigation-inner">
        <nav aria-label="Main navigation">
          {navigation.map(([href, name]) => <Link key={href} to={to(href, { property: property?.id })}
            aria-current={tab === href ? 'page' : undefined}>{name}</Link>)}
        </nav>
        <GlobalInspect key={property?.id} property={property} onInspect={inspect} />
      </div>
    </div>
    <main id="main" tabIndex={-1} className="main-width">{page}</main>
    <div className="announcements" role="status" aria-live="polite">
      {notice && <div className="toast"><span className="icon-tile"><Icon name="check" /></span>{notice}<button className="icon-button" aria-label="Dismiss notification" onClick={() => setNotice('')}><Icon name="close" size={16} /></button></div>}
    </div>
    {sheet && <PropertySheet state={state} pending={sheet.pending} close={() => setSheet(null)} commit={commit}
      onSaved={saved => {
        setSheet(null)
        setNotice(saved.status === 'pending' ? 'Property added. Verification is pending.' : 'Ownership verified.')
        go(to(propertyPath(saved)))
      }} />}
  </>
}
