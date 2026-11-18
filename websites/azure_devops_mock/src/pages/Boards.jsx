import React, { useState } from 'react'
import { ChevronDown, GitBranch, GitPullRequest, Plus } from 'lucide-react'
import { ActionMenu, Button, Dialog, Empty, ErrorText, Field, Missing, PageHead, Panel, Person, Select, Status, Table, Tabs, Tags, TypeIcon, dateText } from '../components/ui.jsx'
import { PLink, decodeSegment, useProject, useProjectNav, useQuery } from '../navigation.jsx'
import { useStore } from '../store.jsx'
import { byBoard, byNewest, created, find, includes, list, memberList, nextId, repoPath, requireThat, scoped, segment, sprintChoices, stamp, tagsFrom, update, workStates, workTypes } from '../model.js'
import { WorkItemConflict, addDiscussion, bulkWork, lane, moveCard, saveWork } from '../workItems.js'

const editorPath = (id) => '/_workitems/edit/' + segment(id)
const ordered = (rows) => [...rows].sort(byNewest)
const optionsFor = (records, label = 'name') => records.map((record) => [record.id, record[label] ?? record.id])
const teamPath = (section, teamId, sprintId) => '/' + section + (section === '_boards' ? '/board/' : '/backlog/') + segment(teamId) + (section === '_sprints' ? '/' + segment(sprintId) : '')
const displayValue = (value) => Array.isArray(value) ? value.join(', ') : value == null ? '—' : String(value)
const paramsFor = (from) => from ? '?from=' + segment(from) : ''

function NewWork({ disabled, from }) {
  return <ActionMenu primary disabled={disabled} title={disabled ? 'A team and signed-in user are required' : undefined}
    label={<><Plus size={16} /> New Work Item <ChevronDown size={14} /></>}>
    {workTypes.map((type) => <PLink key={type} to={'/_workitems/new?type=' + segment(type) + (from ? '&from=' + segment(from) : '')}><TypeIcon type={type} /> {type}</PLink>)}
  </ActionMenu>
}

export function WorkTable({ rows, from, selection, toggle, parents = false }) {
  const { data } = useStore()
  const columns = [...(selection ? ['Select'] : []), 'ID', 'Title', 'Assigned to', 'State', ...(parents ? ['Parent'] : []), 'Iteration', 'Changed date']
  return <Table columns={columns} rows={rows} empty="No work items match this view" render={(row) => <>
    {selection && <td><input type="checkbox" checked={selection.includes(row.id)} onChange={() => toggle(row.id)} aria-label={'Select #' + row.id} /></td>}
    <td className="number"><TypeIcon type={row.type} /> {row.id}</td>
    <td><PLink to={editorPath(row.id) + paramsFor(from)}>{row.title ?? '(Untitled work item)'}</PLink></td>
    <td><Person id={row.assignedToId} /></td><td><Status value={row.state} /></td>
    {parents && <td>{row.parentId ? <PLink to={editorPath(row.parentId) + paramsFor(from)}>{find(data.workItems, row.parentId)?.title ?? '#' + row.parentId}</PLink> : '—'}</td>}
    <td>{find(data.sprints, row.sprintId)?.path ?? '—'}</td><td className="meta">{dateText(row.changedAt)}</td>
  </>} />
}

