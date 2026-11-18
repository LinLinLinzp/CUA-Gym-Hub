import { cents, isPayable, list, newId } from './model.js'

export const invoiceTotal = invoices => invoices.reduce((sum, item) => sum + cents(Number(item.total)), 0) / 100

export function releasePayment(ids) {
  return (state, { actor, at }) => {
    const requested = new Set(ids)
    const invoices = list(state.invoices)
    const selected = invoices.filter(item => requested.has(item.id))
    if (!selected.length || selected.length !== requested.size || selected.some(item => !isPayable(item))) {
      return { error: 'One or more selected invoices are no longer payable.' }
    }
    const currency = selected[0].currency
    if (selected.some(item => item.currency !== currency)) return { error: 'Select invoices in a single currency.' }
    const amount = invoiceTotal(selected)
    if (!Number.isSafeInteger(cents(amount))) return { error: 'The selected total exceeds the supported payment amount.' }
    const id = newId('pay')
    const payment = {
      id, invoiceIds: selected.map(item => item.id),
      allocations: selected.map(item => ({ invoiceId: item.id, workerId: item.workerId ?? null, amount: cents(Number(item.total)) / 100 })),
      amount, currency, method: 'studio_balance', status: 'processing', createdBy: actor, createdAt: at,
    }
    return {
      changes: {
        invoices: invoices.map(item => requested.has(item.id) ? { ...item, status: 'processing', paymentId: id, updatedAt: at } : item),
        payments: [...list(state.payments), payment],
      },
      event: { action: 'payment.released', entityType: 'payment', entityId: id, relatedIds: payment.invoiceIds },
      id, message: 'Payment released.',
    }
  }
}
