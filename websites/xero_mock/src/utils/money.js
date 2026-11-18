export const round2 = x => Math.round((Number(x || 0) + Number.EPSILON) * 100) / 100;
export const fmtMoney = n => Number(n || 0).toLocaleString('en-GB', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
export const fmtGBP = n => `£${fmtMoney(n)}`;
export const iso = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const todayISO = () => iso(new Date());
export const fmtDate = d => d ? new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
}) : '—';
export const addDays = (d, n) => {
  const t = new Date(`${d}T12:00:00`);
  t.setDate(t.getDate() + Number(n));
  return iso(t);
};
export const dueDateFromTerms = (d, terms = {
  day: 30,
  type: 'DAYSAFTERBILLDATE'
}) => {
  if (!terms) terms = {
    day: 30,
    type: 'DAYSAFTERBILLDATE'
  };
  const t = new Date(`${d}T12:00:00`),
    day = Number(terms.day || 0);
  if (terms.type === 'DAYSAFTERBILLMONTH') {
    t.setMonth(t.getMonth() + 1, 0);
    return addDays(iso(t), day);
  }
  if (terms.type === 'OFFOLLOWINGMONTH') {
    t.setMonth(t.getMonth() + 1, day);
    return iso(t);
  }
  if (terms.type === 'OFCURRENTMONTH') {
    t.setDate(day);
    return iso(t);
  }
  return addDays(d, day);
};
export function calcLine(line, mode = 'Exclusive', rates = []) {
  const rate = Number(rates.find(r => r.taxType === line.taxType)?.rate || 0),
    lineAmount = round2(Number(line.quantity ?? 1) * Number(line.unitAmount || 0) * (1 - Number(line.discountRate || 0) / 100)),
    taxAmount = mode === 'NoTax' ? 0 : round2(mode === 'Inclusive' ? lineAmount - lineAmount / (1 + rate / 100) : lineAmount * rate / 100);
  return {
    ...line,
    quantity: Number(line.quantity ?? 1),
    unitAmount: Number(line.unitAmount || 0),
    discountRate: Number(line.discountRate || 0),
    taxType: mode === 'NoTax' ? 'NONE' : line.taxType,
    lineAmount,
    taxAmount
  };
}
export function calcDocumentTotals(doc, rates = []) {
  const lineItems = (doc.lineItems || []).map(l => calcLine(l, doc.lineAmountTypes, rates)),
    sum = round2(lineItems.reduce((s, l) => s + l.lineAmount, 0)),
    totalTax = round2(lineItems.reduce((s, l) => s + l.taxAmount, 0)),
    subTotal = doc.lineAmountTypes === 'Inclusive' ? round2(sum - totalTax) : sum,
    total = doc.lineAmountTypes === 'Inclusive' ? sum : round2(subTotal + totalTax);
  return {
    lineItems,
    subTotal,
    totalTax,
    total,
    amountDue: round2(total - Number(doc.amountPaid || 0) - Number(doc.amountCredited || 0))
  };
}