function WorkList() {
  const { data, user } = useStore()
  const { project, team } = useProject()
  const [filters, setFilters] = useState({ scope: '', keyword: '', type: '', state: '', assigned: '', area: '', tag: '' })
  const { scope, keyword, type, state, assigned, area, tag } = filters
  const set = (key) => (event) => setFilters({ ...filters, [key]: event.target.value })
  const rows = scoped(data.workItems, project.id)
  const filtered = ordered(rows.filter((row) =>
    (!scope || user && row.assignedToId === user.id) &&
    (includes(row.title, keyword) || includes(row.id, keyword)) &&
    (!type || row.type === type) && (!state || row.state === state) &&
    (!assigned || (assigned === '_unassigned' ? !row.assignedToId : row.assignedToId === assigned)) &&
    (!area || row.areaPath === area) && (!tag || list(row.tags).includes(tag))))
  return <>
    <PageHead title="Work items"><NewWork disabled={!user || !team} /></PageHead>
    <div className="toolbar"><Select aria-label="Work item scope" value={scope} onChange={set('scope')} options={[[ '', 'Recently updated'],['mine','Assigned to me']]} />
      <input type="search" aria-label="Filter by keyword" placeholder="Filter by keyword" value={keyword} onChange={set('keyword')} />
      <Select aria-label="Type filter" empty="All types" value={type} onChange={set('type')} options={workTypes} />
      <Select aria-label="State filter" empty="All states" value={state} onChange={set('state')} options={workStates} />
      <Select aria-label="Assignee filter" empty="All assignees" value={assigned} onChange={set('assigned')} options={[[ '_unassigned','Unassigned'], ...optionsFor(memberList(data, project), 'displayName')]} />
      <Select aria-label="Area filter" empty="All areas" value={area} onChange={set('area')} options={[...new Set(rows.map((row) => row.areaPath).filter(Boolean))].sort()} />
      <Select aria-label="Tag filter" empty="All tags" value={tag} onChange={set('tag')} options={[...new Set(rows.flatMap((row) => list(row.tags)))].sort()} />
      <span className="meta">{filtered.length} work items</span>
    </div>
    <WorkTable rows={filtered} />
  </>
}

function workDraft(item, team, sprint, type) {
  return { type: item?.type ?? type, title: item?.title ?? '', description: item?.description ?? '',
    acceptanceCriteria: item?.acceptanceCriteria ?? '', state: item?.state ?? 'New', assignedToId: item?.assignedToId ?? '',
    priority: item?.priority ?? 2, storyPoints: item?.storyPoints ?? '', areaPath: item ? item.areaPath ?? '' : team?.areaPath ?? '',
    sprintId: item ? item.sprintId ?? '' : sprint?.id ?? '', tags: list(item?.tags).join(', '), parentId: item?.parentId ?? '' }
}

const fieldLabels = {
  title: 'Title', description: 'Description', acceptanceCriteria: 'Acceptance criteria', type: 'Work item type',
  state: 'State', assignedToId: 'Assigned to', priority: 'Priority', storyPoints: 'Story points',
  areaPath: 'Area', sprintId: 'Iteration', tags: 'Tags', parentId: 'Parent',
}

function workInput(field, value) {
  if (field === 'priority') return Number(value)
  if (field === 'storyPoints') return value === '' ? null : Number(value)
  if (field === 'areaPath') return value.trim()
  if (field === 'tags') return tagsFrom(value)
  if (['assignedToId', 'sprintId', 'parentId'].includes(field)) return value || null
  return value
}

