import React, { useState } from 'react'
import { Button, Check, DialogForm, Field, Modal } from './components.jsx'
import { batchOrderIssues, reasons } from './data/actions.js'
import { completeAddress, money, outboundIssue, quote, returnable, returnIssue, rows, services } from './data/shipping.js'
import { RecordLink, recordPath, useOpenRecord, useWorkspace } from './workspace.jsx'

const recipientFields = [
  ['name', 'Recipient name', true, 100], ['company', 'Company', false, 100],
  ['email', 'Email', false, 120, 'email'], ['phone', 'Phone', false, 32, 'tel'],
]
const addressFields = [
  ['line1', 'Address line 1', true, 120], ['line2', 'Address line 2', false, 120],
  ['city', 'City', true, 80], ['region', 'State / region', true, 60],
  ['postalCode', 'Postal code', true, 20], ['country', 'Country code', true, 2],
]
const itemFields = [['sku', 'SKU', 64], ['name', 'Item name', 120]]
const readFields = (form, fields, prefix) => Object.fromEntries(fields.map(([key]) =>
  [key, String(form.get(prefix + key) ?? '').trim()]))
const InputFields = ({ fields, initial, prefix }) => fields.map(([key, label, required, maxLength, type]) =>
  <Field key={key} label={label}><input name={prefix + key} type={type || 'text'} required={required}
    maxLength={maxLength} pattern={key === 'country' ? '[A-Za-z]{2}' : undefined}
    defaultValue={initial?.[key] ?? (key === 'country' ? 'US' : '')} /></Field>)

export function OrderEditor({ order, close, show }) {
  const { state, commit } = useWorkspace()
  const open = useOpenRecord()
  const [lines, setLines] = useState([])
  const manual = rows(state.stores).filter(store => store.type === 'manual' && store.id)
  function submit(element, createLabel = false) {
    const form = new FormData(element)
    const recipient = readFields(form, recipientFields, 'recipient-')
    const shipTo = readFields(form, addressFields, 'address-')
    shipTo.country = shipTo.country.toUpperCase()
    const notes = String(form.get('notes') ?? '').trim()
    if (order) {
      commit('order_updated', { orderId: order.id, recipient, shipTo, notes }, 'Order details saved.')
      close()
      return
    }
    const items = lines.map(id => ({ ...readFields(form, itemFields, id + '-'),
      quantity: Number(form.get(id + '-quantity')), unitPrice: Number(form.get(id + '-price')) }))
    const result = commit('order_created', { recipient, shipTo, notes, items, number: String(form.get('number')).trim(),
      storeId: String(form.get('storeId')) }, 'Order created.')
    open('orders', result.id)
    if (createLabel) show({ type: 'shipping', orderId: result.id, purchase: true })
    else close()
  }
  return <Modal title={order ? 'Edit Details' : 'New Order'} close={close}>
    <DialogForm close={close} submit={submit} label="Save" disabled={!order && !manual.length}
      secondary={!order && manual.length ? { label: 'Save & Create Label', submit: form => submit(form, true) } : null}>
      {!order && <><div className="fields">
        <Field label="Order number"><input name="number" required maxLength={48} /></Field>
        <Field label="Manual store"><select name="storeId" required>{manual.length ? manual.map(store =>
          <option key={store.id} value={store.id}>{store.name || store.id}</option>) : <option value="">No manual stores</option>}</select></Field>
      </div>{!manual.length && <p className="error-box">A manual store is required to enter an order.</p>}</>}
      <fieldset><legend>Recipient</legend><div className="fields"><InputFields fields={recipientFields} initial={order?.recipient} prefix="recipient-" /></div></fieldset>
      <fieldset><legend>Shipping address</legend><div className="fields"><InputFields fields={addressFields} initial={order?.shipTo} prefix="address-" /></div></fieldset>
      <Field label="Notes"><textarea name="notes" maxLength={1000} defaultValue={order?.notes || ''} rows={2} /></Field>
      {!order && <fieldset><legend>Line items (optional)</legend>
        {lines.map((id, i) => <div className="line-editor" key={id}>
          <div className="line-heading"><strong>Item {i + 1}</strong><Button onClick={() => setLines(lines.filter(line => line !== id))}>Remove Item {i + 1}</Button></div>
          <div className="fields"><InputFields fields={itemFields.map(([key, label, maxLength]) => [key, label, true, maxLength])} prefix={id + '-'} />
            <Field label="Quantity"><input name={id + '-quantity'} type="number" min="1" step="1" required defaultValue="1" /></Field>
            <Field label="Unit price (USD)"><input name={id + '-price'} type="number" min="0" step="0.01" required defaultValue="0" /></Field>
          </div></div>)}
        <Button icon="plus" onClick={() => setLines([...lines, crypto.randomUUID()])}>Add Item</Button>
      </fieldset>}
    </DialogForm>
  </Modal>
}

