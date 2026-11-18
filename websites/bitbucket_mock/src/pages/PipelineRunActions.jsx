import { useState } from 'react'
import { RotateCcw, Square } from 'lucide-react'
import { useStore } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { currentAttempt, isActiveRun, rerunPipeline, rerunUnavailable, retryPipelineSteps, retryUnavailable, stopPipeline } from '../domain/pipelines.js'
import { buildPath, list, numberAfter, repoRecords } from '../utils/model.js'
import { Button, ErrorText, FormActions, Modal, useGo, useQuery } from '../components/ui.jsx'

const modes = {
  stop: { action: stopPipeline, label: 'Stop pipeline', copy: 'Stop the active and pending steps in this build. Completed step logs remain available.', toast: 'Pipeline stopped' },
  retry: { action: retryPipelineSteps, label: 'Rerun failed steps', copy: 'Retry the failed steps in this build. Their original attempts stay available in the logs.', toast: 'Failed steps retried' },
  rerun: { action: rerunPipeline, label: 'Rerun entire pipeline', copy: 'Start a new build using the original commit, pipeline configuration and variables.', toast: 'Pipeline rerun started' },
}

function ConfirmRunAction({ workspace, repo, run, mode, unavailable, onClose }) {
  const { state, transact, user } = useStore()
  const toast = useToast()
  const go = useGo()
  const [, setQuery] = useQuery()
  const [error, setError] = useState('')
  const [version] = useState(() => ({
    retryNumber: numberAfter(run.retries, 'number'),
    nextBuildNumber: numberAfter(repoRecords(state.pipelineRuns, repo), 'buildNumber'),
  }))
  const item = modes[mode]

  function submit(event) {
    event.preventDefault()
    const result = transact(item.action, { ...version, repositoryId: repo.id, runId: run.id })
    if (result.error) return setError(result.error)
    onClose()
    toast(item.toast)
    if (mode === 'rerun') go(buildPath(workspace, repo, result.result))
    if (mode === 'retry') {
      const latest = list(result.result.retries).at(-1)
      const step = list(result.result.steps).find(row => latest.stepIds.includes(row.id))
      setQuery({ step: step?.id, attempt: currentAttempt(step)?.number })
    }
  }

  return <Modal title={item.label} onClose={onClose}>
    <form className="form-layout" onSubmit={submit}>
      <p><strong>Build #{run.buildNumber}</strong></p><p>{item.copy}</p>
      <ErrorText>{error || unavailable}</ErrorText><FormActions label={item.label} danger={mode === 'stop'} disabled={!user || Boolean(unavailable)} onClose={onClose} />
    </form>
  </Modal>
}

export function PipelineRunActions({ workspace, repo, run }) {
  const { user } = useStore()
  const [mode, setMode] = useState('')
  const retryIssue = retryUnavailable(repo, run)
  const rerunIssue = rerunUnavailable(repo, run)
  const stopIssue = isActiveRun(run) ? '' : 'This pipeline is no longer active.'
  const actorIssue = user ? '' : 'A signed-in workspace member is required.'
  return <>
    {!stopIssue && <Button title={actorIssue || undefined} disabled={Boolean(actorIssue)} onClick={() => setMode('stop')}><Square size={15} />Stop</Button>}
    {run.status === 'failed' && <>
      <Button title={actorIssue || retryIssue || undefined} disabled={Boolean(actorIssue || retryIssue)} onClick={() => setMode('retry')}><RotateCcw size={15} />Rerun failed steps</Button>
      <Button title={actorIssue || rerunIssue || undefined} disabled={Boolean(actorIssue || rerunIssue)} onClick={() => setMode('rerun')}>Rerun entire pipeline</Button>
    </>}
    {mode && <ConfirmRunAction workspace={workspace} repo={repo} run={run} mode={mode} unavailable={actorIssue || { stop: stopIssue, retry: retryIssue, rerun: rerunIssue }[mode]} onClose={() => setMode('')} />}
  </>
}
