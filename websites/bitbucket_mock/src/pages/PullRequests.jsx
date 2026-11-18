import { useState } from 'react'
import { FileCode, GitPullRequest, Plus } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { useStore } from '../context/AppContext.jsx'
import { diffLines } from '../domain/diff.js'
import { requestDetail, requestRecords, reviewChecks } from '../domain/pullRequests.js'
import { activeRepos, byId, human, list, newest, person, query, relative, repoPath, repoRecords, reviewPath, scoped, wsPath } from '../utils/model.js'
import { Avatar, Button, Empty, Field, Modal, PageHeading, RouteLink, Status, Table, Tabs, usePage, useQuery, useShortcut } from '../components/ui.jsx'
import { PullRequestTransitions } from './PullRequestTransitions.jsx'
import { Composer, Discussion, ReviewDecision } from './PullRequestDiscussion.jsx'
import { EditPullRequest } from './PullRequestForm.jsx'
import { CommitsTable } from './Repositories.jsx'

export const reviewTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'files', label: 'Files changed' },
  { id: 'commits', label: 'Commits' },
]

export function PullRequestList({ workspace, repo }) {
  const { state, user } = useStore()
  const [filters, setFilters] = useState({ text: '', status: 'open', project: '', repository: '', participation: '' })
  const projects = scoped(state.projects, 'workspaceId', workspace.id)
  const repositories = repo ? [repo] : activeRepos(state, workspace)
  const repoIndex = new Map(repositories.map(item => [item.id, item]))
  const branches = new Map(list(state.branches).map(branch => [branch.id, branch]))
  const results = list(state.pullRequests).filter(pr => {
    const sourceRepo = repoIndex.get(pr.repositoryId)
    if (!sourceRepo) return false
    if (filters.project && sourceRepo.projectId !== filters.project || filters.repository && sourceRepo.id !== filters.repository) return false
    if (filters.status && pr.status !== filters.status) return false
    if (filters.participation === 'mine' && (!user || pr.authorId !== user.id)) return false
    if (filters.participation === 'reviewing' && (!user || !list(pr.reviewerIds).includes(user.id))) return false
    const text = filters.text.trim().toLowerCase()
    return !text || (pr.title || '').toLowerCase().includes(text) || /^#?\d+$/.test(text) && String(pr.number).includes(text.replace(/^#/, ''))
  }).sort(newest)
  const page = usePage(results, JSON.stringify([workspace.id, repo?.id, filters]))
  const update = (key, value) => setFilters(current => ({ ...current, [key]: value, ...(key === 'project' ? { repository: '' } : {}) }))
  const branchName = (id, repoId) => {
    const branch = branches.get(id)
    return branch?.repositoryId === repoId ? branch?.name || 'Unknown branch' : 'Unknown branch'
  }

  return <>
    {!repo && <div className="breadcrumb">{workspace.name || workspace.slug}</div>}
    <PageHeading title="Pull requests">
      <Button variant="primary" to={repo ? repoPath(workspace, repo, 'pull-requests/new') : wsPath(workspace, 'pull-requests/new')}><Plus size={16} />Create pull request</Button>
    </PageHeading>
    <div className="filters">
      <Field label="Find a pull request"><input type="search" placeholder="Title or pull request number" value={filters.text} onChange={event => update('text', event.target.value)} /></Field>
      {!repo && <>
        <Field label="Project"><select value={filters.project} onChange={event => update('project', event.target.value)}><option value="">All projects</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name || project.key}</option>)}</select></Field>
        <Field label="Repository"><select value={filters.repository} onChange={event => update('repository', event.target.value)}><option value="">All repositories</option>{repositories.filter(item => !filters.project || item.projectId === filters.project).map(item => <option key={item.id} value={item.id}>{item.name || item.slug}</option>)}</select></Field>
      </>}
      <Field label="Status"><select value={filters.status} onChange={event => update('status', event.target.value)}><option value="open">Open</option><option value="merged">Merged</option><option value="declined">Declined</option><option value="">All statuses</option></select></Field>
      <Field label="Participation"><select value={filters.participation} onChange={event => update('participation', event.target.value)}><option value="">Everyone</option><option value="mine">Mine</option><option value="reviewing">Reviewing</option></select></Field>
    </div>
    {page.rows.length ? <Table label="Pull requests" columns={['Pull request', 'Status', 'Branches', 'Reviewers', 'Last activity']}>
      {page.rows.map(pr => {
        const sourceRepo = repoIndex.get(pr.repositoryId)
        const reviewers = list(pr.reviewerIds)
        return <tr key={pr.id}>
          <td><div className="pr-row"><Avatar user={byId(state.users, pr.authorId)} /><div><RouteLink className="row-title" to={reviewPath(workspace, sourceRepo, pr)}>{pr.title || 'Untitled pull request'}</RouteLink><small className="row-meta">#{pr.number} · {person(state, pr.authorId)}{!repo && ` · ${sourceRepo.name || sourceRepo.slug}`}</small></div></div></td>
          <td><Status value={pr.status} /></td>
          <td><BranchPair source={branchName(pr.sourceBranchId, sourceRepo.id)} destination={branchName(pr.destinationBranchId, sourceRepo.id)} /></td>
          <td><div className="avatar-group">{reviewers.slice(0, 4).map(id => <Avatar key={id} user={byId(state.users, id)} />)}{reviewers.length > 4 && <small>+{reviewers.length - 4}</small>}{!reviewers.length && '—'}</div></td>
          <td className="nowrap">{relative(pr.updatedAt || pr.createdAt)}</td>
        </tr>
      })}
    </Table> : <div className="panel"><Empty title="No pull requests found" icon={GitPullRequest}><p>Try changing the filters or create a pull request.</p></Empty></div>}
    {page.controls}
  </>
}