const dimensionKeys = [['length', 'Length (in)'], ['width', 'Width (in)'], ['height', 'Height (in)']]
function ShippingFields({ options, setOptions }) {
  const patch = fields => setOptions({ ...options, ...fields })
  return <div className="fields">
    <Field label="Carrier / Service"><select required value={services.findIndex(entry =>
      entry.carrier === options.carrier && entry.service === options.service)} onChange={event => {
      const selected = services[Number(event.target.value)]
      patch({ carrier: selected?.carrier, service: selected?.service })
    }}><option value="-1">Choose carrier and service</option>{services.map((entry, index) =>
      <option key={index} value={index}>{entry.carrier} · {entry.service}</option>)}</select></Field>
    <Field label="Package"><select required value={options.packageType ?? ''} onChange={event => patch({ packageType: event.target.value })}>
      <option value="">Choose package</option><option>Box</option><option>Mailer</option></select></Field>
    <Field label="Weight (oz)"><input type="number" min="0.01" step="any" required value={options.weightOz ?? ''}
      onChange={event => patch({ weightOz: event.target.value })} /></Field>
    {dimensionKeys.map(([key, label]) => <Field key={key} label={label}><input type="number" min="0.001" step="any" required
      value={options.dimensionsIn?.[key] ?? ''} onChange={event => patch({ dimensionsIn: {
        ...options.dimensionsIn, [key]: event.target.value } })} /></Field>)}
  </div>
}
function numericOptions(options) {
  return { ...options, weightOz: Number(options.weightOz), dimensionsIn: {
    ...options.dimensionsIn, ...Object.fromEntries(dimensionKeys.map(([key]) => [key, Number(options.dimensionsIn?.[key])])),
  } }
}
function LocationField({ label, locations, value, change }) {
  return <Field label={label}><select required value={value ?? ''} onChange={event => change(event.target.value)}>
    <option value="">Choose a location</option>{locations.map(location =>
      <option key={location.id} value={location.id}>{location.name || location.id}</option>)}</select></Field>
}
function Rate({ rate }) {
  return <div className="rate"><span>Postage estimate</span><strong>{rate === null ? '—' : money(rate / 100)}</strong></div>
}
export function ShippingEditor({ order, purchase, close }) {
  const { state, commit } = useWorkspace()
  const open = useOpenRecord()
  const [options, setOptions] = useState(order.shipping || {})
  const [review, setReview] = useState(false)
  const [reviewedCents, setReviewedCents] = useState(null)
  const rate = quote(options)
  const locations = rows(state.locations).filter(location => location.id && completeAddress(location.address))
  function submit() {
    const shipping = numericOptions(options)
    if (!purchase) {
      commit('shipping_options_saved', { orderId: order.id, shipping }, 'Shipping options saved.')
      close()
    } else if (!review) {
      const issue = outboundIssue(state, order, shipping)
      if (issue) throw new Error(issue)
      setReviewedCents(rate)
      setReview(true)
    } else {
      const label = commit('outbound_label_created', { orderId: order.id, shipping, reviewedCents }, 'Outbound label created.')
      open('labels', label.id)
      close()
    }
  }
  const title = purchase ? 'Create Label' : 'Save Shipping Options'
  return <Modal title={title} close={close}>
    <DialogForm key={review} close={review ? () => setReview(false) : close} submit={submit}
      label={review ? 'Confirm & Create Label' : purchase ? 'Review Label' : 'Save Shipping Options'}>
      {review ? <><p>Create an outbound label for <strong>{order.number || order.id}</strong> using {options.carrier} {options.service}?</p>
        <Rate rate={reviewedCents} /></> : <>
        <LocationField label="Ship From" locations={locations} value={options.shipFromId}
          change={shipFromId => setOptions({ ...options, shipFromId })} />
        {!locations.length && <p className="error-box">A ship-from location with a complete address is required.</p>}
        <ShippingFields options={options} setOptions={setOptions} />
        <Rate rate={rate} />
      </>}
    </DialogForm>
  </Modal>
}

