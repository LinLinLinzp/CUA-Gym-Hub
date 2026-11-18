import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { withSid } from './utils/dataManager.js'
import { useWorkspace } from './workspace.jsx'

export const destinations = [
  ['Overview', '/stream-manager'], ['Stream Settings', '/settings/stream'],
  ['Video Producer', '/content/video-producer'], ['Moderation', '/moderation'], ['Schedule', '/schedule'],
]

export function WorkspaceLink({ to, nav, active, ...props }) {
  const { search, pathname } = useLocation()
  const target = search ? to + search : withSid(to)
  const selected = nav && (active || pathname === to)
  return <Link {...props} to={target} className={nav ? (selected ? 'active' : undefined) : props.className}
    aria-current={selected ? 'page' : undefined} />
}

function DestinationFinder() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const input = useRef(null)
  function show() { setQuery(''); setOpen(true) }
  useEffect(() => {
    function shortcut(event) {
      if (event.ctrlKey && event.key === '/' && !document.querySelector('dialog[open]')) {
        event.preventDefault()
        show()
      }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [])
  useEffect(() => {
    if (open) input.current?.focus()
  }, [open])
  const matches = destinations.slice(1).filter(([name]) => name.toLowerCase().includes(query.trim().toLowerCase()))
  return <>
    <button className="finder-trigger" onClick={show} aria-keyshortcuts="Control+/">Find a page</button>
    {open && <Dialog compact title="Find a page" close={() => setOpen(false)}>
      <div className="stack">
        <label>Search destinations<input ref={input} type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
        {matches.length ? <ul className="finder-results">{matches.map(([name, to]) =>
          <li key={to}><WorkspaceLink to={to} onClick={() => setOpen(false)}>{name}</WorkspaceLink></li>)}</ul>
          : <p className="muted">No matching destinations.</p>}
      </div>
    </Dialog>}
  </>
}

export function Frame({ children }) {
  const { state } = useWorkspace()
  const { pathname } = useLocation()
  return <>
    <header className="topbar"><div className="wrap top-inner">
      <div className="brand"><WorkspaceLink to="/stream-manager" className="wordmark">Twitch</WorkspaceLink><span>Creator Workspace</span></div>
      <div className="top-actions"><DestinationFinder /><div className="account"><div><strong>{state.account?.channelName || 'Fieldnote Live'}</strong><small>@{state.account?.login || 'fieldnotelive'}</small></div><div className="avatar" aria-hidden="true">FL</div></div></div>
    </div></header>
    <nav className="nav" aria-label="Creator workspace"><div className="wrap nav-inner">
      {destinations.map(([name, to]) => <WorkspaceLink key={to} nav to={to} active={
        (to === '/stream-manager' && pathname === '/') || (to === '/schedule' && pathname === '/settings/channel/schedule')
      }>{name}</WorkspaceLink>)}
    </div></nav>
    <main className="wrap main" id="main">{children}</main>
  </>
}

export function Heading({ title, description, children }) {
  return <div className="heading"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{children}</div>
}

export function Empty({ title, children }) {
  return <div className="empty"><strong>{title}</strong>{children}</div>
}

export function Dialog({ title, close, children, compact }) {
  const ref = useRef(null)
  const id = useId()
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return <dialog ref={ref} aria-labelledby={id} className={compact ? 'compact' : ''}
    onCancel={event => { event.preventDefault(); close() }}>
    <div className="dialog-heading"><h2 id={id}>{title}</h2><button type="button" aria-label="Close dialog" className="icon-button" onClick={close}>×</button></div>
    {children}
  </dialog>
}

export function Confirm({ title, close, children, verb, confirm, danger = true }) {
  return <Dialog title={title} close={close} compact>
    <p className="confirm-message">{children}</p>
    <div className="dialog-actions"><button onClick={close}>Cancel</button><button className={danger ? 'danger' : 'primary'} onClick={confirm}>{verb}</button></div>
  </Dialog>
}

export const categoryName = (categories, id) => categories.find(category => category.id === id)?.name || (id ? 'Unknown category' : 'Uncategorized')
const artwork = new Set(['printmaking', 'photography', 'ceramics', 'book-arts'])

export function Cover({ categories, categoryId, artworkKey, className = '', children }) {
  const category = categories.find(item => item.id === categoryId)
  const key = artworkKey || category?.artworkKey
  const fallback = [...String(categoryId ?? '')].reduce((sum, c) => sum + c.charCodeAt(0), 0) % artwork.size
  const style = artwork.has(key) ? key : [...artwork][fallback]
  return <div className={'cover ' + style + ' ' + className} aria-hidden="true"><i /><b /><span />{children}</div>
}

export function CategoryField({ categories, value, onChange, required = false }) {
  const id = useId()
  const [query, setQuery] = useState('')
  const visible = categories.filter(category => (category.name || '').toLowerCase().includes(query.trim().toLowerCase()))
  const selected = categories.find(category => category.id === value)
  const options = selected && !visible.includes(selected) ? [selected, ...visible] : visible
  return <fieldset className="category-field">
    <legend>Category</legend>
    <label htmlFor={id + '-search'} className="sr-only">Search categories</label>
    <input id={id + '-search'} type="search" placeholder="Search categories" value={query} onChange={event => setQuery(event.target.value)} />
    <label htmlFor={id} className="sr-only">Category</label>
    <select id={id} value={value} onChange={event => onChange(event.target.value)} required={required}>
      <option value="">Select a category</option>
      {value && !selected && <option value={value}>Unknown category</option>}
      {options.map(category => <option key={category.id} value={category.id}>{category.name || category.id}</option>)}
    </select>
    {query && !visible.length && <small>No matching categories</small>}
  </fieldset>
}

export const languages = { en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese', ja: 'Japanese', ko: 'Korean', zh: 'Chinese', ru: 'Russian', other: 'Other' }

export function LanguageField({ value, onChange, required = true }) {
  return <label>Language<select value={value} onChange={event => onChange(event.target.value)} required={required}>
    <option value="">Select a language</option>
    {value && !languages[value] && <option value={value}>{value}</option>}
    {Object.entries(languages).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
  </select></label>
}

export function Badge({ status, children }) {
  const label = status ? status.replaceAll('_', ' ') : 'Unknown'
  return <span className={'badge ' + (status || '')}>{children || label[0].toUpperCase() + label.slice(1)}</span>
}


