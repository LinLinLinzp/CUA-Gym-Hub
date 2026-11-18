import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWorkspace } from '../store.jsx'
import { DataTable, Dialog, Facts, Filters, Missing, PageHeader, Panel, Pill, RecordLink, options, useFilters } from '../ui.jsx'
import { withSid } from '../utils/dataManager.js'
import {
  activeOrder, address, assigneeLabel, choice, compare, date, dateValue, find, label, matches, newId, orderNewest,
  orderStatuses, priorities, propertyLabel, propertyOptions, propertyOrUnit, propertyUnits, recordPath, records,
  requireValue, textValue, unitLabel, unitOptions, writeRecord,
} from '../data/model.js'

const root = '/work-orders'
const back = [root, 'Work Orders']
const defaultFilters = { q: '', property: '', priority: '', status: '', sort: '-newest' }
const categories = ['plumbing', 'electrical', 'hvac', 'appliance', 'general']
const permissions = ['yes', 'no', 'unknown']
const transitions = {
  assign: { title: 'Assign', event: 'assigned', to: 'assigned', from: ['open', 'assigned'], message: 'Work order assigned' },
  schedule: { title: 'Schedule', event: 'scheduled', to: 'scheduled', from: ['assigned', 'scheduled'], message: 'Work order scheduled' },
  start: { title: 'Start work', event: 'started', to: 'in_progress', from: ['assigned', 'scheduled'], message: 'Work started' },
  complete: { title: 'Complete', event: 'completed', to: 'completed', from: ['in_progress'], message: 'Work order completed' },
  cancel: { title: 'Cancel', event: 'canceled', to: 'canceled', from: ['open', 'assigned', 'scheduled', 'in_progress'], message: 'Work order canceled' },
}

function saveOrder(state, audit, order, patch, action, message, eventDetails = {}) {
  const status = patch.status || order?.status || 'open'
  const history = [...records(order?.history), {
    id: newId('event'), action, ...(order?.status ? { fromStatus: order.status } : {}),
    toStatus: status, createdAt: audit.at, createdBy: audit.actor, ...eventDetails,
  }]
  const result = writeRecord(state, 'workOrders', order, { ...patch, status, history }, 'wo', audit)
  return { ...result, message, path: recordPath(root, result.record.id) }
}

function OrderForm({ order, onClose }) {
  const { state, commit } = useWorkspace()
  const navigate = useNavigate()
  const initial = { category: 'general', priority: 'normal', permissionToEnter: 'unknown', ...order }
  function fields(values) {
    return [
      { name: 'propertyId', text: 'Property', entries: [['', 'Select a property'], ...propertyOptions(records(state.properties))], required: true, change: () => ({ unitId: '' }) },
      { name: 'unitId', text: 'Unit', entries: [['', 'No unit (property-wide)'], ...unitOptions(propertyUnits(state, values.propertyId))] },
      { name: 'title', text: 'Summary', required: true, wide: true },
      { name: 'description', text: 'Description', type: 'textarea', required: true, wide: true },
      { name: 'category', text: 'Category', required: true, entries: options(categories) },
      { name: 'priority', text: 'Priority', required: true, entries: options(priorities) },
      { name: 'permissionToEnter', text: 'Permission to enter', required: true, entries: options(permissions) },
    ]
  }
  function submit(values) {
    const record = commit((current, audit) => {
      const propertyId = values.propertyId
      const unitId = values.unitId || null
      requireValue(find(current.properties, propertyId), 'propertyId', 'Select a property.')
      requireValue(!unitId || find(current.units, unitId)?.propertyId === propertyId, 'unitId', 'Select a unit at this property.')
      const patch = {
        propertyId, unitId,
        title: textValue(values.title, 'title', 'a summary'),
        description: textValue(values.description, 'description', 'a description'),
        category: choice(values.category, categories, 'category', 'a category'),
        priority: choice(values.priority, priorities, 'priority', 'a priority'),
        permissionToEnter: choice(values.permissionToEnter, permissions, 'permissionToEnter', 'a permission value'),
      }
      return saveOrder(current, audit, order, patch, order ? 'edited' : 'created', order ? 'Work order updated' : 'Work order created')
    })
    if (!order) navigate(withSid(recordPath(root, record.id)))
  }
  return <Dialog title={order ? 'Edit work order' : 'New work order'} initial={initial} fields={fields} onClose={onClose}
    onSubmit={submit} submit={order ? 'Save changes' : 'Create work order'} />
}

