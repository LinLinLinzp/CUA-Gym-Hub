import { useState } from 'react'
import { Search } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { amount, audit, checkLabel, dateLabel, localStamp, newId, optionLabel, parseMoney, refundEligibility, refundOptions, replace, tenderLabel, updateAudit, within } from '../data/model.js'
import { Back, Badge, Button, Dialog, Empty, Field, Header, Ledger, NavLinkTo, SearchBox, Select } from '../ui.jsx'

const orderPath = id => '/orders/' + encodeURIComponent(id)
const refundPath = id => '/refunds/' + encodeURIComponent(id)
const localDate = (value, zone) => dateLabel(localStamp(value, zone).slice(0, 10))

export function Refunds({ state }) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const orders = new Map(state.orders.map(order => [order.id, order]))
  const rows = state.refunds.filter(row => {
    const order = orders.get(row.orderId)
    return (!type || row.type === type) && within(query, checkLabel(order ?? row), row.reason, order?.guestName, row.checkId)
  }).sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
  return <>
    <Header title="Refunds" subtitle="Review returned payments and find a check to refund." actions={
      <NavLinkTo className="button primary" to="/orders?status=paid&from=refunds"><Search size={16} />Find a check</NavLinkTo>} />
    <div className="filters">
      <SearchBox label="Search by check or reason" value={query} onChange={setQuery} />
      <Select label="Refund type" options={refundOptions} blank="All types" value={type} onChange={setType} />
    </div>
    <Ledger label="Refund history" rows={rows} queryKey={query + '|' + type} columns={[
      ['Refund date', row => localDate(row.createdAt, state.account.timeZone)],
      ['Check', row => orders.has(row.orderId) ? <NavLinkTo to={orderPath(row.orderId)}>{checkLabel(orders.get(row.orderId))}</NavLinkTo> : checkLabel(row)],
      ['Reason', row => <NavLinkTo to={refundPath(row.id)}>{row.reason ?? 'View refund'}</NavLinkTo>],
      ['Type', row => optionLabel(refundOptions, row.type)], ['Amount', row => amount(row.amountCents)],
      ['Status', row => <Badge value={row.status} />],
    ]} />
  </>
}

export function RefundDetail({ state }) {
  const { refundId } = useParams()
  const refund = state.refunds.find(row => row.id === refundId)
  const order = refund && state.orders.find(row => row.id === refund.orderId)
  const payment = refund && state.payments.find(row => row.id === refund.paymentId)
  return <>
    <Back to="/refunds">Refunds</Back>
    {!refund ? <Empty title="Refund unavailable">Return to refunds to choose another record.</Empty> : <>
      <Header title={'Refund for check ' + checkLabel(order ?? refund)} subtitle={localDate(refund.createdAt, state.account.timeZone)} actions={
        order && <NavLinkTo to={orderPath(order.id)} className="button">Original check</NavLinkTo>} />
      <div className="detail-grid">
        <section>
          <div className="panel"><h2>{optionLabel(refundOptions, refund.type)}</h2><p>{refund.reason || '—'}</p></div>
          {refund.lines?.length > 0 && <Ledger label="Refunded items" rows={refund.lines} rowId={(line) => line.orderLineId} columns={[
            ['Item', line => line.name || 'Item'], ['Quantity', line => line.quantity ?? '—'],
            ['Tax returned', line => amount(line.taxCents)], ['Amount returned', line => amount(line.amountCents)],
          ]} />}
        </section>
        <section className="panel">
          <div className="section-heading"><h2>Refund summary</h2><Badge value={refund.status} /></div>
          <RefundAmounts record={refund} payment={payment} />
        </section>
      </div>
    </>}
  </>
}

