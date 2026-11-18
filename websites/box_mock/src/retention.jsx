import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useWorkspace } from './store.jsx'
import { directory, durationLabel, FieldError, humanDate, label, nameOf, normalize, replace, retentionRecord, stampRemoval } from './model.js'
import { Breadcrumbs, Chip, Dialog, Empty, Field, Form, Heading, Icon, RouteLink, useRoute } from './ui.jsx'

const policiesUrl = '/governance/retention'
const policyUrl = id => `${policiesUrl}/${encodeURIComponent(id)}`
const folderUrl = id => `/folders/${encodeURIComponent(id)}`
const dispositions = { keep: 'Keep', permanently_delete: 'Permanently delete' }
const presets = ['30-days', '60-days', '90-days', '1-years', '3-years', '6-years', '10-years']
const days = duration => duration?.value * (duration?.unit === 'years' ? 365 : 1)

function currentPolicy(state, id) {
  if (!state.account?.canManageRetention) throw new Error('Retention management is unavailable for this account.')
  if (!id) return null
  const policy = state.retentionPolicies.find(item => item.id === id)
  if (!policy || policy.status !== 'active') throw new Error('This policy is no longer active.')
  return policy
}

function FolderSelection({ state, selection, setSelection, exclude }) {
  const [query, setQuery] = useState('')
  const tree = directory(state)
  const choices = state.folders.filter(folder => !exclude.has(folder.id) && tree.visible(folder.id))
    .map(folder => ({ id: folder.id, path: tree.pathLabel(folder.id) }))
  const filtered = choices.filter(folder => normalize(folder.path).includes(normalize(query))).sort((a, b) => a.path.localeCompare(b.path))
  function toggle(id, checked) {
    setSelection(previous => checked ? [...previous, id] : previous.filter(item => item !== id))
  }
  return <>
    <Field title="Search folders"><input type="search" value={query} onChange={event => setQuery(event.target.value)} /></Field>
    <fieldset><legend>Folders</legend>
      <div className="picker">{filtered.length ? filtered.map(folder => <label key={folder.id}>
        <input type="checkbox" checked={selection.includes(folder.id)} onChange={event => toggle(folder.id, event.target.checked)} /><span><Icon name="folder" size={15} /> {folder.path}</span>
      </label>) : <p className="panel-pad muted">No available folders match your search.</p>}</div>
    </fieldset>
    <small>{selection.length} selected</small>
  </>
}

function DurationFields({ policy, option, setOption, initial }) {
  const duration = policy?.duration
  const existing = `${duration?.value}-${duration?.unit}`
  const locked = duration?.unit === 'indefinite'
  const choices = presets.filter(preset => {
    if (policy?.type !== 'non_modifiable') return true
    const [value, unit] = preset.split('-')
    return days({ value: Number(value), unit }) >= days(duration)
  })
  if (locked) return <p>Duration <strong>Indefinite</strong></p>
  return <>
    <Field title="Duration"><select name="term" value={option} onChange={event => setOption(event.target.value)}>
      {choices.map(preset => {
        const [value, unit] = preset.split('-')
        return <option key={preset} value={preset}>{durationLabel({ value: Number(value), unit })}</option>
      })}
      {policy?.type === 'non_modifiable' && presets.includes(existing) && !choices.includes(existing) && <option value={existing}>{durationLabel(duration)}</option>}
      <option value="custom">Custom duration</option>
      {!policy && <option value="indefinite">Indefinite</option>}
    </select></Field>
    {option === 'custom' && <div className="two-field">
      <Field title="Length"><input name="length" type="number" required min="1" step="1" defaultValue={duration?.value ?? initial.length ?? 1} /></Field>
      <Field title="Unit"><select name="unit" defaultValue={duration?.unit ?? initial.unit ?? 'years'}><option value="days">Days</option><option value="years">Years</option></select></Field>
    </div>}
  </>
}

