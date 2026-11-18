import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, SlidersHorizontal, Trash2 } from 'lucide-react'
import { activity, record, useStore } from '../store.jsx'
import { allFolders, array, folderExists, folderName, folderTree, id } from '../data/model.js'
import { operators, ruleFields } from '../data/drafts.js'
import { folderError, makeFolder } from '../data/folders.js'
import { Empty, IconButton, useInterface } from '../components/ui.jsx'

const validRule = rule => rule?.value?.trim()
const roots = folders => allFolders(folders).filter(folder => folder.type === 'system' && folder.id !== 'draft' && folder.id !== 'sent')
const newFolderValue = '__new_folder__'

export default function Filters() {
  const { state, dispatch, dispatchChange } = useStore()
  const { confirm, notify } = useInterface()
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const filters = array(state.filters)
  const position = filters.findIndex(filter => filter.id === selected)

  function choose(filter) {
    setSelected(filter?.id || null)
    setForm({ name: filter?.name || '', folderId: filter?.action?.folderId || 'inbox', folderName: '', rules: filter?.rules || {} })
    setError('')
  }

  function reorder(delta) {
    dispatch(current => {
      const ordered = [...array(current.filters)]
      const fromIndex = ordered.findIndex(filter => filter.id === selected)
      const toIndex = fromIndex + delta
      if (fromIndex === -1 || !ordered[toIndex]) return current
      const [before] = ordered.splice(fromIndex, 1)
      const after = { ...before, updatedAt: new Date().toISOString() }
      ordered.splice(toIndex, 0, after)
      return record(current, { filters: ordered }, activity(current, 'filter.reorder', { before, after, fromIndex, toIndex, orderedFilterIds: ordered.map(filter => filter.id) }, { filterIds: [after.id] }))
    })
  }

  function remove() {
    const filter = filters[position]
    if (!filter) return
    confirm({ title: 'Delete filter', text: 'Delete “' + filter.name + '”?', action: 'Delete filter', danger: true, onConfirm: async () => {
      const done = await dispatchChange({ type: 'deleteFilter', filterId: filter.id }, 'Delete filter')
      if (done) { setForm(null); setSelected(null); notify('Filter deleted') }
    } })
  }

  async function submit(event) {
    event.preventDefault()
    const name = form.name.trim()
    if (!name) { setError('Enter a filter name.'); return }
    const rules = Object.fromEntries(Object.keys(ruleFields).map(key => {
      const rule = form.rules[key]
      return [key, validRule(rule) ? { operator: rule.operator || 'contains', value: rule.value.trim(), matchCase: Boolean(rule.matchCase) } : null]
    }))
    if (!Object.values(rules).some(Boolean)) { setError('Enter at least one matching condition.'); return }
    const newFolder = form.folderId === newFolderValue
    let validation
    let saved
    const done = await dispatch(current => {
      const currentFilters = array(current.filters)
      const before = currentFilters.find(filter => filter.id === selected) || null
      const folders = array(current.folders)
      if (selected && !before) validation = 'This filter was deleted. Close the editor and add a new filter.'
      else if (!before && currentFilters.length >= 500) validation = 'You can save up to 500 filters.'
      else if (newFolder) validation = folderError(folders, form.folderName)
      else if (!folderExists(folders, form.folderId)) validation = 'Choose an existing folder.'
      if (validation) return current
      const now = new Date().toISOString()
      const folder = newFolder ? makeFolder(folders, form.folderName, null, now) : null
      saved = { ...before, id: before?.id || id('flt'), name, rules, action: { type: 'move', folderId: folder?.id || form.folderId }, createdAt: before?.createdAt || now, updatedAt: now }
      const next = before ? currentFilters.map(filter => filter.id === saved.id ? saved : filter) : [...currentFilters, saved]
      const events = folder ? [activity(current, 'folder.create', { before: null, after: folder }, { folderIds: [folder.id] })] : []
      events.push(activity(current, before ? 'filter.update' : 'filter.create', { before, after: saved }, { filterIds: [saved.id], folderIds: [saved.action.folderId] }))
      return record(current, { filters: next, ...(folder && { folders: [...folders, folder] }) }, ...events)
    })
    if (done) { setSelected(saved.id); setForm(null); setError(''); notify('Filter saved') }
    else if (validation) setError(validation)
  }

  return <div className="filters-layout">
    <section className="filter-list" aria-label="Your filters">
      <header><h1>Filters</h1><p className="muted">{filters.length} of 500 used</p></header>
      <div className="filter-tools">
        <button type="button" className="secondary" disabled={filters.length >= 500} onClick={() => choose(null)}><Plus size={16} /> Add new filters</button>
        <IconButton label="Move filter up" icon={ArrowUp} disabled={position < 1} onClick={() => reorder(-1)} />
        <IconButton label="Move filter down" icon={ArrowDown} disabled={position < 0 || position >= filters.length - 1} onClick={() => reorder(1)} />
        <IconButton label="Delete filter" icon={Trash2} disabled={position < 0} onClick={remove} />
      </div>
      <p className="small muted filter-note">Filters are listed in priority order.</p>
      <div className="filter-rows">
        {filters.map(filter => {
          const first = Object.entries(ruleFields).find(([key]) => validRule(filter.rules?.[key]))
          const rule = first && filter.rules[first[0]]
          return <button type="button" key={filter.id} className="filter-row" aria-pressed={selected === filter.id} onClick={() => choose(filter)}>
            <strong>{filter.name || 'Unnamed filter'}</strong><small>Deliver to “{folderName(state.folders, filter.action?.folderId)}”{first && ' if ' + first[1] + ' ' + rule.operator + ' “' + rule.value + '”'}</small>
          </button>
        })}
        {!filters.length && <p className="small muted padded">No filters yet.</p>}
      </div>
    </section>
    {form ? <form className="filter-editor field-stack" onSubmit={submit}>
      <h2>{selected ? 'Edit filter' : 'Add a new filter'}</h2>
      <label className="field">Filter name<input autoFocus aria-label="Filter name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
      {Object.entries(ruleFields).map(([key, title]) => {
        const rule = form.rules[key] || {}
        function update(values) { setForm(previous => ({ ...previous, rules: { ...previous.rules, [key]: { ...previous.rules[key], ...values } } })) }
        return <details className="filter-rule" key={key} open={key === 'from' || Boolean(rule.value) || undefined}>
          <summary>{title}</summary>
          <div className="two-fields">
            <label className="field">Match type<select aria-label={title + ' match type'} value={rule.operator || 'contains'} onChange={event => update({ operator: event.target.value })}>{operators.map(item => <option key={item}>{item}</option>)}</select></label>
            <label className="field">Value<input aria-label={title + ' value'} value={rule.value || ''} onChange={event => update({ value: event.target.value })} /></label>
          </div>
          <label className="check-label"><input aria-label={title + ' match case'} type="checkbox" checked={Boolean(rule.matchCase)} onChange={event => update({ matchCase: event.target.checked })} />Match case</label>
        </details>
      })}
      <label className="field">Move the message to<select aria-label="Destination folder" value={form.folderId} onChange={event => setForm({ ...form, folderId: event.target.value })}>
        {!folderExists(state.folders, form.folderId) && form.folderId !== newFolderValue && <option value={form.folderId}>Unavailable folder</option>}
        {roots(state.folders).map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
        {folderTree(state.folders).map(({ folder, depth }) => <option key={folder.id} value={folder.id}>{'  '.repeat(depth)}{folder.name || 'Unnamed folder'}</option>)}
        <option value={newFolderValue}>New folder…</option>
      </select></label>
      {form.folderId === newFolderValue && <label className="field">Folder name<input value={form.folderName} onChange={event => setForm({ ...form, folderName: event.target.value })} /></label>}
      {error && <p role="alert" className="error">{error}</p>}
      <footer className="dialog-actions"><button type="button" className="secondary" onClick={() => { setForm(null); setError('') }}>Cancel</button><button className="primary">Save</button></footer>
    </form> : <Empty title={filters.length ? 'Organize incoming mail' : 'Create your first filter'} icon={SlidersHorizontal}><p className="muted">{filters.length ? 'Select a filter to edit it or add a new one.' : 'Choose conditions and a folder for matching messages.'}</p></Empty>}
  </div>
}
