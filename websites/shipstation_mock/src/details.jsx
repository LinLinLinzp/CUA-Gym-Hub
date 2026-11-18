import React from 'react'
import { Address, Badge, Button, date, Facts, Panel } from './components.jsx'
import { batchReview } from './data/actions.js'
import { activeLabel, completeAddress, money, openBatches, returnIssue, rows, unusedLabel } from './data/shipping.js'
import { RecordLink, recordPath, useWorkspace } from './workspace.jsx'

function Links({ section, values }) {
  return values.length ? <ul className="record-links">{values.map(entry =>
    <li key={entry.id}><RecordLink to={recordPath(section, entry.id)}>{entry.number || entry.rma || entry.id}</RecordLink>
      <Badge value={entry.status} /></li>)}</ul> : <p className="muted">No linked {section}.</p>
}
function Detail({ title, status, subtitle, actions, children }) {
  return <><div className="page-heading detail-heading"><div><div className="title-line"><h1>{title}</h1><Badge value={status} /></div>
    {subtitle && <p>{subtitle}</p>}</div><div className="actions">{actions}</div></div>
    <div className="detail-grid">{children}</div></>
}
function ItemList({ items }) {
  return rows(items).length ? <div className="table-scroll"><table className="mini-table">
    <thead><tr><th>Item</th><th>SKU</th><th>Qty</th><th>Unit price</th></tr></thead>
    <tbody>{rows(items).map((item, i) => <tr key={item.id || i}>
      <th scope="row">{item.name || '—'}</th><td>{item.sku || '—'}</td><td>{item.quantity ?? '—'}</td><td>{money(item.unitPrice)}</td>
    </tr>)}</tbody></table></div> : <p className="muted">No items on this order.</p>
}
function dimensions(shipping) {
  const values = ['length', 'width', 'height'].map(key => shipping?.dimensionsIn?.[key])
  return values.some(value => value != null) ? values.map(value => value ?? '—').join(' × ') + ' in' : '—'
}
function ShippingFacts({ shipping, location }) {
  return <Facts entries={[
    ...(location !== undefined ? [['Ship From', location]] : []),
    ['Carrier', shipping?.carrier], ['Service', shipping?.service], ['Package', shipping?.packageType],
    ['Weight', shipping?.weightOz == null ? '—' : shipping.weightOz + ' oz'], ['Dimensions', dimensions(shipping)],
  ]} />
}
export function OrderDetail({ order, show, perform }) {
  const { state } = useWorkspace()
  const labels = rows(state.labels).filter(entry => entry.id && entry.orderId === order.id && entry.direction === 'outbound')
  const returns = rows(state.returns).filter(entry => entry.id && entry.orderId === order.id)
  const batches = openBatches(state, order.id)
  const { status, id } = order
  const editable = ['awaiting_payment', 'awaiting_shipment', 'on_hold'].includes(status)
  const outboundAllowed = ['awaiting_shipment', 'on_hold'].includes(status)
  const canShip = outboundAllowed && !batches.length && !activeLabel(state, id)
  const recipientReady = order.recipient?.name && completeAddress(order.shipTo)
  const returnError = status === 'shipped' && returnIssue(state, order)
  const store = rows(state.stores).find(entry => entry.id === order.storeId)
  const warehouse = rows(state.locations).find(entry => entry.id === order.shipping?.shipFromId)
  function transition(status, text) {
    perform('order_status_changed', { orderId: id, status }, text)
  }
  return <Detail title={order.number || id} status={status} subtitle={order.recipient?.name}
    actions={<>
      {editable && <Button onClick={() => show({ type: 'order', orderId: id })}>Edit Details</Button>}
      {canShip && <Button kind="primary" onClick={() => show({ type: 'shipping', orderId: id, purchase: true })}>Create Label</Button>}
      {status === 'shipped' && !returnError && <Button kind="primary" onClick={() => show({ type: 'return', orderId: id })}>Create Return</Button>}
    </>}>
    <div className="detail-stack">
      <Panel title="Ship to"><Address address={order.shipTo} name={order.recipient?.name} />
        {(order.recipient?.company || order.recipient?.email || order.recipient?.phone) && <Facts entries={[
          ['Company', order.recipient.company], ['Email', order.recipient.email], ['Phone', order.recipient.phone],
        ]} />}</Panel>
      <Panel title="Items"><ItemList items={order.items} /><div className="panel-total"><span>Order total</span><strong>{money(order.total)}</strong></div></Panel>
      <Panel title="Shipping options">
        {!order.shipping && <p className="muted">Shipping options haven’t been configured.</p>}
        <ShippingFacts shipping={order.shipping} location={warehouse?.name || order.shipping?.shipFromId || '—'} />
        {editable && <div className="panel-actions"><Button onClick={() => show({ type: 'shipping', orderId: id })}>Save Shipping Options</Button></div>}
      </Panel>
    </div>
    <div className="detail-stack">
      <Panel title="Order summary"><Facts entries={[['Store', store?.name || order.storeId], ['Order date', date(order.orderedAt)]]} />
        {order.notes && <p className="notes">{order.notes}</p>}
        {editable && <div className="panel-actions">
          {status === 'awaiting_payment' && <Button onClick={() => transition('awaiting_shipment', 'Order marked as paid.')}>Mark as Paid</Button>}
          {status === 'awaiting_shipment' && !batches.length && <Button onClick={() => transition('on_hold', 'Order placed on hold.')}>Place on Hold</Button>}
          {status === 'on_hold' && <Button onClick={() => transition('awaiting_shipment', 'Order released from hold.')}>Release Hold</Button>}
          {!batches.length && <Button onClick={() => show({ type: 'cancelOrder', orderId: id })}>Cancel Order</Button>}
        </div>}
        {!!batches.length && <p className="note">This order belongs to an open batch. Remove it from the batch to hold or cancel it, or process it there to create its label.</p>}
        {canShip && !recipientReady && <p className="error-box">Complete the recipient and delivery address before creating a label.</p>}
        {outboundAllowed && !batches.length && activeLabel(state, id) && <p className="note">This order already has an active outbound label.</p>}
        {returnError && <p className="note">{returnError}</p>}
      </Panel>
      {!!batches.length && <Panel title="Open batch"><Links section="batches" values={batches.filter(entry => entry.id)} /></Panel>}
      <Panel title="Outbound labels"><Links section="labels" values={labels} /></Panel>
      <Panel title="Returns"><Links section="returns" values={returns} /></Panel>
    </div>
  </Detail>
}