function settings(data, option, policy) {
  const name = policy ? nameOf(policy) : String(data.get('name') ?? '').trim()
  const description = String(data.get('description') ?? '').trim()
  const type = policy?.type ?? data.get('type')
  if (!name || name.length > 250) throw new FieldError(policy ? undefined : 'name', 'Enter a name up to 250 characters.')
  if (description.length > 500) throw new FieldError('description', 'Enter a description up to 500 characters.')
  if (!['modifiable', 'non_modifiable'].includes(type)) throw new FieldError(policy ? undefined : 'type', 'Choose a policy type.')
  const [raw, unit] = option === 'custom' ? [data.get('length'), data.get('unit')] : option.split('-')
  const indefinite = option === 'indefinite'
  const duration = indefinite ? { value: null, unit: 'indefinite' } : { value: Number(raw), unit }
  if (!indefinite && (!['days', 'years'].includes(unit) || !Number.isInteger(duration.value) || duration.value < 1 || days(duration) > 18250)) {
    throw new FieldError(option === 'custom' ? 'length' : 'term', 'Enter a whole number from 1 to 50 years or 1 to 18,250 days.')
  }
  if (policy?.duration?.unit === 'indefinite' && !indefinite) throw new Error('An indefinite policy stays indefinite.')
  if (policy?.duration?.unit && policy.duration.unit !== 'indefinite' && indefinite) throw new Error('A finite policy must keep a finite duration.')
  if (type === 'non_modifiable' && policy && days(duration) < days(policy.duration)) throw new FieldError(option === 'custom' ? 'length' : 'term', 'This policy’s duration can only be extended.')
  const disposition = indefinite ? 'keep' : policy?.type === 'non_modifiable' && policy.disposition ? policy.disposition : data.get('disposition')
  if (!Object.hasOwn(dispositions, disposition)) throw new FieldError(type === 'non_modifiable' && policy?.disposition ? undefined : 'disposition', 'Choose a disposition.')
  return { name, description: description || null, type, duration, disposition, scope: 'folders', startBasis: 'content_created_at' }
}

function pickedFolders(state, selection, exclude = new Set()) {
  const tree = directory(state)
  if (!selection.length || selection.some(id => !tree.visible(id) || id == null || exclude.has(id))) throw new Error('Select at least one available folder.')
  return [...new Set(selection)]
}

function PolicyEditor({ policy, onClose }) {
  const { state, commit } = useWorkspace()
  const route = useRoute()
  const term = `${policy?.duration?.value}-${policy?.duration?.unit}`
  const [option, setOption] = useState(policy?.duration?.unit === 'indefinite' ? 'indefinite' : presets.includes(term) ? term : policy?.duration?.unit ? 'custom' : '6-years')
  const [selection, setSelection] = useState([])
  const [review, setReview] = useState(null)
  const [draft, setDraft] = useState({})
  const [disposition, setDisposition] = useState(policy?.disposition ?? 'keep')
  const title = policy ? 'Edit policy' : review ? 'Review retention policy' : 'Create policy'

  function reviewPolicy(data) {
    const values = settings(data, option, policy)
    if (policy) {
      commit((current, meta) => {
        const target = currentPolicy(current, policy.id)
        const patch = settings(data, option, target)
        return { ...current, retentionPolicies: replace(current.retentionPolicies, target.id, {
          ...meta.update, description: patch.description, duration: { ...target.duration, ...patch.duration }, disposition: patch.disposition,
        }) }
      }, 'Policy updated.')
      onClose()
      return
    }
    pickedFolders(state, selection)
    setDraft(Object.fromEntries(data))
    setReview(values)
  }
  function start() {
    let id
    commit((current, meta) => {
      currentPolicy(current)
      const targets = pickedFolders(current, selection)
      const record = {
        ...meta.record('policy'), ...review, status: 'active',
        activatedAt: meta.now, activatedById: meta.actor, retiredAt: null, retiredById: null,
      }
      id = record.id
      return {
        ...current, retentionPolicies: [...current.retentionPolicies, record],
        retentionAssignments: [...current.retentionAssignments, ...targets.map(folderId => retentionRecord(meta, id, folderId))],
      }
    }, 'Retention policy started.')
    onClose()
    route(policyUrl(id))
  }
  return <Dialog title={title} onClose={onClose} wide>
    {review ? <Form key="review" action="Start policy" onClose={onClose} onSave={start}>
      <h3>{review.name}</h3>
      {review.description && <p>{review.description}</p>}
      <dl className="details"><dt>Policy type</dt><dd>{label(review.type)}</dd><dt>Duration</dt><dd>{durationLabel(review.duration)}</dd>
        <dt>Start basis</dt><dd>Box creation date</dd><dt>Disposition</dt><dd>{dispositions[review.disposition]}</dd></dl>
      <div><strong>Selected folders</strong><ul>{selection.map(id => <li key={id}>{directory(state).pathLabel(id)}</li>)}</ul></div>
      <button type="button" onClick={() => setReview(null)}>Back to settings</button>
    </Form> : <Form key="settings" action={policy ? 'Save changes' : 'Review policy'} onClose={onClose} onSave={reviewPolicy}>
      {policy ? <p><strong>{nameOf(policy)}</strong> · {label(policy.type)}</p> : <Field title="Policy name"><input name="name" required maxLength={250} defaultValue={draft.name} autoFocus /></Field>}
      <Field title="Description (optional)"><textarea name="description" maxLength={500} rows="2" defaultValue={policy?.description ?? draft.description} /></Field>
      {!policy && <Field title="Policy type"><select name="type" defaultValue={draft.type || 'modifiable'}><option value="modifiable">Modifiable</option><option value="non_modifiable">Non-modifiable</option></select></Field>}
      <DurationFields policy={policy} option={option} setOption={setOption} initial={draft} />
      <p>Start basis <strong>Box creation date</strong></p>
      {option === 'indefinite' || (policy?.type === 'non_modifiable' && policy.disposition) ? <p>Disposition <strong>{option === 'indefinite' ? 'Keep' : dispositions[policy.disposition]}</strong></p> :
        <Field title="Disposition"><select name="disposition" value={disposition} onChange={event => setDisposition(event.target.value)}><option value="keep">Keep</option><option value="permanently_delete">Permanently delete</option></select></Field>}
      {!policy && <FolderSelection state={state} selection={selection} setSelection={setSelection} exclude={new Set()} />}
    </Form>}
  </Dialog>
}

