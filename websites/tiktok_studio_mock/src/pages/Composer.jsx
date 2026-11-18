import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useStudio } from '../context/StudioContext.jsx'
import { Cover, Icon, Missing, PageHeading, Select, StudioLink, useStudioNavigate } from '../components/ui.jsx'
import { coverChoices, sampleClips } from '../data/library.js'
import { metadata, publishPost, saveDraft, updateRecord } from '../utils/changes.js'
import { withSid } from '../utils/dataManager.js'
import { activeDraft, audienceNames, items, localUrl } from '../utils/view.js'

const permissions = [['allowComments', 'Allow comments'], ['allowDuet', 'Allow Duet'], ['allowStitch', 'Allow Stitch']]
const videoTypes = new Map([['mp4', 'video/mp4'], ['webm', 'video/webm'], ['mov', 'video/quicktime'], ['m4v', 'video/x-m4v']])
const maximumBytes = 50 * 1024 * 1024

function initialValues(record) {
  return {
    caption: record?.caption || '', visibility: record?.visibility || 'public',
    media: record?.media || null, coverUrl: record?.coverUrl || null,
    allowComments: record?.allowComments ?? true, allowDuet: record?.allowDuet ?? false,
    allowStitch: record?.allowStitch ?? false,
  }
}

function ComposerForm({ record, kind }) {
  const { commit, notify } = useStudio()
  const navigate = useStudioNavigate()
  const [values, setValues] = useState(() => initialValues(record))
  const [mode, setMode] = useState('now')
  const [schedule, setSchedule] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [mediaError, setMediaError] = useState(null)
  const uploadInFlight = useRef(false)
  const editingPost = kind === 'post'
  const draft = kind === 'draft' ? record : null
  const back = draft ? { to: '/drafts', label: 'Back to Drafts' } : { to: '/posts', label: 'Back to Posts' }
  const video = localUrl(values.media?.url)

  function change(patch) {
    setValues((previous) => ({ ...previous, ...patch }))
    setError('')
  }

  async function upload(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || uploadInFlight.current) return
    const type = videoTypes.get(file.name.split('.').at(-1)?.toLowerCase())
    if (!type || (file.type && !file.type.startsWith('video/') && file.type !== 'application/octet-stream') || !file.size || file.size > maximumBytes) {
      setError('Choose a non-empty MP4, WebM, MOV, or M4V video up to 50 MB.')
      return
    }
    uploadInFlight.current = true
    setUploading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file.type.startsWith('video/') ? file : new File([file], file.name, { type }))
      const response = await fetch(withSid('/upload'), { method: 'POST', body: form })
      const result = await response.json()
      const uploaded = result.files?.[0]
      if (!response.ok || !localUrl(uploaded?.url) || !Number.isFinite(uploaded.size)) throw new Error('Upload failed')
      setMediaError(null)
      change({ media: {
        url: uploaded.url, name: file.name, mimeType: uploaded.content_type || type,
        sizeBytes: uploaded.size, source: 'upload',
      }, coverUrl: null })
    } catch {
      setError('Video could not be uploaded. Try selecting the file again.')
    } finally {
      uploadInFlight.current = false
      setUploading(false)
    }
  }

  function save(action) {
    if (uploadInFlight.current) return
    const caption = values.caption.trim()
    if (action === 'draft' && !caption && !video) return setError('Add a caption or choose a video before saving your draft.')
    if (action !== 'draft' && !caption) return setError('Enter a caption before saving.')
    if (action !== 'draft' && !editingPost && !video) return setError('Choose a sample clip or upload a video before publishing.')
    const now = new Date()
    let scheduledAt = null
    if (action === 'publish' && mode === 'schedule') {
      const date = new Date(schedule)
      if (!Number.isFinite(date.getTime()) || date <= now) return setError('Choose a scheduled date and time in the future.')
      scheduledAt = date.toISOString()
    }
    const timestamp = now.toISOString()
    const fields = { ...values, caption }
    const editableFields = { ...fields }
    delete editableFields.media
    const saved = commit((state) => {
      if (editingPost) return updateRecord(state, 'posts', record.id, (post) => post.status === 'published', { ...editableFields, ...metadata(state, timestamp) })
      return action === 'draft' ? saveDraft(state, draft, fields, timestamp) : publishPost(state, draft, fields, timestamp, scheduledAt)
    })
    if (!saved) return setError('This item changed and could not be saved. Return to the list and reopen it.')
    if (editingPost) notify('Post changes saved.')
    else if (action === 'draft') notify('Draft saved.')
    else notify(scheduledAt ? 'Post scheduled.' : 'Post published.')
    navigate(action === 'draft' ? '/drafts' : '/posts')
  }

  return <>
    <PageHeading title={editingPost ? 'Edit post' : draft ? 'Edit draft' : 'New post'} description={editingPost ? 'Update your caption, cover and audience settings.' : 'Prepare a video for your account.'} back={back} />
    <div className="composer-grid">
      <form className="card composer-form" noValidate onSubmit={(event) => { event.preventDefault(); save(editingPost ? 'edit' : 'publish') }}>
        {!editingPost && <section className="form-section">
          <h2>Video</h2>
          <Select label="Sample clip" value={sampleClips.find((clip) => clip.media.url === video)?.id || ''} disabled={uploading} onChange={(id) => {
            const clip = sampleClips.find((item) => item.id === id)
            setMediaError(null)
            change({ media: clip ? { ...clip.media } : null, coverUrl: clip?.coverUrl || null })
          }}>
            <option value="">Choose a sample clip</option>
            {sampleClips.map((clip) => <option value={clip.id} key={clip.id}>{clip.title}</option>)}
          </Select>
          <label className="upload-box">
            <Icon name="upload" size={22} /><span><strong>{uploading ? 'Uploading video…' : 'Upload a video'}</strong><small>MP4, WebM, MOV or M4V · Up to 50 MB</small></span>
            <input className="sr-only" type="file" aria-label="Upload a video" accept=".mp4,.webm,.mov,.m4v,video/*" onChange={upload} disabled={uploading} />
          </label>
          {values.media && <div className="media-file"><span>{values.media.name || 'Selected video'}</span><button type="button" className="text-button" disabled={uploading} onClick={() => change({ media: null, coverUrl: null })}>Remove video</button></div>}
        </section>}
        <section className="form-section">
          <h2>Post details</h2>
          <label className="field"><span id="caption-label">Caption</span><textarea aria-labelledby="caption-label" rows="4" value={values.caption} onChange={(event) => change({ caption: event.target.value })} placeholder="Write a caption and add hashtags" /></label>
          <fieldset className="cover-picker"><legend>Cover</legend>
            <div>{coverChoices.map(({ url, title }) => <button key={url} type="button" aria-label={`Cover: ${title}`} aria-pressed={values.coverUrl === url} title={title} onClick={() => change({ coverUrl: url })}><Cover url={url} /></button>)}</div>
            {values.coverUrl && <button className="text-button" type="button" onClick={() => change({ coverUrl: null })}>Remove cover</button>}
          </fieldset>
          <Select label="Audience" value={values.visibility} onChange={(visibility) => change({ visibility })}>
            {!audienceNames[values.visibility] && <option value={values.visibility}>Unspecified</option>}
            {Object.entries(audienceNames).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </Select>
          <fieldset className="checks"><legend>Interactions</legend>
            {permissions.map(([id, label]) => <label key={id}><input type="checkbox" checked={Boolean(values[id])} onChange={(event) => change({ [id]: event.target.checked })} />{label}</label>)}
          </fieldset>
        </section>
        {!editingPost && <section className="form-section">
          <h2>Publishing</h2>
          <fieldset className="checks"><legend className="sr-only">Publishing time</legend>
            <label><input type="radio" name="publish-time" checked={mode === 'now'} onChange={() => { setMode('now'); setError('') }} />Post now</label>
            <label><input type="radio" name="publish-time" checked={mode === 'schedule'} onChange={() => { setMode('schedule'); setError('') }} />Schedule</label>
          </fieldset>
          {mode === 'schedule' && <label className="field"><span>Scheduled date and time (local)</span><input type="datetime-local" value={schedule} onChange={(event) => { setSchedule(event.target.value); setError('') }} /></label>}
        </section>}
        {error && <p className="error" role="alert">{error}</p>}
        <div className="action-row">
          <StudioLink className="button" to={back.to}>Cancel</StudioLink>
          {!editingPost && <button type="button" onClick={() => save('draft')} disabled={uploading}>Save as draft</button>}
          <button className="button primary" type="submit" disabled={uploading}>{editingPost ? 'Save changes' : mode === 'schedule' ? 'Schedule post' : 'Post now'}</button>
        </div>
      </form>
      <aside className="card preview-card">
        <h2>Preview</h2>
        <div className="video-frame">
          {video && mediaError !== video
            ? <video key={video} controls playsInline preload="metadata" poster={localUrl(values.coverUrl)} onError={() => setMediaError(video)} aria-label="Video preview"><source src={video} type={values.media?.mimeType} onError={() => setMediaError(video)} /></video>
            : values.coverUrl ? <Cover className="preview-cover" url={values.coverUrl} /> : <div><Icon name="posts" size={32} /><span>Video preview</span></div>}
        </div>
        {video && mediaError === video && <p className="meta">This video cannot be previewed in the browser.</p>}
        <p className="preview-caption">{values.caption.trim() || 'Your caption will appear here.'}</p>
        <span className="meta">{audienceNames[values.visibility] || 'Audience unspecified'}</span>
      </aside>
    </div>
  </>
}

export default function Composer({ kind }) {
  const { postId, draftId } = useParams()
  const { state } = useStudio()
  const record = kind === 'post' ? items(state.posts).find((post) => post.id === postId && post.status === 'published')
    : kind === 'draft' ? items(state.drafts).find((draft) => draft.id === draftId && activeDraft(draft)) : null
  if (kind === 'post' && !record) return <Missing title="Post unavailable" to="/posts" link="Back to Posts" />
  if (kind === 'draft' && !record) return <Missing title="Draft unavailable" to="/drafts" link="Back to Drafts" />
  return <ComposerForm key={kind + (record?.id || '')} kind={kind} record={record} />
}
