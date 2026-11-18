import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useWorkspace } from './store'
import { Badge, Dialog, Field, Icon, Link, SelectField } from './ui'
import { array, canLink, date, displayName, findRepo, label, permissions, receivedRequests, repoKind, repoPath, roles, visible } from './workspace'

const tabs = [['received', 'Received'], ['sent', 'Sent'], ['tokens', 'Access Tokens']]

function RepositoryReference({ state, type, id }) {
  const repo = findRepo(state, type, id)
  const kind = repoKind(type)
  if (!repo) return <span className="quiet">Repository unavailable</span>
  if (!canLink(repo) || !visible(state.account, repo)) return <span>{displayName(repo)}</span>
  return <Link to={repoPath(kind, repo)}>{displayName(repo)}</Link>
}

function accountName(state, id) {
  const user = state.account?.id === id ? state.account : array(state.users).find((profile) => profile.id === id)
  return user?.displayName || user?.username || id || 'Unknown account'
}

export function Access() {
  const { state } = useWorkspace()
  const [query] = useSearchParams()
  const tab = tabs.some(([id]) => id === query.get('tab')) ? query.get('tab') : 'received'
  const pending = receivedRequests(state).filter((request) => request.status === 'pending').length

  return <>
    <div className="page-heading"><div><h1>Access</h1><p>Review repository requests and manage your account tokens.</p></div></div>
    <nav className="tabs" aria-label="Access sections">
      {tabs.map(([key, title]) => <Link key={key} to={'/access?tab=' + key} aria-current={tab === key ? 'page' : undefined}>{title}{key === 'received' && <span className="tab-count" aria-label={pending + ' pending'}>{pending}</span>}</Link>)}
    </nav>
    {tab === 'tokens' ? <Tokens /> : <Requests key={tab + ':' + (query.get('repo') || '') + ':' + (query.get('status') || '')} tab={tab} defaultRepo={query.get('repo') || ''} defaultStatus={query.get('status') || ''} />}
  </>
}

function Requests({ tab, defaultRepo, defaultStatus }) {
  const { state, dispatch } = useWorkspace()
  const [status, setStatus] = useState(defaultStatus)
  const [resource, setResource] = useState(defaultRepo)
  const [rejecting, setRejecting] = useState(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const received = tab === 'received'
  const requests = received ? receivedRequests(state) : array(state.accessRequests).filter((request) => request.requesterId === state.account?.id)
  const keyFor = (request) => request.repoType + ':' + request.repoId
  const resources = new Map(requests.map((request) => [keyFor(request), displayName(findRepo(state, request.repoType, request.repoId))]))
  if (defaultRepo && !resources.has(defaultRepo)) {
    const separator = defaultRepo.indexOf(':')
    const repo = findRepo(state, defaultRepo.slice(0, separator), defaultRepo.slice(separator + 1))
    resources.set(defaultRepo, repo ? displayName(repo) : 'Selected repository')
  }
  const records = requests.filter((request) => (!status || request.status === status) && (!resource || [request.repoType, keyFor(request)].includes(resource)))
    .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))

  function review(request, status, rejectionReason) {
    const message = { accepted: 'Access approved.', rejected: 'Access rejected.', pending: 'Request moved to pending.' }[status]
    const result = dispatch('access.reviewed', { requestId: request.id, status, rejectionReason }, message)
    setError(result.error || '')
    if (result.state) setRejecting(null)
  }

  return <>
    <section className="panel toolbar request-toolbar" aria-label="Request filters">
      <SelectField title="Status" value={status} onChange={setStatus} options={['pending', 'accepted', 'rejected']} first="Any status" />
      <Field title="Resource"><select value={resource} onChange={(event) => setResource(event.target.value)}>
        <option value="">All repositories</option><option value="model">All models</option><option value="dataset">All datasets</option>
        {[...resources].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select></Field>
      <button className="button secondary" onClick={() => { setResource(''); setStatus('') }}>Reset</button>
    </section>
    {!rejecting && error && <p className="error" role="alert">{error}</p>}
    {records.length ? <div className="panel">
      {records.map((request, index) => <article className="request-row" key={request.id || index}>
        <span className="icon-tile review"><Icon name="access" /></span>
        <div className="request-main">
          {received && <h3>{accountName(state, request.requesterId)}</h3>}
          <RepositoryReference state={state} type={request.repoType} id={request.repoId} />
          {request.purpose && <p>{request.purpose}</p>}
          {request.rejectionReason && <p className="quiet">Reason: {request.rejectionReason}</p>}
          <small className="quiet">Requested {date(request.createdAt)}</small>
        </div>
        <Badge value={request.status} />
        {received && <div className="actions">
          {['pending', 'rejected'].includes(request.status) && <button className="button primary" onClick={() => review(request, 'accepted')}>Approve</button>}
          {request.status === 'accepted' && <button className="button secondary" onClick={() => review(request, 'pending')}>Move to pending</button>}
          {['pending', 'accepted'].includes(request.status) && <button className="button secondary danger-text" onClick={() => { setError(''); setReason(''); setRejecting(request) }}>Reject</button>}
        </div>}
      </article>)}
    </div> : <section className="panel empty"><h2>No {received ? 'received' : 'sent'} requests</h2><p>Requests matching your filters will appear here.</p></section>}
    {rejecting && <Dialog title="Reject access request" onClose={() => setRejecting(null)}>
      <p>Reject the request from {accountName(state, rejecting.requesterId)}?</p>
      <form className="form" onSubmit={(event) => { event.preventDefault(); review(rejecting, 'rejected', reason) }}>
        <Field title="Rejection reason (optional)"><textarea autoFocus rows={3} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} /></Field>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="actions"><button className="button danger">Reject request</button><button type="button" className="button secondary" onClick={() => setRejecting(null)}>Cancel</button></div>
      </form>
    </Dialog>}
  </>
}

