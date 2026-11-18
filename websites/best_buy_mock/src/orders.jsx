import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAccount } from './store.jsx'
import {
  cancelableOrder, cancelReasons, canAddPlan, date, find, itemName, items, label, latest, list,
  matchCapacity, matches, money, orderName, pickupEditable, remaining, returnableQuantity, sum, time, times, validMoney,
} from './model.js'
import { Back, Badge, Dialog, Empty, Facts, Field, Heading, Missing, OrderRow, PrintButton, Search, Select, SiteLink, Thumb } from './ui.jsx'
import { InputField, LineSelection, ReviewLines, SelectField, Workflow } from './forms.jsx'

const filters = { query: '', status: '', year: '', fulfillment: '' }
const statuses = ['processing', 'shipped', 'delivered', 'ready_for_pickup', 'picked_up', 'canceled'].map((status) => [status, label(status)])
const yearOf = (order) => Number.isFinite(time(order.createdAt)) ? new Date(time(order.createdAt)).getUTCFullYear().toString() : ''

export function Orders() {
  const { state } = useAccount()
  const [filter, setFilter] = useState(filters)
  const orders = latest(state.orders)
  const years = [...new Set(orders.map(yearOf).filter(Boolean))]
  const visible = orders.filter((order) =>
    (!filter.status || order.status === filter.status)
      && (!filter.year || yearOf(order) === filter.year)
      && (!filter.fulfillment || order.fulfillment === filter.fulfillment)
      && matches(filter.query, orderName(order), order.id, ...items(order).flatMap((item) => [item.name, item.sku])))
  const set = (key, value) => setFilter((current) => ({ ...current, [key]: value }))
  const clear = <button type="button" className="secondary" onClick={() => setFilter(filters)}>Clear filters</button>
  const filtering = Object.values(filter).some(Boolean)
  return <>
    <Heading title="Orders">Find purchases, view receipts, and manage delivery or pickup.</Heading>
    <section className="card" aria-label="Order history">
      <div className="filters">
        <Search label="Search orders" value={filter.query} onChange={(value) => set('query', value)} placeholder="Order number, product or SKU" />
        {[
          ['status', 'Status', 'All statuses', statuses],
          ['year', 'Year', 'All years', years],
          ['fulfillment', 'Fulfillment', 'All methods', [['shipping', 'Shipping'], ['pickup', 'Pickup']]],
        ].map(([key, name, placeholder, options]) => <Field key={key} label={name} id={key}>{(props) =>
          <Select {...props} options={options} placeholder={placeholder} value={filter[key]} onChange={(event) => set(key, event.target.value)} />}
        </Field>)}
        {filtering && clear}
      </div>
      {visible.length ? <><p className="muted" role="status">{visible.length} {visible.length === 1 ? 'order' : 'orders'}</p><ul className="rows">
        {visible.map((order) => <OrderRow key={order.id} order={order} />)}
      </ul></> : <Empty>{filtering ? 'No orders match your filters.' : 'You have no orders yet.'}</Empty>}
    </section>
  </>
}

function Totals({ order }) {
  const lines = items(order)
  const subtotal = order.subtotal ?? (lines.length && lines.every((line) => validMoney(line.unitPrice) && Number.isInteger(line.quantity))
    ? sum(lines.map((line) => times(line.unitPrice, line.quantity))) : undefined)
  return <Facts values={[
    ['Subtotal', money(subtotal)], ['Tax', money(order.tax)], ['Shipping', money(order.shippingAmount)], ['Order total', money(order.total)],
    ...(order.paymentLabel ? [['Payment', order.paymentLabel]] : []),
  ]} />
}

function PickupForm({ order, close }) {
  return <Workflow title="Change pickup person" reviewTitle="Review pickup person" initial={{ type: 'pickup', orderId: order.id, ...order.pickupContact }}
    onClose={close} confirm="Confirm pickup person" review={(contact) => <Facts values={[['Name', contact.name], ['Email', contact.email], ['Phone', contact.phone]]} />}>
    {(draft, update, error) => <>
      <InputField name="Full name" field="name" value={draft.name} error={error('name')} update={update} autoComplete="name" />
      <InputField name="Email" field="email" value={draft.email} error={error('email')} update={update} type="email" autoComplete="email" />
      <InputField name="Phone" field="phone" value={draft.phone} error={error('phone')} update={update} type="tel" autoComplete="tel" />
    </>}
  </Workflow>
}

function CancelItemsForm({ order, close }) {
  return <Workflow title="Cancel items" reviewTitle="Review item cancellation"
    initial={{ type: 'cancel-items', orderId: order.id, selection: {}, reason: '' }} onClose={close} confirm="Confirm cancellation" danger
    review={(summary, draft) => <>
      <ReviewLines order={order} lines={summary.lines} />
      <Facts values={[['Reason', draft.reason], ['Estimated refund before tax', money(summary.refundEstimate)]]} />
    </>}>
    {(draft, update, error) => <>
      <LineSelection lines={items(order).filter((item) => remaining(item) && validMoney(item.unitPrice))} capacity={remaining}
        selection={draft.selection} onChange={(selection) => update('selection', selection)} error={error} />
      <SelectField name="Cancellation reason" field="reason" value={draft.reason} update={update} error={error('reason')}
        options={cancelReasons} placeholder="Choose a reason" />
    </>}
  </Workflow>
}

function Receipt({ order, close }) {
  return <Dialog title="Receipt" onClose={close}>
    <article className="print-sheet stack">
      <h3>Best Buy · {orderName(order)}</h3>
      <Facts values={[['Purchase date', date(order.createdAt)], ['Fulfillment', label(order.fulfillment)]]} />
      <ul className="review-lines">{items(order).map((item) => <li key={item.id}>
        {itemName(item)} · {item.quantity ?? '—'} × {money(item.unitPrice)}
      </li>)}</ul>
      <Totals order={order} /><div className="no-print"><PrintButton /></div>
    </article>
  </Dialog>
}

