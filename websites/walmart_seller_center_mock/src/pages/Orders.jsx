import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Activity, Dialog, Facts, Field, Icon, Missing, PageHead, Pager, Panel, Pill, Search, Select, SiteLink, Table, Tabs } from '../ui.jsx'
import { date, label, list, matches, money, openOrders, recordLines, route, text, useStore } from '../model.js'
import { canUpdateOrder, eligibleOrderLines, updateOrders } from '../orderMutations.js'
import { exportCsv } from '../utils/csv.js'

const viewTypes = [['', 'Unshipped', openOrders], ['shipped', 'Shipped', (o) => o.status === 'shipped'],
  ['canceled', 'Canceled', (o) => o.status === 'canceled'], ['all', 'All', () => true]]
const fulfillmentOptions = [['', 'All fulfillment'], ['seller', 'Seller fulfilled'], ['walmart', 'Walmart fulfilled']]
const shipOptions = [['', 'Any deadline'], ['overdue', 'Overdue'], ['today', 'Today'], ['next', 'Next 7 days']]
const columns = ['Purchase order', 'Customer order', 'Customer', 'Lines', 'Ship by', 'Total', 'Status']
const pageSize = 15

function dayNumber(value) {
  return new Date(value).setHours(0, 0, 0, 0)
}
function inDeadline(order, deadline, today) {
  if (!deadline) return true
  if (!order.shipByAt) return false
  const due = dayNumber(order.shipByAt)
  if (deadline === 'overdue') return due < today
  if (deadline === 'today') return due === today
  const end = new Date(today)
  end.setDate(end.getDate() + 7)
  return due > today && due <= end.getTime()
}

export function Orders() {
  const [params] = useSearchParams()
  const currentView = viewTypes.find(([key]) => key === params.get('view')) ?? viewTypes[0]
  return <OrderQueue key={currentView[0]} currentView={currentView} />
}

