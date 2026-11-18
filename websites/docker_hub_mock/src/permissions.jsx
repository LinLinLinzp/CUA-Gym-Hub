import { useState } from 'react'
import { actions } from './actions.js'
import { alphabetical, current, permissionNames, teamPath } from './model.js'
import { useStore } from './store.jsx'
import { Dialog, Empty, ErrorText, LocalLink, Select, Table } from './ui.jsx'

const levels = Object.entries(permissionNames)

export function Permissions({ repository, namespace }) {
  const { state, commit, announce } = useStore()
  const [teamId, setTeamId] = useState('')
  const [permission, setPermission] = useState('read_only')
  const [error, setError] = useState('')
  const [revoking, setRevoking] = useState(null)
  if (namespace.type !== 'organization') {
    return <Empty title="Team access is unavailable" icon="team">
      <p>Team permissions are available for repositories in organization namespaces.</p>
    </Empty>
  }
  const teams = current(state, 'teams').filter(team => team.namespaceId === namespace.id).sort(alphabetical)
  const names = new Map(teams.map(team => [team.id, team]))
  const grants = current(state, 'repositoryPermissions').filter(grant => grant.repositoryId === repository.id)
  const granted = new Set(grants.map(grant => grant.teamId))
  const available = teams.filter(team => !granted.has(team.id))
  function grant(event) {
    event.preventDefault()
    try {
      commit('repository.permission_granted', actions.grantPermission(repository.id, teamId, permission))
      setTeamId('')
      setPermission('read_only')
      setError('')
      announce('Repository access granted.')
    } catch (failure) {
      setError(failure.message)
    }
  }

  return <>
    <section className="panel">
      <h2>Grant team access</h2>
      <form className="filters grant-form" onSubmit={grant}>
        <Select label="Team" value={teamId} onChange={setTeamId}
          options={[[ '', available.length ? 'Select a team' : 'No teams available' ], ...available.map(team => [team.id, team.name])]} />
        <Select label="Permission" value={permission} onChange={setPermission} options={levels} />
        <button className="primary" type="submit" disabled={!teamId}>Grant access</button>
      </form>
      <ErrorText error={error} />
    </section>
    <section className="stack">
      <div className="section-head"><h2>Team access</h2><span className="muted">{grants.length} {grants.length === 1 ? 'grant' : 'grants'}</span></div>
      {grants.length ? <Table headers={['Team', 'Permission', 'Actions']}>
        {grants.map(row => <PermissionRow key={row.id} row={row} team={names.get(row.teamId)} onRevoke={() => setRevoking(row)} />)}
      </Table> : <Empty title="No team access granted" icon="team"><p>Use the team picker to grant access.</p></Empty>}
    </section>
    {revoking && <Dialog title="Revoke team access?" confirm="Revoke access" onCancel={() => setRevoking(null)}
      onConfirm={() => {
        commit('repository.permission_revoked', actions.revokePermission(revoking.id))
        setRevoking(null)
        announce('Repository access revoked.')
      }}>
      <p>Remove access for <strong>{names.get(revoking.teamId)?.name ?? 'this team'}</strong> on <strong>{repository.name}</strong>.</p>
    </Dialog>}
  </>
}

function PermissionRow({ row, team, onRevoke }) {
  const { commit, announce } = useStore()
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')
  function save(event) {
    event.preventDefault()
    try {
      const changed = commit('repository.permission_updated', actions.updatePermission(row.id, draft))
      setDraft(null)
      setError('')
      if (changed) announce('Repository access updated.')
    } catch (failure) {
      setError(failure.message)
    }
  }
  return <tr>
    <td>{team ? <LocalLink className="mono object" to={teamPath(team)}>{team.name}</LocalLink> : 'Unavailable team'}</td>
    <td>{permissionNames[row.permission] ? <span className="chip permission">{permissionNames[row.permission]}</span> : '—'}</td>
    <td>{draft === null ? <div className="inline-actions">
      <button type="button" disabled={!team} onClick={() => setDraft(row.permission ?? 'read_only')}>Edit permission</button>
      <button type="button" onClick={onRevoke}>Revoke access</button>
    </div> : <form className="row-edit" onSubmit={save}>
      <Select label={`Permission for ${team?.name ?? 'team'}`} value={draft} onChange={setDraft} options={levels} />
      <div className="inline-actions"><button type="button" onClick={() => { setError(''); setDraft(null) }}>Cancel</button>
        <button type="submit" className="primary">Save</button></div>
      <ErrorText error={error} />
    </form>}</td>
  </tr>
}

