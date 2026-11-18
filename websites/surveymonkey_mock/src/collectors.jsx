import { useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import { useWorkspace } from './state.jsx'
import {
  collectorPath, collectorTypes, created, defaultSettings, displayDate, entryPath, groupCount, idFor, nameFor,
  questionsFor, removeRecords, replaceRecord, settingsFor, surveyPath, updated,
} from './model.js'
import { withSid } from './utils/dataManager.js'
import {
  Badge, Confirm, Empty, Icon, Missing, Modal, Select, SiteLink, Table, TextField, useSiteNavigate,
} from './ui.jsx'

function CollectorDialog({ survey, collector, onClose }) {
  const { change } = useWorkspace()
  const navigate = useSiteNavigate()
  const [name, setName] = useState(collector?.name ?? '')
  const [type, setType] = useState('webLink')
  const [error, setError] = useState('')
  const title = collector ? 'Rename collector' : 'Create collector'

  function submit(event) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Enter a collector name.')
      event.currentTarget.querySelector('input')?.focus()
      return
    }
    if (collector) {
      change(current => {
        const live = current.collectors.find(item => item.id === collector.id)
        if (!live || live.name === trimmed) return current
        return replaceRecord(current, 'collectors', live.id, item => ({ ...item, name: trimmed, ...updated(current) }))
      })
      onClose()
      return
    }
    const id = idFor('col')
    const saved = change(current => {
      const live = current.surveys.find(item => item.id === survey.id)
      if (!live || !questionsFor(live).length) return current
      return { ...current, collectors: [...current.collectors, {
        id, surveyId: survey.id, name: trimmed, type, status: 'open',
        settings: { ...defaultSettings }, closedAt: null, ...created(current),
      }] }
    })
    if (!saved) {
      setError('Add a question before creating a collector.')
      return
    }
    onClose()
    navigate(collectorPath(survey.id, id))
  }

  return <Modal title={title} onClose={onClose}>
    <form className="stack" onSubmit={submit} noValidate>
      {!collector && <Select label="Collector type" value={type} onChange={setType}>
        {Object.entries(collectorTypes).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
      </Select>}
      <TextField id="collector-name" label="Collector name" value={name} required data-initial-focus
        onChange={value => { setName(value); setError('') }} error={error}/>
      <div className="dialog-actions"><button className="button secondary" type="button" onClick={onClose}>Cancel</button>
        <button className="button primary">{collector ? 'Save name' : 'Create collector'}</button></div>
    </form>
  </Modal>
}

export function CollectorList() {
  const survey = useOutletContext()
  const { state } = useWorkspace()
  const [creating, setCreating] = useState(false)
  const collectors = state.collectors.filter(collector => collector.surveyId === survey.id)
  const counts = groupCount(state.responses, 'collectorId')
  const hasQuestions = questionsFor(survey).length > 0

  return <section className="stack">
    <div className="between"><h2>Collectors</h2>
      <button className="button primary" disabled={!hasQuestions} onClick={() => setCreating(true)}><Icon name="plus" size={18}/> Create collector</button></div>
    {!hasQuestions && <div className="surface between">
      <p>Add a question before creating a collector.</p><SiteLink to={surveyPath(survey.id)}>Design survey</SiteLink>
    </div>}
    <Table label="Collectors" headers={['Collector name', 'Type', 'Status', 'Responses', 'Last modified']}
      empty={!collectors.length && <Empty title="No collectors yet">Create a web link or manual data entry collector to start recording responses.</Empty>}>
      {collectors.map(collector => <tr key={collector.id}>
        <td><SiteLink to={collectorPath(survey.id, collector.id)}>{nameFor(collector)}</SiteLink></td>
        <td>{collectorTypes[collector.type] || 'Collector'}</td>
        <td><Badge>{collector.status === 'open' ? 'Open' : 'Closed'}</Badge></td>
        <td>{counts.get(collector.id) ?? 0}</td><td className="date-cell">{displayDate(collector.updatedAt)}</td>
      </tr>)}
    </Table>
    {creating && <CollectorDialog survey={survey} onClose={() => setCreating(false)}/>}
  </section>
}

function CollectorSettings({ collector }) {
  const { change } = useWorkspace()
  const [draft, setDraft] = useState(() => settingsFor(collector))
  const [message, setMessage] = useState('')
  const live = settingsFor(collector)
  const settings = { ...draft, closedMessage: (draft.closedMessage ?? '').trim() }
  const dirty = Object.keys(defaultSettings).some(key => settings[key] !== live[key])

  function update(key, value) {
    setDraft(current => ({ ...current, [key]: value }))
    setMessage('')
  }

  function save(event) {
    event.preventDefault()
    if (!dirty) return
    if (change(current => replaceRecord(current, 'collectors', collector.id, item => ({
      ...item, settings: { ...item.settings, ...settings }, ...updated(current),
    })))) setMessage('Settings saved.')
  }

  return <form className="surface stack collector-settings" onSubmit={save}>
    <h2>Collector settings</h2>
    <Select label="Respondent identity" value={draft.anonymous ? 'anonymous' : 'identified'} onChange={value => update('anonymous', value === 'anonymous')}>
      <option value="anonymous">Anonymous</option><option value="identified">Identified</option>
    </Select>
    {collector.type === 'webLink' && !draft.anonymous && <label className="check-label">
      <input type="checkbox" checked={!draft.allowMultipleResponses} onChange={event => update('allowMultipleResponses', !event.target.checked)}/>
      Limit to one response per email address
    </label>}
    <TextField id="closed-message" label="Closed message" value={draft.closedMessage ?? ''} onChange={value => update('closedMessage', value)} multiline rows={3}/>
    <div className="inline"><button className="button primary" disabled={!dirty}>Save settings</button>{message && <span role="status" className="success-text">{message}</span>}</div>
  </form>
}

