import React, { useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowUp, Box, ClipboardList, Play, Plus } from 'lucide-react'
import { Button, Code, Dialog, Empty, ErrorText, Field, Missing, MultiSelect, PageHead, Panel, Person, Select, Status, Table, dateText, human } from '../components/ui.jsx'
import { PLink, useProject, useProjectNav, useQuery } from '../navigation.jsx'
import { useStore } from '../store.jsx'
import { byNewest, find, includes, list, memberList, nextId, scoped, segment } from '../model.js'
import { createRelease, decideApproval, deploymentReason, deployStage, releaseArtifacts, saveReleaseDefinition, stageAttempts } from '../releaseModel.js'
import { runPath } from './Pipelines.jsx'

const releaseHub = (id) => '/_release' + (id ? '?definitionId=' + segment(id) : '')
const definitionPath = (id) => '/_releaseDefinition' + (id ? '?definitionId=' + segment(id) : '')
const releasePath = (id,stageId) => '/_releaseProgress?releaseId=' + segment(id) + (stageId ? '&stageId=' + segment(stageId) : '')
const options = (rows) => rows.map((row) => [row.id,row.name ?? row.id])

export default function Releases() {
  const { data } = useStore()
  const { project,section } = useProject()
  const [params] = useQuery()
  const definitions = scoped(data.releaseDefinitions,project.id)
  if (section === '_releaseProgress') {
    const release = find(scoped(data.releases,project.id),params.get('releaseId'))
    return release ? <ReleaseDetail key={release.id} release={release} /> : <Missing title="Release unavailable" to="/_release" />
  }
  const definitionId = params.get('definitionId')
  const definition = find(definitions,definitionId)
  if (definitionId && !definition) return <Missing title="Release definition unavailable" to="/_release" />
  if (section === '_releaseDefinition') return <DefinitionEditor key={definitionId ?? 'new'} definition={definition} />
  return <ReleaseHub key={project.id} definitions={definitions} definition={definition ?? definitions[0]} />
}

function ReleaseHub({ definitions,definition }) {
  const { data,user } = useStore()
  const { project } = useProject()
  const [params,setQuery] = useQuery()
  const [filter,setFilter] = useState('')
  const pipelines = scoped(data.pipelines,project.id)
  const rows = scoped(data.releases,project.id).filter((row) => row.definitionId === definition?.id).sort(byNewest)
  const matching = definitions.filter((row) => includes(row.name,filter))
  const artifacts = releaseArtifacts(data,project.id,definition)
  const canCreate = user && artifacts.length > 0 && list(definition?.stages).length > 0
  const creating = params.get('create') === '1'
  return <>
    <PageHead title="Releases" subtitle="Classic release pipelines">
      {user && pipelines.length ? <PLink className="button" to={definitionPath()}><Plus size={16} /> New release pipeline</PLink>
        : <Button disabled title="A source pipeline and signed-in user are required"><Plus size={16} /> New release pipeline</Button>}
    </PageHead>
    <div className="split left">
      <Panel title="Release pipelines"><div className="stack">
        <input type="search" placeholder="Search all pipelines" aria-label="Search release pipelines" value={filter} onChange={(event) => setFilter(event.target.value)} />
        <div className="side-group">{matching.map((row) => <PLink key={row.id} className={definition?.id === row.id ? 'selected' : ''} to={releaseHub(row.id)}>{row.name ?? row.id}</PLink>)}
          {!matching.length && <p className="meta">No matching release pipelines</p>}</div>
      </div></Panel>
      {definition ? <div className="stack">
        <Panel><div className="inline spread">
          <div><h2>{definition.name ?? definition.id}</h2>
            <p className="meta">{find(pipelines,definition.artifactPipelineId)?.name ?? 'Source pipeline unavailable'}</p></div>
          <div className="actions"><PLink className="button" to={definitionPath(definition.id)}>Edit</PLink>
            <Button primary disabled={!canCreate} title={!canCreate ? 'This release needs a signed-in user, stages, and a successful build artifact' : undefined}
              onClick={() => setQuery({ definitionId:definition.id,create:'1' })}>Create release</Button></div>
        </div></Panel>
        <Table columns={['Release','Artifact version','Created by','Stages','Created']} rows={rows} empty="No releases for this pipeline" render={(row) =>
          <><td><PLink to={releasePath(row.id)}>{row.name ?? 'Release-' + row.id}</PLink></td>
            <td className="number">{row.artifactVersion ?? '—'}</td><td><Person id={row.createdBy} /></td>
            <td><div className="inline">{list(row.stages).map((stage) => <PLink className="stage-badge" key={stage.id} to={releasePath(row.id,stage.id)}>
              {stage.name ?? stage.id} <Status value={stage.status} /></PLink>)}</div></td><td className="meta">{dateText(row.createdAt)}</td></>} />
      </div> : <Empty title="No release pipelines yet"><p>Connect a pipeline artifact to a release stage.</p></Empty>}
    </div>
    {creating && definition && <CreateRelease key={definition.id} definition={definition} artifacts={artifacts} onClose={() => setQuery({ create:null })} />}
  </>
}

