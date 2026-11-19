import { useId, useRef, useState } from 'react'
import { list, money, orderName, paymentLabel, refundHref, restaurantFor } from '../data/format'
import { refundBalance, refundSelection, reasons } from '../data/refundRules'
import { requestRefund } from '../data/transactions'
import { useAccount } from '../store'
import { Modal, useAccountNavigate } from './ui'

export function eligibleRefundOrders(state) {
  return list(state.orders).filter(order => order.id && refundBalance(order, state.refunds).amount > 0)
}

export function RefundRequest({ orderId, onClose }) {
  const { state, commit } = useAccount()
  const navigate = useAccountNavigate()
  const orderFieldId = useId()
  const reasonFieldId = useId()
  const [selectedId, setSelectedId] = useState(orderId || '')
  const [scope, setScope] = useState('items')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [quantities, setQuantities] = useState(new Map())
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submitted = useRef(false)
  const orders = orderId ? [] : eligibleRefundOrders(state)
  const order = list(state.orders).find(item => item.id === selectedId)
  const balance = refundBalance(order, state.refunds)
  const selection = refundSelection(balance, scope, quantities)

  function setQuantity(id, quantity) {
    setQuantities(previous => new Map(previous).set(id, quantity))
    setError('')
  }

  function submit(event) {
    event.preventDefault()
    if (submitted.current) return
    submitted.current = true
    setSubmitting(true)
    const result = commit(current => requestRefund(current, { orderId: selectedId, scope, reason, notes, quantities }))
    if (result.error) {
      setError(result.error)
      submitted.current = false
      setSubmitting(false)
    } else navigate(refundHref(result.id), { state: { notice: 'Refund request submitted' } })
  }

  return (
    <Modal title="Request a refund" onClose={onClose}>
      <form className="stack refund-form" onSubmit={submit}>
        {!orderId && (
          <div className="field">
            <label htmlFor={orderFieldId}>Order</label>
            <select id={orderFieldId} value={selectedId} required data-initial-focus onChange={event => { setSelectedId(event.target.value); setQuantities(new Map()); setError('') }}>
              <option value="">Choose an eligible order</option>
              {orders.map(item => <option key={item.id} value={item.id}>{orderName(item, restaurantFor(state, item.restaurantId))} · #{item.id}</option>)}
            </select>
          </div>
        )}
        {order && (
          <>
            {orderId && <p className="meta">{orderName(order, restaurantFor(state, order.restaurantId))} · #{order.id}</p>}
            {balance.amount > 0 ? (
              <>
                <div className="field"><label htmlFor={reasonFieldId}>Reason</label><select id={reasonFieldId} data-initial-focus={Boolean(orderId)} value={reason} required onChange={event => { setReason(event.target.value); setError('') }}><option value="">Choose a reason</option>{Object.entries(reasons).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                <fieldset className="field-group">
                  <legend>Refund scope</legend>
                  <div className="mode-options">
                    <label className="choice"><input type="radio" name="scope" checked={scope === 'items'} onChange={() => { setScope('items'); setError('') }} /> Specific items</label>
                    <label className="choice"><input type="radio" name="scope" checked={scope === 'full_order'} onChange={() => { setScope('full_order'); setError('') }} /> Full order</label>
                  </div>
                </fieldset>
                {scope === 'items' && (
                  <fieldset className="field-group">
                    <legend>Items to refund</legend>
                    <div className="refund-choices">
                      {balance.lines.filter(line => line.remaining > 0).map(({ item, remaining }) => {
                        const checked = quantities.has(item.id) && quantities.get(item.id) !== null
                        return (
                          <div className="refund-line" key={item.id}>
                            <label className="line-choice"><input type="checkbox" checked={checked} onChange={event => setQuantity(item.id, event.target.checked ? 1 : null)} disabled={submitting} /><span>{item.name || 'Menu item'} <small className="meta">{remaining} available</small></span></label>
                            {checked && <label className="field refund-quantity"><span className="sr-only">Quantity for {item.name || 'item'}</span><input type="number" min="1" max={remaining} step="1" required value={quantities.get(item.id) || ''} onChange={event => setQuantity(item.id, Number(event.target.value))} /></label>}
                          </div>
                        )
                      })}
                    </div>
                  </fieldset>
                )}
                <label className="field">Details (optional)<textarea rows="2" maxLength={500} value={notes} onChange={event => { setNotes(event.target.value); setError('') }} /></label>
                <div className="notice refund-preview"><div><strong>Requested amount</strong><p className="meta">{paymentLabel(order.payment)}</p></div><strong aria-live="polite">{money(selection?.amount)}</strong></div>
              </>
            ) : <p className="error">This order has no refundable amount available.</p>}
          </>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        <div className="actions modal-actions">
          <button type="button" className="button" onClick={onClose}>Close</button>
          <button type="submit" className="button primary" disabled={submitting || !selection || !reason}>Submit request</button>
        </div>
      </form>
    </Modal>
  )
}

export function RefundAction({ orderId }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="button" onClick={() => setOpen(true)}>Request a refund</button>
      {open && <RefundRequest orderId={orderId} onClose={() => setOpen(false)} />}
    </>
  )
}
