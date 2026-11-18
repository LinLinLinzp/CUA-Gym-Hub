import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { hardwareOptions, licenses } from './actions'
import { useWorkspace } from './store'
import { Badge, Field, Icon, Link, NavLink, SelectField, useNavigate } from './ui'
import { allowedFiles, array, date, displayName, isGated, kinds, label, likeCount, namespace, owns, repoPath, requestFor, slugify, visible } from './workspace'

const createLabel = (kind) => kind === 'spaces' ? 'Space' : kinds[kind].singular

export function NewRepository({ kind }) {
  return <>
    <div className="page-heading"><div><h1>New {createLabel(kind)}</h1><p>Create a repository in your account namespace.</p></div></div>
    <section className="panel form-panel"><RepositoryForm kind={kind} /></section>
  </>
}

function RepositoryForm({ kind, repo }) {
  const { state, dispatch } = useWorkspace()
  const navigate = useNavigate()
  const spec = kinds[kind]
  const [values, setValues] = useState(() => ({
    name: repo?.name || '', description: repo?.description || '', tags: array(repo?.tags).join(', '),
    visibility: repo?.visibility || 'public',
    [spec.field]: repo?.[spec.field] || spec.options[0],
    license: repo?.license || licenses[kind]?.[0],
    hardware: repo?.hardware || 'cpu-basic',
  }))
  const [error, setError] = useState('')
  const on = (key) => (value) => setValues((previous) => ({ ...previous, [key]: value }))
  const options = (items, value) => [...new Set([...items, value].filter(Boolean))]
  const action = repo ? 'repository.updated' : 'repository.created'
  const owner = state.account?.username || 'account'

  function submit(event) {
    event.preventDefault()
    const tags = [...new Set(values.tags.split(',').map((tag) => tag.trim()).filter(Boolean))]
    const result = dispatch(action, { kind, id: repo?.id, ...values, tags }, repo ? 'Repository settings saved.' : 'Repository created.')
    setError(result.error || '')
    if (result.state && !repo) navigate(repoPath(kind, result.record))
  }

  return <form className="form" onSubmit={submit}>
    {!repo && <Field title="Repository name" hint={owner + '/' + (slugify(values.name) || 'repository-name')}><input required value={values.name} onChange={(event) => on('name')(event.target.value)} /></Field>}
    <Field title="Description"><textarea rows={4} maxLength={1500} value={values.description} onChange={(event) => on('description')(event.target.value)} /></Field>
    <Field title="Tags" hint="Separate tags with commas."><input value={values.tags} maxLength={300} onChange={(event) => on('tags')(event.target.value)} /></Field>
    <div className="field-grid">
      {(!repo || kind !== 'spaces') && <SelectField title={spec.fieldLabel} value={values[spec.field]} onChange={on(spec.field)} options={options(spec.options, values[spec.field])} />}
      {licenses[kind] && <SelectField title="License" value={values.license} onChange={on('license')} options={options(licenses[kind], values.license)} />}
      {repo && kind === 'spaces' && repo.sdk && repo.sdk !== 'static' && <SelectField title="Hardware" value={values.hardware} onChange={on('hardware')} options={options(hardwareOptions, values.hardware)} />}
      <SelectField title="Visibility" value={values.visibility} onChange={on('visibility')} options={['public', 'private']} />
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="actions"><button className="button primary">{repo ? 'Save settings' : 'Create ' + createLabel(kind)}</button>{!repo && <Link className="button secondary" to={'/' + kind}>Cancel</Link>}</div>
  </form>
}

