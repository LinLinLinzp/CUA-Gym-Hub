import { useState } from 'react'
import { Button, Confirm, Field, Modal, PagedTable, Pill, SearchBox, nameOf } from '../ui.jsx'
import { useWorkspace } from '../store.jsx'
import { changeMembership, findRecord, log, matchesText, metadata, records } from '../data/model.js'
import { statusesFor } from '../data/catalog.js'

const personColumns = [
  { key: 'name', label: 'Name', sort: true, value: nameOf, cell: person => <strong>{nameOf(person)}</strong> },
  { key: 'email', label: 'Email', sort: true },
  { key: 'company', label: 'Company', sort: true },
  { key: 'country', label: 'Country', sort: true },
  { key: 'lifecycleStage', label: 'Lifecycle stage', sort: true },
]

function matchPerson(query, person) {
  return matchesText(query, nameOf(person), person.email, person.company, person.country, person.lifecycleStage)
}

function selectionColumn(selected, toggle) {
  return {
    key: 'select', label: <span className="sr-only">Select people</span>, className: 'selection-column',
    cell: person => <input type="checkbox" aria-label={'Select ' + nameOf(person)} checked={selected.has(person.id)}
      onChange={() => toggle(person.id)} />,
  }
}

function useSelection() {
  const [selected, setSelected] = useState(new Set())
  function toggle(id) {
    setSelected(previous => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  return { selected, toggle, clear: () => setSelected(new Set()) }
}

function PersonPicker({ excluded, title, onClose, onCommit }) {
  const { state } = useWorkspace()
  const [query, setQuery] = useState('')
  const { selected, toggle } = useSelection()
  const rows = records(state.people).filter(person => !excluded.has(person.id) && matchPerson(query, person))

  return <Modal title={title} onClose={onClose} drawer>
    <div className="picker-body">
      <PagedTable columns={[selectionColumn(selected, toggle), ...personColumns.slice(0, 2)]} rows={rows} pageSize={10}
        resetKey={query} empty="No available people match your search."
        toolbar={<SearchBox label="Search database people" value={query} onChange={setQuery} />} />
    </div>
    <div className="dialog-actions"><span className="selection-note">{selected.size} selected</span>
      <Button onClick={onClose}>Cancel</Button>
      <Button variant="primary" disabled={!selected.size} onClick={() => onCommit([...selected])}>Add selected</Button></div>
  </Modal>
}

export function People({ rows, program, list, readOnly = false, preview = false }) {
  const { commit } = useWorkspace()
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState(null)
  const [status, setStatus] = useState('')
  const { selected, toggle, clear } = useSelection()
  const statusOptions = statusesFor(program)
  const activeSelection = rows.filter(person => selected.has(person.id)).map(person => person.id)
  const showSelection = !readOnly
  const columns = [
    ...(showSelection ? [selectionColumn(selected, toggle)] : []),
    ...personColumns,
    ...(program ? [{ key: 'status', label: 'Member status', sort: true,
      value: person => person.membership.status, cell: person => <Pill value={person.membership.status} /> }] : []),
  ]

  function apply(operation, personIds) {
    const type = program ? 'program' : 'list'
    const id = program?.id ?? list?.id
    const action = program
      ? operation === 'add' ? 'program_members_added' : 'program_member_status_changed'
      : operation === 'add' ? 'list_members_added' : 'list_members_removed'
    const message = operation === 'add' ? 'Added selected people.' : operation === 'remove' ? 'Removed selected people.' : 'Updated member statuses.'
    const changed = commit(previous => {
      const record = findRecord(program ? previous.programs : previous.lists, id)
      if (!record || (!program && record.kind !== 'static')) return previous
      const nextStatus = operation === 'add' ? statusesFor(record)[0] : status
      if (program && !statusesFor(record).includes(nextStatus)) return previous
      const meta = metadata(previous)
      const result = changeMembership(previous, meta, { type, id, operation, personIds, status: nextStatus })
      return result.state === previous ? previous : log(result.state, meta, action, type, id, result.personIds)
    }, message)
    setDialog(null)
    if (changed) clear()
  }

  return <>
    {!preview && <div className="section-heading"><div>
      <h2>{program ? 'Program members' : 'People'}</h2>
      <p>{rows.length} {rows.length === 1 ? 'person' : 'people'}{program && statusOptions.length
        ? ' · ' + rows.filter(person => person.membership.status === statusOptions.at(-1)).length + ' successful' : ''}</p>
      {program && !statusOptions.length && <p className="field-error">Member status options are unavailable for this channel.</p>}
    </div>{!readOnly && <Button variant="primary" icon="plus" disabled={Boolean(program && !statusOptions.length)}
      onClick={() => setDialog('add')}>Add people</Button>}</div>}
    <PagedTable columns={columns} rows={rows.filter(person => matchPerson(query, person))} resetKey={query}
      empty={query ? 'No people match your search.' : 'No people to display.'}
      defaultSort={{ key: 'name', direction: 1 }} toolbar={<>
        <SearchBox label="Search people" value={query} onChange={setQuery} />
        {showSelection && <><span className="selection-note">{activeSelection.length} selected</span>
          {program ? <Button disabled={!activeSelection.length || !statusOptions.length} onClick={() => {
            setStatus(''); setDialog('status')
          }}>Change status</Button> : <Button disabled={!activeSelection.length} onClick={() => setDialog('remove')}>Remove from list</Button>}</>}
      </>} />
    {dialog === 'add' && <PersonPicker excluded={new Set(rows.map(person => person.id))} title={program ? 'Add program members' : 'Add people to list'}
      onClose={() => setDialog(null)} onCommit={ids => apply('add', ids)} />}
    {dialog === 'remove' && <Confirm title="Remove from list" message={'Remove ' + activeSelection.length + ' selected people from this list?'}
      label="Remove from list" destructive onClose={() => setDialog(null)} onConfirm={() => apply('remove', activeSelection)} />}
    {dialog === 'status' && <Modal title="Change member status" onClose={() => setDialog(null)}>
      <div className="form-body"><p>Update {activeSelection.length} selected members.</p>
        <Field label="Member status"><select autoFocus value={status} onChange={event => setStatus(event.target.value)}>
          <option value="">Select a status</option>{statusOptions.map(value => <option key={value}>{value}</option>)}
        </select></Field>
      </div>
      <div className="dialog-actions"><Button onClick={() => setDialog(null)}>Cancel</Button>
        <Button variant="primary" disabled={!status} onClick={() => apply('status', activeSelection)}>Change status</Button></div>
    </Modal>}
  </>
}