export function LabelDetail({ label, show }) {
  const { state } = useWorkspace()
  const order = rows(state.orders).find(entry => entry.id === label.orderId)
  const batch = rows(state.batches).find(entry => entry.id === label.batchId)
  const entry = rows(state.returns).find(entry => entry.id === label.returnId)
  const eligibleReturn = label.direction === 'outbound' && !returnIssue(state, order)
  return <Detail title={label.number || label.id} status={label.status} subtitle={label.direction === 'return' ? 'Return label' : label.direction === 'outbound' ? 'Outbound label' : ''}
    actions={<>
      {eligibleReturn && <Button onClick={() => show({ type: 'return', orderId: order.id, labelId: label.id })}>Create Return</Button>}
      <Button onClick={() => show({ type: 'preview', labelId: label.id })}>Preview Label</Button>
      {label.status === 'active' && <Button kind="primary" onClick={() => show({ type: 'print', labelIds: [label.id] })}>Print Label</Button>}
    </>}>
    <div className="detail-stack">
      <Panel title="Shipment"><Facts entries={[['Tracking number', label.trackingNumber], ['Tracking status', <Badge value={label.trackingStatus} />],
        ['Postage', money(label.cost)], ['Created', date(label.createdAt)], ...(label.voidedAt ? [['Voided', date(label.voidedAt)]] : [])]} /></Panel>
      <Panel title="Addresses"><div className="address-grid"><div><h3>Ship from</h3><Address address={label.shipFrom}
        name={label.direction === 'return' ? order?.recipient?.name : undefined} /></div>
        <div><h3>Ship to</h3><Address address={label.shipTo} name={label.direction === 'outbound' ? order?.recipient?.name : undefined} /></div></div>
      </Panel>
      <Panel title="Package"><ShippingFacts shipping={label.shipping} /></Panel>
    </div>
    <div className="detail-stack">
      <Panel title="Related records"><Facts entries={[
        ['Order', order ? <RecordLink to={recordPath('orders', order.id)}>{order.number || order.id}</RecordLink> : label.orderId],
        ...(batch ? [['Batch', <RecordLink to={recordPath('batches', batch.id)}>{batch.number || batch.id}</RecordLink>]] : []),
        ...(entry ? [['Return', <RecordLink to={recordPath('returns', entry.id)}>{entry.rma || entry.id}</RecordLink>]] : []),
      ]} /></Panel>
      {label.status === 'active' && <Panel title="Label management">
        {label.direction === 'return' ? <p className="muted">{entry ? <RecordLink to={recordPath('returns', entry.id)}>Manage this label on the return</RecordLink> : 'The linked return is unavailable.'}</p>
          : unusedLabel(label) && label.direction === 'outbound' ? <Button onClick={() => show({ type: 'voidLabel', labelId: label.id })}>Void Label</Button>
            : <p className="muted">Only active outbound labels without carrier scans are eligible to void.</p>}
      </Panel>}
    </div>
  </Detail>
}

