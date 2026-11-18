import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { titleColumn } from './data/seed'
import { contentsPath, formatDate, idFor, normalize, sameName, sitePath } from './model'
import { AppLink, Breadcrumb, ConfirmDelete, Empty, Field, FilterInput, FormActions, Modal, RowMenu, SortHeader, useDetail, usePaging, useRows } from './ui'
import { useWorkspace } from './workspace'

const columnTypes = ['text', 'number', 'date', 'choice']
const columnsFor = (list) => [titleColumn, ...(list.columns ?? []).filter((column) => column.id !== 'title')]
const getValue = (item, field) => field === 'title' ? item.title : item.values?.[field]
const displayValue = (value) => value == null || value === '' ? '—' : String(value)

export default function List({ site }) {
  const { data } = useWorkspace()
  const { listId } = useParams()
  const list = data.lists.find((record) => record.siteId === site.id && record.id === listId)
  if (!list) return <Empty title="List unavailable"><AppLink to={contentsPath(site.id)}>Return to site contents</AppLink></Empty>
  return <ListView key={list.id} site={site} list={list} />
}

function ListView({ site, list }) {
  const { data, commit } = useWorkspace()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [dialog, setDialog] = useState(null)
  const [detailId, setDetail] = useDetail('item')
  const columns = columnsFor(list)
  const items = data.listItems.filter((item) => item.listId === list.id)
  const item = items.find((record) => record.id === detailId)
  const statusColumn = columns.find((column) => normalize(column.name) === 'status')
  const statuses = [...new Set([...(statusColumn?.options ?? []),
    ...items.map((row) => statusColumn ? getValue(row, statusColumn.id) : null).filter(Boolean)])]
  const matches = items.filter((row) => (!status || status === getValue(row, statusColumn?.id)) &&
    columns.some((column) => normalize(getValue(row, column.id)).includes(normalize(query))))
  const table = useRows(matches, getValue, 'title')
  const paging = usePaging(table.rows, JSON.stringify([query, status, table.sort]))
  const visible = paging.rows.map((row) => row.id)
  const close = () => setDialog(null)

  function remove(ids) {
    commit((state, { removal }) => ({
      ...state,
      listItems: state.listItems.filter((record) => record.listId !== list.id || !ids.includes(record.id)),
      removals: [...state.removals, removal('deleteListItems', list.id, ids)],
    }), ids.length === 1 ? 'Item deleted.' : ids.length + ' items deleted.')
    table.toggle(ids, false)
  }

  return <>
    <Breadcrumb links={[{ name: 'Sites', to: '/sites' }, { name: site.name, to: sitePath(site.id) },
      { name: 'Site contents', to: contentsPath(site.id) }, { name: list.name }]} />
    <div className="page-heading"><div><h1>{list.name}</h1>{list.description && <p>{list.description}</p>}</div></div>
    <div className="toolbar">
      <button className="primary" onClick={() => setDialog({ type: 'item' })}><Plus size={17} />New item</button>
      <button onClick={() => setDialog({ type: 'column' })}><Plus size={17} />Add column</button>
      {!!table.selected.length && <><button onClick={() => setDialog({ type: 'delete', ids: table.selected })}><Trash2 size={16} />Delete</button>
        <span className="selection-count">{table.selected.length} selected</span></>}
      <div className="toolbar-end">
        <FilterInput label="Search items" value={query} setValue={setQuery} />
        {statusColumn && <select aria-label="Status filter" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>{statuses.map((value) => <option key={value}>{value}</option>)}
        </select>}
      </div>
    </div>
    {matches.length ? <div className="table-wrap">
      <table className="data-table list-table">
        <thead><tr>
          <th scope="col" className="check-cell"><input type="checkbox" aria-label="Select all items on this page"
            checked={visible.every((id) => table.selected.includes(id))} onChange={(event) => table.toggle(visible, event.target.checked)} /></th>
          {columns.map((column) => <SortHeader key={column.id} name={column.name} field={column.id} sort={table.sort} setSort={table.setSort} />)}
          <th scope="col" className="row-actions">Actions</th>
        </tr></thead>
        <tbody>{paging.rows.map((row) => <tr key={row.id} data-selected={table.selected.includes(row.id)}>
          <td className="check-cell"><input type="checkbox" aria-label={'Select ' + row.title} checked={table.selected.includes(row.id)}
            onChange={(event) => table.toggle([row.id], event.target.checked)} /></td>
          <td><button className="text-button" onClick={() => setDetail(row.id)}>{row.title}</button></td>
          {columns.slice(1).map((column) => <td key={column.id}>
            {column.id === statusColumn?.id && getValue(row, column.id)
              ? <span className="pill">{displayValue(getValue(row, column.id))}</span>
              : displayValue(getValue(row, column.id))}
          </td>)}
          <td className="row-actions"><RowMenu label={'Actions for ' + row.title} actions={[
            ['Edit', () => setDialog({ type: 'item', item: row })],
            ['Delete', () => setDialog({ type: 'delete', ids: [row.id] })],
          ]} /></td>
        </tr>)}</tbody>
      </table>
    </div> : <Empty title={items.length ? 'No matching items' : 'No items yet'}>
      {items.length ? 'Try a different search or status.' : <button onClick={() => setDialog({ type: 'item' })}>New item</button>}
    </Empty>}
    {paging.controls}
    {dialog?.type === 'column' && <ColumnForm list={list} columns={columns} onClose={close} />}
    {dialog?.type === 'item' && <ItemForm list={list} columns={columns} item={dialog.item} onClose={close} />}
    {dialog?.type === 'delete' && <ConfirmDelete title={dialog.ids.length === 1 ? 'Delete item' : 'Delete items'}
      description={'Permanently delete ' + dialog.ids.length + (dialog.ids.length === 1 ? ' item from this list?' : ' items from this list?')}
      onClose={close} onConfirm={() => remove(dialog.ids)} />}
    {!dialog && detailId && <Modal title={item?.title || 'Item unavailable'} panel onClose={() => setDetail(null)}>
      {item ? <>
        <dl className="metadata">{columns.map((column) => <div key={column.id}><dt>{column.name}</dt><dd>{displayValue(getValue(item, column.id))}</dd></div>)}
          <div><dt>Modified</dt><dd>{formatDate(item.updatedAt)}</dd></div>
        </dl>
        <button className="primary" onClick={() => setDialog({ type: 'item', item })}>Edit</button>
      </> : <p>This item is unavailable in the current list.</p>}
    </Modal>}
  </>
}

