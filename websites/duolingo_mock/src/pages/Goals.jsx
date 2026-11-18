import { useState } from 'react'
import { useAccount } from '../account.jsx'
import { changeGoal } from '../actions.js'
import { goalName, goalSnapshot, matches, metricName, records } from '../model.js'
import { Badge, Empty, Modal, PageHead, Progress } from '../ui.jsx'

function GoalEditor({ goal, save, close }) {
  const [label, setLabel] = useState(goal?.label || '')
  const [metric, setMetric] = useState(goal?.metric || 'xp')
  const [cadence, setCadence] = useState(goal?.cadence || 'daily')
  const [target, setTarget] = useState(goal?.target ?? '')
  const [error, setError] = useState('')

  function submit(event) {
    event.preventDefault()
    if (!label.trim()) return setError('Enter a goal name.')
    if (!/^\d+$/.test(String(target).trim()) || !Number.isSafeInteger(Number(target)) || Number(target) < 1) {
      return setError('Enter a positive whole-number target.')
    }
    save({ label: label.trim(), metric, cadence, target: Number(target) })
  }

  return <Modal title={goal ? 'Edit goal' : 'New goal'} onClose={close}>
    <form className="stack" onSubmit={submit} noValidate>
      <label className="field">Goal name<input autoFocus value={label} maxLength={100} onChange={event => setLabel(event.target.value)} /></label>
      <div className="grid two form-grid">
        <label className="field"><span id="metric-label">Metric</span><select aria-labelledby="metric-label" value={metric} onChange={event => setMetric(event.target.value)}>
          <option value="xp">XP</option><option value="lessons">Lessons</option>
        </select></label>
        <label className="field"><span id="cadence-label">Cadence</span><select aria-labelledby="cadence-label" value={cadence} onChange={event => setCadence(event.target.value)}>
          <option value="daily">Daily</option><option value="weekly">Weekly</option>
        </select></label>
      </div>
      <label className="field">Target<input type="number" min="1" step="1" value={target} onChange={event => setTarget(event.target.value)} /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions dialog-actions">
        <button type="button" onClick={close}>Cancel</button>
        <button className="primary">Save goal</button>
      </div>
    </form>
  </Modal>
}

const statuses = { active: 'Active', completed: 'Completed', archived: 'Archived' }

export function Goals() {
  const { state, commit } = useAccount()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [date, setDate] = useState('')
  const [editor, setEditor] = useState(null)
  const [archiving, setArchiving] = useState(null)
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const chooseDate = date && date <= today ? new Date(date + 'T00:00:00Z') : now
  const historical = !!date && date < today && Number.isFinite(+chooseDate)
  const goals = records(state.goals)
  const active = goals.filter(goal => goal.status !== 'archived')
  const reached = active.filter(goal => goalSnapshot(state, goal, now).complete).length
  const visible = goals.flatMap(goal => {
    const snapshot = goalSnapshot(state, goal, historical ? chooseDate : now, historical)
    if (!snapshot) return []
    const status = goal.status === 'archived' ? 'archived' : snapshot.complete ? 'completed' : 'active'
    return [{ goal, snapshot, status }]
  }).filter(({ snapshot, status }) => (filter === 'all' || filter === status)
    && matches(query, snapshot.label, metricName(snapshot.metric), snapshot.cadence))
    .sort((a, b) => (a.status === 'archived') - (b.status === 'archived'))

  function saveGoal(fields) {
    const id = editor.goal?.id
    const type = id ? 'updated' : 'created'
    commit((current, time) => changeGoal(current, time, type, id, fields), id ? 'Goal updated.' : 'Goal created.')
    setEditor(null)
  }

  return <>
    <PageHead title="Goals" action={<button className="primary" onClick={() => setEditor({})}><span aria-hidden="true">＋</span> New goal</button>}>
      Set a practice target and track your progress.
    </PageHead>
    <article className="card goal-summary">
      <div><div className="caption">Current periods</div><h2>{active.length ? 'Practice progress' : 'Set your first goal'}</h2>
        <p className="muted">{active.length ? 'Daily and weekly targets update after each finished lesson.' : 'Create a daily or weekly target for XP or completed lessons.'}</p></div>
      {active.length > 0 && <div className="summary-count"><strong>{reached} / {active.length}</strong><span>targets reached</span></div>}
    </article>
    <section className="section" aria-labelledby="goals-heading">
      <h2 id="goals-heading">Your goals</h2>
      <div className="filters">
        <label className="search">Search goals<input placeholder="Goal name or metric" type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <label><span id="goal-status-label">Status</span><select aria-labelledby="goal-status-label" value={filter} onChange={event => setFilter(event.target.value)}>
          <option value="all">All</option><option value="active">Active</option><option value="completed">Completed</option><option value="archived">Archived</option>
        </select></label>
        <label>Period date<input type="date" value={date || today} max={today} onChange={event => setDate(event.target.value)} /></label>
        {historical && <button onClick={() => setDate('')}>Current period</button>}
      </div>
      {visible.length ? <div className="card goal-list"><ul className="rows">
        {visible.map(({ goal, snapshot, status }) => <li className="goal-row" key={goal.id}>
          <div className="goal-info"><div className="inline"><h3>{goalName(snapshot)}</h3><Badge tone={status === 'completed' ? 'green' : status === 'archived' ? 'neutral' : ''}>{statuses[status]}</Badge></div>
            <p className="caption">{snapshot.cadence === 'weekly' ? 'Weekly' : 'Daily'} · {metricName(snapshot.metric)} · {snapshot.period}</p>
          </div>
          <Progress value={snapshot.amount} target={snapshot.target} unit={metricName(snapshot.metric)} />
          {status !== 'archived' && <div className="actions">
            <button onClick={() => setEditor({ goal })}>Edit goal</button><button className="danger" onClick={() => setArchiving(goal)}>Archive goal</button>
          </div>}
        </li>)}
      </ul></div> : <Empty>{goals.length ? 'No goals match your filters.' : 'Your goals will appear here.'}</Empty>}
    </section>
    {editor && <GoalEditor goal={editor.goal} save={saveGoal} close={() => setEditor(null)} />}
    {archiving && <Modal title={'Archive ' + goalName(archiving) + '?'} onClose={() => setArchiving(null)}>
      <p>The goal will stop tracking new lessons. You can still see its earlier progress in the archive.</p>
      <div className="actions dialog-actions">
        <button autoFocus onClick={() => setArchiving(null)}>Cancel</button>
        <button className="primary danger" onClick={() => {
          commit((current, time) => changeGoal(current, time, 'archived', archiving.id), 'Goal archived.')
          setArchiving(null)
        }}>Archive goal</button>
      </div>
    </Modal>}
  </>
}