function OrderQueue({ currentView }) {
  const { state } = useStore()
  const [query, setQuery] = useState('')
  const [fulfillment, setFulfillment] = useState('')
  const [deadline, setDeadline] = useState('')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState([])
  const [confirm, setConfirm] = useState(false)
  const [view, , predicate] = currentView
  const today = dayNumber(new Date())
  const orders = list(state.orders)
  const rows = orders.filter((order) => predicate(order) && inDeadline(order, deadline, today)
    && (!fulfillment || order.fulfillment === fulfillment)
    && matches(query, order.id, order.customerOrderId, order.customerName, ...recordLines(order).map((line) => line.sku)))
  const activePage = Math.min(page, Math.max(0, Math.ceil(rows.length / pageSize) - 1))
  const visible = rows.slice(activePage * pageSize, (activePage + 1) * pageSize)
  const selectable = !view
  const eligible = visible.filter((order) => canUpdateOrder(order, 'acknowledged'))
  const selection = rows.filter((order) => selected.includes(order.id))
  const allChecked = eligible.length > 0 && eligible.every((order) => selected.includes(order.id))
  const changeFilter = (setter) => (value) => { setter(value); setPage(0); setSelected([]) }
  function toggleAll() {
    const onPage = eligible.map((order) => order.id)
    setSelected((previous) => allChecked ? previous.filter((id) => !onPage.includes(id)) : [...new Set([...previous, ...onPage])])
  }
  return <>
    <PageHead title="Orders" description="Review purchase orders and record fulfillment activity.">
      <button className="button" onClick={() => exportCsv('orders.csv', columns, rows.map((order) => [
        order.id, order.customerOrderId, order.customerName, recordLines(order).length, order.shipByAt, order.total, label(order.status),
      ]))}><Icon name="download" size={16} />Export CSV</button>
    </PageHead>
    <Panel>
      <Tabs active={view} section="orders" tabs={viewTypes.map(([key, title, filter]) => [key, title, orders.filter(filter).length])} />
      <div className="toolbar">
        <Search name="Search orders" placeholder="Search order number, customer or SKU" value={query} onChange={changeFilter(setQuery)} />
        <Select name="Ship by" value={deadline} onChange={changeFilter(setDeadline)} options={shipOptions} />
        <Select name="Fulfillment" value={fulfillment} onChange={changeFilter(setFulfillment)} options={fulfillmentOptions} />
      </div>
      {selectable && selection.length > 0 && <div className="bulk"><span>{selection.length} selected</span><button className="button primary" onClick={() => setConfirm(true)}>Acknowledge selected</button><button className="button" onClick={() => setSelected([])}>Clear</button></div>}
      <Table columns={selectable ? [<input type="checkbox" aria-label="Select eligible orders on this page" checked={allChecked} disabled={!eligible.length} onChange={toggleAll} />, ...columns] : columns} className="queue-table" empty={!rows.length}>
        {visible.map((order) => {
          const checked = selected.includes(order.id)
          return <tr key={order.id} className={checked ? 'selected' : ''}>
            {selectable && <td className="cell-check"><input type="checkbox" aria-label={'Select order ' + order.id} checked={checked}
              title={canUpdateOrder(order, 'acknowledged') ? undefined : 'Only new seller-fulfilled orders can be selected'}
              disabled={!canUpdateOrder(order, 'acknowledged')} onChange={() => setSelected((previous) => checked ? previous.filter((id) => id !== order.id) : [...previous, order.id])} /></td>}
            <td><SiteLink className="cell-id" to={route('orders', order.id)}>{order.id}</SiteLink></td>
            <td className="cell-id">{text(order.customerOrderId)}</td><td>{text(order.customerName)}</td><td>{recordLines(order).length}</td>
            <td>{date(order.shipByAt)}</td><td>{money(order.total)}</td><td><Pill status={order.status} /></td>
          </tr>
        })}
      </Table>
      <Pager page={activePage} pageSize={pageSize} total={rows.length} onPage={setPage} />
    </Panel>
    {confirm && <OrderDialog orders={selection} type="acknowledged" onClose={() => setConfirm(false)} onSuccess={() => setSelected([])} />}
  </>
}

export function OrderDetail() {
  const { id } = useParams()
  const { state } = useStore()
  const order = list(state.orders).find((entry) => entry.id === id)
  return order ? <OrderView key={id} order={order} /> : <Missing to="/orders" name="Order" />
}

const orderTitles = { acknowledged: 'Acknowledge', shipped: 'Mark as shipped', canceled: 'Cancel order' }

function OrderView({ order }) {
  const { state } = useStore()
  const [action, setAction] = useState('')
  const lines = recordLines(order)
  const relatedActions = list(state.orderActions).filter((entry) => entry.orderId === order.id)
  const activity = relatedActions.map((entry) => ({
    ...entry, detail: [entry.actorId === state.account.actorId ? state.account.actorName : entry.actorId,
      entry.carrier, entry.trackingNumber, entry.reason].filter(Boolean).join(' · '),
  }))
  const shipTo = order.shipTo || {}
  const address = [shipTo.address1, [shipTo.city, shipTo.state, shipTo.postalCode].filter(Boolean).join(' ')].filter(Boolean).join(' · ')
  return <>
    <PageHead title={'Purchase order ' + order.id} back={{ to: '/orders', label: 'Orders' }} description={'Customer order ' + text(order.customerOrderId)} badge={<Pill status={order.status} />}>
      {Object.entries(orderTitles).filter(([type]) => canUpdateOrder(order, type)).map(([type, title]) => <button key={type} className={'button ' + (type === 'canceled' ? '' : 'primary')} onClick={() => setAction(type)}>{title}</button>)}
    </PageHead>
    <div className="details"><div>
      <Panel title="Order lines">
        <Table columns={['Item', 'Quantity', 'Unit price', 'Amount', 'Status']} empty={!lines.length}>
          {lines.map((line) => <tr key={line.id}><td>
            {line.itemId && list(state.items).some((item) => item.id === line.itemId)
              ? <SiteLink to={route('items', line.itemId)}>{line.itemName || line.sku || line.itemId}</SiteLink>
              : <strong>{text(line.itemName || line.sku)}</strong>}
            <small className="meta">{text(line.sku)}</small>
          </td><td>{text(line.quantity)}</td><td>{money(line.unitPrice)}</td><td>{money(line.amount)}</td><td><Pill status={line.status} /></td></tr>)}
        </Table>
      </Panel>
      <Activity entries={activity} />
    </div><div>
      <Panel title="Order summary"><Facts entries={[
        ['Customer', order.customerName], ['Order placed', date(order.createdAt)], ['Ship by', date(order.shipByAt)],
        ['Fulfillment', order.fulfillment ? label(order.fulfillment) + ' fulfilled' : null], ['Total', money(order.total)],
      ]} /></Panel>
      <Panel title="Ship to"><Facts entries={ [['Name', order.customerName], ['Address', address]] } /></Panel>
    </div></div>
    {action && <OrderDialog orders={[order]} type={action} onClose={() => setAction('')} />}
  </>
}

