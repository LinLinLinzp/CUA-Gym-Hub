import { useState } from 'react'
import { MapPin, PackageCheck } from 'lucide-react'
import { useStore } from '../context/Store.jsx'
import { array, day, find, modeNames, productTitle, quantityLimit, signedIn, time } from '../data/model.js'
import { buyAgain, canCancelOrder, canEditOrder, canRescheduleOrder, cancelOrder, editOrderItems, editPickupPerson, orderNumber, orderPath } from '../data/orders.js'
import { returnEligibility, returnsFor, returnStatuses } from '../data/returns.js'
import { windowLabel } from '../data/pickup.js'
import { Address, Back, Badge, ButtonLink, Dialog, Empty, Feedback, Field, Photo, Totals, displayDate, encoded, money } from '../components/UI.jsx'
import { SiteLink } from '../utils/navigation.jsx'
import { Payment, PersonFields } from './Checkout.jsx'

const historyPath = '/account/purchase-history'

export function PurchaseHistory() {
  const { state } = useStore()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [mode, setMode] = useState('')
  const [dateRange, setDateRange] = useState('')
  const owned = array(state.orders).filter(order => !order.ownerId || order.ownerId === signedIn(state))
  const statuses = [...new Set(owned.map(order => order.status).filter(Boolean))].sort()
  const now = new Date()
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const rows = owned.filter(order => {
    const searchable = [orderNumber(order), ...array(order.lines).map(line => productTitle(line.product))].join(' ').toLowerCase()
    return terms.every(term => searchable.includes(term)) && (!status || order.status === status) && (!mode || order.fulfillmentMode === mode) &&
      (!dateRange || +now - time(order.createdAt) <= Number(dateRange) * day)
  }).sort((a, b) => (time(b.createdAt) || 0) - (time(a.createdAt) || 0) || String(a.id).localeCompare(String(b.id)))
  return <div className="stack">
    <h1>Purchase history</h1>
    <div className="panel history-toolbar field-row">
      <Field label="Search orders"><input type="search" placeholder="Order number or item" value={query} onChange={event => setQuery(event.target.value)} /></Field>
      <Field label="Status"><select value={status} onChange={event => setStatus(event.target.value)}>
        <option value="">All statuses</option>{statuses.map(value => <option value={value} key={value}>{value.replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase())}</option>)}
      </select></Field>
      <Field label="Fulfillment"><select value={mode} onChange={event => setMode(event.target.value)}>
        <option value="">All orders</option>{Object.entries(modeNames).map(([value, text]) => <option value={value} key={value}>{text}</option>)}
      </select></Field>
      <Field label="Order date"><select value={dateRange} onChange={event => setDateRange(event.target.value)}>
        <option value="">Any date</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last year</option>
      </select></Field>
    </div>
    {rows.length ? <section className="panel history-list" aria-label="Orders">{rows.map((order, index) => {
      const lines = array(order.lines)
      return <article className="history-order" key={order.id ?? index}>
        <div className="stack small-gap"><h3>{displayDate(order.createdAt)}</h3><span className="small muted">Order {orderNumber(order)}</span></div>
        <div className="history-previews">{lines.slice(0, 2).map((line, itemIndex) => <Photo key={line.id ?? itemIndex} path={line.product?.imagePath} title={line.product?.title} />)}{lines.length > 2 && <span className="small">+{lines.length - 2}</span>}</div>
        <div className="stack small-gap"><div><Badge status={order.status} /></div><span className="small muted">{modeNames[order.fulfillmentMode] || 'Order'}</span></div>
        <strong>{money(order.totals?.total)}</strong>
        {order.id && <ButtonLink kind="secondary" to={orderPath(order)}>View details</ButtonLink>}
      </article>
    })}</section> : <Empty title={owned.length ? 'No matching orders' : 'No orders yet'}>{owned.length ? 'Try a different search or change your filters.' : 'Your purchases will appear here.'}</Empty>}
  </div>
}

