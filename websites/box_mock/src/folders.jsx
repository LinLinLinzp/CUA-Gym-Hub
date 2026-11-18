import { useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useWorkspace } from './store.jsx'
import {
  carryRetention, coverage, directory, durationLabel, FieldError, folderDestination, folderName, grants, humanDate,
  inviteRecords, nameOf, normalize, person, personName, replace, roles, stampRemoval,
} from './model.js'
import { Breadcrumbs, Chip, Dialog, Empty, Field, Form, Heading, Icon, InviteFields, RouteLink, RowMenu, useRoute } from './ui.jsx'

const folderUrl = id => id == null ? '/' : `/folders/${encodeURIComponent(id)}`
const inviteInput = data => ({
  recipients: String(data.get('recipients') ?? ''),
  role: data.get('role'),
  message: String(data.get('message') ?? ''),
})

function FolderPicker({ tree, state, source, value, setValue }) {
  const trail = tree.chain(value) || []
  const choices = state.folders.filter(folder => (folder.parentId ?? null) === value && tree.visible(folder.id) && folder.id !== source.id)
    .sort((a, b) => nameOf(a).localeCompare(nameOf(b)))
  return <>
    <div className="inline-actions" aria-label="Destination path">
      <button type="button" onClick={() => setValue(null)}>All files</button>
      {trail.map(folder => <button key={folder.id} type="button" onClick={() => setValue(folder.id)}>{nameOf(folder)}</button>)}
    </div>
    <p>Destination <strong>{tree.pathLabel(value)}</strong></p>
    <div className="picker">{choices.length ? choices.map(folder =>
      <button key={folder.id} type="button" onClick={() => setValue(folder.id)}><Icon name="folder" />{nameOf(folder)}<Icon name="chevron" size={13} /></button>
    ) : <p className="panel-pad muted">No subfolders here.</p>}</div>
  </>
}

function FolderEditor({ kind, folder, parentId, onClose, fromDetail }) {
  const { state, commit } = useWorkspace()
  const route = useRoute()
  const tree = directory(state)
  const original = folder?.parentId ?? null
  const canRestore = useMemo(() => {
    if (kind !== 'restore') return false
    try { folderDestination(state, folder, original, false); return true }
    catch { return false }
  }, [state, folder, kind, original])
  const [destination, setDestination] = useState(kind === 'move' || canRestore ? original : null)
  const isPicker = kind === 'move' || (kind === 'restore' && !canRestore)
  const verbs = { create: 'New folder', rename: 'Rename folder', move: 'Move folder', trash: 'Move to trash', restore: 'Restore folder' }
  const actions = { create: 'Create folder', rename: 'Save name', move: 'Move here', trash: 'Move to trash', restore: 'Restore folder' }

  function save(data) {
    const messages = { create: 'Folder created.', rename: 'Folder renamed.', move: 'Folder moved.', trash: 'Folder moved to trash.', restore: 'Folder restored.' }
    commit((current, meta) => {
      const map = directory(current)
      if (kind === 'create') {
        if (!map.visible(parentId)) throw new Error('Choose an active parent folder.')
        const record = {
          ...meta.record('folder'), parentId, name: folderName(current, data.get('name'), parentId),
          description: String(data.get('description')).trim() || null, ownerId: meta.actor, status: 'active',
          trashedAt: null, trashedById: null,
        }
        const invitations = inviteRecords(current, meta, record, inviteInput(data))
        return { ...current, folders: [...current.folders, record], collaborations: [...current.collaborations, ...invitations] }
      }
      const target = map.folders.get(folder.id)
      if (!target || (kind === 'restore' ? target.status !== 'trashed' : !map.visible(target.id))) {
        throw new Error('This folder is no longer available for that action.')
      }
      let patch = meta.update
      let assignments = current.retentionAssignments
      if (kind === 'rename') patch = { ...patch, name: folderName(current, data.get('name'), target.parentId ?? null, target.id) }
      if (kind === 'trash') patch = { ...patch, status: 'trashed', trashedAt: meta.now, trashedById: meta.actor }
      if (kind === 'move' || kind === 'restore') {
        folderDestination(current, target, destination, kind === 'move')
        if ((target.parentId ?? null) !== destination) {
          assignments = carryRetention(current, meta, target, destination)
          patch = { ...patch, parentId: destination }
        }
        if (kind === 'restore') patch = { ...patch, status: 'active', trashedAt: null, trashedById: null }
      }
      return { ...current, folders: replace(current.folders, target.id, patch), retentionAssignments: assignments }
    }, messages[kind])
    onClose()
    if (kind === 'trash' && fromDetail) route(folderUrl(original))
  }

  return <Dialog title={verbs[kind]} onClose={onClose} wide={isPicker}>
    <Form action={actions[kind]} onClose={onClose} onSave={save} danger={kind === 'trash'}>
      {['create', 'rename'].includes(kind) && <Field title="Folder name"><input name="name" required autoFocus defaultValue={folder?.name} /></Field>}
      {kind === 'create' && <>
        <Field title="Description (optional)"><textarea name="description" rows="2" /></Field>
        <InviteFields users={state.users} optional />
      </>}
      {kind === 'trash' && <p>Move <strong>{nameOf(folder)}</strong> and its contents to Trash?</p>}
      {kind === 'restore' && <p>Restore <strong>{nameOf(folder)}</strong>{canRestore ? ` to ${tree.pathLabel(original)}?` : '. Choose an available location.'}</p>}
      {kind === 'move' && <p>Choose a new location for <strong>{nameOf(folder)}</strong>.</p>}
      {isPicker && <FolderPicker tree={tree} state={state} source={folder} value={destination} setValue={setDestination} />}
    </Form>
  </Dialog>
}