function WorkEditor({ item, defaults, from, callerTeam }) {
  const { data, user, commit, notify } = useStore()
  const { project, defaultTeam } = useProject()
  const navigate = useProjectNav()
  const [edits, setEdits] = useState({})
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('Details')
  const draft = { ...defaults, ...Object.fromEntries(Object.entries(edits).map(([field, edit]) => [field, edit.value])) }
  const team = item ? find(scoped(data.teams, project.id), item.teamId) : callerTeam ?? defaultTeam
  const sprints = sprintChoices(data, project.id, team?.id)
  const members = memberList(data, project)
  const otherItems = scoped(data.workItems, project.id).filter((row) => row.id !== item?.id)
  const setter = (field) => (event) => {
    const value = event.target.value
    setEdits((current) => {
      const next = { ...current }
      const original = current[field] ?? { display: defaults[field], stored: item?.[field] }
      if (String(value) === String(original.display) || String(value) === String(defaults[field])) delete next[field]
      else next[field] = { ...original, value }
      return next
    })
  }
  const selected = (options, value, fallback) => value && !options.some(([id]) => id === value) ? [...options, [value, fallback]] : options

  async function submit(event) {
    event.preventDefault()
    if (saving) return
    const close = event.nativeEvent.submitter?.value === 'close'
    setSaving(true)
    try {
      const fields = Object.keys(item ? edits : draft)
      const input = Object.fromEntries(fields.map((field) => [field, workInput(field, draft[field])]))
      const originals = Object.fromEntries(fields.map((field) => [field, edits[field]?.stored]))
      const id = await commit((state, actor, now) => saveWork(state, project.id, team?.id, item?.id, input, actor, now, originals))
      setError(null)
      setEdits({})
      notify(item ? 'Work item saved' : 'Work item created')
      if (close) navigate(from)
      else if (!item) navigate(editorPath(id) + paramsFor(from), { replace: true })
    } catch (failure) { setError(failure) }
    finally { setSaving(false) }
  }

  function loadLatestFields() {
    setEdits((current) => Object.fromEntries(Object.entries(current).filter(([field]) => !error.fields.includes(field))))
    setError(null)
  }

  return <>
    <PageHead title={item ? '#' + item.id + ' · ' + (item.title ?? 'Work item') : 'New ' + draft.type}
      subtitle={team?.name}>
      <PLink className="button" to={from}>Cancel</PLink>
      <Button form="work-form" type="submit" title={!user ? 'A signed-in user is required' : undefined} disabled={saving || !user || (!item && !team)}>{saving ? 'Saving…' : 'Save'}</Button>
      <Button form="work-form" type="submit" primary value="close" disabled={saving || !user || (!item && !team)}>Save &amp; Close</Button>
    </PageHead>
    {item && <Tabs items={['Details','History']} value={tab} onChange={setTab} />}
    <form id="work-form" onSubmit={submit} className="stack" hidden={tab !== 'Details'}>
      <ErrorText error={error instanceof WorkItemConflict ? `${error.fields.map((field) => fieldLabels[field]).join(', ')}. ${error.message}` : error?.message} />
      {error instanceof WorkItemConflict && <div><Button onClick={loadLatestFields}>Load latest values</Button></div>}
      <div className="split" inert={saving}>
        <div className="stack">
          <Panel><div className="stack">
            <Field label="Title"><input required value={draft.title} onChange={setter('title')} /></Field>
            <Field label="Description"><textarea value={draft.description} onChange={setter('description')} rows={5} /></Field>
            <Field label="Acceptance criteria"><textarea value={draft.acceptanceCriteria} onChange={setter('acceptanceCriteria')} rows={4} /></Field>
          </div></Panel>
        </div>
        <Panel title="Details"><div className="stack">
          <Field label="Work item type"><Select options={workTypes} value={draft.type} onChange={setter('type')} /></Field>
          <Field label="State"><Select options={workStates} value={draft.state} onChange={setter('state')} /></Field>
          <Field label="Assigned to"><Select options={selected(optionsFor(members,'displayName'), draft.assignedToId, 'Unavailable user')} empty="Unassigned" value={draft.assignedToId} onChange={setter('assignedToId')} /></Field>
          <div className="field-grid">
            <Field label="Priority"><Select options={['1','2','3','4']} value={draft.priority} onChange={setter('priority')} /></Field>
            <Field label="Story points"><input type="number" min="0" step="any" value={draft.storyPoints} onChange={setter('storyPoints')} /></Field>
          </div>
          <Field label="Area"><input value={draft.areaPath} onChange={setter('areaPath')} /></Field>
          <Field label="Iteration"><Select options={selected(optionsFor(sprints,'path'), draft.sprintId, 'Unavailable iteration')} empty="Unscheduled" value={draft.sprintId} onChange={setter('sprintId')} /></Field>
          <Field label="Tags"><input value={draft.tags} onChange={setter('tags')} placeholder="Separate with commas" /></Field>
          <Field label="Parent"><Select options={selected(otherItems.map((row) => [row.id, '#' + row.id + ' ' + (row.title ?? '')]), draft.parentId, 'Unavailable parent')} empty="No parent" value={draft.parentId} onChange={setter('parentId')} /></Field>
        </div></Panel>
      </div>
    </form>
    {item && (tab === 'Details' ? <WorkDiscussion item={item} /> : <WorkHistory item={item} />)}
  </>
}