function directIds(state, policyId) {
  return new Set(state.retentionAssignments.filter(entry => entry.policyId === policyId && entry.kind === 'direct' && entry.status === 'active').map(entry => entry.folderId))
}

function PolicyAction({ kind, policy, entry, onClose }) {
  const { state, commit } = useWorkspace()
  const [selection, setSelection] = useState([])
  const tree = directory(state)
  const titles = { add: 'Add folders', remove: 'Remove folder coverage', retire: 'Retire policy' }

  function save() {
    commit((current, meta) => {
      const target = currentPolicy(current, policy.id)
      if (kind === 'retire') return {
        ...current, retentionPolicies: replace(current.retentionPolicies, target.id, { ...meta.update, status: 'retired', retiredAt: meta.now, retiredById: meta.actor }),
      }
      if (kind === 'add') {
        const ids = pickedFolders(current, selection, directIds(current, target.id))
        return { ...current, retentionAssignments: [...current.retentionAssignments, ...ids.map(folderId => retentionRecord(meta, target.id, folderId))] }
      }
      const assignment = current.retentionAssignments.find(item => item.id === entry.id && item.policyId === target.id)
      if (target.type !== 'modifiable' || assignment?.status !== 'active' || assignment.kind !== 'direct') throw new Error('This coverage cannot be removed.')
      const removed = new Set([assignment.id])
      let found
      do {
        found = false
        for (const item of current.retentionAssignments) {
          if (item.policyId !== target.id || item.kind !== 'carried' || !removed.has(item.sourceAssignmentId) || removed.has(item.id)) continue
          removed.add(item.id)
          found = true
        }
      } while (found)
      return { ...current, retentionAssignments: current.retentionAssignments.map(item =>
        removed.has(item.id) && item.status === 'active' ? { ...item, ...stampRemoval(meta) } : item) }
    }, { add: 'Folders added to policy.', remove: 'Folder coverage removed.', retire: 'Policy retired.' }[kind])
    onClose()
  }
  return <Dialog title={titles[kind]} onClose={onClose} wide={kind === 'add'}>
    <Form action={titles[kind]} onClose={onClose} onSave={save} danger={kind !== 'add'}>
      {kind === 'add' && <FolderSelection state={state} selection={selection} setSelection={setSelection} exclude={directIds(state, policy.id)} />}
      {kind === 'remove' && <p>Remove direct coverage for <strong>{tree.pathLabel(entry.folderId)}</strong> and carried coverage linked to this assignment?</p>}
      {kind === 'retire' && <p>Retire <strong>{nameOf(policy)}</strong>? Its existing coverage will stay visible.</p>}
    </Form>
  </Dialog>
}

