import { useState } from 'react'
import { Play } from 'lucide-react'
import { useStore } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { ancestry, commitIndex } from '../domain/git.js'
import { definitionAvailable, runPipeline } from '../domain/pipelines.js'
import { buildPath, byId, human, list, numberAfter, openBranches, repoRecords, shortHash } from '../utils/model.js'
import { Button, ErrorText, Field, FormActions, Modal, useGo } from '../components/ui.jsx'

function runTargets(state, repo, commitTarget) {
  const commits = commitIndex(state, repo)
  return openBranches(state, repo).filter(branch => commits.has(branch.headCommitId) &&
    (!commitTarget || ancestry(commits, branch.headCommitId).has(commitTarget.id)))
}

function RunForm({ workspace, repo, preferredBranch, commitTarget, onClose }) {
  const { state, user, transact } = useStore()
  const go = useGo()
  const toast = useToast()
  const targets = runTargets(state, repo, commitTarget)
  const preferred = byId(targets, preferredBranch?.id) || byId(targets, repo.defaultBranchId) || targets[0]
  const [target, setTarget] = useState(preferred)
  const [nextBuildNumber] = useState(() => numberAfter(repoRecords(state.pipelineRuns, repo), 'buildNumber'))
  const [definitionId, setDefinition] = useState('')
  const [variables, setVariables] = useState({})
  const [error, setError] = useState('')
  const branch = byId(targets, target?.id)
  const commitId = commitTarget?.id || target?.headCommitId
  const definitions = repoRecords(state.pipelineDefinitions, repo).filter(definition => definitionAvailable(definition, branch) && list(definition.steps).length)
  const definition = byId(definitions, definitionId) || definitions[0]
  const inputs = list(definition?.variables).filter(variable => variable.name && !variable.secret && !variable.secured)
  const changedTarget = !commitTarget && target?.headCommitId !== branch?.headCommitId
  const issue = !user ? 'A signed-in workspace member is required to run a pipeline.' :
    !repo.pipelinesEnabled ? 'Pipelines are disabled for this repository.' :
      !branch ? 'No active branch contains a valid target commit.' :
        changedTarget ? 'The branch changed. Select it again to use the latest commit.' : !definition ? 'No pipeline definition can run on this branch.' : ''
  function submit(event) {
    event.preventDefault()
    const result = transact(runPipeline, { repositoryId: repo.id, branchId: branch?.id, commitId, commitTarget: Boolean(commitTarget),
      definitionId: definition?.id, nextBuildNumber, variables })
    if (result.error) return setError(result.error)
    toast(`Pipeline #${result.result.buildNumber} started`)
    onClose()
    go(buildPath(workspace, repo, result.result))
  }

  return <Modal title="Run pipeline" onClose={onClose}>
    <form onSubmit={submit} className="form-layout">
      <Field label="Branch"><select required value={branch?.id || ''} onChange={event => { setTarget(byId(targets, event.target.value)); setDefinition(''); setVariables({}); setError('') }}>
        <option value="" disabled>Choose a branch</option>{targets.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></Field>
      {commitId && <div className="muted">Commit <code>{shortHash(commitTarget || byId(repoRecords(state.commits, repo), commitId))}</code></div>}
      <Field label="Pipeline"><select required value={definition?.id || ''} onChange={event => { setDefinition(event.target.value); setVariables({}); setError('') }}>
        <option value="" disabled>Choose a pipeline</option>{definitions.map(item => <option key={item.id} value={item.id}>{human(item.type)} · {item.name || 'Pipeline'}</option>)}
      </select></Field>
      {inputs.map(variable => {
        const value = variables[variable.name] ?? variable.defaultValue ?? ''
        const update = event => setVariables(current => ({ ...current, [variable.name]: event.target.value }))
        return <Field key={variable.name} label={variable.name} hint={variable.required ? 'Required' : 'Optional'}>
          {list(variable.allowedValues).length ? <select required={variable.required} value={value} onChange={update}><option value="">Choose a value</option>{variable.allowedValues.map(item => <option value={item} key={item}>{item}</option>)}</select> :
            <input value={value} onChange={update} required={variable.required} />}
        </Field>
      })}
      <ErrorText>{error || issue}</ErrorText>
      <FormActions label="Run" onClose={onClose} disabled={Boolean(issue)} />
    </form>
  </Modal>
}

export function RunPipelineButton({ workspace, repo, branch, commit, variant = 'secondary' }) {
  const { state, user } = useStore()
  const [show, setShow] = useState(false)
  const definitions = repoRecords(state.pipelineDefinitions, repo)
  const targets = runTargets(state, repo, commit)
  const unavailable = !user ? 'A signed-in workspace member is required.' :
    !repo.pipelinesEnabled ? 'Enable Pipelines in Repository settings to run a build.' :
      !definitions.length ? 'Configure a pipeline first.' : !targets.length || branch && !byId(targets, branch.id) ?
        'No active branch contains a valid target commit.' : ''
  return <>
    <Button variant={variant} disabled={Boolean(unavailable)} title={unavailable || undefined} onClick={() => setShow(true)}><Play size={16} />Run pipeline</Button>
    {show && <RunForm workspace={workspace} repo={repo} preferredBranch={branch} commitTarget={commit} onClose={() => setShow(false)} />}
  </>
}
