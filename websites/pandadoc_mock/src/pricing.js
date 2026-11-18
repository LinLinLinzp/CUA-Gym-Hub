export const items = value => Array.isArray(value) ? value : []
export const cents = value => Math.round((value + Number.EPSILON) * 100) / 100
export const emptyAdjustment = () => ({ type: 'percent', value: 0 })

function adjustmentAmount(adjustment, base) {
  const value = Number(adjustment?.value || 0)
  return cents(adjustment?.type === 'fixed' ? value : base * (value / 100))
}

export function calculateTable(table) {
  const lineItems = items(table.lineItems).map(item => {
    const selected = !item.optional || item.selected !== false
    return { ...item, selected, lineTotal: selected ? cents((Number(item.unitPrice) || 0) * (Number(item.quantity) || 0)) : 0 }
  })
  const subtotal = cents(lineItems.reduce((sum, item) => sum + item.lineTotal, 0))
  const discountAmount = Math.min(subtotal, adjustmentAmount(table.discount, subtotal))
  const taxAmount = adjustmentAmount(table.tax, cents(subtotal - discountAmount))
  return { ...table, lineItems, subtotal, discountAmount, taxAmount, total: cents(subtotal - discountAmount + taxAmount) }
}

export const documentValue = tables => cents(items(tables).reduce((sum, table) => sum + Number(table.total || 0), 0))

export function validateTable(table) {
  if (!table.name?.trim()) throw new Error('Enter a pricing table name.')
  if (!items(table.lineItems).length) throw new Error('Add at least one item to the pricing table.')
  for (const row of table.lineItems) {
    if (!row.name?.trim()) throw new Error('Enter a name for every item.')
    if (String(row.unitPrice).trim() === '' || !Number.isFinite(cents(Number(row.unitPrice))) || Number(row.unitPrice) < 0) {
      throw new Error('Enter a nonnegative unit price for each item.')
    }
    if (!Number.isSafeInteger(Number(row.quantity)) || Number(row.quantity) < 1) {
      throw new Error('Enter a positive whole quantity for each item.')
    }
  }
  for (const adjustment of [table.discount, table.tax]) {
    const value = Number(adjustment?.value ?? 0)
    if (!Number.isFinite(value) || value < 0 || (adjustment?.type !== 'fixed' && value > 100)) {
      throw new Error('Enter a nonnegative adjustment. Percentages must be 100 or less.')
    }
  }
  const result = calculateTable({
    ...table, name: table.name.trim(),
    discount: { ...emptyAdjustment(), ...table.discount, value: Number(table.discount?.value || 0) },
    tax: { ...emptyAdjustment(), ...table.tax, value: Number(table.tax?.value || 0) },
    lineItems: table.lineItems.map(row => ({ ...row, name: row.name.trim(), unitPrice: cents(Number(row.unitPrice)), quantity: Number(row.quantity) })),
  })
  if (!Number.isFinite(result.total)) throw new Error('The pricing total is too large.')
  return result
}

export const pricingSnapshot = tables => items(tables).map(table => ({
  tableId: table.id, total: table.total,
  lineItems: items(table.lineItems).map(row => ({
    lineItemId: row.id, selected: !row.optional || row.selected !== false, quantity: row.quantity, lineTotal: row.lineTotal,
  })),
}))
