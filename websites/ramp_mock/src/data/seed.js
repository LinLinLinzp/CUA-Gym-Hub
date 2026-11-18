const names = [
  'Avery Chen', 'Jordan Lake', 'Morgan Reyes', 'Samira Patel', 'Elliot Park', 'Nina Brooks',
  'Theo Rivera', 'Maya Shah', 'Alex Moreno', 'Iris Kim', 'Miles Foster', 'June Thompson',
  'Riley Bennett', 'Cleo Martin', 'Noah Singh', 'Lena Ortiz', 'Rowan Walsh', 'Tessa Reed',
  'Ali Morgan', 'Parker James', 'Harper Owens', 'Drew Lin', 'Sage Quinn', 'Robin Clarke',
]
const vendorInfo = [
  ['Alder Stationery', 'AS', 'Drawing stock'], ['Cedarline Printworks', 'CP', 'Proof prints'],
  ['Fieldwork Freight', 'FF', 'Local freight'], ['Juniper Lighting', 'JL', 'Lighting fixtures'],
  ['Loam Digital', 'LD', 'Hosting services'], ['Copperline Electric', 'CE', 'Electrical work'],
  ['Beacon Editorial', 'BE', 'Copy editing'], ['Westbank Furniture', 'WF', 'Studio stools'],
  ['Hearth Catering', 'HC', 'Catering service'], ['Silver Birch Media', 'SB', 'Media licensing'],
  ['Moss Equipment', 'ME', 'Equipment rental'], ['Slate Office Supply', 'SO', 'Office supplies'],
  ['Wren Accounting', 'WA', 'Bookkeeping'], ['Groundline Workshop', 'GW', 'Fabrication'],
  ['North Pier Couriers', 'NP', 'Courier service'], ['Fern & Finch', 'FE', 'Floral arrangement'],
  ['Elm Street Audio', 'EA', 'Audio production'], ['Blueglass Research', 'BR', 'Research services'],
]
const cardNames = ['Studio supplies', 'Production rentals', 'Client travel', 'Software subscriptions', 'Team meals', 'Office operations', 'Workshop materials', 'Project research', 'Shipping and freight', 'Design resources', 'Event production', 'Field expenses']
const requestNames = ['Lighting equipment rental', 'Workshop printing', 'Client visit travel', 'Studio monitor replacement', 'Production materials', 'Research interviews', 'Team planning lunch', 'Annual design license', 'Photo shoot props', 'Delivery courier']
const id = (prefix, index) => prefix + '-' + String(index + 1).padStart(3, '0')
const date = (month, day) => '2026-' + month + '-' + String(day).padStart(2, '0')
const stamp = (month, day) => date(month, day) + 'T15:00:00.000Z'
const admin = 'person-001'
const manager = 'person-002'

