import { useState } from 'react'
import { Workflow } from 'lucide-react'
import { useStore } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { STARTER_CONFIG } from '../data/pipelineFixtures.js'
import { configurePipelines, setPipelinesEnabled, setupUnavailable } from '../domain/pipelines.js'
import { byId, openBranches, repoPath, repoRecords } from '../utils/model.js'
import { Button, Empty, ErrorText, FormActions, Modal } from '../components/ui.jsx'

function ConfirmSetup({ repo, branch, onClose }) {
  const { transact } = useStore()
  const toast = useToast()
  const [error, setError] = useState('')
  const [target] = useState({ branchId: branch.id, expectedHead: branch.headCommitId ?? null })
  function submit(event) {
    event.preventDefault()
    const result = transact(configurePipelines, { repositoryId: repo.id, ...target })
    if (result.error) return setError(result.error)
    toast('Pipelines configured and enabled')
    onClose()
  }
  return <Modal title="Configure Build and test" onClose={onClose}>
    <form className="form-layout" onSubmit={submit}>
      <p>Commit <code>bitbucket-pipelines.yml</code> to <strong>{branch.name}</strong> and enable Pipelines.</p>
      <pre className="code-block">{STARTER_CONFIG}</pre>
      <ErrorText>{error}</ErrorText><FormActions label="Commit and enable" onClose={onClose} />
    </form>
  </Modal>
}

export function PipelineSetup({ repo }) {
  const { state, user } = useStore()
  const [confirm, setConfirm] = useState(null)
  const branch = byId(openBranches(state, repo), repo.defaultBranchId)
  const unavailable = setupUnavailable(state, repo)
  return <div className="panel pipeline-notice">
    <Empty title="Pipelines are not configured" icon={Workflow}>
      <p>{unavailable || 'Start with the Build and test template. It installs dependencies and runs your build and tests.'}</p>
      {!unavailable && <Button variant="primary" disabled={!user} title={!user ? 'A signed-in workspace member is required.' : undefined} onClick={() => setConfirm(branch)}>Configure Build and test</Button>}
    </Empty>
    {confirm && <ConfirmSetup repo={repo} branch={confirm} onClose={() => setConfirm(null)} />}
  </div>
}

export function PipelineSettings({ workspace, repo }) {
  const { state, user, transact } = useStore()
  const toast = useToast()
  const [error, setError] = useState('')
  const configured = repoRecords(state.pipelineDefinitions, repo).length > 0
  const enabled = Boolean(repo.pipelinesEnabled)
  function toggle() {
    const response = transact(setPipelinesEnabled, { repositoryId: repo.id, enabled: !enabled })
    if (response.error) return setError(response.error)
    setError('')
    toast(enabled ? 'Pipelines disabled' : 'Pipelines enabled')
  }
  return <section className="panel form-panel form-layout">
    <h2>Pipelines</h2>
    <p className="muted">{configured ? (enabled ? 'Pipelines are enabled for this repository.' : 'Pipelines are disabled. Existing run details remain available.') : 'This repository has no pipeline configuration.'}</p>
    <div>{configured ? <Button onClick={toggle} disabled={!user} title={!user ? 'A signed-in workspace member is required.' : undefined}>{enabled ? 'Disable Pipelines' : 'Enable Pipelines'}</Button> :
      <Button to={repoPath(workspace, repo, 'pipelines')}>Set up Pipelines</Button>}</div>
    <ErrorText>{error}</ErrorText>
  </section>
}