function OrderDialog({ orders, type, onClose, onSuccess }) {
  const { commit } = useStore()
  const [carrier, setCarrier] = useState('')
  const [otherCarrier, setOtherCarrier] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState({})
  const totalUnits = orders.reduce((sum, order) => sum + eligibleOrderLines(order, type).reduce((units, line) => units + line.quantity, 0), 0)
  function submit() {
    const nextErrors = {}
    if (type === 'shipped' && !carrier) nextErrors.carrier = 'Select a carrier.'
    if (type === 'shipped' && carrier === 'Other' && !otherCarrier.trim()) nextErrors.otherCarrier = 'Enter the carrier name.'
    if (type === 'shipped' && !trackingNumber.trim()) nextErrors.trackingNumber = 'Enter a tracking number.'
    if (type === 'canceled' && !reason) nextErrors.reason = 'Select a cancellation reason.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return 'Check the highlighted fields.'
    const error = commit((latest) => updateOrders(latest, { ids: orders.map((order) => order.id), type, carrier: carrier === 'Other' ? otherCarrier : carrier, trackingNumber, reason }),
      orders.length === 1 ? 'Order ' + type + '.' : orders.length + ' orders ' + type + '.')
    if (!error) onSuccess?.()
    return error
  }
  return <Dialog title={orderTitles[type]} confirm={orderTitles[type]} onClose={onClose} onConfirm={submit} danger={type === 'canceled'}>
    <p>{orders.length} {orders.length === 1 ? 'order' : 'orders'} · {totalUnits} {totalUnits === 1 ? 'unit' : 'units'}</p>
    <p className="order-identifiers">{orders.map((order) => order.id).join(', ')}</p>
    {orders.some((order) => !canUpdateOrder(order, type)) && <p role="alert" className="error-text">At least one of these orders is no longer eligible.</p>}
    {type === 'shipped' && <>
      <Field label="Carrier" as="select" required value={carrier} onChange={(event) => setCarrier(event.target.value)} error={errors.carrier}>
        <option value="">Select a carrier</option>{['UPS', 'FedEx', 'USPS', 'DHL', 'Other'].map((option) => <option key={option}>{option}</option>)}
      </Field>
      {carrier === 'Other' && <Field label="Carrier name" required value={otherCarrier} onChange={(event) => setOtherCarrier(event.target.value)} error={errors.otherCarrier} />}
      <Field label="Tracking number" required value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} error={errors.trackingNumber} />
    </>}
    {type === 'canceled' && <Field label="Cancellation reason" as="select" required value={reason} onChange={(event) => setReason(event.target.value)} error={errors.reason}>
      <option value="">Select a reason</option>{['Out of stock', 'Customer requested cancellation', 'Unable to ship', 'Pricing error', 'Other'].map((option) => <option key={option}>{option}</option>)}
    </Field>}
  </Dialog>
}