export function BatchEditor({ batch, ids, close }) {
  const { state, commit } = useWorkspace()
  const open = useOpenRecord()
  const operators = rows(state.users).filter(user => user.id)
  const [name, setName] = useState(batch?.name || '')
  const [assigneeId, setAssignee] = useState(batch?.assigneeId || '')
  const issue = batchOrderIssues(state, ids || [])
  function submit() {
    const result = commit(batch ? 'batch_updated' : 'batch_created',
      { batchId: batch?.id, orderIds: ids, name: name.trim(), assigneeId }, batch ? 'Batch updated.' : 'Batch created.')
    if (result) open('batches', result.id)
    close()
  }
  return <Modal title={batch ? 'Edit Batch' : 'New Batch'} close={close}>
    <DialogForm close={close} submit={submit} label={batch ? 'Save Batch' : 'Create Batch'}>
      {!!ids?.length && <p>{ids.length} selected {ids.length === 1 ? 'order' : 'orders'}</p>}
      {issue.map(message => <p className="error-box" key={message}>{message}</p>)}
      <Field label="Batch name"><input required value={name} onChange={event => setName(event.target.value)} maxLength={80} /></Field>
      <Field label="Assignee"><select value={assigneeId} onChange={event => setAssignee(event.target.value)}>
        <option value="">Unassigned</option>{operators.map(user => <option key={user.id} value={user.id}>{user.name || user.id}</option>)}
      </select></Field>
    </DialogForm>
  </Modal>
}

export function BatchMembership({ batch, ids, close }) {
  const { state, commit } = useWorkspace()
  const open = useOpenRecord()
  const [selected, setSelected] = useState([])
  const [search, setSearch] = useState('')
  const [batchId, setBatchId] = useState('')
  const choices = rows(state.batches).filter(entry => entry.status === 'open' && entry.id)
  const target = batch || choices.find(entry => entry.id === batchId)
  const orders = rows(state.orders).filter(order => order.status === 'awaiting_shipment' && order.id
    && !rows(batch?.orderIds).includes(order.id)
    && [order.number, order.recipient?.name].some(field => String(field ?? '').toLowerCase().includes(search.trim().toLowerCase())))
  const orderIds = ids || selected
  const issues = batchOrderIssues(state, orderIds, target?.id)
  function submit() {
    commit('batch_orders_added', { batchId: target?.id, orderIds }, 'Orders added to batch.')
    open('batches', target.id)
    close()
  }
  return <Modal title={batch ? 'Add Orders' : 'Add to Batch'} close={close}>
    <DialogForm close={close} submit={submit} label={batch ? 'Add Selected Orders' : 'Add Orders to Batch'}
      disabled={!target || !orderIds.length}>
      {!batch && <>
        <p>{ids.length} selected {ids.length === 1 ? 'order' : 'orders'}</p>
        <Field label="Open batch"><select value={batchId} onChange={event => setBatchId(event.target.value)} required>
          <option value="">Choose an open batch</option>{choices.map(entry =>
            <option key={entry.id} value={entry.id}>{entry.number || entry.id} · {entry.name || 'Unnamed batch'}</option>)}</select></Field>
        {!choices.length && <p className="error-box">There are no open batches. Create a batch to group these orders.</p>}
      </>}
      {batch && <>
        <Field label="Find awaiting-shipment orders"><input type="search" value={search} onChange={event => setSearch(event.target.value)} /></Field>
        <div className="pick-list">{orders.length ? orders.map(order => {
          const conflict = rows(state.batches).find(entry => entry.id !== batch.id && entry.status === 'open' && rows(entry.orderIds).includes(order.id))
          return <div key={order.id}><label><Check checked={selected.includes(order.id)} onChange={event =>
            setSelected(event.target.checked ? [...selected, order.id] : selected.filter(id => id !== order.id))} />
            <span>{order.number || order.id} <small>{order.recipient?.name}</small></span></label>
            {conflict && <RecordLink to={recordPath('batches', conflict.id)} onClick={close}>In {conflict.number || conflict.id}</RecordLink>}</div>
        }) : <p className="muted">No available orders match.</p>}</div>
      </>}
      {issues.map(issue => <p className="error-box" key={issue}>{issue}</p>)}
    </DialogForm>
  </Modal>
}