export function OrderDetails({ record: order }) {
  const { state, commit } = useStore()
  const [dialog, setDialog] = useState('')
  const [feedback, setFeedback] = useState(null)
  const orderId = order.id
  const now = new Date()
  const store = find(state.stores, order.storeId)
  const slot = find(state.pickupSlots, order.slotId)
  const editable = canEditOrder(order, now)
  const lines = array(order.lines)
  const requests = returnsFor(state, order.id)
  const returnable = returnStatuses.includes(order.status) && lines.some(line => returnEligibility(state, order, line, now).available)
  const complete = message => { setDialog(''); setFeedback({ message }) }
  return <div className="stack">
    <Back to={historyPath}>Purchase history</Back>
    <section className="panel stack">
      <div className="section-heading"><h1>Order {orderNumber(order)}</h1><Badge status={order.status} /></div>
      <p className="muted">{displayDate(order.createdAt)} · {modeNames[order.fulfillmentMode] || 'Order'}</p>
      {order.fulfillmentMode === 'pickup' && <div className="pickup-panel stack small-gap">
        <h2 className="with-icon"><MapPin size={20} aria-hidden="true" /> {store?.name || 'Pickup store'}</h2>
        <p>{windowLabel(slot, store?.timezone)}</p>
        {order.pickupPerson?.name && <p className="small">Alternate pickup person: {order.pickupPerson.name} {order.pickupPerson.email && `· ${order.pickupPerson.email}`}</p>}
        {order.status === 'placed' && order.editCutoffAt && <p className="small muted">{editable ? 'Edit or cancel by' : 'Editing closed'} {windowLabel({ startAt: order.editCutoffAt }, store?.timezone)}</p>}
      </div>}
      {order.fulfillmentMode !== 'pickup' && order.shippingAddress && <div><h3>{order.fulfillmentMode === 'delivery' ? 'Delivery address' : 'Shipping address'}</h3><Address address={order.shippingAddress} /></div>}
      <div className="actions">
        {editable && <button className="button secondary" onClick={() => setDialog('items')}>Edit items</button>}
        {editable && <button className="button secondary" onClick={() => setDialog('person')}>Edit pickup person</button>}
        {canRescheduleOrder(order, now) && <ButtonLink kind="secondary" to={`/pickup/reserve?orderId=${encoded(order.id)}`}>Reschedule pickup</ButtonLink>}
        {canCancelOrder(order, now) && <button className="button secondary" onClick={() => setDialog('cancel')}>Cancel order</button>}
        {order.trackingNumber && <button className="button secondary" onClick={() => setDialog('tracking')}>Track order</button>}
        {returnable && <ButtonLink to={`${orderPath(order)}/returns/new`}>Start a return</ButtonLink>}
        {lines.length > 0 && <button className="button secondary" onClick={() => {
          const result = commit(buyAgain, { orderId })
          setFeedback(result.error ? { error: result.error } : { message: result.message, cart: true })
        }}>Buy again</button>}
      </div>
      <Feedback success={!feedback?.error}>{feedback?.error || feedback?.message}</Feedback>
      {feedback?.cart && <SiteLink to="/cart">View cart</SiteLink>}
    </section>
    <div className="summary-layout">
      <section className="panel stack">
        <h2>Items</h2>
        {lines.length ? <div className="line-list">{lines.map((line, index) => {
          const eligibility = returnEligibility(state, order, line, now)
          return <article className="order-line" key={line.id ?? index}>
            <Photo path={line.product?.imagePath} />
            <div className="stack small-gap">
              <h3>{productTitle(line.product)}</h3>
              <p className="small muted">Quantity {line.quantity ?? '—'} {line.product?.variant && `· ${line.product.variant}`}</p>
              {eligibility.prior > 0 && <div><Badge status={`${eligibility.prior} in return history`} /></div>}
              {returnStatuses.includes(order.status) && <p className="small muted">{eligibility.available ? `${eligibility.remaining} eligible for return` : eligibility.reason}</p>}
            </div>
            <strong>{Number.isFinite(line.lineSubtotal) ? money(line.lineSubtotal) : '—'}</strong>
          </article>
        })}</div> : <p className="muted">No item details are available.</p>}
      </section>
      <aside className="panel summary stack">
        <h2>Receipt</h2>
        <Totals totals={order.totals} />
        <Payment summary={order.paymentSummary} />
        <ButtonLink kind="secondary" to={`${orderPath(order)}/receipt`}>Printable receipt</ButtonLink>
      </aside>
    </div>
    {requests.length > 0 && <section className="panel stack"><h2>Returns</h2>{requests.map((record, index) => <div className="section-heading" key={record.id ?? index}>
      {record.id ? <SiteLink to={`/returns/${encoded(record.id)}`}>Return {record.returnNumber || record.id}</SiteLink> : <span>Return</span>} <Badge status={record.status} /></div>)}</section>}
    {dialog === 'items' && <EditItems order={order} onClose={() => setDialog('')} onDone={() => complete('Order items updated.')} />}
    {dialog === 'person' && <EditPerson order={order} onClose={() => setDialog('')} onDone={() => complete('Pickup person updated.')} />}
    {dialog === 'cancel' && <CancelDialog orderId={orderId} onClose={() => setDialog('')} onDone={() => complete('Order canceled.')} />}
    {dialog === 'tracking' && <Dialog title="Track order" onClose={() => setDialog('')}><div className="stack">
      <p className="with-icon"><PackageCheck size={20} aria-hidden="true" /> Tracking number {order.trackingNumber}</p><div><Badge status={order.status} /></div>
    </div></Dialog>}
  </div>
}

