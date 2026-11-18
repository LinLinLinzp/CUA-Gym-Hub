import { PENDING } from '../model.js'

const actorId = 'profile-maya'
const name = 'Maya Rivera'
const email = 'maya.rivera@example.test'
const day = 86_400_000
const pad = (index, width = 3) => String(index).padStart(width, '0')
const iso = (date, offset = 0) => new Date(Date.parse(date) + offset * day).toISOString()
const caseId = index => 'case-' + pad(index)
const receipt = index => 'IOE97' + pad(index, 8)
const address = (line1, city, region, postalCode, line2 = '') => ({ line1, line2, city, region, postalCode, country: 'US' })
const currentPhysical = address('184 Willowbank Lane', 'Portland', 'OR', '97205', 'Apt 4B')
const currentMailing = { ...currentPhysical }

const enabledForms = [
  ['I-765', 'Application for Employment Authorization', 'Employment', [
    { id: 'reason', label: 'Reason for applying', required: true, options: ['Initial application', 'Renewal', 'Replacement'] },
    { id: 'category', label: 'Eligibility category', required: true },
  ]],
  ['I-90', 'Application to Replace Permanent Resident Card', 'Permanent residence', [
    { id: 'reason', label: 'Reason for replacing your card', required: true, options: ['Card expired', 'Card expires soon', 'Card was lost'] },
    { id: 'cardName', label: 'Name printed on your card', required: true },
  ]],
  ['I-130', 'Petition for Alien Relative', 'Family', [
    { id: 'relationship', label: 'Relationship to the beneficiary', required: true, options: ['Spouse', 'Parent', 'Child', 'Sibling'] },
    { id: 'beneficiary', label: 'Beneficiary full legal name', required: true },
  ]],
  ['N-400', 'Application for Naturalization', 'Citizenship', [
    { id: 'residenceYear', label: 'Year you became a permanent resident', required: true },
    { id: 'nameChange', label: 'Are you requesting a name change?', required: true, options: ['Yes', 'No'] },
  ]],
]

const formId = code => 'form-' + code.toLowerCase().replaceAll('-', '')
const statuses = ['under_review', 'closed', 'action_needed', 'approved', 'decision_issued', 'received', 'under_review', 'approved']
const titles = {
  received: 'Case received',
  under_review: 'Case is under review',
  action_needed: 'Additional information requested',
  decision_issued: 'Decision issued',
  approved: 'Case approved',
  closed: 'Case closed',
}
const descriptions = {
  received: 'A receipt number was assigned when the filing was accepted.',
  under_review: 'The filing is being reviewed.',
  action_needed: 'A notice requests additional information for this filing.',
  decision_issued: 'A decision notice was recorded for this case.',
  approved: 'The decision notice records an approval.',
  closed: 'Processing has ended for this case.',
}

function makeCases() {
  const cases = []
  const caseEvents = []
  const trackedCases = []
  for (let index = 1; index <= 48; index += 1) {
    const id = caseId(index)
    const [code, title] = enabledForms[(index - 1) % enabledForms.length]
    const status = index === 33 ? 'received' : statuses[(index - 1) % statuses.length]
    const statusUpdatedAt = iso('2026-10-26T16:00:00Z', -(index - 1) * 7)
    const history = {
      received: ['received'],
      under_review: ['received', 'under_review'],
      action_needed: ['received', 'under_review', 'action_needed'],
      decision_issued: ['received', 'under_review', 'decision_issued'],
      approved: ['received', 'under_review', 'approved'],
      closed: ['received', 'under_review', 'decision_issued', 'closed'],
    }[status]
    const filedAt = iso(statusUpdatedAt, -(history.length - 1) * 14)
    cases.push({
      id, receiptNumber: receipt(index), formId: formId(code), formCode: code, formTitle: title,
      status, filedAt, statusUpdatedAt, mailingAddress: { ...currentMailing },
      ...(index <= 12 ? { submissionId: 'submission-' + pad(index) } : {}),
    })
    history.forEach((eventStatus, eventIndex) => caseEvents.push({
      id: 'event-' + pad(index) + '-' + pad(eventIndex + 1, 2), caseId: id, status: eventStatus,
      title: titles[eventStatus], description: descriptions[eventStatus], actorId: 'system',
      createdAt: iso(filedAt, eventIndex * 14),
    }))
    if (index <= 32) trackedCases.push({
      id: 'tracked-' + pad(index), caseId: id, actorId, createdAt: filedAt,
    })
  }
  return { cases, caseEvents, trackedCases }
}