export function ReturnEditor({ orderId, outboundLabelId, close }) {
  const { state, commit } = useWorkspace()
  const open = useOpenRecord()
  const [selectedId, setSelectedId] = useState(orderId || '')
  const order = rows(state.orders).find(entry => entry.id === selectedId)
  const candidates = rows(state.orders).filter(entry => entry.id && !returnIssue(state, entry))
  function authorize(data) {
    const entry = commit('return_authorized', { ...data, orderId: order.id, outboundLabelId }, 'Return authorized.')
    open('returns', entry.id)
    close()
  }
  return <Modal title="Create Return" close={close}>
    <ReturnOptions key={selectedId} order={order} close={close} authorize={authorize} outboundLabelId={outboundLabelId}>
      {!orderId && <Field label="Shipped order"><select value={selectedId} onChange={event => setSelectedId(event.target.value)} required>
        <option value="">Choose an eligible order</option>{candidates.map(entry => <option key={entry.id} value={entry.id}>
          {entry.number || entry.id} · {entry.recipient?.name}</option>)}</select></Field>}
      {!orderId && !candidates.length && <p className="error-box">There are no shipped orders with returnable items and a complete domestic address.</p>}
    </ReturnOptions>
  </Modal>
}
function ReturnOptions({ order, close, authorize, outboundLabelId, children }) {
  const { state } = useWorkspace()
  const outbound = rows(state.labels).find(entry => entry.id === outboundLabelId && entry.direction === 'outbound' && entry.status === 'active')
    || rows(state.labels).find(entry => entry.orderId === order?.id && entry.direction === 'outbound' && entry.status === 'active')
  const { shipFromId, ...starting } = outbound?.shipping || order?.shipping || {}
  const [options, setOptions] = useState(starting)
  const [warehouseId, setWarehouse] = useState('')
  const [picks, setPicks] = useState({})
  const [notes, setNotes] = useState('')
  const [review, setReview] = useState(null)
  const issue = order && returnIssue(state, order)
  const warehouses = rows(state.locations).filter(location => location.id && completeAddress(location.address)
    && location.address.country === order?.shipTo?.country)
  const rate = quote(options)
  function patch(id, change) { setPicks({ ...picks, [id]: { ...picks[id], ...change } }) }
  function submit() {
    if (review) return authorize(review)
    const items = rows(order?.items).filter(item => picks[item.id]?.checked).map(item =>
      ({ orderItemId: item.id, quantity: Number(picks[item.id].quantity), reason: picks[item.id].reason }))
    if (!items.length) throw new Error('Select at least one return item.')
    if (rate === null) throw new Error('Complete the return package details.')
    if (issue) throw new Error(issue)
    setReview({ items, shipping: numericOptions(options), locationId: warehouseId, notes: notes.trim(), reviewedCents: rate })
  }
  return <DialogForm key={!!review} close={review ? () => setReview(null) : close} submit={submit}
    label={review ? 'Authorize Return' : 'Review Return'} disabled={!order || !!issue}>
    {review ? <>
      <p>Authorize a return for <strong>{order.number || order.id}</strong> to {warehouses.find(location => location.id === warehouseId)?.name || warehouseId}.</p>
      <ul>{review.items.map(item => <li key={item.orderItemId}>{item.quantity} × {rows(order.items).find(line => line.id === item.orderItemId)?.name || item.orderItemId} · {item.reason}</li>)}</ul>
      <Rate rate={review.reviewedCents} />
    </> : <>
      {children}
      {issue && <p className="error-box">{issue}</p>}
      {order && !issue && <>
        <fieldset><legend>Return items</legend>{rows(order.items).filter(item => item.id).map(item => {
          const remaining = returnable(state, order, item)
          const picked = picks[item.id] || {}
          const name = item.name || item.sku || item.id
          return <div className="line-editor" key={item.id}>
            <label className="return-item"><Check disabled={remaining < 1} checked={!!picked.checked}
              onChange={event => patch(item.id, { checked: event.target.checked, quantity: picked.quantity || '1' })} />
              <span>{name} <small>{remaining} available</small></span></label>
            {picked.checked && <div className="fields">
              <Field label={'Quantity for ' + name}><input required type="number" min="1" max={remaining} step="1"
                value={picked.quantity} onChange={event => patch(item.id, { quantity: event.target.value })} /></Field>
              <Field label={'Reason for ' + name}><select required value={picked.reason || ''} onChange={event => patch(item.id, { reason: event.target.value })}>
                <option value="">Choose a reason</option>{reasons.map(reason => <option key={reason}>{reason}</option>)}</select></Field>
            </div>}
          </div>
        })}</fieldset>
        <Field label="Notes"><textarea value={notes} onChange={event => setNotes(event.target.value)} rows={2} maxLength={1000} /></Field>
        <LocationField label="Return warehouse" locations={warehouses} value={warehouseId} change={setWarehouse} />
        <ShippingFields options={options} setOptions={setOptions} />
        <Rate rate={rate} />
      </>}
    </>}
  </DialogForm>
}

