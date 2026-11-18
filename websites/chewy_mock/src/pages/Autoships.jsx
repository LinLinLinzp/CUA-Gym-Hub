import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAccount } from '../store'
import { cents, date, eventId, find, list, matches, merchandise, money, newOrder, orderLabel, quantityOk, shiftDay, today, validDay } from '../model'
import { Address, Back, Badge, ButtonLink, Dialog, Empty, ErrorText, Filter, Labelled, Missing, PageHeader, ProductLine, Search, SiteLink, Totals, routeId } from '../ui'

export function Autoships() {
  const { state } = useAccount()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const plans = list(state.autoships).filter(plan =>
    (!status || plan.status === status) && matches(query, plan.name, plan.id, ...list(plan.items).map(item => item.name)))
  return <>
    <PageHeader title="Autoship" description="Manage the products and schedule for each recurring delivery." />
    <section aria-label="Autoship plans">
      <div className="toolbar">
        <Search label="Search plans or products" value={query} onChange={setQuery} />
        <Filter label="Plan status" options={{ '': 'All statuses', active: 'Active', cancelled: 'Canceled' }} value={status} onChange={setStatus} />
      </div>
      {!plans.length && <Empty title={query || status ? 'No matching plans' : 'No Autoship plans'} />}
      <div className="grid">{plans.map(plan => <article className="card plan-card" key={plan.id}>
        <div className="section-heading"><Badge status={plan.status} /><span className="meta">{plan.id}</span></div>
        <h3>{plan.name || 'Autoship plan'}</h3>
        <div><small>{plan.status === 'active' ? 'Next ship date · ' + date(plan.nextShipDate) : 'Canceled ' + date(plan.cancelledAt)}</small>
          <small>{list(plan.items).length} {list(plan.items).length === 1 ? 'product' : 'products'} · {money(merchandise(plan.items))}</small></div>
        <ButtonLink to={'/autoship/' + routeId(plan.id)}>{plan.status === 'active' ? 'Manage plan' : 'View plan'}</ButtonLink>
      </article>)}</div>
    </section>
  </>
}

const dialogLabels = {
  date_changed: ['Change ship date', 'Save date'], frequency_changed: ['Change frequency', 'Save frequency'],
  shipment_skipped: ['Skip next shipment', 'Confirm skip'], cancelled: ['Cancel Autoship', 'Confirm cancellation'],
  item_added: ['Add product', 'Add to Autoship'], item_quantity_changed: ['Edit quantity', 'Save quantity'],
  item_removed: ['Remove product', 'Confirm removal'], ordered_now: ['Order now', 'Place order now'],
  address_changed: ['Change shipping address', 'Save address'], payment_changed: ['Change payment method', 'Save payment method'],
}
const messages = {
  date_changed: 'Ship date updated.', frequency_changed: 'Autoship frequency updated.', shipment_skipped: 'Next shipment skipped.',
  cancelled: 'Autoship canceled.', item_added: 'Product added.', item_quantity_changed: 'Quantity updated.',
  item_removed: 'Product removed.', ordered_now: 'Order placed.', address_changed: 'Shipping address updated.', payment_changed: 'Payment method updated.',
}

const paymentName = (payment) => payment?.label || [payment?.brand, payment?.last4 && 'ending in ' + payment.last4].filter(Boolean).join(' ') || 'Payment method unavailable'
function scheduledDay(plan, skip) {
  const weeks = Number(plan.frequencyWeeks)
  if (!quantityOk(weeks) || weeks > 52) return null
  const now = today()
  const base = skip && validDay(plan.nextShipDate) && plan.nextShipDate > now ? plan.nextShipDate : now
  const next = shiftDay(base, weeks * 7)
  return validDay(next) ? next : null
}
const orderSource = (state, plan) => ({
  items: plan.items,
  address: find(state.addresses, plan.addressId),
  paymentLabel: paymentName(find(state.paymentMethods, plan.paymentMethodId)),
  shipping: 0,
  tax: Math.round(cents(merchandise(plan.items)) * 0.055) / 100,
})