export function Detail({ kind, section }) {
  const { state, dispatch } = useWorkspace()
  const { owner, slug } = useParams()
  const spec = kinds[kind]
  const repo = array(state[kind]).find((record) => record.owner === owner && record.slug === slug && visible(state.account, record))
  if (!repo) return <section className="panel empty"><h1>Repository unavailable</h1><p>Check the address or return to the catalog.</p><Link className="button primary" to={'/' + kind}>Back to {spec.label}</Link></section>
  const path = repoPath(kind, repo)
  const owned = owns(state.account, repo)
  const canRead = kind === 'spaces' || allowedFiles(state, kind, repo)
  const accepted = kind !== 'spaces' && isGated(repo) && requestFor(state, kind, repo)?.status === 'accepted'
  const liked = array(repo.likedBy).includes(state.account?.id)
  const compute = kind === 'spaces' && repo.sdk && repo.sdk !== 'static'
  const runtime = repo.runtimeStatus
  const action = (name, message) => dispatch(name, { kind, id: repo.id }, message)
  const tabs = [[kind === 'datasets' ? 'Dataset Card' : 'Overview', ''], ['Files', '/files'], ...(owned ? [['Settings', '/settings']] : [])]

  return <>
    <div className="page-heading repo-heading">
      <div><div className="mono quiet">{namespace(repo)}</div><h1>{displayName(repo)}</h1><div className="badge-group"><Badge value={repo.visibility || 'public'} />{kind === 'spaces' && <Badge value={runtime} />}{kind !== 'spaces' && isGated(repo) && <span className="badge"><Icon name="lock" size={13} /> Gated</span>}</div></div>
      <div className="actions">
        {kind === 'models' && <button className={'button secondary like' + (liked ? ' liked' : '')} aria-pressed={liked} onClick={() => action('model.like_changed', liked ? 'Like removed.' : 'Model liked.')}><Icon name="heart" />{liked ? 'Liked' : 'Like'} <span className="mono">{likeCount(repo)}</span></button>}
        {owned && compute && runtime === 'running' && <button className="button secondary" onClick={() => action('space.paused', 'Space paused.')}>Pause Space</button>}
        {owned && compute && ['running', 'paused'].includes(runtime) && <button className="button primary" onClick={() => action('space.restarted', 'Space restarted.')}>Restart Space</button>}
      </div>
    </div>
    <nav className="tabs" aria-label="Repository sections">
      {tabs.map(([title, suffix]) => <NavLink key={suffix} to={path + suffix} end>{title}</NavLink>)}
    </nav>
    {section === 'settings' && (owned ? <div className="detail-grid">
      <section className="panel form-panel"><h2>Repository settings</h2><RepositoryForm key={path} kind={kind} repo={repo} /></section>
      {kind !== 'spaces' && <GatingSettings key={path} kind={kind} repo={repo} />}
    </div> : <section className="panel empty"><h2>Settings unavailable</h2><p>Only the repository owner can manage settings.</p><Link to={path} className="button secondary">Back to repository</Link></section>)}
    {section !== 'settings' && <>
      {!canRead && <Gate key={path} kind={kind} repo={repo} />}
      {accepted && <div className="panel grant-banner"><Badge value="accepted" /><span>Your request was approved. You can access repository files.</span></div>}
      {section === 'files' && canRead && <Files key={path} kind={kind} repo={repo} owned={owned} />}
      {section === 'overview' && <div className="detail-grid">
        <section className="panel form-panel">
          {kind === 'spaces' && <div className="space-preview"><div><Badge value={runtime} /><h2>{displayName(repo)}</h2><p>{label(repo.sdk)} preview</p></div></div>}
          <h2>{kind === 'models' ? 'Model card' : kind === 'datasets' ? 'Dataset card' : 'About this Space'}</h2>
          <p className="description">{repo.description || 'No description has been added.'}</p>
          {array(repo.tags).length > 0 && <div className="badge-group">{array(repo.tags).map((tag, index) => <span key={index} className="badge tag">{tag}</span>)}</div>}
          {kind === 'datasets' && canRead && <DatasetSample key={path} repo={repo} />}
        </section>
        <section className="panel form-panel metadata"><h2>Repository details</h2><dl>
          <div><dt>Owner</dt><dd>{repo.owner || '—'}</dd></div>
          <div><dt>{spec.fieldLabel}</dt><dd>{label(repo[spec.field])}</dd></div>
          {kind === 'spaces' && compute && <div><dt>Hardware</dt><dd>{label(repo.hardware)}</dd></div>}
          {kind !== 'spaces' && <><div><dt>License</dt><dd className="mono">{repo.license || '—'}</dd></div><div><dt>Downloads</dt><dd className="mono">{Number(repo.downloads || 0).toLocaleString('en')}</dd></div></>}
          <div><dt>Updated</dt><dd>{date(repo.updatedAt)}</dd></div>
          {kind === 'spaces' && compute && <div><dt>Last started</dt><dd>{date(repo.lastStartedAt)}</dd></div>}
        </dl></section>
      </div>}
    </>}
  </>
}

function GatingSettings({ kind, repo }) {
  const { dispatch } = useWorkspace()
  const [mode, setMode] = useState(null)
  const [error, setError] = useState('')
  const current = repo.gating || 'off'
  return <section className="panel form-panel">
    <h2>Access gating</h2>
    {(repo.visibility || 'public') === 'public' ? <form className="form" onSubmit={(event) => {
      event.preventDefault()
      const result = dispatch('repository.gating_changed', { kind, id: repo.id, mode: mode ?? current }, 'Access gating saved.')
      setError(result.error || '')
      if (result.state) setMode(null)
    }}>
      <Field title="Approval mode"><select value={mode ?? current} onChange={(event) => setMode(event.target.value)}><option value="off">Off</option><option value="auto">Automatic approval</option><option value="manual">Manual approval</option></select></Field>
      {error && <p role="alert" className="error">{error}</p>}
      <div className="actions"><button className="button primary" disabled={mode === null || mode === current}>Save gating</button></div>
    </form> : <p className="quiet">Set visibility to Public to enable access gating.</p>}
    <Link className="review-link" to={'/access?' + new URLSearchParams({ tab: 'received', repo: kinds[kind].singular + ':' + repo.id })}>Review repository access <Icon name="arrow" size={16} /></Link>
  </section>
}