function DefinitionEditor({ definition }) {
  const { data,user,commit,notify } = useStore()
  const { project } = useProject()
  const navigate = useProjectNav()
  const pipelines = scoped(data.pipelines,project.id)
  const members = memberList(data,project)
  const [originalDefinition] = useState(definition)
  const [name,setName] = useState(definition?.name ?? '')
  const [artifact,setArtifact] = useState(definition?.artifactPipelineId ?? '')
  const [stages,setStages] = useState(() => definition ? list(definition.stages) : [{ id:'stage-1',name:'',dependsOnStageId:null,approverIds:[] }])
  const [error,setError] = useState('')
  const patch = (id,fields) => setStages(stages.map((row) => row.id === id ? { ...row,...fields } : row))
  function reposition(index,direction) {
    const target = index + direction
    if (target < 0 || target >= stages.length) return
    const next = [...stages]
    ;[next[target],next[index]] = [next[index],next[target]]
    setStages(next.map((row,i) => i > next.findIndex((item) => item.id === row.dependsOnStageId) ? row : { ...row,dependsOnStageId:null }))
  }
  function remove(id) {
    setStages(stages.filter((row) => row.id !== id).map((row) => row.dependsOnStageId === id ? { ...row,dependsOnStageId:null } : row))
  }
  async function submit(event) {
    event.preventDefault()
    try {
      const result = await commit((state,actor,now) => saveReleaseDefinition(state,project.id,originalDefinition,{ name,artifactPipelineId:artifact,stages },actor,now))
      notify('Release pipeline saved')
      navigate(releaseHub(result.id))
    } catch (failure) { setError(failure.message) }
  }
  const canCreate = user && definition && releaseArtifacts(data,project.id,definition).length > 0 && list(definition.stages).length > 0
  return <>
    <PageHead title={definition ? definition.name ?? 'Edit release pipeline' : 'New release pipeline'} subtitle={definition ? 'Edit release pipeline' : undefined}>
      <PLink className="button" to={releaseHub(definition?.id)}><ArrowLeft size={15} /> Releases</PLink>
      {canCreate && <PLink className="button" to={releaseHub(definition.id) + '&create=1'}>Create release</PLink>}
      <Button form="release-definition" primary type="submit" disabled={!user || !pipelines.length || !stages.length}>Save</Button>
    </PageHead>
    <form id="release-definition" className="stack" onSubmit={submit}>
      <ErrorText error={error} />
      <Panel title="Pipeline"><div className="field-grid">
        <Field label="Release pipeline name"><input required value={name} onChange={(event) => setName(event.target.value)} /></Field>
        <Field label="Artifact source pipeline"><Select required options={options(pipelines)} empty="Select a pipeline" value={artifact} onChange={(event) => setArtifact(event.target.value)} /></Field>
      </div>{!pipelines.length && <p className="muted">Create a YAML pipeline before adding an artifact. <PLink to="/_build">Open Pipelines</PLink></p>}</Panel>
      <Panel><div className="stage-heading inline spread"><h2>Stages</h2><Button onClick={() => setStages([...stages,{ id:nextId(stages,'stage-'),name:'',dependsOnStageId:null,approverIds:[] }])}><Plus size={15} /> Add stage</Button></div>
        {stages.length ? <div className="stage-grid edit-stages">{stages.map((stage,index) => <article className="stage-card" key={stage.id}>
          <div className="stage-actions inline spread">
            <h3>{stage.name || 'Stage ' + (index + 1)}</h3>
            <div className="inline"><Button className="icon-button" onClick={() => reposition(index,-1)} aria-label="Move stage earlier" disabled={index === 0}><ArrowUp size={15} /></Button>
              <Button className="icon-button" onClick={() => reposition(index,1)} aria-label="Move stage later" disabled={index === stages.length - 1}><ArrowDown size={15} /></Button></div>
          </div>
          <Field label="Stage name"><input required value={stage.name ?? ''} onChange={(event) => patch(stage.id,{ name:event.target.value })} /></Field>
          <Field label="Prerequisite"><Select value={stage.dependsOnStageId ?? ''} empty="No prerequisite" options={stages.slice(0,index).map((row,i) => [row.id,row.name || 'Stage ' + (i + 1)])}
            onChange={(event) => patch(stage.id,{ dependsOnStageId:event.target.value || null })} /></Field>
          <Field label="Pre-deployment approvers"><MultiSelect value={list(stage.approverIds)} options={members.map((row) => [row.id,row.displayName ?? row.id])}
            onChange={(ids) => patch(stage.id,{ approverIds:ids })} /></Field>
          <Button onClick={() => remove(stage.id)}>Remove stage</Button>
        </article>)}</div> : <p className="muted">Add at least one stage.</p>}
      </Panel>
    </form>
  </>
}

