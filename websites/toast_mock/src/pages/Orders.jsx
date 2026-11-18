import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { amount, audit, checkLabel, dateLabel, guestLabel, newId, optionLabel, parseMoney, publishedItems, refundEligibility, replace, serviceOptions, tenderLabel, tenderOptions, timeLabel, today, totalsFor, updateAudit, within } from '../data/model.js'
import { withSid } from '../utils/dataManager.js'
import { Back, Badge, Button, Dialog, Empty, Field, Header, Ledger, NavLinkTo, SearchBox, Select } from '../ui.jsx'
import { RefundEditor } from './Refunds.jsx'

const orderPath = id => '/orders/' + encodeURIComponent(id)
const refundPath = id => '/refunds/' + encodeURIComponent(id)

export function Orders({ state, commit }) {
  const [params] = useSearchParams()
  const findCheck = params.get('from') === 'refunds'
  const initialStatus = findCheck || params.get('status') === 'paid' ? 'paid' : ''
  return <OrderList key={JSON.stringify([findCheck, initialStatus])} {...{ state, commit, findCheck, initialStatus }} />
}

function OrderList({ state, commit, findCheck, initialStatus }) {
  const [query, setQuery] = useState('')
  const [date, setDate] = useState('')
  const [service, setService] = useState('')
  const [status, setStatus] = useState(initialStatus)
  const [create, setCreate] = useState(false)
  const navigate = useNavigate()
  const rows = state.orders.filter(row =>
    within(query, checkLabel(row), row.checkId, row.guestName, row.tableLabel, (row.lines ?? []).map(line => line.name).join(' ')) &&
    (!date || row.businessDate === date) && (!service || row.serviceType === service) && (!status || row.status === status))
  return <>
    {findCheck && <Back to="/refunds">Refunds</Back>}
    <Header title={findCheck ? 'Find a check' : 'Orders'} subtitle={findCheck ? 'Select a paid check to review its tender and refund eligibility.' : 'Review and manage restaurant checks.'}
      actions={!findCheck && <Button variant="primary" onClick={() => setCreate(true)}><Plus size={17} />New order</Button>} />
    <div className="filters">
      <SearchBox label="Search checks, guests or items" value={query} onChange={setQuery} />
      <Field label="Business date"><input type="date" value={date} onChange={event => setDate(event.target.value)} /></Field>
      <Select label="Service type" blank="All service types" options={serviceOptions} value={service} onChange={setService} />
      <Select label="Order status" blank="All statuses" options={[['open', 'Open'], ['paid', 'Paid'], ['voided', 'Voided']]} value={status} onChange={setStatus} />
    </div>
    <Ledger label="Orders" rows={rows} queryKey={[query, date, service, status].join('|')} columns={[
      ['Check', row => <NavLinkTo to={orderPath(row.id) + (findCheck ? '?from=refunds' : '')}>{checkLabel(row)}</NavLinkTo>],
      ['Business date', row => dateLabel(row.businessDate)], ['Time', row => timeLabel(row.createdAt, state.account.timeZone)],
      ['Guest / table', guestLabel], ['Service', row => optionLabel(serviceOptions, row.serviceType)],
      ['Status', row => <Badge value={row.status} />], ['Total', row => amount(row.totalCents)],
    ]} />
    {create && <OrderEditor {...{ state, commit }} close={() => setCreate(false)} onSaved={id => navigate(withSid(orderPath(id)))} />}
  </>
}

export function OrderDetail(props) {
  const { orderId } = useParams()
  const [params] = useSearchParams()
  const order = props.state.orders.find(row => row.id === orderId)
  const fromRefunds = params.get('from') === 'refunds'
  return <>
    <Back to={fromRefunds ? '/orders?status=paid&from=refunds' : '/orders'}>{fromRefunds ? 'Find a check' : 'Orders'}</Back>
    {order ? <Check key={orderId} {...props} order={order} /> : <Empty title="Check unavailable">Return to orders to choose another check.</Empty>}
  </>
}

