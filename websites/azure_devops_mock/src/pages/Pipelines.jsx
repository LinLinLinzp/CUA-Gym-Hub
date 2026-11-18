import React, { useState } from 'react'
import { ArrowLeft, Download, FileCode2, GitBranch, GitCommitHorizontal, Play, Plus, SquareTerminal } from 'lucide-react'
import { Button, Code, Dialog, Empty, ErrorText, Field, Missing, PageHead, Panel, Person, Select, Status, Table, Tabs, dateText, human } from '../components/ui.jsx'
import { PLink, useProject, useProjectNav, useQuery } from '../navigation.jsx'
import { useStore } from '../store.jsx'
import { byNewest, find, includes, list, repoPath, requireThat, scoped, segment } from '../model.js'
import { hasHead, repoBranches } from '../git.js'
import { cancelRun, canCancel, checkYaml, createRun, isYamlPath, pipelineSource, savePipeline } from '../pipelineModel.js'
import { starterYaml } from '../data/seed.js'

export const pipelinePath = (id) => '/_build?definitionId=' + segment(id)
export const runPath = (id) => '/_build/results?buildId=' + segment(id)
const options = (rows) => rows.map((row) => [row.id,row.name ?? row.id])
const results = [['succeeded','Succeeded'],['failed','Failed'],['canceled','Canceled'],['queued','Queued'],['inProgress','In progress']]
const runState = (row) => row.result ?? row.status
const runName = (row) => row.number ? '#' + row.number : 'Run #' + row.id
const editPath = (id) => '/_build/definition/' + segment(id) + '/edit'

export default function Pipelines() {
  const { data } = useStore()
  const { project, route } = useProject()
  const [view, id, action] = route
  const [params] = useQuery()
  const pipelines = scoped(data.pipelines,project.id)
  const runs = scoped(data.pipelineRuns,project.id)
  if (route.length === 1 && view === 'new') return <PipelineEditor key={project.id + ':new'} />
  if (route.length === 1 && view === 'results') {
    const run = find(runs,params.get('buildId'))
    return run ? <RunDetail key={run.id} run={run} /> : <Missing title="Pipeline run unavailable" to="/_build?tab=runs" />
  }
  if (route.length === 3 && view === 'definition' && id && action === 'edit') {
    const pipeline = find(pipelines,id)
    return pipeline ? <PipelineEditor key={pipeline.id} pipeline={pipeline} /> : <Missing title="Pipeline definition unavailable" to="/_build" />
  }
  if (route.length) return <Missing title="Pipeline view unavailable" to="/_build" />
  if (params.has('definitionId')) {
    const pipeline = find(pipelines,params.get('definitionId'))
    return pipeline ? <Definition key={pipeline.id} pipeline={pipeline} runs={runs.filter((row) => row.pipelineId === pipeline.id)} /> : <Missing title="Pipeline definition unavailable" to="/_build" />
  }
  return <PipelineList key={project.id} pipelines={pipelines} runs={runs} />
}

function useRunFilters(rows,pipelines,filterByName = true) {
  const { data } = useStore()
  const [name,setName] = useState('')
  const [branch,setBranch] = useState('')
  const [result,setResult] = useState('')
  const choices = [...new Set(rows.map((row) => row.branchId).filter(Boolean))].map((id) => [id,find(data.branches,id)?.name ?? id])
  const filtered = rows.filter((row) => (!branch || row.branchId === branch) && (!result || runState(row) === result) &&
    (includes(find(pipelines,row.pipelineId)?.name,name) || includes(row.number,name) || includes(row.id,name))).sort(byNewest)
  const filters = <div className="toolbar">
    {filterByName && <input type="search" aria-label="Filter pipeline runs" placeholder="Filter pipeline runs" value={name} onChange={(event) => setName(event.target.value)} />}
    <Select aria-label="Branch filter" empty="All branches" options={choices} value={branch} onChange={(event) => setBranch(event.target.value)} />
    <Select aria-label="Result filter" empty="All results" options={results} value={result} onChange={(event) => setResult(event.target.value)} />
  </div>
  return { filters,filtered }
}

