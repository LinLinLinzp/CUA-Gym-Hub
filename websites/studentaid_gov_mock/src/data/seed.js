import { activeLoan, cents, estimate, totals } from '../domain.js'

const schoolNames = [
  ['pine-ridge','Pine Ridge State University','Cedar Falls','IA'], ['larkspur','Larkspur Valley College','Boulder','CO'],
  ['harbor-point','Harbor Point Technical College','Baltimore','MD'], ['redwood-bay','Redwood Bay University','Eureka','CA'],
  ['eastern-prairie','Eastern Prairie State College','Lincoln','NE'], ['cedar-sound','Cedar Sound University','Olympia','WA'],
  ['lake-elm','Lake Elm Community College','Duluth','MN'], ['north-fork','North Fork Polytechnic','Boise','ID'],
  ['blue-heron','Blue Heron State University','Savannah','GA'], ['granite-hill','Granite Hill College','Concord','NH'],
  ['rivergate','Rivergate Community College','Louisville','KY'], ['sunstone','Sunstone Institute of Technology','Mesa','AZ'],
  ['west-falls','West Falls University','Missoula','MT'], ['briarfield','Briarfield College','Richmond','VA'],
  ['golden-mesa','Golden Mesa State College','Santa Fe','NM'], ['clearwater','Clearwater Valley University','Tampa','FL'],
  ['sycamore','Sycamore Plains College','Springfield','IL'], ['marsh-creek','Marsh Creek State University','Raleigh','NC'],
  ['windward','Windward Point College','Portland','ME'], ['juniper','Juniper Summit University','Bend','OR'],
  ['copper-river','Copper River State College','Anchorage','AK'], ['maple-bridge','Maple Bridge College','Burlington','VT'],
  ['cypress','Cypress Bend University','Baton Rouge','LA'], ['quartz','Quartz Lake Technical College','Madison','WI'],
  ['silver-sage','Silver Sage College','Reno','NV'], ['willow-park','Willow Park University','Columbus','OH'],
  ['sagebrush','Sagebrush State University','Provo','UT'], ['meadowbrook','Meadowbrook College','Hartford','CT'],
  ['oak-ferry','Oak Ferry Community College','Wilmington','DE'], ['mission-heights','Mission Heights University','San Antonio','TX'],
]
const iso = (year, month = '09', day = '18') => year + '-' + month + '-' + day + 'T15:00:00.000Z'
const pad = (number, length = 2) => String(number).padStart(length, '0')
const actorId = 'person-avery'

