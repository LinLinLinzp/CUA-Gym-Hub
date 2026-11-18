import { useState } from 'react'
import { GitPullRequest } from 'lucide-react'
import { useStore } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { commitIndex, compareHeads } from '../domain/git.js'
import { createPullRequest, editPullRequest, workspaceUsers } from '../domain/pullRequests.js'
import { activeRepos, byId, list, openBranches, repoPath, repoRecords, reviewPath, wsPath } from '../utils/model.js'
import { Button, Empty, ErrorText, Field, FormActions, Modal, PageHeading, Tabs, useGo, useQuery } from '../components/ui.jsx'
import { CommitsTable } from './Repositories.jsx'
import { FileDiff } from './PullRequests.jsx'

const previewTabs = [{ id: 'diff-preview', label: 'Files changed' }, { id: 'commit-preview', label: 'Commits' }]

function BranchField({ label, branches, value, onChange }) {
  return <Field label={label}><select value={byId(branches, value)?.id || ''} onChange={event => onChange(event.target.value)} required>
    <option value="" disabled>Choose a branch</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
  </select></Field>
}

function RequestFields({ fields, update, reviewers, suggested }) {
  const [filter, setFilter] = useState('')
  const visible = reviewers.filter(user => (user.name || user.username || '').toLowerCase().includes(filter.trim().toLowerCase()))
  return <>
    <Field label="Title"><input required value={fields.title ?? suggested ?? ''} onChange={event => update('title', event.target.value)} /></Field>
    <Field label="Description"><textarea value={fields.description} onChange={event => update('description', event.target.value)} /></Field>
    <fieldset className="reviewer-picker"><legend>Reviewers</legend>
      {reviewers.length ? <><input type="search" placeholder="Find a reviewer" aria-label="Find a reviewer" value={filter} onChange={event => setFilter(event.target.value)} />
        <div className="reviewer-options">{visible.length ? visible.map(user => <label key={user.id} className="checkbox">
          <input type="checkbox" checked={fields.reviewerIds.includes(user.id)} onChange={event =>
            update('reviewerIds', event.target.checked ? [...fields.reviewerIds, user.id] : fields.reviewerIds.filter(id => id !== user.id))} />{user.name || user.username}
        </label>) : <p className="muted">No matching reviewers.</p>}</div></> : <p className="muted">No reviewers are available.</p>}
    </fieldset>
    <label className="checkbox"><input type="checkbox" checked={fields.closeSourceOnMerge} onChange={event => update('closeSourceOnMerge', event.target.checked)} />Close source branch after the pull request is merged</label>
  </>
}

