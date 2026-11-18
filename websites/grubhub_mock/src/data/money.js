export function cents(value) {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return null
  const result = Math.round(Number(value) * 100)
  return Number.isSafeInteger(result) && result >= 0 ? result : null
}

export function allocate(total, weights) {
  const subtotal = weights.reduce((sum, value) => sum + value, 0)
  if (!subtotal) return weights.map(() => 0)
  const shares = weights.map((weight, index) => {
    const numerator = BigInt(total) * BigInt(weight)
    return { index, base: Number(numerator / BigInt(subtotal)), remainder: Number(numerator % BigInt(subtotal)) }
  })
  const remaining = total - shares.reduce((sum, share) => sum + share.base, 0)
  const ranked = [...shares].sort((a, b) => b.remainder - a.remainder || a.index - b.index)
  for (const share of ranked.slice(0, remaining)) share.base += 1
  return shares.map(share => share.base)
}

export function unitAmount(charged, quantity, used, count) {
  const extra = Math.max(0, Math.min(count, charged % quantity - used))
  return Math.floor(charged / quantity) * count + extra
}

export function totalsFor(items, restaurant, tip = 0) {
  const subtotal = items.reduce((sum, item) => sum + (cents(item.unitPrice) ?? 0) * item.quantity, 0)
  const deliveryFee = cents(restaurant?.deliveryFee) ?? 0
  const serviceFee = cents(restaurant?.serviceFee) ?? 0
  const tax = Math.round(subtotal * Math.max(0, Number(restaurant?.taxRate) || 0))
  return {
    subtotal: subtotal / 100, deliveryFee: deliveryFee / 100, serviceFee: serviceFee / 100,
    tax: tax / 100, tip: tip / 100, total: (subtotal + deliveryFee + serviceFee + tax + tip) / 100,
  }
}

export function receiptItems(id, items, totals) {
  const subtotals = items.map(item => cents(item.unitPrice) * item.quantity)
  const charges = allocate(cents(totals.total), subtotals)
  return items.map((item, index) => ({
    id: `${id}-line-${String(index + 1).padStart(2, '0')}`,
    ...item,
    unitPrice: cents(item.unitPrice) / 100,
    subtotal: subtotals[index] / 100,
    chargedAmount: charges[index] / 100,
  }))
}