function CreateRelease({ definition,artifacts,onClose }) {
  const { user,commit,notify } = useStore()
  const { project } = useProject()
  const navigate = useProjectNav()
  const [artifact,setArtifact] = useState([...artifacts].sort(byNewest)[0]?.id ?? '')
  const [description,setDescription] = useState('')
  const [error,setError] = useState('')
  async function submit(event) {
    event.preventDefault()
    try {
      const release = await commit((state,actor,now) => createRelease(state,project.id,definition.id,artifact,description,actor,now))
      notify(release.name + ' created')
      navigate(releasePath(release.id))
    } catch (failure) { setError(failure.message) }
  }
  return <Dialog drawer title="Create release" onClose={onClose}><form onSubmit={submit}>
    <div className="dialog-body"><h3>{definition.name ?? definition.id}</h3>
      <Field label="Artifact version"><Select required autoFocus value={artifact} empty="Select a successful build"
        options={[...artifacts].sort(byNewest).map((row) => [row.id,(row.version ?? row.id) + ' · ' + (row.name ?? 'Artifact')])}
        onChange={(event) => setArtifact(event.target.value)} /></Field>
      <Field label="Description"><textarea value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
      <h3>Stages</h3><ul className="plain-list">{list(definition.stages).map((stage) => <li key={stage.id}>{stage.name ?? stage.id} <Status value={stage.dependsOnStageId ? 'blocked' : 'ready'} /></li>)}</ul>
      <ErrorText error={error || (!artifacts.length ? 'No successful build artifacts are available.' : '')} />
    </div><footer><Button onClick={onClose}>Cancel</Button><Button type="submit" primary disabled={!user || !find(artifacts,artifact) || !list(definition.stages).length}>Create</Button></footer>
  </form></Dialog>
}

