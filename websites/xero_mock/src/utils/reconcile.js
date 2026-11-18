import { bankItems } from './ledger.js';
import { round2 } from './money.js';
export const statementBalance = (state, id) => round2(Number((state.bankAccounts || []).find(b => b.id === id)?.openingStatementBalance || 0) + (state.bankStatementLines || []).filter(l => l.bankAccountId === id && l.status !== 'deleted').reduce((s, l) => s + Number(l.amount || 0), 0));
export const unreconciledCount = (state, id) => (state.bankStatementLines || []).filter(l => (!id || l.bankAccountId === id) && l.status === 'unreconciled').length;
export function candidatesFor(state, line) {
  const positive = line.amount > 0;
  return [...bankItems(state, line.bankAccountId).filter(i => !i.isReconciled && i.signedAmount > 0 === positive).map(i => ({
    ...i,
    amount: Math.abs(i.signedAmount),
    name: i.description
  })), ...(state[positive ? 'invoices' : 'bills'] || []).filter(d => d.status === 'AUTHORISED' && d.amountDue > 0).map(d => ({
    ...d,
    kind: positive ? 'invoice' : 'bill',
    name: (state.contacts || []).find(c => c.id === d.contactId)?.name || d.contactName || '(Unknown contact)',
    amount: d.amountDue,
    path: `/${positive ? 'invoices' : 'bills'}/${d.id}`
  }))];
}
const clean = s => String(s || '').toLowerCase().replace(/\bltd\b/g, '').replace(/[^a-z0-9]/g, '');
export function suggestionFor(state, line) {
  return candidatesFor(state, line).filter(c => round2(c.amount) === Math.abs(line.amount)).map(c => {
    const ref = clean(c.invoiceNumber || c.reference),
      name = clean(c.name),
      payee = clean(line.payee);
    return {
      ...c,
      score: (ref && clean(line.reference).includes(ref) ? 3 : 0) + (name && (payee.includes(name) || name.includes(payee)) ? 2 : 0) + (Math.abs(new Date(c.date) - new Date(line.date)) <= 14 * 86400000 ? 1 : 0)
    };
  }).sort((a, b) => b.score - a.score)[0] || null;
}
export function ruleFor(state, line) {
  return (state.bankRules || []).find(r => r.status !== 'DELETED' && r.status !== 'ARCHIVED' && (!r.bankAccountId || r.bankAccountId === line.bankAccountId) && (r.type === (line.amount < 0 ? 'SPEND' : 'RECEIVE') || r.type === 'TRANSFER') && (r.conditions || []).length > 0 && (r.matchAll !== false ? r.conditions.every(c => matches(c, line)) : r.conditions.some(c => matches(c, line)))) || null;
}
function matches(condition, line) {
  const a = String(line[condition.field] ?? '').toLowerCase(),
    b = String(condition.value ?? '').toLowerCase();
  if (!b) return false;
  return condition.operator === 'equals' ? a === b : condition.operator === 'startsWith' ? a.startsWith(b) : a.includes(b);
}