function CreateRequestForm({ workspace, repo }) {
  const { state, user, transact } = useStore()
  const [params] = useQuery()
  const branches = openBranches(state, repo)
  const defaultDestination = byId(branches, repo.defaultBranchId)
  const requests = repoRecords(state.pullRequests, repo)
  const commits = commitIndex(state, repo)
  const [destinationBranchId, setDestination] = useState(defaultDestination?.id || '')
  const [sourceBranchId, setSource] = useState(() => {
    const preselected = branches.find(branch => branch.name === params.get('branch'))
    const eligible = branch => branch.id !== defaultDestination?.id && commits.has(branch.headCommitId) &&
      !requests.some(pr => pr.status === 'open' && pr.sourceBranchId === branch.id && pr.destinationBranchId === defaultDestination?.id) &&
      compareHeads(commits, branch.headCommitId, defaultDestination?.headCommitId).changes.length
    return preselected?.id || branches.find(eligible)?.id || ''
  })
  const [fields, setFields] = useState({ title: null, description: '', reviewerIds: [], closeSourceOnMerge: false })
  const [show, setShow] = useState('diff-preview')
  const [error, setError] = useState('')
  const toast = useToast()
  const go = useGo()
  const source = byId(branches, sourceBranchId)
  const destination = byId(branches, destinationBranchId)
  const sourceId = source?.headCommitId ?? null
  const destinationId = destination?.headCommitId ?? null
  const detail = { sourceId, destinationId, ...compareHeads(commits, sourceId, destinationId) }
  const suggested = commits.get(sourceId)?.message || ''
  const reviewers = workspaceUsers(state, repo).filter(item => item.id !== user?.id)
  const update = (key, value) => setFields(current => ({ ...current, [key]: value }))
  const unavailable = !source || !destination ? 'Choose two available branches.' :
    source.id === destination.id ? 'Choose two different branches.' :
      !commits.has(sourceId) || destinationId && !commits.has(destinationId) ? 'A commit is required on the source branch, and both branch heads must be available.' :
        requests.some(pr => pr.status === 'open' && pr.sourceBranchId === source.id && pr.destinationBranchId === destination.id) ? 'An open pull request already exists for these branches.' :
          !detail.changes.length || !detail.commits.length ? 'The source branch has no changes to include.' : ''
  function submit(event) {
    event.preventDefault()
    const result = transact(createPullRequest, { ...fields, title: fields.title ?? suggested, repositoryId: repo.id, sourceBranchId,
      destinationBranchId, sourceCommitId: sourceId, destinationCommitId: destinationId })
    if (result.error) return setError(result.error)
    toast('Pull request created')
    go(reviewPath(workspace, repo, result.result))
  }

  return <>
    <PageHeading title="Create a pull request" />
    <form className="panel form-panel form-layout" onSubmit={submit}>
      <div className="two-fields"><BranchField label="Source branch" branches={branches} value={sourceBranchId} onChange={setSource} /><BranchField label="Destination branch" branches={branches} value={destinationBranchId} onChange={setDestination} /></div>
      <RequestFields fields={fields} update={update} reviewers={reviewers} suggested={suggested} />
      <ErrorText>{error || unavailable || (!user && 'A signed-in workspace member is required to create a pull request.')}</ErrorText>
      <div className="form-actions"><Button to={repoPath(workspace, repo, 'pull-requests')}>Cancel</Button><Button type="submit" variant="primary" disabled={!user || Boolean(unavailable)}>Create pull request</Button></div>
    </form>
    {source && destination && source.id !== destination.id && <section className="section-space">
      <Tabs items={previewTabs} current={show} onSelect={setShow} label="Compare branches" />
      <div role="tabpanel" aria-labelledby={`tab-${show}`}>{show === 'diff-preview' ? <FileDiff detail={detail} /> :
        <CommitsTable records={detail.commits} workspace={workspace} repo={repo} branch={source} identity={`${source.id}/${destination.id}`} />}</div>
    </section>}
  </>
}

export function NewPullRequest({ workspace, repo }) {
  const { state } = useStore()
  const [params, setQuery] = useQuery()
  const candidates = activeRepos(state, workspace)
  const selected = repo || byId(candidates, params.get('repository'))
  if (selected) return <CreateRequestForm key={selected.id} workspace={workspace} repo={selected} />
  return <>
    <PageHeading title="Create a pull request" />
    {candidates.length ? <div className="panel form-panel form-layout"><Field label="Repository"><select value="" onChange={event => setQuery({ repository: event.target.value })}>
      <option disabled value="">Choose a repository</option>{candidates.map(item => <option value={item.id} key={item.id}>{item.name || item.slug}</option>)}</select></Field>
      <div className="form-actions"><Button to={wsPath(workspace, 'pull-requests')}>Cancel</Button></div>
    </div> : <Empty title="No repositories" icon={GitPullRequest}><Button to={wsPath(workspace, 'repository/create')}>Create repository</Button></Empty>}
  </>
}

export function EditPullRequest({ repo, pr, onClose }) {
  const { state, transact } = useStore()
  const toast = useToast()
  const reviewers = workspaceUsers(state, repo).filter(item => item.id !== pr.authorId)
  const [fields, setFields] = useState({
    title: pr.title || '', description: pr.description || '', reviewerIds: list(pr.reviewerIds).filter(id => byId(reviewers, id)), closeSourceOnMerge: Boolean(pr.closeSourceOnMerge),
  })
  const [error, setError] = useState('')
  const update = (key, value) => setFields(current => ({ ...current, [key]: value }))
  function submit(event) {
    event.preventDefault()
    const result = transact(editPullRequest, { ...fields, repositoryId: repo.id, pullRequestId: pr.id })
    if (result.error) return setError(result.error)
    toast('Pull request saved')
    onClose()
  }
  return <Modal title="Edit pull request" onClose={onClose}><form className="form-layout" onSubmit={submit}>
    <RequestFields fields={fields} update={update} reviewers={reviewers} />
    <ErrorText>{error}</ErrorText><FormActions label="Save changes" onClose={onClose} />
  </form></Modal>
}