export function BranchPair({ source, destination }) {
  return <span className="branch-pair"><span className="pill neutral">{source || 'Unknown source'}</span><span aria-label="into">→</span><span className="pill neutral">{destination || 'Unknown destination'}</span></span>
}

export function Checks({ checks }) {
  return <div className="stack small-gap">
    <p><span className={`pill ${checks.approved >= checks.required ? 'success' : 'warning'}`}>{checks.approved} / {checks.required}</span> Approvals required</p>
    {checks.requireResolved ? <p><span className={`pill ${checks.remaining ? 'warning' : 'success'}`}>{checks.remaining} open</span> Tasks must be completed</p> : <p className="muted">Task completion is optional.</p>}
  </div>
}

const activityNames = {
  created: 'opened this pull request', edited: 'edited this pull request', comment_added: 'commented',
  comment_replied: 'replied to a comment', thread_resolved: 'resolved a thread', thread_reopened: 'reopened a thread',
  task_created: 'created a task', task_completed: 'completed a task', task_reopened: 'reopened a task',
  review_changed: 'updated their review', merged: 'merged this pull request', declined: 'declined this pull request',
}

function Activity({ records, pr }) {
  const { state } = useStore()
  const activity = [...records].sort(newest)
  const page = usePage(activity, pr.id)
  return <section className="panel">
    <div className="panel-title"><h2>Activity</h2></div>
    {!activity.length && <p className="panel-copy muted">No activity yet.</p>}
    {page.rows.map(item => <div className="activity-entry" key={item.id}>
      <Avatar user={byId(state.users, item.createdBy)} />
      <div><strong>{person(state, item.createdBy)}</strong> {activityNames[item.type] || human(item.type)} <small>· {relative(item.createdAt)}</small>
        {item.type === 'review_changed' && item.changes?.status && <div><Status value={item.changes.status} /></div>}
      </div>
    </div>)}
    {page.controls && <div className="panel-copy">{page.controls}</div>}
  </section>
}

