const beneficiaryId = 'person-maren'
const firstName = 'Maren'
const lastName = 'Ellis'
const benefitType = 'Retirement'
const monthlyBenefit = 2184.60

const banks = [
  'Alder Grove Bank', 'Orchard Point Bank', 'Juniper Harbor Credit Union',
  'Meadow Crossing Bank', 'Cedar Basin Savings', 'Northfield Community Bank',
]
const noticeTopics = [
  ['benefit_notice', 'Your annual benefit update', 'Your updated retirement benefit amount is available in your account.'],
  ['payment_notice', 'Your payment schedule', 'Review your payment history for the date and amount of recent retirement payments.'],
  ['account_notice', 'Your annual account summary', 'Your account summary includes the documents and payment details available online.'],
  ['payment_notice', 'Direct deposit confirmation', 'A direct deposit update was confirmed. Your current payment destination appears under Direct deposit.'],
  ['benefit_notice', 'Medicare deduction update', 'Review your payment history for current deductions from your monthly retirement benefit.'],
  ['account_notice', 'Your statement is available', 'Your current Social Security Statement is available in Benefit statements.'],
]

const years = (first, count) => Array.from({ length: count }, (_, index) => first + index)
const cents = amount => Math.round(amount * 100) / 100
const pad = value => String(value).padStart(2, '0')

export function createInitialData() {
  const profile = {
    id: beneficiaryId, firstName, lastName, benefitStatus: 'receiving',
    benefitType, monthlyBenefit, directDepositEligible: true,
  }
  const statements = years(2002, 24).map(year => ({
    id: 'stmt-' + year, beneficiaryId, kind: 'social_security_statement',
    title: year + ' Social Security Statement', year, issuedOn: year + '-10-14',
    earningsThroughYear: year - 1,
    estimates: years(62, 9).map(age => ({
      age, monthlyAmount: cents(1180 + (year - 2002) * 26.1 + (age - 62) * 74.4),
    })),
  }))
  for (const year of years(2020, 6)) {
    const benefitsPaid = 22044 + (year - 2020) * 648
    const benefitsRepaid = year === 2025 ? 120 : 0
    statements.push({
      id: 'tax-' + year, beneficiaryId, kind: 'tax_benefit_statement',
      title: year + ' Social Security Benefit Statement', year, issuedOn: (year + 1) + '-01-31',
      form: 'SSA-1099', benefitsPaid, benefitsRepaid, netBenefits: benefitsPaid - benefitsRepaid,
    })
  }

  const earnings = years(1989, 36).map(year => {
    const amount = [1996, 2008, 2020].includes(year) ? 0 : 12825 + (year - 1989) * 685 + (year % 5) * 145
    return { id: 'earn-' + year, beneficiaryId, year, socialSecurityEarnings: amount, medicareEarnings: amount }
  })
  const destinations = years(0, 24).map(index => ({
    id: index === 23 ? 'destination-northfield' : 'destination-' + pad(index + 1),
    beneficiaryId,
    bankName: banks[index % banks.length],
    accountType: index % 3 === 0 ? 'savings' : 'checking',
    accountLast4: index === 23 ? '4821' : String(74 + index * 193).padStart(4, '0'),
    status: 'active',
    updatedAt: (2003 + index) + '-07-14T15:00:00.000Z',
  }))
  const directDepositChanges = destinations.map((destination, index) => ({
    id: 'ddc-' + String(index + 1).padStart(3, '0'), beneficiaryId,
    previousDestination: destinations[index - 1] ?? null, newDestination: destination,
    changeType: index === 0 ? 'setup' : 'change', status: 'confirmed',
    actorId: beneficiaryId, createdAt: destination.updatedAt,
  }))

  const letters = years(2003, 24).map((year, index) => {
    const [type, title, body] = noticeTopics[index % noticeTopics.length]
    const month = index % 2 === 0 ? '09' : '06'
    return {
      id: 'notice-' + year, beneficiaryId, type, title: title + ' · ' + year, body,
      status: 'issued', actorId: 'issuer-ssa', createdAt: year + '-' + month + '-12T14:00:00.000Z',
      readAt: index % 4 === 3 || index === 22 ? null : year + '-' + month + '-14T17:00:00.000Z',
    }
  })
  letters.push({
    id: 'letter-2026-verification', beneficiaryId, type: 'benefit_verification',
    title: 'Benefit Verification Letter', status: 'ready', actorId: beneficiaryId,
    createdAt: '2026-08-18T15:00:00.000Z', readAt: '2026-08-18T15:00:00.000Z',
    subjectName: firstName + ' ' + lastName,
    benefitSnapshot: { benefitStatus: 'receiving', benefitType, monthlyBenefit },
  })
  const payments = years(0, 24).map(index => {
    const monthOffset = 10 + index
    const year = 2024 + Math.floor(monthOffset / 12)
    const month = monthOffset % 12 + 1
    const period = year + '-' + pad(month)
    const gross = year === 2026 ? monthlyBenefit : year === 2025 ? 2107 : 2053.20
    const deductions = year === 2026 ? 202.90 : year === 2025 ? 185 : 174.70
    const destinationIndex = year - (month >= 7 ? 2003 : 2004)
    return {
      id: 'pay-' + period, beneficiaryId, paidOn: period + '-21', benefitType,
      gross, deductions, net: cents(gross - deductions),
      destinationLast4: destinations[destinationIndex].accountLast4,
    }
  })

  return {
    profile, statements, earnings, directDeposit: destinations.at(-1), directDepositChanges,
    letters, payments, statementActivity: [], letterActivity: [],
  }
}
