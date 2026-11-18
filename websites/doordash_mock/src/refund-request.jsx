import React, { useState } from 'react'
import { useAccount } from './store.jsx'
import { byId, ensure, list, merchantName, newId, refundPath, validQuantity } from './model.js'
import { Confirm, QuantityField, money, useSessionNavigate } from './ui.jsx'

export const reasons = { missing_item: 'Missing item', incorrect_item: 'Incorrect item' }
export const methods = { original_payment: 'Original payment method', doordash_credit: 'DoorDash credit' }

export function refundableLines(state, order) {
  const reserved = new Map()
  for (const refund of list(state.refunds)) {
    if (refund.orderId !== order.id || !['requested', 'issued'].includes(refund.status)) continue
    for (const line of list(refund.items)) {
      reserved.set(line.orderItemId, (reserved.get(line.orderItemId) || 0) + Math.max(0, Number(line.quantity) || 0))
    }
  }
  return list(order.items)
    .filter((line) => line.id && validQuantity(line.quantity) && validQuantity(line.unitPriceCents))
    .map((line) => ({ ...line, remaining: line.quantity - (reserved.get(line.id) || 0) }))
    .filter((line) => line.remaining > 0)
}

export function RefundRequest({ order, lines, close }) {
  const { commit } = useAccount()
  const navigate = useSessionNavigate()
  const [reason, setReason] = useState('missing_item')
  const [method, setMethod] = useState('original_payment')
  const [note, setNote] = useState('')
  const [counts, setCounts] = useState({})
  const total = lines.reduce((sum, line) => sum + (Number(counts[line.id]) || 0) * line.unitPriceCents, 0)
  const anySelected = lines.some((line) => Number(counts[line.id]) > 0)

  async function request() {
    let refund
    await commit((state, now) => {
      const current = byId(state.orders, order.id)
      ensure(current?.status === 'delivered' && state.account?.id, 'This order is no longer eligible for a refund.')
      ensure(Object.hasOwn(reasons, reason) && Object.hasOwn(methods, method), 'Select a reason and a refund method.')
      const available = refundableLines(state, current)
      const items = []
      for (const [lineId, count] of Object.entries(counts)) {
        const quantity = Number(count)
        ensure(count !== '' && validQuantity(quantity), 'Enter a whole quantity for each item.')
        if (!quantity) continue
        const line = byId(available, lineId)
        ensure(line && quantity <= line.remaining, 'One or more quantities are already covered by a refund. Review the available quantities.')
        items.push({ orderItemId: line.id, name: line.name || 'Item', quantity, amountCents: quantity * line.unitPriceCents })
      }
      ensure(items.length, 'Choose at least one affected item.')
      refund = {
        id: newId('RF'), orderId: current.id, merchantName: merchantName(state, current), createdBy: state.account.id,
        createdAt: now, status: 'requested', reason, method, ...(note.trim() && { note: note.trim() }),
        items, totalCents: items.reduce((sum, line) => sum + line.amountCents, 0),
      }
      return { ...state, refunds: [...list(state.refunds), refund] }
    }, 'Refund request submitted.')
    navigate(refundPath(refund.id))
  }

  return <Confirm title="Get help with this order" submitLabel="Request refund" onClose={close} onConfirm={request} disabled={!anySelected}>
    {lines.length ? <>
      <label className="field">What went wrong?
        <select value={reason} onChange={(event) => setReason(event.target.value)}>
          {Object.entries(reasons).map(([id, text]) => <option key={id} value={id}>{text}</option>)}
        </select>
      </label>
      <fieldset>
        <legend>Affected items</legend>
        <ul className="line-list">
          {lines.map((line) => <li className="line-item" key={line.id}>
            <span className="wrap"><strong>{line.name || 'Item'}</strong><small>{line.remaining} available · {money(line.unitPriceCents)} each</small></span>
            <QuantityField label={(line.name || 'Item') + ' affected quantity'} value={counts[line.id] ?? '0'} max={line.remaining}
              onChange={(value) => setCounts({ ...counts, [line.id]: value })} />
          </li>)}
        </ul>
      </fieldset>
      <label className="field">Refund method
        <select value={method} onChange={(event) => setMethod(event.target.value)}>
          {Object.entries(methods).map(([id, text]) => <option key={id} value={id}>{text}</option>)}
        </select>
      </label>
      <label className="field">Note (optional)<textarea rows="2" maxLength="500" value={note} onChange={(event) => setNote(event.target.value)} /></label>
      <p>Requested amount <strong>{money(total)}</strong></p>
    </> : <p>There are no refundable quantities remaining on this receipt.</p>}
  </Confirm>
}
