import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'

const glyphs = {
  globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18M12 3c-5 5-5 13 0 18"/></>,
  search: <><circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 5 5"/></>,
  down: <path d="m6 9 6 6 6-6"/>,
  arrow: <path d="M4 12h15m-6-6 6 6-6 6"/>,
  back: <path d="M20 12H5m6 6-6-6 6-6"/>,
  plus: <path d="M12 5v14M5 12h14"/>,
  report: <><path d="M5 19V5m0 14h14M9 15l4-4 3 2 3-6"/><path d="M16 7h3v3"/></>,
  sitemap: <><rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-4h12v4"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
}

export function Icon({ name, size = 18 }) {
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{glyphs[name]}</svg>
}

export function usePaths() {
  const location = useLocation()
  const sid = new URLSearchParams(location.search).get('sid') || sessionStorage.getItem('mock_sid')
  return (path, values = {}) => {
    const query = new URLSearchParams()
    if (sid) query.set('sid', sid)
    Object.entries(values).forEach(([key, value]) => { if (value) query.set(key, value) })
    return path + (query.size ? '?' + query : '')
  }
}

export const propertyPath = p => '/properties/' + encodeURIComponent(p.id)
export const sitemapPath = s => '/sitemaps/' + encodeURIComponent(s.id)
export const inspectionQuery = (property, url, id) => ({ property: property?.id, url, inspection: id })

export function Status({ value }) {
  const states = {
    verified: ['Verified', 'good'], pending: ['Pending', 'pending'], removed: ['Removed', 'neutral'],
    indexed: ['Indexed', 'good'], indexed_with_issues: ['Indexed with issues', 'warn'],
    not_indexed: ['Not indexed', 'warn'], unknown: ['Unknown', 'neutral'],
    success: ['Success', 'good'], could_not_fetch: ['Couldn’t fetch', 'bad'], has_errors: ['Has errors', 'warn'],
    indexable: ['URL is available to Google', 'good'], blocked: ['Indexing blocked', 'warn'],
    fetch_failed: ['Fetch failed', 'bad'], queued: ['Queued', 'pending'],
  }
  const [label, tone] = states[value] || states.unknown
  return <span className={'status ' + tone}><span aria-hidden="true" />{label}</span>
}

export function PageHead({ eyebrow, title, description, actions }) {
  return <header className="page-head">
    <div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>
    {actions && <div className="actions">{actions}</div>}
  </header>
}

export function Empty({ title, children, icon = 'search' }) {
  return <div className="empty"><span className="icon-tile"><Icon name={icon} size={22} /></span><h3>{title}</h3>{children && <p>{children}</p>}</div>
}

export function Missing({ title, path, children }) {
  return <><PageHead title={title} /><section className="card"><Empty title={title} /><div className="empty-actions"><Link className="button" to={path}><Icon name="back" />{children}</Link></div></section></>
}

export function DetailFields({ rows }) {
  return <dl className="fields">{rows.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value ?? '—'}</dd></div>)}</dl>
}

export function Dialog({ title, close, sheet = false, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    const opener = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (opener?.isConnected) opener.focus()
    }
  }, [])
  return <dialog ref={ref} className={sheet ? 'sheet' : ''} aria-labelledby="dialog-title"
    onCancel={event => { event.preventDefault(); close() }}
    onClick={event => { if (event.target === event.currentTarget) close() }}>
    <div className="dialog-body">
      <header><h2 id="dialog-title">{title}</h2><button type="button" className="icon-button" onClick={close} aria-label="Close"><Icon name="close" /></button></header>
      {children}
    </div>
  </dialog>
}

export function Confirm({ title, target, description, close, onConfirm }) {
  return <Dialog title={title} close={close}>
    <p className="mono wrap target">{target}</p>
    <p>{description}</p>
    <div className="dialog-actions">
      <button onClick={close} autoFocus>Cancel</button>
      <button className="danger" onClick={onConfirm}>{title}</button>
    </div>
  </Dialog>
}

export const typeLabel = type => ({ domain: 'Domain', url_prefix: 'URL prefix', sitemap: 'Sitemap', sitemap_index: 'Sitemap index' })[type] || '—'