function ReleaseDetail({ release }) {
  const { data,user,commit,notify } = useStore()
  const { project } = useProject()
  const [params,setQuery] = useQuery()
  const [modal,setModal] = useState(null)
  const [error,setError] = useState('')
  const stages = list(release.stages)
  const selectedId = params.get('stageId')
  const selected = selectedId ? find(stages,selectedId) : stages[0]
  const definition = find(scoped(data.releaseDefinitions,project.id),release.definitionId)
  const run = find(scoped(data.pipelineRuns,project.id),release.runId)
  const approvalRows = list(data.releaseApprovals).filter((row) => row.releaseId === release.id)
  function open(stage,view,deploymentId) {
    setError('')
    setQuery({ stageId:stage.id })
    setModal({ stageId:stage.id,view,deploymentId })
  }
  async function deploy() {
    try {
      const attempt = await commit((state,actor,now) => deployStage(state,project.id,release.id,modal.stageId,actor,now))
      notify(attempt.status === 'pendingApproval' ? 'Deployment is waiting for approval' : 'Deployment succeeded')
      setModal(null)
    } catch (failure) { setError(failure.message) }
  }
  const modalStage = find(stages,modal?.stageId)
  const modalAttempts = modalStage ? stageAttempts(data,release,modalStage.id) : []
  let view
  if (modalStage && modal.view === 'logs') view = <LogsDrawer key={modalStage.id + ':' + modal.deploymentId} stage={modalStage} attempts={modalAttempts} deploymentId={modal.deploymentId} onClose={() => setModal(null)} />
  if (modalStage && modal.view === 'approvals') view = <ApprovalsDrawer key={modal.deploymentId} release={release} stage={modalStage}
    attempt={find(modalAttempts,modal.deploymentId)} approvals={approvalRows.filter((row) => row.deploymentId === modal.deploymentId)} onClose={() => setModal(null)} />
  if (modalStage && modal.view === 'deploy') view = <Dialog drawer title={modalAttempts.length ? 'Redeploy stage' : 'Deploy stage'} onClose={() => setModal(null)}>
    <div className="dialog-body"><h3>{modalStage.name ?? modalStage.id}</h3>
      <p>Deploy {release.artifactVersion ?? 'the pinned artifact'} from {release.name ?? 'this release'}?</p>
      {list(modalStage.approverIds).length > 0 && <p className="meta">This stage requires pre-deployment approval.</p>}
      <ErrorText error={error} />
    </div><footer><Button onClick={() => setModal(null)}>Cancel</Button><Button primary onClick={deploy}>{modalAttempts.length ? 'Redeploy' : 'Deploy'}</Button></footer>
  </Dialog>
  return <>
    <PageHead title={release.name ?? 'Release-' + release.id} subtitle={definition?.name}><PLink className="button" to={releaseHub(definition?.id)}><ArrowLeft size={15} /> Releases</PLink></PageHead>
    <div className="toolbar"><Status value={release.status} /><Person id={release.createdBy} /><span className="meta">{dateText(release.createdAt)}</span></div>
    <div className="stack">
      <Panel title="Release summary"><dl className="facts"><dt>Artifact version</dt><dd><Box size={15} /> {release.artifactVersion ?? 'Unavailable'}</dd>
        <dt>Pipeline run</dt><dd>{run ? <PLink to={runPath(run.id)}>{run.number ?? run.id}</PLink> : 'Unavailable run'}</dd>
        <dt>Description</dt><dd className="prose">{release.description || 'No description provided.'}</dd></dl></Panel>
      <Panel title="Stages">
        {stages.length ? <div className="stage-grid">{stages.map((stage) => {
          const attempts = stageAttempts(data,release,stage.id)
          const latest = find(attempts,stage.latestDeploymentId) ?? attempts[0]
          const reason = deploymentReason(data,release,stage)
          return <article className={'stage-card' + (stage.id === selected?.id ? ' stage-selected' : '')} key={stage.id}>
            <button className="link-button" onClick={() => setQuery({ stageId:stage.id })}>{stage.name ?? stage.id}</button>
            <Status value={stage.status} />
            {stage.dependsOnStageId && <span className="meta">After {find(stages,stage.dependsOnStageId)?.name ?? 'unavailable stage'}</span>}
            {latest && <span className="meta">Attempt {latest.attempt ?? '—'}</span>}
            <div className="actions">
              {stage.status === 'pendingApproval' && latest ? <Button onClick={() => open(stage,'approvals',latest.id)}>Approvals</Button>
                : <Button disabled={!user || Boolean(reason)} title={reason || (!user ? 'A signed-in user is required' : undefined)}
                  onClick={() => open(stage,'deploy')}><Play size={13} /> {attempts.length ? 'Redeploy' : 'Deploy'}</Button>}
              <Button disabled={!latest} title={!latest ? 'Deploy this stage before viewing logs' : undefined} onClick={() => open(stage,'logs',latest.id)}>Logs</Button>
            </div>
          </article>
        })}</div> : <p className="muted">No stages are available.</p>}
      </Panel>
      {selected ? <AttemptHistory selected={selected} attempts={stageAttempts(data,release,selected.id)} approvals={approvalRows} onOpen={open} />
        : selectedId && <Missing title="Release stage unavailable" to={releasePath(release.id)} />}
    </div>{view}
  </>
}

