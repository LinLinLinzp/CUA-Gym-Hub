import { useState } from 'react'
import { useWorkspace } from './store'
import { AppMark, Badge, Icon, PageTitle, Payload, SiteLink } from './ui'
import {
  actor, appName, byId, dateLabel, editMeta, eventFor, idFor, isPublished, items, relevantSteps, replace, statusOf, timestamp,
} from './utils/model'
import { blankStep, connectionIssue, evaluateSteps, invalidateTests, validateWorkflow } from './utils/workflow'

function FieldSetting({ field, setting, sources, update }) {
  const id = 'field-' + field.key
  const label = field.label || field.key
  const mode = setting?.type === 'mapping' ? 'mapping' : 'literal'
  const currentValue = mode === 'mapping' ? '' : setting?.type === 'literal' ? setting.value ?? '' : setting ?? ''
  const sourceOptions = sources.flatMap(({ step, event, index }) => Object.keys(event?.sampleOutput || {}).map((key) => ({
    value: JSON.stringify([step.id, key]), label: 'Step ' + (index + 1) + ' · ' + key,
  })))
  const mapped = mode === 'mapping' && setting.stepId && setting.outputKey ? JSON.stringify([setting.stepId, setting.outputKey]) : ''
  return <div className="form-field">
    <label htmlFor={id} className={field.required ? "required" : undefined}>{label}</label>
    <div className="setting-control">
      {sources.length > 0 && <select aria-label={label + ' input mode'} value={mode} onChange={(change) => {
        update(change.target.value === 'mapping'
          ? { type: 'mapping', stepId: null, outputKey: null }
          : { type: 'literal', value: '' })
      }}><option value="literal">Enter value</option><option value="mapping">Map from a step</option></select>}
      {mode === 'mapping' ? <select id={id} aria-required={field.required} value={mapped} onChange={(change) => {
        const [stepId, outputKey] = change.target.value ? JSON.parse(change.target.value) : [null, null]
        update({ type: 'mapping', stepId, outputKey })
      }}><option value="">Choose an earlier output</option>
        {mapped && !sourceOptions.some((option) => option.value === mapped) && <option value={mapped}>Unavailable output</option>}
        {sourceOptions.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
      </select> : <input id={id} aria-required={field.required} value={currentValue} placeholder={'Enter ' + label.toLowerCase()} onChange={(change) => update({ type: 'literal', value: change.target.value })} />}
    </div>
  </div>
}

function StepForm({ step, steps, index, state, update, remove, test }) {
  const app = byId(state.apps, step.appId)
  const event = eventFor(state, step)
  const choices = items(state.apps).filter((candidate) => items(candidate.events).some((entry) => entry.kind === step.kind))
  const connections = items(state.connections).filter((connection) => connection.appId === step.appId)
  const selectedConnection = byId(connections, step.connectionId)
  const sources = steps.slice(0, index).map((entry, number) => ({ step: entry, index: number, event: eventFor(state, entry) }))
  const repair = step.connectionId && connectionIssue(state, step)
  return <section className="panel pad" aria-label="Step configuration">
    <div className="section-head"><h2>{step.kind === 'trigger' ? 'Configure trigger' : 'Configure action ' + index}</h2>
      {index > 0 && <button className="danger-text" type="button" onClick={remove}>Remove action</button>}
    </div>
    <form className="fields" onSubmit={(submit) => { submit.preventDefault(); test() }}>
      <label className="form-field"><span>App</span><select aria-label="App" value={step.appId || ''} onChange={(change) => update({ appId: change.target.value || null, eventId: null, connectionId: null, fields: {} })}>
        <option value="">Choose an app</option>
        {step.appId && !choices.some((choice) => choice.id === step.appId) && <option value={step.appId}>{appName(state, step.appId)}</option>}
        {choices.map((choice) => <option key={choice.id} value={choice.id}>{choice.name || 'Unnamed app'}</option>)}
      </select></label>
      {app && <>
        <label className="form-field"><span>Event</span><select aria-label="Event" value={step.eventId || ''} onChange={(change) => update({ eventId: change.target.value || null, fields: {} })}>
          <option value="">Choose an event</option>
          {step.eventId && !event && <option value={step.eventId}>Unavailable event</option>}
          {items(app.events).filter((candidate) => candidate.kind === step.kind).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name || 'Unnamed event'}</option>)}
        </select></label>
        {app.requiresConnection !== false && <label className="form-field"><span>Connection</span><select aria-label="Connection" value={step.connectionId || ''} onChange={(change) => update({ connectionId: change.target.value || null })}>
          <option value="">Choose a connection</option>
          {step.connectionId && !selectedConnection && <option value={step.connectionId}>Removed connection</option>}
          {connections.map((connection) => <option key={connection.id} value={connection.id}>{connection.name || connection.accountLabel || 'Unnamed connection'}{connection.status === 'expired' ? ' (expired)' : ''}</option>)}
        </select></label>}
        {repair && <p className="alert">{repair} <SiteLink to={'/connections?app=' + encodeURIComponent(app.id)}>App connections</SiteLink></p>}
        {items(event?.fields).filter((field) => field.key).map((field) => <FieldSetting key={field.key} field={field} setting={step.fields?.[field.key]} sources={step.kind === 'action' ? sources : []} update={(setting) => update({ fields: { ...step.fields, [field.key]: setting } })} />)}
      </>}
      <div><button type="submit">Test step</button></div>
    </form>
    {step.lastTest && <div className="test-result">
      <div className="section-head"><h2>Latest test</h2><Badge status={step.lastTest.status} /></div>
      {step.lastTest.error && <p className="alert">{step.lastTest.error}</p>}
      <div className="payload-grid"><div><h3>Input</h3><Payload value={step.lastTest.input} /></div><div><h3>Output</h3><Payload value={step.lastTest.output} /></div></div>
    </div>}
  </section>
}

