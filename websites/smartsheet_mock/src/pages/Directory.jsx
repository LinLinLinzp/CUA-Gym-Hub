import React, { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Clock3, Folder, FolderOpen, Search, Star, Table2 } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { AppLink, Empty, IconButton, formatUpdate, useAppNavigate } from '../components/ui.jsx'

function Favorite({ sheet }) {
  const { state, commit } = useStore()
  const active = (state.preferences?.favoriteSheetIds ?? []).includes(sheet.id)
  return <IconButton label={active ? 'Remove ' + sheet.name + ' from favorites' : 'Add ' + sheet.name + ' to favorites'} aria-pressed={active} onClick={() => commit(current => {
    const ids = current.preferences?.favoriteSheetIds ?? []
    return { ...current, preferences: { ...current.preferences, favoriteSheetIds: ids.includes(sheet.id) ? ids.filter(id => id !== sheet.id) : [...ids, sheet.id] } }
  })}><Star size={17} fill={active ? 'currentColor' : 'none'} className={active ? 'starred' : ''} /></IconButton>
}

export { Favorite }

function ItemTable({ items, sort, setSort, empty, workspaces }) {
  const titles = [['name', 'Name'], ['workspace', 'Workspace'], ['type', 'Type'], ['updatedAt', 'Last updated']]
  if (!items.length) return <Empty icon={Table2} title={empty} />
  const workspaceName = id => workspaces.find(workspace => workspace.id === id)?.name || '—'
  const field = (item, key) => key === 'workspace' ? workspaceName(item.kind === 'Workspace' ? item.id : item.workspaceId) : key === 'type' ? item.kind || 'Sheet' : item[key] || ''
  const sorted = [...items].sort((a, b) => String(field(a, sort.key)).localeCompare(String(field(b, sort.key)), 'en', { sensitivity: 'base', numeric: true }) * sort.direction)
  return <div className="table-scroll"><table className="directory-table">
    <thead><tr>{titles.map(([key, title]) => {
      const Icon = sort.key === key ? (sort.direction === 1 ? ArrowUp : ArrowDown) : ArrowUpDown
      return <th key={key} aria-sort={sort.key === key ? (sort.direction === 1 ? 'ascending' : 'descending') : undefined}><button onClick={() => setSort({ key, direction: sort.key === key ? -sort.direction : 1 })}>{title}<Icon size={13} /></button></th>
    })}<th><span className="sr-only">Favorite</span></th></tr></thead>
    <tbody>{sorted.map(item => {
      const workspace = item.kind === 'Workspace'
      const Icon = workspace ? Folder : Table2
      return <tr key={(item.kind || 'Sheet') + encodeURIComponent(item.id)}>
        <td><AppLink className="item-link" to={(workspace ? '/workspaces/' : '/sheets/') + encodeURIComponent(item.id)}><span className={'item-icon ' + (workspace ? 'folder-icon' : '')}><Icon size={17} /></span>{item.name || 'Untitled'}</AppLink></td>
        <td>{workspaceName(workspace ? item.id : item.workspaceId)}</td><td>{item.kind || 'Sheet'}</td><td>{formatUpdate(item.updatedAt)}</td><td>{!workspace && <Favorite sheet={item} />}</td>
      </tr>
    })}</tbody>
  </table></div>
}

export function Directory({ home = false }) {
  const { state } = useStore()
  const { workspaceId } = useParams()
  const navigate = useAppNavigate()
  const [section, setSection] = useState('recent')
  const [sort, setSort] = useState({ key: home ? 'updatedAt' : 'name', direction: home ? -1 : 1 })
  const workspaces = state.workspaces ?? []
  const workspace = workspaces.find(item => item.id === workspaceId)
  const sheets = (state.sheets ?? []).filter(item => item.status !== 'deleted')
  const favorites = state.preferences?.favoriteSheetIds ?? []
  const visible = sheets.filter(item => (!workspaceId || item.workspaceId === workspaceId) && (!home || section !== 'favorites' || favorites.includes(item.id)))
  if (workspaceId && !workspace) return <main className="page"><Empty icon={FolderOpen} title="Workspace unavailable"><AppLink to="/browse">Browse workspaces</AppLink></Empty></main>
  return <main className="page directory">
    <div className="page-heading"><h1>{home ? 'Home' : workspace?.name || 'Browse'}</h1>{workspace?.description && <p>{workspace.description}</p>}</div>
    <div className="directory-layout">
      <aside className="workspace-directory panel" aria-label="Workspaces">
        <h3>Workspaces</h3>
        <AppLink className={!workspaceId ? 'current' : ''} to="/browse"><FolderOpen size={17} /> All workspaces</AppLink>
        {workspaces.map(item => <AppLink className={item.id === workspaceId ? 'current' : ''} aria-current={item.id === workspaceId ? 'page' : undefined} to={'/workspaces/' + encodeURIComponent(item.id)} key={item.id}><Folder size={16} /> {item.name || 'Untitled workspace'}</AppLink>)}
        {!workspaces.length && <p className="muted">No workspaces yet.</p>}
      </aside>
      <label className="workspace-select field">Workspace<select value={workspaceId ?? ''} onChange={event => navigate(event.target.value ? '/workspaces/' + event.target.value : '/browse')}><option value="">All workspaces</option>{workspaces.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <section className="panel directory-content">
        <div className="directory-toolbar">
          {home ? <div className="tabs" aria-label="Home views">
            <button className={section === 'recent' ? 'active' : ''} aria-pressed={section === 'recent'} onClick={() => setSection('recent')}><Clock3 size={16} /> Recents</button>
            <button className={section === 'favorites' ? 'active' : ''} aria-pressed={section === 'favorites'} onClick={() => setSection('favorites')}><Star size={16} /> Favorites</button>
          </div> : <h3>Sheets</h3>}
          <span className="muted">{visible.length} {visible.length === 1 ? 'sheet' : 'sheets'}</span>
        </div>
        <ItemTable items={visible} sort={sort} setSort={setSort} workspaces={workspaces} empty={home && section === 'favorites' ? 'No favorite sheets yet' : 'No sheets here yet'} />
      </section>
    </div>
  </main>
}

export function SearchPage() {
  const { state } = useStore()
  const input = useRef(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState({ key: 'name', direction: 1 })
  useEffect(() => input.current?.focus(), [])
  const workspaces = state.workspaces ?? []
  const term = query.trim().toLowerCase()
  const results = term ? [
    ...workspaces.filter(item => item.name?.toLowerCase().includes(term)).map(item => ({ ...item, kind: 'Workspace' })),
    ...(state.sheets ?? []).filter(item => item.status !== 'deleted' && item.name?.toLowerCase().includes(term)),
  ] : []
  return <main className="page directory">
    <div className="page-heading"><h1>Search</h1></div>
    <div className="search-field"><Search size={18} /><input type="search" ref={input} value={query} aria-label="Search sheets and workspaces" placeholder="Search sheets and workspaces" onChange={event => setQuery(event.target.value)} /></div>
    <section className="panel search-results"><div className="directory-toolbar"><h3>Results</h3><span className="muted" aria-live="polite">{term && results.length + ' found'}</span></div>
      <ItemTable items={results} sort={sort} setSort={setSort} workspaces={workspaces} empty={term ? 'No results found' : 'Enter a sheet or workspace name'} />
    </section>
  </main>
}
