import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Download, FileText, History, Share2 } from 'lucide-react'
import { accessibleLink, active, currentVersion, getFile, parentOf, restoreVersion, routeFor } from '../model'
import { Breadcrumbs, dateLabel, Dialog, DialogActions, Empty, ErrorText, FileMark, Missing, PageHeading, sizeLabel, timeLabel, userName } from '../ui'
import { roleLabel, ShareDialog } from '../shareDialog'
import { useStore } from '../store'
import { withSid } from '../utils/dataManager'

export function ContentPreview({ version, name }) {
  const content = version?.content
  const value = typeof content?.value === 'string' ? content.value : ''
  const safePath = /^\/(art|files)\/[a-zA-Z0-9._/-]+$/.test(value) && !value.split('/').includes('..') ? value : ''
  const type = version?.mimeType || ''
  const textType = type.startsWith('text/') || type === 'application/json'
  const mediaType = /^(image\/(png|jpe?g|webp|gif|svg\+xml|avif|bmp|x-icon)|application\/pdf)$/.test(type)
  const [loaded, setLoaded] = useState(null)
  useEffect(() => {
    if (content?.kind !== 'upload' || !safePath || (!textType && !mediaType)) return
    const controller = new AbortController()
    let objectUrl
    async function load() {
      try {
        const response = await fetch(safePath, { signal: controller.signal })
        if (!response.ok) throw new Error('File unavailable')
        if (textType) {
          const text = await response.text()
          if (!controller.signal.aborted) setLoaded({ safePath, text })
          return
        }
        const bytes = await response.arrayBuffer()
        if (controller.signal.aborted) return
        objectUrl = URL.createObjectURL(new Blob([bytes], { type }))
        setLoaded({ safePath, objectUrl })
      } catch {
        if (!controller.signal.aborted) setLoaded({ safePath, error: true })
      }
    }
    load()
    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [content?.kind, safePath, type, textType, mediaType])
  const result = loaded?.safePath === safePath ? loaded : null
  if (content?.kind === 'text') return <div className="preview-stage"><pre className="document-sheet">{value}</pre></div>
  if (result?.text != null) return <div className="preview-stage"><pre className="document-sheet">{result.text}</pre></div>
  const media = content?.kind === 'localAsset' ? safePath : result?.objectUrl
  if (media && type.startsWith('image/')) return <div className="preview-stage"><img src={media} alt={name} /></div>
  if (media && type === 'application/pdf') return <div className="preview-stage"><iframe title={name} src={media} /></div>
  const checking = content?.kind === 'upload' && safePath && !result && (textType || mediaType)
  return <div className="preview-stage"><div className="preview-placeholder"><FileText size={34} />
    <p>{result?.error ? 'File content is unavailable.' : checking ? 'Loading preview…' : 'A preview is unavailable for this file.'}</p>
    {safePath && <a className="button" download={name} href={withSid(safePath)}><Download size={16} />Download</a>}
  </div></div>
}

function RestoreRevision({ item, revision, onClose, onRestored }) {
  const { state, commit, notify } = useStore()
  const [error, setError] = useState('')
  return <Dialog title="Restore this version?" onClose={onClose}><form onSubmit={event => {
    event.preventDefault()
    try {
      commit(latest => restoreVersion(latest, item.id, revision.id))
      notify('Version restored.')
      onRestored()
    } catch (failure) { setError(failure.message) }
  }}>
    <p>The revision from {timeLabel(revision.createdAt)} by {userName(state, revision.createdBy)} will become current. Earlier versions will remain in the history.</p>
    <ErrorText>{error}</ErrorText>
    <DialogActions label="Restore version" onClose={onClose} />
  </form></Dialog>
}

export function PreviewPage({ history = false }) {
  const { id } = useParams()
  const { state } = useStore()
  const [sharing, setSharing] = useState(false)
  const [selected, setSelected] = useState(null)
  const [restoring, setRestoring] = useState(false)
  const item = getFile(state, id)
  if (!active(item) || item.kind !== 'file') return <Missing title="File unavailable" />
  const name = item.name || 'Untitled file'
  const version = currentVersion(state, item)
  const revisions = history ? state.versions.filter(record => record.fileId === id).reverse()
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')) : []
  const revision = revisions.find(record => record.id === selected) || version || revisions[0]
  const folder = getFile(state, parentOf(item))
  const current = revision?.id === item.currentVersionId
  return <section>
    <Breadcrumbs state={state} parentId={parentOf(item)} last={name} />
    <PageHeading title={name} subtitle={history ? 'Version history' : dateLabel(item.updatedAt) + ' · ' + sizeLabel(item.sizeBytes)}>
      <Link className="button" to={withSid(history ? routeFor(item) : active(folder) && folder.kind === 'folder' ? routeFor(folder) : '/files')}><ArrowLeft size={16} />{history ? 'Back to preview' : 'Back to files'}</Link>
      {!history && <Link className="button" to={withSid(routeFor(item) + '/versions')}><History size={16} />Version history</Link>}
      <button className="button primary" onClick={() => setSharing(true)}><Share2 size={16} />Share</button>
    </PageHeading>
    <div className={history ? 'preview-layout' : undefined}>
      <ContentPreview key={revision?.id} version={revision} name={name} />
      {history && <aside className="card versions-panel" aria-label="Versions">
        <h2>Versions</h2>
        {revisions.length ? <ul className="versions-list">{revisions.map(record => <li key={record.id}>
          <button type="button" aria-pressed={record.id === revision?.id} onClick={() => setSelected(record.id)}>
            <span className="revision-line"><strong>{timeLabel(record.createdAt)}</strong>{record.id === item.currentVersionId && <span className="status">Current</span>}</span>
            <span className="metadata">{userName(state, record.createdBy)} · {sizeLabel(record.sizeBytes)}</span>
            {record.sourceVersionId && <span className="metadata">Restored revision</span>}
          </button>
        </li>)}</ul> : <p className="metadata">No versions available.</p>}
        <button className="button primary" type="button" disabled={!revision || current} onClick={() => setRestoring(true)}>Restore this version</button>
      </aside>}
    </div>
    {sharing && <ShareDialog fileId={item.id} onClose={() => setSharing(false)} />}
    {restoring && revision && <RestoreRevision item={item} revision={revision} onClose={() => setRestoring(false)} onRestored={() => {
      setSelected(null)
      setRestoring(false)
    }} />}
  </section>
}
export function SharedLinkPage() {
  const { token } = useParams()
  const { state } = useStore()
  const link = state.shareLinks.find(record => record.token === token && record.status === 'active')
  const item = getFile(state, link?.fileId)
  if (!active(item) || !link) return <Empty title="Link unavailable" text="This shared item is no longer available." />
  if (!accessibleLink(state, item, link)) return <Empty title="Access restricted" text="This link is limited to its selected audience." />
  const name = item.name || 'Shared item'
  return <section>
    <PageHeading title={name} subtitle={'Shared link · ' + roleLabel(link.role)} />
    {item.kind === 'folder' ? <div className="table-card"><table><thead><tr><th>Name</th><th>Modified</th></tr></thead>
      <tbody>{state.files.filter(file => active(file) && parentOf(file) === item.id).map(file => <tr key={file.id}>
        <td><span className="item-name"><FileMark item={file} />{file.name || 'Untitled item'}</span></td><td>{dateLabel(file.updatedAt)}</td>
      </tr>)}</tbody></table></div> : <ContentPreview version={currentVersion(state, item)} name={name} />}
  </section>
}
