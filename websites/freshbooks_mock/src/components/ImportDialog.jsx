import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { buildImport } from '../data/rebilling.js'
import { currencies, find, money, validDate, visible } from '../utils/format.js'
import { Dialog, Empty, ErrorNote, Field, SearchBox, SearchPick } from './ui.jsx'

export function ImportDialog({ clientId, currency, excluded, locked, onClose, onImport }) {
  const { state } = useApp()
  const projectIds = client => [...state.projects.filter(row => row.clientId === client).map(row => row.id), '']
  const [scope, setScope] = useState({
    clientId: clientId || '', currency: currency || state.business?.currency || 'USD', from: '', to: '',
    projects: projectIds(clientId), expenses: true, format: 'detailed',
  })
  const [preview, setPreview] = useState(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [range, setRange] = useState(false)
  const projects = [...state.projects.filter(row => row.clientId === scope.clientId), { id: '', name: 'No Project' }]
  const patch = changes => { setScope(old => ({ ...old, ...changes })); setPreview(null); setError('') }
  function review() {
    if (!find(state.clients, scope.clientId)) return setError('Choose a billing client.')
    if ((scope.from && !validDate(scope.from)) || (scope.to && !validDate(scope.to)) || (scope.from && scope.to && scope.from > scope.to)) return setError('Enter a valid date range.')
    if (!scope.projects.length) return setError('Select at least one project or No Project.')
    setPreview(buildImport(state, scope, excluded))
  }
  return <Dialog title="Review Unbilled Time and Expenses" onClose={onClose} wide>
    <div className="form-stack">
      <div className="form-grid">
        <Field label="Client"><SearchPick rows={state.clients.filter(row => visible(row) || row.id === scope.clientId)} value={scope.clientId} disabled={locked}
          onChange={client => patch({ clientId: client, currency: find(state.clients, client)?.currency || scope.currency, projects: projectIds(client) })} /></Field>
        <Field label="Invoice Currency"><select disabled={locked} value={scope.currency} onChange={e => patch({ currency: e.target.value })}>{currencies.map(code => <option key={code}>{code}</option>)}</select></Field>
        <Field label="Date Range"><select value={range ? 'custom' : 'all'} onChange={e => { setRange(e.target.value === 'custom'); patch({ from: '', to: '' }) }}>
          <option value="all">All Time</option><option value="custom">Custom Range</option>
        </select></Field>
        <Field label="Time Format"><select value={scope.format} onChange={e => patch({ format: e.target.value })}>
          <option value="detailed">Detailed</option><option value="grouped">Grouped</option><option value="simple">Simple</option>
        </select></Field>
        {range && <>
          <Field label="From"><input type="date" value={scope.from} onChange={e => patch({ from: e.target.value })} /></Field>
          <Field label="Through"><input type="date" value={scope.to} onChange={e => patch({ to: e.target.value })} /></Field>
        </>}
      </div>
      <fieldset className="import-projects">
        <legend>Choose Projects</legend><SearchBox value={query} onChange={setQuery} placeholder="Search projects in scope" />
        <div>
          <label className="check-label"><input type="checkbox" checked={projects.every(row => scope.projects.includes(row.id))} onChange={e => patch({ projects: e.target.checked ? projects.map(row => row.id) : [] })} />Select All</label>
          {projects.filter(row => row.name?.toLowerCase().includes(query.toLowerCase())).map(row => <label key={row.id} className="check-label">
            <input type="checkbox" checked={scope.projects.includes(row.id)} onChange={e => patch({ projects: e.target.checked ? [...scope.projects, row.id] : scope.projects.filter(id => id !== row.id) })} />{row.name}
          </label>)}
        </div>
      </fieldset>
      <label className="check-label"><input type="checkbox" checked={scope.expenses} onChange={e => patch({ expenses: e.target.checked })} />Include unbilled expenses</label>
      <ErrorNote>{error}</ErrorNote>
      {preview && <div className="import-preview">
        <h3>Invoice Line Preview</h3>
        {preview.length ? preview.map(line => <div className="import-preview-row" key={line.id}><div><strong>{line.name}</strong><small>{line.description}</small><small>Sources {line.sources.map(source => source.id).join(', ')}</small></div>
          <strong>{money(line.sources.reduce((sum, source) => sum + source.amount, 0), scope.currency)}</strong></div>)
          : <Empty title="No eligible time or expenses" text="Check the client, currency, dates and projects." />}
      </div>}
      <div className="form-actions">
        <button type="button" className="button" onClick={onClose}>Cancel</button>
        <button type="button" className={preview?.length ? 'button' : 'button primary'} onClick={review}>Preview Lines</button>
        {preview?.length > 0 && <button type="button" className="button positive" onClick={() => onImport(scope, preview)}>Add to Invoice</button>}
      </div>
    </div>
  </Dialog>
}
