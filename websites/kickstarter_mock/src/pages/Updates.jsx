import { useState } from 'react'
import { Badge, childPath, Confirm, dateLabel, Dialog, Empty, Field, FilterCount, includes, labels, list, projectPath, Readable, SectionHeading, SiteLink, useFeedback, useSiteNavigate } from '../ui'
import { creation, put, timestamp, useStore } from '../store'
import { bind, textValues } from '../forms'
import { Missing } from './Projects'

const audiences = ['public', 'backers_only']
const canPublish = project => ['live', 'funded'].includes(project.status)
const updatePath = project => projectPath(project.id) + '/updates'

export function Updates({ project }) {
  const { state } = useStore()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const base = updatePath(project)
  const rows = list(state.updates).filter(update =>
    update.projectId === project.id && (!status || update.status === status) && includes(update.title, query)
  ).sort((a, b) => String(b.publishedAt || b.updatedAt || '').localeCompare(String(a.publishedAt || a.updatedAt || '')))
  const filtered = Boolean(query.trim() || status)
  function reset() { setQuery(''); setStatus('') }

  return <>
    <SectionHeading title="Updates" description="Share milestones and production notes with your audience.">
      <SiteLink className="button primary" to={base + '/new'}>New update</SiteLink>
    </SectionHeading>
    <div className="toolbar two panel">
      <Field label="Search updates" type="search" placeholder="Search by title" value={query} onChange={event => setQuery(event.target.value)} />
      <Field label="Update status" as="select" value={status} onChange={event => setStatus(event.target.value)}>
        <option value="">All statuses</option><option value="draft">Draft</option><option value="published">Published</option>
      </Field>
    </div>
    <FilterCount count={rows.length} noun="update" filtered={filtered} onReset={reset} />
    {rows.length ? <div className="table-wrap panel"><table aria-label="Updates">
      <thead><tr><th>Update</th><th>Audience</th><th>Status</th><th>Last activity</th></tr></thead>
      <tbody>{rows.map(update => <tr key={update.id}>
        <th scope="row"><SiteLink to={childPath(base, update.id)}>{update.title || 'Untitled update'}</SiteLink></th>
        <td>{labels[update.audience] || '—'}</td><td><Badge status={update.status} /></td>
        <td>{dateLabel(update.publishedAt || update.updatedAt)}</td>
      </tr>)}</tbody>
    </table></div> : <Empty title={filtered ? 'No matching updates' : 'No updates yet'}
      message={filtered ? 'Try adjusting your search or status.' : 'Start an update to share news about the project.'}>
      {filtered ? <button className="button secondary" onClick={reset}>Clear filters</button>
        : <SiteLink className="button primary" to={base + '/new'}>New update</SiteLink>}
    </Empty>}
  </>
}

export function UpdateRoute({ project, updateId }) {
  const { state } = useStore()
  const base = updatePath(project)
  const update = updateId && list(state.updates).find(entry => entry.id === updateId && entry.projectId === project.id)
  if (updateId && !update) return <Missing title="Update not found" to={base} label="Back to updates" />
  if (update?.status === 'published') return <>
    <SiteLink className="breadcrumb" to={base}>← Updates</SiteLink>
    <SectionHeading title="Published update"><Badge status="published" /></SectionHeading>
    <article className="panel editor-group editor">
      <UpdateContent update={update} />
      <p className="hint">Published {dateLabel(update.publishedAt)}</p>
    </article>
  </>
  return <UpdateEditor key={update?.id || project.id} project={project} update={update} />
}

function UpdateContent({ update }) {
  return <div className="update-content">
    <h3>{update.title || 'Untitled update'}</h3>
    <p className="hint">{labels[update.audience] || 'Audience unset'}</p>
    <Readable>{update.body}</Readable>
  </div>
}

function UpdateEditor({ project, update }) {
  const { mutate } = useStore()
  const notify = useFeedback()
  const navigate = useSiteNavigate()
  const [values, setValues] = useState(() => textValues({ audience: 'public', ...update }, ['title', 'body', 'audience']))
  const [errors, setErrors] = useState({})
  const [preview, setPreview] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const base = updatePath(project)
  const allowed = canPublish(project)
  const content = { title: values.title.trim(), body: values.body.trim(), audience: values.audience }

  function validate(publishing) {
    const issues = {}
    if (!content.title) issues.title = 'Enter an update title.'
    if (publishing && !content.body) issues.body = 'Enter update text to publish.'
    if (!audiences.includes(content.audience)) issues.audience = 'Choose an audience.'
    setErrors(issues)
    return !Object.keys(issues).length
  }

  function save(publishing) {
    let id
    mutate(current => {
      const owner = list(current.projects).find(entry => entry.id === project.id)
      const existing = update && list(current.updates).find(entry => entry.id === update.id && entry.projectId === project.id)
      if (!owner || (update && existing?.status !== 'draft') || (publishing && !canPublish(owner))) return current
      const stamp = existing ? timestamp(current.account) : creation(current.account, 'update')
      const record = {
        ...existing, ...stamp, ...content, projectId: project.id,
        status: publishing ? 'published' : 'draft',
        publishedAt: publishing ? stamp.updatedAt : null, publishedBy: publishing ? stamp.updatedBy : null,
      }
      id = record.id
      return put(current, 'updates', record)
    })
    setConfirm(false)
    if (!id) return
    notify(publishing ? 'Update published.' : 'Update draft saved.')
    navigate(childPath(base, id), { replace: !update })
  }

  return <>
    <SiteLink className="breadcrumb" to={base}>← Updates</SiteLink>
    <SectionHeading title={update ? 'Edit update' : 'New update'}>{update && <Badge status="draft" />}</SectionHeading>
    <form className="editor" noValidate onSubmit={event => { event.preventDefault(); if (validate(false)) save(false) }}>
      <section className="panel editor-group">
        <Field label="Update title" required error={errors.title} {...bind(values, setValues, 'title')} />
        <Field label="Update body" as="textarea" rows={8} error={errors.body} {...bind(values, setValues, 'body')} />
        <Field label="Audience" as="select" error={errors.audience} {...bind(values, setValues, 'audience')}>
          {!audiences.includes(values.audience) && <option value={values.audience}>Choose an audience</option>}
          {audiences.map(audience => <option key={audience} value={audience}>{labels[audience]}</option>)}
        </Field>
      </section>
      <div className="actions">
        <button className="button secondary" type="submit">Save draft</button>
        <button className="button secondary" type="button" onClick={() => setPreview(true)}>Preview update</button>
        <button className="button primary" type="button" disabled={!allowed} onClick={() => { if (validate(true)) setConfirm(true) }}>Publish update</button>
      </div>
      {!allowed && <p className="hint">A project must be live or funded to publish an update.</p>}
    </form>
    {preview && <Dialog title="Update preview" onClose={() => setPreview(false)}>
      <div className="dialog-body"><UpdateContent update={content} /></div>
      <button className="button secondary" type="button" onClick={() => setPreview(false)}>Close preview</button>
    </Dialog>}
    {confirm && <Confirm title="Publish update" onClose={() => setConfirm(false)} onConfirm={() => save(true)}>
      <p>Publish <strong>{content.title}</strong>? {content.audience === 'public'
        ? 'Anyone who visits the campaign can read this update.'
        : 'Only backers can read this update.'}</p>
    </Confirm>}
  </>
}