function PipelineList({ pipelines,runs }) {
  const { data,user } = useStore()
  const { project } = useProject()
  const [params,setQuery] = useQuery()
  const [filter,setFilter] = useState('')
  const [branch,setBranch] = useState('')
  const [result,setResult] = useState('')
  const tabs = [['recent','Recent'],['all','All'],['runs','Runs']]
  const view = tabs.some(([key]) => key === params.get('tab')) ? params.get('tab') : 'recent'
  const runFilters = useRunFilters(runs,pipelines)
  const latest = new Map()
  for (const run of [...runs].sort(byNewest)) if (!latest.has(run.pipelineId)) latest.set(run.pipelineId,run)
  const shown = pipelines.filter((row) => includes(row.name,filter) && (view === 'all' || latest.has(row.id)) &&
    (!branch || (latest.get(row.id)?.branchId ?? row.defaultBranchId) === branch) &&
    (!result || runState(latest.get(row.id) ?? {}) === result))
    .sort((a,b) => view === 'recent' ? byNewest(latest.get(a.id) ?? a,latest.get(b.id) ?? b) : String(a.name).localeCompare(b.name))
  const branchChoices = [...new Set(pipelines.map((row) => latest.get(row.id)?.branchId ?? row.defaultBranchId).filter(Boolean))]
    .map((id) => [id,find(data.branches,id)?.name ?? id])
  return <>
    <PageHead title="Pipelines">
      {user && scoped(data.repositories,project.id).length ? <PLink className="button primary" to="/_build/new"><Plus size={16} /> New pipeline</PLink> :
        <Button primary disabled title="A repository and signed-in user are required"><Plus size={16} /> New pipeline</Button>}
    </PageHead>
    <Tabs items={tabs} value={view} onChange={(tab) => setQuery({ tab:tab === 'recent' ? null : tab })} />
    {view === 'runs' ? <>{runFilters.filters}<RunTable rows={runFilters.filtered} pipelines={pipelines} /></> : <>
      <div className="toolbar"><input type="search" aria-label="Filter pipelines" placeholder="Filter pipelines" value={filter} onChange={(event) => setFilter(event.target.value)} />
        <Select aria-label="Branch filter" empty="All branches" options={branchChoices} value={branch} onChange={(event) => setBranch(event.target.value)} />
        <Select aria-label="Result filter" empty="All results" options={results} value={result} onChange={(event) => setResult(event.target.value)} />
      </div>
      <Table columns={['Pipeline','Last run','Branch','Result','Run date']} rows={shown} empty="No pipelines match this view" render={(row) => {
        const run = latest.get(row.id)
        return <>
          <td><PLink to={pipelinePath(row.id)}><SquareTerminal size={16} /> {row.name ?? row.id}</PLink></td>
          <td>{run ? <PLink to={runPath(run.id)}>{runName(run)}</PLink> : '—'}</td>
          <td>{find(data.branches,run?.branchId ?? row.defaultBranchId)?.name ?? '—'}</td>
          <td>{run ? <Status value={runState(run)} /> : '—'}</td>
          <td className="meta">{dateText(run?.createdAt)}</td>
        </>
      }} />
    </>}
  </>
}

function RunTable({ rows,pipelines }) {
  const { data } = useStore()
  return <Table columns={['Run','Pipeline','Branch','Result','Requested by','Created']} rows={rows} empty="No pipeline runs match this view" render={(row) =>
    <><td><PLink to={runPath(row.id)}>{runName(row)}</PLink></td>
      <td><PLink to={pipelinePath(row.pipelineId)}>{find(pipelines,row.pipelineId)?.name ?? row.pipelineId ?? 'Unknown pipeline'}</PLink></td>
      <td>{find(data.branches,row.branchId)?.name ?? 'Unavailable branch'}</td>
      <td><Status value={runState(row)} /></td><td><Person id={row.requestedBy} /></td><td className="meta">{dateText(row.createdAt)}</td></>} />
}