function Check({ state, commit, order }) {
  const [dialog, setDialog] = useState('')
  const payment = state.payments.find(row => row.orderId === order.id && row.checkId === order.checkId)
  const refunds = state.refunds.filter(row => row.orderId === order.id)
  const blocked = refundEligibility(state, order, payment)
  const open = order.status === 'open'
  const close = () => setDialog('')
  return <>
    <Header title={'Check ' + checkLabel(order)} subtitle={[guestLabel(order), optionLabel(serviceOptions, order.serviceType), dateLabel(order.businessDate)].join(' · ')} actions={open && <>
      <Button onClick={() => setDialog('edit')}>Edit check</Button>
      <Button variant="danger" onClick={() => setDialog('void')}>Void check</Button>
      <Button variant="primary" disabled={!order.lines?.length} onClick={() => setDialog('pay')}>Mark paid</Button>
    </>} />
    <div className="detail-grid">
      <section aria-label="Check ledger">
        <div className="section-heading"><h2>Check items</h2><Badge value={order.status} /></div>
        <Ledger label="Check items" rows={order.lines ?? []} emptyTitle="No items on this check" columns={[
          ['Item', line => line.name || 'Item'], ['Quantity', line => line.quantity ?? '—'],
          ['Unit price', line => amount(line.unitPriceCents)], ['Line total', line => amount(line.lineTotalCents)],
        ]} />
        {order.voidReason && <div className="panel"><strong>Void reason</strong><p>{order.voidReason}</p></div>}
        {refunds.length > 0 && <div className="panel"><h2>Linked refunds</h2><dl className="pairs">{refunds.map(row => <div key={row.id}>
          <dt><NavLinkTo to={refundPath(row.id)}>{row.reason || 'Refund'}</NavLinkTo></dt><dd>{amount(row.amountCents)}</dd>
        </div>)}</dl></div>}
      </section>
      <section className="panel" aria-label="Payment summary">
        <h2>Payment summary</h2>
        <dl className="pairs">{[
          ['Subtotal', amount(order.subtotalCents)], ['Tax', amount(order.taxCents)], ['Tip', amount(order.tipCents)],
          ['Total', amount(order.totalCents)], ['Tender', payment ? tenderLabel(payment) : '—'],
          ...(payment ? [['Paid', amount(payment.amountCents)]] : []),
          ...(order.refundedAmountCents > 0 ? [['Refunded', amount(order.refundedAmountCents)]] : []),
        ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        {order.status === 'paid' && (blocked ? <p className="muted">{blocked}</p> : <Button variant="primary" onClick={() => setDialog('refund')}>Issue refund</Button>)}
      </section>
    </div>
    {dialog === 'edit' && <OrderEditor {...{ state, commit, order, close }} />}
    {dialog === 'pay' && <PayDialog {...{ commit, order, close }} />}
    {dialog === 'void' && <VoidDialog {...{ commit, order, close }} />}
    {dialog === 'refund' && <RefundEditor {...{ state, commit, order, payment, close }} />}
  </>
}

function OrderEditor({ state, commit, order, close, onSaved }) {
  const [serviceType, setService] = useState(order?.serviceType ?? 'dine_in')
  const [guestName, setGuest] = useState(order?.guestName ?? '')
  const [tableLabel, setTable] = useState(order?.tableLabel ?? '')
  const [lines, setLines] = useState(() => (order?.lines ?? []).map(line => ({ original: line, id: line.id, itemId: line.menuItemId, quantity: String(line.quantity ?? '') })))
  const [selected, setSelected] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [error, setError] = useState('')
  const items = publishedItems(state)
  const itemById = new Map(items.map(item => [item.id, item]))
  const options = items.map(item => [item.id, item.name + ' · ' + item.groupName + ' · ' + amount(item.priceCents)])
  function setLineQuantity(id, value) {
    setLines(rows => rows.map(row => row.id === id ? { ...row, quantity: value } : row))
  }
  function addLine() {
    if (!itemById.has(selected)) return setError('Choose a published item.')
    if (!validQuantity(quantity)) return setError('Enter a positive whole quantity.')
    setLines(rows => [...rows, { id: newId('line'), itemId: selected, quantity }])
    setSelected('')
    setQuantity('1')
    setError('')
  }
  function compose(row) {
    const count = Number(row.quantity)
    const item = itemById.get(row.itemId)
    const unitPriceCents = row.original?.unitPriceCents ?? item?.priceCents
    const lineTotalCents = unitPriceCents * count
    if (!validQuantity(row.quantity) || !Number.isSafeInteger(lineTotalCents) || lineTotalCents < 0) return null
    if (row.original && count === row.original.quantity) return row.original
    const taxCents = Math.round(lineTotalCents * state.account.taxRateBps / 10000)
    return { id: row.id, menuItemId: row.itemId, name: row.original?.name ?? item?.name ?? 'Item', quantity: count, unitPriceCents, lineTotalCents, taxCents }
  }
  const proposed = lines.map(compose)
  const totals = totalsFor(proposed.filter(Boolean), order?.tipCents ?? 0)
  function submit() {
    if (!guestName.trim() && !tableLabel.trim()) return setError('Enter a guest name or table reference.')
    if (!proposed.length || proposed.some(line => !line)) return setError('Add at least one item with a positive whole quantity.')
    if (!Number.isSafeInteger(totals.totalCents)) return setError('The check total is out of range.')
    const orderId = order?.id ?? newId('ord')
    commit(current => {
      const fields = { guestName: guestName.trim(), tableLabel: tableLabel.trim(), serviceType, lines: proposed, ...totals }
      if (order) return { ...current, orders: replace(current.orders, { ...order, ...fields, ...updateAudit(current) }) }
      const checkNumber = String(current.orders.reduce((highest, row) => {
        const previous = Number(row.checkNumber)
        return Number.isSafeInteger(previous) ? Math.max(highest, previous) : highest
      }, 1000) + 1)
      const created = { id: orderId, checkId: newId('chk'), checkNumber, businessDate: today(current.account.timeZone),
        status: 'open', refundStatus: 'none', refundedAmountCents: 0, ...fields, ...audit(current) }
      return { ...current, orders: [created, ...current.orders] }
    }, order ? 'Check updated.' : 'Check opened.')
    close()
    onSaved?.(orderId)
  }
  return <Dialog title={order ? 'Edit check ' + checkLabel(order) : 'New order'} wide submit={order ? 'Save changes' : 'Save order'} onClose={close} onSubmit={submit} error={error}>
    <div className="form-grid">
      <Select label="Service type" options={serviceOptions} value={serviceType} onChange={setService} />
      <Field label="Guest name"><input value={guestName} onChange={event => setGuest(event.target.value)} /></Field>
      <Field label="Table reference"><input value={tableLabel} onChange={event => setTable(event.target.value)} /></Field>
    </div>
    <h2>Check items</h2>
    {lines.map((row, index) => {
      const name = row.original?.name ?? itemById.get(row.itemId)?.name ?? 'Item'
      return <div key={row.id} className="line-edit order-line">
        <div className="line-name"><strong>{name}</strong><div className="muted">{amount(proposed[index]?.lineTotalCents)}</div></div>
        <Field label={'Quantity for ' + name}><input type="number" min="1" step="1" value={row.quantity} onChange={event => setLineQuantity(row.id, event.target.value)} /></Field>
        <Button className="icon-button" aria-label={'Remove ' + name} onClick={() => setLines(rows => rows.filter(line => line.id !== row.id))}><X size={18} /></Button>
      </div>
    })}
    {items.length ? <div className="line-edit order-line">
      <Select label="Published item" blank="Choose an item" options={options} value={selected} onChange={setSelected} />
      <Field label="Quantity"><input inputMode="numeric" value={quantity} onChange={event => setQuantity(event.target.value)} /></Field>
      <Button onClick={addLine}>Add item</Button>
    </div> : <p className="muted">Publish an available menu item to add it to a check.</p>}
    <dl className="pairs"><div><dt>Check total</dt><dd>{amount(totals.totalCents)}</dd></div></dl>
  </Dialog>
}

function validQuantity(value) {
  return /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0
}

function PayDialog({ commit, order, close }) {
  const [method, setMethod] = useState('card')
  const [last4, setLast4] = useState('')
  const [tip, setTip] = useState(((order.tipCents ?? 0) / 100).toFixed(2))
  const [error, setError] = useState('')
  function submit() {
    const tipCents = parseMoney(tip)
    if (tipCents === null) return setError('Enter a nonnegative tip with up to two decimal places.')
    if (method !== 'cash' && last4 && !/^\d{4}$/.test(last4)) return setError('Use four digits for the tender reference.')
    const totals = totalsFor(order.lines ?? [], tipCents)
    if (!order.lines?.length || !Number.isSafeInteger(totals.totalCents)) return setError('A valid check with at least one item is required.')
    commit(current => {
      const payment = {
        id: newId('pay'), orderId: order.id, checkId: order.checkId, method,
        ...(method !== 'cash' ? { last4: last4 || '0142' } : {}), status: 'settled',
        amountCents: totals.totalCents, refundStatus: 'none', refundedAmountCents: 0, ...audit(current),
      }
      return { ...current, payments: [payment, ...current.payments], orders: replace(current.orders, { ...order, ...totals, status: 'paid', ...updateAudit(current) }) }
    }, 'Payment recorded.')
    close()
  }
  return <Dialog title={'Mark check ' + checkLabel(order) + ' paid'} submit="Record payment" onClose={close} onSubmit={submit} error={error}>
    <div className="form-grid">
      <Select label="Tender" options={tenderOptions} value={method} onChange={setMethod} />
      {method !== 'cash' && <Field label="Synthetic last four digits"><input inputMode="numeric" maxLength={4} placeholder="0142" value={last4} onChange={event => setLast4(event.target.value)} /></Field>}
      <Field label="Tip"><input inputMode="decimal" value={tip} onChange={event => setTip(event.target.value)} /></Field>
    </div>
    <dl className="pairs"><div><dt>Payment total</dt><dd>{amount(totalsFor(order.lines ?? [], parseMoney(tip) ?? 0).totalCents)}</dd></div></dl>
  </Dialog>
}

function VoidDialog({ commit, order, close }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  function submit() {
    if (!reason.trim()) return setError('Enter a reason for voiding this check.')
    commit(current => ({ ...current, orders: replace(current.orders, { ...order, status: 'voided', voidReason: reason.trim(), ...updateAudit(current) }) }), 'Check voided.')
    close()
  }
  return <Dialog title={'Void check ' + checkLabel(order)} submit="Confirm void" onClose={close} onSubmit={submit} error={error}>
    <Field label="Void reason"><textarea required rows={3} value={reason} onChange={event => setReason(event.target.value)} /></Field>
  </Dialog>
}

