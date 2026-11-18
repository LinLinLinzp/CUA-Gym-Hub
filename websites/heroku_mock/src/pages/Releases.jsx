import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Badge, DateLabel, DialogActions, Empty, FormError, Modal, Panel, Table, titleCase } from '../components/ui.jsx'
import { canRollBack, recordsFor, useStore } from '../data/store.jsx'

const versionLabel = (release) => release.version == null ? 'Release' : 'v' + release.version
const actorLabel = (account, actorId) => actorId == null ? '—' : actorId === account.id ? account.name ?? actorId : actorId

export function Releases() {
  const app = useOutletContext()
  const { state } = useStore()
  const [view, setView] = useState(null)
  const releases = recordsFor(state.releases, app.id).sort((first, second) => (second.version ?? 0) - (first.version ?? 0))
  const selected = releases.find((row) => row.id === view?.releaseId)
  const close = () => setView(null)

  return <Panel title="Release history" caption="Review deployments and changes to this application."
    action={<button className="button primary" onClick={() => setView({ kind: 'deploy' })}>Deploy revision</button>}>
    {releases.length ? <Table label="Releases" columns={['Version', 'Description', 'Actor', 'Status', 'Revision', 'Date']}>
      {releases.map((release) => <tr key={release.id}>
        <th scope="row"><div className="release-marker">
          <button className="version version-button" aria-label={'View release ' + versionLabel(release)}
            onClick={() => setView({ kind: 'details', releaseId: release.id })}>{versionLabel(release)}</button>
          {release.id === app.activeReleaseId && <Badge status="active" />}
        </div></th>
        <td>{release.description || '—'}</td>
        <td>{actorLabel(state.account, release.actorId)}</td>
        <td><Badge status={release.status} /></td>
        <td><code>{release.revision ?? '—'}</code></td>
        <td><DateLabel value={release.createdAt} /></td>
      </tr>)}
    </Table> : <Empty title="No releases yet">Deploy a revision to start this app’s release history.</Empty>}
    {view?.kind === 'deploy' && <Deploy app={app} onClose={close} />}
    {view?.kind === 'details' && selected && <ReleaseDetails app={app} release={selected} account={state.account}
      eligible={canRollBack(app, selected, releases)} onClose={close} />}
  </Panel>
}

function Deploy({ app, onClose }) {
  const { commit } = useStore()
  const [revision, setRevision] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  function submit(event) {
    event.preventDefault()
    const result = commit({ type: 'deploy', appId: app.id, revision, description }, 'Deployed revision ' + revision.trim() + '.')
    if (result.error) setError(result.error)
    else onClose()
  }
  return <Modal title="Deploy revision" description={'Create a release for ' + (app.name ?? app.id) + '.'} onClose={onClose}>
    <form onSubmit={submit}>
      <label className="field">Revision
        <input autoComplete="off" spellCheck={false} placeholder="e.g. 2a4bf17" value={revision}
          aria-invalid={Boolean(error)} aria-describedby={error ? 'revision-error' : undefined}
          onChange={(event) => { setRevision(event.target.value); setError('') }} />
      </label>
      <FormError id="revision-error" error={error} />
      <label className="field">Description (optional)
        <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <DialogActions onClose={onClose} submit="Deploy revision" />
    </form>
  </Modal>
}

function ReleaseDetails({ app, release, account, eligible, onClose }) {
  const { commit } = useStore()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const version = versionLabel(release)
  function submit(event) {
    event.preventDefault()
    const result = commit({ type: 'rollback', appId: app.id, releaseId: release.id }, 'Rolled back to ' + version + '.')
    if (result.error) setError(result.error)
    else onClose()
  }
  return <Modal title={confirming ? 'Confirm rollback' : 'Release ' + version} onClose={onClose}
    description={confirming ? 'Create a new release for ' + (app.name ?? app.id) + ' using ' + version + '.'
      : release.description ?? 'Release details'}>
    <dl className="release-details">
      <div><dt>Status</dt><dd><Badge status={release.status} />{release.id === app.activeReleaseId && <Badge status="active" />}</dd></div>
      <div><dt>Type</dt><dd>{titleCase(release.type)}</dd></div>
      <div><dt>Revision</dt><dd><code>{release.revision ?? '—'}</code></dd></div>
      <div><dt>Actor</dt><dd>{actorLabel(account, release.actorId)}</dd></div>
      <div><dt>Created</dt><dd><DateLabel value={release.createdAt} /></dd></div>
    </dl>
    {confirming ? <form onSubmit={submit}>
      <FormError error={error} />
      <DialogActions onClose={onClose} submit="Confirm rollback" />
    </form> : <div className="dialog-actions">
      <button className="button" onClick={onClose}>Close</button>
      <button className="button primary" disabled={!eligible} onClick={() => setConfirming(true)}>Rollback to this release</button>
    </div>}
  </Modal>
}
