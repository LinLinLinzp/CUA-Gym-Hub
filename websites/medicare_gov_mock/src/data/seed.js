const memberId = 'member-001'
const zipCodes = ['53703', '53704']
const historyYears = Array.from({ length: 12 }, (_, index) => 2015 + index)
const pad = (value) => String(value).padStart(2, '0')
const providers = [
  'Prairie Grove Family Clinic', 'Lakeshore Imaging Center', 'Juniper Orthopedics',
  'Capitol Community Hospital', 'Wingra Rehabilitation', 'Oak Meadow Laboratory',
  'Northfield Eye Center',
]
const carriers = [
  'Cedar Valley Health', 'Lakeview Care', 'Prairie Mutual',
  'North Pines Health', 'Juniper Health Partners', 'Badger Ridge Health',
]
const advantageNames = [
  'Cedar Valley Choice', 'Lakeview Access', 'Prairie Select', 'North Pines Connect',
  'Juniper Community', 'Badger Ridge Flex', 'Cedar Valley Essential', 'Lakeview Premier',
  'Prairie Value', 'North Pines Complete', 'Juniper Preferred', 'Badger Ridge Plus',
]
const drugNames = [
  'Cedar Valley Prescription Value', 'Lakeview Rx Essential', 'Prairie Mutual Rx Choice',
  'North Pines Prescription Plus', 'Juniper Rx Select', 'Badger Ridge Rx Complete',
]
const serviceNames = [
  'Established patient office visit', 'Diagnostic chest X-ray', 'Orthopedic consultation',
  'Inpatient hospital stay', 'Physical therapy session', 'Metabolic panel', 'Diagnostic eye exam',
]

function catalogForZip(zipCode) {
  const east = zipCode === '53704'
  return Array.from({ length: 18 }, (_, index) => {
    const drug = index >= 12
    const network = index % 3 === 1 ? 'PPO' : 'HMO'
    const includesDrugCoverage = drug || index % 5 !== 4
    const name = drug ? drugNames[index - 12] : advantageNames[index]
    return {
      id: 'plan-2027-' + zipCode + '-' + (drug ? 'pd-' + pad(index - 11) : 'ma-' + pad(index + 1)),
      name: [name, east ? 'East' : '', drug ? '' : network].filter(Boolean).join(' '),
      carrier: carriers[index % carriers.length],
      type: drug ? 'drug' : 'advantage',
      zipCodes: [zipCode],
      planYear: 2027,
      status: 'available',
      monthlyPremium: index === 0 ? 24 : index % 4 === 0 ? 0 : 12 + (index * 7 + (east ? 5 : 0)) % 61,
      rating: index === 0 ? 4.5 : 3 + (index % 5) / 2,
      includesDrugCoverage,
      ...(includesDrugCoverage ? { drugDeductible: index === 0 ? 160 : [0, 125, 245, 410, 520][index % 5] } : {}),
      ...(!drug ? { network, medicalOutOfPocketMax: 4900 + index * 250 } : {}),
      benefits: drug ? ['Retail and mail-order pharmacy'] : [
        'Routine dental', index % 2 === 0 ? 'Routine vision' : 'Hearing exams',
      ],
    }
  })
}

function claimAmounts(billedAmount, approvedAmount, part, status) {
  if (status === 'pending') return { billedAmount }
  const medicarePaid = part === 'A' ? approvedAmount : Math.round(approvedAmount * 80) / 100
  return { billedAmount, approvedAmount, medicarePaid, memberResponsibility: Math.round((approvedAmount - medicarePaid) * 100) / 100 }
}

function claimAt(index) {
  const id = 'claim-' + String(index + 1).padStart(3, '0')
  const provider = index % providers.length
  const part = provider === 3 ? 'A' : 'B'
  const status = index % 9 === 2 ? 'pending' : index % 11 === 5 ? 'denied' : 'processed'
  const serviceDate = new Date(Date.UTC(2026, 9, 27 - index * 6)).toISOString().slice(0, 10)
  const processedDate = new Date(Date.UTC(2026, 10, 3 - index * 6)).toISOString().slice(0, 10)
  const lines = [{
    id: id + '-line-01',
    description: serviceNames[provider],
    quantity: 1,
    ...claimAmounts(140 + provider * 32 + (part === 'A' ? 2500 : 0), status === 'denied' ? 0 : 95 + provider * 23, part, status),
  }]
  if (index % 4 === 0) {
    lines.push({ id: id + '-line-02', description: 'Follow-up assessment', quantity: 1, ...claimAmounts(20, status === 'denied' ? 0 : 15, part, status) })
  }
  const totals = Object.fromEntries(
    ['billedAmount', 'approvedAmount', 'medicarePaid', 'memberResponsibility']
      .filter((key) => key in lines[0])
      .map((key) => [key, Math.round(lines.reduce((sum, line) => sum + line[key], 0) * 100) / 100]),
  )
  return {
    id, memberId, claimNumber: 'CLM-' + (26001 + index), part, status, serviceDate,
    providerName: providers[provider], serviceLines: lines, ...totals,
    ...(status !== 'pending' ? { processedDate } : {}),
    ...(lines.length > 1 ? { notes: 'Two services were included in this claim.' } : {}),
  }
}

export function createInitialData() {
  const email = 'eleanor.brooks@example.test'
  const phone = '608-555-0142'
  const archived = historyYears.flatMap((year) => [1, 2].map((number) => ({
    id: 'plan-' + year + '-history-' + pad(number),
    name: number === 1 ? 'Cedar Valley Choice HMO' : 'Lakeview Rx Essential',
    carrier: carriers[number - 1], type: number === 1 ? 'advantage' : 'drug',
    zipCodes: ['53703'], planYear: year, status: 'archived', monthlyPremium: 18 + number * 9,
  })))
  return {
    account: {
      id: memberId, firstName: 'Eleanor', lastName: 'Brooks', medicareNumberMasked: '•••• 4821',
      zipCode: '53703', city: 'Madison', state: 'WI', email, phone,
      coverage: { type: 'Original Medicare', partAStartDate: '2014-04-01', partBStartDate: '2014-04-01' },
      shoppingPlanYear: 2027,
      enrollmentWindow: { code: 'open_enrollment', label: 'Open Enrollment', opensOn: '2026-10-15', closesOn: '2026-12-07', effectiveDate: '2027-01-01', status: 'open' },
    },
    plans: [...zipCodes.flatMap(catalogForZip), ...archived],
    planComparisons: [],
    claims: Array.from({ length: 42 }, (_, index) => claimAt(index)),
    claimReviews: [],
    enrollments: archived.map((plan) => {
      const second = plan.id.endsWith('02')
      return {
        id: 'enrollment-history-' + plan.planYear + '-' + (second ? '02' : '01'),
        planId: plan.id, memberId, planName: plan.name, planYear: plan.planYear, zipCode: '53703',
        enrollmentPeriodCode: 'open_enrollment', reason: second ? 'change_coverage' : 'join_plan',
        effectiveDate: plan.planYear + '-01-01', contact: { email, phone }, attestationAccepted: true,
        status: second ? 'withdrawn' : 'closed', confirmationNumber: 'ENR-' + plan.planYear + (second ? '4F02' : '4F01'),
        actorId: memberId, createdAt: (plan.planYear - 1) + (second ? '-11-20' : '-10-29') + 'T15:30:00.000Z',
      }
    }),
  }
}
