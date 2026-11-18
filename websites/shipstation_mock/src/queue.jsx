import React, { useState } from 'react'
import { addressText, Badge, Button, Check, date, Icon } from './components.jsx'
import { rows } from './data/shipping.js'
import { RecordLink, recordPath, useWorkspace } from './workspace.jsx'

export const sections = {
  orders: { title: 'Orders', description: 'Review incoming orders and prepare shipments.', initial: 'awaiting_shipment',
    statuses: ['awaiting_shipment', 'awaiting_payment', 'on_hold', 'shipped', 'cancelled'], action: 'New Order',
    search: 'Order number, recipient, or SKU', columns: ['Order', 'Recipient', 'Store', 'Destination', 'Order date', 'Status'] },
  labels: { title: 'Labels', description: 'Find, print, and manage postage across your shipments.', initial: 'all',
    statuses: ['active', 'voided'], search: 'Tracking, label, recipient, or order',
    columns: ['Label', 'Order', 'Recipient', 'Tracking number', 'Direction', 'Status'] },
  batches: { title: 'Batches', description: 'Group orders and process their postage together.', initial: 'all',
    statuses: ['open', 'processed', 'archived'], action: 'New Batch', search: 'Batch number, name, or assignee',
    columns: ['Batch', 'Name', 'Assignee', 'Orders', 'Created', 'Status'] },
  returns: { title: 'Returns', description: 'Authorize returns and record arrivals at your warehouse.', initial: 'all',
    statuses: ['outstanding', 'received', 'voided'], action: 'Create Return', search: 'RMA, order, tracking, or recipient',
    columns: ['RMA', 'Order', 'Recipient', 'Tracking number', 'Authorized', 'Status'] },
}
const words = key => key.split('_').map(part => part[0].toUpperCase() + part.slice(1)).join(' ')
const pageSize = 25
const indexById = collection => new Map(rows(collection).map(record => [record.id, record]))
const includes = (query, values) => values.some(value => String(value ?? '').toLowerCase().includes(query))
const act = { orders: 'order', batches: 'batch', returns: 'return' }

function describe(section, entry, indexes) {
  const order = indexes.orders.get(entry.orderId)
  const orderName = order?.number ?? entry.orderId
  const recipient = order?.recipient?.name
  const orderLink = order ? <RecordLink to={recordPath('orders', order.id)}>{orderName}</RecordLink> : orderName
  switch (section) {
    case 'orders':
      return { values: [entry.recipient?.name, indexes.stores.get(entry.storeId)?.name, addressText(entry.shipTo), date(entry.orderedAt)],
        search: [entry.number, entry.recipient?.name, ...rows(entry.items).map(item => item.sku)] }
    case 'labels':
      return { values: [orderLink, recipient, entry.trackingNumber, entry.direction && words(entry.direction)],
        search: [entry.number, orderName, recipient, entry.trackingNumber] }
    case 'batches': {
      const assignee = indexes.users.get(entry.assigneeId)?.name
      return { values: [entry.name, assignee, rows(entry.orderIds).length, date(entry.createdAt)], search: [entry.number, entry.name, assignee] }
    }
    case 'returns': {
      const tracking = indexes.labels.get(entry.labelId)?.trackingNumber
      return { values: [orderLink, recipient, tracking, date(entry.createdAt)], search: [entry.rma, orderName, recipient, tracking] }
    }
  }
}