export function FileDiff({ detail, onComment, comments = [] }) {
  const [selection, setSelection] = useState('')
  const file = detail.changes.find(change => change.path === selection) || detail.changes[0]
  const page = usePage(detail.changes, `${detail.sourceId}/${detail.destinationId}`)
  if (!file) return <div className="panel"><Empty title="No file changes" icon={FileCode} /></div>
  const rows = diffLines(file.oldText, file.newText)
  const destinationLines = new Map(diffLines(file.oldText, detail.destinationTree.get(file.path))
    .filter(row => row.type === 'context').map(row => [row.oldLine, row.newLine]))

  function anchor(row, side) {
    const line = side === 'source' ? row.newLine : destinationLines.get(row.oldLine)
    const commitId = side === 'source' ? detail.sourceId : detail.destinationId
    if (!line || !commitId) return null
    return { path: file.path, side, line, commitId }
  }

  return <div className="split diff-split">
    <section className="panel"><div className="panel-title"><h2>Files ({detail.changes.length})</h2></div><div className="file-list">
      {page.rows.map(change => <button type="button" className={change.path === file.path ? 'selected' : ''} aria-pressed={change.path === file.path} key={change.path} onClick={() => setSelection(change.path)}><FileCode size={15} /><span>{change.path}</span></button>)}
      {page.controls}
    </div></section>
    <section className="panel">
      <details open key={file.path} className="diff-panel">
        <summary><FileCode size={16} /> <strong>{file.path}</strong> <span className="pill neutral">{human(file.operation)}</span></summary>
        <div className="diff-body">
          {rows.length ? rows.map((row, index) => {
            const source = anchor(row, 'source')
            const destination = anchor(row, 'destination')
            const attached = comments.filter(comment => !comment.parentCommentId && comment.anchor?.path === file.path &&
              [source, destination].some(value => value && value.side === comment.anchor.side && value.line === comment.anchor.line && value.commitId === comment.anchor.commitId))
            return <div key={index}>
              <div className={`diff-line ${row.type}`}>
                <span>{onComment && destination ? <button className="gutter-button" aria-label={`Comment on destination line ${destination.line}`} onClick={() => onComment(destination)}>{row.oldLine}</button> : row.oldLine}</span>
                <span>{onComment && source ? <button className="gutter-button" aria-label={`Comment on source line ${source.line}`} onClick={() => onComment(source)}>{row.newLine}</button> : row.newLine}</span>
                <span>{row.type === 'add' ? '+' : row.type === 'delete' ? '−' : ' '}</span><code>{row.text || ' '}</code>
              </div>
              {attached.map(comment => <div key={comment.id} className="inline-preview"><strong>{comment.status === 'resolved' ? 'Resolved comment' : 'Inline comment'}</strong><p>{comment.body}</p></div>)}
            </div>
          }) : <p className="panel-copy muted">This change has no text lines.</p>}
        </div>
      </details>
    </section>
  </div>
}

export function ReviewOverview({ pr, detail, records, checks, children }) {
  const { state } = useStore()
  return <div className="split">
    <div className="stack">
      <section className="panel panel-pad stack small-gap"><h2>Description</h2><p className={pr.description ? 'preserve-lines' : 'muted'}>{pr.description || 'No description provided.'}</p>
        {pr.status === 'declined' && pr.declineReason && <p><strong>Decline reason</strong> {pr.declineReason}</p>}
      </section>
      {children}
      <Activity records={records.activity} pr={pr} />
    </div>
    <aside className="stack">
      <section className="panel panel-pad stack small-gap"><h2>Participants</h2>
        <small>Author</small><div className="pr-row"><Avatar user={byId(state.users, pr.authorId)} />{person(state, pr.authorId)}</div>
        <small>Reviewers</small>
        {list(pr.reviewerIds).length ? list(pr.reviewerIds).map(id => {
          const review = records.reviews.find(item => item.reviewerId === id)
          return <div className="review-person" key={id}><span><Avatar user={byId(state.users, id)} /> {person(state, id)}</span><Status value={review?.sourceCommitId === detail.sourceId ? review?.status || 'unreviewed' : 'unreviewed'} /></div>
        }) : <p className="muted">No reviewers assigned.</p>}
      </section>
      <section className="panel panel-pad stack small-gap"><h2>Merge checks</h2><Checks checks={checks} />
        {!!detail.conflicts.length && <p className="error">Conflicting files: {detail.conflicts.join(', ')}</p>}
      </section>
    </aside>
  </div>
}

