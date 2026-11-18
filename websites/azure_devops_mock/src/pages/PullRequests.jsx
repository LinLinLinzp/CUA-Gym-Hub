import React, { useState } from 'react'
import { diffLines } from 'diff'
import { ArrowLeft, ChevronDown, GitBranch, GitPullRequest, MessageSquarePlus, Plus } from 'lucide-react'
import { ActionMenu, Button, Dialog, Empty, ErrorText, Field, Missing, MultiSelect, PageHead, Panel, Person, Select, Status, Table, Tabs, Tags, dateText, human } from '../components/ui.jsx'
import { PLink, useProject, useProjectNav, useQuery } from '../navigation.jsx'
import { useStore } from '../store.jsx'
import { byNewest, find, includes, list, memberList, repoPath, scoped, segment, tagsFrom } from '../model.js'
import { compareBranches, hasHead, repoBranches } from '../git.js'
import { addPullComment, createPullRequest, pullHeads, reviewChecks, threadStatus, updatePullRequest, votes } from '../pullRequests.js'
import { itemOptions, RepoSelect } from './Repos.jsx'

const requestPath = (repo, id) => repoPath(repo) + '/pullrequest/' + segment(id)
const listPath = (repo) => repoPath(repo) + '/pullrequests'
const branchOptions = (rows) => rows.map((row) => [row.id,row.name ?? row.id])

export default function PullRequests({ repo, view, id }) {
  const { data } = useStore()
  if (!repo) return <Missing title="Select a repository to see pull requests" to="/_git" />
  if (view === 'pullrequests' && !id) return <RequestList repo={repo} />
  if (view === 'pullrequestcreate' && !id) return <RequestForm repo={repo} />
  const request = list(data.pullRequests).find((row) => row.repoId === repo.id && row.id === id)
  if (view !== 'pullrequest' || !request) return <Missing title="Pull request unavailable" to={listPath(repo)} />
  return <RequestDetail repo={repo} request={request} />
}