const referenceForms = [
  ['I-129', 'Petition for a Nonimmigrant Worker', 'Employment'],
  ['I-140', 'Immigrant Petition for Alien Workers', 'Employment'],
  ['I-485', 'Application to Register Permanent Residence or Adjust Status', 'Permanent residence'],
  ['I-751', 'Petition to Remove Conditions on Residence', 'Permanent residence'],
  ['I-829', 'Petition by Investor to Remove Conditions on Permanent Resident Status', 'Permanent residence'],
  ['I-131', 'Application for Travel Documents, Parole Documents, and Arrival/Departure Records', 'Travel'],
  ['I-539', 'Application to Extend or Change Nonimmigrant Status', 'Nonimmigrant status'],
  ['I-129F', 'Petition for Alien Fiancé(e)', 'Family'],
  ['I-600', 'Petition to Classify Orphan as an Immediate Relative', 'Family'],
  ['I-800', 'Petition to Classify Convention Adoptee as an Immediate Relative', 'Family'],
  ['I-730', 'Refugee/Asylee Relative Petition', 'Humanitarian'],
  ['I-589', 'Application for Asylum and for Withholding of Removal', 'Humanitarian'],
  ['I-821', 'Application for Temporary Protected Status', 'Humanitarian'],
  ['I-821D', 'Consideration of Deferred Action for Childhood Arrivals', 'Humanitarian'],
  ['I-914', 'Application for T Nonimmigrant Status', 'Humanitarian'],
  ['I-918', 'Petition for U Nonimmigrant Status', 'Humanitarian'],
  ['I-912', 'Request for Fee Waiver', 'Records and requests'],
  ['N-565', 'Application for Replacement Naturalization/Citizenship Document', 'Citizenship'],
  ['N-600', 'Application for Certificate of Citizenship', 'Citizenship'],
  ['N-600K', 'Application for Citizenship and Issuance of Certificate Under Section 322', 'Citizenship'],
]

const sampleResponses = [
  { reason: 'Renewal', category: 'C09' },
  { reason: 'Card expires soon', cardName: name },
  { relationship: 'Spouse', beneficiary: 'Luca Moreno' },
  { residenceYear: '2018', nameChange: 'No' },
]

function makeFilings(cases) {
  const formCatalog = [...enabledForms, ...referenceForms].map(([code, title, category, questions]) => ({
    id: formId(code), code, title, category, canFileOnline: Boolean(questions), ...(questions ? { questions } : {}),
  }))
  const formDrafts = Array.from({ length: 24 }, (_, offset) => {
    const formIndex = offset % enabledForms.length
    const currentStep = ['applicant', 'questions', 'review'][offset % 3]
    const updatedAt = iso('2026-11-12T18:15:00Z', -offset * 5)
    const answers = {
      applicantName: name,
      ...(currentStep !== 'applicant' ? { email } : {}),
      ...(currentStep === 'review' ? { responses: { ...sampleResponses[formIndex] } } : {}),
    }
    return {
      id: 'draft-' + pad(offset + 1), formId: formId(enabledForms[formIndex][0]), actorId,
      status: 'draft', currentStep, answers, createdAt: iso(updatedAt, -2), updatedAt,
    }
  })
  const formSubmissions = cases.slice(0, 12).map((item, offset) => {
    const draftId = 'draft-' + pad(offset + 25)
    const answers = { applicantName: name, email, responses: { ...sampleResponses[offset % enabledForms.length] } }
    formDrafts.push({
      id: draftId, formId: item.formId, actorId, status: 'submitted', currentStep: 'review',
      answers, createdAt: iso(item.filedAt, -3), updatedAt: item.filedAt, submittedAt: item.filedAt,
    })
    return {
      id: item.submissionId, draftId, formId: item.formId, actorId, caseId: item.id, receiptNumber: item.receiptNumber,
      answers, signature: name, status: 'submitted', createdAt: item.filedAt,
    }
  })
  return { formCatalog, formDrafts, formSubmissions }
}