function TransitionForm({ order, mode, onClose }) {
  const { state, commit } = useWorkspace()
  const transition = transitions[mode]
  const fields = {
    assign: [{ name: 'assigneeId', text: 'Assignee', wide: true, required: true, entries: [['', 'Select an assignee'],
      ...[...records(state.assignees)].sort((a, b) => compare(a.name, b.name)).map(item => [item.id, item.name || item.id])] }],
    schedule: [{ name: 'scheduledFor', text: 'Scheduled date', type: 'date', required: true, wide: true }],
    start: [],
    complete: [{ name: 'completionNote', text: 'Completion note', type: 'textarea', required: true, wide: true }],
    cancel: [{ name: 'cancelReason', text: 'Cancellation reason', type: 'textarea', required: true, wide: true }],
  }[mode]
  function submit(values) {
    commit((current, audit) => {
      const latest = find(current.workOrders, order.id)
      requireValue(latest && transition.from.includes(latest.status), 'status', 'This action is no longer available.')
      const patch = { status: transition.to }
      const eventDetails = {}
      if (mode === 'assign') {
        requireValue(find(current.assignees, values.assigneeId), 'assigneeId', 'Select an assignee.')
        patch.assigneeId = eventDetails.assigneeId = values.assigneeId
      }
      if (mode === 'schedule') {
        requireValue(find(current.assignees, latest.assigneeId), 'scheduledFor', 'Assign the work order before scheduling it.')
        patch.scheduledFor = eventDetails.scheduledFor = dateValue(values.scheduledFor, 'scheduledFor')
      }
      if (mode === 'start') patch.startedAt = audit.at
      if (mode === 'complete') {
        patch.completedAt = audit.at
        patch.completionNote = eventDetails.note = textValue(values.completionNote, 'completionNote', 'a completion note')
      }
      if (mode === 'cancel') {
        patch.canceledAt = audit.at
        patch.cancelReason = eventDetails.note = textValue(values.cancelReason, 'cancelReason', 'a cancellation reason')
      }
      return saveOrder(current, audit, latest, patch, transition.event, transition.message, eventDetails)
    })
  }
  const title = mode === 'start' ? transition.title : transition.title + ' work order'
  return <Dialog title={title} initial={order}
    fields={() => fields} onClose={onClose} onSubmit={submit} submit={mode === 'cancel' ? 'Cancel work order' : transition.title} />
}

export function WorkOrders() {
  const { state } = useWorkspace()
  const [add, setAdd] = useState(false)
  const filters = useFilters(defaultFilters)
  const { q, property, priority, status, sort } = filters.values
  const rows = records(state.workOrders).filter(order => {
    const location = find(state.properties, order.propertyId)
    return (!property || order.propertyId === property) && (!priority || order.priority === priority) &&
      (!status || (status === 'active' ? activeOrder(order) : order.status === status)) &&
      matches(q, order.id, order.title, location?.name, address(location))
  })
  const rank = order => {
    const index = priorities.indexOf(order.priority)
    return index < 0 ? priorities.length : index
  }
  rows.sort(sort === '-newest' ? orderNewest : (a, b) =>
    (sort === '-priority' ? -1 : 1) * (rank(a) - rank(b)) || orderNewest(a, b))
  return <>
    <PageHeader title="Work Orders" description="Track maintenance requests from intake through completion."
      actions={<button className="button" onClick={() => setAdd(true)}>New work order</button>} />
    <Panel>
      <Filters filters={filters} placeholder="Search order IDs, summaries or addresses" fields={[
        ['Property', 'property', [['', 'All properties'], ...propertyOptions(records(state.properties))]],
        ['Priority', 'priority', [['', 'All priorities'], ...options(priorities)]],
        ['Status', 'status', [['', 'All statuses'], ['active', 'Active orders'], ...options(orderStatuses)]],
        ['Sort', 'sort', [['-newest', 'Newest first'], ['priority', 'Highest priority'], ['-priority', 'Lowest priority']]],
      ]} />
      <DataTable key={JSON.stringify(filters.values)} rows={rows} filters={filters} empty="No work orders yet."
        columns={[[ 'Work order' ], [ 'Location' ], [ 'Priority', '', 'priority' ], [ 'Assignee' ], [ 'Scheduled date' ], [ 'Status' ]]}
        sort={{ value: sort, update: value => filters.update('sort', value) }} row={order => <>
          <td><RecordLink to={recordPath(root, order.id)}>{order.title || order.id}</RecordLink><small>{order.id}</small></td>
          <td>{propertyOrUnit(state, order)}</td><td><Pill value={order.priority} /></td>
          <td>{assigneeLabel(state, order.assigneeId)}</td><td className="nowrap">{date(order.scheduledFor)}</td><td><Pill value={order.status} /></td>
        </>} />
    </Panel>
    {add && <OrderForm onClose={() => setAdd(false)} />}
  </>
}