function CollectorChannel({ collector, survey }) {
  const [message, setMessage] = useState('')
  const open = collector.status === 'open'
  const path = withSid(entryPath(collector.id))
  const url = new URL(path, window.location.origin).href

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setMessage('Link copied.')
    } catch {
      const field = document.getElementById('collector-url')
      field?.focus()
      field?.select()
      setMessage('Link selected. Press Ctrl+C to copy it.')
    }
  }

  return <section className="surface stack collector-channel">
    <h2>{collectorTypes[collector.type] || 'Collector access'}</h2>
    {collector.type === 'webLink' && <>
      <div className="link-field">
        <label className="field" htmlFor="collector-url"><span>Survey link</span><input id="collector-url" readOnly value={url}/></label>
        <button className="button secondary" onClick={copy}><Icon name="link" size={16}/> Copy link</button>
        <a className="button secondary" href={path} target="_blank" rel="noopener">Open link</a>
      </div>
      {message && <p className="success-text" role="status">{message}</p>}
    </>}
    {collector.type === 'manual' && <div>
      {open ? <SiteLink className="button primary" to={collectorPath(survey.id, collector.id) + '/entry'}>Enter response</SiteLink>
        : <p className="muted">Reopen this collector to enter a response.</p>}
    </div>}
  </section>
}

export function CollectorDetail() {
  const survey = useOutletContext()
  const { collectorId } = useParams()
  const { state, change } = useWorkspace()
  const navigate = useSiteNavigate()
  const [action, setAction] = useState('')
  const collector = state.collectors.find(item => item.id === collectorId && item.surveyId === survey.id)
  const listPath = surveyPath(survey.id, 'collect')
  if (!collector) return <Missing title="Collector unavailable" to={listPath} label="Back to collectors"/>

  const count = state.responses.filter(response => response.collectorId === collectorId).length
  const open = collector.status === 'open'
  const dismiss = () => setAction('')

  function toggleStatus() {
    change(current => replaceRecord(current, 'collectors', collectorId, item => {
      const now = new Date().toISOString()
      const closing = item.status === 'open'
      return { ...item, status: closing ? 'closed' : 'open', closedAt: closing ? now : null, ...updated(current, now) }
    }))
  }

  function remove(kind) {
    const deleted = change(current => {
      if (!current.collectors.some(record => record.id === collectorId && record.surveyId === survey.id)) return current
      const ids = current.responses.filter(response => response.collectorId === collectorId).map(response => response.id)
      if (kind === 'clear' && ids.length) return removeRecords(current, 'clearCollectorResponses', collectorId, survey.id, [], [], ids)
      if (kind === 'delete' && !ids.length) return removeRecords(current, 'deleteCollector', collectorId, survey.id, [], [collectorId])
      return current
    })
    dismiss()
    if (deleted && kind === 'delete') navigate(listPath)
  }

  return <div className="stack collector-detail">
    <section>
      <SiteLink className="back-link" to={listPath}><Icon name="left" size={15}/> All collectors</SiteLink>
      <div className="between">
        <div className="inline"><h2>{nameFor(collector)}</h2><Badge>{open ? 'Open' : 'Closed'}</Badge></div>
        <div className="inline"><button className="button secondary" onClick={() => setAction('rename')}>Rename collector</button>
          <button className="button secondary" onClick={toggleStatus}>{open ? 'Close collector' : 'Reopen collector'}</button></div>
      </div>
      <p className="muted">{count} {count === 1 ? 'response' : 'responses'} · Last modified {displayDate(collector.updatedAt)}</p>
    </section>
    <CollectorChannel collector={collector} survey={survey}/>
    <CollectorSettings collector={collector}/>
    <section className="surface stack">
      <h2>Response management</h2>
      <p className="muted">{count ? 'Clear responses before deleting this collector.' : 'This collector has no responses.'}</p>
      <div className="inline">
        <button className="button secondary destructive-text" disabled={!count} onClick={() => setAction('clear')}>Clear responses</button>
        <button className="button secondary destructive-text" disabled={count > 0} onClick={() => setAction('delete')}>Delete collector</button>
      </div>
    </section>
    {action === 'rename' && <CollectorDialog survey={survey} collector={collector} onClose={dismiss}/>}
    {action === 'clear' && <Confirm title="Clear responses" label="Clear responses"
      message={`Permanently remove ${count} ${count === 1 ? 'response' : 'responses'} from “${nameFor(collector)}”? The collector will stay ${open ? 'open' : 'closed'}.`}
      onClose={dismiss} onConfirm={() => remove('clear')}/>}
    {action === 'delete' && <Confirm title="Delete collector" label="Delete collector"
      message={`Permanently delete “${nameFor(collector)}”?`} onClose={dismiss} onConfirm={() => remove('delete')}/>}
  </div>
}
