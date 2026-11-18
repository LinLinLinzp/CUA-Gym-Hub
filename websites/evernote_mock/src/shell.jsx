import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useWorkspace, WorkspaceLink } from './navigation.jsx'
import { Menu, Symbol } from './ui.jsx'

const tabs = [
  ['Notes', '/notes', 'notes'],
  ['Notebooks', '/notebooks', 'notebooks'],
  ['Tasks', '/tasks', 'tasks'],
  ['Trash', '/trash', 'trash'],
]

export function Shell({ section, user, actions, children, feedback }) {
  const { go, route } = useWorkspace()
  const { key } = useLocation()
  const currentQuery = route.query || ''
  const [query, setQuery] = useState(currentQuery)
  const searchInput = useRef(null)
  useEffect(() => { setQuery(currentQuery) }, [currentQuery, key])
  useEffect(() => {
    const focusSearch = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchInput.current?.focus()
        searchInput.current?.select()
      }
    }
    document.addEventListener('keydown', focusSearch)
    return () => document.removeEventListener('keydown', focusSearch)
  }, [])
  const name = user.name || 'Workspace account'
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  return <>
    <header className="masthead">
      <WorkspaceLink className="wordmark" to="/notes">Evernote<span aria-hidden="true">.</span></WorkspaceLink>
      <form className="global-search" role="search" onSubmit={(event) => {
        event.preventDefault()
        const params = new URLSearchParams({ q: query.trim() })
        go('/search?' + params)
      }}>
        <button className="search-submit" type="submit" aria-label="Search"><Symbol name="search" /></button>
        <input aria-label="Search notes" aria-keyshortcuts="Control+K Meta+K" placeholder="Search your notes" type="search" value={query}
          onChange={(event) => setQuery(event.target.value)} ref={searchInput} />
        <kbd className="search-hint" aria-hidden="true">Ctrl K</kbd>
      </form>
      <div className="account">
        <span className="account-avatar" aria-hidden="true">{initials}</span>
        <span className="account-name">{name}</span>
      </div>
    </header>
    <div className="bar">
      <div className="bar-inner">
        <nav aria-label="Workspace sections">
          {tabs.map(([name, url, icon]) => <WorkspaceLink key={url} to={url} aria-current={section === icon ? 'page' : undefined}>
            <Symbol name={icon} />{name}
          </WorkspaceLink>)}
        </nav>
        <div className="controls bar-actions">
          {actions}
          <Menu label="Keyboard help" iconOnly icon="help"><p className="shortcut"><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>K</kbd> <span>Search notes</span></p></Menu>
        </div>
      </div>
    </div>
    <main className="workspace">{children}</main>
    <div className={feedback ? 'toast' : 'sr-only'} role="status">{feedback}</div>
  </>
}
