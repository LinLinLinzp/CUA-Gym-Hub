import { Suspense, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { active, creatorsOf, itemTypes, publicationOf, records, values, writable, yearOf } from '../utils/model.js'
import { appPath, libraryPath } from '../utils/routes.js'
import { Dialog, Empty, FormActions, Tile } from './ui.jsx'
import { Collections, CollectionForm, MembershipForm, changeMembership } from './Collections.jsx'
import { CopyItemsForm, ItemDetails, ItemForm } from './Items.jsx'
import { CitationComposer } from './Citations.jsx'

const collectionActions = ['newCollection', 'newSubcollection', 'renameCollection', 'moveCollection', 'deleteCollection']
const scopeLabels = { unfiled: 'Unfiled', trash: 'Trash' }
const sorters = {
  added: (a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')),
  title: (a, b) => String(a.title ?? '').localeCompare(String(b.title ?? '')),
  year: (a, b) => yearOf(b).localeCompare(yearOf(a)),
}

export default function Workspace() {
  const { state } = useStore()
  const { libraryId, itemId, collectionId: pathCollection } = useParams()
  const [search] = useSearchParams()
  const libraries = useMemo(() => records(state.libraries).filter(active), [state.libraries])
  const library = libraries.find((entry) => entry.id === libraryId)
  const collections = useMemo(() => records(state.collections).filter((entry) => entry.libraryId === libraryId && active(entry)), [state.collections, libraryId])
  const items = useMemo(() => records(state.items).filter((entry) => entry.libraryId === libraryId), [state.items, libraryId])
  const item = itemId ? items.find((entry) => entry.id === itemId && (active(entry) || entry.status === 'trashed')) : null
  const collectionId = pathCollection || (itemId ? search.get('collection') : null)
  const collection = collections.find((entry) => entry.id === collectionId)
  const view = collection ? '' : item?.status === 'trashed' ? 'trash' : (Object.hasOwn(scopeLabels, search.get('view')) ? search.get('view') : '')

  if (!library) return <Empty title="Library unavailable"><p>This library may have moved or been removed.</p><Link to={appPath('/libraries')}>Browse libraries</Link></Empty>
  if (pathCollection && !collection) return <Empty title="Collection unavailable"><p>Choose another collection from the library.</p><Link to={libraryPath(libraryId)}>Back to {library.name || 'library'}</Link></Empty>
  if (itemId && !item) return <Empty title="Reference unavailable"><p>This reference could not be found in this library.</p><Link to={libraryPath(libraryId)}>Back to {library.name || 'library'}</Link></Empty>

  return <LibraryWorkspace key={libraryId} library={library} libraries={libraries}
    collections={collections} items={items} collection={collection} item={item} view={view} />
}

function LibraryWorkspace({ library, libraries, collections, items, collection, item, view }) {
  const { commit, announce } = useStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [tag, setTag] = useState('')
  const [sort, setSort] = useState('added')
  const [selection, setSelection] = useState([])
  const [dialog, setDialog] = useState(null)
  const scopeId = collection?.id ?? view
  const [previousScope, setPreviousScope] = useState(scopeId)
  if (previousScope !== scopeId) {
    setPreviousScope(scopeId)
    setSearch('')
    setType('')
    setTag('')
    setSelection([])
    setDialog(null)
  }
  const libraryId = library.id
  const canEdit = writable(library)
  const destinations = libraries.filter((entry) => entry.id !== libraryId && entry.kind === 'group' && writable(entry))
  const liveItems = useMemo(() => items.filter(active), [items])
  const validCollections = useMemo(() => new Set(collections.map((entry) => entry.id)), [collections])
  const scopedItems = useMemo(() => {
    if (view === 'trash') return items.filter((entry) => entry.status === 'trashed')
    if (view === 'unfiled') return liveItems.filter((entry) => !values(entry.collectionIds).some((id) => validCollections.has(id)))
    if (collection) return liveItems.filter((entry) => values(entry.collectionIds).includes(collection.id))
    return liveItems
  }, [view, collection, items, liveItems, validCollections])
  const tags = useMemo(() => [...new Set(scopedItems.flatMap((entry) => values(entry.tags)))].filter(Boolean).sort(), [scopedItems])
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return scopedItems.filter((entry) => {
      if (type && entry.itemType !== type) return false
      if (tag && !values(entry.tags).includes(tag)) return false
      return !query || [entry.title, creatorsOf(entry), entry.publicationTitle, entry.publisher, ...values(entry.tags)]
        .some((part) => String(part ?? '').toLowerCase().includes(query))
    }).toSorted(sorters[sort])
  }, [scopedItems, search, type, tag, sort])
  const visibleById = useMemo(() => new Map(filtered.map((entry) => [entry.id, entry])), [filtered])
  const selectedItems = selection.map((id) => visibleById.get(id)).filter(Boolean)
  const selectedIds = new Set(selection)
  const isFiltering = Boolean(search.trim() || type || tag)
  const scope = { collectionId: collection?.id, view }
  const heading = collection?.name || scopeLabels[view] || library.name || 'Untitled library'
  const closeDialog = () => setDialog(null)

  function clearFilters() {
    setSearch('')
    setType('')
    setTag('')
    setSelection([])
  }
  function toggle(id) {
    setSelection((previous) => previous.includes(id) ? previous.filter((entry) => entry !== id) : [...previous, id])
  }
  function open(action, target) {
    setDialog({ action, collection: target })
  }
  function openForItems(action, references) {
    if (action === 'removeMembership') {
      const changed = commit((state, audit) => changeMembership(state, audit, libraryId, references.map((entry) => entry.id), collection?.id, false))
      if (changed) announce({ text: 'Removed from ' + collection.name + '.' })
      return
    }
    if (action === 'restore') {
      setItemStatus(references[0], 'active')
      return
    }
    setDialog({ action, items: references })
  }
  function setItemStatus(reference, status) {
    const restoring = status === 'active'
    const changed = commit((state, audit, timestamp) => {
      if (!writable(records(state.libraries).find((entry) => entry.id === libraryId))) return state
      const all = records(state.items)
      const target = all.find((entry) => entry.id === reference.id && entry.libraryId === libraryId)
      if (!target || !(restoring ? target.status === 'trashed' : active(target))) return state
      return { ...state, items: all.map((entry) => entry === target ? {
        ...entry, status, trashedAt: restoring ? null : timestamp, ...audit,
      } : entry) }
    })
    closeDialog()
    if (changed) {
      navigate(libraryPath(libraryId, scope), { replace: true })
      announce({ text: restoring ? 'Reference restored.' : 'Reference moved to Trash.' })
    }
  }

  const action = dialog?.action
  const canSelect = view !== 'trash'
  const allSelected = filtered.length > 0 && selectedItems.length === filtered.length
  return <>
    <div className="workspace-top">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to={appPath('/libraries')}>Libraries</Link><span aria-hidden="true">›</span>
        {collection || view
          ? <><Link to={libraryPath(libraryId)}>{library.name}</Link><span aria-hidden="true">›</span><span>{heading}</span></>
          : <span>{library.name}</span>}
      </nav>
      <div className="page-heading">
        <div><h1>{heading}</h1>
          <p className="workspace-meta">
            <span className="scope-kind">{collection ? 'Collection' : library.kind === 'personal' ? 'Personal library' : 'Group library'}</span>
            <span className="meta-dot" aria-hidden="true" />
            <span>{scopedItems.length} {scopedItems.length === 1 ? 'reference' : 'references'}</span>
            {!canEdit && <><span className="meta-dot" aria-hidden="true" /> <span>Read only</span></>}
          </p>
        </div>
        <label className="switcher"><span>Switch library</span><select aria-label="Switch library" value={libraryId} onChange={(event) => navigate(libraryPath(event.target.value))}>
          {libraries.map((entry) => <option key={entry.id} value={entry.id}>{entry.name || 'Untitled library'}</option>)}
        </select></label>
      </div>
    </div>
    <div className="workspace">
      <Collections key={libraryId} library={library} collections={collections} items={liveItems} current={collection} view={view} onAction={open} />
      <section className="reference-pane" aria-label="References">
        <div className="reference-controls">
          <div className="reference-toolbar">
            <label className="search-field"><span className="search-icon" aria-hidden="true" /><span className="visually-hidden">Search references</span>
              <input type="search" placeholder="Search references…" value={search} onChange={(event) => { setSearch(event.target.value); setSelection([]) }} />
            </label>
            {canEdit && view !== 'trash' && <button className="primary new-item" onClick={() => open('newItem')}><span aria-hidden="true">＋</span> New Item</button>}
          </div>
          <div className="reference-filters">
            <label><span>Type</span><select aria-label="Filter by type" value={type} onChange={(event) => { setType(event.target.value); setSelection([]) }}>
              <option value="">All types</option>{Object.entries(itemTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
            <label><span>Tag</span><select aria-label="Filter by tag" value={tag} onChange={(event) => { setTag(event.target.value); setSelection([]) }}>
              <option value="">All tags</option>{tags.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
              {tag && !tags.includes(tag) && <option value={tag}>{tag}</option>}
            </select></label>
            <label className="sort-field"><span>Sort</span><select aria-label="Sort references" value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="added">Date added</option><option value="title">Title A–Z</option><option value="year">Year, newest</option>
            </select></label>
            {isFiltering && <button className="subtle small" onClick={clearFilters}>Clear Filters</button>}
          </div>
        </div>
        {selectedItems.length > 0 && <div className="selection-toolbar" aria-label="Selected reference actions">
          <strong>{selectedItems.length} selected</strong>
          <button className="small primary" onClick={() => openForItems('cite', selectedItems)}>Cite</button>
          {canEdit && <button className="small" onClick={() => openForItems('membership', selectedItems)}>Add to Collection</button>}
          {canEdit && collection && <button className="small" onClick={() => openForItems('removeMembership', selectedItems)}>Remove from Collection</button>}
          {destinations.length > 0 && <button className="small" onClick={() => openForItems('copyItems', selectedItems)}>Copy to Group Library</button>}
          <button className="small subtle" onClick={() => setSelection([])}>Clear selection</button>
        </div>}
        {filtered.length ? <>
          <div className="results-label" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'reference' : 'references'}{isFiltering ? ' found' : ''}</div>
          <table className="reference-table">
            <thead><tr>
              {canSelect && <th className="check-col"><input type="checkbox" aria-label="Select all visible references" checked={allSelected}
                ref={(input) => { if (input) input.indeterminate = !allSelected && selectedItems.length > 0 }}
                onChange={() => setSelection(allSelected ? [] : [...new Set([...selection.filter((id) => visibleById.has(id)), ...filtered.map((entry) => entry.id)])])} /></th>}
              <th scope="col">Title</th><th scope="col" className="year-col">Year</th><th scope="col" className="type-col">Type</th><th scope="col" className="publication-col">Publication</th>
            </tr></thead>
            <tbody>{filtered.map((entry) => {
              const title = entry.title || 'Untitled reference'
              const chosen = selectedIds.has(entry.id)
              const typeName = itemTypes[entry.itemType] ?? 'Reference'
              const publication = publicationOf(entry)
              return <tr key={entry.id} className={chosen || item?.id === entry.id ? 'selected' : undefined}>
                {canSelect && <td className="check-col"><input type="checkbox" aria-label={'Select ' + title} checked={chosen} onChange={() => toggle(entry.id)} /></td>}
                <td className="title-col"><div className="reference-summary">
                  <Tile type={entry.itemType} />
                  <div><Link to={libraryPath(libraryId, { ...scope, itemId: entry.id })}>{title}</Link><span className="creator-line">{creatorsOf(entry) || '—'}</span>
                    <span className="compact-meta">{[yearOf(entry), typeName, publication].filter(Boolean).join(' · ')}</span>
                  </div>
                </div></td>
                <td className="year-col">{yearOf(entry) || '—'}</td><td className="type-col">{typeName}</td><td className="publication-col">{publication || '—'}</td>
              </tr>
            })}</tbody>
          </table>
        </> : <Empty title={isFiltering ? 'No matching references' : view === 'trash' ? 'Trash is empty' : view === 'unfiled' ? 'No unfiled references' : 'No references yet'}>
          {isFiltering
            ? <><p>Try a different search or change the filters.</p><button onClick={clearFilters}>Clear Filters</button></>
            : canEdit && view !== 'trash'
              ? <><p>{collection ? 'Add an item here, or file a reference from All References.' : 'Add a reference to get started.'}</p><button onClick={() => open('newItem')}>New Item</button></>
              : view === 'trash' ? <p>References moved to Trash appear here.</p> : <p>References will appear here when they are added to this library.</p>}
        </Empty>}
      </section>
    </div>
    {item && <ItemDetails key={item.id} item={item} collections={collections} library={library} currentCollection={collection}
      close={() => navigate(libraryPath(libraryId, scope), { replace: true })} onAction={(next) => openForItems(next, [item])} />}
    {['newItem', 'editItem'].includes(action) && <ItemForm libraryId={libraryId} item={dialog.items?.[0]} collection={collection} close={closeDialog}
      onCreated={(id) => { clearFilters(); navigate(libraryPath(libraryId, { ...scope, itemId: id })) }} />}
    {collectionActions.includes(action) && <CollectionForm action={action} libraryId={libraryId} collection={dialog.collection}
      collections={collections} close={closeDialog} onComplete={({ created, removed }) => {
        if (created) navigate(libraryPath(libraryId, { collectionId: created }))
        if (removed.has(collection?.id)) navigate(libraryPath(libraryId), { replace: true })
      }} />}
    {action === 'membership' && <MembershipForm libraryId={libraryId} items={dialog.items} collections={collections} close={closeDialog} />}
    {action === 'copyItems' && <CopyItemsForm libraryId={libraryId} items={dialog.items} destinations={destinations} close={closeDialog} />}
    {action === 'cite' && <Suspense fallback={<Dialog title="Create citation" close={closeDialog}><div className="form" role="status">Preparing citation preview…</div></Dialog>}>
      <CitationComposer items={dialog.items} libraryId={libraryId} close={closeDialog} />
    </Suspense>}
    {action === 'trash' && <Dialog title="Move to Trash" close={closeDialog}><form className="form" onSubmit={(event) => { event.preventDefault(); setItemStatus(dialog.items[0], 'trashed') }}>
      <p>Move <strong>{dialog.items[0].title}</strong> to Trash? You can restore it with its collection memberships later.</p>
      <FormActions close={closeDialog} submit="Move to Trash" danger />
    </form></Dialog>}
  </>
}
