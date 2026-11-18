import { useId, useMemo, useState } from 'react'
import { Badge, Confirm, Empty, Field, Modal, Pagination, Search, ViewHeader, WorkspaceLink, usePagination } from '../components'
import { formatDate, newId, newestFirst, searchText, useWorkspace } from '../workspace'
import { inspectRules, operations, simulateRules } from './rulesLanguage'

function Playground({ policy, source }) {
  const [operation, setOperation] = useState('get')
  const [path, setPath] = useState('')
  const [auth, setAuth] = useState('signed-out')
  const [result, setResult] = useState(null)
  const current = result?.source === source ? result : null
  return <section className="panel" aria-labelledby="playground-title">
    <header className="panel-heading"><h2 id="playground-title">Rules Playground</h2></header>
    <p className="muted">Simulate a request against the draft using document matches and simple authentication checks.</p>
    <form className="playground" onSubmit={(event) => {
      event.preventDefault()
      setResult({ source, ...simulateRules(policy, operation, path, auth === 'signed-in') })
    }}>
      <div className="playground-fields">
        <Field label="Operation">{(props) => <select {...props} value={operation} onChange={(event) => { setOperation(event.target.value); setResult(null) }}>
          {operations.map((entry) => <option key={entry}>{entry}</option>)}
        </select>}</Field>
        <Field label="Document path" error={current?.pathError}>{(props) => <input {...props} value={path} placeholder="trailReports/report_001"
          onChange={(event) => { setPath(event.target.value); setResult(null) }} />}</Field>
        <Field label="Authentication">{(props) => <select {...props} value={auth} onChange={(event) => { setAuth(event.target.value); setResult(null) }}>
          <option value="signed-out">Unauthenticated</option><option value="signed-in">Authenticated</option>
        </select>}</Field>
      </div>
      <div className="playground-result">
        <button type="submit" className="primary">Run simulation</button>
        <span role="status">{current?.message && <Badge tone={current.tone}>{current.message}</Badge>}</span>
      </div>
    </form>
  </section>
}

export default function Rules() {
  const { state, commit } = useWorkspace()
  const { id: projectId, databaseId = '(default)' } = state.project
  const versions = state.ruleVersions.filter((version) => version.projectId === projectId && version.databaseId === databaseId).sort(newestFirst)
  const active = versions.find((version) => version.id === state.firestoreRules.activeVersionId)
  const [draft, setDraft] = useState(null)
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState(null)
  const editorId = useId()
  const activeSource = active?.source ?? ''
  const source = draft ?? activeSource
  const policy = useMemo(() => inspectRules(source), [source])
  const dirty = source !== activeSource
  const matching = versions.filter((version) => [version.id, version.source, version.createdAt, version.createdBy].some((value) => searchText(value).includes(searchText(query).trim())))
  const pager = usePagination(matching, 6)
  const close = () => setDialog(null)

  function publish(restoring) {
    const id = newId('rules')
    const versionSource = restoring ? restoring.source : source
    const restoreFields = restoring ? { restoredFromVersionId: restoring.id } : {}
    commit(restoring ? 'rules.restore' : 'rules.publish', restoring ? `Restored ${restoring.id} as a new version.` : 'Published Firestore rules.',
      (current, { createdAt, actorId }) => ({
        targetId: id,
        details: { databaseId, previousVersionId: current.firestoreRules.activeVersionId ?? null, ...restoreFields },
        patch: {
          ruleVersions: [...current.ruleVersions, { id, projectId, databaseId, source: versionSource, createdAt, createdBy: actorId, ...restoreFields }],
          firestoreRules: { ...current.firestoreRules, activeVersionId: id, updatedAt: createdAt, updatedBy: actorId },
        },
      }))
    setDraft(null)
    close()
  }

  return <>
    <ViewHeader title="Firestore Security Rules" description="Edit and test the rules that govern access to Cloud Firestore.">
      <WorkspaceLink to="/firestore" className="button">Firestore data</WorkspaceLink>
    </ViewHeader>
    <div className="rules-grid">
      <div className="panel-stack">
        <section className="panel" aria-labelledby="policy-heading">
          <header className="panel-heading">
            <h2 id="policy-heading">Rules editor</h2>
            <Badge tone={dirty ? 'warning' : active ? 'success' : 'neutral'}>{dirty ? 'Unpublished changes' : active ? 'Published' : 'No active version'}</Badge>
          </header>
          <p className="active-rule">{active ? <>Active version <code>{active.id}</code> · {formatDate(active.createdAt, true)}</> : 'No published rules are available for this database.'}</p>
          <form onSubmit={(event) => { event.preventDefault(); if (dirty && !policy.error) setDialog({ type: 'publish' }) }}>
            <div className="form-field">
              <label htmlFor={editorId}>Rules source</label>
              <textarea id={editorId} className="rules-source mono" spellCheck={false} value={source} rows={13}
                aria-describedby={`${editorId}-feedback`} aria-invalid={Boolean(source && policy.error)}
                onChange={(event) => setDraft(event.target.value)} />
              <p id={`${editorId}-feedback`} className={policy.error && source ? 'field-error' : 'muted'}>
                {policy.error || (policy.unsupported ? 'Structure checked. The draft uses syntax outside the Playground subset.' : 'Syntax check passed.')}
              </p>
            </div>
            <div className="editor-actions actions">
              <button type="submit" className="primary" disabled={!dirty || Boolean(policy.error)}>Publish</button>
              <button type="button" disabled={!dirty} onClick={() => setDraft(null)}>Discard draft</button>
            </div>
          </form>
          {active && dirty && <details className="published-source"><summary>View active source</summary><pre className="rules-code mono">{activeSource}</pre></details>}
        </section>
        <Playground source={source} policy={policy} />
      </div>
      <section className="panel" aria-labelledby="version-heading">
        <header className="panel-heading"><h2 id="version-heading">Version history</h2><small>{versions.length} versions</small></header>
        <Search label="Search versions" placeholder="Version ID or source" value={query} onChange={(value) => { setQuery(value); pager.setPage(1) }} />
        {matching.length ? <ul className="version-list">{pager.rows.map((version) => <li key={version.id}>
          <div className="version-title"><code>{version.id}</code>{version.id === active?.id && <Badge tone="success">Active</Badge>}</div>
          <small>{formatDate(version.createdAt, true)} · {version.createdBy === state.operator.id ? state.operator.displayName || version.createdBy : version.createdBy || '—'}</small>
          {version.restoredFromVersionId && <small className="restored-from">Restored from <code>{version.restoredFromVersionId}</code></small>}
          <div className="actions">
            <button onClick={() => setDialog({ type: 'view', version })}>View source</button>
            {version.id !== active?.id && <button onClick={() => setDialog({ type: 'restore', version })}>Restore</button>}
          </div>
        </li>)}</ul> : <Empty>{versions.length ? 'No versions match your search.' : 'No versions have been published.'}</Empty>}
        <Pagination pager={pager} label="versions" />
      </section>
    </div>
    {dialog?.type === 'view' && <Modal title={`Rules version ${dialog.version.id}`} onClose={close} wide>
      <pre className="rules-code mono">{dialog.version.source ?? 'No source available.'}</pre>
    </Modal>}
    {dialog?.type === 'publish' && <Confirm title="Publish rules" description="Publish the draft as the active version for this database?"
      label="Publish rules" onClose={close} onConfirm={() => publish(null)} />}
    {dialog?.type === 'restore' && <Confirm title="Restore rules version" description={`Publish the source from ${dialog.version.id} as a new active version?`}
      label="Restore version" onClose={close} onConfirm={() => publish(dialog.version)} />}
  </>
}
