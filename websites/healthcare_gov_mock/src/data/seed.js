const account = { id: 'acct-avery', fullName: 'Avery Morgan', email: 'avery.morgan@example.test' }
const markets = [
  [2027, 'NC', '27601'], [2027, 'AZ', '85004'], [2027, 'TX', '78701'],
  [2026, 'NC', '27601'], [2026, 'AZ', '85004'], [2026, 'TX', '78701'],
  [2025, 'NC', '27601'], [2025, 'AZ', '85004'], [2025, 'TX', '78701'],
]
const carriers = ['Cedarfield', 'Blue Mesa', 'Juniper Harbor', 'Meadowline']
const metals = ['Bronze', 'Silver', 'Gold', 'Platinum']
const networks = ['HMO', 'EPO', 'PPO', 'POS']
const pad = (value) => String(value).padStart(3, '0')
const date = (year, month, day, time = '14:00') =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${time}:00.000Z`

export function sampleCredit(annual) {
  if (annual <= 48000) return 220
  if (annual <= 65000) return 150
  return 0
}

export function createInitialData() {
  const plans = markets.flatMap(([coverageYear, stateCode], marketIndex) =>
    Array.from({ length: marketIndex < 3 ? 16 : 4 }, (_, index) => {
      const metalIndex = index % metals.length
      const carrier = carriers[Math.floor(index / metals.length)]
      if (marketIndex === 0 && index === 13) return {
        id: 'plan-2027-nc-014', name: 'Cedarfield Silver Choice', insurer: 'Cedarfield Health',
        coverageYear, stateCode, metal: 'Silver', network: 'PPO', monthlyPremium: 482.5,
        deductible: 2800, outOfPocketMax: 8600, primaryCareCopay: 35,
      }
      return {
        id: `plan-${coverageYear}-${stateCode.toLowerCase()}-${pad(index + 1)}`,
        name: `${carrier} ${metals[metalIndex]} ${(index === 1 && marketIndex === 0 ? 'Standard' : ['Core', 'Choice', 'Select', 'Plus'][metalIndex])}`,
        insurer: `${carrier} Health`, coverageYear, stateCode, metal: metals[metalIndex],
        network: networks[(index + Math.floor(index / 4)) % 4],
        monthlyPremium: marketIndex === 1 && index === 0 ? 145.5 : 254.5 + metalIndex * 83 + index * 12 + marketIndex * 9,
        deductible: [6900, 3300, 1450, 500][metalIndex] + Math.floor(index / 4) * 100,
        outOfPocketMax: [9750, 8300, 6700, 4300][metalIndex],
        primaryCareCopay: [55, 35, 20, 10][metalIndex],
      }
    }),
  )
  const applications = []
  const eligibilityResults = []
  const planSelections = []
  const incomeUpdates = []
  const actor = account.id
  for (let number = 1; number <= 30; number++) {
    const suffix = pad(number)
    const [coverageYear, stateCode, zipCode] = markets[number <= 3 ? 0 : (number - 2) % markets.length]
    const id = `app-${coverageYear}-${stateCode.toLowerCase()}-${suffix}`
    const createdAt = date(coverageYear - 1, 11, number <= 3 ? [14, 3, 2][number - 1] : 1 + number % 8)
    const contact = { fullName: account.fullName, email: account.email, phone: '919-555-0148' }
    const householdMembers = [
      { id: `mem-${suffix}-01`, fullName: contact.fullName, relationship: 'self', birthDate: '1989-04-12', requestsCoverage: true },
      { id: `mem-${suffix}-02`, fullName: 'Quinn Morgan', relationship: 'spouse', birthDate: '1991-10-09', requestsCoverage: number % 2 === 1 },
    ]
    const common = { id, accountId: actor, coverageYear, stateCode, zipCode, createdAt, createdBy: actor, updatedAt: createdAt, updatedBy: actor, contact }
    if (number === 1 || number >= 26) {
      applications.push({ ...common, householdMembers: number === 1 ? [] : householdMembers, status: 'draft', lastCompletedStep: number === 1 ? 'contact' : 'household' })
      continue
    }
    const submittedAt = createdAt.replace('14:00', '14:14')
    const updatedAt = date(coverageYear - 1, 11, 12, '17:31')
    const annual = number === 3 ? 48000 : 33000 + number * 1392
    const revised = number === 3 ? 52200 : annual + (number % 2 === 0 ? -3600 : 8400)
    const previousIncome = { monthlyAmount: annual / 12, annualEstimate: annual }
    const income = { monthlyAmount: revised / 12, annualEstimate: revised }
    const eligibleMemberIds = number % 11 === 0 ? [] : householdMembers.filter((member) => member.requestsCoverage).map((member) => member.id)
    const status = eligibleMemberIds.length ? 'eligible' : 'ineligible'
    const result = { id: `elig-${suffix}a`, applicationId: id, coverageYear, status, eligibleMemberIds, annualIncomeEstimate: annual, monthlyTaxCredit: status === 'eligible' ? sampleCredit(annual) : 0, trigger: 'initial_application', createdAt: submittedAt, createdBy: actor }
    const incomeUpdateId = `inc-${suffix}`
    const nextResult = { ...result, id: `elig-${suffix}b`, trigger: 'income_update', incomeUpdateId, annualIncomeEstimate: revised, monthlyTaxCredit: status === 'eligible' ? sampleCredit(revised) : 0, createdAt: updatedAt }
    eligibilityResults.push(result, nextResult)
    incomeUpdates.push({ id: incomeUpdateId, applicationId: id, previousEligibilityResultId: result.id, eligibilityResultId: nextResult.id, status: 'submitted', previousIncome, newIncome: income, effectiveDate: `${coverageYear - 1}-11-10`, source: number % 4 === 0 ? 'self_employment' : 'job', createdAt: updatedAt, createdBy: actor })
    const application = { ...common, householdMembers, income, status: 'submitted', lastCompletedStep: 'review', submittedAt, lastResubmittedAt: updatedAt, updatedAt, latestEligibilityResultId: nextResult.id }
    if (number !== 2 && status === 'eligible') {
      const available = plans.filter((plan) => plan.coverageYear === coverageYear && plan.stateCode === stateCode)
      const plan = available[number === 3 ? 13 : number === 12 ? 0 : number % available.length]
      const first = seedSelection(`sel-${suffix}`, application, plan, result, date(coverageYear - 1, 11, number === 3 ? 3 : 11, '15:15'))
      if ([4, 5, 6].includes(number)) {
        const replacement = seedSelection(`sel-${suffix}b`, application, available[(number + 1) % available.length], nextResult, updatedAt)
        planSelections.push({ ...first, status: 'replaced', replacedAt: updatedAt, replacedBySelectionId: replacement.id }, replacement)
        application.selectedPlanSelectionId = replacement.id
      } else {
        planSelections.push(first)
        application.selectedPlanSelectionId = first.id
      }
    }
    applications.push(application)
  }
  return { account: { ...account }, applications, eligibilityResults, plans, planSelections, incomeUpdates }
}

function seedSelection(id, application, plan, result, createdAt) {
  const credit = Math.min(result.monthlyTaxCredit, plan.monthlyPremium)
  const net = plan.monthlyPremium - credit
  return {
    id, applicationId: application.id, planId: plan.id, eligibilityResultId: result.id,
    coveredMemberIds: [...result.eligibleMemberIds], status: net ? 'pending_first_premium' : 'confirmed',
    effectiveDate: `${application.coverageYear}-01-01`, grossMonthlyPremium: plan.monthlyPremium,
    appliedMonthlyTaxCredit: credit, netMonthlyPremium: net, createdAt, createdBy: account.id,
  }
}
