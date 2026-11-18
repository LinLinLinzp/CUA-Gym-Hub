import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  AppLine, Badge, Dialog, Empty, Filter, Icon, Missing, PageTitle, Pagination, Payload, Search, SiteLink, usePage, useSiteNavigate,
} from './ui'
import { useWorkspace } from './store'
import { actor, appName, byId, dateLabel, idFor, includesText, items, labels, newest, timestamp } from './utils/model'
import { canSelectReplay, planReplay } from './utils/workflow'

const runPath = (id) => '/history/runs/' + encodeURIComponent(id)
const runName = (run) => run.zapName || 'Unnamed Zap'
const runStatuses = ['success', 'errored', 'filtered', 'on_hold'].map((value) => [value, labels[value]])
const dayOf = (date) => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date) ? date.slice(0, 10) : ''
const tasks = (run) => Math.max(0, Number(run.taskCount) || 0)

function replayRecord(state, details) {
  return { ...details, id: idFor('run'), createdAt: timestamp(), createdBy: actor(state) }
}

function BulkReplay({ runs, close }) {
  const { dispatch } = useWorkspace()
  const [result, setResult] = useState(null)
  function submit() {
    const created = []
    const skipped = []
    dispatch((current) => {
      for (const selection of runs) {
        const original = byId(current.runs, selection.id)
        const plan = original ? planReplay(current, original) : { error: 'The original run is unavailable.' }
        if (plan.error) skipped.push({ run: selection, error: plan.error })
        else created.push(replayRecord(current, plan.replay))
      }
      return created.length ? { ...current, runs: [...items(current.runs), ...created] } : current
    })
    setResult({ count: created.length, skipped })
  }
  return <Dialog title={result ? 'Replay results' : 'Replay selected runs?'} action={result ? null : 'Replay selected runs'} onClose={close} onSubmit={submit}>
    {result ? <>
      <p>{result.count} replayed · {result.skipped.length} skipped</p>
      {result.skipped.length > 0 && <ul className="dependency-list">{result.skipped.map(({ run, error }) => <li key={run.id}>
        <SiteLink to={runPath(run.id)}>{runName(run)} ({run.id})</SiteLink><div className="muted">{error}</div>
      </li>)}</ul>}
    </> : <p>Check {runs.length} selected {runs.length === 1 ? 'run' : 'runs'} and replay those ready to run with the current published Zaps.</p>}
  </Dialog>
}

