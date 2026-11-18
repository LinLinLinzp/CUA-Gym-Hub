import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Badge, DateLabel, DialogActions, FormError, Icon, Modal, Panel, WorkspaceLink, useWorkspaceNavigate } from '../components/ui.jsx'
import { appPath } from '../data/catalog.js'
import { appAddOns, appFormations, isRunning, useStore } from '../data/store.jsx'

export function Overview() {
  const app = useOutletContext()
  const { state } = useStore()
  const formations = appFormations(state, app.id)
  const dynos = formations.filter(isRunning).reduce((sum, row) => sum + row.quantity, 0)
  const addOns = appAddOns(state, app.id)
  const release = state.releases.find((row) => row.appId === app.id && row.id === app.activeReleaseId)
  return <div className="sections">
    <div className="summary-grid">
      <Panel title="Dynos" action={<WorkspaceLink to={appPath(app.id, '/resources')}>View resources</WorkspaceLink>}>
        <div className="summary"><span className="summary-value">{dynos}</span>
          <span>Running dynos across {formations.length} {formations.length === 1 ? 'process' : 'processes'}</span></div>
      </Panel>
      <Panel title="Add-ons" action={<WorkspaceLink to={appPath(app.id, '/resources') + '#add-ons'}>View add-ons</WorkspaceLink>}>
        <div className="summary"><span className="summary-value">{addOns.length}</span><span>Installed services</span></div>
      </Panel>
    </div>
    <Panel title="Active release" action={<WorkspaceLink to={appPath(app.id, '/releases')}>View release history</WorkspaceLink>}>
      {release ? <div className="release-summary">
        <code className="version">v{release.version ?? '—'}</code>
        <div><strong>{release.description ?? 'Release'}</strong><p>{release.revision && <><code>{release.revision}</code> · </>}<DateLabel value={release.createdAt} /></p></div>
        <Badge status={release.status} />
      </div> : <p className="panel-body muted">No active release is available.</p>}
    </Panel>
  </div>
}

export function Settings() {
  const app = useOutletContext()
  const { commit } = useStore()
  const [name, setName] = useState(app.name ?? '')
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  function rename(event) {
    event.preventDefault()
    const result = commit({ type: 'rename', appId: app.id, name }, 'Renamed app to ' + name + '.')
    setError(result.error ?? '')
  }
  return <div className="sections settings">
    <Panel title="App name" caption="Change the name displayed in this workspace.">
      <form className="panel-body settings-form" onSubmit={rename} noValidate>
        <label className="field">App name
          <input autoComplete="off" spellCheck={false} value={name} aria-invalid={Boolean(error)}
            aria-describedby={error ? 'rename-error' : undefined} onChange={(event) => { setName(event.target.value); setError('') }} />
        </label>
        <FormError id="rename-error" error={error} />
        <button className="button primary" type="submit" disabled={name === app.name}>Save name</button>
      </form>
    </Panel>
    <section className="panel deletion">
      <div><h2>Delete app</h2><p>Remove this app, its dyno formations, and its installed add-ons.</p></div>
      <button className="button danger-outline" onClick={() => setDeleting(true)}>Delete app</button>
    </section>
    {deleting && <DeleteApp app={app} onClose={() => setDeleting(false)} />}
  </div>
}

export function TypedConfirmation({ title, description, name, fieldName, submit, onClose, onConfirm }) {
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  function confirm(event) {
    event.preventDefault()
    const result = onConfirm(confirmation)
    if (result?.error) setError(result.error)
  }
  return <Modal title={title} description={description} onClose={onClose}>
    <form onSubmit={confirm}>
      <p>Enter <strong className="break-text">{name}</strong> to confirm.</p>
      <label className="field">{fieldName}
        <input autoFocus autoComplete="off" spellCheck={false} value={confirmation}
          onChange={(event) => { setConfirmation(event.target.value); setError('') }} />
      </label>
      <FormError error={error} />
      <DialogActions onClose={onClose} submit={submit} danger disabled={confirmation !== name} />
    </form>
  </Modal>
}

function DeleteApp({ app, onClose }) {
  const { commit } = useStore()
  const navigate = useWorkspaceNavigate()
  const name = app.name ?? app.id
  function remove(confirmation) {
    const result = commit({ type: 'delete', appId: app.id, confirmation }, 'Deleted ' + name + '.')
    if (!result.error) {
      onClose()
      navigate('/apps')
    }
    return result
  }
  return <TypedConfirmation title="Delete app" description={'Delete ' + name + ' and remove its active resources.'}
    name={name} fieldName="Current app name" submit="Delete app" onClose={onClose} onConfirm={remove} />
}