function AccessDialog({ folder, onClose }) {
  const { state, commit } = useWorkspace()
  const [panel, setPanel] = useState({ kind: 'list' })
  const back = () => setPanel({ kind: 'list' })
  const tree = directory(state)
  const entries = grants(state, folder.id)
  const { kind, entry } = panel
  function save(data) {
    commit((current, meta) => {
      const map = directory(current)
      if (!map.visible(folder.id)) throw new Error('This folder is no longer active.')
      if (kind === 'invite') {
        const records = inviteRecords(current, meta, map.folders.get(folder.id), inviteInput(data))
        if (!records.length) throw new FieldError('recipients', 'Enter at least one email address.')
        return { ...current, collaborations: [...current.collaborations, ...records] }
      }
      const target = current.collaborations.find(item => item.id === entry.id && item.folderId === folder.id && ['active', 'pending'].includes(item.status))
      if (!target) throw new Error('This grant is no longer available.')
      const role = data.get('role')
      if (kind === 'role' && !Object.hasOwn(roles, role)) throw new FieldError('role', 'Select an access role.')
      const patch = kind === 'role' ? { ...meta.update, role } : stampRemoval(meta)
      return { ...current, collaborations: replace(current.collaborations, target.id, patch) }
    }, { invite: 'Invitations saved.', role: 'Access role updated.', remove: 'Access removed.' }[kind])
    back()
  }
  const names = { list: 'Manage access', invite: 'Invite people', role: 'Change role', remove: 'Remove access' }
  return <Dialog title={names[kind]} onClose={kind === 'list' ? onClose : back} wide>
    {kind === 'list' ? <div className="dialog-content">
      <div className="section-head"><p>{nameOf(folder)}</p><button className="primary" onClick={() => setPanel({ kind: 'invite' })}><Icon name="plus" />Invite people</button></div>
      <ul className="clean-list">
        <li className="record-row"><div className="record-head"><strong>{personName(state, folder.ownerId)}</strong><span className="chip">Owner</span></div></li>
        {entries.map(item => {
          const direct = item.folderId === folder.id
          return <li key={item.id} className="record-row">
            <div className="record-head"><strong>{person(state, item.userId)?.name || item.inviteeEmail || 'Unknown invitee'}</strong><Chip status={item.status} /></div>
            <p>{roles[item.role] || 'Unknown role'} · {direct ? 'Direct access' : <>Inherited from <RouteLink to={folderUrl(item.folderId)} onClick={onClose}>{tree.pathLabel(item.folderId)}</RouteLink></>}</p>
            {direct && <div className="inline-actions">
              <button onClick={() => setPanel({ kind: 'role', entry: item })}>Change role</button>
              <button onClick={() => setPanel({ kind: 'remove', entry: item })}>Remove access</button>
            </div>}
          </li>
        })}
      </ul>
    </div> : <Form key={kind} action={kind === 'invite' ? 'Send invitations' : kind === 'role' ? 'Save role' : 'Remove access'} onClose={back} onSave={save} danger={kind === 'remove'}>
      {kind === 'invite' && <InviteFields users={state.users} />}
      {kind === 'role' && <Field title="Role"><select name="role" defaultValue={entry.role}>{Object.entries(roles).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></Field>}
      {kind === 'remove' && <p>Remove direct access for <strong>{person(state, entry.userId)?.name || entry.inviteeEmail || 'this collaborator'}</strong>?</p>}
    </Form>}
  </Dialog>
}

function FolderContext({ state, folder, openAccess, tree }) {
  const entries = grants(state, folder.id)
  const policies = coverage(state, folder.id)
  return <aside className="stack" aria-label="Folder details">
    <section className="panel panel-pad">
      <h2><Icon name="people" />Access</h2>
      <p className="muted">Owned by {personName(state, folder.ownerId)}</p>
      <ul className="clean-list">{entries.slice(0, 4).map(entry => <li className="record-row" key={entry.id}>
        <p>{person(state, entry.userId)?.name || entry.inviteeEmail || 'Unknown invitee'}</p>
        <small>{roles[entry.role] || 'Unknown role'} · {entry.folderId === folder.id ? entry.status : 'Inherited'}</small>
      </li>)}</ul>
      <button className="section-button" onClick={openAccess}>Manage access</button>
    </section>
    {policies.length > 0 && <section className="panel panel-pad">
      <h2><Icon name="shield" />Retention coverage</h2>
      <ul className="clean-list">{policies.map(({ entry, policy }) => {
        const source = state.retentionAssignments.find(item => item.id === entry.sourceAssignmentId)
        const mode = entry.folderId !== folder.id ? `Inherited from ${tree.pathLabel(entry.folderId)}` : entry.kind === 'carried' ? 'Carried coverage' : 'Direct coverage'
        return <li className="record-row" key={entry.id}>
          <div className="record-head"><RouteLink className="record-link" to={`/governance/retention/${encodeURIComponent(policy.id)}`}>{nameOf(policy)}</RouteLink><Chip status={policy.status} /></div>
          <small>{durationLabel(policy.duration)} · {mode}</small>
          {entry.kind === 'carried' && source && <p><small>Original source {tree.pathLabel(source.folderId)}</small></p>}
        </li>
      })}</ul>
    </section>}
  </aside>
}

function folderActions(folder, open) {
  return [['Manage access', 'access'], ['Rename', 'rename'], ['Move', 'move'], ['Move to trash', 'trash']].map(([label, kind]) => [label, () => open({ kind, folder })])
}

export function FilesPage({ search = false }) {
  const { state } = useWorkspace()
  const { folderId } = useParams()
  const location = useLocation()
  const tree = directory(state)
  const folder = tree.folders.get(folderId)
  const parentId = folderId ?? null
  const query = new URLSearchParams(location.search).get('q')?.trim() ?? ''
  const [filter, setFilter] = useState('All items')
  const [sort, setSort] = useState('name')
  const [action, setAction] = useState(null)
  const close = () => setAction(null)
  if (folderId && !tree.visible(folderId)) return <Empty title="Folder unavailable"><RouteLink to="/">Back to All files</RouteLink> · <RouteLink to="/trash">View Trash</RouteLink></Empty>

  const matches = item => normalize(item.name).includes(normalize(query))
  const folders = filter === 'Files' ? [] : state.folders.filter(item => tree.visible(item.id) && (search ? matches(item) : (item.parentId ?? null) === parentId))
  const files = filter === 'Folders' ? [] : state.files.filter(item => search ? tree.visible(item.folderId) && matches(item) : (item.folderId ?? null) === parentId)
  const rows = [...folders.map(item => ({ item, type: 'folder' })), ...files.map(item => ({ item, type: 'file' }))].sort((a, b) =>
    (sort === 'modified' ? String(b.item.updatedAt || '').localeCompare(String(a.item.updatedAt || '')) : 0) ||
    nameOf(a.item).localeCompare(nameOf(b.item), 'en', { sensitivity: 'base' }))
  const showTrash = !search && !folder
  return <>
    {folder ? <Breadcrumbs folders={tree.chain(folderId).slice(0, -1)} tail={nameOf(folder)} /> : search ? <Breadcrumbs tail="Search" /> : null}
    <Heading overline={!folder && !search ? state.account?.workspaceName : undefined}
      title={search ? 'Search results' : folder ? nameOf(folder) : 'All files'}
      description={search ? query ? `Results for “${query}”` : 'Browse all matching items.' : folder?.description || (!folder ? 'Browse folders and documents in your workspace.' : undefined)}
      actions={!search && <>
        {showTrash && <RouteLink className="link-button" to="/trash"><Icon name="trash" />Trash</RouteLink>}
        {folder && <RowMenu name={nameOf(folder)} items={folderActions(folder, setAction)} />}
        <button className="primary" onClick={() => setAction({ kind: 'create' })}><Icon name="plus" />New folder</button>
      </>} />
    <div className={folder ? 'split' : undefined}>
      <section className="panel" aria-label="Items">
        <div className="toolbar">
          <div className="tabs" aria-label="Item type">{['All items', 'Folders', 'Files'].map(text => <button key={text} aria-pressed={filter === text} onClick={() => setFilter(text)}>{text}</button>)}</div>
          <label className="inline-actions">Sort by <select value={sort} onChange={event => setSort(event.target.value)}><option value="name">Name</option><option value="modified">Last modified</option></select></label>
        </div>
        {!rows.length ? <Empty title={search ? 'No matching items' : 'No items in this view'} /> : <>
          <table><thead><tr><th scope="col">Name</th><th scope="col" className="date-cell">Last modified</th><th scope="col" className="owner-cell">Owner</th><th scope="col" className="action-cell"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{rows.map(({ item, type }) => {
              const textDocument = type === 'file' && item.mimeType?.includes('wordprocessingml')
              return <tr key={`${type}:${item.id}`}>
              <td><div className="item-name"><span className={`marker ${type}`}><Icon name={textDocument ? "textFile" : type} /></span><div>
                <RouteLink to={type === 'folder' ? folderUrl(item.id) : `/preview/${encodeURIComponent(item.id)}`}>{nameOf(item)}</RouteLink>
                {search && <small>{tree.pathLabel(type === 'folder' ? item.parentId : item.folderId)}</small>}
                <small className="row-detail owner-detail">Owner {personName(state, item.ownerId)}</small>
                <small className="row-detail narrow-detail">Last modified {humanDate(item.updatedAt)}</small>
              </div></div></td>
              <td className="date-cell">{humanDate(item.updatedAt)}</td><td className="owner-cell">{personName(state, item.ownerId)}</td>
              <td className="action-cell">{type === 'folder' && <RowMenu name={nameOf(item)} items={folderActions(item, setAction)} />}</td>
            </tr>})}</tbody></table>
          <div className="table-footer">{rows.length} {rows.length === 1 ? 'item' : 'items'}</div>
        </>}
      </section>
      {folder && <FolderContext state={state} folder={folder} tree={tree} openAccess={() => setAction({ kind: 'access', folder })} />}
    </div>
    {action?.kind === 'access' ? <AccessDialog folder={action.folder} onClose={close} /> : action &&
      <FolderEditor kind={action.kind} folder={action.folder} parentId={parentId} onClose={close} fromDetail={folderId === action.folder?.id && Boolean(folderId)} />}
  </>
}

export function TrashPage() {
  const { state } = useWorkspace()
  const [folder, setFolder] = useState(null)
  const tree = directory(state)
  const trashed = state.folders.filter(item => item.status === 'trashed')
  return <>
    <Breadcrumbs tail="Trash" />
    <Heading title="Trash" description="Restore folders and their contents to an active location." />
    <section className="panel">
      {!trashed.length ? <Empty title="Trash is empty" /> : <table>
        <thead><tr><th scope="col">Folder</th><th scope="col" className="date-cell">Trashed</th><th scope="col" className="action-cell"><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{trashed.map(item => <tr key={item.id}><td><div className="item-name"><span className="marker"><Icon name="folder" /></span><div><strong>{nameOf(item)}</strong><small>{tree.pathLabel(item.parentId)}</small><small className="row-detail narrow-detail">Trashed {humanDate(item.trashedAt)}</small></div></div></td>
          <td className="date-cell">{humanDate(item.trashedAt)}</td><td className="action-cell"><button onClick={() => setFolder(item)}>Restore</button></td></tr>)}</tbody>
      </table>}
    </section>
    {folder && <FolderEditor kind="restore" folder={folder} onClose={() => setFolder(null)} />}
  </>
}