function TaskUsage({ runs }) {
  const byDay = new Map()
  const byZap = new Map()
  for (const run of runs) {
    const stamp = dayOf(run.createdAt)
    const key = run.zapId || runName(run)
    const current = byZap.get(key) || { id: key, name: runName(run), count: 0, runs: 0 }
    if (stamp) byDay.set(stamp, (byDay.get(stamp) || 0) + tasks(run))
    byZap.set(key, { ...current, count: current.count + tasks(run), runs: current.runs + 1 })
  }
  const days = [...byDay].sort(([a], [b]) => a.localeCompare(b))
  const zaps = [...byZap.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  const total = zaps.reduce((sum, zap) => sum + zap.count, 0)
  const max = Math.max(1, ...days.map(([, count]) => count))
  if (!runs.length) return <div className="panel"><Empty title="No task usage to show">Try a different range or clear your filters.</Empty></div>
  return <div className="usage">
    <section className="panel pad" aria-label="Daily task usage">
      <div className="section-head"><div><h2>Tasks by day</h2><p className="muted small">{total} {total === 1 ? 'task' : 'tasks'} across {runs.length} {runs.length === 1 ? 'run' : 'runs'}</p></div></div>
      {days.length ? <div className="daily-bars" aria-hidden="true">{days.map(([date, count]) => <div key={date} title={dateLabel(date) + ' · ' + count + ' tasks'}><span style={{ height: count / max * 100 + '%' }} /></div>)}</div> : null}
      {days.length ? <div className="axis"><span>{dateLabel(days[0][0])}</span><span>{dateLabel(days.at(-1)[0])}</span></div> : null}
      <div className="table-frame usage-days"><table aria-label="Daily totals"><thead><tr><th scope="col">Day (UTC)</th><th scope="col">Tasks used</th></tr></thead>
        <tbody>{days.map(([date, count]) => <tr key={date}><td>{dateLabel(date)}</td><td>{count}</td></tr>)}</tbody>
      </table></div>
    </section>
    <section className="panel" aria-label="Task usage by Zap">
      <div className="pad"><h2>Tasks by Zap</h2></div>
      <div className="table-frame"><table><thead><tr><th scope="col">Zap</th><th scope="col">Runs</th><th scope="col">Tasks used</th></tr></thead>
        <tbody>{zaps.map((entry) => <tr key={entry.id}><td>{entry.name}</td><td>{entry.runs}</td><td>{entry.count}</td></tr>)}</tbody>
      </table></div>
    </section>
  </div>
}

export function History() {
  const { state } = useWorkspace()
  const [params] = useSearchParams()
  const usage = params.get('view') === 'usage'
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [zapId, setZapId] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [checked, setChecked] = useState([])
  const [bulk, setBulk] = useState(null)
  const all = newest(items(state.runs), 'createdAt')
  const zapOptions = new Map(items(state.zaps).map((zap) => [zap.id, zap.name || 'Untitled Zap']))
  for (const run of all) if (run.zapId && !zapOptions.has(run.zapId)) zapOptions.set(run.zapId, runName(run))
  const filtered = all.filter((run) => {
    const day = dayOf(run.createdAt)
    const inRange = (!start || day >= start) && (!end || (day && day <= end))
    return (!query.trim() || includesText(query, runName(run), run.id)) && (!status || run.status === status)
      && (!zapId || run.zapId === zapId) && inRange
  })
  const page = usePage(filtered, 12)
  const selectables = page.rows.filter((run) => canSelectReplay(state, run))
  const selected = selectables.filter((run) => checked.includes(run.id))
  const allSelected = Boolean(selected.length && selected.length === selectables.length)
  const showSelection = Boolean(selectables.length)
  const change = (setter) => (value) => { setter(value); page.setPage(1); setChecked([]) }
  const paginate = (number) => { page.setPage(number); setChecked([]) }
  return <>
    <PageTitle title="Zap history" description="Review run activity and task usage across your workspace." />
    <nav className="tabs" aria-label="History views">
      <SiteLink to="/history" aria-current={!usage ? 'page' : undefined}>Zap runs</SiteLink>
      <SiteLink to="/history?view=usage" aria-current={usage ? 'page' : undefined} onClick={() => setChecked([])}>Task usage</SiteLink>
    </nav>
    <div className="toolbar">
      <Search label="Search runs" placeholder="Search by Zap or run ID" value={query} onChange={change(setQuery)} />
      <Filter label="Run status" first="All statuses" options={runStatuses} value={status} onChange={change(setStatus)} />
      <Filter label="Filter by Zap" first="All Zaps" options={[...zapOptions].sort((a, b) => a[1].localeCompare(b[1]))} value={zapId} onChange={change(setZapId)} />
      <label className="date-filter">From <input type="date" value={start} onChange={(event) => change(setStart)(event.target.value)} /></label>
      <label className="date-filter">Through <input type="date" value={end} onChange={(event) => change(setEnd)(event.target.value)} /></label>
      {(query || status || zapId || start || end) && <button type="button" onClick={() => {
        setQuery(''); setStatus(''); setZapId(''); setStart(''); setEnd(''); paginate(1)
      }}>Clear filters</button>}
    </div>
    {!usage && selected.length > 0 && <div className="selection-bar">
      <span>{selected.length} selected</span><button type="button" className="primary" onClick={() => setBulk(selected)}>Replay selected</button>
      <button type="button" onClick={() => setChecked([])}>Clear selection</button>
    </div>}
    {start && end && start > end && <p role="alert" className="alert editor-alert">Choose an end date on or after the start date.</p>}
    {usage ? <TaskUsage runs={filtered} /> : <section className="panel" aria-label="Zap runs">
      {page.rows.length ? <div className="table-frame history-table"><table>
        <thead><tr>{showSelection && <th scope="col" className="check-cell"><input type="checkbox" aria-label="Select replay candidates on this page" checked={allSelected} onChange={(event) => setChecked(event.target.checked ? selectables.map((run) => run.id) : [])} /></th>}<th scope="col">Run</th><th scope="col">Timestamp</th><th scope="col">Status</th><th scope="col">Tasks used</th><th scope="col">Apps</th></tr></thead>
        <tbody>{page.rows.map((run) => <tr key={run.id}>
          {showSelection && <td className="check-cell">{selectables.includes(run) && <input type="checkbox" aria-label={'Select run ' + run.id} checked={checked.includes(run.id)} onChange={(event) => setChecked(event.target.checked ? [...checked, run.id] : checked.filter((id) => id !== run.id))} />}</td>}
          <td><SiteLink className="record-link" to={runPath(run.id)}>{runName(run)}</SiteLink><div className="muted mono">{run.id}</div></td>
          <td className="table-date">{dateLabel(run.createdAt, true)}</td><td><Badge status={run.status} /></td><td>{tasks(run)}</td>
          <td><AppLine state={state} steps={items(run.stepResults)} /></td>
        </tr>)}</tbody>
      </table></div> : <Empty title={all.length ? 'No matching runs' : 'No runs yet'}>{all.length ? 'Try a different search or date range.' : 'Runs will appear here when there is workflow activity.'}</Empty>}
      <Pagination page={{ ...page, setPage: paginate }} label="runs" />
    </section>}
    {bulk && <BulkReplay runs={bulk} close={() => { setBulk(null); setChecked([]) }} />}
  </>
}

function RunDetail({ run }) {
  const { state, dispatch } = useWorkspace()
  const navigate = useSiteNavigate()
  const [confirm, setConfirm] = useState(false)
  const [issue, setIssue] = useState('')
  const [selection, setSelection] = useState(0)
  const zap = byId(state.zaps, run.zapId)
  const steps = items(run.stepResults)
  const chosen = steps[selection]
  const plan = run.status === 'errored' ? planReplay(state, run) : null
  const selectable = canSelectReplay(state, run)
  function replay() {
    let created
    const success = dispatch((current) => {
      const original = byId(current.runs, run.id)
      if (!original) { setIssue('The original run is unavailable.'); return current }
      const next = planReplay(current, original)
      if (next.error) { setIssue(next.error); return current }
      created = replayRecord(current, next.replay)
      return { ...current, runs: [...items(current.runs), created] }
    }, 'Run replayed.')
    if (success) navigate(runPath(created.id))
  }
  return <>
    <SiteLink className="back-link" to="/history"><Icon name="back" />Back to Zap history</SiteLink>
    <PageTitle title={runName(run)} description={dateLabel(run.createdAt, true)}>
      {zap && <SiteLink className="button" to={'/zaps/' + encodeURIComponent(zap.id)}>Open Zap</SiteLink>}
      {selectable && <button className="primary" type="button" disabled={!plan.replay} onClick={() => setConfirm(true)}>Replay</button>}
    </PageTitle>
    <section className="panel pad run-overview" aria-label="Run overview">
      <div><small className="muted">Run status</small><Badge status={run.status} /></div>
      <div><small className="muted">Tasks used</small><strong>{tasks(run)}</strong></div>
      <div><small className="muted">Run ID</small><span className="mono">{run.id}</span></div>
      {run.replayOfRunId && <div><small className="muted">Replayed from</small><SiteLink className="mono" to={runPath(run.replayOfRunId)}>{run.replayOfRunId}</SiteLink></div>}
    </section>
    {plan?.error && <p className="alert editor-alert">{plan.error} {plan.repairAppId && <SiteLink to={'/connections?app=' + encodeURIComponent(plan.repairAppId)}>App connections</SiteLink>}</p>}
    <div className="two-panel">
      <section className="panel pad" aria-label="Run steps"><div className="section-head"><h2>Run steps</h2></div>
        {steps.length ? <ol className="run-steps">{steps.map((step, index) => <li key={step.stepId || index}>
          <button type="button" className="step-button" aria-pressed={index === selection} onClick={() => setSelection(index)}>
            <span><small>{step.kind === 'trigger' ? 'Trigger' : 'Action ' + index}</small><strong>{step.name || appName(state, step.appId)}</strong></span>
            <Badge status={step.status} />
          </button>
        </li>)}</ol> : <p className="muted">No step records available.</p>}
      </section>
      <section className="panel pad" aria-label="Step details">
        <div className="section-head"><h2>{chosen?.name || 'Step details'}</h2></div>
        {chosen ? <><div className="payload-grid"><div><h3>Input</h3><Payload value={chosen.input} /></div><div><h3>Output</h3><Payload value={chosen.output} /></div></div>
          {chosen.error && <div className="run-error"><h3>Error</h3><p className="alert">{typeof chosen.error === 'string' ? chosen.error : JSON.stringify(chosen.error)}</p></div>}
        </> : <p className="muted">Select a step to inspect its payload.</p>}
      </section>
    </div>
    {confirm && <Dialog title="Replay this run?" action="Replay run" alert={issue} onClose={() => { setConfirm(false); setIssue('') }} onSubmit={replay}>
      <p>Replay uses the current published Zap and the original trigger data. Successful actions count toward task usage.</p>
    </Dialog>}
  </>
}

export function RunRoute() {
  const { runId } = useParams()
  const { state } = useWorkspace()
  const run = byId(state.runs, runId)
  return run ? <RunDetail key={runId} run={run} /> : <Missing type="Run" to="/history" back="Back to Zap history" />
}
