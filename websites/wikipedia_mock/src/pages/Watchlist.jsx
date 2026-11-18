import { useRef, useState } from 'react'
import { watchActivity } from '../data/activity.js'
import { activeWatches, articlePath, dateLabel, removeWatches } from '../data/records.js'
import { SiteLink } from '../navigation.jsx'
import { useWorkspace } from '../workspace.js'
import { ActivityRows } from './Catalog.jsx'

export function Activity() {
  const { state } = useWorkspace()
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('')
  const groups = new Map()
  for (const item of watchActivity(state)) {
    if (kind && item.kind !== kind) continue
    if (!item.article.title.toLowerCase().includes(query.trim().toLowerCase())) continue
    const day = dateLabel(item.createdAt, true)
    if (!groups.has(day)) groups.set(day, [])
    groups.get(day).push(item)
  }
  return <section className="paper">
    <h2>Recent changes</h2>
    <div className="filters">
      <label className="field">Filter by page title<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <label className="field">Change type<select aria-label="Change type" value={kind} onChange={event => setKind(event.target.value)}>
        <option value="">All changes</option><option value="edit">Article edits</option><option value="talk">Talk comments</option>
      </select></label>
    </div>
    {groups.size ? [...groups].map(([day, rows]) => <section className="activity-day" key={day}>
      <h3>{day}</h3><ActivityRows rows={rows} />
    </section>) : <p className="metadata">No changes on watched pages match these filters.</p>}
  </section>
}

export function WatchedPages() {
  const { state, commit } = useWorkspace()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [status, setStatus] = useState('')
  const dialog = useRef(null)
  const removeButton = useRef(null)
  const search = useRef(null)
  const articles = new Map(state.articles.map(item => [item.id, item]))
  const pages = activeWatches(state).map(item => ({ item, article: articles.get(item.articleId) }))
    .filter(({ article }) => (article?.title ?? 'Unavailable article').toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => (a.article?.title ?? '').localeCompare(b.article?.title ?? '') || a.item.id.localeCompare(b.item.id))

  function toggle(id, checked) {
    const next = new Set(selected)
    if (checked) next.add(id)
    else next.delete(id)
    setSelected(next)
    setStatus('')
  }

  function confirmRemoval() {
    if (commit(current => removeWatches(current, selected))) {
      setStatus(selected.size === 1 ? 'Removed 1 watched page.' : 'Removed ' + selected.size + ' watched pages.')
    }
    setSelected(new Set())
    dialog.current.close('removed')
  }

  return <section className="paper">
    <h2>Watched pages</h2>
    <div className="filters">
      <label className="field">Search watched pages
        <input ref={search} type="search" value={query} onChange={event => { setQuery(event.target.value); setSelected(new Set()); setStatus('') }} />
      </label>
      <button type="button" ref={removeButton} disabled={!selected.size} onClick={() => {
        dialog.current.returnValue = ""
        dialog.current.showModal()
      }}>Remove selected</button>
      <span className="metadata">{selected.size} selected</span>
    </div>
    {status && <p className="feedback success" role="status">{status}</p>}
    {pages.length ? <ul className="ruled">{pages.map(({ item, article }) => <li className="watch-row" key={item.id}>
      <input type="checkbox" aria-label={'Select ' + (article?.title ?? 'unavailable article')} checked={selected.has(item.id)}
        onChange={event => toggle(item.id, event.target.checked)} />
      <div>
        {article ? <SiteLink to={articlePath(article)}>{article.title}</SiteLink> : <strong>Unavailable article</strong>}
        <span className="metadata">Watched since {dateLabel(item.createdAt)}</span>
      </div>
    </li>)}</ul> : <p className="metadata">{query ? 'No watched pages match this search.' : 'Your watchlist has no pages.'}</p>}
    <dialog className="paper" ref={dialog} aria-labelledby="remove-title" onClose={() => {
      if (dialog.current.returnValue === 'removed') search.current.focus()
      else removeButton.current.focus()
    }}>
      <h2 id="remove-title">Remove watched pages?</h2>
      <p>Remove {selected.size} {selected.size === 1 ? 'page' : 'pages'} and associated talk activity from your watchlist.</p>
      <div className="actions">
        <button type="button" autoFocus onClick={() => dialog.current.close('cancel')}>Cancel</button>
        <button type="button" className="primary" onClick={confirmRemoval}>Remove</button>
      </div>
    </dialog>
  </section>
}
