import React, { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { withSid } from './utils/dataManager.js'
import { LocalLink, bytes, date, entityPath, list, matches, record, replace, useLocalNavigate, useWorkspace, without } from './workspace.jsx'
import { Badge, Button, DataGrid, Dialog, Empty, Field, Filter, Icon, PageHead, Search } from './ui.jsx'

const root = '/storage'
const bucketPath = (id, folder) => entityPath(root, id) + (folder ? `?folder=${encodeURIComponent(folder)}` : '')
const pathOf = item => typeof item.path === 'string' ? item.path : ''
const join = (folder, name) => folder ? `${folder}/${name}` : name
const pathName = path => path.split('/').at(-1)
const parentOf = path => path.split('/').slice(0, -1).join('/')
const bucketObjects = (state, id) => list(state.objects).filter(item => item.bucketId === id)
const isFolder = item => item.kind === 'folder'
const hasChildren = (objects, path) => objects.some(item => pathOf(item).startsWith(`${path}/`))
const realOrImplicitFolder = (objects, path) => !path || objects.some(item => pathOf(item) === path && isFolder(item)) || hasChildren(objects, path)

function parsePath(raw) {
  const path = raw.trim()
  if (!path || path.length > 1024 || path.split('/').some(part => !part.trim() || part === '.' || part === '..' || /[\\\u0000-\u001f\u007f]/.test(part))) {
    throw new Error('Enter a valid bucket-relative path using nonempty folder and file names.')
  }
  return path
}

function validateTarget(objects, path, excludedId) {
  const others = objects.filter(item => item.id !== excludedId)
  if (others.some(item => pathOf(item) === path) || hasChildren(others, path)) throw new Error('An item already exists at this path.')
  const parent = parentOf(path)
  if (!realOrImplicitFolder(objects, parent)) throw new Error('The destination folder does not exist.')
  if (others.some(item => !isFolder(item) && (path === pathOf(item) || path.startsWith(`${pathOf(item)}/`)))) {
    throw new Error('A file already occupies part of this path.')
  }
}

function folderItems(objects, folder) {
  const visible = new Map()
  const prefix = folder ? `${folder}/` : ''
  for (const object of objects) {
    const path = pathOf(object)
    if (!path.startsWith(prefix)) continue
    const remainder = path.slice(prefix.length)
    if (!remainder) continue
    const name = remainder.split('/')[0]
    if (!remainder.includes('/')) visible.set(name, object)
    else if (!visible.has(name)) visible.set(name, { path: join(folder, name), kind: 'folder' })
  }
  return [...visible.values()].sort((a, b) => Number(isFolder(b)) - Number(isFolder(a)) || pathOf(a).localeCompare(pathOf(b)))
}

function Restrictions({ bucket }) {
  const types = list(bucket.allowedMimeTypes)
  return <div className="restriction-list">
    <span><strong>Max file size</strong> {bucket.maxFileSizeBytes == null ? 'Unrestricted' : bytes(bucket.maxFileSizeBytes)}</span>
    <span><strong>Allowed types</strong> {types.length ? types.join(', ') : 'Any type'}</span>
  </div>
}

export function Storage() {
  const { bucketId } = useParams()
  const [params] = useSearchParams()
  const { state } = useWorkspace()
  const [query, setQuery] = useState('')
  const [access, setAccess] = useState('')
  const [create, setCreate] = useState(false)
  const buckets = list(state.buckets)
  const objects = list(state.objects)
  const counts = new Map()
  for (const object of objects) counts.set(object.bucketId, (counts.get(object.bucketId) || 0) + 1)
  const filtered = buckets.filter(bucket => (!access || !!bucket.public === (access === 'public')) && matches(query, bucket.name, bucket.id))
  const bucket = bucketId ? buckets.find(item => item.id === bucketId) : filtered[0]
  const folder = params.get('folder') || ''
  return <>
    <PageHead eyebrow="Object storage" title="Storage" description="Browse buckets, organize files, and manage upload restrictions.">
      <Button variant="primary" icon="plus" onClick={() => setCreate(true)}>New bucket</Button>
    </PageHead>
    <div className="split">
      <aside className="panel master" aria-label="Bucket list">
        <div className="master-tools"><div className="master-heading"><h2>Buckets</h2><span>{filtered.length}</span></div>
          <Search title="Search buckets" value={query} onChange={setQuery} />
          <Filter title="Access type" value={access} options={[[ '', 'All access types'], ['public', 'Public'], ['private', 'Private']]} onChange={setAccess} />
        </div>
        <div className="master-items">{filtered.length ? filtered.map(item =>
          <LocalLink key={item.id} to={bucketPath(item.id)} className={item.id === bucket?.id ? 'selected' : ''}
            aria-current={item.id === bucket?.id ? 'page' : undefined}>
            <Icon name="storage" /><span><strong>{item.name || item.id}</strong><small>{item.public ? 'Public' : 'Private'} · {counts.get(item.id) || 0} objects</small></span>
          </LocalLink>
        ) : <Empty title="No buckets found">Change the filters or create a bucket.</Empty>}</div>
      </aside>
      {bucket ? <BucketDetail key={bucket.id} bucket={bucket} folder={folder} /> : <section className="panel">
        <Empty title={bucketId ? 'Bucket unavailable' : 'No bucket selected'}>
          {bucketId ? <LocalLink to={root}>Return to storage</LocalLink> : 'Create a bucket or change the list filters.'}
        </Empty>
      </section>}
    </div>
    {create && <BucketEditor close={() => setCreate(false)} onCreated={() => { setQuery(''); setAccess('') }} />}
  </>
}

function BucketDetail({ bucket, folder }) {
  const { state, commit } = useWorkspace()
  const navigate = useLocalNavigate()
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState(null)
  const objects = bucketObjects(state, bucket.id)
  const policies = list(state.policies).filter(policy => policy.targetType === 'bucket' && policy.targetId === bucket.id)
  const exists = realOrImplicitFolder(objects, folder)
  const visible = folderItems(objects, folder).filter(item => matches(query, pathName(pathOf(item))))
  const close = () => setEditor(null)
  const segments = folder ? folder.split('/') : []
  function deleteBucket() {
    commit(current => {
      if (bucketObjects(current, bucket.id).length) throw new Error('Remove all files and folders before deleting this bucket.')
      return record({ buckets: without(current.buckets, bucket.id),
        policies: list(current.policies).filter(policy => policy.targetType !== 'bucket' || policy.targetId !== bucket.id) },
        'bucket.deleted', bucket.id, { bucketId: bucket.id }, { name: bucket.name, policyIds: policies.map(policy => policy.id) })
    }, 'Bucket deleted.')
    navigate(root, { replace: true })
  }
  function deleteObject(object) {
    commit(current => {
      if (isFolder(object) && hasChildren(bucketObjects(current, bucket.id), pathOf(object))) throw new Error('Remove all items inside this folder before deleting it.')
      return record({ objects: without(current.objects, object.id) }, 'object.deleted', object.id,
        { bucketId: bucket.id, objectId: object.id }, { path: pathOf(object), kind: object.kind })
    }, isFolder(object) ? 'Folder deleted.' : 'File deleted.')
  }
  return <section className="panel detail" aria-label={bucket.name || bucket.id}>
    <div className="panel-heading"><div>
      <div className="eyebrow">Bucket</div><h2 className="mono">{bucket.name || bucket.id}</h2>
      <div className="actions"><Badge tone={bucket.public ? 'success' : 'neutral'}>{bucket.public ? 'Public' : 'Private'}</Badge><span className="muted">{objects.length} objects</span></div>
    </div><div className="actions"><Button onClick={() => setEditor({ kind: 'editBucket' })}>Edit bucket</Button>
      <Button variant="danger-outline" onClick={() => setEditor({ kind: 'deleteBucket' })}>Delete bucket</Button></div></div>
    <Restrictions bucket={bucket} />
    <nav className="breadcrumb" aria-label="Folder breadcrumbs">
      <LocalLink to={bucketPath(bucket.id)} onClick={() => setQuery('')}>{bucket.name || bucket.id}</LocalLink>
      {segments.map((segment, i) => <React.Fragment key={i}><Icon name="chevron" size={13} />
        {i < segments.length - 1 ? <LocalLink to={bucketPath(bucket.id, segments.slice(0, i + 1).join('/'))} onClick={() => setQuery('')}>{segment}</LocalLink>
          : <span aria-current="page">{segment}</span>}
      </React.Fragment>)}
    </nav>
    {!exists ? <Empty title="Folder unavailable"><LocalLink to={bucketPath(bucket.id)} onClick={() => setQuery('')}>Return to bucket root</LocalLink></Empty> : <>
      <div className="toolbar"><Search title="Search this folder" value={query} onChange={setQuery} />
        <span className="result-count">{visible.length} {visible.length === 1 ? 'item' : 'items'}</span>
        <Button icon="plus" onClick={() => setEditor({ kind: 'folder' })}>New folder</Button>
        <Button variant="primary" onClick={() => setEditor({ kind: 'upload' })}>Upload file</Button>
      </div>
      {visible.length ? <DataGrid title="Bucket objects"><thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Updated</th><th>Actions</th></tr></thead>
        <tbody>{visible.map(item => {
          const path = pathOf(item)
          const name = pathName(path)
          const folderItem = isFolder(item)
          const downloadable = !folderItem && /^\/(?:files|fixtures)\/[^/]/.test(item.url || '')
          return <tr key={path}>
            <td><div className="object-name"><Icon name={folderItem ? 'storage' : 'file'} />
              {folderItem ? <LocalLink className="text-button" to={bucketPath(bucket.id, path)} onClick={() => setQuery('')}>{name}</LocalLink> : <span>{name}</span>}</div></td>
            <td>{folderItem ? 'Folder' : item.mimeType || 'File'}</td><td>{bytes(item.sizeBytes)}</td><td>{date(item.updatedAt)}</td>
            <td><div className="row-actions">
              {downloadable && <a className="button quiet" href={item.url.startsWith('/files/') ? withSid(item.url) : item.url} download={name} aria-label={`Download ${name}`}><Icon name="download" size={16} />Download</a>}
              {!folderItem && <Button variant="quiet" onClick={() => setEditor({ kind: 'move', object: item })}>Rename or move</Button>}
              {item.id && <Button variant="quiet destructive" onClick={() => setEditor({ kind: 'deleteObject', object: item })}>Delete</Button>}
            </div></td>
          </tr>
        })}</tbody>
      </DataGrid> : <Empty title={query.trim() ? 'No matching items' : 'This folder is empty'}>{query.trim() ? 'Try another name.' : 'Upload a file or create a folder.'}</Empty>}
    </>}
    {editor?.kind === 'editBucket' && <BucketEditor bucket={bucket} close={close} />}
    {editor?.kind === 'deleteBucket' && <Dialog title="Delete bucket" confirm danger onClose={close} onSubmit={deleteBucket} submitLabel="Delete bucket">
      <p>{objects.length ? <><strong>{bucket.name}</strong> contains {objects.length} {objects.length === 1 ? 'item' : 'items'}. Remove all files and folders before deleting it.</>
        : <>Delete <strong>{bucket.name}</strong> and its {policies.length} {policies.length === 1 ? 'policy' : 'policies'}?</>}</p>
    </Dialog>}
    {['folder', 'upload', 'move'].includes(editor?.kind) && <ObjectEditor bucket={bucket} folder={folder} kind={editor.kind} object={editor.object} close={close} />}
    {editor?.kind === 'deleteObject' && <Dialog title={isFolder(editor.object) ? 'Delete folder' : 'Delete file'} confirm danger onClose={close}
      onSubmit={() => deleteObject(editor.object)} submitLabel={isFolder(editor.object) ? 'Delete folder' : 'Delete file'}>
      <p>Delete <strong className="mono">{pathOf(editor.object)}</strong> from {bucket.name}?</p>
      {isFolder(editor.object) && hasChildren(objects, pathOf(editor.object)) && <p>Remove the folder’s contents first.</p>}
    </Dialog>}
  </section>
}

function BucketEditor({ bucket, close, onCreated }) {
  const { commit } = useWorkspace()
  const navigate = useLocalNavigate()
  function save(form) {
    const id = bucket?.id || crypto.randomUUID()
    const name = bucket ? bucket.name || bucket.id : form.get('name').trim()
    const publicAccess = form.get('access') === 'public'
    const limit = form.get('limit').trim()
    const maxFileSizeBytes = limit ? Number(limit) : null
    if (!bucket && !/^[a-z0-9](?:[a-z0-9_-]{0,61}[a-z0-9])?$/.test(name)) throw new Error('Use 1–63 lowercase letters, digits, hyphens, or underscores. Start and end with a letter or digit.')
    if (limit && (!/^\d+$/.test(limit) || !Number.isSafeInteger(maxFileSizeBytes) || maxFileSizeBytes < 1)) throw new Error('Maximum file size must be a positive whole number of bytes.')
    const allowedMimeTypes = [...new Set(form.get('mime').toLowerCase().split(/[\s,]+/).filter(Boolean))]
    if (allowedMimeTypes.some(type => type !== '*/*' && !/^[a-z0-9!#$&^_.+-]+\/(?:[a-z0-9!#$&^_.+-]+|\*)$/.test(type))) {
      throw new Error('Enter MIME types such as text/csv or image/*, separated by commas.')
    }
    commit((state, meta) => {
      const buckets = list(state.buckets)
      if (!bucket && buckets.some(item => item.name?.toLowerCase() === name)) throw new Error('A bucket with this name already exists.')
      const fields = { public: publicAccess, maxFileSizeBytes, allowedMimeTypes }
      const next = bucket ? { ...buckets.find(item => item.id === id), ...fields, actorId: meta.actorId, updatedAt: meta.updatedAt } : { id, name, ...fields, ...meta }
      return record({ buckets: bucket ? replace(buckets, id, next) : [...buckets, next] },
        bucket ? 'bucket.updated' : 'bucket.created', id, { bucketId: id }, { name, ...fields })
    }, bucket ? 'Bucket settings saved.' : 'Bucket created.')
    if (!bucket) { onCreated(); navigate(bucketPath(id)) }
  }
  return <Dialog title={bucket ? 'Edit bucket' : 'New bucket'} onClose={close} onSubmit={save} submitLabel={bucket ? 'Save changes' : 'Create bucket'}>
    {bucket ? <p className="mono">{bucket.name}</p> : <Field title="Bucket name"><input name="name" required maxLength={63} /></Field>}
    <Field title="Access type"><select name="access" defaultValue={bucket?.public ? 'public' : 'private'}><option value="private">Private</option><option value="public">Public</option></select></Field>
    <Field title="Maximum file size (bytes)" note="Leave empty for no size restriction."><input name="limit" inputMode="numeric" defaultValue={bucket?.maxFileSizeBytes ?? ''} /></Field>
    <Field title="Allowed MIME types" note="Separate types with commas. Leave empty to allow any type.">
      <textarea name="mime" rows="3" defaultValue={list(bucket?.allowedMimeTypes).join(', ')} placeholder="text/csv, image/*" />
    </Field>
  </Dialog>
}

function checkUpload(file, bucket) {
  if (bucket.maxFileSizeBytes != null && file.size > bucket.maxFileSizeBytes) throw new Error(`This file exceeds the ${bytes(bucket.maxFileSizeBytes)} limit.`)
  const types = list(bucket.allowedMimeTypes).map(type => type.toLowerCase())
  const mimeType = file.type.toLowerCase() || 'application/octet-stream'
  if (types.length && !types.some(type => type === mimeType || type === '*/*' || (type.endsWith('/*') && mimeType.startsWith(type.slice(0, -1))))) {
    throw new Error(`${mimeType} is not an allowed upload type for this bucket.`)
  }
}

function ObjectEditor({ bucket, folder, kind, object, close }) {
  const { state, commit } = useWorkspace()
  const upload = kind === 'upload'
  const moving = kind === 'move'
  const title = upload ? 'Upload file' : moving ? 'Rename or move file' : 'New folder'
  const [fileName, setFileName] = useState('')
  async function save(form) {
    const file = upload ? form.get('file') : null
    if (upload && !file?.name) throw new Error('Choose a file to upload.')
    const raw = upload ? file.name : form.get('path').trim()
    if (!moving && raw.includes('/')) throw new Error('Use a single name for an item in this folder.')
    const path = parsePath(moving ? raw : join(folder, raw))
    if (moving && path === pathOf(object)) { throw new Error('Enter a different name or destination path.') }
    validateTarget(bucketObjects(state, bucket.id), path, object?.id)
    let uploaded = null
    if (upload) {
      checkUpload(file, bucket)
      const payload = new FormData()
      payload.append('file', file)
      const res = await fetch(withSid('/upload'), { method: 'POST', body: payload })
      const result = await res.json().catch(() => null)
      uploaded = result?.files?.[0]
      if (!res.ok || !uploaded?.url?.startsWith('/files/')) throw new Error(result?.error || 'The file upload failed. Try again.')
    }
    const id = object?.id || crypto.randomUUID()
    const action = moving ? (parentOf(path) === parentOf(pathOf(object)) ? 'object.renamed' : 'object.moved') : upload ? 'object.uploaded' : 'object.folder_created'
    commit((current, meta) => {
      const objects = list(current.objects)
      const activeBucket = list(current.buckets).find(item => item.id === bucket.id)
      if (!activeBucket) throw new Error('This bucket is unavailable.')
      if (upload) checkUpload(file, activeBucket)
      validateTarget(bucketObjects(current, bucket.id), path, object?.id)
      const next = moving
        ? { ...objects.find(item => item.id === id), path, actorId: meta.actorId, updatedAt: meta.updatedAt }
        : { id, bucketId: bucket.id, path, kind: upload ? 'file' : 'folder', sizeBytes: uploaded?.size ?? null,
          mimeType: uploaded?.content_type || null, url: uploaded?.url || null, ...meta }
      return record({ objects: moving ? replace(objects, id, next) : [...objects, next] }, action, id,
        { bucketId: bucket.id, objectId: id }, moving ? { fromPath: pathOf(object), toPath: path } : { path, kind: next.kind, sizeBytes: next.sizeBytes, mimeType: next.mimeType })
    }, moving ? (action === 'object.renamed' ? 'File renamed.' : 'File moved.') : upload ? 'File uploaded.' : 'Folder created.')
  }
  return <Dialog title={title} onClose={close} onSubmit={save} submitLabel={upload ? 'Upload file' : moving ? 'Save path' : 'Create folder'}>
    <p className="mono">{join(bucket.name || bucket.id, folder)}</p>
    {upload ? <><Field title="Choose file"><input name="file" type="file" required onChange={event => setFileName(event.target.files[0]?.name || '')} /></Field>
      {fileName && <p className="muted">Destination <code>{join(folder, fileName)}</code></p>}</>
      : <Field title={moving ? 'Destination path' : 'Folder name'} note={moving ? 'Enter a path relative to the bucket root.' : undefined}>
        <input name="path" required defaultValue={object?.path || ''} />
      </Field>}
  </Dialog>
}