function updatePlan(state, metadata, id, action, draft, itemId) {
  const plan = find(state.autoships, id)
  if (!plan || plan.status !== 'active') throw Error('This plan is no longer active.')
  const items = list(plan.items)
  const item = find(items, itemId)
  const quantity = Number(draft.quantity)
  const value = draft.value
  let patch
  let previous
  let next
  let order
  switch (action) {
    case 'date_changed':
      if (!validDay(value) || value < today()) throw Error('Choose a ship date today or later.')
      previous = { nextShipDate: plan.nextShipDate ?? null }
      patch = next = { nextShipDate: value }
      break
    case 'frequency_changed':
      if (!quantityOk(value) || Number(value) > 52) throw Error('Enter a whole number from 1 to 52.')
      previous = { frequencyWeeks: plan.frequencyWeeks ?? null }
      patch = next = { frequencyWeeks: Number(value) }
      break
    case 'shipment_skipped':
    case 'ordered_now': {
      const nextShipDate = scheduledDay(plan, action === 'shipment_skipped')
      if (!nextShipDate) throw Error('Change the ship date or delivery frequency first.')
      previous = { nextShipDate: plan.nextShipDate ?? null }
      patch = next = { nextShipDate }
      if (action === 'ordered_now') order = newOrder(orderSource(state, plan), eventId('ord'), metadata, { autoshipId: id })
      break
    }
    case 'cancelled':
      previous = { status: plan.status }
      patch = next = { status: 'cancelled', cancelledAt: metadata.createdAt }
      break
    case 'item_added': {
      const product = find(state.products, value)
      if (!product || product.autoshipEligible === false || items.some(line => line.productId === value)) throw Error('Choose a product that’s available for this plan.')
      if (!quantityOk(draft.quantity)) throw Error('Enter a positive whole-number quantity.')
      const { name, variant, unitPrice, returnable, imageKey } = product
      const added = { id: eventId('asi'), productId: product.id, name, variant, unitPrice: cents(unitPrice) / 100, quantity, returnable, imageKey }
      previous = null
      next = itemValues(added)
      patch = { items: [...items, added] }
      break
    }
    case 'item_quantity_changed':
      if (!item || !quantityOk(draft.quantity)) throw Error('Enter a positive whole-number quantity for an existing item.')
      previous = itemValues(item)
      next = { ...previous, quantity }
      patch = { items: items.map(line => line.id === itemId ? { ...line, quantity } : line) }
      break
    case 'item_removed':
      if (!item || items.length < 2) throw Error('An active plan needs at least one item.')
      previous = itemValues(item)
      next = null
      patch = { items: items.filter(line => line.id !== itemId) }
      break
    case 'address_changed':
    case 'payment_changed': {
      const address = action === 'address_changed'
      const field = address ? 'addressId' : 'paymentMethodId'
      if (!find(address ? state.addresses : state.paymentMethods, value)) throw Error('Choose a saved option.')
      previous = { [field]: plan[field] ?? null }
      patch = next = { [field]: value }
      break
    }
    default:
      throw Error('This change is unavailable.')
  }
  if (!order && previous && next && Object.keys(next).every(key => next[key] === previous[key])) return state
  const updated = { ...plan, ...patch, updatedAt: metadata.createdAt, updatedBy: metadata.actorId }
  const event = { id: eventId('ase'), autoshipId: id, action, ...metadata, previous, next, ...(order ? { orderId: order.id } : {}) }
  return {
    ...state,
    autoships: list(state.autoships).map(entry => entry.id === id ? updated : entry),
    autoshipEvents: [...list(state.autoshipEvents), event],
    ...(order ? { orders: [order, ...list(state.orders)] } : {}),
  }
}

const itemValues = (item) => ({ itemId: item.id, productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice })

export function AutoshipDetail() {
  const { id } = useParams()
  const { state } = useAccount()
  const plan = find(state.autoships, id)
  if (!plan) return <Missing to="/autoship" label="Back to Autoship" title="Autoship plan not found" />
  return <Plan key={id} plan={plan} />
}

