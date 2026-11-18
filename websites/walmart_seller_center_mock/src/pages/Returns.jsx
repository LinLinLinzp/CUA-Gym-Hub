import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Activity, Dialog, Facts, Field, Missing, PageHead, Pager, Panel, Pill, Search, Select, SiteLink, Table, Tabs } from '../ui.jsx'
import { cents, date, label, list, matches, money, recordLines, remaining, route, text, useStore } from '../model.js'
import { canUpdateReturn, eligibleRefund, issueRefund, receiveReturn } from '../returnMutations.js'

const views = [['', 'All'], ['in_transit', 'In transit'], ['received', 'Received'], ['refunded', 'Refunded']]
const columns = ['Return ID', 'Purchase order', 'Items', 'Reason', 'Initiated', 'Refund', 'Status']
const pageSize = 15

export function Returns() {
  const [params] = useSearchParams()
  const view = views.find(([key]) => key === params.get('view'))?.[0] ?? ''
  return <ReturnQueue key={view} view={view} />
}

function ReturnQueue({ view }) {
  const { state } = useStore()
  const [query, setQuery] = useState('')
  const [reason, setReason] = useState('')
  const [page, setPage] = useState(0)
  const records = list(state.returns)
  const orders = new Map(list(state.orders).map((order) => [order.id, order]))
  const reasons = [...new Set(records.map((record) => record.reason).filter(Boolean))].sort()
  const rows = records.filter((record) => (!view || record.status === view) && (!reason || record.reason === reason)
    && matches(query, record.id, record.orderId, record.customerName || orders.get(record.orderId)?.customerName, ...recordLines(record).map((line) => line.sku)))
  const activePage = Math.min(page, Math.max(0, Math.ceil(rows.length / pageSize) - 1))
  const changeFilter = (setter) => (value) => { setter(value); setPage(0) }

  return <>
    <PageHead title="Returns" description="Track inbound returns and review refundable units." />
    <Panel>
      <Tabs active={view} section="returns" tabs={views.map(([key, title]) => [key, title, key ? records.filter((record) => record.status === key).length : records.length])} />
      <div className="toolbar">
        <Search name="Search returns" placeholder="Search return, purchase order, SKU or customer" value={query} onChange={changeFilter(setQuery)} />
        <Select name="Return reason" value={reason} options={ [['', 'All reasons'], ...reasons.map((entry) => [entry, entry])] } onChange={changeFilter(setReason)} />
      </div>
      <Table columns={columns} className="queue-table" empty={!rows.length}>
        {rows.slice(activePage * pageSize, (activePage + 1) * pageSize).map((record) => {
          const lines = recordLines(record)
          return <tr key={record.id}>
            <td><SiteLink className="cell-id" to={route('returns', record.id)}>{record.id}</SiteLink><small className="meta">{text(record.customerName || orders.get(record.orderId)?.customerName)}</small></td>
            <td><LinkedOrder record={record} order={orders.get(record.orderId)} /></td>
            <td>{text(lines[0]?.itemName || lines[0]?.sku)}{lines.length > 1 && <small className="meta">+{lines.length - 1} more</small>}</td>
            <td>{text(record.reason)}</td><td>{date(record.createdAt)}</td>
            <td>{money(record.refundedAmount)} <small className="meta">{label(record.refundStatus)}</small></td><td><Pill status={record.status} /></td>
          </tr>
        })}
      </Table>
      <Pager page={activePage} pageSize={pageSize} total={rows.length} onPage={setPage} />
    </Panel>
  </>
}

function LinkedOrder({ record, order }) {
  return order ? <SiteLink className="cell-id" to={route('orders', order.id)}>{order.id}</SiteLink> : <span className="cell-id">{text(record.orderId)}</span>
}

export function ReturnDetail() {
  const { id } = useParams()
  const { state } = useStore()
  const record = list(state.returns).find((entry) => entry.id === id)
  return record ? <ReturnView key={id} record={record} /> : <Missing to="/returns" name="Return" />
}