function Definition({ pipeline,runs }) {
  const { data,user } = useStore()
  const { project } = useProject()
  const [running,setRunning] = useState(false)
  const { filters,filtered } = useRunFilters(runs,[pipeline],false)
  const repo = find(scoped(data.repositories,project.id),pipeline.repoId)
  const branch = repo && find(repoBranches(data,repo.id),pipeline.defaultBranchId)
  const canRun = user && eligibleBranches(data,pipeline,project.id).length > 0
  return <>
    <PageHead title={pipeline.name ?? 'Pipeline'} subtitle={[repo?.name,branch?.name,pipeline.yamlPath].filter(Boolean).join(' · ')}>
      <PLink className="button" to="/_build">All pipelines</PLink><PLink className="button" to={editPath(pipeline.id)}>Edit</PLink>
      <Button primary disabled={!canRun} title={!canRun ? 'A signed-in user and branch with pipeline YAML are required' : undefined} onClick={() => setRunning(true)}><Play size={15} /> Run pipeline</Button>
    </PageHead>
    <h2 className="section-title">Runs</h2>{filters}<RunTable rows={filtered} pipelines={[pipeline]} />
    {running && <RunDialog pipeline={pipeline} onClose={() => setRunning(false)} />}
  </>
}

function PipelineEditor({ pipeline }) {
  const { data,user,commit,notify } = useStore()
  const { project } = useProject()
  const navigate = useProjectNav()
  const repos = scoped(data.repositories,project.id)
  const editing = Boolean(pipeline)
  const [originalPipeline] = useState(pipeline)
  const [step,setStep] = useState(editing ? 3 : 0)
  const [repoId,setRepo] = useState(pipeline?.repoId ?? '')
  const [branchId,setBranch] = useState(pipeline?.defaultBranchId ?? '')
  const [mode,setMode] = useState('existing')
  const [name,setName] = useState(pipeline?.name ?? '')
  const [path,setPath] = useState(pipeline?.yamlPath ?? '')
  const [yamlSource,setYamlSource] = useState(() => ({ path,files:pipelineSource(data,project.id,repoId,branchId,path).files }))
  const [yaml,setYaml] = useState(() => yamlSource.files.get(path) ?? '')
  const [error,setError] = useState('')
  const { repo,branch,ready,files } = pipelineSource(data,project.id,repoId,branchId,path)
  const branches = repo ? repoBranches(data,repo.id).filter((row) => hasHead(data,repo.id,row)) : []
  const yamlFiles = [...files.keys()].filter(isYamlPath)
  const defaultRepoName = repo?.name ? repo.name + ' CI' : ''
  const previous = editing ? pipelinePath(pipeline.id) : '/_build'
  function loadYaml(id,selectedBranch,selectedPath) {
    const { files,text } = pipelineSource(data,project.id,id,selectedBranch,selectedPath)
    setYamlSource({ path:selectedPath,files })
    setYaml(text ?? '')
  }
  function selectRepo(id) {
    const chosen = find(repos,id)
    const choices = chosen ? repoBranches(data,chosen.id).filter((row) => hasHead(data,chosen.id,row)) : []
    const selected = find(choices,chosen?.defaultBranchId) ?? choices[0]
    const nextPath = editing ? path : ''
    setRepo(id); setBranch(selected?.id ?? ''); setPath(nextPath)
    loadYaml(id,selected?.id,nextPath.trim())
  }
  function selectBranch(id) {
    setBranch(id)
    if (!editing) setPath('')
    loadYaml(repoId,id,editing ? path.trim() : '')
  }
  function review() {
    setError('')
    if (!name) setName(defaultRepoName)
    const chosen = path.trim() || 'azure-pipelines.yml'
    setPath(chosen)
    setYamlSource({ path:chosen,files })
    setYaml(files.get(chosen) ?? (mode === 'starter' ? starterYaml : ''))
    setStep(3)
  }
  function validate() {
    try { checkYaml(yaml); requireThat(isYamlPath(path.trim()), 'Enter a valid YAML path.'); setError(''); notify('YAML validation passed') }
    catch (failure) { setError(failure.message) }
  }
  async function submit(event) {
    event.preventDefault()
    const saveAndRun = event.nativeEvent.submitter?.value === 'run'
    try {
      const yamlPath = path.trim()
      const yamlEdit = yamlPath !== yamlSource.path || yaml !== (yamlSource.files.get(yamlSource.path) ?? '')
        ? { text:yaml,original:yamlSource.files.get(yamlPath) } : null
      const result = await commit((state,actor,now) => {
        const [next,definition] = savePipeline(state,project.id,originalPipeline,{ repoId,defaultBranchId:branchId,name,yamlPath,yamlEdit },actor,now)
        if (!saveAndRun) return [next,{ definition }]
        const [started,run] = createRun(next,project.id,definition.id,definition.defaultBranchId,{},null,actor,now)
        return [started,{ definition,run }]
      })
      notify(saveAndRun ? 'Pipeline saved and run completed' : 'Pipeline saved')
      navigate(saveAndRun ? runPath(result.run.id) : pipelinePath(result.definition.id))
    } catch (failure) { setError(failure.message) }
  }
  const stepNames = ['Connect','Select','Configure','Review']
  return <>
    <PageHead title={editing ? pipeline.name ?? 'Edit pipeline' : 'New pipeline'} subtitle={editing ? 'Edit YAML pipeline' : undefined}>
      <PLink className="button" to={previous}><ArrowLeft size={15} /> {editing ? 'Back to pipeline' : 'All pipelines'}</PLink></PageHead>
    {!editing && <ol className="steps" aria-label="Pipeline setup">{stepNames.map((label,index) => <li key={label} aria-current={index === step ? 'step' : undefined}>{label}</li>)}</ol>}
    {step === 0 && <Panel title="Where is your code?"><Button onClick={() => setStep(1)}><GitBranch size={17} /> Azure Repos Git</Button></Panel>}
    {step === 1 && <Panel title="Select a repository and branch"><div className="stack narrow">
      <Field label="Repository"><Select options={options(repos)} empty="Choose a repository" value={repoId} onChange={(event) => selectRepo(event.target.value)} /></Field>
      <Field label="Branch"><Select options={options(branches)} empty="Choose a branch" value={branchId} onChange={(event) => selectBranch(event.target.value)} /></Field>
      {repo && !branches.length && <p className="form-error">This repository has no branches with a commit. <PLink to={repoPath(repo)}>Open repository</PLink></p>}
      {!repos.length && <p className="muted">Create a repository to continue. <PLink to="/_git">Repos</PLink></p>}
      <div className="actions"><Button onClick={() => setStep(0)}>Back</Button><Button primary disabled={!ready} onClick={() => setStep(2)}>Continue</Button></div>
    </div></Panel>}
    {step === 2 && <Panel title="Configure your pipeline"><div className="stack narrow">
      <Field label="Configuration"><Select value={mode} options={[[ 'existing','Existing Azure Pipelines YAML file'],['starter','Starter pipeline']]}
        onChange={(event) => { setMode(event.target.value); setPath('') }} /></Field>
      {mode === 'existing' ? <Field label="YAML file path"><Select value={path} options={yamlFiles} empty="Choose a YAML file" onChange={(event) => setPath(event.target.value)} /></Field>
        : <Field label="YAML file path"><input value={path} placeholder="azure-pipelines.yml" onChange={(event) => setPath(event.target.value)} /></Field>}
      <div className="actions"><Button onClick={() => setStep(1)}>Back</Button>
        <Button primary disabled={mode === 'existing' ? !files.has(path) : Boolean(path) && !isYamlPath(path.trim())} onClick={review}>Review</Button></div>
    </div></Panel>}
    {step === 3 && <form className="split" onSubmit={submit}>
      <Panel title="YAML"><div className="stack">
        <div className="field-grid">
          <Field label="Pipeline name"><input value={name} required onChange={(event) => setName(event.target.value)} /></Field>
          <Field label="YAML path"><input required value={path} onChange={(event) => setPath(event.target.value)} /></Field>
          {editing && <><Field label="Repository"><Select value={repoId} options={options(repos)} empty="Choose a repository" onChange={(event) => selectRepo(event.target.value)} /></Field>
            <Field label="Branch"><Select value={branchId} options={options(branches)} empty="Choose a branch" onChange={(event) => selectBranch(event.target.value)} /></Field></>}
        </div>
        <Field label="YAML contents"><textarea className="mono yaml-text" value={yaml} required onChange={(event) => setYaml(event.target.value)} spellCheck={false} rows={17} /></Field>
        <ErrorText error={error} />
        <div className="actions">{!editing && <Button onClick={() => setStep(2)}>Back</Button>}<Button onClick={validate}>Validate</Button>
          <Button type="submit" disabled={!ready || !user}>Save</Button>
          <Button type="submit" primary value="run" disabled={!ready || !user}>Save and run</Button></div>
      </div></Panel>
      <Panel title="Source"><dl className="facts"><dt>Provider</dt><dd>Azure Repos Git</dd><dt>Repository</dt><dd>{repo ? <PLink to={repoPath(repo)}>{repo.name ?? repo.id}</PLink> : 'Unavailable'}</dd><dt>Branch</dt><dd>{branch?.name ?? 'Unavailable'}</dd></dl>
        {!ready && <p className="form-error">Choose a branch with an available commit.</p>}
        <div className="yaml-preview"><h3><FileCode2 size={15} /> YAML preview</h3><Code text={yaml} /></div></Panel>
    </form>}
  </>
}