function Gate({ kind, repo }) {
  const { state, dispatch } = useWorkspace()
  const [consent, setConsent] = useState(false)
  const [purpose, setPurpose] = useState('')
  const [error, setError] = useState('')
  const request = requestFor(state, kind, repo)

  return <section className="panel form-panel gate">
    <div className="section-title"><span className="icon-tile review"><Icon name="lock" /></span><div><h2>File access is restricted</h2><p>{request ? 'You have already submitted a request.' : 'Request access to view repository files.'}</p></div></div>
    {request ? <div className="gate-status"><Badge value={request.status} />{request.rejectionReason && <p>{request.rejectionReason}</p>}<Link to="/access?tab=sent">View sent requests</Link></div> :
      <form className="form" onSubmit={(event) => {
        event.preventDefault()
        const result = dispatch('access.requested', { kind, id: repo.id, consent, purpose }, repo.gating === 'auto' ? 'Access granted.' : 'Access request submitted.')
        setError(result.error || '')
      }}>
        <label className="checkbox"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />I agree to share my account name and email with the repository owner.</label>
        <Field title="Purpose (optional)"><textarea rows={2} maxLength={300} value={purpose} onChange={(event) => setPurpose(event.target.value)} /></Field>
        {error && <p role="alert" className="error">{error}</p>}
        <div className="actions"><button className="button primary">Request access</button></div>
      </form>}
  </section>
}

function DatasetSample({ repo }) {
  const splits = array(repo.splits)
  const [picked, setPicked] = useState('')
  const split = splits.find((item) => item.name === picked) || splits[0]
  const rows = array(repo.sampleRows).filter((row) => row.split === split?.name && row.values && typeof row.values === 'object').slice(0, 10)
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row.values)))]
  return <div className="sample">
    <h2>Dataset preview</h2>
    {split ? <>
      <div className="split-list">{splits.map((item, index) => <button key={item.name || index} className="button secondary" aria-pressed={item === split} onClick={() => setPicked(item.name)}>{item.name || 'Unnamed split'} <span className="mono">{Number(item.rowCount || 0).toLocaleString('en')}</span></button>)}</div>
      {columns.length ? <div className="table-wrap"><table><caption>Sample rows · {split.name}</caption><thead><tr>{columns.map((key) => <th scope="col" key={key}>{key}</th>)}</tr></thead><tbody>
        {rows.map((row, index) => <tr key={index}>{columns.map((key) => <td key={key}>{typeof row.values[key] === 'object' && row.values[key] !== null ? JSON.stringify(row.values[key]) : String(row.values[key] ?? '—')}</td>)}</tr>)}
      </tbody></table></div> : <p className="quiet">No sample rows are available for this split.</p>}
    </> : <p className="quiet">No dataset splits have been published.</p>}
  </div>
}

function Files({ kind, repo, owned }) {
  const { dispatch } = useWorkspace()
  const [query] = useSearchParams()
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const files = array(repo.files)
  const selected = files.find((file) => file.path === query.get('file'))
  const path = repoPath(kind, repo) + '/files'
  return <div className="detail-grid">
    <section className="panel form-panel"><h2>Repository files</h2>
      {files.length ? <ul className="file-list">{files.map((file, index) => <li key={file.id || index}><Icon name="file" /><Link to={path + '?' + new URLSearchParams({ file: file.path })} aria-current={file === selected ? 'page' : undefined}>{file.path || 'Unnamed file'}</Link><span className="mono quiet">{Number(file.sizeBytes || 0)} B</span></li>)}</ul> : <p className="quiet">No files have been published.</p>}
      {selected && <div className="file-content"><h3>{selected.path}</h3><pre>{selected.content || ''}</pre></div>}
      {!selected && query.has('file') && <p className="quiet">This file is unavailable.</p>}
    </section>
    {owned && kind === 'datasets' && <section className="panel form-panel"><h2>Save a text file</h2><form className="form" onSubmit={(event) => {
      event.preventDefault()
      const result = dispatch('dataset.file_saved', { kind, id: repo.id, path: name, content }, 'Dataset file saved.')
      setError(result.error || '')
    }}>
      {selected && <div><button type="button" className="button secondary" onClick={() => { setName(selected.path); setContent(selected.content || ''); setError('') }}>Edit selected file</button></div>}
      <Field title="Filename"><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="notes.txt" /></Field>
      <Field title="Content" hint="Up to 4 KB of UTF-8 text."><textarea rows={6} maxLength={4096} value={content} onChange={(event) => setContent(event.target.value)} /></Field>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions"><button className="button primary">Save file</button></div>
    </form></section>}
  </div>
}