function ReturnView({ record }) {
  const { state } = useStore()
  const [action, setAction] = useState('')
  const order = list(state.orders).find((entry) => entry.id === record.orderId)
  const lines = recordLines(record)
  const refunds = list(state.refunds).filter((refund) => refund.returnId === record.id)
  const receipts = list(state.returnActions).filter((entry) => entry.returnId === record.id)
  const activity = [...receipts, ...refunds.map((refund) => ({
    ...refund, title: 'Refund issued', detail: [money(refund.amount), recordLines(refund).map((line) => line.quantity + ' × ' + text(line.sku)).join(', ')].filter(Boolean).join(' · '),
  }))].map((entry) => ({
    ...entry, detail: [entry.detail, entry.actorId === state.account.actorId ? state.account.actorName : entry.actorId].filter(Boolean).join(' · '),
  }))
  const canRefund = canUpdateReturn(state, record, 'refund')
  return <>
    <PageHead title={'Return ' + record.id} back={{ to: '/returns', label: 'Returns' }} description={record.customerName || order?.customerName} badge={<Pill status={record.status} />}>
      {canUpdateReturn(state, record, 'received') && <button className="button primary" onClick={() => setAction('received')}>Mark received</button>}
      {canRefund && <button className="button primary" onClick={() => setAction('refund')}>Issue refund</button>}
    </PageHead>
    <div className="details"><div>
      <Panel title="Returned items"><Table columns={['Item', 'Quantity', 'Refunded', 'Eligible now', 'Refund per unit']} empty={!lines.length}>
        {lines.map((line) => <tr key={line.id}>
          <td><strong>{text(line.itemName || line.sku)}</strong><small className="meta">{text(line.sku)}</small></td><td>{text(line.quantity)}</td>
          <td>{line.refundedQuantity ?? 0}</td><td>{canRefund && eligibleRefund(line) ? remaining(line) : 0}</td><td>{money(line.unitRefundAmount)}</td>
        </tr>)}
      </Table></Panel>
      <Activity entries={activity} />
    </div><div>
      <Panel title="Return summary"><Facts entries={[
        ['Purchase order', <LinkedOrder record={record} order={order} />], ['Reason', record.reason], ['Initiated', date(record.createdAt)],
        ['Received', date(record.receivedAt)], ['Carrier', record.carrier], ['Tracking number', record.trackingNumber],
      ]} /></Panel>
      <Panel title="Refund summary"><Facts entries={[
        ['Refund status', <Pill status={record.refundStatus} />], ['Original eligible amount', money(record.refundableAmount)],
        ['Refunded to date', money(record.refundedAmount)], ['Final refund', date(record.refundedAt)],
      ]} /></Panel>
    </div></div>
    {action === 'received' && <ReceiveDialog record={record} onClose={() => setAction('')} />}
    {action === 'refund' && <RefundDialog record={record} onClose={() => setAction('')} />}
  </>
}

function ReceiveDialog({ record, onClose }) {
  const { commit } = useStore()
  const quantity = recordLines(record).reduce((total, line) => total + line.quantity, 0)
  return <Dialog title="Mark received" onClose={onClose} onConfirm={() => commit((latest) => receiveReturn(latest, record.id), 'Return marked received.')}>
    <p>Confirm receipt of {quantity} {quantity === 1 ? 'unit' : 'units'} for return {record.id}.</p>
  </Dialog>
}

function RefundDialog({ record, onClose }) {
  const { commit } = useStore()
  const lines = recordLines(record).filter(eligibleRefund)
  const [selected, setSelected] = useState([])
  const [quantities, setQuantities] = useState({})
  const [errors, setErrors] = useState({})
  const quantityFor = (line) => Object.hasOwn(quantities, line.id) ? quantities[line.id] : String(remaining(line))
  const validQuantity = (line) => /^\d+$/.test(quantityFor(line)) && Number(quantityFor(line)) > 0 && Number(quantityFor(line)) <= remaining(line)
  const total = lines.reduce((sum, line) => selected.includes(line.id) && validQuantity(line)
    ? sum + Number(quantityFor(line)) * cents(line.unitRefundAmount) : sum, 0)
  function submit() {
    const amounts = Object.fromEntries(lines.filter((line) => selected.includes(line.id)).map((line) => [line.id, Number(quantityFor(line))]))
    const inputs = Object.fromEntries(lines.filter((line) => selected.includes(line.id) && !validQuantity(line))
      .map((line) => [line.id, 'Enter 1 to ' + remaining(line) + ' whole units.']))
    setErrors(inputs)
    if (Object.keys(inputs).length) return 'Check the selected quantities.'
    return commit((latest) => issueRefund(latest, record.id, amounts), 'Refund issued for ' + money(total / 100) + '.')
  }
  return <Dialog title="Issue refund" confirm="Confirm refund" onClose={onClose} onConfirm={submit} wide>
    <p>Select eligible lines and review the amount for return {record.id}.</p>
    {lines.map((line) => {
      const checked = selected.includes(line.id)
      const repeatedSku = record.lines.some((other) => other.id !== line.id && other.sku === line.sku)
      const lineLabel = repeatedSku ? line.sku + ' · return line ' + line.id : line.sku
      return <div className="refund-line" key={line.id}>
        <input type="checkbox" aria-label={'Refund ' + lineLabel} checked={checked} onChange={() => {
          setSelected((previous) => checked ? previous.filter((id) => id !== line.id) : [...previous, line.id])
          setErrors((previous) => ({ ...previous, [line.id]: undefined }))
        }} />
        <div><strong>{line.itemName || line.sku}</strong><small className="meta">{lineLabel} · {remaining(line)} eligible · {money(line.unitRefundAmount)} each</small></div>
        <Field label={<span className="sr-only">Quantity for {lineLabel}</span>} inputMode="numeric" disabled={!checked} value={quantityFor(line)} error={Object.hasOwn(errors, line.id) ? errors[line.id] : undefined} onChange={(event) => {
          setQuantities((previous) => ({ ...previous, [line.id]: event.target.value }))
          setErrors((previous) => ({ ...previous, [line.id]: undefined }))
        }} />
        <output className="refund-amount">{money(checked && validQuantity(line) ? Number(quantityFor(line)) * cents(line.unitRefundAmount) / 100 : 0)}</output>
      </div>
    })}
    <p className="refund-total"><span>Refund total (USD)</span><strong>{money(total / 100)}</strong></p>
  </Dialog>
}
