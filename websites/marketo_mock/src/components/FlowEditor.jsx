import { useState } from 'react'
import { Button, Field } from '../ui.jsx'
import { useWorkspace } from '../store.jsx'
import { statusesFor } from '../data/catalog.js'
import { findRecord, flowTypes, newId, records, staticLists, validFlow } from '../data/model.js'

export function FlowEditor({ campaign, locked, onSave }) {
  const { state } = useWorkspace()
  const [draft, setDraft] = useState(() => records(campaign.flow))
  const [error, setError] = useState('')
  const saved = records(campaign.flow)
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft)
  const lists = staticLists(state)
  const statuses = statusesFor(findRecord(state.programs, campaign.programId))

  function change(next) {
    setDraft(next)
    setError('')
  }

  function edit(index, fields) {
    change(draft.map((step, position) => position === index ? { ...step, ...fields } : step))
  }

  function move(index, direction) {
    const other = index + direction
    if (other < 0 || other >= draft.length) return
    const next = [...draft]
    next[index] = draft[other]
    next[other] = draft[index]
    change(next)
  }

  function save() {
    if (draft.length && !validFlow(state, campaign, draft)) {
      setError('Select a valid target for every flow step.')
      return
    }
    onSave(draft)
  }

  return <section className="card content-card editor-card">
    <div className="section-heading"><div><h2>Flow</h2><p>Set the actions this campaign applies in order.</p></div>
      <span className="count-chip">{saved.length} saved {saved.length === 1 ? 'step' : 'steps'}</span></div>
    {locked && <p className="callout">Deactivate the trigger or cancel the scheduled run to edit this flow.</p>}
    <fieldset className="editor-fields" disabled={locked}>
      {!draft.length && <p className="muted">Add a step to configure the flow.</p>}
      {draft.map((step, index) => <div className="flow-row" key={step.id ?? index}>
        <div className="step-number" aria-label={'Step ' + (index + 1)}>{index + 1}</div>
        <Field label="Action"><select value={step.type ?? ''} onChange={event => edit(index, { type: event.target.value, listId: null, status: null })}>
          <option value="" disabled>Select an action</option>
          {Object.entries(flowTypes).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
        </select></Field>
        {step.type === 'changeProgramStatus' ? <Field label="Program status"><select value={step.status ?? ''} onChange={event => edit(index, { status: event.target.value })}>
          <option value="">Select a status</option>{statuses.map(status => <option key={status}>{status}</option>)}
        </select></Field> : <Field label="Static list"><select value={step.listId ?? ''} onChange={event => edit(index, { listId: event.target.value })}>
          <option value="">Select a static list</option>{lists.map(list => <option key={list.id} value={list.id}>{list.name || 'Untitled list'}</option>)}
        </select></Field>}
        <div className="flow-actions">
          <Button icon="up" className="icon-button" aria-label={'Move up step ' + (index + 1)} disabled={index === 0} onClick={() => move(index, -1)} />
          <Button icon="down" className="icon-button" aria-label={'Move down step ' + (index + 1)} disabled={index === draft.length - 1} onClick={() => move(index, 1)} />
          <Button icon="close" className="icon-button" aria-label={'Remove step ' + (index + 1)} onClick={() => change(draft.filter((_, position) => position !== index))} />
        </div>
      </div>)}
      <Button icon="plus" onClick={() => change([...draft, { id: newId('step'), type: 'addToList', listId: null, status: null }])}>Add step</Button>
    </fieldset>
    {error && <p className="field-error" role="alert">{error}</p>}
    {!locked && <div className="editor-actions"><Button disabled={!dirty && !error} onClick={() => change(saved)}>Cancel</Button>
      <Button variant="primary" disabled={!dirty} onClick={save}>Save flow</Button></div>}
  </section>
}