function RequestList({ repo }) {
  const { data, user } = useStore()
  const branches = repoBranches(data,repo.id)
  const [params,setQuery] = useQuery()
  const [filter,setFilter] = useState('')
  const statuses = ['active','completed','abandoned']
  const status = statuses.includes(params.get('status')) ? params.get('status') : 'active'
  const rows = list(data.pullRequests).filter((row) => row.repoId === repo.id && row.status === status &&
    (includes(row.title,filter) || includes(row.id,filter.trim().replace(/^#/,'')))).sort(byNewest)
  const canCreate = user && branches.filter((row) => hasHead(data,repo.id,row)).length >= 2
  return <>
    <PageHead title="Pull requests"><RepoSelect repo={repo} suffix="/pullrequests" />
      {canCreate ? <PLink className="button primary" to={repoPath(repo) + '/pullrequestcreate'}><Plus size={16} /> New pull request</PLink>
        : <Button primary disabled title="A signed-in user and two branches with commits are required"><Plus size={16} /> New pull request</Button>}</PageHead>
    <Tabs items={statuses.map((status) => [status,human(status)])} value={status} onChange={(value) => setQuery({ status: value === 'active' ? null : value })} />
    <div className="toolbar"><input type="search" aria-label="Search pull requests" placeholder="Filter by title or ID" value={filter} onChange={(event) => setFilter(event.target.value)} /></div>
    <Table columns={['Pull request','Branches','Author','Reviewers','Updated']} rows={rows} empty={'No ' + status + ' pull requests'} render={(row) => <>
      <td><PLink to={requestPath(repo,row.id)}><GitPullRequest size={16} /> #{row.id} {row.title ?? 'Untitled pull request'}</PLink>
        {row.isDraft && <span className="tag">Draft</span>}</td>
      <td>{find(branches,row.sourceBranchId)?.name ?? 'Unavailable branch'} → {find(branches,row.targetBranchId)?.name ?? 'Unavailable branch'}</td>
      <td><Person id={row.createdBy} /></td><td><div className="inline">{list(row.reviewers).map((reviewer) => <Person key={reviewer.userId} id={reviewer.userId} />)}{!list(row.reviewers).length && '—'}</div></td>
      <td className="meta">{dateText(row.updatedAt ?? row.createdAt)}</td>
    </>} />
  </>
}

function RequestForm({ repo }) {
  const { data,user,commit,notify } = useStore()
  const { project } = useProject()
  const navigate = useProjectNav()
  const [params] = useQuery()
  const branches = repoBranches(data,repo.id).filter((row) => hasHead(data,repo.id,row))
  const defaultBranch = find(branches,repo.defaultBranchId) ?? branches[0]
  const [target,setTarget] = useState(defaultBranch?.id ?? '')
  const [source,setSource] = useState(branches.find((row) => row.name === params.get('source') || row.id === params.get('source'))?.id ?? branches.find((row) => row.id !== defaultBranch?.id)?.id ?? '')
  const [title,setTitle] = useState('')
  const [description,setDescription] = useState('')
  const [reviewerIds,setReviewers] = useState([])
  const [workItemIds,setItems] = useState([])
  const [tags,setTags] = useState('')
  const [error,setError] = useState('')
  const sourceHead = find(branches,source)?.headCommitId
  const targetHead = find(branches,target)?.headCommitId
  const validBranches = sourceHead && targetHead && source !== target
  const preview = validBranches ? compareBranches(data,repo.id,sourceHead,targetHead).preview : []
  const members = memberList(data,project)
  async function submit(event) {
    event.preventDefault()
    try {
      const row = await commit((state,actor,now) => createPullRequest(state,project.id,repo.id,{
        sourceBranchId: source, targetBranchId: target, title, description, reviewerIds, workItemIds, tags: tagsFrom(tags),
        isDraft: event.nativeEvent.submitter?.value === 'draft',
      },actor,now))
      notify(row.isDraft ? 'Draft pull request created' : 'Pull request published')
      navigate(requestPath(repo,row.id))
    } catch (failure) { setError(failure.message) }
  }
  return <>
    <PageHead title="New pull request" subtitle={repo.name}><PLink className="button" to={listPath(repo)}><ArrowLeft size={15} /> Pull requests</PLink></PageHead>
    <form className="split" onSubmit={submit}>
      <div className="stack"><Panel><div className="stack">
        <div className="field-grid"><Field label="Source branch"><Select required value={source} empty="Choose source" options={branchOptions(branches)} onChange={(event) => setSource(event.target.value)} /></Field>
          <Field label="Target branch"><Select required value={target} empty="Choose target" options={branchOptions(branches)} onChange={(event) => setTarget(event.target.value)} /></Field></div>
        <Field label="Title"><input required value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
        <Field label="Description"><textarea rows={7} value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
        <ErrorText error={error || (source && source === target ? 'Select different source and target branches.' : '')} />
        <div className="actions"><Button type="submit" value="draft" disabled={!validBranches || !user}>Create as draft</Button><Button type="submit" primary disabled={!validBranches || !user}>Publish</Button></div>
      </div></Panel>
      <Panel title="Changed files">{preview.length ? <ul className="plain-list">{preview.map((change) => <li key={change.path}><span className="tag">{human(change.kind)}</span> {change.path}</li>)}</ul> : <p className="muted">No file changes to preview.</p>}</Panel></div>
      <Panel title="Review details"><div className="stack">
        <Field label="Reviewers"><MultiSelect value={reviewerIds} options={members.map((row) => [row.id,row.displayName ?? row.id])} onChange={setReviewers} /></Field>
        <Field label="Work items"><MultiSelect value={workItemIds} options={itemOptions(scoped(data.workItems,project.id))} onChange={setItems} /></Field>
        <Field label="Tags"><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Separate with commas" /></Field>
      </div></Panel>
    </form>
  </>
}

function RequestDetail({ repo,request }) {
  const { data,user,commit,notify } = useStore()
  const { project } = useProject()
  const [params,setQuery] = useQuery()
  const [dialog,setDialog] = useState('')
  const [closeItems,setCloseItems] = useState(false)
  const [error,setError] = useState('')
  const [inline,setInline] = useState(null)
  const tabs = ['Overview','Files','Commits']
  const tab = tabs.includes(params.get('tab')) ? params.get('tab') : 'Overview'
  const { source,target,sourceHead,targetHead } = pullHeads(data,repo.id,request)
  const comparison = compareBranches(data,repo.id,sourceHead,targetHead)
  const checks = reviewChecks(data,repo,request,source,target,comparison)
  const comments = list(data.pullRequestComments).filter((row) => row.pullRequestId === request.id)
  const fileChoices = [...new Set([...comparison.preview.map((change) => change.path),...comments.map((comment) => comment.path).filter(Boolean)])]
  const activeFile = fileChoices.includes(params.get('file')) ? params.get('file') : fileChoices[0]
  const change = comparison.preview.find((row) => row.path === activeFile)
  const active = request.status === 'active'
  const gated = !user || !active
  const linked = list(request.workItemIds)
  async function action(name,value) {
    try {
      await commit((state,actor,now) => updatePullRequest(state,project.id,repo.id,request.id,name,value,actor,now))
      notify({ vote:'Vote saved',complete:'Pull request completed',publish:'Pull request published',abandon:'Pull request abandoned' }[name])
      setDialog(''); setError('')
    } catch (failure) { setError(failure.message) }
  }
  return <>
    <PageHead title={request.title ?? 'Pull request'} subtitle={'#' + request.id + ' · ' + (repo.name ?? repo.id)}>
      <PLink className="button" to={listPath(repo)}>Pull requests</PLink>
      {active && <>
        <ActionMenu disabled={gated} label={<>Vote <ChevronDown size={14} /></>}>
          {votes.map((vote) => <button key={vote} onClick={() => action('vote',vote)}>{vote === 'none' ? 'Reset vote' : vote === 'approved' ? 'Approve' : human(vote)}</button>)}
        </ActionMenu>
        {request.isDraft && <Button primary disabled={!user} onClick={() => action('publish')}>Publish</Button>}
        <Button primary disabled={!user || Boolean(checks.reason)} title={checks.reason || (!user ? 'A signed-in user is required' : undefined)}
          onClick={() => { setError(''); setCloseItems(false); setDialog('complete') }}>Complete</Button>
        <Button disabled={gated} onClick={() => { setError(''); setDialog('abandon') }}>Abandon</Button>
      </>}
    </PageHead>
    <div className="toolbar"><Status value={request.status} />{request.isDraft && <span className="tag">Draft</span>}
      <Person id={request.createdBy} /><span className="meta">wants to merge</span>
      {source ? <PLink to={repoPath(repo) + '?version=' + segment(source.name)}><GitBranch size={14} /> {source.name}</PLink> : <span>Unavailable source</span>}
      <span className="meta">into</span>{target ? <PLink to={repoPath(repo) + '?version=' + segment(target.name)}>{target.name}</PLink> : <span>Unavailable target</span>}
    </div>
    <Tabs items={tabs} value={tab} onChange={(value) => { setInline(null); setQuery({ tab: value === 'Overview' ? null : value, file: null }) }} />
    {!dialog && <ErrorText error={error} />}
    {tab === 'Overview' && <div className="split"><div className="stack">
      {active && <Panel title="Merge checks">
        <div className="stack"><div className="inline"><Status value={comparison.conflicts.length ? 'failed' : comparison.baseId ? 'succeeded' : 'blocked'} />
          <span>{comparison.conflicts.length ? 'Conflicting files: ' + comparison.conflicts.join(', ') : comparison.baseId ? 'No merge conflicts' : 'No shared commit found'}</span></div>
          <p>{checks.count} approval{checks.count === 1 ? '' : 's'} · {checks.required} required{list(request.reviewers).some((row) => row.required) && ' · Designated reviewer approval required'}</p>
          {checks.reason && <p className="meta">{checks.reason}</p>}</div></Panel>}
      <Panel title="Description"><p className="prose">{request.description || 'No description provided.'}</p></Panel>
      <Panel title="Discussion"><CommentBox repo={repo} request={request} label="Add a comment" />
        <ThreadList repo={repo} request={request} rows={comments} path={null} />
        {comments.some((row) => row.path) && <PLink to={requestPath(repo,request.id) + '?tab=Files'}>View inline discussions</PLink>}</Panel>
    </div><div className="stack">
      <Panel title="Reviewers"><div className="stack">{list(request.reviewers).map((row) => <div className="inline spread" key={row.userId}><Person id={row.userId} />
        <Status value={row.vote === 'none' ? 'No vote' : row.vote} />{row.required && <span className="tag">Required</span>}</div>)}{!list(request.reviewers).length && <p className="meta">No reviewers</p>}</div></Panel>
      <Panel title="Work items"><div className="stack">{linked.map((id) => {
        const item = find(scoped(data.workItems,project.id),id)
        return item ? <PLink key={id} to={'/_workitems/edit/' + segment(id)}>#{id} {item.title}</PLink> : <span className="meta" key={id}>#{id} · Unavailable</span>
      })}{!linked.length && <p className="meta">No linked work items</p>}</div></Panel>
      <Panel title="Tags">{list(request.tags).length ? <Tags tags={request.tags} /> : <p className="meta">No tags</p>}</Panel>
    </div></div>}
    {tab === 'Files' && (activeFile ? <div className="split left">
      <Panel title="Changed files"><div className="side-group">{fileChoices.map((path) => <button type="button" className={path === activeFile ? 'selected' : ''} key={path}
        onClick={() => { setInline(null); setQuery({ file:path }) }}>{path}</button>)}</div></Panel>
      <Panel title={activeFile}><div className="stack">
        {change ? <DiffView change={change} canComment={Boolean(user)} onComment={(line) => setInline({ path:activeFile,line })} /> : <p className="meta">No current changes at this path.</p>}
        {inline?.path === activeFile && <CommentBox key={activeFile + ':' + inline.line} repo={repo} request={request} path={activeFile} line={inline.line}
          label={'Comment on line ' + inline.line} onDone={() => setInline(null)} />}
        <ThreadList repo={repo} request={request} rows={comments} path={activeFile} />
      </div></Panel>
    </div> : <Empty title="No changed files" />)}
    {tab === 'Commits' && <div className="stack">
      {request.mergeCommitId && <div><PLink to={repoPath(repo) + '/commits?commitId=' + segment(request.mergeCommitId)}>View merge commit</PLink></div>}
      <Table columns={['Commit','Author','Date']} rows={comparison.sourceOnly} empty="No source commits" render={(row) => <>
        <td><PLink to={repoPath(repo) + '/commits?commitId=' + segment(row.id)}>{row.message ?? row.id}</PLink></td><td><Person id={row.createdBy} /></td><td className="meta">{dateText(row.createdAt)}</td></>} />
    </div>}
    {dialog && <Dialog title={dialog === 'complete' ? 'Complete pull request' : 'Abandon pull request'} onClose={() => setDialog('')}>
      <div className="dialog-body">{dialog === 'complete' ? <>
        <Field label="Merge type"><Select value="merge" options={[[ 'merge','Merge commit']]} readOnly /></Field>
        <label className="inline"><input type="checkbox" checked={closeItems} onChange={(event) => setCloseItems(event.target.checked)} /> Complete linked work items</label>
      </> : <p>Abandon pull request #{request.id}?</p>}<ErrorText error={error} /></div>
      <footer><Button onClick={() => setDialog('')}>Cancel</Button><Button primary onClick={() => action(dialog,closeItems)}>{dialog === 'complete' ? 'Complete merge' : 'Abandon pull request'}</Button></footer>
    </Dialog>}
  </>
}

function DiffView({ change,canComment,onComment }) {
  let oldLine = 0, newLine = 0
  const rows = diffLines(change.before ?? '',change.after ?? '').flatMap((part) =>
    part.value.replace(/\n$/,'').split('\n').map((text) => ({
      old: !part.added ? ++oldLine : null, next: !part.removed ? ++newLine : null,
      kind: part.added ? 'added' : part.removed ? 'removed' : 'context', text,
    })))
  return <div className="code diff" aria-label="Line changes">{rows.map((row,index) => <div className={'diff-' + row.kind} key={index}>
    <span className="line-number">{row.old}</span><span className="line-number">{row.next}</span>
    <span className="diff-mark" aria-label={row.kind}>{row.kind === 'added' ? '+' : row.kind === 'removed' ? '−' : ' '}</span><code>{row.text || ' '}</code>
    {canComment && (row.next || change.kind === 'delete') && <button type="button" aria-label={'Add inline comment on line ' + (row.next ?? row.old)}
      title={'Add inline comment on line ' + (row.next ?? row.old)} onClick={() => onComment(row.next ?? row.old)}><MessageSquarePlus size={14} /></button>}
  </div>)}</div>
}

function CommentBox({ repo,request,path,line,parentId,label,onDone }) {
  const { project } = useProject()
  const { user,commit,notify } = useStore()
  const [body,setBody] = useState('')
  const [error,setError] = useState('')
  async function submit(event) {
    event.preventDefault()
    try {
      await commit((state,actor,now) => addPullComment(state,project.id,repo.id,request.id,{ body,path,line,parentId },actor,now))
      setBody(''); setError(''); notify('Comment added'); onDone?.()
    } catch (failure) { setError(failure.message) }
  }
  return <form onSubmit={submit} className="stack"><Field label={label}><textarea value={body} required onChange={(event) => setBody(event.target.value)} /></Field>
    <ErrorText error={error} /><div className="actions"><Button type="submit" disabled={!user || !body.trim()}>{parentId ? 'Post reply' : 'Post comment'}</Button>
      {onDone && <Button onClick={onDone}>Cancel</Button>}</div></form>
}

function ThreadList({ repo,request,rows,path }) {
  return <div className="comment-list">{rows.filter((row) => !row.parentId && (row.path ?? null) === path).sort(byNewest).map((root) =>
    <Thread key={root.id} repo={repo} request={request} root={root} replies={rows.filter((row) => row.parentId === root.id).sort((a,b) => byNewest(b,a))} />)}</div>
}

function Thread({ repo,request,root,replies }) {
  const { project } = useProject()
  const { user,commit,notify } = useStore()
  const [reply,setReply] = useState(false)
  const [error,setError] = useState('')
  async function toggle() {
    try {
      const status = root.status === 'resolved' ? 'active' : 'resolved'
      await commit((state,actor,now) => threadStatus(state,project.id,repo.id,request.id,root.id,status,actor,now))
      setError(''); notify(status === 'resolved' ? 'Thread resolved' : 'Thread reopened')
    } catch (failure) { setError(failure.message) }
  }
  const render = (row) => <><div className="inline"><Person id={row.createdBy} /><span className="meta">{dateText(row.createdAt)}</span>
    {row.id === root.id && root.line && <span className="tag">Line {root.line}</span>}</div><p>{row.body}</p></>
  return <div className="stack">{render(root)}{replies.map((row) => <div className="thread-reply" key={row.id}>{render(row)}</div>)}
    <div className="actions"><Status value={root.status} /><Button disabled={!user} onClick={() => setReply(!reply)}>Reply</Button>
      <Button disabled={!user} onClick={toggle}>{root.status === 'resolved' ? 'Reopen thread' : 'Resolve thread'}</Button></div>
    <ErrorText error={error} />{reply && <CommentBox repo={repo} request={request} parentId={root.id} label="Reply" onDone={() => setReply(false)} />}</div>
}