function WorkEditorRoute({ id }) {
  const { data } = useStore()
  const { project, team, teams } = useProject()
  const [params] = useQuery()
  const item = find(scoped(data.workItems, project.id), id)
  const fromParam = params.get('from')
  const from = /^\/(?:_workitems|_boards\/board\/[^/]+|_backlogs\/backlog\/[^/]+|_sprints\/backlog\/[^/]+\/[^/]+|_queries)$/.test(fromParam ?? '') ? fromParam : '/_workitems'
  const type = workTypes.includes(params.get('type')) ? params.get('type') : 'User Story'
  const callerTeam = find(teams, decodeSegment(from.split('/')[3])) ?? team
  const iterations = sprintChoices(data, project.id, callerTeam?.id)
  const sprint = find(iterations, callerTeam?.defaultSprintId) ?? iterations[0]
  if (id != null && !item) return <Missing title="Work item unavailable" to="/_workitems" />
  return <WorkEditor key={JSON.stringify([id, type, callerTeam?.id])} item={item} callerTeam={callerTeam}
    defaults={workDraft(item, callerTeam, sprint, type)} from={from} />
}

function WorkDiscussion({ item }) {
  const { data, user, commit, notify } = useStore()
  const { project } = useProject()
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const repos = scoped(data.repositories, project.id)
  const branches = list(data.branches).filter((row) => list(row.workItemIds).includes(item.id) && find(repos, row.repoId))
  const requests = list(data.pullRequests).filter((row) => list(row.workItemIds).includes(item.id) && find(repos, row.repoId))
  async function submit(event) {
    event.preventDefault()
    try {
      await commit((state, actor, now) => addDiscussion(state, project.id, item.id, body, actor, now))
      setBody('')
      setError('')
      notify('Discussion comment added')
    } catch (failure) { setError(failure.message) }
  }
  return <div className="split discussion">
    <Panel title="Discussion"><form onSubmit={submit} className="stack">
      <Field label="Add a comment"><textarea required value={body} onChange={(event) => setBody(event.target.value)} /></Field>
      <ErrorText error={error} /><div><Button type="submit" disabled={!user || !body.trim()}>Add Discussion</Button></div>
    </form><div className="comment-list">{ordered(list(data.workItemComments).filter((row) => row.workItemId === item.id)).map((comment) => <div key={comment.id}><div className="inline"><Person id={comment.createdBy} /><span className="meta">{dateText(comment.createdAt)}</span></div><p>{comment.body}</p></div>)}</div></Panel>
    <Panel title="Development"><div className="stack">
      {branches.map((row) => <PLink key={row.id} to={repoPath(find(repos, row.repoId)) + '?version=' + segment(row.name)}><GitBranch size={15} /> {row.name}</PLink>)}
      {requests.map((row) => <PLink key={row.id} to={repoPath(find(repos, row.repoId)) + '/pullrequest/' + segment(row.id)}><GitPullRequest size={15} /> #{row.id} {row.title}</PLink>)}
      {!branches.length && !requests.length && <p className="muted">No linked branches or pull requests.</p>}
    </div></Panel>
  </div>
}

function WorkHistory({ item }) {
  const { data } = useStore()
  const rows = ordered(list(data.workItemRevisions).filter((row) => row.workItemId === item.id))
  return <Panel title="History"><div className="comment-list">{rows.map((row) => <div key={row.id}>
    <div className="inline spread"><strong>{row.action}</strong><span className="meta">{dateText(row.createdAt)}</span></div>
    <Person id={row.createdBy} /><dl className="facts">{Object.entries(row.changes ?? {}).map(([field, value]) => <React.Fragment key={field}><dt>{field}</dt><dd>{displayValue(value?.from)} → {displayValue(value?.to)}</dd></React.Fragment>)}</dl>
  </div>)}{!rows.length && <p className="muted">No revisions for this item.</p>}</div></Panel>
}

export default function Boards() {
  const { section, route } = useProject()
  const [view, id, sprintId] = route
  if (section === '_workitems') {
    if (!route.length) return <WorkList />
    if (route.length === 1 && view === 'new') return <WorkEditorRoute />
    if (route.length === 2 && view === 'edit' && id) return <WorkEditorRoute id={id} />
  }
  if (section === '_queries' && !route.length) return <Queries />
  if (section === '_boards' && route.length === 2 && view === 'board' && id) return <Kanban key={id} />
  if (section === '_backlogs' && route.length === 2 && view === 'backlog' && id) return <Backlog key={id} />
  if (section === '_sprints' && route.length === 3 && view === 'backlog' && id && sprintId) {
    return <Backlog key={JSON.stringify([id, sprintId])} sprintId={sprintId} />
  }
  return <Missing title="Board view unavailable" to="/_workitems" />
}

function TeamSelector() {
  const { data } = useStore()
  const { project, section, team, teams } = useProject()
  const navigate = useProjectNav()
  return <Select aria-label="Team" options={optionsFor(teams)} value={team?.id ?? ''} empty={!team ? 'Choose a team' : undefined}
    onChange={(event) => {
      const next = find(teams, event.target.value)
      if (!next) return
      const sprints = sprintChoices(data, project.id, next.id)
      const nextSprint = find(sprints, next.defaultSprintId) ?? sprints[0]
      navigate(teamPath(section, next.id, nextSprint?.id ?? 'unavailable'))
    }} />
}

function Kanban() {
  const { data, user, commit, notify } = useStore()
  const { project, team, sprint } = useProject()
  const navigate = useProjectNav()
  const [drag, setDrag] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  if (!team) return <><PageHead title="Boards"><TeamSelector /></PageHead><Missing title="Team board unavailable" to="/_workitems" /></>
  const from = teamPath('_boards', team.id)
  async function move(id, status, before) {
    if (!id) return
    try {
      await commit((current, actor, now) => moveCard(current, project.id, team.id, id, status, before, actor, now))
      setError('')
    } catch (failure) { setError(failure.message) }
  }
  function dragDone() { setDrag(null); setDropTarget(null) }
  function drop(event, status, before) {
    event.preventDefault()
    event.stopPropagation()
    move(drag, status, before)
    dragDone()
  }
  async function add(event) {
    event.preventDefault()
    try {
      const { tags, ...draft } = workDraft(null, team, sprint, 'User Story')
      await commit((state, actor, now) => saveWork(state, project.id, team.id, null, { ...draft, title, storyPoints: null,
        tags: [], assignedToId: null, sprintId: sprint?.id ?? null, parentId: null }, actor, now))
      setTitle('')
      setAdding(false)
      setError('')
      notify('User story created')
    } catch (failure) { setError(failure.message) }
  }
  return <>
    <PageHead title={team.name ?? 'Team board'} subtitle="Stories board">
      <TeamSelector /><PLink className="button" to={teamPath('_backlogs', team.id)}>View as backlog</PLink>
    </PageHead>
    <ErrorText error={error} />
    <div className="board">
      {workStates.map((status, index) => {
        const cards = lane(data, team.id, status, project.id)
        const limit = team.wipLimits?.[status]
        return <section className={'lane' + (dropTarget === status ? ' drop-lane' : '')} key={status}
          onDragOver={(event) => { if (drag) { event.preventDefault(); setDropTarget(status) } }}
          onDrop={(event) => drop(event, status)}>
          <header><h3>{status}</h3><span className={limit != null && cards.length > limit ? 'wip exceeded' : 'wip'}>{cards.length}{limit != null && ' / ' + limit + ' WIP'}</span></header>
          <div className="lane-cards">
            {index === 0 && (adding ? <form className="board-card stack" onSubmit={add}>
              <Field label="Story title"><input autoFocus required value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
              <div className="actions"><Button primary type="submit">Add story</Button><Button onClick={() => { setAdding(false); setTitle('') }}>Cancel</Button></div>
            </form> : <Button className="quick-add" disabled={!user} onClick={() => setAdding(true)}><Plus size={15} /> New item</Button>)}
            {cards.map((row) => <article className={'board-card' + (dropTarget === row.id ? ' card-drop' : '')} key={row.id} draggable={Boolean(user)}
              onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', row.id); setDrag(row.id) }}
              onDragEnd={dragDone} onDragOver={(event) => { if (drag) { event.preventDefault(); event.stopPropagation(); setDropTarget(row.id) } }}
              onDrop={(event) => drop(event, status, row.id)}
              onKeyDown={(event) => {
                if (!user || !event.shiftKey || !['ArrowLeft','ArrowRight'].includes(event.key)) return
                const target = workStates[index + (event.key === 'ArrowRight' ? 1 : -1)]
                if (target) {
                  event.preventDefault()
                  move(row.id, target)
                  requestAnimationFrame(() => document.getElementById('card-' + row.id)?.focus())
                }
              }}>
              <div className="inline spread"><span className="meta"><TypeIcon type={row.type} /> #{row.id}</span>
                <ActionMenu label={<><span className="visually-hidden">Move to column</span><ChevronDown size={14} /></>} disabled={!user}>
                  {workStates.filter((target) => target !== status).map((target) => <button key={target} onClick={() => move(row.id, target)}>{target}</button>)}
                  {cards[0]?.id !== row.id && <button onClick={() => move(row.id, status, cards[0]?.id)}>Move to top</button>}
                  {cards.at(-1)?.id !== row.id && <button onClick={() => move(row.id, status)}>Move to bottom</button>}
                </ActionMenu>
              </div>
              <PLink id={'card-' + row.id} to={editorPath(row.id) + paramsFor(from)}>{row.title ?? '(Untitled work item)'}</PLink>
              <div className="inline spread"><Person id={row.assignedToId} />{row.storyPoints != null && <span className="meta">{row.storyPoints} pts</span>}</div>
              <Tags tags={row.tags} />
            </article>)}
            {!cards.length && index !== 0 && <p className="lane-empty">No work items</p>}
          </div>
        </section>
      })}
    </div>
  </>
}

function Backlog({ sprintId }) {
  const { data, user, commit, notify } = useStore()
  const { project, team, section, sprints } = useProject()
  const navigate = useProjectNav()
  const [selection, setSelection] = useState([])
  const [dialog, setDialog] = useState('')
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const sprint = find(sprints, sprintId)
  if (!team || (sprintId && !sprint)) return <>
    <PageHead title={sprintId ? 'Sprints' : 'Backlogs'}><TeamSelector />
      {team && sprints.length > 0 && <Select aria-label="Choose sprint" empty="Choose sprint" options={optionsFor(sprints)} onChange={(event) => navigate(teamPath(section, team.id, event.target.value))} />}
    </PageHead>
    <Missing title={!team ? 'Team unavailable' : 'Sprint unavailable'} to="/_workitems" />
  </>
  const from = teamPath(section, team.id, sprintId)
  const rows = scoped(data.workItems, project.id).filter((row) => row.teamId === team.id && (!sprint || row.sprintId === sprint.id)).sort(byBoard)
  const members = list(team.memberIds).map((id) => find(data.users, id)).filter(Boolean)
  const visibleIds = selection.filter((id) => find(rows, id))
  const toggle = (id) => setSelection(selection.includes(id) ? selection.filter((value) => value !== id) : [...selection,id])
  const relative = () => {
    const today = new Date().toISOString().slice(0, 10)
    if (!sprint?.startDate || !sprint?.endDate) return ''
    return today < sprint.startDate ? 'Upcoming' : today > sprint.endDate ? 'Past sprint' : 'Current sprint'
  }
  function open(field) { setDialog(field); setValue(''); setError('') }
  async function submit(event) {
    event.preventDefault()
    try {
      await commit((state, actor, now) => bulkWork(state, project.id, team.id, visibleIds, dialog, value || null, actor, now))
      notify(visibleIds.length + ' work item' + (visibleIds.length === 1 ? '' : 's') + ' updated')
      setDialog('')
      setSelection([])
    } catch (failure) { setError(failure.message) }
  }
  return <>
    <PageHead title={sprint ? sprint.name ?? 'Sprint' : 'Backlogs'} subtitle={sprint
      ? [team.name, sprint.startDate && sprint.endDate ? sprint.startDate + ' – ' + sprint.endDate : '', relative()].filter(Boolean).join(' · ')
      : team.name}><NewWork disabled={!user} from={from} /></PageHead>
    <div className="toolbar">
      <TeamSelector />
      <Select aria-label="Sprint choices" empty="Choose sprint" value={sprintId ?? ''} options={optionsFor(sprints)} onChange={(event) => {
        if (event.target.value) navigate(teamPath('_sprints', team.id,event.target.value))
      }} />
      {sprint && <PLink className="button" to={teamPath('_backlogs', team.id)}>Backlog</PLink>}
      <Button onClick={() => setSelection(visibleIds.length === rows.length ? [] : rows.map((row) => row.id))} disabled={!rows.length}>{visibleIds.length === rows.length && rows.length ? 'Clear selection' : 'Select all'}</Button>
      <Button onClick={() => open('assignedToId')} disabled={!user || !visibleIds.length}>Assign to</Button>
      <Button onClick={() => open('sprintId')} disabled={!user || !visibleIds.length}>Move to iteration</Button>
      <span className="meta">{visibleIds.length} selected</span>
    </div>
    <WorkTable rows={rows} from={from} parents selection={visibleIds} toggle={toggle} />
    {dialog && <Dialog title={dialog === 'sprintId' ? 'Move to iteration' : 'Assign to'} onClose={() => setDialog('')}>
      <form onSubmit={submit}><div className="dialog-body">
        <Field label={dialog === 'sprintId' ? 'Iteration' : 'Team member'}>
          <Select autoFocus value={value} empty={dialog === 'sprintId' ? 'Unscheduled' : 'Unassigned'} options={dialog === 'sprintId' ? optionsFor(sprints,'path') : optionsFor(members,'displayName')} onChange={(event) => setValue(event.target.value)} />
        </Field><ErrorText error={error} />
      </div><footer><Button onClick={() => setDialog('')}>Cancel</Button><Button type="submit" primary>Apply</Button></footer></form>
    </Dialog>}
  </>
}

const clauseFields = [['type','Work item type'],['state','State'],['assignedToId','Assigned to'],['sprintId','Iteration'],['title','Title']]
const emptyClause = () => ({ field: 'type', operator: 'equals', value: 'Bug' })

function Queries() {
  const { data, user, commit, notify } = useStore()
  const { project } = useProject()
  const [selected, setSelected] = useState(null)
  const [name, setName] = useState('')
  const [scope, setScope] = useState('my')
  const [clauses, setClauses] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const queries = scoped(data.queries, project.id).filter((row) => row.scope === 'shared' || row.scope === 'my' && row.createdBy === user?.id)
  const members = memberList(data, project)
  const iterations = scoped(data.sprints, project.id)
  const rows = scoped(data.workItems, project.id)
  const values = { type: workTypes, state: workStates, assignedToId: optionsFor(members,'displayName'), sprintId: optionsFor(iterations,'path') }
  const clauseValue = (field) => { const first = values[field]?.[0]; return Array.isArray(first) ? '' : first ?? '' }
  function load(row) {
    setSelected(row?.id ?? null); setName(row?.name ?? ''); setScope(row?.scope ?? 'my'); setClauses(list(row?.clauses)); setResult(null); setError('')
  }
  function patch(index, fields) {
    setClauses(clauses.map((clause, i) => i === index ? { ...clause, ...fields } : clause))
  }
  function clean() {
    return clauses.map((clause) => ({
      ...clause, value: clause.value === '' && ['assignedToId','sprintId'].includes(clause.field) ? null : clause.value,
    }))
  }
  async function save(event) {
    event.preventDefault()
    try {
      const id = await commit((state, actor, now) => {
        requireThat(name.trim(), 'Enter a query name.')
        const all = list(state.queries)
        const original = find(scoped(all, project.id), selected)
        requireThat(!selected || original && (original.scope === 'shared' || original.createdBy === actor), 'This query is unavailable.')
        const row = { ...(original ?? created(actor, now)), id: original?.id ?? nextId(all, 'query-'), projectId: project.id,
          name: name.trim(), scope, clauses: clean(), ...stamp(actor, now) }
        return [{ ...state, queries: original ? update(all, row) : [...all, row] }, row.id]
      })
      setSelected(id)
      setError('')
      notify('Query saved')
    } catch (failure) { setError(failure.message) }
  }
  return <>
    <PageHead title="Queries"><Button onClick={() => load(null)}><Plus size={16} /> New query</Button></PageHead>
    <div className="split left">
      <Panel><div className="stack">
        {[['my','My Queries'],['shared','Shared Queries']].map(([group,label]) => <div key={group} className="side-group"><h3>{label}</h3>
          {queries.filter((row) => row.scope === group).sort((a,b) => String(a.name).localeCompare(b.name)).map((row) => <button type="button" key={row.id} className={selected === row.id ? 'selected' : ''} onClick={() => load(row)}>{row.name ?? row.id}</button>)}
          {!queries.some((row) => row.scope === group) && <p className="meta">No saved queries</p>}</div>)}
      </div></Panel>
      <div className="stack">
        <Panel title="Flat list of work items"><form className="stack" onSubmit={save}>
          <div className="field-grid"><Field label="Query name"><input required value={name} onChange={(event) => setName(event.target.value)} /></Field>
            <Field label="Folder"><Select value={scope} onChange={(event) => setScope(event.target.value)} options={[[ 'my','My Queries'],['shared','Shared Queries']]} /></Field></div>
          {clauses.map((clause, index) => <div className="query-clause" key={index}>
            <span className="meta">{index ? 'AND' : 'Where'}</span>
            <Select aria-label={'Field ' + (index + 1)} value={clause.field} options={clauseFields} onChange={(event) => patch(index, { field: event.target.value, operator: 'equals', value: clauseValue(event.target.value) })} />
            <Select aria-label={'Operator ' + (index + 1)} value={clause.operator} options={clause.field === 'title' ? [['equals','Equals'],['contains','Contains']] : [['equals','Equals']]}
              onChange={(event) => patch(index, { operator: event.target.value })} />
            {clause.field === 'title' ? <input aria-label={'Value ' + (index + 1)} value={clause.value ?? ''} onChange={(event) => patch(index, { value: event.target.value })} />
              : <Select aria-label={'Value ' + (index + 1)} value={clause.value ?? ''} options={values[clause.field] ?? []}
                empty={clause.field === 'assignedToId' ? 'Unassigned' : clause.field === 'sprintId' ? 'Unscheduled' : undefined}
                onChange={(event) => patch(index, { value: event.target.value })} />}
            <Button onClick={() => setClauses(clauses.filter((_,i) => i !== index))} aria-label={'Remove clause ' + (index + 1)}>Remove</Button>
          </div>)}
          <ErrorText error={error} />
          <div className="actions"><Button onClick={() => setClauses([...clauses,emptyClause()])}><Plus size={15} /> Add clause</Button>
            <Button onClick={() => setResult(clean())}>Run Query</Button>
            <Button type="submit" primary disabled={!user}>Save query</Button></div>
        </form></Panel>
        {result && <WorkTable from="/_queries" rows={ordered(rows.filter((row) => result.every(({ field, operator, value }) => operator === 'contains'
          ? includes(row[field], value) : field === 'title' ? String(row[field] ?? '').toLowerCase() === String(value ?? '').toLowerCase() : (row[field] ?? null) === value)))} />}
      </div>
    </div>
  </>
}