function Fulfillment({ order, store, close }) {
  return <Dialog title={order.fulfillment === 'pickup' ? 'Pickup details' : 'Shipment tracking'} onClose={close}>
    <div className="stack">
      <Badge status={order.status} />
      {order.fulfillment === 'pickup' ? <Facts values={[
        ['Store', store?.name || order.storeId], ['Address', store?.address], ['Pickup person', order.pickupContact?.name],
      ]} /> : <>
        <Facts values={[['Carrier', order.shipment?.carrier], ['Tracking number', order.shipment?.trackingNumber]]} />
        {list(order.shipment?.events).length ? <ol className="review-lines">
          {list(order.shipment.events).map((event, index) => <li key={index}><strong>{event.status || 'Shipment update'}</strong>
            <p className="muted">{date(event.at)}{event.location ? ' · ' + event.location : ''}</p></li>)}
        </ol> : <p className="muted">Tracking updates are unavailable.</p>}
      </>}
    </div>
  </Dialog>
}

const linePath = (path, order, item) => path + '?' + new URLSearchParams({ order: order.id, item: item.id })

export function OrderDetail() {
  const { orderId } = useParams()
  const { state } = useAccount()
  const [panel, setPanel] = useState(null)
  const close = () => setPanel(null)
  const order = find(state.orders, orderId)
  if (!order) return <Missing title="Order unavailable" to="/orders" link="Back to orders" />
  const lines = items(order)
  const store = find(state.stores, order.storeId)
  const events = latest(state.orderEvents).filter((event) => event.orderId === order.id)
  return <>
    <Back to="/orders">Back to orders</Back>
    <Heading title={orderName(order)} action={<Badge status={order.status} />}>Purchased {date(order.createdAt)} · {label(order.fulfillment)}</Heading>
    <div className="detail-grid">
      <div className="stack">
        <section className="card"><h2>Order items</h2>
          {lines.length ? lines.map((item) => <article className="detail-line" key={item.id}>
            <div className="line-heading"><Thumb item={item} /><div>
              <h3>{itemName(item)}</h3><p className="muted">{item.sku ? 'SKU ' + item.sku + ' · ' : ''}Quantity {item.quantity ?? '—'}
                {item.canceledQuantity > 0 ? ' · ' + item.canceledQuantity + ' canceled' : ''}</p></div><strong>{money(item.unitPrice)} each</strong>
            </div>
            {(matchCapacity(state, order, item) || canAddPlan(state, order, item) || returnableQuantity(state, order, item)) ? <div className="actions">
              {matchCapacity(state, order, item) > 0 && <SiteLink className="button secondary" to={linePath('/price-match', order, item)}>Request a price match</SiteLink>}
              {canAddPlan(state, order, item) && <SiteLink className="button secondary" to={linePath('/protection-plans', order, item)}>Add protection</SiteLink>}
              {returnableQuantity(state, order, item) > 0 && <SiteLink className="button secondary" to={linePath('/returns', order, item)}>Start a return</SiteLink>}
            </div> : null}
          </article>) : <Empty>Item information is unavailable.</Empty>}
        </section>
        {events.length > 0 && <section className="card"><h2>Order activity</h2><ul className="rows">
          {events.map((event) => <li key={event.id} className="detail-line">
            <h3>{event.type === 'pickup_contact_changed' ? 'Pickup person changed' : 'Items canceled'}</h3>
            <p className="muted">{date(event.createdAt)}{event.reason ? ' · ' + event.reason : ''}</p>
            {event.pickupContact?.name && <p>{event.pickupContact.name}</p>}
            {list(event.lines).length > 0 && <ReviewLines order={order} lines={list(event.lines)} />}
          </li>)}
        </ul></section>}
      </div>
      <div className="stack">
        <section className="card"><h2>Order summary</h2><Totals order={order} />
          <div className="actions"><button type="button" className="secondary" onClick={() => setPanel('receipt')}>View receipt</button></div>
        </section>
        <section className="card"><h2>{order.fulfillment === 'pickup' ? 'Pickup' : 'Fulfillment'}</h2>
          <Facts values={order.fulfillment === 'pickup'
            ? [['Store', store?.name || order.storeId], ['Pickup person', order.pickupContact?.name]]
            : [['Method', label(order.fulfillment)], ['Status', label(order.status)]]} />
          {(order.fulfillment === 'pickup' || order.shipment || ['shipped', 'delivered'].includes(order.status)) && <div className="actions">
            <button type="button" className="secondary" onClick={() => setPanel('fulfillment')}>{order.fulfillment === 'pickup' ? 'View pickup details' : 'Track shipment'}</button>
          </div>}
          {pickupEditable(order) && <div className="actions">
            <button type="button" className="secondary" onClick={() => setPanel('pickup')}>Change pickup person</button>
          </div>}
          {cancelableOrder(order) && lines.some((line) => remaining(line) && validMoney(line.unitPrice)) && <div className="actions">
            <button type="button" className="secondary" onClick={() => setPanel('cancel')}>Cancel items</button>
          </div>}
        </section>
      </div>
    </div>
    {panel === 'receipt' && <Receipt order={order} close={close} />}
    {panel === 'fulfillment' && <Fulfillment order={order} store={store} close={close} />}
    {panel === 'pickup' && <PickupForm order={order} close={close} />}
    {panel === 'cancel' && <CancelItemsForm order={order} close={close} />}
  </>
}

