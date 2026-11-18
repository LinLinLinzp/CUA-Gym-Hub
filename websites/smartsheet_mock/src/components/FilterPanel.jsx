import React, { useState } from 'react'
import { byId, columnsOf, rowsOf } from '../data/sheets.js'
import { allowsContains, changeNamedFilter, parseFilter, saveNamedFilter } from '../data/filters.js'
import { useStore } from '../store.jsx'
import CellInput from './CellInput.jsx'
import { Button, Dialog, Problem } from './ui.jsx'

export default function FilterPanel({ sheet, filter, setFilter, close }) {
  const { state, commit } = useStore()
  const columns = columnsOf(sheet)
  const [draft, setDraft] = useState(filter || { columnId: columns[0]?.id || '', operator: 'equals', value: null })
  const [error, setError] = useState('')
  const [savedId, setSavedId] = useState(filter?.id ?? '')
  const [mode, setMode] = useState('')
  const [name, setName] = useState('')
  const saved = byId(sheet.savedFilters, savedId)
  const column = byId(columns, draft.columnId)
  function patch(change) { setDraft({ ...draft, ...change }); setSavedId(''); setError('') }
  function open(nextMode) { setMode(nextMode); setName(nextMode === 'rename' ? saved?.name ?? '' : ''); setError('') }
  function submitNamed(event) {
    event.preventDefault()
    try {
      if (mode === 'save') commit(current => saveNamedFilter(current, sheet, draft, name))
      else commit(current => changeNamedFilter(current, sheet, savedId, mode === 'delete' ? null : name))
      if (mode === 'delete') {
        if (filter?.id === savedId) setFilter(null)
        setSavedId('')
      }
      if (mode === 'save') {
        const parsed = parseFilter(state, sheet, draft)
        setDraft(parsed)
      }
      setMode('')
    } catch (failure) { setError(failure.message) }
  }
  return <><form className="filter-panel panel" onSubmit={event => {
    event.preventDefault()
    try { setFilter({ ...parseFilter(state, sheet, draft), ...(saved ? { id: saved.id } : {}) }); close() } catch (failure) { setError(failure.message) }
  }}>
    <div className="saved-filter-row">
      <label className="field">Saved filters<select value={savedId} onChange={event => {
        const filter = byId(sheet.savedFilters, event.target.value)
        setSavedId(event.target.value)
        setError('')
        if (filter) setDraft(filter)
      }}><option value="">Custom filter</option>{(sheet.savedFilters ?? []).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <Button onClick={() => open('rename')} disabled={!saved}>Rename saved filter</Button>
      <Button onClick={() => open('delete')} disabled={!saved}>Delete saved filter</Button>
    </div>
    <div className="filter-fields">
      <label className="field">Column<select autoFocus value={draft.columnId} onChange={event => patch({ columnId: event.target.value, operator: 'equals', value: null })}>
        <option value="">Choose a column</option>{columns.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      <label className="field">Operator<select value={draft.operator} onChange={event => patch({ operator: event.target.value, value: null })}>
        <option value="equals">Equals</option>{allowsContains(column) && <option value="contains">Contains</option>}<option value="isBlank">Is blank</option></select></label>
      {column && draft.operator !== 'isBlank' && <label className="field">Value<CellInput column={draft.operator === 'contains' ? { type: 'text' } : column}
        value={draft.value} users={state.users} rows={rowsOf(state, sheet.id)} booleanSelect onChange={value => patch({ value })} /></label>}
    </div>
    {!mode && <Problem message={error} />}
    <div className="actions"><Button onClick={() => { setFilter(null); close() }}>Clear filter</Button><Button onClick={close}>Cancel</Button><Button onClick={() => open('save')} disabled={!column}>Save filter</Button><Button type="submit" variant="primary" disabled={!column}>Apply filter</Button></div>
  </form>
    {mode && <Dialog title={mode === 'save' ? 'Save filter' : mode === 'rename' ? 'Rename saved filter' : 'Delete saved filter?'} onClose={() => { setMode(''); setError('') }}>
      <form className="stack" onSubmit={submitNamed}>
        {mode === 'delete' ? <p>Delete the saved filter {saved?.name}?</p> : <label className="field">Filter name<input autoFocus value={name} onChange={event => setName(event.target.value)} required /></label>}
        <Problem message={error} />
        <div className="actions"><Button onClick={() => { setMode(''); setError('') }}>Cancel</Button><Button type="submit" variant={mode === 'delete' ? 'danger' : 'primary'}>{mode === 'delete' ? 'Delete' : 'Save'}</Button></div>
      </form>
    </Dialog>}
  </>
}