function EditItems({ order, onClose, onDone }) {
  const { state, commit } = useStore()
  const [items, setItems] = useState(() => array(order.lines).map(line => ({ id: line.id, productId: line.productId, quantity: line.quantity ?? 1, title: productTitle(line.product) })))
  const [candidate, setCandidate] = useState('')
  const [error, setError] = useState('')
  const store = find(state.stores, order.storeId)
  const eligible = array(state.catalog).filter(product => product.id && quantityLimit(product, 'pickup', store) > 0 && !items.some(item => item.productId === product.id))
  return <Dialog title="Edit order items" onClose={onClose}>
    <form className="stack" onSubmit={event => {
      event.preventDefault()
      const result = commit(editOrderItems, { orderId: order.id, items: items.map(item => ({ ...item, quantity: Number(item.quantity) })) })
      if (result.state) onDone()
      else setError(result.error)
    }}>
      <div className="line-list">
        {items.map((item, index) => <div className="stack small-gap edit-line" key={item.id ?? item.productId ?? index}>
          <h3>{item.title}</h3>
          <div className="actions">
            <Field label={`Quantity for ${item.title}`}><input type="number" min="1" step="1" required value={item.quantity} onChange={event =>
              setItems(items.map((entry, position) => position === index ? { ...entry, quantity: event.target.value } : entry))} /></Field>
            <button className="text-button" type="button" onClick={() => setItems(items.filter((_, position) => position !== index))}>Remove</button>
          </div>
        </div>)}
      </div>
      {eligible.length > 0 && <Field label="Add a product">
        <select value={candidate} onChange={event => setCandidate(event.target.value)}>
          <option value="">Choose a product</option>{eligible.map(product => <option key={product.id} value={product.id}>{productTitle(product)}</option>)}
        </select>
      </Field>}
      {candidate && <button className="button secondary" type="button" onClick={() => {
        const product = find(eligible, candidate)
        if (product) {
          const previous = array(order.lines).find(line => line.productId === product.id)
          setItems([...items, { id: previous?.id, productId: product.id, quantity: 1, title: productTitle(previous?.product || product) }])
        }
        setCandidate('')
      }}>Add item</button>}
      <Feedback>{error}</Feedback>
      <div className="actions"><button className="button primary">Save items</button><button type="button" className="button secondary" onClick={onClose}>Cancel</button></div>
    </form>
  </Dialog>
}

function EditPerson({ order, onClose, onDone }) {
  const { commit } = useStore()
  const [person, setPerson] = useState({ name: order.pickupPerson?.name || '', email: order.pickupPerson?.email || '' })
  const [error, setError] = useState('')
  return <Dialog title="Edit pickup person" onClose={onClose}>
    <form className="stack" onSubmit={event => {
      event.preventDefault()
      const result = commit(editPickupPerson, { orderId: order.id, pickupPerson: person })
      if (result.state) onDone()
      else setError(result.error)
    }}>
      <PersonFields value={person} onChange={setPerson} />
      {order.pickupPerson && <button type="button" className="text-button" onClick={() => setPerson({ name: '', email: '' })}>Clear alternate pickup person</button>}
      <Feedback>{error}</Feedback>
      <div className="actions"><button className="button primary">Save pickup person</button><button type="button" className="button secondary" onClick={onClose}>Cancel</button></div>
    </form>
  </Dialog>
}

function CancelDialog({ orderId, onClose, onDone }) {
  const { commit } = useStore()
  const [error, setError] = useState('')
  return <Dialog title="Cancel this order?" onClose={onClose}><div className="stack">
    <p>This cancels every item and releases any scheduled pickup booking.</p>
    <Feedback>{error}</Feedback>
    <div className="actions">
      <button className="button secondary" autoFocus onClick={onClose}>Keep order</button>
      <button className="button danger" onClick={() => {
        const result = commit(cancelOrder, { orderId })
        if (result.state) onDone()
        else setError(result.error)
      }}>Confirm cancellation</button>
    </div>
  </div></Dialog>
}