function Plan({ plan }) {
  const { state, commit } = useAccount()
  const [dialog, setDialog] = useState(null)
  const [draft, setDraft] = useState({})
  const [error, setError] = useState('')
  const items = list(plan.items)
  const active = plan.status === 'active'
  const linkedOrder = list(state.orders).find(order => order.autoshipId === plan.id)
  const products = list(state.products).filter(product => product.autoshipEligible !== false && !items.some(item => item.productId === product.id))
  const skipDate = active ? scheduledDay(plan, true) : null
  const nextOrderDate = active ? scheduledDay(plan, false) : null
  const open = (action, value = '', item) => {
    setDraft({ value, quantity: item?.quantity ?? 1 })
    setError('')
    setDialog({ action, item })
  }
  const submit = () => {
    try {
      commit((current, metadata) => updatePlan(current, metadata, plan.id, dialog.action, draft, dialog.item?.id), messages[dialog.action])
      setDialog(null)
    } catch (err) { setError(err.message) }
  }
  const valueField = (value) => setDraft(current => ({ ...current, value }))
  const quantityField = <Labelled label="Quantity"><input type="number" min="1" step="1" required value={draft.quantity ?? ''} onChange={event => setDraft({ ...draft, quantity: event.target.value })} /></Labelled>
  const source = orderSource(state, plan)
  const total = merchandise(items)
  const action = dialog?.action

  return <>
    <Back to="/autoship">Autoship</Back>
    <PageHeader title={plan.name || 'Autoship plan'} description={plan.id}><Badge status={plan.status} /></PageHeader>
    <div className="detail-grid">
      <div className="stack">
        <section className="card">
          <h2>Delivery schedule</h2>
          <dl className="detail-data">
            <div><dt>Next ship date</dt><dd>{active ? date(plan.nextShipDate) : 'No delivery scheduled'}</dd></div>
            <div><dt>Frequency</dt><dd>{plan.frequencyWeeks ? 'Every ' + plan.frequencyWeeks + (Number(plan.frequencyWeeks) === 1 ? ' week' : ' weeks') : 'Not set'}</dd></div>
            {plan.cancelledAt && <div><dt>Canceled on</dt><dd>{date(plan.cancelledAt)}</dd></div>}
          </dl>
          {active && <div className="actions">
            <button onClick={() => open('date_changed', plan.nextShipDate || today())}>Change ship date</button>
            <button onClick={() => open('frequency_changed', plan.frequencyWeeks || '')}>Change frequency</button>
            <button disabled={!skipDate} onClick={() => open('shipment_skipped')}>Skip next shipment</button>
          </div>}
          {active && !skipDate && <p className="meta schedule-note">Set a ship date and frequency that allow another delivery before skipping.</p>}
        </section>
        <section className="card">
          <div className="section-heading"><h2>Products</h2>{active && <button disabled={!products.length} onClick={() => open('item_added')}>Add product</button>}</div>
          {!items.length && <Empty title="No products in this plan" />}
          {items.map((item, index) => <ProductLine item={item} key={item.id || index}>
            {active && item.id && <div className="actions">
              <button onClick={() => open('item_quantity_changed', '', item)}>Edit quantity</button>
              <button disabled={items.length < 2} onClick={() => open('item_removed', '', item)}>Remove product</button>
            </div>}
          </ProductLine>)}
          {active && items.length === 1 && <p className="meta">An active plan needs at least one product.</p>}
        </section>
      </div>
      <div className="stack">
        <section className="card">
          <h2>Delivery details</h2>
          <h3>Shipping address</h3><Address address={source.address} />
          {active && list(state.addresses).length > 0 && <div className="actions"><button onClick={() => open('address_changed', plan.addressId || '')}>Change address</button></div>}
          <div style={{ marginTop: 16 }}><h3>Payment</h3><p>{source.paymentLabel}</p></div>
          {active && list(state.paymentMethods).length > 0 && <div className="actions"><button onClick={() => open('payment_changed', plan.paymentMethodId || '')}>Change payment method</button></div>}
        </section>
        <section className="card">
          <h2>Plan summary</h2><Totals rows={[]} total={total} label="Items subtotal" />
          {active && <div className="actions">
            <button className="primary" disabled={!items.length || !nextOrderDate} onClick={() => open('ordered_now')}>Order now</button>
            <button onClick={() => open('cancelled')}>Cancel Autoship</button>
          </div>}
          {linkedOrder && <p><SiteLink to={'/orders/' + routeId(linkedOrder.id)}>View order {orderLabel(linkedOrder)}</SiteLink></p>}
        </section>
      </div>
    </div>
    {dialog && <Dialog title={dialogLabels[action][0]} confirm={dialogLabels[action][1]} danger={['cancelled', 'item_removed'].includes(action)} onClose={() => setDialog(null)} onSubmit={submit}>
      {action === 'date_changed' && <><p>Current ship date · {date(plan.nextShipDate)}</p><Labelled label="New ship date"><input type="date" min={today()} required value={draft.value} onChange={e => valueField(e.target.value)} /></Labelled></>}
      {action === 'frequency_changed' && <><p>The next shipment stays scheduled for {date(plan.nextShipDate)}.</p><Labelled label="Weeks between shipments"><input type="number" min="1" max="52" step="1" required value={draft.value} onChange={e => valueField(e.target.value)} /></Labelled></>}
      {action === 'shipment_skipped' && <p>Move the shipment from {date(plan.nextShipDate)} to <strong>{date(skipDate)}</strong>.</p>}
      {action === 'cancelled' && <p>End recurring deliveries for {plan.name || 'this plan'}?</p>}
      {action === 'item_added' && <><Filter label="Product" options={Object.fromEntries([['', 'Choose a product'], ...products.map(product => [product.id, (product.name || 'Product') + ' · ' + money(product.unitPrice)])])} value={draft.value} onChange={valueField} />{quantityField}</>}
      {action === 'item_quantity_changed' && <><p>{dialog.item.name || 'Product'} · Current quantity {dialog.item.quantity}</p>{quantityField}</>}
      {action === 'item_removed' && <p>Remove {dialog.item.name || 'this product'} from future shipments?</p>}
      {action === 'ordered_now' && <>
        <p>Place a processing order for the products below. Your next Autoship will be scheduled for {date(nextOrderDate)}.</p>
        <ul>{items.map((item, index) => <li key={item.id || index}>{item.name || 'Item'} × {item.quantity}</li>)}</ul>
        <Totals rows={[[ 'Items', total], ['Shipping', source.shipping], ['Tax', source.tax]]} total={(cents(total) + cents(source.tax)) / 100} />
      </>}
      {action === 'address_changed' && <Filter label="Saved address" options={Object.fromEntries([['', 'Choose an address'], ...list(state.addresses).map(address => [address.id, address.label || address.line1 || address.id])])} value={draft.value} onChange={valueField} />}
      {action === 'payment_changed' && <Filter label="Saved payment method" options={Object.fromEntries([['', 'Choose a payment method'], ...list(state.paymentMethods).map(payment => [payment.id, paymentName(payment)])])} value={draft.value} onChange={valueField} />}
      <ErrorText>{error}</ErrorText>
    </Dialog>}
  </>
}

