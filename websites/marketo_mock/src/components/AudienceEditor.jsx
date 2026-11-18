import { useState } from 'react'
import { Button, Field } from '../ui.jsx'
import { useWorkspace } from '../store.jsx'
import { countries, stages } from '../data/catalog.js'
import { newId, operators, qualifiedPeople, records, ruleFields, staticLists, triggerTypes, validAudience, validTriggers } from '../data/model.js'
import { People } from './People.jsx'

const matchModes = [['all', 'All rules'], ['any', 'Any rule'], ['everyone', 'All people']]
const ruleFromField = field => ({ field, operator: ruleFields[field].operators[0], value: '' })

function readAudience(config) {
  return {
    matchMode: config.matchMode ?? '',
    rules: records(config.rules),
    triggers: records(config.triggers),
  }
}

export function AudienceEditor({ config, campaign = false, locked = false, onSave }) {
  const { state } = useWorkspace()
  const [draft, setDraft] = useState(() => readAudience(config))
  const [preview, setPreview] = useState(false)
  const [error, setError] = useState('')
  const saved = readAudience(config)
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  const lists = staticLists(state)
  const configTitle = campaign ? 'Smart List' : 'Smart list rules'
  const insights = preview ? qualifiedPeople(state, draft) : null

  function setField(key, value) {
    setDraft(previous => ({ ...previous, [key]: value }))
    setError('')
  }

  function updateItem(key, index, fields) {
    setField(key, draft[key].map((item, position) => index === position ? { ...item, ...fields } : item))
  }

  function removeItem(key, index) {
    setField(key, draft[key].filter((_, position) => index !== position))
  }

  function validated() {
    if (!validAudience(state, draft)) {
      setError('Choose a match option and complete every rule, or choose All people.')
      return false
    }
    if (campaign && !validTriggers(state, draft.triggers)) {
      setError('Select a valid static list for each Added to list trigger.')
      return false
    }
    setError('')
    return true
  }

  function save() {
    if (!validated()) return
    const next = {
      ...draft,
      rules: draft.matchMode === 'everyone' ? [] : draft.rules.map(rule => ({ ...rule, value: String(rule.value).trim() })),
    }
    if (onSave(next)) {
      setDraft(next)
      setPreview(false)
    }
  }

  function cancel() {
    setDraft(saved)
    setError('')
    setPreview(false)
  }

  return <>
    <section className="card content-card editor-card">
      <div className="section-heading">
        <div><h2>{configTitle}</h2><p>{campaign ? 'Define who qualifies and which events trigger this campaign.' : 'Choose the conditions people must meet to appear in this list.'}</p></div>
        <span className="count-chip">{qualifiedPeople(state, config).length} saved matches</span>
      </div>
      {locked && <p className="callout">Deactivate the trigger or cancel the scheduled run to edit this configuration.</p>}
      <fieldset className="editor-fields" disabled={locked}>
        {campaign && <div className="rules-section">
          <h3>Triggers</h3>
          {!draft.triggers.length && <p className="muted">No triggers. This campaign uses Batch mode.</p>}
          {draft.triggers.map((trigger, index) => <div className="rule-row trigger-row" key={trigger.id ?? index}>
            <Field label="Trigger"><select value={trigger.type ?? ''} onChange={event => updateItem('triggers', index, { type: event.target.value, listId: null })}>
              <option value="" disabled>Select a trigger</option>
              {Object.entries(triggerTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></Field>
            {trigger.type === 'addedToList' && <Field label="Static list"><select value={trigger.listId ?? ''} onChange={event => updateItem('triggers', index, { listId: event.target.value })}>
              <option value="">Select a static list</option>{lists.map(list => <option key={list.id} value={list.id}>{list.name || 'Untitled list'}</option>)}
            </select></Field>}
            <Button icon="close" className="icon-button" aria-label={'Remove trigger ' + (index + 1)} onClick={() => removeItem('triggers', index)} />
          </div>)}
          <Button icon="plus" onClick={() => setField('triggers', [...draft.triggers, { id: newId('trigger'), type: 'personCreated', listId: null }])}>Add trigger</Button>
        </div>}
        <div className="rules-section">
          <h3>Filters</h3>
          <Field label="Match people who meet"><select value={draft.matchMode} onChange={event => setField('matchMode', event.target.value)}>
            <option value="">Select how people qualify</option>
            {matchModes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></Field>
          {draft.matchMode !== 'everyone' && <>
            {draft.rules.map((rule, index) => {
              const field = Object.hasOwn(ruleFields, rule.field) ? ruleFields[rule.field] : null
              const suggestions = rule.field === 'country'
                ? [...new Set([...countries, ...records(state.people).map(person => person.country).filter(Boolean)])] : stages
              const datalist = 'rule-values-' + index
              return <div className="rule-row" key={rule.id ?? index}>
                <Field label="Field"><select value={rule.field ?? ''} onChange={event => updateItem('rules', index, ruleFromField(event.target.value))}>
                  <option value="" disabled>Select a field</option>
                  {Object.entries(ruleFields).map(([value, settings]) => <option key={value} value={value}>{settings.label}</option>)}
                </select></Field>
                <Field label="Operator"><select value={rule.operator ?? ''} onChange={event => updateItem('rules', index, { operator: event.target.value })}>
                  <option value="" disabled>Select operator</option>
                  {field?.operators.map(value => <option key={value} value={value}>{operators[value]}</option>)}
                </select></Field>
                <Field label={rule.field === 'memberOfList' ? 'Static list' : 'Value'}>
                  {rule.field === 'memberOfList'
                    ? <select value={rule.value ?? ''} onChange={event => updateItem('rules', index, { value: event.target.value })}>
                      <option value="">Select a static list</option>{lists.map(list => <option key={list.id} value={list.id}>{list.name || 'Untitled list'}</option>)}
                    </select>
                    : <><input value={rule.value ?? ''} list={rule.field === 'company' ? undefined : datalist}
                      onChange={event => updateItem('rules', index, { value: event.target.value })} />
                      <datalist id={datalist}>{suggestions.map(value => <option key={value} value={value} />)}</datalist></>}
                </Field>
                <Button icon="close" className="icon-button" aria-label={'Remove rule ' + (index + 1)} onClick={() => removeItem('rules', index)} />
              </div>
            })}
            <Button icon="plus" onClick={() => {
              setField('rules', [...draft.rules, { id: newId('rule'), ...ruleFromField('country') }])
              if (!draft.matchMode) setField('matchMode', 'all')
            }}>Add rule</Button>
          </>}
        </div>
      </fieldset>
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="editor-actions">
        <Button onClick={() => { if (validated()) setPreview(true) }}>Preview</Button>
        {!locked && <><Button onClick={cancel} disabled={!dirty && !preview && !error}>Cancel</Button>
          <Button variant="primary" disabled={!dirty} onClick={save}>Save {campaign ? 'Smart List' : 'rules'}</Button></>}
      </div>
    </section>
    {insights && <section className="preview-section">
      <div className="section-heading"><div><h2>Audience preview</h2><p aria-live="polite">{insights.length} {insights.length === 1 ? 'person matches' : 'people match'} the selected criteria.</p></div></div>
      <People readOnly preview rows={insights} />
    </section>}
  </>
}

