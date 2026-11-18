import { useState } from 'react'
import { ChevronRight, Share2, Trash2 } from 'lucide-react'
import { WorkspaceLink, useWorkspaceNavigate } from './navigation.jsx'
import { deleteShowcase, deleteVideo, saveDetails } from './changes.js'
import { useWorkspace } from './store.jsx'
import { Modal, ModalActions, PrivacyBadge, PrivacyDialog, modeOf, shortDate, titleOf } from './ui.jsx'

export function Breadcrumbs({ items, current }) {
  return <nav aria-label="Breadcrumb" className="breadcrumbs">
    {items.map(([label, path]) => <span key={path}><WorkspaceLink to={path}>{label}</WorkspaceLink><ChevronRight size={14} /></span>)}
    <span aria-current="page">{current}</span>
  </nav>
}

export function RecordHeader({ record, kind, children }) {
  const [sharing, setSharing] = useState(false)
  return <>
    <div className="page-heading record-heading">
      <div><h1>{titleOf(record, kind)}</h1><PrivacyBadge mode={modeOf(record, kind)} /></div>
      <div className="heading-actions">{children}
        <button className="primary" onClick={() => setSharing(true)}><Share2 size={16} /> Share</button>
      </div>
    </div>
    {sharing && <PrivacyDialog record={record} kind={kind} onClose={() => setSharing(false)} />}
  </>
}

export function DetailsForm({ record, kind }) {
  const { commit, saving } = useWorkspace()
  const navigate = useWorkspaceNavigate()
  const [title, setTitle] = useState(record.title ?? '')
  const [description, setDescription] = useState(record.description ?? '')
  const [tags, setTags] = useState((record.tags ?? []).join(', '))
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const video = kind === 'video'
  return <section className="panel details-panel">
    <h2>Details</h2>
    <form onSubmit={async (event) => {
      event.preventDefault()
      if (!title.trim()) return setError('Enter a title.')
      const fields = { title: title.trim(), description: description.trim() }
      if (video) fields.tags = [...new Set(tags.split(',').map((tag) => tag.trim()).filter(Boolean))]
      if (await commit(saveDetails(kind, record.id, fields), 'Details saved.') === false) return
      setTitle(fields.title)
      setDescription(fields.description)
      if (video) setTags(fields.tags.join(', '))
    }}>
      <label className="field">Title<input value={title} disabled={saving} onChange={(event) => { setTitle(event.target.value); setError('') }} required /></label>
      <label className="field">Description<textarea value={description} disabled={saving} onChange={(event) => setDescription(event.target.value)} rows={4} /></label>
      {video && <label className="field">Tags<input value={tags} disabled={saving} onChange={(event) => setTags(event.target.value)} placeholder="Separate tags with commas" /></label>}
      {error && <p className="error" role="alert">{error}</p>}
      <button type="submit" className="primary" disabled={saving}>Save details</button>
    </form>
    <div className="details-footer">
      <span>Modified {shortDate(record.updatedAt)}</span>
      <button className="danger quiet" onClick={() => setDeleting(true)}><Trash2 size={16} /> Delete {kind}</button>
    </div>
    {deleting && <Modal title={`Delete ${kind}?`} onClose={() => setDeleting(false)}>
      <p>Delete <strong>{titleOf(record, kind)}</strong>?</p>
      <p className="hint">{video ? 'This removes the video from the Library, its showcases, and its review threads.' : 'The videos in this showcase will remain in the Library.'}</p>
      <form onSubmit={async (event) => {
        event.preventDefault()
        if (await commit(video ? deleteVideo(record.id) : deleteShowcase(record.id), video ? 'Video deleted.' : 'Showcase deleted.')) {
          navigate(video ? '/videos' : '/showcases')
        }
      }}><ModalActions onClose={() => setDeleting(false)} action={`Delete ${kind}`} busy={saving} danger /></form>
    </Modal>}
  </section>
}