function eligibleBranches(data,pipeline,projectId) {
  const repo = find(scoped(data.repositories,projectId),pipeline.repoId)
  return repo ? repoBranches(data,repo.id).filter((branch) => {
    const { ready,text } = pipelineSource(data,projectId,repo.id,branch.id,pipeline.yamlPath)
    return ready && typeof text === 'string' && text.trim()
  }) : []
}

function RunDialog({ pipeline,previous,onClose }) {
  const { data,commit,notify } = useStore()
  const { project } = useProject()
  const navigate = useProjectNav()
  const choices = eligibleBranches(data,pipeline,project.id)
  const [branchId,setBranch] = useState(find(choices,previous?.branchId)?.id ?? find(choices,pipeline.defaultBranchId)?.id ?? choices[0]?.id ?? '')
  const [variables,setVariables] = useState(Object.entries(previous?.variables ?? {}).map(([name,value],index) => ({ id:index,name,value })))
  const [error,setError] = useState('')
  async function submit(event) {
    event.preventDefault()
    try {
      const entries = variables.map(({ name,value }) => [name.trim(),value])
      requireThat(entries.every(([key]) => key) && new Set(entries.map(([key]) => key)).size === entries.length, 'Enter a unique name for each variable.')
      const run = await commit((state,actor,now) => createRun(state,project.id,pipeline.id,branchId,Object.fromEntries(entries),previous?.id,actor,now))
      onClose(); notify('Pipeline run completed'); navigate(runPath(run.id))
    } catch (failure) { setError(failure.message) }
  }
  const patch = (id,key,value) => setVariables(variables.map((row) => row.id === id ? { ...row,[key]:value } : row))
  return <Dialog drawer title={previous ? 'Run new' : 'Run pipeline'} onClose={onClose}><form onSubmit={submit}>
    <div className="dialog-body">
      <p>{pipeline.name}</p>
      <Field label="Branch"><Select autoFocus required value={branchId} options={options(choices)} empty="Choose a branch" onChange={(event) => setBranch(event.target.value)} /></Field>
      <h3>Variables</h3>
      {variables.map((row,index) => <div className="field-grid variable" key={row.id}>
        <Field label={'Variable name ' + (index + 1)}><input required value={row.name} onChange={(event) => patch(row.id,'name',event.target.value)} /></Field>
        <Field label={'Variable value ' + (index + 1)}><input value={row.value} onChange={(event) => patch(row.id,'value',event.target.value)} /></Field>
        <Button onClick={() => setVariables(variables.filter(({ id }) => id !== row.id))}>Remove variable</Button>
      </div>)}
      <div><Button onClick={() => setVariables([...variables,{ id:(variables.at(-1)?.id ?? -1)+1,name:'',value:'' }])}><Plus size={15} /> Add variable</Button></div><ErrorText error={error} />
    </div><footer><Button onClick={onClose}>Cancel</Button><Button primary type="submit" disabled={!find(choices,branchId)}>Run</Button></footer>
  </form></Dialog>
}

