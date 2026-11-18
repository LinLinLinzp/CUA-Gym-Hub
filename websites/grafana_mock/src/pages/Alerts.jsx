import React, { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  useWorkspace, SiteLink, useSiteNavigate, rows, find, text, fold, uid, upsert,
  without, deletion, revisions, dashboardPath, rulePath,
} from '../workspace.jsx'
import { Confirm, Empty, Field, PageHead, SaveBar, Section, SelectOptions, Status } from '../ui.jsx'
import { samples } from '../charts.jsx'

const evaluationStates = [
  ['normal', 'Normal'], ['pending', 'Pending'], ['alerting', 'Alerting'], ['no_data', 'No data'], ['error', 'Error'], ['paused', 'Paused'],
]
const fallbackOptions = [['alerting', 'Alerting'], ['normal', 'Normal'], ['keep_last', 'Keep last state']]
const displayState = (rule) => rule.isPaused ? 'paused' : rule.evaluationState
const labelSummary = (rule) => Object.entries(rule.labels || {}).map(([key, value]) => key + '=' + text(value))
const nameOf = (record, field, id) => record?.[field] || (id ? 'Unavailable (' + id + ')' : '—')
const intervalOf = (group) => group?.intervalSeconds != null ? group.intervalSeconds + ' s' : '—'
const pointFilterPath = '/alerting/list?contactPoint='

function RulesTable({ rules, groups }) {
  return <div className="table-wrap"><table aria-label="Alert rules">
    <thead><tr><th scope="col">Rule name</th><th scope="col">State</th><th scope="col">Health</th><th scope="col">Interval</th><th scope="col">Paused</th></tr></thead>
    <tbody>{rules.map((rule) => <tr key={rule.id}>
      <td><SiteLink to={rulePath(rule.id)}>{rule.name || 'Untitled rule'}</SiteLink>
        {!!labelSummary(rule).length && <div className="tag-list">{labelSummary(rule).map((label) => <span className="tag" key={label}>{label}</span>)}</div>}
      </td>
      <td><Status value={displayState(rule)} /></td><td><Status value={rule.health} /></td>
      <td>{intervalOf(find(groups, rule.evaluationGroupId))}</td><td>{rule.isPaused ? 'Yes' : 'No'}</td>
    </tr>)}</tbody>
  </table></div>
}

