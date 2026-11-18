const actorId = 'veteran-001'
const profile = { id: actorId, firstName: 'Jordan', lastName: 'Brooks' }
const facilities = [
  { id: 'facility-001', name: 'Cedar River VA Clinic', city: 'Cedar River', state: 'IA', timeZone: 'America/Chicago', clinics: ['Primary care', 'Audiology', 'Physical therapy', 'Optometry'] },
  { id: 'facility-002', name: 'Prairie Bend VA Medical Center', city: 'Prairie Bend', state: 'IA', timeZone: 'America/Chicago', clinics: ['Primary care', 'Audiology', 'Physical therapy', 'Cardiology'] },
  { id: 'facility-003', name: 'Harbor Ridge VA Clinic', city: 'Harbor Ridge', state: 'IL', timeZone: 'America/Chicago', clinics: ['Primary care', 'Physical therapy', 'Optometry', 'Dermatology'] },
]

const claimTypes = ['disability_compensation', 'pension', 'decision_review']
const claimStatuses = ['evidence_gathering', 'decided', 'initial_review', 'rating', 'preparing_decision_letter', 'final_review', 'evidence_review', 'received']
const conditions = ['Tinnitus', 'Hearing loss', 'Knee strain', 'Lumbar strain', 'Migraines', 'Ankle sprain', 'Asthma', 'Shoulder strain', 'Sleep apnea', 'Scarring', 'Rhinitis', 'Carpal tunnel syndrome']
const medications = [
  ['Lisinopril', '10 mg'], ['Atorvastatin', '20 mg'], ['Metformin', '500 mg'], ['Amlodipine', '5 mg'],
  ['Levothyroxine', '50 mcg'], ['Omeprazole', '20 mg'], ['Losartan', '50 mg'], ['Sertraline', '25 mg'],
  ['Gabapentin', '100 mg'], ['Cetirizine', '10 mg'], ['Vitamin D3', '1,000 IU'], ['Naproxen', '250 mg'],
  ['Fluticasone', '50 mcg'], ['Albuterol', '90 mcg'], ['Famotidine', '20 mg'], ['Finasteride', '5 mg'],
  ['Duloxetine', '30 mg'], ['Hydrochlorothiazide', '12.5 mg'], ['Melatonin', '3 mg'], ['Sumatriptan', '50 mg'],
  ['Glipizide', '5 mg'], ['Tamsulosin', '0.4 mg'], ['Montelukast', '10 mg'], ['Pravastatin', '40 mg'],
  ['Folic acid', '1 mg'], ['Magnesium oxide', '400 mg'], ['Diclofenac gel', '1%'], ['Artificial tears', '0.5%'],
]
const benefitTypes = ['disability_compensation', 'pension', 'education']
const depositDestinations = [
  { id: 'deposit-destination-001', institutionName: 'Harbor Valley Credit Union', accountType: 'checking', last4: '2047' },
  { id: 'deposit-destination-002', institutionName: 'Prairie Community Bank', accountType: 'savings', last4: '6831' },
  { id: 'deposit-destination-003', institutionName: 'Cedar Junction Bank', accountType: 'checking', last4: '0952' },
]

const list = (count, create) => Array.from({ length: count }, (_, i) => create(i))
const id = (prefix, i) => `${prefix}-${101 + i}`
const date = (year, month, day) => new Date(Date.UTC(year, month - 1, day, 16)).toISOString()
const day = (...args) => date(...args).slice(0, 10)