function Tokens() {
  const { state, dispatch } = useWorkspace()
  const [dialog, setDialog] = useState(null)
  const [secret, setSecret] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const [error, setError] = useState('')
  const tokens = array(state.accessTokens).filter((token) => token.ownerId === state.account?.id)

  function close() {
    setDialog(null)
    setSecret('')
    setCopyStatus('')
    setError('')
  }

  return <>
    <div className="section-bar"><h2>Account tokens</h2><button className="button primary" onClick={() => setDialog({ type: 'create' })}><Icon name="plus" />New token</button></div>
    {tokens.length ? <div className="panel table-wrap"><table className="tokens" role="table"><thead role="rowgroup"><tr role="row"><th scope="col">Name</th><th scope="col">Role</th><th scope="col">Token suffix</th><th scope="col">Status</th><th scope="col">Created</th><th scope="col">Actions</th></tr></thead><tbody role="rowgroup">
      {tokens.map((token, index) => <tr key={token.id || index} role="row">
        <th scope="row" role="rowheader">{token.name || 'Unnamed token'}{array(token.permissions).length > 0 && <small className="quiet">{array(token.permissions).map((key) => permissions[key] || key).join(', ')}</small>}</th>
        <td role="cell" data-label="Role">{label(token.role)}</td>
        <td role="cell" data-label="Token suffix"><span className="mono">•••• {token.suffix || '—'}</span></td>
        <td role="cell" data-label="Status"><Badge value={token.status} /></td>
        <td role="cell" data-label="Created">{date(token.createdAt)}</td>
        <td role="cell">{token.status === 'active' && <button className="button secondary danger-text" aria-label={'Revoke ' + (token.name || 'token')} onClick={() => setDialog({ type: 'revoke', token })}>Revoke</button>}</td>
      </tr>)}
    </tbody></table></div> : <section className="panel empty"><h2>No access tokens</h2><p>Create a token to add it to this account.</p></section>}
    {dialog?.type === 'create' && <Dialog title="Create access token" onClose={close}><TokenForm onCancel={close} onSubmit={(values) => {
      const result = dispatch('token.created', values, 'Access token created.')
      if (result.value) {
        setSecret(result.value)
        setDialog({ type: 'reveal' })
      }
      return result.error
    }} /></Dialog>}
    {dialog?.type === 'reveal' && <Dialog title="Copy your token" onClose={close}>
      <p>This value is shown once. Copy it before closing this dialog.</p>
      <Field title="Token value"><input readOnly className="mono" value={secret} onFocus={(event) => event.target.select()} /></Field>
      <div className="actions dialog-actions"><button className="button primary" onClick={async () => {
        try {
          await navigator.clipboard.writeText(secret)
          setCopyStatus('Token copied.')
        } catch {
          setCopyStatus('Select the token value and copy it manually.')
        }
      }}>Copy token</button><button className="button secondary" onClick={close}>Done</button></div>
      <span className="quiet" role="status">{copyStatus}</span>
    </Dialog>}
    {dialog?.type === 'revoke' && <Dialog title="Revoke access token" onClose={close}>
      <p>Revoke <strong>{dialog.token.name}</strong>? The token metadata stays in your account history.</p>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions dialog-actions"><button className="button danger" onClick={() => {
        const result = dispatch('token.revoked', { tokenId: dialog.token.id }, 'Access token revoked.')
        if (result.state) close()
        else setError(result.error)
      }}>Revoke token</button><button className="button secondary" autoFocus onClick={close}>Cancel</button></div>
    </Dialog>}
  </>
}