function RefundAmounts({ record, payment }) {
  return <dl className="pairs">{[
    ['Tender', payment ? tenderLabel(payment) : '—'], ['Subtotal returned', amount(record.subtotalCents)],
    ['Tax returned', amount(record.taxCents)], ['Tip returned', amount(record.tipCents)],
    ['Total refund', amount(record.amountCents)],
  ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
}

function refundLine(line, quantity) {
  const subtotalCents = Math.round((line.lineTotalCents ?? line.unitPriceCents * line.quantity) * quantity / line.quantity)
  const taxCents = Math.round((line.taxCents ?? 0) * quantity / line.quantity)
  return { orderLineId: line.id, menuItemId: line.menuItemId, name: line.name, quantity, subtotalCents, taxCents, amountCents: subtotalCents + taxCents }
}

function buildRefund(type, order, quantities, customAmount) {
  const originals = order.lines ?? []
  if (type === 'custom') {
    const subtotalCents = parseMoney(customAmount)
    return { lines: [], subtotalCents, taxCents: 0, tipCents: 0, amountCents: subtotalCents }
  }
  const lines = []
  for (const line of originals) {
    const entered = quantities[line.id] ?? ''
    const quantity = type === 'full' ? line.quantity : Number(entered)
    if (type === 'items' && !quantity && (entered === '' || /^0+(\.0{1,2})?$/.test(entered))) continue
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > line.quantity ||
        (type === 'items' && !/^\d+(\.\d{1,2})?$/.test(entered))) return null
    lines.push(refundLine(line, quantity))
  }
  const subtotalCents = type === 'full' && order.subtotalCents != null ? order.subtotalCents : lines.reduce((sum, line) => sum + line.subtotalCents, 0)
  const taxCents = type === 'full' && order.taxCents != null ? order.taxCents : lines.reduce((sum, line) => sum + line.taxCents, 0)
  const tipCents = type === 'full' ? order.tipCents ?? 0 : 0
  return { lines, subtotalCents, taxCents, tipCents, amountCents: subtotalCents + taxCents + tipCents }
}

export function RefundEditor({ state, commit, order, payment, close }) {
  const [type, setType] = useState('full')
  const [quantities, setQuantities] = useState({})
  const [customAmount, setCustomAmount] = useState('')
  const [reason, setReason] = useState('')
  const [review, setReview] = useState(false)
  const [error, setError] = useState('')
  const proposed = buildRefund(type, order, quantities, customAmount)
  const max = Math.min(order.totalCents ?? payment.amountCents, payment.amountCents)
  function submit() {
    const blocked = refundEligibility(state, order, payment)
    if (blocked) return setError(blocked)
    if (!proposed) return setError('Enter valid quantities within the original line quantities, using up to two decimal places.')
    if (!Number.isSafeInteger(proposed.amountCents) || proposed.amountCents <= 0 || proposed.amountCents > max ||
        proposed.lines.some(line => !Number.isSafeInteger(line.amountCents) || line.amountCents < 0)) {
      return setError('Enter a refund amount greater than zero and no more than ' + amount(max) + '.')
    }
    if (type === 'full' && proposed.amountCents !== payment.amountCents) return setError('The check total and payment amount must match for a full refund.')
    if (!reason.trim()) return setError('Enter a refund reason.')
    setError('')
    if (!review) return setReview(true)
    commit(current => {
      const record = { id: newId('ref'), orderId: order.id, checkId: order.checkId, paymentId: payment.id,
        type, ...proposed, reason: reason.trim(), status: 'completed', ...audit(current) }
      const summary = { refundedAmountCents: record.amountCents, refundStatus: record.amountCents === payment.amountCents ? 'full' : 'partial',
        ...updateAudit(current) }
      return { ...current, refunds: [record, ...current.refunds],
        payments: replace(current.payments, { ...payment, ...summary }),
        orders: replace(current.orders, { ...order, ...summary }) }
    }, 'Refund recorded.')
    close()
  }
  return <Dialog title={review ? 'Review refund' : 'Issue refund for ' + checkLabel(order)} wide error={error}
    onClose={close} onSubmit={submit} submit={review ? 'Confirm refund' : 'Review refund'}
    extra={review && <Button onClick={() => setReview(false)}>Edit refund</Button>}>
    <p className="muted">Check {checkLabel(order)} · {tenderLabel(payment)} · Original payment {amount(payment.amountCents)}</p>
    {review ? <>
      <p><strong>{optionLabel(refundOptions, type)}</strong> · {reason.trim()}</p>
      {proposed.lines.length > 0 && <dl className="pairs">{proposed.lines.map(line => <div key={line.orderLineId}><dt>{line.quantity} × {line.name}</dt><dd>{amount(line.amountCents)}</dd></div>)}</dl>}
      <RefundAmounts record={proposed} payment={payment} />
    </> : <>
      <Select label="Refund type" options={refundOptions} value={type} onChange={value => { setType(value); setError('') }} />
      {type === 'items' && ((order.lines ?? []).length ? (order.lines ?? []).map(line => <div key={line.id} className="line-edit">
        <div className="line-name"><strong>{line.name || 'Item'}</strong><div className="muted">Sold {line.quantity} · {amount(line.lineTotalCents)} before tax</div></div>
        <Field label={'Refund quantity for ' + (line.name || 'item')}><input type="number" min="0" max={line.quantity} step=".01" placeholder="0"
          value={quantities[line.id] ?? ''} onChange={event => setQuantities({ ...quantities, [line.id]: event.target.value })} /></Field>
      </div>) : <p>No item quantities are available for this check.</p>)}
      {type === 'custom' && <Field label="Refund amount"><input required inputMode="decimal" value={customAmount} onChange={event => setCustomAmount(event.target.value)} /></Field>}
      <Field label="Refund reason"><textarea required rows={2} value={reason} onChange={event => setReason(event.target.value)} /></Field>
      <RefundAmounts record={proposed ?? {}} payment={payment} />
    </>}
  </Dialog>
}

