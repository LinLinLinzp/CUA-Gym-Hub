import { useState } from 'react'
import { Braces, GitBranch, GitCommitHorizontal, Workflow } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { PipelineRunActions } from './PipelineRunActions.jsx'
import { RunPipelineButton } from './PipelineRunForm.jsx'
import { PipelineSetup } from './PipelineSetup.jsx'
import { useStore } from '../context/AppContext.jsx'
import { currentAttempt } from '../domain/pipelines.js'
import { buildPath, byId, duration, human, list, person, query, relative, repoPath, repoRecords, shortHash } from '../utils/model.js'
import { Avatar, Button, Empty, Field, PageHeading, RouteLink, Status, Table, usePage, useQuery } from '../components/ui.jsx'

const pipelineTypes = ['default', 'branch', 'custom']
const pipelineStatuses = ['pending', 'in_progress', 'successful', 'failed', 'stopped']
const pipelineTriggers = ['manual', 'push', 'pull_request', 'rerun']

function runName(run, definition) {
  return run.definitionSnapshot?.name || definition?.name || 'Pipeline'
}

function runBranch(run, branches) {
  return run.branchName || byId(branches, run.branchId)?.name || 'Unknown branch'
}

function Filter({ label, entries, value, onChange }) {
  return <Field label={label}><select value={value} onChange={event => onChange(event.target.value)}>
    <option value="">All</option>{entries.map(item => <option value={item} key={item}>{label === 'Branch' ? item : human(item)}</option>)}
  </select></Field>
}

export function PipelineHistory({ workspace, repo }) {
  const { state } = useStore()
  const [filters, setFilters] = useState({ branch: '', type: '', status: '', trigger: '' })
  const runs = repoRecords(state.pipelineRuns, repo)
  const definitions = repoRecords(state.pipelineDefinitions, repo)
  const branches = repoRecords(state.branches, repo)
  const branchNames = [...new Set([...branches.map(branch => branch.name), ...runs.map(run => runBranch(run, branches))].filter(Boolean))].sort()
  const results = runs.filter(run => (!filters.branch || runBranch(run, branches) === filters.branch) &&
    (!filters.type || (run.definitionSnapshot?.type || byId(definitions, run.definitionId)?.type) === filters.type) &&
    (!filters.status || run.status === filters.status) && (!filters.trigger || run.trigger === filters.trigger))
    .sort((a, b) => b.buildNumber - a.buildNumber)
  const page = usePage(results, JSON.stringify([repo.id, filters]))
  const update = (key, value) => setFilters(current => ({ ...current, [key]: value }))
  return <>
    <PageHeading title="Pipelines">{Boolean(definitions.length) && <RunPipelineButton workspace={workspace} repo={repo} variant="primary" />}</PageHeading>
    {!definitions.length && <PipelineSetup repo={repo} />}
    {Boolean(definitions.length) && !repo.pipelinesEnabled && <p className="notice pipeline-notice">Pipelines are disabled. You can still view existing runs or <RouteLink to={repoPath(workspace, repo, 'admin')}>enable Pipelines in Repository settings</RouteLink>.</p>}
    {Boolean(definitions.length || runs.length) && <>
      <div className="filters">
        <Filter label="Branch" entries={branchNames} value={filters.branch} onChange={value => update('branch', value)} />
        <Filter label="Pipeline type" entries={pipelineTypes} value={filters.type} onChange={value => update('type', value)} />
        <Filter label="Status" entries={pipelineStatuses} value={filters.status} onChange={value => update('status', value)} />
        <Filter label="Trigger" entries={pipelineTriggers} value={filters.trigger} onChange={value => update('trigger', value)} />
      </div>
      {page.rows.length ? <Table label="Pipeline history" columns={['Pipeline', 'Status', 'Started', 'Duration']}>{page.rows.map(run => {
        const definition = byId(definitions, run.definitionId)
        const commit = byId(repoRecords(state.commits, repo), run.commitId)
        return <tr key={run.id}>
          <td><RouteLink className="row-title" to={buildPath(workspace, repo, run)}>{runName(run, definition)} #{run.buildNumber}</RouteLink>
            <div className="run-meta"><Avatar user={byId(state.users, run.createdBy)} size={19} /> {person(state, run.createdBy)} · {human(run.trigger)} ·
              <GitBranch size={13} /> {runBranch(run, branches)} · <code>{shortHash(commit || { hash: run.commitHash || run.commitId }) || '—'}</code> · {human(run.definitionSnapshot?.type || definition?.type)}</div></td>
          <td><Status value={run.status} /></td><td className="nowrap">{relative(run.startedAt || run.createdAt)}</td><td>{duration(run.durationSeconds)}</td>
        </tr>
      })}</Table> : <div className="panel"><Empty title={runs.length ? 'No matching pipeline runs' : 'No pipeline runs yet'} icon={Workflow}><p>{runs.length ? 'Try changing the filters.' : 'Run a pipeline to see build results here.'}</p></Empty></div>}
      {page.controls}
    </>}
  </>
}