export function Queue({ section, show }) {
  const { state, queues } = useWorkspace()
  const config = sections[section]
  const defaults = { status: config.initial, search: '', facet: '', sort: 'newest', page: 0 }
  const [filters, setFilters] = useState(() => queues[section] || defaults)
  const [selected, setSelected] = useState([])
  const isOrders = section === 'orders'
  const indexes = Object.fromEntries(['orders', 'stores', 'labels', 'users'].map(key => [key, indexById(state[key])]))
  const collection = rows(state[section])
  const search = filters.search.trim().toLowerCase()
  const scoped = collection.map(entry => ({ entry, ...describe(section, entry, indexes) }))
    .filter(({ entry, search: fields }) => (!search || includes(search, fields))
      && (!filters.facet || (isOrders ? entry.storeId : entry.direction) === filters.facet))
  const counts = new Map()
  for (const { entry } of scoped) counts.set(entry.status, (counts.get(entry.status) || 0) + 1)
  const filtered = scoped.filter(({ entry }) => filters.status === 'all' || filters.status === entry.status)
  const numberOf = entry => String(entry.number || entry.rma || entry.id || '')
  const dateOf = entry => String((isOrders ? entry.orderedAt : entry.createdAt) || '')
  filtered.sort(({ entry: a }, { entry: b }) => {
    if (filters.sort === 'number') return numberOf(a).localeCompare(numberOf(b), 'en', { numeric: true })
    const order = dateOf(a).localeCompare(dateOf(b)) || numberOf(a).localeCompare(numberOf(b), 'en', { numeric: true })
    return filters.sort === 'oldest' ? order : -order
  })
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const page = Math.min(pageCount - 1, filters.page)
  const visible = filtered.slice(page * pageSize, (page + 1) * pageSize)
  const selectable = visible.filter(({ entry }) => entry.status === 'awaiting_shipment' && entry.id).map(({ entry }) => entry.id)
  const selectedCount = selectable.filter(id => selected.includes(id)).length
  const selectionEnabled = isOrders && ['all', 'awaiting_shipment'].includes(filters.status)
  function patch(change) {
    const next = { ...filters, page: 0, ...change }
    queues[section] = next
    setFilters(next)
    setSelected([])
  }
  function clear() { patch({ ...defaults, status: 'all' }) }

  return <>
    <div className="page-heading"><div><h1>{config.title}</h1><p>{config.description}</p></div>
      {config.action && <Button icon="plus" kind="primary" onClick={() => show({ type: act[section] })}>{config.action}</Button>}
    </div>
    <div className="filter-strip" aria-label="Filter by status">
      {['all', ...config.statuses].map(status => <button key={status} type="button" className="filter"
        aria-pressed={filters.status === status} onClick={() => patch({ status })}>
        {words(status)} <span>{status === 'all' ? scoped.length : counts.get(status) || 0}</span>
      </button>)}
    </div>
    <section className="list-card" aria-label={config.title + ' results'}>
      <div className="toolbar">
        <label className="search"><Icon name="search" /><input type="search" aria-label={'Search ' + section}
          placeholder={config.search} value={filters.search} onChange={event => patch({ search: event.target.value })} /></label>
        {isOrders && <>
          <select aria-label="Store" value={filters.facet} onChange={event => patch({ facet: event.target.value })}>
            <option value="">All stores</option>{rows(state.stores).map(store => <option key={store.id} value={store.id}>{store.name || store.id}</option>)}
          </select>
          <select aria-label="Sort orders" className="sort" value={filters.sort} onChange={event => patch({ sort: event.target.value })}>
            <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="number">Order number</option>
          </select>
        </>}
        {section === 'labels' && <select aria-label="Direction" value={filters.facet} onChange={event => patch({ facet: event.target.value })}>
          <option value="">All directions</option><option value="outbound">Outbound</option><option value="return">Return</option>
        </select>}
      </div>
      {selectedCount > 0 && <div className="selection-bar"><strong>{selectedCount} selected</strong>
        <Button onClick={() => show({ type: 'batch', ids: selected })}>Create Batch</Button>
        <Button onClick={() => show({ type: 'addToBatch', ids: selected })}>Add to Batch</Button>
        <Button onClick={() => setSelected([])}>Clear Selection</Button>
      </div>}
      {visible.length ? <div className="table-scroll"><table>
        <thead><tr>{selectionEnabled && <th className="check-cell" scope="col"><Check aria-label="Select eligible orders on this page" disabled={!selectable.length}
          checked={!!selectable.length && selectedCount === selectable.length} partial={selectedCount > 0 && selectedCount < selectable.length}
          onChange={event => setSelected(event.target.checked ? selectable : [])} /></th>}
          {config.columns.map(column => <th scope="col" key={column}>{column}</th>)}</tr></thead>
        <tbody>{visible.map(({ entry, values }, i) => {
          const name = entry.number || entry.rma || entry.id
          return <tr key={entry.id || i} data-selected={selected.includes(entry.id)}>
            {selectionEnabled && <td className="check-cell"><Check aria-label={'Select order ' + name}
              disabled={!selectable.includes(entry.id)} checked={selected.includes(entry.id)} onChange={event =>
                setSelected(event.target.checked ? [...selected, entry.id] : selected.filter(id => id !== entry.id))} /></td>}
            <th scope="row">{entry.id ? <RecordLink to={recordPath(section, entry.id)}>{name}</RecordLink> : name || '—'}</th>
            {values.map((value, index) => <td key={index}>{value === '' ? '—' : value ?? '—'}</td>)}
            <td><Badge value={entry.status} /></td>
          </tr>
        })}</tbody>
      </table></div> : <div className="empty"><Icon name={section} size={28} /><h2>{collection.length ? 'No matching ' + section : 'No ' + section + ' yet'}</h2>
        <p>{collection.length ? 'Try a different status, search, or filter.' : 'New records will appear here.'}</p>
        {collection.length ? <Button onClick={clear}>Clear Filters</Button>
          : config.action && <Button onClick={() => show({ type: act[section] })}>{config.action}</Button>}
      </div>}
      <footer className="list-footer">
        <span>{filtered.length ? (page * pageSize + 1) + '–' + Math.min((page + 1) * pageSize, filtered.length) + ' of ' + filtered.length : '0 results'}</span>
        <div className="pagination"><Button icon="left" aria-label="Previous page" disabled={page === 0} onClick={() => patch({ page: page - 1 })} />
          <span>Page {page + 1} of {pageCount}</span>
          <Button icon="right" aria-label="Next page" disabled={page + 1 >= pageCount} onClick={() => patch({ page: page + 1 })} /></div>
      </footer>
    </section>
  </>
}