export function WorkOrderDetail() {
  const { id } = useParams()
  return <WorkOrderRecord key={id} id={id} />
}

function WorkOrderRecord({ id }) {
  const { state } = useWorkspace()
  const [dialog, setDialog] = useState('')
  const order = find(state.workOrders, id)
  if (!order) return <Missing kind="Work order" back={back} />
  const property = find(state.properties, order.propertyId)
  const assignee = find(state.assignees, order.assigneeId)
  const history = [...records(order.history)].sort((a, b) => compare(a.createdAt, b.createdAt))
  const close = () => setDialog('')
  const actions = Object.entries(transitions).filter(([mode, transition]) => transition.from.includes(order.status) &&
    (mode !== 'assign' || records(state.assignees).length) && (mode !== 'schedule' || assignee))
  return <>
    <PageHeader title={order.title || order.id} description={order.id + ' · ' + propertyOrUnit(state, order)} back={back} actions={<>
      {actions.map(([mode, transition]) => <button key={mode} className="button secondary" onClick={() => setDialog(mode)}>
        {mode === 'cancel' ? 'Cancel work order' : mode === 'schedule' && order.status === 'scheduled' ? 'Reschedule' : transition.title}
      </button>)}
      {activeOrder(order) && property && <button className="button" onClick={() => setDialog('edit')}>Edit work order</button>}
    </>} />
    <div className="detail-grid">
      <Panel title="Request details">
        <Facts items={[
          ['Property', property ? <RecordLink to={recordPath('/properties', property.id)}>{property.name || property.id}</RecordLink> : propertyLabel(state, order.propertyId)],
          ['Unit', order.unitId ? unitLabel(state, order.unitId) : 'Property-wide'], ['Category', label(order.category)],
          ['Priority', <Pill value={order.priority} />], ['Permission to enter', label(order.permissionToEnter)],
          ['Opened', date(order.createdAt)],
        ]} />
        <div className="panel-text"><span className="note-label">Description</span><p>{order.description || 'No description recorded.'}</p></div>
      </Panel>
      <Panel title="Progress">
        <Facts items={[
          ['Status', <Pill value={order.status} />], ['Assignee', assigneeLabel(state, order.assigneeId)],
          ['Scheduled date', date(order.scheduledFor)],
          ...(order.startedAt ? [['Started', date(order.startedAt)]] : []),
          ...(order.completedAt ? [['Completed', date(order.completedAt)], ['Completion note', order.completionNote || '—']] : []),
          ...(order.canceledAt ? [['Canceled', date(order.canceledAt)], ['Cancellation reason', order.cancelReason || '—']] : []),
        ]} />
      </Panel>
    </div>
    <Panel title="Work order history">
      {history.length ? <ol className="activity">{history.map((event, index) => <li key={event.id || index}>
        <strong>{label(event.action)}{event.fromStatus && event.toStatus && event.fromStatus !== event.toStatus ? ' · ' + label(event.fromStatus) + ' → ' + label(event.toStatus) : ''}</strong>
        <small>{[date(event.createdAt), event.createdBy === state.account?.id ? state.account.name : event.createdBy].filter(Boolean).join(' · ')}</small>
        {event.assigneeId && <span>{assigneeLabel(state, event.assigneeId)}</span>}
        {event.scheduledFor && <span>{date(event.scheduledFor)}</span>}
        {event.note && <span>{event.note}</span>}
      </li>)}</ol> : <div className="empty">No history has been recorded.</div>}
    </Panel>
    {dialog === 'edit' && <OrderForm order={order} onClose={close} />}
    {transitions[dialog] && <TransitionForm order={order} mode={dialog} onClose={close} />}
  </>
}