function PolicyDetail({ id }) {
  const { state } = useWorkspace()
  const [action, setAction] = useState(null)
  const close = () => setAction(null)
  const policy = state.retentionPolicies.find(item => item.id === id)
  if (!policy) return <Empty title="Policy unavailable"><RouteLink to={policiesUrl}>Back to Retention</RouteLink></Empty>
  const managed = policy.status === 'active' && state.account?.canManageRetention
  const entries = state.retentionAssignments.filter(entry => entry.policyId === id)
  const tree = directory(state)
  const activeCount = entries.filter(entry => entry.status === 'active').length
  return <>
    <nav className="breadcrumbs" aria-label="Breadcrumb"><RouteLink to={policiesUrl}>Retention</RouteLink><Icon name="chevron" size={12} />{nameOf(policy)}</nav>
    <Heading title={nameOf(policy)} description={policy.description} actions={<>
      <Chip status={policy.status} />
      {managed && <><button onClick={() => setAction({ kind: 'edit' })}>Edit policy</button>
        <button onClick={() => setAction({ kind: 'retire' })}>Retire policy</button>
        <button className="primary" onClick={() => setAction({ kind: 'add' })}><Icon name="plus" />Add folders</button></>}
    </>} />
    <div className="split">
      <section className="panel">
        <div className="toolbar"><h2>Folder coverage</h2><small>{activeCount} active</small></div>
        {!entries.length ? <Empty title="No folder coverage" /> : <table>
          <thead><tr><th scope="col">Location</th><th scope="col" className="optional-cell">Coverage</th><th scope="col">Status</th><th scope="col" className="action-cell"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{entries.map(entry => {
            const source = state.retentionAssignments.find(item => item.id === entry.sourceAssignmentId)
            const target = tree.folders.get(entry.folderId)
            const path = target ? tree.pathLabel(entry.folderId) : 'Folder unavailable'
            return <tr key={entry.id}>
              <td>{target && tree.visible(entry.folderId) ? <RouteLink className="record-link" to={folderUrl(entry.folderId)}>{path}</RouteLink> : path}
                <small className="row-detail narrow-detail">Coverage {label(entry.kind)}</small>
                {source && <div><small>Original source {tree.pathLabel(source.folderId)}</small></div>}</td>
              <td className="optional-cell">{label(entry.kind)}</td><td><Chip status={entry.status} /></td>
              <td className="action-cell">{managed && policy.type === 'modifiable' && entry.kind === 'direct' && entry.status === 'active' &&
                <button onClick={() => setAction({ kind: 'remove', entry })}>Remove</button>}</td>
            </tr>
          })}</tbody>
        </table>}
      </section>
      <aside className="panel panel-pad">
        <h2><Icon name="shield" />Policy settings</h2>
        <dl className="details"><dt>Type</dt><dd>{label(policy.type)}</dd><dt>Duration</dt><dd>{durationLabel(policy.duration)}</dd>
          <dt>Start basis</dt><dd>Box creation date</dd><dt>Disposition</dt><dd>{dispositions[policy.disposition] || '—'}</dd>
          <dt>Started</dt><dd>{humanDate(policy.activatedAt)}</dd>{policy.status === 'retired' && <><dt>Retired</dt><dd>{humanDate(policy.retiredAt)}</dd></>}</dl>
      </aside>
    </div>
    {action?.kind === 'edit' ? <PolicyEditor policy={policy} onClose={close} /> : action && <PolicyAction policy={policy} {...action} onClose={close} />}
  </>
}

function PolicyList() {
  const { state } = useWorkspace()
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const counts = new Map()
  for (const entry of state.retentionAssignments) {
    if (entry.status !== 'active') continue
    if (!counts.has(entry.policyId)) counts.set(entry.policyId, new Set())
    counts.get(entry.policyId).add(entry.folderId)
  }
  const policies = state.retentionPolicies.filter(policy => (status === 'all' || policy.status === status) &&
    [policy.name, policy.description].some(value => normalize(value).includes(normalize(query))))
    .sort((a, b) => nameOf(a).localeCompare(nameOf(b)))
  return <>
    <Heading overline="Governance" title="Retention" description="Manage how long content in covered folders is kept." actions={state.account?.canManageRetention &&
      <button className="primary" onClick={() => setCreating(true)}><Icon name="plus" />Create policy</button>} />
    <section className="panel">
      <div className="toolbar">
        <Field title="Search policies"><input type="search" value={query} onChange={event => setQuery(event.target.value)} /></Field>
        <Field title="Status"><select value={status} onChange={event => setStatus(event.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="retired">Retired</option></select></Field>
      </div>
      {policies.length ? <><table>
        <thead><tr><th scope="col">Policy name</th><th scope="col">Status</th><th scope="col">Duration</th><th scope="col" className="optional-cell">Folders</th><th scope="col" className="optional-cell">Disposition</th></tr></thead>
        <tbody>{policies.map(policy => <tr key={policy.id}>
          <td><div className="item-name"><span className="marker policy-marker"><Icon name="shield" /></span><div>
            <RouteLink to={policyUrl(policy.id)}>{nameOf(policy)}</RouteLink><small>{label(policy.type)}</small>
            <small className="row-detail narrow-detail">Folders {counts.get(policy.id)?.size ?? 0}</small>
            <small className="row-detail narrow-detail">Disposition {dispositions[policy.disposition] || '—'}</small>
          </div></div></td>
          <td><Chip status={policy.status} /></td><td>{durationLabel(policy.duration)}</td>
          <td className="optional-cell">{counts.get(policy.id)?.size ?? 0}</td><td className="optional-cell">{dispositions[policy.disposition] || '—'}</td>
        </tr>)}</tbody>
      </table><div className="table-footer">{policies.length} {policies.length === 1 ? 'policy' : 'policies'}</div></> : <Empty title="No policies match this view" />}
    </section>
    {creating && <PolicyEditor onClose={() => setCreating(false)} />}
  </>
}

export function Retention() {
  const { policyId } = useParams()
  return policyId ? <PolicyDetail id={policyId} /> : <PolicyList />
}



