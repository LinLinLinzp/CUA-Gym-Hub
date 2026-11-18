import { sampleCredit } from './data/seed'

export const records = (value) => Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') : []
export const ids = (value) => Array.isArray(value) ? value.filter((item) => typeof item === 'string') : []
export const find = (items, id) => id ? records(items).find((item) => item.id === id) : undefined
export const isAmount = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0
export const cents = (value) => Math.round(value * 100) / 100
export const money = (value) => isAmount(value) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value) : 'Unavailable'
export const dateLabel = (value) => {
  if (!value) return 'Unavailable'
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? 'Unavailable' : date.toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'UTC' })
}
export const today = () => new Date().toISOString().slice(0, 10)
export const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
export const actor = (state) => state.account?.id || 'account'
export function newId(prefix) {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${prefix}-${token}`
}
export const appPath = (app) => `/applications/${encodeURIComponent(app.id)}`
export const selectionPath = (app, selection) => `${appPath(app)}/selections/${encodeURIComponent(selection.id)}`
export const linked = (items, app, id) => records(items).find((item) => item.id === id && item.applicationId === app.id)
export const latestResult = (state, app) => linked(state.eligibilityResults, app, app.latestEligibilityResultId)
export const currentSelection = (state, app) => linked(state.planSelections, app, app.selectedPlanSelectionId)
export const byUpdated = (a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
export const matchingPlans = (state, app) => records(state.plans).filter((plan) => plan.id && Number(plan.coverageYear) === Number(app.coverageYear) && plan.stateCode === app.stateCode)
export const canShop = (result) => result?.status === 'eligible' && ids(result.eligibleMemberIds).length > 0
export const hasMatchingPlans = (state, app, result) => canShop(result) && matchingPlans(state, app).length > 0

export function pricing(plan, result) {
  const grossMonthlyPremium = isAmount(plan?.monthlyPremium) ? cents(plan.monthlyPremium) : undefined
  if (grossMonthlyPremium === undefined || !isAmount(result?.monthlyTaxCredit)) return { grossMonthlyPremium }
  const appliedMonthlyTaxCredit = Math.min(grossMonthlyPremium, cents(result.monthlyTaxCredit))
  return { grossMonthlyPremium, appliedMonthlyTaxCredit, netMonthlyPremium: cents(grossMonthlyPremium - appliedMonthlyTaxCredit) }
}

export function makeResult(app, income, trigger, createdAt, createdBy, incomeUpdateId) {
  const eligibleMemberIds = records(app.householdMembers).filter((member) => member.requestsCoverage && member.id).map((member) => member.id)
  return {
    id: newId('elig'), applicationId: app.id, trigger, coverageYear: Number(app.coverageYear),
    status: eligibleMemberIds.length ? 'eligible' : 'ineligible', eligibleMemberIds,
    annualIncomeEstimate: income.annualEstimate,
    monthlyTaxCredit: eligibleMemberIds.length ? sampleCredit(income.annualEstimate) : 0, createdAt, createdBy,
    ...(incomeUpdateId ? { incomeUpdateId } : {}),
  }
}

export function effectiveDate(coverageYear) {
  const now = new Date()
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  return nextMonth.getUTCFullYear() === Number(coverageYear) ? nextMonth.toISOString().slice(0, 10) : `${coverageYear}-01-01`
}

export const replaceApp = (state, app) => ({ ...state, applications: state.applications.map((item) => item?.id === app.id ? app : item) })
export const stateNames = Object.fromEntries('AL:Alabama|AK:Alaska|AZ:Arizona|AR:Arkansas|CA:California|CO:Colorado|CT:Connecticut|DE:Delaware|DC:District of Columbia|FL:Florida|GA:Georgia|HI:Hawaii|ID:Idaho|IL:Illinois|IN:Indiana|IA:Iowa|KS:Kansas|KY:Kentucky|LA:Louisiana|ME:Maine|MD:Maryland|MA:Massachusetts|MI:Michigan|MN:Minnesota|MS:Mississippi|MO:Missouri|MT:Montana|NE:Nebraska|NV:Nevada|NH:New Hampshire|NJ:New Jersey|NM:New Mexico|NY:New York|NC:North Carolina|ND:North Dakota|OH:Ohio|OK:Oklahoma|OR:Oregon|PA:Pennsylvania|RI:Rhode Island|SC:South Carolina|SD:South Dakota|TN:Tennessee|TX:Texas|UT:Utah|VT:Vermont|VA:Virginia|WA:Washington|WV:West Virginia|WI:Wisconsin|WY:Wyoming'.split('|').map((pair) => pair.split(':')))
export const stateName = (code) => stateNames[code] || code || 'Location unavailable'
export const marketLabel = (app) => [app.coverageYear, stateName(app.stateCode), app.zipCode].filter(Boolean).join(' · ')
export const statusText = (status) => ({
  draft: 'Draft', submitted: 'Submitted', eligible: 'Eligible', ineligible: 'Ineligible',
  confirmed: 'Confirmed', pending_first_premium: 'Pending first premium', replaced: 'Replaced',
})[status] || 'Status unavailable'

