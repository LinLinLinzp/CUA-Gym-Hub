import { useState } from 'react'
import { GitMerge } from 'lucide-react'
import { useStore } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { closeBranchReason, declinePullRequest, mergeAvailability, mergePullRequest } from '../domain/pullRequests.js'
import { shortHash } from '../utils/model.js'
import { Button, ErrorText, Field, FormActions, Modal } from '../components/ui.jsx'
import { BranchPair, Checks } from './PullRequests.jsx'

function TransitionForm({ mode, repo, pr, detail, checks, onClose }) {
  const { state, user, transact } = useStore()
  const toast = useToast()
  const merge = mode === 'merge'
  const closeReason = closeBranchReason(state, repo, pr, detail.source)
  const [strategy, setStrategy] = useState('merge_commit')
  const [closeSource, setClose] = useState(Boolean(pr.closeSourceOnMerge && !closeReason))
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [heads] = useState({ sourceCommitId: detail.sourceId, destinationCommitId: detail.destinationId })
  const stale = detail.sourceId !== heads.sourceCommitId || detail.destinationId !== heads.destinationCommitId
  const unavailable = merge ? mergeAvailability(repo, detail, checks) : ''
  function submit(event) {
    event.preventDefault()
    const response = transact(merge ? mergePullRequest : declinePullRequest, {
      ...heads, repositoryId: repo.id, pullRequestId: pr.id, strategy, closeSource, reason,
    })
    if (response.error) return setError(response.error)
    toast(merge ? 'Pull request merged' : 'Pull request declined')
    onClose()
  }
  return <Modal title={merge ? 'Merge pull request' : 'Decline pull request'} onClose={onClose}>
    <form className="form-layout" onSubmit={submit}>
      <div><strong>#{pr.number} {pr.title}</strong></div>
      {merge ? <>
        <BranchPair source={detail.source?.name} destination={detail.destination?.name} />
        <p className="muted"><code>{shortHash(detail.commitIndex.get(detail.sourceId)) || '—'}</code> into <code>{shortHash(detail.commitIndex.get(detail.destinationId)) || 'empty branch'}</code> · {detail.commits.length} source commits · {detail.changes.length} changed files</p>
        <Checks checks={checks} />
        {!!detail.conflicts.length && <p className="error">Conflicting files: {detail.conflicts.join(', ')}</p>}
        <Field label="Merge strategy"><select value={strategy} onChange={event => setStrategy(event.target.value)}><option value="merge_commit">Merge commit</option><option value="squash">Squash</option></select></Field>
        <label className="checkbox"><input type="checkbox" checked={closeSource && !closeReason} disabled={Boolean(closeReason)} onChange={event => setClose(event.target.checked)} />Close source branch</label>
        {closeReason && <p className="muted">{closeReason}</p>}
      </> : <>
        <p className="muted">Declining closes this pull request. You can create another pull request from the same branches.</p>
        <Field label="Reason (optional)"><textarea value={reason} onChange={event => setReason(event.target.value)} /></Field>
      </>}
      <ErrorText>{error || (stale ? 'A branch changed. Reopen this dialog to review the latest comparison.' : unavailable)}</ErrorText>
      <FormActions label={merge ? 'Merge' : 'Decline pull request'} danger={!merge} onClose={onClose} disabled={!user || stale || Boolean(unavailable)} />
    </form>
  </Modal>
}

export function PullRequestTransitions({ repo, pr, detail, checks }) {
  const [mode, setMode] = useState('')
  return <>
    <Button onClick={() => setMode('decline')}>Decline</Button>
    <Button variant="primary" onClick={() => setMode('merge')}><GitMerge size={16} />Merge</Button>
    {mode && <TransitionForm mode={mode} repo={repo} pr={pr} detail={detail} checks={checks} onClose={() => setMode('')} />}
  </>
}