export function createInitialData() {
  const profile = { id: actorId, firstName: 'Avery', lastName: 'Morgan', email: 'avery.morgan@example.test', state: 'MD' }
  const schools = schoolNames.map(([id, name, city, state], i) => ({ id: 'school-' + id, name, city, state, federalSchoolCode: pad(9901 + i, 6) }))
  const servicers = [
    { id: 'servicer-edfinancial', name: 'Edfinancial', phone: '800-555-0104', mailingAddress: 'PO Box 410, Sample City, MD 20000' },
    { id: 'servicer-nelnet', name: 'Nelnet', phone: '800-555-0105', mailingAddress: 'PO Box 712, Sample City, NE 68000' },
    { id: 'servicer-aidvantage', name: 'Aidvantage', phone: '800-555-0106' },
  ]
  const aidTypes = ['direct_subsidized', 'direct_unsubsidized', 'direct_grad_plus', 'direct_consolidation']
  const loans = Array.from({ length: 24 }, (_, i) => {
    const year = 2015 + Math.floor(i / 3)
    const paid = i < 7
    const originalAmount = 3600 + i * 250
    return {
      id: 'loan-' + pad(i + 1, 3), schoolId: schools[Math.floor(i / 8)].id,
      servicerId: servicers[i % servicers.length].id,
      type: i < 15 ? aidTypes[i % 2] : aidTypes[1 + (i % 3)],
      status: paid ? 'paid_in_full' : i % 7 === 0 ? 'deferment' : i % 11 === 0 ? 'forbearance' : 'in_repayment',
      disbursedOn: year + '-' + ['01-17', '05-20', '08-24'][i % 3],
      originalAmount, principalBalance: paid ? 0 : originalAmount - 1320 + i * 3.5,
      accruedInterest: paid ? 0 : cents(18.50 + i * 2.85), interestRate: 3.75 + (i % 8) * 0.25,
      planId: i % 5 === 0 ? 'ibr' : 'standard',
      ...(paid ? {} : { nextPaymentDueOn: '2026-12-07', nextPaymentAmount: 40 + i * 3.5 }),
      ...(i % 5 === 0 && !paid ? { recertificationDueOn: '2027-02-15' } : {}),
    }
  })
  const repaymentPlans = [
    { id: 'standard', name: 'Standard Repayment', category: 'fixed', description: 'Fixed payments over a 10-year sample term.', termMonths: 120, eligibleLoanTypes: aidTypes, estimator: 'amortized' },
    { id: 'ibr', name: 'Income-Based Repayment', category: 'income_driven', description: 'Payments estimated using household size and income.', termMonths: 240, eligibleLoanTypes: aidTypes, estimator: 'income_share', incomeShare: 0.10, incomeAllowance: 15000, familySizeAllowance: 4500 },
    { id: 'paye', name: 'Pay As You Earn', category: 'income_driven', description: 'Sample income-driven option for certain direct loans.', termMonths: 240, eligibleLoanTypes: aidTypes.slice(0, 2), eligibleDisbursedBefore: '2026-07-01', estimator: 'income_share', incomeShare: 0.10, incomeAllowance: 18000, familySizeAllowance: 5200 },
    { id: 'extended', name: 'Extended Fixed Repayment', category: 'fixed', description: 'Fixed payments over a longer sample term.', termMonths: 300, eligibleLoanTypes: aidTypes, estimator: 'amortized' },
  ]
  const fafsaForms = [2, 3, 4, 2, 3, 4, 3, 3].flatMap((count, index) => {
    const year = 2018 + index
    const awardYear = year + '-' + String(year + 1).slice(-2)
    const groupId = 'fafsa-' + awardYear
    return Array.from({ length: count }, (_, i) => {
      const revision = i + 1
      const timestamp = iso(year, pad(3 + i), '12')
      const pending = year === 2024 && revision === count
      const status = pending ? 'draft' : revision === count || year >= 2024 ? 'processed' : 'closed'
      return {
        id: groupId + '-' + pad(revision), groupId, awardYear, revision,
        ...(i ? { previousFormId: groupId + '-' + pad(i) } : {}),
        status, actorId, createdAt: timestamp, updatedAt: timestamp, lastSavedStep: pending ? 'schools' : 'review',
        answers: {
          studentName: 'Avery Morgan', state: 'MD', dependencyStatus: year < 2021 ? 'dependent' : 'independent',
          annualIncome: 21500 + index * 2850, householdSize: year < 2021 ? 4 : 2, taxConsent: true,
          ...(pending ? {} : { signedAt: timestamp }),
        },
        schoolIds: [schools[index % 3].id, schools[10 + i].id],
        contributors: year < 2021 ? [{ id: groupId + '-parent', role: 'parent', name: 'Jordan Morgan', status: 'signed', consent: true, signedAt: timestamp }] : [],
        ...(pending ? {} : { submittedAt: timestamp }),
        ...(status === 'processed' ? {
          processedAt: timestamp, summary: { studentAidIndex: 1250 + index * 70, pellGrantEstimate: 3645, directLoanEstimate: 5500, nextSteps: ['Review any requests from your school’s financial aid office.'] },
        } : {}),
      }
    })
  })
  const eligibleLoans = loans.filter(activeLoan)
  const loanAcknowledgments = ['2023-24', '2024-25', '2025-26'].map((awardYear, index) => {
    const selected = eligibleLoans.filter(loan => loan.disbursedOn < (2022 + index) + '-09-01')
    const signedAt = iso(2023 + index, '07', '10')
    return { id: 'ack-' + awardYear, awardYear, status: 'completed', loanIds: selected.map(loan => loan.id), loanCount: selected.length, ...totals(selected), actorId, signedAt, createdAt: signedAt }
  })
  const names = ['Lower monthly payment', 'Pay off sooner', 'Graduate loan budget', 'Household budget', 'Standard plan review', 'Income change', 'Longer term estimate', 'Consolidated loans']
  const repaymentScenarios = Array.from({ length: 24 }, (_, i) => {
    const selected = eligibleLoans.slice(i % 10, i % 10 + 1 + i % 4)
    const inputs = { annualIncome: 31500 + i * 1250, familySize: 1 + i % 4 }
    return {
      id: 'scenario-' + pad(i + 1, 3), name: names[i % names.length] + ' · ' + (2024 + Math.floor(i / 8)),
      status: 'saved', loanIds: selected.map(loan => loan.id), loanCount: selected.length, inputs,
      estimates: repaymentPlans.map(plan => estimate(plan, selected, inputs)), actorId,
      createdAt: iso(2024 + Math.floor(i / 8), pad(1 + i % 8)),
    }
  })
  const repaymentRequests = repaymentScenarios.map((scenario, i) => {
    const loan = loans.find(entry => entry.id === scenario.loanIds[0])
    const status = i < 20 ? (i % 5 === 0 ? 'canceled' : 'completed') : ['completed', 'action_required', 'draft', 'in_review'][i - 20]
    return {
      id: 'request-' + pad(i + 1, 3), status, planId: 'ibr', loanIds: [loan.id], servicerId: loan.servicerId, scenarioId: scenario.id,
      requestType: ['enter_plan', 'change_plan', 'recertify', 'recalculate'][i % 4],
      inputs: { ...scenario.inputs, incomeConsent: status !== 'draft' }, lastSavedStep: status === 'draft' ? 'income' : 'review',
      actorId, createdAt: scenario.createdAt, updatedAt: scenario.createdAt,
      ...(status === 'draft' ? {} : { signedAt: scenario.createdAt, submittedAt: scenario.createdAt }),
    }
  })
  return { profile, schools, fafsaForms, servicers, loans, loanAcknowledgments, repaymentPlans, repaymentScenarios, repaymentRequests }
}