function TokenForm({ onCancel, onSubmit }) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('read')
  const [selected, setSelected] = useState([])
  const [error, setError] = useState('')
  return <form className="form" onSubmit={(event) => {
    event.preventDefault()
    setError(onSubmit({ name, role, permissions: selected }) || '')
  }}>
    <Field title="Token name"><input autoFocus required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></Field>
    <SelectField title="Role" value={role} onChange={setRole} options={roles} />
    {role === 'fine-grained' && <fieldset><legend>Permissions</legend>{Object.entries(permissions).map(([key, title]) =>
      <label key={key} className="checkbox"><input type="checkbox" checked={selected.includes(key)} onChange={(event) => setSelected((previous) => event.target.checked ? [...previous, key] : previous.filter((item) => item !== key))} />{title}</label>,
    )}</fieldset>}
    {error && <p className="error" role="alert">{error}</p>}
    <div className="actions"><button className="button primary">Create token</button><button type="button" className="button secondary" onClick={onCancel}>Cancel</button></div>
  </form>
}

const actionLabels = {
  'repository.created': 'Created repository', 'repository.updated': 'Updated settings', 'model.like_changed': 'Changed model like',
  'dataset.file_saved': 'Saved dataset file', 'space.paused': 'Paused Space', 'space.restarted': 'Restarted Space',
  'repository.gating_changed': 'Changed access gating', 'access.requested': 'Requested access', 'access.reviewed': 'Reviewed access',
  'token.created': 'Created token', 'token.revoked': 'Revoked token',
}

export function Activity() {
  const { state } = useWorkspace()
  const [actor, setActor] = useState('')
  const [type, setType] = useState('')
  const history = array(state.activity).filter((event) => {
    const repo = findRepo(state, event.repoType, event.repoId)
    return !repo || visible(state.account, repo)
  })
  const actors = [...new Set(history.map((event) => event.actorId).filter(Boolean))]
  const records = history.filter((event) => (!actor || event.actorId === actor) && (!type || (event.repoType ?? 'account') === type)).slice().reverse()
  return <>
    <div className="page-heading"><div><h1>Activity</h1><p>Review recent changes to repositories and account access.</p></div></div>
    <section className="panel toolbar request-toolbar" aria-label="Activity filters">
      <Field title="Actor"><select value={actor} onChange={(event) => setActor(event.target.value)}><option value="">All actors</option>{actors.map((id) => <option key={id} value={id}>{accountName(state, id)}</option>)}</select></Field>
      <SelectField title="Resource type" value={type} onChange={setType} first="All resources" options={['model', 'dataset', 'space', 'account']} />
    </section>
    {records.length ? <section className="panel"><ul className="compact-list activity-list">{records.map((event, index) => <li key={event.id || index}><span className="icon-tile review"><Icon name="activity" /></span><div><strong>{actionLabels[event.action] || label(event.action)}</strong><small>{accountName(state, event.actorId)}{event.repoId && <> · <RepositoryReference state={state} id={event.repoId} type={event.repoType} /></>}</small></div><time className="quiet">{date(event.createdAt)}</time></li>)}</ul></section> : <section className="panel empty"><h2>No matching activity</h2></section>}
  </>
}
