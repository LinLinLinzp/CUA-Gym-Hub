export const list = value => Array.isArray(value) ? value : []
export const find = (items, id) => list(items).find(item => item.id === id)
export const money = value => Number.isFinite(value) ? dollars.format(value) : 'Unavailable'
const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
export const date = value => {
  const parsed = new Date(typeof value === 'string' && value.length === 10 ? value + 'T00:00:00' : value ?? NaN)
  return Number.isNaN(parsed.getTime()) ? 'Unavailable' : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
export const words = value => value ? String(value).replaceAll('_', ' ').replace(/^./, first => first.toUpperCase()) : 'Unavailable'
export const yearLabel = value => value ? String(value).replace('-', '–') : 'Award year unavailable'
export const balance = loan => number(loan.principalBalance) + number(loan.accruedInterest)
export const number = value => Number.isFinite(value) ? value : 0
export const cents = value => Math.round((value + Number.EPSILON) * 100) / 100
export const totals = loans => {
  const principalBalance = cents(loans.reduce((sum, loan) => sum + number(loan.principalBalance), 0))
  const accruedInterest = cents(loans.reduce((sum, loan) => sum + number(loan.accruedInterest), 0))
  return { principalBalance, accruedInterest, totalBalance: cents(principalBalance + accruedInterest) }
}
export const draft = record => ['draft', 'in_progress'].includes(record.status)
export const supportedYears = ['2026-27', '2025-26', '2024-25', '2023-24', '2022-23', '2021-22', '2020-21', '2019-20', '2018-19']
export const formGroup = record => record.groupId || record.awardYear || record.id
export const editions = forms => [...forms].sort((a, b) => number(b.revision) - number(a.revision) || latest(a, b))
export const latest = (a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''))
export function currentForms(forms) {
  const current = new Map()
  for (const form of editions(forms)) {
    const key = form.awardYear || formGroup(form)
    if (!current.has(key)) current.set(key, form)
  }
  return [...current.values()].sort((a, b) => String(b.awardYear || '').localeCompare(String(a.awardYear || '')))
}
export const personName = profile => [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'My account'
export const idPath = (base, id) => base + '/' + encodeURIComponent(id)
export function createRecordId(prefix) {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16))
  const suffix = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  return prefix + '-' + suffix
}
export const activeLoan = loan => balance(loan) > 0 && loan.status !== 'paid_in_full'
export const validIncome = value => value !== '' && value != null && Number.isFinite(Number(value)) && Number(value) >= 0
export const validSize = value => value !== '' && Number.isInteger(Number(value)) && Number(value) >= 1
export const matches = (query, ...fields) => fields.some(value => String(value ?? '').toLowerCase().includes(query.trim().toLowerCase()))
export const loanName = loan => words(loan?.type)
export function eligible(plan, loans) {
  if (!loans.length) return 'Select at least one active loan.'
  if (list(plan.eligibleLoanTypes).length && loans.some(loan => !plan.eligibleLoanTypes.includes(loan.type))) {
    return 'One or more selected loan types are outside this plan’s eligible types.'
  }
  if (plan.eligibleDisbursedBefore && loans.some(loan => !loan.disbursedOn || loan.disbursedOn >= plan.eligibleDisbursedBefore)) {
    return 'One or more loans lack a qualifying disbursement date.'
  }
  if (!Number.isFinite(plan.termMonths) || plan.termMonths <= 0 || !['amortized', 'income_share'].includes(plan.estimator)) {
    return 'Estimate terms are unavailable for this plan.'
  }
  return ''
}
export function estimate(plan, loans, inputs) {
  const base = { planId: plan.id, planName: plan.name || 'Plan unavailable' }
  const ineligibleReason = eligible(plan, loans)
  if (ineligibleReason) return { ...base, eligible: false, ineligibleReason }
  const { termMonths } = plan
  const { totalBalance } = totals(loans)
  const unroundedBalance = loans.reduce((sum, loan) => sum + balance(loan), 0)
  const monthlyRate = loans.reduce((sum, loan) => sum + balance(loan) * number(loan.interestRate), 0) / unroundedBalance / 1200
  const allowance = number(plan.incomeAllowance) + (inputs.familySize - 1) * number(plan.familySizeAllowance)
  const fixed = monthlyRate > 0 ? totalBalance * monthlyRate / (1 - (1 + monthlyRate) ** -termMonths) : totalBalance / termMonths
  const payment = plan.estimator === 'income_share' ? Math.max(0, inputs.annualIncome - allowance) * number(plan.incomeShare) / 12 : fixed
  return { ...base, eligible: true, monthlyPayment: cents(payment), totalPaid: cents(payment * termMonths), termMonths }
}