export default function ZapEditor({ zap, Switch }) {
  const { state, dispatch } = useWorkspace()
  const [name, setName] = useState(zap.name || 'Untitled Zap')
  const [steps, setSteps] = useState(() => {
    const existing = relevantSteps(zap)
    return existing.length ? existing.map((step) => step.id ? step : { ...step, id: idFor('stp') }) : [blankStep('trigger')]
  })
  const [selectedId, setSelectedId] = useState(steps[0].id)
  const [issue, setIssue] = useState('')
  const [dirty, setDirty] = useState(false)
  const index = Math.max(0, steps.findIndex((step) => step.id === selectedId))
  const selected = steps[index]
  const published = isPublished(zap)
  const missingPublished = items(zap.publishedSteps).some((step) => {
    return step.connectionId && !byId(state.connections, step.connectionId)
  })

  function save(mode) {
    const title = name.trim()
    if (!title) return setIssue('Enter a Zap name.')
    let nextSteps = steps
    const at = timestamp()
    const success = dispatch((current) => {
      const live = byId(current.zaps, zap.id)
      if (!live) return current
      const patch = { name: title }
      if (mode === 'test') {
        const result = evaluateSteps(current, steps)(index)
        if (result.error) { setIssue(result.error); return current }
        nextSteps = steps.map((step, position) => position === index
          ? { ...step, lastTest: { ...result, status: 'success', createdAt: at, createdBy: actor(current) } }
          : step)
      }
      if (mode === 'publish') {
        const { error } = validateWorkflow(current, steps)
        if (error) { setIssue(error); return current }
        Object.assign(patch, { publishedSteps: steps, publishedAt: at, version: (Number(live.version) || 0) + 1, enabled: true, status: 'on' })
      }
      const updated = { ...live, ...patch, draftSteps: nextSteps, ...editMeta(current, at) }
      return { ...current, zaps: replace(current.zaps, updated) }
    }, { draft: 'Draft saved.', test: 'Step test completed and draft saved.', publish: 'Zap published and turned on.' }[mode])
    if (success) {
      setName(title)
      setSteps(nextSteps)
      setIssue('')
      setDirty(false)
    }
  }

  function editSteps(next) {
    setSteps(next)
    setIssue('')
    setDirty(true)
  }

  function update(patch) {
    editSteps(invalidateTests(steps.map((step, position) => position === index ? { ...step, ...patch } : step), selected.id))
  }

  function remove() {
    const blocked = steps.find((step, position) => position > index && Object.values(step.fields || {}).some((setting) => setting?.type === 'mapping' && setting.stepId === selected.id))
    if (blocked) return setIssue('Clear the mappings from step ' + (steps.indexOf(blocked) + 1) + ' before removing this action.')
    editSteps(steps.filter((_, position) => position !== index))
    setSelectedId(steps[index - 1].id)
  }

  return <>
    <SiteLink className="back-link" to="/zaps"><Icon name="back" />Back to Zaps</SiteLink>
    <PageTitle title={zap.name || 'Untitled Zap'} description={published ? 'Published version ' + (zap.version || 1) + (zap.publishedAt ? ' · ' + dateLabel(zap.publishedAt) : '') : 'Draft workflow'}>
      <Badge status={statusOf(zap)} />{published && <Switch zap={zap} onIssue={setIssue} />}
      <button type="button" onClick={() => save('draft')}>Save draft</button>
      <button type="button" className="primary" onClick={() => save('publish')}>Publish</button>
    </PageTitle>
    {issue && <p role="alert" className="alert editor-alert">{issue}</p>}
    {missingPublished && <p className="alert editor-alert">A published step uses a removed connection. Replace the connection in the draft and publish again.</p>}
    <div className="panel pad zap-name"><label className="form-field"><span>Zap name</span><input value={name} maxLength={120} onChange={(change) => { setName(change.target.value); setDirty(true); setIssue('') }} /></label>
      {dirty && <span className="unsaved">Unsaved changes</span>}
    </div>
    <div className="two-panel">
      <section className="panel pad" aria-label="Workflow steps">
        <div className="section-head"><h2>Workflow steps</h2></div>
        <ol className="steps">{steps.map((step, position) => <li key={step.id}>
          <button type="button" className="step-button" aria-pressed={position === index} onClick={() => { setSelectedId(step.id); setIssue('') }}>
            <AppMark app={byId(state.apps, step.appId)} /><span><small>{step.kind === 'trigger' ? 'Trigger' : 'Action ' + position}</small><strong>{eventFor(state, step)?.name || appName(state, step.appId)}</strong></span>
          </button>
        </li>)}</ol>
        <button className="add-step" type="button" onClick={() => {
          const step = blankStep('action')
          editSteps([...steps, step])
          setSelectedId(step.id)
        }}><Icon name="plus" size={16} />Add action</button>
      </section>
      <StepForm step={selected} steps={steps} index={index} state={state} update={update} remove={remove} test={() => save('test')} />
    </div>
  </>
}
