import React, { useId, useRef, useState } from 'react'
import { Check, ChevronDown, Ellipsis, Plus, Square, SquareCheck } from 'lucide-react'
import { displayCell, columnTypes } from '../data/cells.js'
import { changeColumn, editCells, insertRow, removeRows } from '../data/rows.js'
import { columnsOf, rowsOf } from '../data/sheets.js'
import { useStore } from '../store.jsx'
import CellInput from './CellInput.jsx'
import { Button, Dialog, Empty, IconButton, Menu, Problem, Status } from './ui.jsx'

function GridValue({ column, value, users, allRows }) {
  const text = displayCell(column, value, users, allRows)
  if (column.type === 'checkbox' && value != null) return value ? <SquareCheck size={15} aria-label={text} /> : <Square size={15} aria-label={text} />
  if (column.type === 'dropdown' && value) return <Status value={String(value)} />
  return text
}

export default function Grid({ sheet, rows, gantt = false, onSort }) {
  const { state, commit } = useStore()
  const columns = columnsOf(sheet)
  const allRows = rowsOf(state, sheet.id)
  const users = state.users ?? []
  const [selected, select] = useState(null)
  const [editing, setEditing] = useState(null)
  const [marks, setMarks] = useState([])
  const [dialog, setDialog] = useState(null)
  const [problem, setProblem] = useState('')
  const [editError, setEditError] = useState('')
  const errorId = useId()
  const buttons = useRef(new Map())
  const indexById = new Map(allRows.map((row, index) => [row.id, index + 1]))
  const matches = (cell, row, column) => cell?.rowId === row.id && cell.columnId === column.id
  const selectionVisible = rows.some(row => row.id === selected?.rowId) && columns.some(column => column.id === selected?.columnId)
  const marked = marks.filter(id => indexById.has(id))

  function perform(transaction, close = false) {
    try {
      commit(transaction)
      setProblem('')
      if (close) setDialog(null)
      return true
    } catch (error) { setProblem(error.message); return false }
  }

  function focus(rowIndex, columnIndex) {
    if (!rows.length || !columns.length) return
    const row = rows[Math.max(0, Math.min(rows.length - 1, rowIndex))]
    const column = columns[Math.max(0, Math.min(columns.length - 1, columnIndex))]
    select({ rowId: row.id, columnId: column.id })
    requestAnimationFrame(() => buttons.current.get(row.id + '\0' + column.id)?.focus())
  }

  function startEdit(row, column) {
    select({ rowId: row.id, columnId: column.id })
    setEditError('')
    setEditing({ rowId: row.id, columnId: column.id, value: row.cells?.[column.id] ?? null })
  }

  function finishEdit(rowIndex, columnIndex, direction, input) {
    try {
      if (input?.validity?.badInput) throw new Error('Enter a valid date.')
      commit(current => editCells(current, sheet.id, editing.rowId, { [editing.columnId]: editing.value }))
      setEditing(null)
      setEditError('')
      if (direction === 'next' && columnIndex === columns.length - 1 && rowIndex < rows.length - 1) focus(rowIndex + 1, 0)
      else if (direction === 'previous' && columnIndex === 0 && rowIndex > 0) focus(rowIndex - 1, columns.length - 1)
      else focus(rowIndex + Number(direction === 'down'), columnIndex + Number(direction === 'next') - Number(direction === 'previous'))
    } catch (error) { setEditError(error.message); input?.focus() }
  }

  function addRow(options) {
    perform(current => insertRow(current, sheet.id, options))
  }

  function openColumn(action, column) {
    setProblem('')
    setDialog({ action, id: column?.id, title: column?.title || '', type: 'text', options: '' })
  }

  function openDelete(rowId) {
    setProblem('')
    setDialog({ action: 'delete', ids: marked.includes(rowId) ? marked : [rowId] })
  }

  return <div className={'grid-widget ' + (gantt ? 'gantt-grid' : '')}>
    <table className="sheet-grid" aria-label="Sheet grid">
      <thead><tr>
        <th scope="col" className="row-gutter"><span className="sr-only">Row number</span><span aria-hidden="true">#</span></th>
        {columns.map((column, index) => <th scope="col" className={column.primary ? 'primary-cell' : 'typed-cell type-' + column.type} key={column.id}>
          <div className="column-heading"><span title={column.title}>{column.title}</span>
            <Menu floating title={column.title + ' column menu'} label={<ChevronDown size={13} />}>
              {onSort && <><button onClick={() => onSort(column, 1)}>Sort ascending</button><button onClick={() => onSort(column, -1)}>Sort descending</button></>}
              <button onClick={() => openColumn('add')}>Add column</button>
              <button onClick={() => openColumn('rename', column)}>Rename column</button>
              <button disabled={index === 0} onClick={() => perform(current => changeColumn(current, sheet.id, { action: 'move', id: column.id, offset: -1 }))}>Move left</button>
              <button disabled={index === columns.length - 1} onClick={() => perform(current => changeColumn(current, sheet.id, { action: 'move', id: column.id, offset: 1 }))}>Move right</button>
            </Menu>
          </div>
        </th>)}
        <th scope="col" className="column-add"><IconButton label="Add column" onClick={() => openColumn('add')}><Plus size={15} /></IconButton></th>
      </tr></thead>
      <tbody>{rows.map((row, rowIndex) => <tr key={row.id} className={marked.includes(row.id) ? 'marked-row' : ''}>
        <th scope="row" className="row-gutter">
          <div className="row-controls">
            <button className="row-number" aria-label={'Select row ' + indexById.get(row.id)} aria-pressed={marked.includes(row.id)} onClick={() => setMarks(marked.includes(row.id) ? marked.filter(id => id !== row.id) : [...marked, row.id])}>{indexById.get(row.id)}</button>
            <Menu floating title={'Row ' + indexById.get(row.id) + ' menu'} label={<Ellipsis size={13} />}>
              <button onClick={() => addRow({ referenceId: row.id, placement: 'above' })}>Insert row above</button>
              <button onClick={() => addRow({ referenceId: row.id, placement: 'below' })}>Insert row below</button>
              <button onClick={() => openDelete(row.id)}>{marked.includes(row.id) && marked.length > 1 ? 'Delete selected rows' : 'Delete row'}</button>
            </Menu>
          </div>
        </th>
        {columns.map((column, columnIndex) => {
          const label = column.title + ', row ' + indexById.get(row.id)
          const value = row.cells?.[column.id]
          const active = matches(selected, row, column)
          return <td className={active ? 'selected-cell' : ''} key={column.id}>
            {matches(editing, row, column) ?
              <div className="grid-editor">
                <CellInput autoFocus column={column} users={users} rows={allRows} booleanSelect value={editing.value} aria-label={label}
                  aria-invalid={Boolean(editError)} aria-describedby={editError ? errorId : undefined}
                  onChange={value => { setEditing({ ...editing, value }); setEditError('') }}
                  onKeyDown={event => {
                    if (event.key === 'Escape') {
                      event.preventDefault()
                      setEditing(null)
                      setEditError('')
                      focus(rowIndex, columnIndex)
                    }
                    if (event.key === 'Enter' || event.key === 'Tab') {
                      event.preventDefault()
                      finishEdit(rowIndex, columnIndex, event.key === 'Enter' ? 'down' : event.shiftKey ? 'previous' : 'next', event.currentTarget)
                    }
                  }} />
                <IconButton label="Commit edit" onClick={event => finishEdit(rowIndex, columnIndex, undefined, event.currentTarget.parentElement.querySelector('input, select'))}><Check size={14} /></IconButton>
                {editError && <div className="grid-edit-problem"><Problem id={errorId} message={editError} /></div>}
              </div> :
              <button className="cell-button" aria-label={label + (displayCell(column, value, users, allRows) ? ': ' + displayCell(column, value, users, allRows) : '')} title={displayCell(column, value, users, allRows) || undefined}
                tabIndex={active || !selectionVisible && rowIndex === 0 && columnIndex === 0 ? 0 : -1}
                ref={element => { const key = row.id + '\0' + column.id; if (element) buttons.current.set(key, element); else buttons.current.delete(key) }}
                onClick={() => { select({ rowId: row.id, columnId: column.id }); setEditing(null); setEditError('') }}
                onDoubleClick={() => startEdit(row, column)}
                onKeyDown={event => {
                  const offsets = { ArrowDown: [1, 0], ArrowUp: [-1, 0], ArrowRight: [0, 1], ArrowLeft: [0, -1] }[event.key]
                  if (offsets) { event.preventDefault(); setEditing(null); setEditError(''); focus(rowIndex + offsets[0], columnIndex + offsets[1]) }
                  if (event.key === 'Enter' || event.key === 'F2') { event.preventDefault(); startEdit(row, column) }
                }}><GridValue column={column} value={value} users={users} allRows={allRows} /></button>}
          </td>
        })}
        <td />
      </tr>)}</tbody>
    </table>
    {!rows.length && !gantt && <Empty title={allRows.length ? 'No rows match the filter' : 'No rows yet'} />}
    <div className="grid-footer"><Button variant="subtle" onClick={() => addRow()}><Plus size={16} /> Add Row</Button>
      {marked.length > 0 && <Button variant="subtle" onClick={() => openDelete(marked[0])}>Delete selected rows ({marked.length})</Button>}
      {!dialog && <Problem message={problem} />}
    </div>
    {dialog && <Dialog title={dialog.action === 'delete' ? 'Delete rows?' : dialog.action === 'add' ? 'Add column' : 'Rename column'} onClose={() => { setDialog(null); setProblem('') }}>
      <form className="stack" onSubmit={event => {
        event.preventDefault()
        if (dialog.action === 'delete') {
          if (perform(current => removeRows(current, sheet.id, dialog.ids), true)) setMarks([])
        } else perform(current => changeColumn(current, sheet.id, dialog), true)
      }}>
        {dialog.action === 'delete' ? <p>Delete {dialog.ids.length} {dialog.ids.length === 1 ? 'row' : 'rows'} and cancel their pending approval requests?</p> : <>
          <label className="field">Column name<input autoFocus required value={dialog.title} onChange={event => setDialog({ ...dialog, title: event.target.value })} /></label>
          {dialog.action === 'add' && <label className="field">Column type<select value={dialog.type} onChange={event => setDialog({ ...dialog, type: event.target.value })}>
            {columnTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>}
          {dialog.action === 'add' && dialog.type === 'dropdown' && <label className="field">Dropdown options<textarea rows="4" placeholder="One option per line" value={dialog.options} onChange={event => setDialog({ ...dialog, options: event.target.value })} /></label>}
        </>}
        <Problem message={problem} />
        <div className="actions"><Button onClick={() => { setDialog(null); setProblem('') }}>Cancel</Button><Button type="submit" variant={dialog.action === 'delete' ? 'danger' : 'primary'}>{dialog.action === 'delete' ? 'Delete' : 'Save'}</Button></div>
      </form>
    </Dialog>}
  </div>
}