function AttemptHistory({ selected,attempts,approvals,onOpen }) {
  return <Panel title={(selected.name ?? selected.id) + ' deployment history'}><Table columns={['Attempt','Status','Requested by','Finished','Actions']}
    rows={attempts} empty="No deployment attempts yet" render={(row) => <>
      <td>{row.attempt ?? '—'}</td><td><Status value={row.status} /></td><td><Person id={row.requestedBy} /></td>
      <td className="meta">{dateText(row.finishedAt)}</td><td><div className="actions">
        <Button onClick={() => onOpen(selected,'logs',row.id)}>Logs</Button>
        {approvals.some((approval) => approval.deploymentId === row.id) && <Button onClick={() => onOpen(selected,'approvals',row.id)}>Approvals</Button>}
      </div></td>
    </>} /></Panel>
}

function ApprovalsDrawer({ release,stage,attempt,approvals,onClose }) {
  const { data,user,commit,notify } = useStore()
  const { project } = useProject()
  const [comment,setComment] = useState('')
  const [error,setError] = useState('')
  const canDecide = user && stage.latestDeploymentId === attempt?.id && attempt?.status === 'pendingApproval' &&
    approvals.some((row) => row.approverId === user.id && row.status === 'pending')
  const artifact = find(scoped(data.pipelineArtifacts,project.id),release.artifactId)
  const usableArtifact = artifact && artifact.runId === release.runId
  async function decide(approved) {
    try {
      const result = await commit((state,actor,now) => decideApproval(state,project.id,release.id,stage.id,attempt.id,approved,comment,actor,now))
      notify(result === 'succeeded' ? 'Deployment approved and completed' : result === 'rejected' ? 'Deployment rejected' : 'Approval recorded')
      onClose()
    } catch (failure) { setError(failure.message) }
  }
  return <Dialog drawer title={stage.name ?? stage.id} onClose={onClose}>
    <div className="dialog-body"><h3>Pre-deployment approvals</h3><Status value={attempt?.status} />
      {approvals.map((row) => <div className="approval-row stack" key={row.id}>
        <div className="inline spread"><Person id={row.approverId} /><Status value={row.status} /></div>
        {row.comment && <p className="prose">{row.comment}</p>}{row.decidedAt && <span className="meta">{dateText(row.decidedAt)}</span>}
      </div>)}
      {!approvals.length && <p className="muted">No approval requests for this attempt.</p>}
      {canDecide && <Field label="Comment"><textarea value={comment} onChange={(event) => setComment(event.target.value)} /></Field>}
      <ErrorText error={error} />
    </div><footer>{canDecide && <><Button onClick={() => decide(false)}>Reject</Button>
      <Button primary disabled={!usableArtifact} title={!usableArtifact ? 'The pinned artifact is unavailable' : undefined} onClick={() => decide(true)}>Approve</Button></>}
      {!canDecide && <Button onClick={onClose}>Close</Button>}</footer>
  </Dialog>
}

function LogsDrawer({ stage,attempts,deploymentId,onClose }) {
  const [id,setId] = useState(deploymentId)
  const [index,setIndex] = useState(0)
  const attempt = find(attempts,id)
  const steps = list(attempt?.logs)
  const selected = steps[index]
  return <Dialog drawer title={(stage.name ?? stage.id) + ' logs'} onClose={onClose}>
    <div className="dialog-body">
      <Field label="Deployment attempt"><Select options={attempts.map((row) => [row.id,'Attempt ' + row.attempt + ' · ' + human(row.status)])}
        value={id} onChange={(event) => { setId(event.target.value); setIndex(0) }} /></Field>
      <Status value={attempt?.status} />
      <div className="side-group">{steps.map((step,i) => <button type="button" onClick={() => setIndex(i)} key={i} className={i === index ? 'selected' : ''}>
        <ClipboardList size={15} /> {step.step ?? 'Deployment step'} · {human(step.status)}</button>)}</div>
      {selected ? <Code dark text={list(selected.lines).join('\n')} /> : <p className="muted">No logs are available.</p>}
    </div><footer><Button onClick={onClose}>Close</Button></footer>
  </Dialog>
}