function RunDetail({ run }) {
  const { data,user,commit,notify } = useStore()
  const { project } = useProject()
  const [params,setQuery] = useQuery()
  const [modal,setModal] = useState('')
  const [error,setError] = useState('')
  const pipeline = find(scoped(data.pipelines,project.id),run.pipelineId)
  const repo = find(scoped(data.repositories,project.id),run.repoId)
  const branch = repo && find(repoBranches(data,repo.id),run.branchId)
  const artifacts = scoped(data.pipelineArtifacts,project.id).filter((row) => row.runId === run.id)
  const tasks = list(run.stages).flatMap((stage) => list(stage.jobs).map((job) => ({ stage,job,key:stage.id + '/' + job.id })))
  const task = tasks.find((row) => row.key === params.get('job')) ?? tasks[0]
  const tab = ['Logs','Artifacts'].includes(params.get('tab')) ? params.get('tab') : 'Summary'
  const canRun = user && pipeline && eligibleBranches(data,pipeline,project.id).length > 0
  const related = branch ? list(branch.workItemIds).map((id) => find(scoped(data.workItems,project.id),id)).filter(Boolean) : []
  async function cancel() {
    try {
      await commit((state,actor,now) => cancelRun(state,project.id,run.id,actor,now))
      setModal(''); setError(''); notify('Pipeline run canceled')
    } catch (failure) { setError(failure.message) }
  }
  return <>
    <PageHead title={runName(run) + (pipeline?.name ? ' · ' + pipeline.name : '')}>
      <PLink className="button" to={pipeline ? pipelinePath(pipeline.id) : '/_build?tab=runs'}>Back to runs</PLink>
      {canCancel(run) && <Button disabled={!user} onClick={() => { setError(''); setModal('cancel') }}>Cancel run</Button>}
      <Button primary disabled={!canRun} title={!canRun ? 'An available pipeline, branch and signed-in user are required' : undefined}
        onClick={() => setModal('run')}><Play size={15} /> Run new</Button>
    </PageHead>
    <div className="toolbar"><Status value={runState(run)} /><span className="meta">{dateText(run.createdAt)}</span></div>
    <Tabs items={['Summary','Logs','Artifacts']} value={tab} onChange={(next) => setQuery({ tab:next === 'Summary' ? null : next })} />
    {tab === 'Summary' && <div className="stack"><div className="split">
      <Panel title="Run summary"><dl className="facts">
        <dt>Reason</dt><dd>{human(run.reason)}</dd><dt>Requested by</dt><dd><Person id={run.requestedBy} /></dd>
        <dt>Branch</dt><dd>{branch ? <PLink to={repoPath(repo) + '?version=' + segment(branch.name)}><GitBranch size={14} /> {branch.name}</PLink> : 'Unavailable branch'}</dd>
        <dt>Commit</dt><dd>{repo && run.commitId ? <PLink to={repoPath(repo) + '/commits?commitId=' + segment(run.commitId)}><GitCommitHorizontal size={14} /> {run.commitId}</PLink> : '—'}</dd>
        <dt>Result</dt><dd><Status value={runState(run)} /></dd><dt>Started</dt><dd>{dateText(run.startedAt)}</dd><dt>Finished</dt><dd>{dateText(run.finishedAt)}</dd>
        {run.canceledBy && <><dt>Canceled by</dt><dd><Person id={run.canceledBy} /></dd></>}
        {run.rerunOfRunId && <><dt>Previous run</dt><dd><PLink to={runPath(run.rerunOfRunId)}>Run #{run.rerunOfRunId}</PLink></dd></>}
      </dl></Panel>
      <div className="stack"><Panel title="Artifacts"><Button onClick={() => setQuery({ tab:'Artifacts' })}>{artifacts.length} artifact{artifacts.length === 1 ? '' : 's'}</Button></Panel>
        <Panel title="Work items"><div className="stack">{related.map((row) => <PLink key={row.id} to={'/_workitems/edit/' + segment(row.id)}>#{row.id} {row.title}</PLink>)}
          {!related.length && <p className="muted">No work items linked to this branch.</p>}</div></Panel></div>
    </div>
      <Panel title="Stages"><div className="stage-grid">{list(run.stages).map((stage) => <article className="stage-card" key={stage.id}><h3>{stage.name ?? stage.id}</h3>
        <Status value={stage.result ?? stage.status} />
        {list(stage.jobs).map((job) => <button className="link-button" key={job.id} onClick={() => setQuery({ tab:'Logs',job:stage.id + '/' + job.id })}>{job.name ?? job.id}</button>)}
      </article>)}{!list(run.stages).length && <p className="muted">No stages are available.</p>}</div></Panel>
      {Object.keys(run.variables ?? {}).length > 0 && <Panel title="Variables"><dl className="facts">{Object.entries(run.variables).map(([key,value]) => <React.Fragment key={key}><dt>{key}</dt><dd>{String(value)}</dd></React.Fragment>)}</dl></Panel>}
    </div>}
    {tab === 'Logs' && (task ? <div className="split code-left">
      <Panel title="Jobs"><div className="side-group">{tasks.map((row) => <button type="button" className={row.key === task.key ? 'selected' : ''} key={row.key}
        onClick={() => setQuery({ job:row.key })}>{row.stage.name ?? row.stage.id} · {row.job.name ?? row.job.id}</button>)}</div></Panel>
      <Panel title={task.job.name ?? task.job.id}><div className="stack"><Status value={task.job.result ?? task.job.status} />
        <Code dark text={list(task.job.logLines).join('\n') || 'No log output is available.'} /></div></Panel>
    </div> : <Empty title="No logs are available" />)}
    {tab === 'Artifacts' && (artifacts.length ? <div className="stack">{artifacts.map((artifact) => <Panel title={artifact.name ?? 'Artifact'} key={artifact.id}>
      <p className="meta">Version {artifact.version ?? '—'}</p><ul className="plain-list">{list(artifact.files).map((file,index) => <li key={file.path + ':' + index}>
        <Button onClick={() => download(file)}><Download size={15} /> {file.path ?? 'Download file'}</Button> <span className="meta">{file.sizeBytes ?? '—'} bytes</span>
      </li>)}</ul>{!list(artifact.files).length && <p className="meta">No files available.</p>}</Panel>)}</div> : <Empty title="No published artifacts" />)}
    {modal === 'run' && pipeline && <RunDialog pipeline={pipeline} previous={run} onClose={() => setModal('')} />}
    {modal === 'cancel' && <Dialog title="Cancel pipeline run" onClose={() => setModal('')}>
      <div className="dialog-body"><p>Cancel {runName(run)}?</p><ErrorText error={error} /></div>
      <footer><Button onClick={() => setModal('')}>Keep run</Button><Button primary onClick={cancel}>Cancel run</Button></footer>
    </Dialog>}
  </>
}

function download(file) {
  const url = URL.createObjectURL(new Blob([file.content ?? ''],{ type:'application/octet-stream' }))
  const link = document.createElement('a')
  link.href = url
  link.download = file.path?.split('/').at(-1) || 'artifact.txt'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url),1000)
}
