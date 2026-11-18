import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { active, byName, collectionTree, descendantIds, newId, records, validParent, values, writable } from '../utils/model.js'
import { libraryPath } from '../utils/routes.js'
import { Dialog, FormActions, Menu } from './ui.jsx'

export function Collections({ library, collections, items, current, view, onAction }) {
  const [collapsed, setCollapsed] = useState(new Set())
  const [reveal, setReveal] = useState(false)
  const { roots, children } = useMemo(() => collectionTree([...collections].sort(byName)), [collections])
  const counts = new Map()
  for (const item of items) {
    for (const id of new Set(values(item.collectionIds))) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  const canEdit = writable(library)
  function toggle(id) {
    setCollapsed((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function renderBranch(entries, depth = 0) {
    return <ul className={depth >= 1 && depth <= 3 ? 'tree-list indented' : 'tree-list'}>{entries.map((collection) => {
      const sub = children.get(collection.id) ?? []
      const expanded = !collapsed.has(collection.id)
      const selected = current?.id === collection.id
      return <li key={collection.id}>
        <div className={'tree-row' + (selected ? ' current' : '')}>
          {sub.length
            ? <button className="tree-disclosure" type="button" aria-label={(expanded ? 'Collapse ' : 'Expand ') + collection.name}
                aria-expanded={expanded} onClick={() => toggle(collection.id)}>{expanded ? '▾' : '▸'}</button>
            : <span className="tree-spacer" />}
          <Link aria-current={selected ? 'page' : undefined} to={libraryPath(library.id, { collectionId: collection.id })}>
            <span className="folder-icon" aria-hidden="true" /><span className="tree-name">{collection.name || 'Untitled collection'}</span>
            <span className="tree-count">{counts.get(collection.id) ?? 0}</span>
          </Link>
          {canEdit && <Menu label={'Manage ' + collection.name}>
            <button onClick={() => onAction('newSubcollection', collection)}>New Subcollection</button>
            <button onClick={() => onAction('renameCollection', collection)}>Rename</button>
            <button onClick={() => onAction('moveCollection', collection)}>Move</button>
            <button className="text-danger" onClick={() => onAction('deleteCollection', collection)}>Delete</button>
          </Menu>}
        </div>
        {expanded && sub.length > 0 && renderBranch(sub, depth + 1)}
      </li>
    })}</ul>
  }
  return <aside className={'collection-panel' + (reveal ? ' reveal' : '')} aria-label="Library collections">
    <button className="mobile-collections" aria-expanded={reveal} aria-controls="collection-navigation" onClick={() => setReveal(!reveal)}>
      <span><span className="folder-icon" aria-hidden="true" /> Collections</span><span aria-hidden="true">{reveal ? '−' : '+'}</span>
    </button>
    <div className="collection-content" id="collection-navigation">
      <div className="scope-links">
        <Link aria-current={!current && !view ? 'page' : undefined} to={libraryPath(library.id)}><span aria-hidden="true">▤</span> All References<span className="scope-count">{items.length}</span></Link>
        <Link aria-current={view === 'unfiled' ? 'page' : undefined} to={libraryPath(library.id, { view: 'unfiled' })}><span aria-hidden="true">⊡</span> Unfiled</Link>
        <Link aria-current={view === 'trash' ? 'page' : undefined} to={libraryPath(library.id, { view: 'trash' })}><span aria-hidden="true">♲</span> Trash</Link>
      </div>
      <div className="collection-heading"><h2>Collections</h2>
        {canEdit && <button type="button" className="icon-button" onClick={() => onAction('newCollection')} aria-label="New Collection" title="New Collection">+</button>}
      </div>
      {roots.length ? renderBranch(roots) : <p className="muted tree-empty">No collections yet.</p>}
    </div>
  </aside>
}

const titles = {
  newCollection: 'New collection', newSubcollection: 'New subcollection',
  renameCollection: 'Rename collection', moveCollection: 'Move collection', deleteCollection: 'Delete collection',
}

export function CollectionForm({ action, libraryId, collection, collections, close, onComplete }) {
  const { commit, announce } = useStore()
  const creating = ['newCollection', 'newSubcollection'].includes(action)
  const moving = action === 'moveCollection'
  const deleting = action === 'deleteCollection'
  const naming = creating || action === 'renameCollection'
  const [name, setName] = useState(action === 'renameCollection' ? collection.name ?? '' : '')
  const [parentId, setParentId] = useState(moving ? collection.parentId ?? '' : action === 'newSubcollection' ? collection.id : '')
  const [error, setError] = useState('')
  const options = moving ? collections.filter((entry) => validParent(collections, entry.id, collection.id)).sort(byName) : []
  function submit(event) {
    event.preventDefault()
    if (naming && !name.trim()) {
      setError('Enter a collection name.')
      event.currentTarget.elements.collectionName.focus()
      return
    }
    if (moving && !validParent(collections, parentId, collection.id)) {
      setError('Choose a valid parent collection.')
      return
    }
    if (moving && (collection.parentId ?? '') === parentId) {
      close()
      return
    }
    const id = creating ? newId('col') : collection.id
    let removed = new Set()
    const changed = commit((state, audit, createdAt) => {
      if (!writable(records(state.libraries).find((entry) => entry.id === libraryId))) return state
      const all = records(state.collections)
      const scoped = all.filter((entry) => entry.libraryId === libraryId)
      const eligible = scoped.filter(active)
      if ((creating || moving) && !validParent(eligible, parentId, id)) return state
      if (creating) return { ...state, collections: [...all, {
        id, libraryId, parentId: parentId || null, name: name.trim(), status: 'active', deletedAt: null, createdAt, ...audit,
      }] }
      if (!eligible.some((entry) => entry.id === id)) return state
      if (deleting) {
        removed = descendantIds(scoped, id)
        return { ...state,
          collections: all.map((entry) => entry.libraryId === libraryId && removed.has(entry.id) && active(entry)
            ? { ...entry, status: 'deleted', deletedAt: createdAt, ...audit } : entry),
          items: records(state.items).map((item) => item.libraryId === libraryId && values(item.collectionIds).some((id) => removed.has(id))
            ? { ...item, collectionIds: item.collectionIds.filter((id) => !removed.has(id)), ...audit } : item),
        }
      }
      const fields = moving ? { parentId: parentId || null } : { name: name.trim() }
      return { ...state, collections: all.map((entry) => entry.libraryId === libraryId && entry.id === id ? { ...entry, ...fields, ...audit } : entry) }
    })
    if (!changed) {
      setError('The collection or destination is no longer available.')
      return
    }
    close()
    onComplete({ created: creating ? id : null, removed })
    announce({ text: deleting ? 'Collection deleted. References kept in the library.'
      : creating ? 'Collection created.' : moving ? 'Collection moved.' : 'Collection renamed.' })
  }

  return <Dialog title={titles[action]} close={close}>
    <form className="form" noValidate onSubmit={submit}>
      {naming && <label>Collection name<input data-initial-focus name="collectionName" required value={name} onChange={(event) => { setName(event.target.value); setError('') }}
        aria-invalid={Boolean(error)} aria-describedby={error ? 'collection-error' : undefined} /></label>}
      {action === 'newSubcollection' && <p className="muted">Parent collection: {collection.name}</p>}
      {moving && <>
        <p>Move <strong>{collection.name}</strong> to a new parent.</p>
        <label>Destination<select aria-label="Destination" data-initial-focus value={parentId} onChange={(event) => { setParentId(event.target.value); setError('') }}>
          <option value="">Library root</option>
          {options.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
        </select></label>
      </>}
      {deleting && <p>Delete <strong>{collection.name}</strong> and its subcollections? References will stay in the library.</p>}
      {error && <p className="field-error" id="collection-error" role="alert">{error}</p>}
      <FormActions close={close} submit={deleting ? 'Delete collection' : creating ? 'Create collection' : moving ? 'Move collection' : 'Save changes'} danger={deleting} />
    </form>
  </Dialog>
}

export function changeMembership(state, audit, libraryId, itemIds, collectionId, add) {
  if (!writable(records(state.libraries).find((entry) => entry.id === libraryId))) return state
  if (!records(state.collections).some((entry) => entry.id === collectionId && entry.libraryId === libraryId && active(entry))) return state
  const selected = new Set(itemIds)
  let changed = false
  const items = records(state.items).map((item) => {
    if (!selected.has(item.id) || item.libraryId !== libraryId || !active(item)) return item
    const ids = values(item.collectionIds)
    if (ids.includes(collectionId) === add) return item
    changed = true
    return { ...item, collectionIds: add ? [...ids, collectionId] : ids.filter((id) => id !== collectionId), ...audit }
  })
  return changed ? { ...state, items } : state
}

export function MembershipForm({ libraryId, items, collections, close }) {
  const { commit, announce } = useStore()
  const [choice, setChoice] = useState('')
  const ids = items.map((item) => item.id)
  const options = [...collections].sort(byName)
  function submit(event) {
    event.preventDefault()
    if (!choice) return
    const changed = commit((state, audit) => changeMembership(state, audit, libraryId, ids, choice, true))
    close()
    announce({ text: changed ? 'Collection membership updated.' : 'The selected references are already filed there.' })
  }
  return <Dialog title="Add to Collection" close={close}>
    <form className="form" onSubmit={submit}>
      {options.length ? <>
        <p>{ids.length === 1 ? 'File this reference in another collection.' : 'File ' + ids.length + ' selected references in a collection.'}</p>
        <label>Collection<select aria-label="Collection" data-initial-focus value={choice} onChange={(event) => setChoice(event.target.value)} required>
          <option value="" disabled>Choose a collection</option>
          {options.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
        </select></label>
        <div className="form-actions"><button type="button" onClick={close}>Cancel</button><button className="primary" disabled={!choice}>Add to Collection</button></div>
      </> : <><p>Create a collection in this library before filing references.</p><div className="form-actions"><button type="button" onClick={close}>Close</button></div></>}
    </form>
  </Dialog>
}
