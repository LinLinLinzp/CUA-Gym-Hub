import { useState } from 'react'
import { Link } from 'react-router-dom'
import { directories, useRouteLink } from './routes'
import { matches, personName, recordPath } from './model'
import { Button, Empty, Modal, Paged, Search, Table, Tile } from './ui'

export function RecordLink({ kind, record, id }) {
  const to = useRouteLink()
  const name = record ? (kind === 'people' ? personName(record) : record.name || 'Unnamed record') : 'Unavailable record'
  return <div className="record-cell">
    <Tile kind={kind} value={name} category={record?.category} />
    <div>
      {record ? <Link className="record-link" to={to(recordPath(directories[kind].path, record.id))}>{name}</Link> : <span>{name}</span>}
      {(record?.username || !record) && <small className="secondary-line">{record?.username || id}</small>}
    </div>
  </div>
}

export function RelationshipTable({ title, actions, rows, headers, empty, children }) {
  return <section className="panel" aria-label={title}>
    <div className="relationship-header"><h2>{title}</h2>{actions}</div>
    <Paged rows={rows}>{items => items.length
      ? <Table headers={headers}>{items.map(children)}</Table>
      : <Empty title={empty} />
    }</Paged>
  </section>
}

export function Picker({ title, searchLabel, items, onSave, onClose }) {
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState([])
  const [error, setError] = useState('')
  const visible = items.filter(item => matches(query, item.name, item.subtitle))
  const selected = items.filter(item => picked.includes(item.id)).map(item => item.id)
  return <Modal title={title} drawer onClose={onClose}>
    <form className="dialog-form" onSubmit={event => {
      event.preventDefault()
      if (!selected.length) return
      const issue = onSave(selected)
      if (issue) setError(issue)
      else onClose()
    }}>
      <div className="dialog-body">
        <Search initialFocus title={searchLabel} value={query} onChange={setQuery} />
        <div className="picker-count" aria-live="polite">{selected.length} selected</div>
        {visible.length ? <div className="picker-list">
          {visible.map(item => <label key={item.id} className="picker-option">
            <input type="checkbox" checked={picked.includes(item.id)} onChange={event => {
              setPicked(event.target.checked ? [...picked, item.id] : picked.filter(id => id !== item.id))
            }} />
            <div><strong>{item.name}</strong>{item.subtitle && <small className="secondary-line">{item.subtitle}</small>}</div>
          </label>)}
        </div> : <Empty title="No eligible results" detail={query ? 'Try a different search.' : 'All available records are already assigned.'} />}
        {error && <p className="error" role="alert">{error}</p>}
      </div>
      <footer className="dialog-footer">
        <Button onClick={onClose}>Cancel</Button>
        <Button tone="primary" type="submit" disabled={!selected.length}>Assign</Button>
      </footer>
    </form>
  </Modal>
}