const olderAddresses = [
  address('16 Alderbrook Court', 'Eugene', 'OR', '97401', 'Unit 2'),
  address('702 Fernridge Way', 'Salem', 'OR', '97301', 'Apt 6'),
  address('53 Juniper Hollow Lane', 'Vancouver', 'WA', '98660'),
  address('219 Larkmeadow Drive', 'Beaverton', 'OR', '97005', 'Unit 8'),
  address('481 Cedar Lantern Place', 'Portland', 'OR', '97202', 'Apt 3'),
  address('92 Briarfield Terrace', 'Portland', 'OR', '97209', 'Apt 12'),
]

function makeAddressHistory(cases) {
  const addressChanges = Array.from({ length: 24 }, (_, offset) => {
    const index = offset + 1
    const createdAt = iso('2026-08-03T15:30:00Z', -(24 - index) * 63)
    const block = Math.floor(offset / 4)
    const base = olderAddresses[block]
    const physical = index === 24 ? currentPhysical : { ...base, line2: offset % 2 ? 'Unit ' + (index + 2) : base.line2 }
    const same = index % 4 !== 1
    const mailing = same ? physical : address('PO Box ' + (840 + index), physical.city, physical.region, physical.postalCode)
    const eligible = cases.filter(item => PENDING.has(item.status) && item.statusUpdatedAt <= createdAt)
    const item = eligible.length && index % 3 === 0 ? eligible[offset % eligible.length] : null
    return {
      id: 'ac-' + pad(index), confirmationNumber: 'COA-' + pad(index, 6),
      newPhysicalAddress: physical, newMailingAddress: mailing, mailingSameAsPhysical: same,
      caseLinks: item ? [{ caseId: item.id, receiptNumber: item.receiptNumber }] : [],
      status: 'submitted', actorId, createdAt,
    }
  })
  for (const item of cases) {
    const atFiling = addressChanges.findLast(request => request.createdAt <= item.filedAt)
    const linked = addressChanges.findLast(request => request.caseLinks.some(link => link.caseId === item.id))
    item.mailingAddress = (linked || atFiling)?.newMailingAddress ?? currentMailing
    if (linked) item.addressChangeId = linked.id
  }
  return addressChanges.map((request, index) => ({
    ...request,
    previousPhysicalAddress: addressChanges[index - 1]?.newPhysicalAddress ?? null,
    previousMailingAddress: addressChanges[index - 1]?.newMailingAddress ?? null,
  }))
}

function makeChecks(cases) {
  return Array.from({ length: 24 }, (_, offset) => {
    const index = offset + 1
    const item = index % 5 === 0 ? null : cases[(offset * 5) % cases.length]
    return {
      id: 'check-' + pad(index), receiptNumber: item?.receiptNumber ?? 'MSC96' + pad(index, 8),
      caseId: item?.id ?? null, outcome: item ? 'found' : 'not_found', caseStatus: item?.status ?? null,
      actorId, createdAt: iso('2026-10-27T14:10:00Z', Math.floor(offset / 2)),
    }
  })
}

export function createInitialData() {
  const caseData = makeCases()
  const addressChanges = makeAddressHistory(caseData.cases)
  const latestAddress = addressChanges.at(-1)
  return {
    profile: {
      id: actorId, displayName: name, email, physicalAddress: latestAddress.newPhysicalAddress,
      mailingAddress: latestAddress.newMailingAddress, updatedAt: latestAddress.createdAt,
    },
    ...caseData,
    caseStatusChecks: makeChecks(caseData.cases),
    ...makeFilings(caseData.cases),
    addressChanges,
  }
}
