import { useState } from 'react'
import { useAccount } from '../context/Account.jsx'
import { requestReturn } from '../data/actions.js'
import { findRecord, itemEligibility, label, money, orderNumber, records, refundMethods, returnEstimate, returnReasons, unitCents } from '../data/rules.js'
import { Dialog, DialogButtons, useConfirmation } from './Dialog.jsx'
import { Quote } from './Details.jsx'
import { QuantityField, SelectField } from './Fields.jsx'
import { OrderChooser } from './RequestFields.jsx'

export function ReturnQuote({ details, currency }) {
  return <Quote currency={currency} rows={[
    ['Item refund', details.refundSubtotal], ['Return fee', details.returnFee], ['Estimated refund', details.estimatedRefund, true],
  ]} />
}

export function ReturnDialog({ initialOrderId, onClose, onSuccess }) {
  const { state, transact } = useAccount()
  const [orderId, setOrderId] = useState(initialOrderId)
  const [selected, setSelected] = useState({})
  const [handoffMethod, setHandoffMethod] = useState('')
  const [refundMethod, setRefundMethod] = useState('')
  const [review, setReview] = useState(false)
  const [selectionError, setSelectionError] = useState('')
  const order = findRecord(state.orders, orderId)
  const candidates = records(order?.items).filter((item) => item.id).map((item) => ({ item, ...itemEligibility(state, order, item, 'return') }))
  const handoff = candidates.find(({ item, reason }) => Object.hasOwn(selected, item.id) && !reason)?.handoff
  const selections = Object.entries(selected).map(([orderItemId, choice]) => ({ orderItemId, ...choice }))
  const currency = order?.currency
  const subtotalCents = selections.reduce((sum, entry) => {
    const item = findRecord(order?.items, entry.orderItemId)
    return sum + (item ? Math.max(0, unitCents(item)) * Number(entry.quantity) : 0)
  }, 0)
  const estimate = returnEstimate(subtotalCents, handoffMethod)

  const { confirm, pending, error, clearError } = useConfirmation(
    () => transact((current, now) => requestReturn(current, now, { orderId, selections, handoffMethod, refundMethod })),
    onSuccess,
  )

  function toggle(id, checked) {
    setSelectionError('')
    const next = { ...selected }
    if (checked) next[id] = { quantity: '1', reason: '' }
    else delete next[id]
    if (!Object.keys(next).length) setHandoffMethod('')
    setSelected(next)
  }

  function updateLine(id, update) {
    setSelected((current) => ({ ...current, [id]: { ...current[id], ...update } }))
  }

  function showReview(event) {
    event.preventDefault()
    if (!selections.length) { setSelectionError('Select at least one available item to continue.'); return }
    if (handoff !== handoffMethod || selections.some((entry) => !candidates.some(({ item, quantity }) => item.id === entry.orderItemId && quantity >= Number(entry.quantity)))) {
      setSelectionError('Item availability has changed. Review your selection and handoff method.')
      return
    }
    setReview(true)
  }

  return <Dialog title={review ? 'Review return' : 'Start a return'} onClose={onClose} pending={pending}>
    {review ? <form className="dialog-body" onSubmit={confirm}>
      <p><strong>Order</strong> · {orderNumber(order)}</p>
      <ul className="review-items">
        {selections.map(({ orderItemId, quantity, reason }) => {
          const item = findRecord(order?.items, orderItemId)
          return <li key={orderItemId}>{item?.name || 'Order item'} · Quantity {quantity} · {label(reason)}
            {item && ' · ' + money(Math.max(0, unitCents(item)) * Number(quantity) / 100, currency)}</li>
        })}
      </ul>
      <div className="review-panel">
        <div><h3>Handoff method</h3><p>{label(handoffMethod)}</p></div>
        <div><h3>Refund method</h3><p>{label(refundMethod)}</p></div>
      </div>
      <ReturnQuote details={estimate} currency={currency} />
      {error && <p className="form-error" role="alert">{error}</p>}
      <DialogButtons onBack={() => { clearError(); setReview(false) }} submitLabel="Confirm return" pending={pending} />
    </form> : <form className="dialog-body" onSubmit={showReview}>
      <OrderChooser orders={state.orders} value={orderId} onChange={(value) => {
        setOrderId(value); setSelected({}); setHandoffMethod(''); setSelectionError('')
      }} />
      {order && <fieldset className="choices">
        <legend>Items to return</legend>
        {!candidates.length && <p className="muted">Item details are unavailable for this order.</p>}
        {candidates.map(({ item, quantity, reason, handoff: method }) => {
          const restriction = reason || (handoff && handoff !== method ? 'Start a separate request for items with a different handoff.' : '')
          const choice = Object.hasOwn(selected, item.id) ? selected[item.id] : null
          return <div className="item-choice" key={item.id}>
            <label className="check-label">
              <input type="checkbox" checked={Boolean(choice)} disabled={Boolean(restriction) && !choice}
                onChange={(event) => toggle(item.id, event.currentTarget.checked)} />
              <span>{item.name || 'Order item'}</span>
            </label>
            {restriction ? <p className="muted meta">{restriction}</p> : <p className="muted meta">{label(method)} · {quantity} available</p>}
            {choice && !restriction && <div className="return-line-fields">
              <QuantityField value={choice.quantity} limit={quantity} itemName={item.name} onChange={(value) => updateLine(item.id, { quantity: value })} />
              <SelectField title="Return reason" options={returnReasons} value={choice.reason}
                onChange={(value) => updateLine(item.id, { reason: value })} required placeholder="Choose a reason" />
            </div>}
          </div>
        })}
      </fieldset>}
      {selectionError && <p className="form-error" role="alert">{selectionError}</p>}
      {selections.length > 0 && <>
        <SelectField title="Handoff method" required placeholder="Choose a handoff" value={handoffMethod} onChange={setHandoffMethod}
          options={['drop_off', 'pickup'].map((method) => ({ value: method, label: label(method), disabled: handoff !== method }))} />
        <SelectField title="Refund method" options={refundMethods} value={refundMethod}
          onChange={setRefundMethod} required placeholder="Choose a refund method" />
      </>}
      <DialogButtons onBack={onClose} backLabel="Close" submitLabel="Review return" disabled={!order || !candidates.some(({ quantity }) => quantity > 0)} />
    </form>}
  </Dialog>
}