export function AlertList() {
  const { state } = useWorkspace()
  const [params] = useSearchParams()
  const contact = params.get('contactPoint')
  const [query, setQuery] = useState('')
  const [folder, setFolder] = useState('')
  const [status, setStatus] = useState('')
  const [grouped, setGrouped] = useState(true)
  const groups = rows(state.evaluationGroups)
  const rules = rows(state.alertRules).filter((rule) =>
    (!contact || rule.contactPointId === contact) &&
    (!folder || rule.folderId === folder) &&
    (!status || displayState(rule) === status) &&
    fold([text(rule.name), ...labelSummary(rule)].join(' ')).includes(fold(query)))
    .sort((a, b) => text(a.name).localeCompare(text(b.name)))
  const byGroup = new Map()
  rules.forEach((rule) => {
    const key = JSON.stringify([rule.folderId, rule.evaluationGroupId])
    const existing = byGroup.get(key)
    if (existing) existing.rules.push(rule)
    else byGroup.set(key, { folderId: rule.folderId, groupId: rule.evaluationGroupId, rules: [rule] })
  })
  const reset = () => { setQuery(''); setFolder(''); setStatus('') }
  const filtered = Boolean(contact || query || folder || status)
  return <>
    <PageHead title="Alert rules" subtitle="Review evaluation health and configure conditions for your services."
      actions={<SiteLink className="button primary" to="/alerting/new">+ New alert rule</SiteLink>} />
    {contact && <div className="breadcrumb">Contact point: {nameOf(find(state.contactPoints, contact), 'name', contact)} <SiteLink to="/alerting/list">Show all rules</SiteLink></div>}
    <div className="toolbar">
      <div className="search"><Field label="Search alert rules"><input type="search" placeholder="Search by name or label" value={query} onChange={(event) => setQuery(event.target.value)} /></Field></div>
      <Field label="Folder"><select value={folder} onChange={(event) => setFolder(event.target.value)}><option value="">All folders</option><SelectOptions items={state.folders} /></select></Field>
      <Field label="State"><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All states</option>
        {evaluationStates.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></Field>
      <Field label="View"><select value={grouped ? 'grouped' : 'flat'} onChange={(event) => setGrouped(event.target.value === 'grouped')}><option value="grouped">Grouped</option><option value="flat">Flat</option></select></Field>
      {(query || folder || status) && <button onClick={reset}>Clear filters</button>}
    </div>
    <div className="list-heading"><h2>{grouped ? 'Evaluation groups' : 'All rules'}</h2><span className="count">{rules.length} rules</span></div>
    {!rules.length ? <Empty title={filtered ? 'No matching alert rules' : 'No alert rules yet'}
      detail={filtered ? 'Try changing the filters.' : 'Create an alert rule to monitor a metric against a condition.'}
      action={filtered ? undefined : <SiteLink to="/alerting/new">Create an alert rule</SiteLink>} />
      : grouped ? [...byGroup.entries()].sort(([, a], [, b]) =>
        text(find(state.folders, a.folderId)?.title).localeCompare(text(find(state.folders, b.folderId)?.title))
        || text(find(groups, a.groupId)?.name).localeCompare(text(find(groups, b.groupId)?.name)),
      ).map(([key, block]) => <section className="surface rule-group" key={key}>
        <div className="group-band"><h3>{nameOf(find(state.folders, block.folderId), 'title', block.folderId)}</h3><span aria-hidden="true">/</span>
          <strong>{nameOf(find(groups, block.groupId), 'name', block.groupId)}</strong>
          <small>{intervalOf(find(groups, block.groupId))}</small></div>
        <RulesTable rules={block.rules} groups={groups} />
      </section>) : <div className="surface"><RulesTable rules={rules} groups={groups} /></div>}
  </>
}

function AlertMissing() {
  return <Empty title="Alert rule unavailable" detail="The alert rule could not be found." action={<SiteLink to="/alerting/list">Back to alert rules</SiteLink>} />
}

export function AlertDetail() {
  const { id } = useParams()
  const { state } = useWorkspace()
  const rule = find(state.alertRules, id)
  return rule ? <RuleView key={id} rule={rule} /> : <AlertMissing />
}

function RuleView({ rule }) {
  const { state, mutate } = useWorkspace()
  const navigate = useSiteNavigate()
  const [deleting, setDeleting] = useState(false)
  const dashboard = find(state.dashboards, rule.dashboardId)
  const panel = find(dashboard?.panels, rule.panelId)
  const point = find(state.contactPoints, rule.contactPointId)
  const group = find(state.evaluationGroups, rule.evaluationGroupId)
  function toggle() {
    mutate((latest, { updatedAt, updatedBy }) => {
      const before = find(latest.alertRules, rule.id)
      if (!before) return latest
      return { ...latest, alertRules: upsert(latest.alertRules, { ...before, isPaused: !before.isPaused, updatedAt, updatedBy }) }
    }, rule.isPaused ? 'Alert rule resumed.' : 'Alert rule paused.')
  }
  function remove() {
    const saved = mutate((latest, stamp) => {
      const before = find(latest.alertRules, rule.id)
      if (!before) return latest
      return { ...latest, alertRules: without(latest.alertRules, rule.id), activity: deletion(latest, 'alert_rule', before, stamp) }
    }, 'Alert rule deleted.')
    if (saved) navigate('/alerting/list')
  }
  return <>
    <nav className="breadcrumb" aria-label="Breadcrumb"><SiteLink to="/alerting/list">Alert rules</SiteLink></nav>
    <PageHead title={rule.name || 'Untitled rule'} subtitle={rule.annotations?.summary} actions={<>
      <SiteLink className="button primary" to={rulePath(rule.id) + '/edit'}>Edit rule</SiteLink>
      <button onClick={toggle}>{rule.isPaused ? 'Resume rule' : 'Pause rule'}</button>
      <button onClick={() => setDeleting(true)}>Delete rule</button>
    </>} />
    <div className="editor">
      <Section title="Evaluation"><dl className="detail-list">
        <dt>State</dt><dd><Status value={displayState(rule)} /></dd>
        <dt>Health</dt><dd><Status value={rule.health} /></dd>
        <dt>Folder</dt><dd>{nameOf(find(state.folders, rule.folderId), 'title', rule.folderId)}</dd>
        <dt>Evaluation group</dt><dd>{nameOf(group, 'name', rule.evaluationGroupId)}</dd>
        <dt>Interval</dt><dd>{intervalOf(group)}</dd>
        <dt>Pending period</dt><dd>{rule.pendingSeconds == null ? '—' : rule.pendingSeconds + ' s'}</dd>
        <dt>No data behavior</dt><dd>{[['no_data', 'No data'], ...fallbackOptions].find(([id]) => id === rule.noDataState)?.[1] || '—'}</dd>
        <dt>Error behavior</dt><dd>{[['error', 'Error'], ...fallbackOptions].find(([id]) => id === rule.errorState)?.[1] || '—'}</dd>
      </dl></Section>
      <Section title="Query and condition"><dl className="detail-list">
        <dt>Data source</dt><dd>{nameOf(find(state.dataSources, rule.dataSourceId), 'name', rule.dataSourceId)}</dd>
        <dt>Query</dt><dd><pre>{rule.query || 'No query saved'}</pre></dd>
        <dt>Threshold</dt><dd>{rule.condition?.threshold == null ? '—' : (rule.condition.operator === 'lt' ? 'Below ' : 'Above ') + rule.condition.threshold}</dd>
      </dl></Section>
      <Section title="Links and metadata"><dl className="detail-list">
        <dt>Contact point</dt><dd>{point ? <SiteLink to={'/alerting/notifications?point=' + encodeURIComponent(point.id)}>{point.name || point.id}</SiteLink>
          : rule.contactPointId ? 'Contact point unavailable' : 'No contact point selected'}</dd>
        <dt>Dashboard</dt><dd>{dashboard ? <SiteLink to={dashboardPath(dashboard.id)}>{dashboard.title || dashboard.id}</SiteLink>
          : rule.dashboardId ? 'Dashboard unavailable' : 'No dashboard linked'}</dd>
        <dt>Panel</dt><dd>{panel ? <SiteLink to={dashboardPath(dashboard.id) + '?panel=' + encodeURIComponent(panel.id)}>{panel.title || panel.id}</SiteLink> : rule.panelId ? 'Panel unavailable' : 'No panel linked'}</dd>
        <dt>Labels</dt><dd className="tag-list">{labelSummary(rule).map((label) => <span className="tag" key={label}>{label}</span>)}{!labelSummary(rule).length && '—'}</dd>
        <dt>Summary</dt><dd>{rule.annotations?.summary || '—'}</dd>
        <dt>Description</dt><dd>{rule.annotations?.description || '—'}</dd>
        <dt>Runbook URL</dt><dd>{rule.annotations?.runbookUrl || '—'}</dd>
      </dl></Section>
    </div>
    {deleting && <Confirm title="Delete alert rule?" label="Delete rule" close={() => setDeleting(false)} confirm={remove}>
      <p>{rule.name || 'This rule'} will be removed from the workspace.</p>
    </Confirm>}
  </>
}

export function AlertEditor({ edit }) {
  const { id } = useParams()
  const { state } = useWorkspace()
  const before = find(state.alertRules, id)
  return edit && !before ? <AlertMissing /> : <RuleForm key={id || 'new'} before={before} />
}

function RuleForm({ before }) {
  const { state, mutate } = useWorkspace()
  const navigate = useSiteNavigate()
  const [draft, setDraft] = useState(() => ({
    name: text(before?.name), dataSourceId: before?.dataSourceId ?? rows(state.dataSources)[0]?.id ?? '',
    query: text(before?.query), operator: before?.condition?.operator === 'lt' ? 'lt' : 'gt',
    threshold: text(before?.condition?.threshold),
    folderId: before?.folderId ?? '', evaluationGroupId: before?.evaluationGroupId ?? '',
    pendingSeconds: text(before?.pendingSeconds ?? 300),
    noDataState: before?.noDataState ?? 'no_data', errorState: before?.errorState ?? 'error',
    contactPointId: before?.contactPointId ?? '', dashboardId: before?.dashboardId ?? '', panelId: before?.panelId ?? '',
    summary: text(before?.annotations?.summary), description: text(before?.annotations?.description),
    runbookUrl: text(before?.annotations?.runbookUrl), labels: labelSummary(before || {}).join('\n'),
    groupName: '', groupInterval: '60',
  }))
  const [errors, setErrors] = useState({})
  const [preview, setPreview] = useState(null)
  const newGroup = draft.evaluationGroupId === 'new-group'
  const groups = rows(state.evaluationGroups).filter((group) => group.folderId === draft.folderId)
  const panels = rows(find(state.dashboards, draft.dashboardId)?.panels)
  const cancel = before ? rulePath(before.id) : '/alerting/list'
  function patch(values) {
    setDraft((previous) => ({ ...previous, ...values }))
    setErrors((previous) => Object.fromEntries(Object.entries(previous).filter(([key]) => !(key in values) && key !== 'form')))
    if (['query', 'dataSourceId', 'threshold', 'operator'].some((key) => key in values)) setPreview(null)
  }
  const change = (key) => (event) => patch({ [key]: event.target.value })
  function conditionErrors() {
    const next = {}
    if (!find(state.dataSources, draft.dataSourceId)) next.dataSourceId = 'Select an available data source.'
    if (!draft.query.trim()) next.query = 'Enter a metric query.'
    if (!draft.threshold.trim() || !Number.isFinite(Number(draft.threshold))) next.threshold = 'Enter a finite threshold.'
    return next
  }
  function runPreview() {
    const next = conditionErrors()
    if (Object.keys(next).length) { setErrors((previous) => ({ ...previous, ...next })); return }
    const value = samples(draft.dataSourceId + '|' + draft.query.trim()).at(-1)
    setPreview({ value, matched: draft.operator === 'lt' ? value < Number(draft.threshold) : value > Number(draft.threshold) })
  }
  function save(event) {
    event.preventDefault()
    const next = conditionErrors()
    const pendingSeconds = Number(draft.pendingSeconds)
    const intervalSeconds = Number(draft.groupInterval)
    const labelLines = draft.labels.split('\n').map((line) => line.trim()).filter(Boolean)
    const labelEntries = labelLines.map((line) => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()])
    if (!draft.name.trim()) next.name = 'Enter a rule name.'
    if (!find(state.folders, draft.folderId)) next.folderId = 'Select an available folder.'
    if (newGroup) {
      if (!draft.groupName.trim()) next.groupName = 'Enter an evaluation group name.'
      else if (groups.some((group) => fold(group.name) === fold(draft.groupName))) next.groupName = 'This folder already has a group with this name.'
      if (!draft.groupInterval.trim() || !Number.isFinite(intervalSeconds) || intervalSeconds <= 0) next.groupInterval = 'Enter an interval greater than zero.'
    } else if (!find(groups, draft.evaluationGroupId)) next.evaluationGroupId = 'Select a group in the chosen folder.'
    if (!draft.pendingSeconds.trim() || !Number.isFinite(pendingSeconds) || pendingSeconds < 0) next.pendingSeconds = 'Enter a pending period of zero or more seconds.'
    if (draft.contactPointId && !find(state.contactPoints, draft.contactPointId)) next.contactPointId = 'Select an available contact point or clear the selection.'
    if (draft.dashboardId && !find(state.dashboards, draft.dashboardId)) next.dashboardId = 'Select an available dashboard or clear the link.'
    if (draft.panelId && !find(panels, draft.panelId)) next.panelId = 'Select a panel on the chosen dashboard.'
    if (labelLines.some((line) => line.indexOf('=') < 1) || labelEntries.some(([key]) => !key) || new Set(labelEntries.map(([key]) => key)).size !== labelEntries.length) {
      next.labels = 'Enter one unique label per line as key=value.'
    }
    if (Object.keys(next).length) { setErrors(next); return }
    const id = before?.id ?? uid('rule')
    const groupId = newGroup ? uid('grp') : draft.evaluationGroupId
    const saved = mutate((latest, stamp) => {
      const previous = find(latest.alertRules, before?.id)
      if (before && !previous) return latest
      const annotations = { ...previous?.annotations }
      for (const key of ['summary', 'description', 'runbookUrl']) {
        if (draft[key].trim()) annotations[key] = draft[key].trim()
        else delete annotations[key]
      }
      const rule = {
        ...(previous || { evaluationState: 'normal', health: 'ok', isPaused: false }),
        id, name: draft.name.trim(), folderId: draft.folderId, evaluationGroupId: groupId,
        dataSourceId: draft.dataSourceId, query: draft.query.trim(),
        condition: { ...previous?.condition, operator: draft.operator, threshold: Number(draft.threshold) },
        pendingSeconds, noDataState: draft.noDataState, errorState: draft.errorState,
        labels: Object.fromEntries(labelEntries), annotations,
        contactPointId: draft.contactPointId || null, dashboardId: draft.dashboardId || null, panelId: draft.panelId || null,
        ...revisions(previous, stamp),
      }
      const result = { ...latest, alertRules: upsert(latest.alertRules, rule) }
      if (newGroup) result.evaluationGroups = [...rows(latest.evaluationGroups), {
        id: groupId, name: draft.groupName.trim(), folderId: draft.folderId, intervalSeconds,
        createdAt: stamp.createdAt, createdBy: stamp.createdBy,
      }]
      return result
    }, before ? 'Alert rule updated.' : 'Alert rule created.')
    if (saved) navigate(rulePath(id))
    else setErrors({ form: 'The alert rule could not be saved.' })
  }

  return <>
    <nav className="breadcrumb" aria-label="Breadcrumb"><SiteLink to="/alerting/list">Alert rules</SiteLink></nav>
    <PageHead title={before ? 'Edit alert rule' : 'New alert rule'} subtitle="Grafana-managed rule" />
    <form className="editor" onSubmit={save} noValidate>
      <Section title="Query and condition"><div className="fields">
        <Field label="Rule name" error={errors.name}><input value={draft.name} onChange={change('name')} /></Field>
        <Field label="Data source" error={errors.dataSourceId}><select value={draft.dataSourceId} onChange={change('dataSourceId')}>
          {draft.dataSourceId && !find(state.dataSources, draft.dataSourceId) && <option value={draft.dataSourceId}>Unavailable source</option>}
          <option value="">Select data source</option><SelectOptions items={state.dataSources} label="name" />
        </select></Field>
        <Field label="Query" error={errors.query}><textarea className="query" value={draft.query} onChange={change('query')} /></Field>
        <div className="field-row">
          <Field label="Condition"><select value={draft.operator} onChange={change('operator')}><option value="gt">Is above</option><option value="lt">Is below</option></select></Field>
          <Field label="Threshold" error={errors.threshold}><input type="number" step="any" value={draft.threshold} onChange={change('threshold')} /></Field>
        </div>
        <div className="actions"><button type="button" onClick={runPreview}>Preview condition</button>
          {preview && <span role="status">Sample value {preview.value} · {preview.matched ? 'Condition met' : 'Condition clear'}</span>}
        </div>
      </div></Section>
      <Section title="Folder and evaluation group"><div className="fields">
        <Field label="Folder" error={errors.folderId}><select value={draft.folderId} onChange={(event) => patch({ folderId: event.target.value, evaluationGroupId: '' })}>
          {draft.folderId && !find(state.folders, draft.folderId) && <option value={draft.folderId}>Unavailable folder</option>}
          <option value="">Select folder</option><SelectOptions items={state.folders} />
        </select></Field>
        <div className="field-row">
          <Field label="Evaluation group" error={errors.evaluationGroupId}><select value={draft.evaluationGroupId} onChange={change('evaluationGroupId')}>
            {draft.evaluationGroupId && !newGroup && !find(groups, draft.evaluationGroupId) && <option value={draft.evaluationGroupId}>Unavailable group</option>}
            <option value="">Select evaluation group</option><SelectOptions items={groups} label="name" />
            {newGroup && <option value="new-group">New evaluation group</option>}
          </select></Field>
          <div className="actions field-bottom"><button type="button" disabled={!find(state.folders, draft.folderId) || newGroup}
            onClick={() => patch({ evaluationGroupId: 'new-group', groupName: '', groupInterval: '60' })}>New evaluation group</button></div>
        </div>
        {newGroup && <div className="field-row">
          <Field label="Evaluation group name" error={errors.groupName}><input value={draft.groupName} onChange={change('groupName')} /></Field>
          <Field label="Evaluation interval (seconds)" error={errors.groupInterval}><input type="number" step="any" value={draft.groupInterval} onChange={change('groupInterval')} /></Field>
        </div>}
      </div></Section>
      <Section title="Evaluation behavior"><div className="fields">
        <Field label="Pending period (seconds)" error={errors.pendingSeconds}><input type="number" step="any" value={draft.pendingSeconds} onChange={change('pendingSeconds')} /></Field>
        <div className="field-row">
          <Field label="If no data"><select value={draft.noDataState} onChange={change('noDataState')}>
            {[['no_data', 'No data'], ...fallbackOptions].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></Field>
          <Field label="If execution fails"><select value={draft.errorState} onChange={change('errorState')}>
            {[['error', 'Error'], ...fallbackOptions].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></Field>
        </div>
      </div></Section>
      <Section title="Notifications">
        <Field label="Contact point" error={errors.contactPointId}><select value={draft.contactPointId} onChange={change('contactPointId')}>
          {draft.contactPointId && !find(state.contactPoints, draft.contactPointId) && <option value={draft.contactPointId}>Unavailable contact point</option>}
          <option value="">No contact point</option><SelectOptions items={state.contactPoints} label="name" />
        </select></Field>
      </Section>
      <Section title="Labels, annotations, and panel link"><div className="fields">
        <Field label="Labels" hint="Enter one key=value pair per line." error={errors.labels}><textarea rows="3" value={draft.labels} onChange={change('labels')} /></Field>
        <Field label="Summary"><input value={draft.summary} onChange={change('summary')} /></Field>
        <Field label="Description"><textarea rows="3" value={draft.description} onChange={change('description')} /></Field>
        <Field label="Runbook URL"><input value={draft.runbookUrl} onChange={change('runbookUrl')} /></Field>
        <div className="field-row">
          <Field label="Dashboard" error={errors.dashboardId}><select value={draft.dashboardId} onChange={(event) => patch({ dashboardId: event.target.value, panelId: '' })}>
            {draft.dashboardId && !find(state.dashboards, draft.dashboardId) && <option value={draft.dashboardId}>Unavailable dashboard</option>}
            <option value="">No dashboard</option><SelectOptions items={state.dashboards} />
          </select></Field>
          <Field label="Panel" error={errors.panelId}><select value={draft.panelId} onChange={change('panelId')} disabled={!draft.dashboardId && !draft.panelId}>
            {draft.panelId && !find(panels, draft.panelId) && <option value={draft.panelId}>Unavailable panel</option>}
            <option value="">No panel</option><SelectOptions items={panels} />
          </select></Field>
        </div>
      </div></Section>
      {errors.form && <p className="field-error" role="alert">{errors.form}</p>}
      <SaveBar label="Save rule" cancel={<SiteLink className="button" to={cancel}>Cancel</SiteLink>} />
    </form>
  </>
}