function LogViewer({ step, attempt, onAttempt }) {
  const attempts = list(step?.attempts)
  const sections = list(attempt?.logSections)
  const page = usePage(sections, attempt?.id)
  return <section className="panel">
    <div className="panel-title"><Braces size={18} /><h2>{step?.name ? `${step.name} logs` : 'Logs'}</h2>{attempt && <Status value={attempt.status} />}</div>
    <div className="panel-pad">
      {Boolean(attempts.length) && <Field label="Attempt"><select value={attempt?.number || ''} onChange={event => onAttempt(event.target.value)}>
        {attempts.map(item => <option key={item.id} value={item.number}>Attempt {item.number} · {human(item.status)}</option>)}</select></Field>}
      {!sections.length ? <Empty title="No logs available" icon={Braces}><p>{attempt?.status === 'pending' ? 'This step is waiting to start.' :
        attempt?.status === 'skipped' ? 'This step was skipped.' : 'This attempt has no saved log output.'}</p></Empty> :
        <div className="log-scroll">{page.rows.map((section, index) => <details className="log-section" key={`${attempt.id}/${section.id || index}`} open={index === 0}>
          <summary><strong>{section.label || 'Log output'}</strong> <Status value={section.status} /> <small>{duration(section.durationSeconds)}</small></summary>
          {list(section.lines).length ? <ol className="log-lines">{section.lines.map((line, number) => <li key={number}><code>{line || ' '}</code></li>)}</ol> :
            <p className="panel-copy muted">No output for this section.</p>}
        </details>)}{page.controls}</div>}
    </div>
  </section>
}

function PipelineBuild({ workspace, repo, run }) {
  const { state } = useStore()
  const [params, setQuery] = useQuery()
  const steps = list(run.steps)
  const step = byId(steps, params.get('step')) || steps[0]
  const stepPage = usePage(steps, run.id)
  const attempt = list(step?.attempts).find(item => String(item.number) === params.get('attempt')) || currentAttempt(step)
  const definition = byId(repoRecords(state.pipelineDefinitions, repo), run.definitionId)
  const branchName = runBranch(run, repoRecords(state.branches, repo))
  const commit = byId(repoRecords(state.commits, repo), run.commitId)
  return <>
    <div className="breadcrumb"><RouteLink to={repoPath(workspace, repo, 'pipelines')}>Pipelines</RouteLink> / #{run.buildNumber}</div>
    <PageHeading title={`${runName(run, definition)} #${run.buildNumber}`} meta={<div className="review-meta"><Status value={run.status} /><span>{human(run.trigger)} · {person(state, run.createdBy)} · {relative(run.startedAt || run.createdAt)}</span></div>}><PipelineRunActions workspace={workspace} repo={repo} run={run} /></PageHeading>
    <div className="split log-split">
      <div className="stack">
        <section className="panel panel-pad stack small-gap"><h2>Run summary</h2>
          <p><GitBranch className="row-icon" size={15} />{branchName}</p>
          <p><GitCommitHorizontal className="row-icon" size={15} />{commit ? <RouteLink className="mono" to={query(repoPath(workspace, repo, `commits/${encodeURIComponent(commit.id)}`), { branch: branchName })}>{shortHash(commit)}</RouteLink> : <code>{shortHash({ hash: run.commitHash || run.commitId }) || '—'}</code>}</p>
          <p>Duration <strong>{duration(run.durationSeconds)}</strong></p>
          {run.rerunOfRunId && (() => {
            const original = byId(repoRecords(state.pipelineRuns, repo), run.rerunOfRunId)
            return original && <p>Rerun of <RouteLink to={buildPath(workspace, repo, original)}>#{original.buildNumber}</RouteLink></p>
          })()}
          {run.variables && Boolean(Object.keys(run.variables).length) && <dl className="pipeline-vars">{Object.entries(run.variables).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value)}</dd></div>)}</dl>}
        </section>
        <section className="panel"><div className="panel-title"><h2>Steps</h2></div><div className="file-list step-list">
          {!steps.length && <p className="panel-copy muted">No steps recorded.</p>}
          {stepPage.rows.map(item => <button key={item.id} aria-pressed={item.id === step?.id} className={item.id === step?.id ? 'selected' : ''} onClick={() => setQuery({ step: item.id, attempt: null })}>
            <span>{item.name || item.definitionStepKey || 'Step'}</span><Status value={currentAttempt(item)?.status} /></button>)}
          {stepPage.controls}
        </div></section>
      </div>
      <LogViewer step={step} attempt={attempt} onAttempt={number => setQuery({ step: step?.id, attempt: number })} />
    </div>
  </>
}

export function PipelineResult({ workspace, repo }) {
  const { state } = useStore()
  const { buildNumber } = useParams()
  const run = repoRecords(state.pipelineRuns, repo).find(item => String(item.buildNumber) === buildNumber)
  return run ? <PipelineBuild key={run.id} workspace={workspace} repo={repo} run={run} /> :
    <Empty title="Pipeline run unavailable" icon={Workflow}><Button to={repoPath(workspace, repo, 'pipelines')}>Back to pipelines</Button></Empty>
}
