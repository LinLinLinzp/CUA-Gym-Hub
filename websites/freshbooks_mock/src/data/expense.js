import { event, newId, requireThat, stamp, upsert } from './commands.js'
import { linkedInvoice } from './time.js'
import { cents, currencies, find, today, validDate, visible } from '../utils/format.js'

export const uncategorized = 'cat_uncategorized'
export function expenseForm(state, expense, duplicate) {
  return {
    merchant: expense?.merchant || '', categoryId: expense?.categoryId || uncategorized,
    expenseDate: duplicate ? today() : expense?.expenseDate || today(), description: expense?.description || '',
    currency: expense?.currency || state.business?.currency || 'USD', total: expense?.total ?? '',
    taxes: (expense?.taxes || []).map(tax => ({ ...tax })), clientId: duplicate ? '' : expense?.clientId || '',
    projectId: duplicate ? '' : expense?.projectId || '', billable: !duplicate && Boolean(expense?.billable),
    markupPercent: duplicate ? 0 : expense?.markupPercent || 0,
    includeReceiptOnInvoice: !duplicate && Boolean(expense?.includeReceiptOnInvoice), receipt: duplicate ? null : expense?.receipt || null,
  }
}
export function validateExpense(state, form, id) {
  const old = find(state.expenses, id)
  requireThat(!id || (old && !visible(old, 'deleted')), 'This expense is unavailable for editing.')
  const merchant = String(form.merchant || '').trim()
  const total = cents(form.total)
  requireThat(merchant, 'Enter a merchant.')
  requireThat(validDate(form.expenseDate), 'Choose an expense date.')
  requireThat(Number.isFinite(total) && total > 0, 'Enter a gross total greater than zero.')
  requireThat(currencies.includes(form.currency), 'Choose a valid currency.')
  const taxes = (form.taxes || []).map(tax => {
    requireThat(Number(tax.amount) >= 0 && Number.isFinite(Number(tax.amount)), 'Enter nonnegative tax amounts.')
    return { name: tax.name?.trim() || 'Sales Tax', percent: tax.percent ?? null, amount: cents(tax.amount) / 100 }
  })
  requireThat(taxes.reduce((sum, row) => sum + cents(row.amount), 0) <= total, 'Total tax cannot exceed the gross total.')
  const clientId = form.clientId || null, projectId = form.projectId || null
  requireThat(!clientId || find(state.clients, clientId) || old?.clientId === clientId, 'Choose an available client.')
  requireThat(!projectId || find(state.projects, projectId)?.clientId === clientId || (old?.projectId === projectId && old?.clientId === clientId), 'Choose a project belonging to the client.')
  requireThat(!form.billable || clientId, 'Choose a client for a billable expense.')
  const markupPercent = form.billable ? Number(form.markupPercent) : 0
  requireThat(Number.isFinite(markupPercent) && markupPercent >= 0, 'Enter a nonnegative markup percentage.')
  const locked = linkedInvoice(state, old?.invoiceId)
  requireThat(!locked || (old.clientId === clientId && (old.projectId || null) === projectId && old.currency === form.currency && Boolean(old.billable) === Boolean(form.billable)),
    'Keep the billing assignment and currency while this expense is linked to an invoice.')
  return { ...form, merchant, total: total / 100, taxes, clientId, projectId, markupPercent, includeReceiptOnInvoice: Boolean(form.billable && form.includeReceiptOnInvoice), categoryId: form.categoryId || uncategorized }
}
export function saveExpense(state, form, { id, duplicate } = {}) {
  const fields = validateExpense(state, form, id)
  const old = find(state.expenses, id)
  const invoiceId = linkedInvoice(state, old?.invoiceId) ? old.invoiceId : null
  const item = {
    ...old, ...fields, ...stamp(state, old), id: old?.id || newId('exp'), description: String(form.description || '').trim(),
    source: old?.source || 'manual', billable: Boolean(fields.billable), status: invoiceId ? 'billed' : fields.billable ? 'unbilled' : 'non_billable',
    invoiceId, receipt: fields.receipt || null, visibility: old?.visibility || 'active',
  }
  return event({ ...state, expenses: upsert(state.expenses, item) }, id ? 'expense.updated' : duplicate ? 'expense.duplicated' : 'expense.created',
    'expense', item.id, [item.categoryId, item.clientId, item.projectId, item.invoiceId, duplicate])
}
export function changeExpenses(state, ids, operation, value) {
  const selected = state.expenses.filter(row => ids.includes(row.id) && (operation === 'category' ? row.categoryId !== value && !visible(row, 'deleted') : !visible(row, value)))
  if (!selected.length) return state
  if (operation !== 'category' && value !== 'active') requireThat(selected.every(row => !visible(row, 'deleted') && !linkedInvoice(state, row.invoiceId)), 'Release the expenses from their invoices before moving them.')
  if (operation === 'category') requireThat(value === uncategorized || find(state.expenseCategories, value)?.active !== false && find(state.expenseCategories, value), 'Choose an available category.')
  const changed = new Set(selected.map(row => row.id))
  return event({ ...state, expenses: state.expenses.map(row => changed.has(row.id)
    ? { ...row, ...stamp(state, row), ...(operation === 'category' ? { categoryId: value } : { visibility: value }) } : row) },
  'expense.' + (operation === 'category' ? 'category_changed' : value === 'active' ? 'restored' : value), 'expense', selected[0].id,
  [...changed, operation === 'category' ? value : null, ...selected.flatMap(row => [row.clientId, row.projectId, row.invoiceId])])
}
