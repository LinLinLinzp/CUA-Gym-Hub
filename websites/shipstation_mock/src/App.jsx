import React, { useLayoutEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { Navigate, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { Button, Confirm, DialogForm, Field, Icon, LabelPaper, Modal } from './components.jsx'
import { BatchDetail, LabelDetail, OrderDetail, ReturnDetail } from './details.jsx'
import { BatchEditor, BatchMembership, OrderEditor, ReturnEditor, ShippingEditor } from './editors.jsx'
import { money, rows } from './data/shipping.js'
import { Queue, sections } from './queue.jsx'
import { RecordLink, useSessionPath, useWorkspace } from './workspace.jsx'

const routes = Object.keys(sections)
const find = (state, key, id) => id ? rows(state[key]).find(entry => entry.id === id) : undefined

function Shell({ section, record, children, error }) {
  const { state, notice, setNotice } = useWorkspace()
  const sessionPath = useSessionPath()
  const actor = find(state, 'users', state.account?.actorId)
  const account = state.account?.name || 'Northline Goods'
  const initials = account.split(/ +/).slice(0, 2).map(word => word[0]).join('').toUpperCase()
  return <div className="workspace">
    <aside className="rail">
      <RecordLink to="/orders" className="wordmark">ShipStation</RecordLink>
      <nav aria-label="Workspace">{routes.map(route => <NavLink key={route} to={sessionPath('/' + route)}>
        <Icon name={route} />{sections[route].title}</NavLink>)}</nav>
      <div className="account"><div className="avatar" aria-hidden="true">{initials}</div>
        <div><strong>{account}</strong>{actor?.name && <span>{actor.name}</span>}</div></div>
    </aside>
    <main>
      <div className="top-strip">{section && (record ? <nav aria-label="Breadcrumb"><RecordLink to={'/' + section}>{sections[section].title}</RecordLink>
        <Icon name="right" size={14}/><span aria-current="page">{record}</span></nav> : <span>{sections[section].title}</span>)}</div>
      <div className="content">
        {error && <div className="notice error-box" role="alert">{error}</div>}
        {notice && <div className="notice" role="status"><Icon name="check" /><span>{notice}</span><Button icon="close" aria-label="Dismiss message" onClick={() => setNotice('')} /></div>}
        {children}
      </div>
    </main>
  </div>
}
function RecordPage({ section, show, perform, error }) {
  const { id } = useParams()
  const { state } = useWorkspace()
  const record = find(state, section, id)
  const names = { orders: 'Order', labels: 'Label', batches: 'Batch', returns: 'Return' }
  return <Shell section={section} record={record?.number || record?.rma || record?.id || id} error={error}>
    {!record ? <div className="empty missing"><h1>{names[section]} unavailable</h1>
      <p>We couldn’t find this record in the workspace.</p><RecordLink className="button" to={'/' + section}>Back to {sections[section].title}</RecordLink></div>
      : section === 'orders' ? <OrderDetail order={record} show={show} perform={perform} />
      : section === 'labels' ? <LabelDetail label={record} show={show} />
      : section === 'batches' ? <BatchDetail batch={record} show={show} />
      : <ReturnDetail entry={record} show={show} />}
  </Shell>
}

function Receipt({ close, submit }) {
  const now = new Date()
  const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
  const [receivedDate, setDate] = useState(today)
  return <Modal title="Receive Return" close={close} compact>
    <DialogForm close={close} submit={() => submit(receivedDate)} label="Confirm Receipt">
      <p>Enter the date the warehouse received these items.</p>
      <Field label="Receipt date"><input type="date" value={receivedDate} required onChange={event => setDate(event.target.value)} /></Field>
    </DialogForm>
  </Modal>
}
function ActionDialog({ dialog, close, show, print }) {
  const { state, commit } = useWorkspace()
  const { type, orderId, labelId, batchId, returnId, labelIds, ids, cost, orderCount } = dialog
  const order = find(state, 'orders', orderId)
  const label = find(state, 'labels', labelId)
  const batch = find(state, 'batches', batchId)
  const submit = (action, data, notice) => () => { commit(action, data, notice); close() }
  if (type === 'order') return <OrderEditor order={order} close={close} show={show} />
  if (type === 'shipping' && order) return <ShippingEditor order={order} purchase={dialog.purchase} close={close} />
  if (type === 'batch') return <BatchEditor batch={batch} ids={ids} close={close} />
  if (type === 'addToBatch') return <BatchMembership batch={batch} ids={ids} close={close} />
  if (type === 'return') return <ReturnEditor orderId={orderId} outboundLabelId={labelId} close={close} />
  if (type === 'receive') return <Receipt close={close} submit={receivedDate => submit('return_received',
    { returnId, receivedDate }, 'Return receipt recorded.')()} />
  if (type === 'preview' && label) return <Modal title="Preview Label" close={close} compact>
    <div className="dialog-body preview"><LabelPaper label={label} name={find(state, 'orders', label.orderId)?.recipient?.name} /></div>
    <footer className="dialog-footer"><Button onClick={close}>Close Preview</Button>
      {label.status === 'active' && <Button kind="primary" onClick={() => show({ type: 'print', labelIds: [label.id] })}>Print Label</Button>}</footer>
  </Modal>
  const confirmations = {
    cancelOrder: { title: 'Cancel Order', action: 'order_status_changed', data: { orderId, status: 'cancelled' }, notice: 'Order cancelled.',
      prompt: 'Cancel ' + (order?.number || orderId) + '? The order record will remain in the Cancelled queue.', danger: true },
    voidLabel: { title: 'Void Label', action: 'outbound_label_voided', data: { labelId }, notice: 'Label voided.',
      prompt: 'Void ' + (label?.number || labelId) + '? The order will reopen if this is its last active outbound label.', danger: true },
    process: { title: 'Process Batch', action: 'batch_processed', data: { batchId, reviewedCents: cost, orderCount }, notice: 'Batch processed.',
      prompt: 'Create ' + orderCount + ' outbound ' + (orderCount === 1 ? 'label' : 'labels') + ' for ' + money(cost / 100) + ' in total postage?' },
    archive: { title: 'Archive Batch', action: 'batch_archived', data: { batchId }, notice: 'Batch archived.',
      prompt: 'Move ' + (batch?.number || batchId) + ' to Archived? Its orders and labels will remain available.' },
    removeOrder: { title: 'Remove Order', action: 'batch_orders_removed', data: { batchId, orderIds: [orderId] },
      notice: 'Order removed from batch.', prompt: 'Remove ' + (order?.number || orderId) + ' from ' + (batch?.number || batchId) + '?' },
    cancelReturn: { title: 'Cancel Return', action: 'return_voided', data: { returnId }, notice: 'Return cancelled and inbound label voided.',
      prompt: 'Cancel this return and void its inbound label?', danger: true },
  }
  if (type === 'print') return <Confirm close={close} title={batchId ? 'Print Labels' : 'Print Label'} submit={() => {
    commit('labels_print_requested', { labelIds, batchId }, 'Print request recorded.')
    const papers = labelIds.map(id => find(state, 'labels', id))
    close()
    print(papers)
  }}><p>Open the browser print dialog for {labelIds.length} {labelIds.length === 1 ? 'label' : 'labels'}?</p></Confirm>
  const item = confirmations[type]
  return item ? <Confirm title={item.title} submit={submit(item.action, item.data, item.notice)} close={close} danger={item.danger}>
    <p>{item.prompt}</p></Confirm> : null
}
export function App() {
  const { state, commit } = useWorkspace()
  const path = useSessionPath()
  const { pathname } = useLocation()
  const [dialog, setDialog] = useState(null)
  const [printable, setPrintable] = useState([])
  const [error, setError] = useState('')
  useLayoutEffect(() => { window.scrollTo(0, 0) }, [pathname])
  const show = value => { setError(''); setDialog(value) }
  function perform(action, data, notice) {
    try { setError(''); commit(action, data, notice) } catch (issue) { setError(issue.message) }
  }
  function print(labels) {
    flushSync(() => setPrintable(labels))
    try { window.print() } finally { setPrintable([]) }
  }
  return <>
    <Routes>
      <Route path="/" element={<Navigate replace to={path('/orders')} />} />
      {routes.map(section => <Route key={section} path={'/' + section} element={<Shell section={section} error={error}>
        <Queue key={section} section={section} show={show} /></Shell>} />)}
      {routes.map(section => <Route key={section} path={'/' + section + '/:id'}
        element={<RecordPage section={section} show={show} perform={perform} error={error} />} />)}
      <Route path="*" element={<Shell><div className="empty missing"><h1>Page unavailable</h1>
        <RecordLink className="button" to="/orders">Back to Orders</RecordLink></div></Shell>} />
    </Routes>
    {dialog && <ActionDialog key={dialog.type} dialog={dialog} close={() => setDialog(null)} show={show} print={print} />}
    {!!printable.length && <div className="print-only" aria-hidden="true">{printable.map(label =>
      <LabelPaper key={label.id} label={label} name={find(state, 'orders', label.orderId)?.recipient?.name} />)}</div>}
  </>
}