export function createInitialData() {
  const claims = list(24, i => {
    const status = claimStatuses[i % claimStatuses.length]
    const createdAt = date(2026, 10, 26 - i * 5)
    const updatedAt = date(2026, 11, 15 - i * 5)
    return {
      id: id('claim', i), type: claimTypes[i < 3 || i % 4 === 0 ? 0 : i % 3],
      reason: i % 3 === 0 ? 'new_condition' : 'increase',
      conditions: i % 5 === 0 ? [conditions[i % 12], conditions[(i + 3) % 12]] : [conditions[i % 12]],
      status, createdAt, updatedAt, actorId, acknowledged: true,
      history: [{ status: 'received', createdAt, actorId }, ...(status === 'received' ? [] : [{ status, createdAt: updatedAt, actorId }])],
      evidenceRequests: i === 0 ? [{ id: 'evidence-request-101', title: 'Recent audiology report', status: 'open', dueDate: '2026-12-15' }] : [],
      ...(status === 'decided' ? { decisionLetter: {
        fileName: `${id('claim', i)}-decision.txt`, issuedAt: updatedAt,
        text: `VA.gov account sample decision letter\nReference: ${id('claim', i)}\n\nThe review of this claim has been completed. This letter is a fictional account record.\n`,
      } } : {}),
    }
  })
  const claimEvidence = [2, 3, 6, 9, 13].map((claimIndex, i) => ({
    id: id('evidence', i), claimId: claims[claimIndex].id,
    fileName: ['audiology-report.pdf', 'service-history.txt', 'physical-therapy-summary.pdf', 'supporting-statement.txt', 'clinic-notes.pdf'][i],
    mimeType: i % 2 === 0 ? 'application/pdf' : 'text/plain', sizeBytes: 4107 + i * 317,
    documentType: ['medical_record', 'service_record', 'medical_record', 'supporting_statement', 'medical_record'][i],
    status: 'submitted', actorId, createdAt: claims[claimIndex].updatedAt,
  }))
  const appointments = list(32, i => {
    const facility = facilities[i % 3]
    const status = ['scheduled', 'requested', 'completed', 'canceled'][i % 4]
    const createdAt = date(2026, 11, 15 - i * 3)
    return {
      id: id('appt', i), facilityId: facility.id, clinic: facility.clinics[i % 5 % facility.clinics.length],
      visitType: ['in_person', 'video', 'phone'][i % 3], status, createdAt,
      updatedAt: status === 'canceled' ? date(2026, 11, 16 - i * 3) : createdAt, actorId,
      ...(status === 'requested'
        ? { preferredDate: day(2026, 12, 8 + i * 2), preferredTime: '10:30', reason: 'Routine follow-up' }
        : { startsAt: status === 'scheduled' && i < 24 ? date(2026, 12, 4 + i * 7) : date(2026, 11, 17 - i * 3), canCancel: status === 'scheduled' && i % 8 === 0 }),
      ...(status === 'canceled' ? { canceledAt: date(2026, 11, 16 - i * 3), canceledBy: actorId, cancelReason: 'Schedule conflict' } : {}),
    }
  })
  const prescriptions = medications.map(([medication, strength], i) => {
    const lastFilledAt = date(2026, 11, 16 - i * 3)
    return {
      id: id('rx', i), rxNumber: `RX-${710101 + i}`, medication, strength,
      status: i % 9 === 8 ? 'expired' : i % 9 === 7 ? 'discontinued' : 'active',
      refillsRemaining: i % 5 === 3 ? 0 : 1 + (i + 1) % 4,
      facilityId: facilities[i % 3].id, lastFilledAt,
      fillHistory: [
        { id: id('fill', i * 2), filledAt: lastFilledAt, quantity: i % 4 === 0 ? 90 : 30 },
        { id: id('fill', i * 2 + 1), filledAt: date(2026, 10, 10 - i * 3), quantity: 30 },
      ],
    }
  })
  const refillRequests = [1, 0, 2, 4, 6].map((rxIndex, i) => ({
    id: id('refill', i), prescriptionId: prescriptions[rxIndex].id, quantity: 1,
    status: i === 0 ? 'requested' : 'fulfilled', actorId, createdAt: date(2026, 11, 9 - i * 5),
  }))
  const prescriptionShipments = refillRequests.slice(1).map((request, i) => ({
    id: id('shipment', i), prescriptionId: request.prescriptionId, refillRequestId: request.id,
    status: ['in_transit', 'delivered', 'delivered', 'shipped'][i], carrier: 'USPS',
    trackingNumber: `VA-SAMPLE-${80124 + i}`, shippedAt: date(2026, 11, 16 - i * 4),
    estimatedDeliveryDate: day(2026, 11, 21 - i * 3),
    ...(i === 1 || i === 2 ? { deliveredAt: date(2026, 11, 20 - i * 3) } : {}),
  }))
  const benefitPayments = list(36, i => ({
    id: id('benefit-pay', i), benefitType: benefitTypes[i % 3],
    paidOn: day(2026, 11 - Math.floor(i / 2), 2 + i % 2 * 5), amount: [1275.50, 903.25, 672][i % 3] + (i % 6) * 8,
    currency: 'USD', method: i % 7 === 4 ? 'paper_check' : 'direct_deposit',
    status: i % 13 === 10 ? 'returned' : 'paid',
    ...(i % 7 === 4 ? {} : { destinationLast4: i % 3 === 2 ? '6831' : '2047' }),
  }))
  const directDeposits = ['benefits', 'education'].map((benefitGroup, i) => ({
    id: `deposit-${benefitGroup}`, benefitGroup, destinationId: depositDestinations[i].id, status: 'active',
    actorId, updatedAt: date(2026, 9 - i, 8),
  }))
  const directDepositChanges = [{
    id: 'deposit-change-101', directDepositId: directDeposits[0].id, benefitGroup: 'benefits',
    previousDestinationId: depositDestinations[2].id, destinationId: directDeposits[0].destinationId,
    status: 'saved', actorId, createdAt: directDeposits[0].updatedAt,
  }]
  const copayBills = list(24, i => {
    const paid = i % 3 === 1
    const lineItems = [{
      id: id('charge', i * 2), description: ['Outpatient visit', 'Pharmacy copay', 'Specialty care visit'][i % 3],
      serviceDate: day(2026, 10, 20 - i * 4), amount: [23.50, 8, 50][i % 3],
    }]
    if (i % 4 === 2) lineItems.push({
      id: id('charge', i * 2 + 1), description: 'Pharmacy copay', serviceDate: day(2026, 10, 23 - i * 4), amount: 8,
    })
    return {
      id: id('copay', i), facilityId: facilities[i % 3].id, issuedOn: day(2026, 11, 3 - i * 4),
      dueOn: day(2026, 12, 3 - i * 4), status: paid ? 'paid' : 'open', lineItems,
      balance: paid ? 0 : lineItems.reduce((total, item) => total + item.amount, 0), currency: 'USD',
      updatedAt: date(2026, 11, (paid ? 9 : 3) - i * 4), ...(paid ? { paidAt: date(2026, 11, 9 - i * 4) } : {}),
    }
  })
  const copayPayments = copayBills.filter(bill => bill.status === 'paid').map((bill, i) => ({
    id: id('copay-pay', i), billId: bill.id, amount: bill.lineItems.reduce((total, item) => total + item.amount, 0),
    currency: 'USD', method: i % 2 ? 'sample_bank' : 'sample_debit', status: 'paid', actorId, createdAt: bill.paidAt,
  }))
  return {
    profile: { ...profile }, facilities: facilities.map(facility => ({ ...facility, clinics: [...facility.clinics] })),
    claims, claimEvidence, appointments, prescriptions, refillRequests, prescriptionShipments, benefitPayments,
    depositDestinations: depositDestinations.map(destination => ({ ...destination })),
    directDeposits, directDepositChanges, copayBills, copayPayments,
  }
}
