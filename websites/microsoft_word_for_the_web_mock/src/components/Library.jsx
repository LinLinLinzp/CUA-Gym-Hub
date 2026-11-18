import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, ChevronDown, Clock3, Copy, FilePlus2, FileText, Pencil, Search, Star, Trash2, Users, X } from 'lucide-react'
import { actorOf, canEdit, directRole, isActive, rows } from '../data/access.js'
import { deleteDocument, recordActivity, renameDocument } from '../data/documents.js'
import { useWorkspace } from '../data/store.jsx'
import { documentPath, routeTo } from '../utils/routes.js'
import { DeleteDialog, RenameField, useDocumentCreation } from './DocumentActions.jsx'
import { Avatar, displayDate, DocumentIcon, Menu, Modal, Wordmark } from './ui.jsx'

const filters = [
  { id: 'recent', label: 'Recent', icon: Clock3 },
  { id: 'favorites', label: 'Favorites', icon: Star },
  { id: 'shared', label: 'Shared with me', icon: Users },
]
const empty = {
  recent: ['No documents yet', 'Documents you can open will appear here.'],
  favorites: ['No favorites yet', 'Star a document to keep it here.'],
  shared: ['No shared documents', 'Documents shared directly with you will appear here.'],
}

function TemplatePreview({ template, index }) {
  return <span className={`template-art template-color-${index % 6}`} aria-hidden="true">
    <span className="template-page"><b>{template.name}</b><i /><i /><i /><i /></span>
  </span>
}

function StartSection({ templates, disabled }) {
  const create = useDocumentCreation()
  const [expanded, setExpanded] = useState(false)
  return <section className="start-section" aria-labelledby="start-heading">
    <div className="section-title"><h2 id="start-heading">Create new</h2>
      {templates.length > 4 && <button type="button" className="button ghost" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Fewer templates' : 'All templates'}<ChevronDown size={15} className={expanded ? 'rotate' : ''} />
      </button>}
    </div>
    <div className="start-cards">
      <button className="start-card blank-card" type="button" aria-label="Create blank document" disabled={disabled} onClick={() => create()}>
        <span className="template-art blank-art"><FilePlus2 size={29} strokeWidth={1.45} /></span><span>Blank document</span>
      </button>
      {(expanded ? templates : templates.slice(0, 4)).map((template, index) => <button type="button" className="start-card" key={template.id}
        title={template.description} disabled={disabled} onClick={() => create({ template })}>
        <TemplatePreview template={template} index={index} /><span>{template.name || 'Template'}</span>
      </button>)}
    </div>
  </section>
}