export function BatchDetail({ batch, show }) {
  const { state } = useWorkspace()
  const open = batch.status === 'open'
  const review = batchReview(state, batch)
  const labels = rows(state.labels).filter(entry => entry.id && entry.batchId === batch.id)
  const printable = labels.filter(entry => entry.status === 'active')
  const ready = review.length && review.every(entry => !entry.issue)
  const cost = review.reduce((total, entry) => total + (entry.cents ?? 0), 0)
  const assignee = rows(state.users).find(entry => entry.id === batch.assigneeId)
  const showBatch = (type, extra) => show({ type, batchId: batch.id, ...extra })
  return <Detail title={batch.number || batch.id} status={batch.status} subtitle={batch.name}
    actions={open ? <>
      <Button onClick={() => showBatch('batch')}>Edit Batch</Button>
      <Button onClick={() => showBatch('addToBatch')}>Add Orders</Button>
      <Button kind="primary" disabled={!ready} onClick={() => showBatch('process', { cost, orderCount: review.length })}>Process Batch</Button>
    </> : <>
      {batch.status === 'processed' && <Button onClick={() => showBatch('archive')}>Archive Batch</Button>}
      {!!printable.length && <Button kind="primary" onClick={() => showBatch('print', { labelIds: printable.map(entry => entry.id) })}>Print Labels</Button>}
    </>}>
    <div className="detail-stack">
      <Panel title="Batch orders">
        {review.length ? <div className="table-scroll"><table className="mini-table"><thead><tr><th>Order</th><th>Recipient</th>
          {open && <><th>Validation</th><th>Action</th></>}</tr></thead>
          <tbody>{review.map(({ id, order, issue, cents }) => <tr key={id}>
            <th scope="row">{order ? <RecordLink to={recordPath('orders', id)}>{order.number || id}</RecordLink> : id}</th><td>{order?.recipient?.name || '—'}</td>
            {open && <><td className={issue ? 'error-text' : ''}>{issue || 'Ready · ' + money(cents / 100)}</td>
              <td><Button aria-label={'Remove ' + (order?.number || id)} onClick={() => showBatch('removeOrder', { orderId: id })}>Remove</Button></td></>}
          </tr>)}</tbody></table></div> : <p className="muted">There are no orders in this batch.</p>}
        {open && !ready && <p className="note">{review.length ? 'Resolve the order issues or remove those orders before processing.' : 'Add at least one ready order before processing.'}</p>}
      </Panel>
      {!open && <Panel title="Outbound labels"><Links section="labels" values={labels} /></Panel>}
    </div>
    <div className="detail-stack">
      <Panel title="Batch summary"><Facts entries={[
        ['Assignee', assignee?.name || batch.assigneeId || 'Unassigned'], ['Orders', review.length], ['Created', date(batch.createdAt)],
        [open ? 'Estimated postage' : 'Total postage', open && ready ? money(cost / 100) : money(batch.totalCost)],
        ...(batch.processedAt ? [['Processed', date(batch.processedAt)]] : []),
        ...(batch.archivedAt ? [['Archived', date(batch.archivedAt)]] : []),
      ]} /></Panel>
    </div>
  </Detail>
}