export function createInitialData() {
  const workspace = { id: 'workspace-northline', name: 'Northline Studio', currency: 'USD', currentUserId: admin }
  const people = names.map((name, i) => ({
    id: id('person', i), name, email: name.toLowerCase().replace(' ', '.') + '@example.test',
    department: ['Finance', 'Operations', 'Finance', 'Design', 'Production', 'Client Services'][i % 6],
    role: ['finance_admin', 'manager', 'ap_specialist'][i] || 'employee', managerId: i === 0 ? null : i === 1 ? admin : manager,
  }))
  const vendors = vendorInfo.map(([name, code, category], i) => ({
    id: id('vendor', i), name, category, contactEmail: 'billing@' + code.toLowerCase() + '.example.test',
  }))
  const cards = Array.from({ length: 36 }, (_, i) => ({
    id: id('card', i), name: cardNames[i % 12] + ['', ' · East', ' · West'][Math.floor(i / 12)],
    holderId: people[(i + 1) % people.length].id, type: i % 4 === 3 ? 'physical' : 'virtual',
    last4: String(427 + i * 263).padStart(4, '0'), status: i % 9 === 6 ? 'locked' : i % 9 === 8 ? 'terminated' : 'active',
    limitAmount: 2500 + (i % 9) * 550, limitCadence: ['monthly', 'one_time', 'annual'][i % 3],
    spentAmount: (68546 + i * 4193) / 100, currency: 'USD', createdBy: admin, createdAt: stamp('10', i % 26 + 5), updatedAt: stamp('10', i % 26 + 5),
  }))
  const route = thresholdAmount => ({ firstReviewerId: manager, secondReviewerId: admin, thresholdAmount })
  const expense = thresholdAmount => ({ receipt: { mode: 'threshold', thresholdAmount }, memo: { mode: 'always', thresholdAmount: null } })
  const policySpecs = [
    ['expenses', 'expense_requirements', 'Expense requirements', [expense(50), expense(60), expense(75)]],
    ['spend', 'spend_request_approvals', 'Spend request approvals', [route(1000), route(1250), route(1500)]],
    ['bills', 'bill_approvals', 'Bill approvals', [route(750), route(900), route(1000)]],
    ['vendors', 'guidance', 'Vendor onboarding', [{ description: 'Confirm vendor details and retain the signed agreement before submitting the first invoice.' }]],
    ['travel', 'guidance', 'Travel spend', [{ description: 'Book economy fares and document the trip purpose in the expense memo.' }]],
    ['runs', 'guidance', 'Payment runs', [{ description: 'Review upcoming due dates and confirm payment method before each run.' }]],
  ]
  const policyRevisions = []
  const policies = policySpecs.map(([slug, kind, name, versions]) => {
    const policyId = 'policy-' + slug
    const version = versions.length
    if (kind !== 'guidance') versions.forEach((rules, i) => policyRevisions.push({
      id: 'revision-' + slug + '-' + String(i + 1).padStart(3, '0'), policyId, version: i + 1, rules: structuredClone(rules),
      createdBy: admin, createdAt: stamp(['08', '09', '10'][i], 1),
    }))
    return { id: policyId, kind, name, version, rules: structuredClone(versions.at(-1)), updatedBy: admin, updatedAt: stamp('10', 1) }
  })
  const approvals = []
  const payments = []
  const addApproval = (subject, subjectType, title, requesterId, status, createdAt, secondStep) => {
    const policy = policies[subjectType === 'bill' ? 2 : 1]
    const { rules } = policy
    const reviewerIds = subject.amount >= rules.thresholdAmount ? [manager, admin] : [manager]
    const stepIndex = status === 'approved' ? reviewerIds.length : secondStep && reviewerIds.length > 1 ? 1 : 0
    const approvalId = id('approval', approvals.length)
    const decisions = reviewerIds.slice(0, stepIndex + (status === 'rejected' ? 1 : 0)).map((reviewerId, i) => ({
      id: approvalId + '-decision-' + (i + 1), stepIndex: i, reviewerId, actorId: admin,
      decision: status === 'rejected' && i === stepIndex ? 'reject' : 'approve',
      note: status === 'rejected' && i === stepIndex ? 'Please attach the updated vendor estimate.' : 'Reviewed supporting details.',
      createdAt,
    }))
    approvals.push({
      id: approvalId, subjectType, subjectId: subject.id, title, requesterId, amount: subject.amount, currency: 'USD',
      status, reviewerIds, stepIndex, routing: { policyId: policy.id, version: policy.version, ...rules },
      decisions, createdBy: admin, createdAt, updatedAt: createdAt,
    })
    return approvalId
  }
  const bills = Array.from({ length: 36 }, (_, i) => {
    const vendorIndex = (i + Math.floor(i / vendors.length) * 5) % vendors.length
    const vendor = vendors[vendorIndex]
    const createdAt = stamp('10', 12 + i % 20)
    const quantity = i === 0 ? 8 : 2 + i % 8
    const unitCents = i === 0 ? 4550 : 4440 + i * 1473
    const lineItems = [{ id: id('line', i), description: vendor.category, quantity, unitAmount: unitCents / 100, amount: quantity * unitCents / 100 }]
    if (i % 3 === 1) lineItems.push({ id: id('line', 36 + i), description: 'Handling and delivery', quantity: 1, unitAmount: 18.5, amount: 18.5 })
    const status = ['pending_approval', 'scheduled', 'draft', 'approved', 'paid', 'rejected'][i % 6]
    const bill = {
      id: id('bill', i), vendorId: vendor.id, invoiceNumber: vendorInfo[vendorIndex][1] + '-' + (1048 + i * 17),
      invoiceDate: date('10', 11 + i % 20 + (i === 0 ? 1 : 0)), dueDate: date(i < 31 ? '11' : '12', 12 + (i * 7) % 18),
      memo: i === 0 ? 'Studio opening supplies' : vendor.category + ' for studio operations',
      lineItems, amount: lineItems.reduce((sum, line) => sum + Math.round(line.amount * 100), 0) / 100, currency: 'USD', status, approvalId: null, paymentId: null, createdBy: admin,
      createdAt, updatedAt: createdAt, submittedAt: status === 'draft' ? null : createdAt,
    }
    if (status !== 'draft') bill.approvalId = addApproval(bill, 'bill', bill.invoiceNumber + ' · ' + vendor.name, admin,
      status === 'pending_approval' ? 'pending' : status === 'rejected' ? 'rejected' : 'approved', createdAt, i % 4 === 0)
    if (['scheduled', 'paid'].includes(status)) {
      bill.paymentId = id('payment', payments.length)
      payments.push({
        id: bill.paymentId, billId: bill.id, amount: bill.amount, currency: 'USD', method: status === 'paid' ? 'external' : 'ach',
        status, scheduledDate: status === 'scheduled' ? date('11', 20 + i % 7) : null, paidOn: status === 'paid' ? date('11', 3 + i % 10) : null,
        createdBy: admin, createdAt: stamp('11', 3 + i % 10), updatedBy: admin, updatedAt: stamp('11', 3 + i % 10),
      })
    }
    return bill
  })
  const spendRequests = Array.from({ length: 30 }, (_, i) => {
    const person = people[(i + 1) % people.length]
    const title = requestNames[i % 10] + ['', ' · Fall projects', ' · Winter projects'][Math.floor(i / 10)]
    const createdAt = stamp('11', i % 15 + 1)
    const status = ['pending_approval', 'approved', 'pending_approval', 'rejected', 'approved'][i % 5]
    const request = {
      id: id('request', i), title, purpose: 'Reserve funds for ' + requestNames[i % 10].toLowerCase() + ' for Northline Studio.',
      requesterId: person.id, department: person.department, amount: i === 0 ? 1600 : (41000 + i * 16635) / 100,
      currency: 'USD', status, approvalId: null, createdBy: admin, createdAt, updatedAt: createdAt,
    }
    request.approvalId = addApproval(request, 'spend_request', title, person.id, status === 'pending_approval' ? 'pending' : status, createdAt, i % 2 === 0)
    return request
  })
  const activity = [
    { id: 'activity-001', action: 'card.issued', objectType: 'card', objectId: cards[0].id, related: {}, actorId: admin, createdAt: cards[0].createdAt, changes: {} },
    ...bills.filter(bill => bill.approvalId).map((bill, i) => ({
      id: id('activity', i + 1), action: 'bill.submitted', objectType: 'bill', objectId: bill.id, related: { approvalId: bill.approvalId },
      actorId: admin, createdAt: bill.submittedAt, changes: { status: { from: 'draft', to: 'pending_approval' } },
    })),
  ]
  return { workspace, people, vendors, cards, bills, payments, spendRequests, approvals, policies, policyRevisions, activity }
}