export function Library({ state }) {
  const { commit } = useWorkspace()
  const actor = actorOf(state)
  const [filter, setFilter] = useState('recent')
  const [search, setSearch] = useState('')
  const create = useDocumentCreation()
  const [dialog, setDialog] = useState(null)
  const [sort, setSort] = useState(null)
  const filterLabel = filters.find(({ id }) => id === filter).label
  const query = search.trim().toLowerCase()
  const files = useMemo(() => {
    const activity = new Map(rows(state, 'documentActivity').filter((row) => row.userId === actor?.id).map((row) => [row.documentId, row]))
    const people = new Map(rows(state, 'users').map((user) => [user.id, user]))
    const documents = rows(state, 'documents').filter((doc) => isActive(doc) && (!actor || directRole(state, doc, actor)))
    return documents.map((doc) => ({ doc, owner: people.get(doc.ownerId), activity: activity.get(doc.id) }))
      .filter(({ doc, owner, activity: history }) => {
        if (filter === 'favorites' && !history?.isFavorite) return false
        if (filter === 'shared' && (!actor || doc.ownerId === actor.id)) return false
        return !query || [doc.title, owner?.name, owner?.email, actor && doc.ownerId === actor.id ? 'me' : ''].some((value) => value?.toLowerCase().includes(query))
      })
      .sort((a, b) => {
        let result
        if (sort?.field === 'title') result = (a.doc.title ?? '').localeCompare(b.doc.title ?? '', undefined, { numeric: true, sensitivity: 'base' })
        else if (sort?.field === 'updatedAt') result = (a.doc.updatedAt ?? '').localeCompare(b.doc.updatedAt ?? '')
        else result = (b.activity?.openedAt || b.doc.updatedAt || '').localeCompare(a.activity?.openedAt || a.doc.updatedAt || '')
        return result * (sort?.direction === 'desc' ? -1 : 1) || String(a.doc.id).localeCompare(String(b.doc.id))
      })
  }, [actor, filter, query, sort, state])
  function sortBy(field) {
    setSort({ field, direction: sort?.field === field ? (sort.direction === 'asc' ? 'desc' : 'asc') : (field === 'title' ? 'asc' : 'desc') })
  }
  function sortHeader(field, label) {
    const active = sort?.field === field
    const Icon = sort?.direction === 'asc' ? ArrowUp : ArrowDown
    return <th scope="col" className={field === 'updatedAt' ? 'secondary-column' : undefined} aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => sortBy(field)}>{label}{active && <Icon size={13} />}</button>
    </th>
  }
  const open = (doc) => commit((current) => recordActivity(current, doc.id, { openedAt: new Date().toISOString() }))
  function fileActions(doc, activity) {
    const role = directRole(state, doc)
    return [
      { label: activity?.isFavorite ? 'Remove from favorites' : 'Add to favorites', icon: <Star size={15} />, disabled: !actor,
        action: () => commit((current) => recordActivity(current, doc.id, { isFavorite: !activity?.isFavorite })) },
      ...(canEdit(role) ? [
        { label: 'Rename', icon: <Pencil size={15} />, action: () => setDialog({ type: 'rename', doc }) },
        { label: 'Create a copy', icon: <Copy size={15} />, action: () => create({ source: doc }) },
      ] : []),
      ...(role === 'owner' ? [{ label: 'Delete', icon: <Trash2 size={15} />, danger: true, action: () => setDialog({ type: 'delete', doc }) }] : []),
    ]
  }
  const closeDialog = () => setDialog(null)
  const [emptyTitle, emptyDescription] = query ? ['No results found', 'Try a different document title or owner.'] : empty[filter]

  return <div className="library">
    <header className="library-header">
      <Wordmark />
      <div className="library-search">
        <Search size={17} aria-hidden="true" /><input type="search" aria-label="Search documents" placeholder="Search documents" value={search} onChange={(event) => setSearch(event.target.value)} />
        {search && <button type="button" className="icon-button" aria-label="Clear search" onClick={() => setSearch('')}><X size={16} /></button>}
      </div>
      <Avatar user={actor} />
    </header>
    <div className="library-layout">
      <nav className="library-rail" aria-label="Document library">
        <div className="rail-caption">Library</div>
        {filters.map(({ id, label, icon: Icon }) => <button key={id} type="button" title={label} aria-current={filter === id ? 'page' : undefined}
          className={filter === id ? 'rail-active' : ''} onClick={() => { setFilter(id); setSort(null) }}><Icon size={17} /><span>{label}</span></button>)}
      </nav>
      <main className="library-main">
        <h1>Documents</h1>
        <StartSection templates={rows(state, 'templates')} disabled={!actor} />
        <section className="files-section" aria-labelledby="files-heading">
          <div className="section-title"><h2 id="files-heading">{query ? 'Search results' : filter === 'recent' ? 'Jump back in' : filterLabel}</h2><span className="muted">{files.length} {files.length === 1 ? 'document' : 'documents'}</span></div>
          {files.length ? <div className="file-list"><table>
            <colgroup><col /><col className="owner-column" /><col className="modified-column" /><col className="file-action-column" /><col className="file-action-column" /></colgroup>
            <thead><tr>{sortHeader('title', 'Name')}<th className="secondary-column" scope="col">Owner</th>{sortHeader('updatedAt', 'Last modified')}<th scope="col"><span className="sr-only">Favorite</span></th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{files.map(({ doc, owner, activity }) => <tr key={doc.id}>
              <td><Link to={routeTo(documentPath(doc.id))} onClick={actor ? () => open(doc) : undefined} className="file-link">
                <DocumentIcon /><span><strong>{doc.title || 'Untitled document'}</strong><small>{doc.locationLabel || 'Documents'}</small></span>
              </Link></td>
              <td className="secondary-column"><span className="row-owner">{owner && <Avatar user={owner} small />}<span>{actor && doc.ownerId === actor.id ? 'Me' : owner?.name || 'Unknown owner'}</span></span></td>
              <td className="secondary-column"><time dateTime={doc.updatedAt}>{displayDate(doc.updatedAt)}</time></td>
              <td><button className={`icon-button favorite ${activity?.isFavorite ? 'is-favorite' : ''}`} type="button" disabled={!actor}
                title={activity?.isFavorite ? 'Remove from favorites' : 'Add to favorites'} aria-label={`Favorite ${doc.title || 'document'}`} aria-pressed={Boolean(activity?.isFavorite)}
                onClick={() => commit((current) => recordActivity(current, doc.id, { isFavorite: !activity?.isFavorite }))}><Star size={17} /></button></td>
              <td><Menu label={`More actions for ${doc.title || 'document'}`} items={fileActions(doc, activity)} /></td>
            </tr>)}</tbody>
          </table></div> : <div className="empty-list"><FileText size={29} strokeWidth={1.45} /><strong>{emptyTitle}</strong><p>{emptyDescription}</p></div>}
        </section>
      </main>
    </div>
    {dialog?.type === 'rename' && <Modal title="Rename document" onClose={closeDialog}>
      <RenameField doc={dialog.doc} onCancel={closeDialog} onSave={(title) => {
        commit((current) => renameDocument(current, dialog.doc.id, title)); closeDialog()
      }} />
    </Modal>}
    {dialog?.type === 'delete' && <DeleteDialog doc={dialog.doc} onClose={closeDialog} onDelete={() => {
      commit((current) => deleteDocument(current, dialog.doc.id)); closeDialog()
    }} />}
  </div>
}