function ColumnForm({ list, columns, onClose }) {
  const { commit } = useWorkspace()
  const [name, setName] = useState('')
  const [type, setType] = useState('text')
  const [choices, setChoices] = useState('')
  const [required, setRequired] = useState(false)
  const [errors, setErrors] = useState({})
  function submit(event) {
    event.preventDefault()
    const value = name.trim()
    const options = type === 'choice' ? choices.split(/\r?\n/).map((choice) => choice.trim()).filter(Boolean) : []
    const nextErrors = {}
    if (!value || sameName(columns, value)) nextErrors.name = value ? 'A column with this name already exists.' : 'Enter a column name.'
    if (type === 'choice' && (!options.length || new Set(options.map(normalize)).size !== options.length)) {
      nextErrors.choices = 'Enter at least one choice and use each choice once.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    const column = { id: idFor('col'), name: value, type, required, options }
    commit((state, { modified }) => ({
      ...state, lists: state.lists.map((record) => record.id === list.id
        ? { ...record, columns: [...columnsFor(record), column], ...modified } : record),
    }), 'Column added.')
    onClose()
  }
  return <Modal title="Add column" onClose={onClose}>
    <form noValidate onSubmit={submit}>
      <Field label="Column name" error={errors.name}><input autoFocus aria-required="true" value={name} onChange={(event) => setName(event.target.value)} /></Field>
      <Field label="Column type"><select value={type} onChange={(event) => setType(event.target.value)}>
        {columnTypes.map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}
      </select></Field>
      {type === 'choice' && <Field label="Choices (one per line)" error={errors.choices}>
        <textarea value={choices} onChange={(event) => setChoices(event.target.value)} />
      </Field>}
      <label className="check-label"><input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} />Required</label>
      <FormActions action="Add column" onClose={onClose} />
    </form>
  </Modal>
}

function ItemForm({ list, columns, item, onClose }) {
  const { commit } = useWorkspace()
  const [errors, setErrors] = useState({})
  function submit(event) {
    event.preventDefault()
    const form = event.currentTarget
    const fields = new FormData(form)
    const title = String(fields.get('title') ?? '').trim()
    const values = { ...item?.values }
    const nextErrors = {}
    for (const column of columns) {
      const input = form.elements.namedItem(column.id)
      const value = String(fields.get(column.id) ?? '').trim()
      if (input.validity.badInput || (column.type === 'number' && value && !Number.isFinite(Number(value)))) {
        nextErrors[column.id] = 'Enter a valid number.'
      } else if (!value && column.required) {
        nextErrors[column.id] = 'Enter a value for ' + column.name + '.'
      } else if (column.id !== 'title') {
        if (value) values[column.id] = column.type === 'number' ? Number(value) : value
        else delete values[column.id]
      }
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    commit((state, { created, modified }) => ({
      ...state,
      listItems: item ? state.listItems.map((row) => row.id === item.id && row.listId === list.id
        ? { ...row, title, values, ...modified } : row) :
        [...state.listItems, { id: idFor('item'), listId: list.id, title, values, ...created }],
    }), item ? 'Item updated.' : 'Item created.')
    onClose()
  }
  return <Modal title={item ? 'Edit item' : 'New item'} panel onClose={onClose}>
    <form noValidate onSubmit={submit}>
      {columns.map((column) => {
        const value = getValue(item ?? {}, column.id) ?? ''
        const options = column.options ?? []
        const props = { name: column.id, defaultValue: value, 'aria-required': !!column.required, 'aria-invalid': !!errors[column.id] }
        return <Field key={column.id} label={column.name} error={errors[column.id]}>
          {column.type === 'choice' ? <select {...props}>
            <option value="">Select an option</option>
            {value !== '' && !options.includes(value) && <option>{value}</option>}
            {options.map((option) => <option key={option}>{option}</option>)}
          </select> : <input {...props} autoFocus={column.id === 'title'} step={column.type === 'number' ? 'any' : undefined}
            type={column.type === 'number' || column.type === 'date' ? column.type : 'text'} />}
        </Field>
      })}
      <FormActions onClose={onClose} action={item ? 'Save' : 'Create'} />
    </form>
  </Modal>
}