export function ReturnDetail({ entry, show }) {
  const { state } = useWorkspace()
  const order = rows(state.orders).find(order => order.id === entry.orderId)
  const inbound = rows(state.labels).find(label => label.id === entry.labelId)
  const outbound = rows(state.labels).find(label => label.id === entry.outboundLabelId)
  const warehouse = rows(state.locations).find(location => location.id === entry.locationId)
  const outstanding = entry.status === 'outstanding'
  const cancellable = outstanding && inbound?.direction === 'return' && inbound.returnId === entry.id && unusedLabel(inbound)
  return <Detail title={entry.rma || entry.id} status={entry.status} subtitle={order?.recipient?.name}
    actions={outstanding && <>
      {cancellable && <Button onClick={() => show({ type: 'cancelReturn', returnId: entry.id })}>Cancel Return</Button>}
      <Button kind="primary" onClick={() => show({ type: 'receive', returnId: entry.id })}>Receive Return</Button>
    </>}>
    <div className="detail-stack">
      <Panel title="Return items">{rows(entry.items).length ? <div className="table-scroll"><table className="mini-table">
        <thead><tr><th>Item</th><th>Qty</th><th>Reason</th></tr></thead>
        <tbody>{rows(entry.items).map((item, index) => <tr key={item.orderItemId || index}>
          <th scope="row">{rows(order?.items).find(line => line.id === item.orderItemId)?.name || item.orderItemId || '—'}</th>
          <td>{item.quantity ?? '—'}</td><td>{item.reason || '—'}</td>
        </tr>)}</tbody></table></div> : <p className="muted">No return items on file.</p>}
        {entry.notes && <p className="notes">{entry.notes}</p>}</Panel>
      <Panel title="Warehouse"><Address address={warehouse?.address || inbound?.shipTo} name={warehouse?.name} /></Panel>
    </div>
    <div className="detail-stack">
      <Panel title="Return summary"><Facts entries={[
        ['Authorized', date(entry.createdAt)], ['Received date', date(entry.receivedDate)],
        ...(entry.voidedAt ? [['Voided', date(entry.voidedAt)]] : []),
        ['Return postage', money(entry.cost)], ['Tracking number', inbound?.trackingNumber],
      ]} />{outstanding && !cancellable && <p className="note">An active unused inbound label is required to cancel this return.</p>}</Panel>
      <Panel title="Related records"><Facts entries={[
        ['Original order', order ? <RecordLink to={recordPath('orders', order.id)}>{order.number || order.id}</RecordLink> : entry.orderId],
        ['Outbound label', outbound ? <RecordLink to={recordPath('labels', outbound.id)}>{outbound.number || outbound.id}</RecordLink> : entry.outboundLabelId],
        ['Return label', inbound ? <RecordLink to={recordPath('labels', inbound.id)}>{inbound.number || inbound.id}</RecordLink> : entry.labelId],
      ]} /></Panel>
    </div>
  </Detail>
}