function Review({ workspace, repo, pr }) {
  const { state, user } = useStore()
  const [showEdit, setShowEdit] = useState(false)
  const [anchor, setAnchor] = useState(null)
  const [params, setQuery] = useQuery()
  const tab = reviewTabs.some(item => item.id === params.get('tab')) ? params.get('tab') : 'overview'
  const selectTab = value => setQuery({ tab: value === 'overview' ? null : value })
  useShortcut(event => {
    if (!/^[123]$/.test(event.key)) return
    event.preventDefault()
    selectTab(reviewTabs[Number(event.key) - 1].id)
  })
  const detail = requestDetail(state, repo, pr)
  const records = requestRecords(state, pr)
  const checks = reviewChecks(repo, pr, detail, records.tasks, records.reviews)
  const canWrite = Boolean(user && pr.status === 'open')
  return <>
    <div className="breadcrumb"><RouteLink to={repoPath(workspace, repo, 'pull-requests')}>Pull requests</RouteLink> / #{pr.number}</div>
    <PageHeading title={pr.title || 'Untitled pull request'} meta={<span className="review-meta"><Status value={pr.status} /><BranchPair source={detail.source?.name} destination={detail.destination?.name} /><span><Avatar user={byId(state.users, pr.authorId)} /> {person(state, pr.authorId)} · {relative(pr.createdAt)}</span></span>}>
      {canWrite && user.id === pr.authorId && <Button onClick={() => setShowEdit(true)}>Edit</Button>}
      {canWrite && user.id !== pr.authorId && list(pr.reviewerIds).includes(user.id) &&
        <ReviewDecision repo={repo} pr={pr} detail={detail} review={records.reviews.find(item => item.reviewerId === user.id)} />}
      {canWrite && <PullRequestTransitions repo={repo} pr={pr} detail={detail} checks={checks} />}
    </PageHeading>
    <Tabs items={reviewTabs} current={tab} onSelect={selectTab} label="Pull request views" />
    <div role="tabpanel" aria-labelledby={`tab-${tab}`}>
      {tab === 'overview' && <ReviewOverview pr={pr} detail={detail} records={records} checks={checks}><Discussion repo={repo} pr={pr} records={records} /></ReviewOverview>}
      {tab === 'files' && <FileDiff detail={detail} comments={records.comments} onComment={canWrite ? setAnchor : undefined} />}
      {tab === 'commits' && <CommitsTable records={detail.commits} workspace={workspace} repo={repo} branch={detail.source} identity={pr.id} />}
    </div>
    {anchor && canWrite && <Modal title="Comment on a line" onClose={() => setAnchor(null)}><Composer repo={repo} pr={pr} anchor={anchor} onClose={() => setAnchor(null)} /></Modal>}
    {showEdit && <EditPullRequest repo={repo} pr={pr} onClose={() => setShowEdit(false)} />}
  </>
}

export function PullRequestDetail({ workspace, repo }) {
  const { state } = useStore()
  const { prNumber } = useParams()
  const pr = repoRecords(state.pullRequests, repo).find(item => String(item.number) === prNumber)
  return pr ? <Review key={pr.id} workspace={workspace} repo={repo} pr={pr} /> :
    <Empty title="Pull request unavailable" icon={GitPullRequest}><Button to={repoPath(workspace, repo, 'pull-requests')}>Back to pull requests</Button></Empty>
}
