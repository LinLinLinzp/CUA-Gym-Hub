import React, { useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { BackLink, Confirm, DateText, Empty, FieldError, Icon, Missing, Modal, PageHeader, Search, Select, Status } from '../ui.jsx'
import { SiteLink, alphabetical, byId, find, idFor, list, localMedia, lower, recordPath, timestamp, upsert, useFilters, useSiteNavigate, useWorkspace } from '../workspace.jsx'

const formats = [['text', 'Text'], ['image', 'Image'], ['audio', 'Audio']]
const audiences = [['public', 'Public'], ['free_members', 'Free members'], ['paid_members', 'Paid members'], ['selected_tiers', 'Selected tiers']]
const tabs = [['all', 'All'], ['published', 'Published'], ['draft', 'Drafts'], ['scheduled', 'Scheduled']]
const defaults = { status: 'all', q: '', audience: '', format: '', sort: 'newest' }
const readLabel = (options, key) => options.find(option => option[0] === key)?.[1] ?? 'Unavailable'
const postDate = post => (post.status === 'scheduled' ? post.scheduledAt : post.publishedAt) || post.updatedAt || post.createdAt

export function Posts() {
  const { state } = useWorkspace()
  const [filters, update, clear] = useFilters(defaults)
  const query = lower(filters.q).trim()
  const posts = list(state.posts).filter(post => post.status !== 'deleted')
  const counts = new Map()
  for (const post of posts) counts.set(post.status, (counts.get(post.status) ?? 0) + 1)
  const visible = posts.filter(post => (
    (filters.status === 'all' || post.status === filters.status) &&
    (!filters.audience || post.audience === filters.audience) &&
    (!filters.format || post.format === filters.format) &&
    (lower(post.title).includes(query) || lower(post.body).includes(query))
  )).sort((left, right) => {
    if (filters.sort === 'title') return alphabetical(left.title, right.title) || byId(left, right)
    const difference = timestamp(postDate(right)) - timestamp(postDate(left))
    return (filters.sort === 'oldest' ? -difference : difference) || byId(left, right)
  })

  return <>
    <section className="posts-banner">
      <div className="banner-copy">
        <PageHeader title="Posts" description="Write, schedule and publish for your members." />
        <SiteLink className="button primary" to="/posts/new"><Icon name="plus" />New post</SiteLink>
      </div>
      <img className="banner-art" src="/art/projection.webp" alt="A beam of warm projector light crosses an empty cinema" />
    </section>
    <div className="library-tools">
      <div className="status-tabs" aria-label="Post status">
        {tabs.map(([status, text]) => <button type="button" key={status} aria-pressed={filters.status === status} onClick={() => update({ status })}>
          {text}<span>{status === 'all' ? posts.length : counts.get(status) ?? 0}</span>
        </button>)}
      </div>
      <div className="filters">
        <Search name="Search posts" value={filters.q} onChange={q => update({ q })} />
        <Select name="Audience" value={filters.audience} onChange={audience => update({ audience })} options={ [['', 'All audiences'], ...audiences] } />
        <Select name="Format" value={filters.format} onChange={format => update({ format })} options={ [['', 'All formats'], ...formats] } />
        <Select name="Sort posts" value={filters.sort} onChange={sort => update({ sort })} options={ [['newest', 'Newest first'], ['oldest', 'Oldest first'], ['title', 'Title A–Z']] } />
        {Object.keys(defaults).some(key => defaults[key] !== filters[key]) && <button type="button" className="text-button" onClick={clear}>Clear filters</button>}
      </div>
    </div>
    <section className="paper post-library" aria-label="Post library">
      <div className="post-columns list-heading"><span>{visible.length} {visible.length === 1 ? 'post' : 'posts'}</span><span>Audience</span><span>Status</span><span>Date</span><span /></div>
      {visible.map(post => {
        const media = find(state.media, post.mediaId)
        const image = media?.type === 'image' && localMedia(media)
        return <SiteLink className="post-columns post-row" key={post.id} to={recordPath('posts', post.id)}>
          <div className="post-summary">
            <div className="post-thumb">
              {image ? <img src={image} alt="" loading="lazy" /> : <><Icon name={post.format === 'audio' ? 'audio' : post.format === 'image' ? 'image' : 'file'} /><span>{readLabel(formats, post.format)}</span></>}
            </div>
            <div className="post-copy"><h2>{post.title || 'Untitled post'}</h2><p>{post.body || readLabel(formats, post.format)}</p></div>
          </div>
          <span className="row-meta">{readLabel(audiences, post.audience)}</span>
          <span><Status value={post.status} /></span>
          <span className="row-meta"><DateText value={postDate(post)} /></span>
          <Icon name="arrow" size={15} />
        </SiteLink>
      })}
      {!visible.length && <Empty title="No posts found">Try changing your filters or start a new post.</Empty>}
    </section>
  </>
}

function toLocalInput(value) {
  if (!timestamp(value)) return ''
  const date = new Date(value)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

function editorFields(post) {
  return {
    title: post?.title ?? '',
    body: post?.body ?? '',
    format: post?.format ?? 'text',
    mediaId: post?.mediaId ?? '',
    audience: post?.audience ?? 'public',
    tierIds: list(post?.tierIds),
    schedule: toLocalInput(post?.scheduledAt),
  }
}

export function PostEditor() {
  const { postId } = useParams()
  const { state } = useWorkspace()
  const { pathname } = useLocation()
  const post = find(state.posts, postId)
  if (postId && (!post || post.status === 'deleted')) return <Missing title="Post unavailable" />
  return <PostForm key={pathname} post={post} />
}

function PostForm({ post }) {
  const { state, commit, notify } = useWorkspace()
  const navigate = useSiteNavigate()
  const [fields, setFields] = useState(() => editorFields(post))
  const [errors, setErrors] = useState({})
  const [modal, setModal] = useState('')
  const [changedSchedule, setChangedSchedule] = useState(false)
  const mediaItems = list(state.media).filter(item => item.type === fields.format && localMedia(item))
  const media = find(mediaItems, fields.mediaId)
  const tierOptions = list(state.tiers).filter(tier => tier.status === 'published' || fields.tierIds.includes(tier.id))
  const missingTierIds = fields.tierIds.filter(id => !find(state.tiers, id))

  function update(changes) {
    setFields(previous => ({ ...previous, ...changes }))
    setErrors({})
  }

  function save(status, explicitSchedule = false) {
    const result = commit((latest, { now, actor }) => {
      const existing = post && find(latest.posts, post.id)
      if (post && (!existing || existing.status === 'deleted')) return { error: { form: 'This post is unavailable.' } }
      const title = fields.title.trim()
      const body = fields.body.trim()
      const selectedMedia = find(latest.media, fields.mediaId)
      const mediaId = selectedMedia?.type === fields.format && localMedia(selectedMedia) ? selectedMedia.id : null
      const tierIds = fields.audience === 'selected_tiers'
        ? [...new Set(fields.tierIds)].filter(id => {
          const tier = find(latest.tiers, id)
          return Boolean(tier && (tier.status === 'published' || (tier.status === 'unpublished' && list(existing?.tierIds).includes(id))))
        })
        : []
      const schedule = new Date(fields.schedule)
      const check = {}
      if (!title) check.title = 'Enter a title.'
      if (status !== 'draft' && !body && !mediaId) check.body = 'Add body text or select media for this format.'
      if (status !== 'draft' && fields.audience === 'selected_tiers' && !tierIds.length) check.audience = 'Select at least one tier.'
      const keepSchedule = status === 'scheduled' && existing?.status === 'scheduled' && !changedSchedule && !explicitSchedule
      if (status === 'scheduled' && (!keepSchedule || !timestamp(existing?.scheduledAt)) &&
          (!Number.isFinite(schedule.getTime()) || schedule <= new Date(now))) check.schedule = 'Choose a date and time in the future.'
      if (Object.keys(check).length) return { error: check }
      const record = {
        ...existing,
        id: existing?.id ?? idFor('post'),
        authorId: existing?.authorId ?? actor,
        title, body, format: fields.format, mediaId, audience: fields.audience, tierIds, status,
        createdAt: existing?.createdAt ?? now, updatedAt: now, updatedBy: actor,
        scheduledAt: status === 'scheduled' ? (keepSchedule && timestamp(existing?.scheduledAt) ? existing.scheduledAt : schedule.toISOString()) : null,
        publishedAt: status === 'published' ? (existing?.publishedAt ?? now) : null,
        deletedAt: null,
      }
      return { state: { ...latest, posts: upsert(latest.posts, record) } }
    })
    if (result.error) return setErrors(result.error)
    notify(status === 'published' ? (post?.status === 'published' ? 'Post updated.' : 'Post published.') : status === 'scheduled' ? 'Post scheduled.' : 'Draft saved.')
    navigate('/posts')
  }

  function duplicate() {
    const result = commit((latest, { now, actor }) => {
      const original = find(latest.posts, post.id)
      if (!original || original.status === 'deleted') return { error: 'This post is unavailable.' }
      const record = {
        ...original, id: idFor('post'), title: `${original.title || 'Untitled post'} (copy)`,
        authorId: original.authorId ?? actor, status: 'draft', createdAt: now, updatedAt: now, updatedBy: actor,
        scheduledAt: null, publishedAt: null, deletedAt: null,
      }
      return { state: { ...latest, posts: upsert(latest.posts, record) }, id: record.id }
    })
    if (result.error) return setErrors({ form: result.error })
    notify('Draft duplicated.')
    navigate(recordPath('posts', result.id))
  }

  function remove() {
    const result = commit((latest, { now, actor }) => {
      const existing = find(latest.posts, post.id)
      if (!existing || existing.status === 'deleted') return { error: 'This post is unavailable.' }
      const record = { ...existing, status: 'deleted', deletedAt: now, updatedAt: now, updatedBy: actor }
      return { state: { ...latest, posts: upsert(latest.posts, record) } }
    })
    if (result.error) return setErrors({ form: result.error })
    notify('Post deleted.')
    navigate('/posts')
  }

  return <>
    <BackLink section="posts">Back to posts</BackLink>
    <PageHeader title={post ? 'Edit post' : 'New post'}>{post && <Status value={post.status} />}</PageHeader>
    <form className="editor-layout" onSubmit={event => { event.preventDefault(); save(post?.status || 'draft') }}>
      <section className="paper writing-panel">
        <label className="field">Title<input aria-label="Title" value={fields.title} onChange={event => update({ title: event.target.value })} aria-invalid={!!errors.title} placeholder="Give your post a title" />
          <FieldError>{errors.title}</FieldError></label>
        <label className="field">Body<textarea aria-label="Body" value={fields.body} onChange={event => update({ body: event.target.value })} aria-invalid={!!errors.body} rows={14} placeholder="Write your post…" />
          <FieldError>{errors.body}</FieldError></label>
        <div className="actions">
          <button type="button" onClick={() => setModal('preview')}>Preview</button>
          {post && <button type="button" onClick={duplicate}>Duplicate as draft</button>}
          {post && <button className="text-button danger-text" type="button" onClick={() => setModal('delete')}>Delete post</button>}
        </div>
      </section>
      <aside className="paper settings-panel" aria-label="Post settings">
        <h2>Post settings</h2>
        <label className="field">Format<select aria-label="Format" value={fields.format} onChange={event => update({ format: event.target.value, mediaId: '' })}>
          {formats.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
        </select></label>
        {fields.format !== 'text' && <label className="field">Media<select aria-label="Media" value={media?.id ?? ''} onChange={event => update({ mediaId: event.target.value })}>
          <option value="">No media</option>{mediaItems.map(item => <option key={item.id} value={item.id}>{item.name || item.id}</option>)}
        </select></label>}
        <label className="field">Audience<select aria-label="Audience" value={fields.audience} onChange={event => update({ audience: event.target.value })}>
          {audiences.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
        </select></label>
        {fields.audience === 'selected_tiers' && <fieldset className="check-list">
          <legend>Selected tiers</legend>
          {!tierOptions.length && <p>No tiers available.</p>}
          {tierOptions.map(tier => <label key={tier.id}><input type="checkbox" checked={fields.tierIds.includes(tier.id)}
            disabled={tier.status === 'retired' && !fields.tierIds.includes(tier.id)}
            onChange={event => update({ tierIds: event.target.checked ? [...fields.tierIds, tier.id] : fields.tierIds.filter(id => id !== tier.id) })} />
            {tier.name || 'Unnamed tier'}{tier.status !== 'published' && <small>({tier.status})</small>}</label>)}
          {missingTierIds.length > 0 && <p>Some existing tiers are unavailable.</p>}
          <FieldError>{errors.audience}</FieldError>
        </fieldset>}
        <label className="field">Schedule date and time<input aria-label="Schedule date and time" type="datetime-local" value={fields.schedule} aria-invalid={!!errors.schedule}
          onChange={event => { setChangedSchedule(true); update({ schedule: event.target.value }) }} />
          <FieldError>{errors.schedule}</FieldError></label>
        {post?.status === 'scheduled' && post.scheduledAt && timestamp(post.scheduledAt) <= new Date().getTime() && <p className="hint">The scheduled time has passed. Publish now or set a new time.</p>}
        <FieldError>{errors.form}</FieldError>
        <div className="publish-actions">
          {post && <button type="submit">Save changes</button>}
          <button type="button" onClick={() => save('draft')}>Save draft</button>
          <button type="button" onClick={() => save('scheduled', true)}>Schedule</button>
          {post?.status !== 'published' && <button type="button" className="primary" onClick={() => save('published')}>Publish now</button>}
        </div>
      </aside>
    </form>
    {modal === 'preview' && <Modal title="Post preview" wide onClose={() => setModal('')}>
      <div className="post-preview">
        <p className="eyebrow">{readLabel(audiences, fields.audience)} · {readLabel(formats, fields.format)}</p>
        <h2>{fields.title.trim() || 'Untitled post'}</h2>
        {media?.type === 'image' && <img src={localMedia(media)} alt={media.alt ?? ''} />}
        {media?.type === 'audio' && <audio src={localMedia(media)} controls preload="metadata" />}
        {fields.body && <p className="prewrap">{fields.body}</p>}
      </div>
      <div className="actions dialog-actions"><button type="button" onClick={() => setModal('')}>Back to editor</button></div>
    </Modal>}
    {modal === 'delete' && <Confirm title="Delete post?" action="Delete post" danger onClose={() => setModal('')} onConfirm={remove} error={errors.form}>
      “{post.title || 'Untitled post'}” will be removed from the post library.
    </Confirm>}
  </>
}


