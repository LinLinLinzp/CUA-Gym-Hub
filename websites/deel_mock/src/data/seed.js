const actor = 'usr-jordan'
const createdAt = '2026-01-12T15:00:00.000Z'
const id = (prefix, index) => prefix + '-' + String(index + 1).padStart(3, '0')
const date = (month, day) => '2026-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0')
const names = [
  'Lucia Bennett', 'Mateo Silva', 'Priya Shah', 'Jasper Cole', 'Hana Mori', 'Sofia Reyes',
  'Noah Mercer', 'Amara Okafor', 'Theo Laurent', 'Mila Novak', 'Ravi Mehta', 'Isabel Cruz',
  'Mina Park', 'Felix Weber', 'Layla Hassan', 'Leo Fischer', 'Ines Costa', 'Nora Ellis',
  'Kai Tan', 'Aisha Rahman', 'Sasha Quinn', 'Hugo Santos', 'Tessa Flynn', 'Evan Brooks',
  'Maya Laurent', 'Emil Olsen', 'Lina Haddad', 'Oscar Lima', 'Ada Klein', 'Samir Rao',
  'Camila Torres', 'Owen Reed', 'Neha Kapoor', 'Avery Lane', 'Yuna Kim', 'Dylan Price',
  'Nadia Ali', 'Miles Grant', 'Rosa Vega', 'Luca Rossi', 'Mei Chen', 'Iris Stone',
  'Anika Bose', 'Aria Patel', 'Milo James', 'Elena Rios', 'Tariq Ahmed', 'June Walsh',
]
const countries = ['Canada', 'Brazil', 'India', 'United States', 'Japan', 'Spain', 'United Kingdom', 'Nigeria']
const teams = ['Design', 'Research', 'Engineering', 'Operations', 'Content', 'Production']
const roles = ['Brand designer', 'UX researcher', 'Web developer', 'Project coordinator', 'Copywriter', 'Producer']
const titles = ['Brand systems support', 'Audience research', 'Website implementation', 'Launch coordination', 'Editorial production', 'Campaign design']
const scopes = [
  'Maintain the visual identity guidelines and review launch assets.',
  'Interview customers and synthesize findings for the quarterly planning review.',
  'Implement accessible components and document integration requirements.',
  'Coordinate deliverables and maintain the launch schedule.',
  'Write and edit campaign copy with the content team.',
  'Develop campaign concepts and deliver production-ready artwork.',
]
const contractTypes = ['fixed_rate', 'pay_as_you_go', 'milestone']
const currencies = ['USD', 'EUR', 'GBP']

export function createInitialData() {
  const organization = { id: 'org-northstar', name: 'Northstar Studio', defaultCurrency: 'USD' }
  const currentUser = { id: actor, name: 'Jordan Lee', role: 'Operations manager', email: 'jordan.lee@northstar.example' }
  const legalEntities = [
    { id: 'ent-us', name: 'Northstar Studio LLC', country: 'United States', currency: 'USD' },
    { id: 'ent-gb', name: 'Northstar Studio Ltd', country: 'United Kingdom', currency: 'GBP' },
  ]
  const workers = names.map((name, index) => ({
    id: id('wrk', index), name, email: name.toLowerCase().replace(' ', '.') + '@example.test',
    type: index < 30 ? 'contractor' : 'employee', country: countries[index % countries.length],
    role: roles[index % roles.length], team: teams[index % teams.length],
    legalEntityId: legalEntities[index % 2].id, annualVacationDays: index < 30 ? null : [20, 25, 22][index % 3],
    createdBy: actor, createdAt,
  }))
  const contracts = Array.from({ length: 36 }, (_, index) => {
    const type = contractTypes[index % 3]
    const status = index < 21 ? 'active' : index < 27 ? 'draft' : index < 33 ? 'pending_signature' : 'cancelled'
    const worker = workers[index % 30]
    const signed = status !== 'draft' ? '2026-01-13T14:00:00.000Z' : null
    const completed = status === 'active' ? '2026-01-15T17:00:00.000Z' : null
    const cancelled = status === 'cancelled' ? '2026-10-15T17:00:00.000Z' : null
    return {
      id: id('ctr', index), number: 'CTR-' + (1001 + index), workerId: worker.id, legalEntityId: worker.legalEntityId,
      title: titles[index % 6], type, status, currency: currencies[index % 3],
      rate: type === 'milestone' ? null : type === 'fixed_rate' ? 4800 + index * 80 : 75 + index,
      rateUnit: type === 'milestone' ? null : type === 'fixed_rate' ? 'month' : 'hour',
      milestones: type === 'milestone' ? [{ id: id('ms', index), title: 'Deliver final design', amount: 3200 + index * 50, dueDate: date(12, 10) }] : [],
      scope: scopes[index % 6], startDate: date(2 + Math.floor(index / 6), 2 + index % 6), endDate: null,
      noticeDays: 14, createdBy: actor, createdAt, updatedAt: cancelled || completed || signed || createdAt,
      clientSignedAt: signed, sentAt: signed, contractorSignedAt: completed, cancelledAt: cancelled,
    }
  })
  const paidAgreementIndexes = [0, 3, 1, 4, 2, 5, 6, 9, 10, 11, 12, 13, 14, 15, 16, 17]
  const invoices = Array.from({ length: 48 }, (_, index) => {
    const contract = contracts[paidAgreementIndexes[index - 32] ?? index % 21]
    const status = index < 20 ? 'open' : index < 32 ? 'overdue' : index < 36 ? 'processing' : 'paid'
    const unitPrice = 2200 + index * 35
    const issued = date(index < 20 ? 11 : 10, 2 + index % 18)
    const lineItems = [{ id: id('li', index), description: contract.title, quantity: 2, unitPrice, amount: unitPrice * 2 }]
    if (index % 4 === 0) lineItems.push({ id: id('li-extra', index), description: 'Production expenses', quantity: 1, unitPrice: 150, amount: 150 })
    return {
      id: id('inv', index), number: 'INV-' + (2401 + index), workerId: contract.workerId, contractId: contract.id,
      legalEntityId: contract.legalEntityId, currency: contract.currency, status, issueDate: issued,
      dueDate: date(index < 20 ? 12 : 11, (index < 20 ? 2 : 1) + index % (index < 20 ? 18 : 12)),
      lineItems, total: lineItems.reduce((sum, item) => sum + item.amount, 0), paymentId: null,
      createdBy: actor, createdAt: issued + 'T09:00:00.000Z', updatedAt: issued + 'T09:00:00.000Z',
    }
  })
  const paymentGroups = [[32, 33], [34, 35], [36, 37], [38, 39], [40], [41], [42], [43], [44], [45], [46], [47]]
  const payments = paymentGroups.map((group, index) => {
    const paymentId = id('pay', index)
    const paidAt = '2026-11-12T16:05:00.000Z'
    const allocations = group.map(position => {
      const invoice = invoices[position]
      invoice.paymentId = paymentId
      invoice.updatedAt = paidAt
      return { invoiceId: invoice.id, workerId: invoice.workerId, amount: invoice.total }
    })
    return {
      id: paymentId, invoiceIds: allocations.map(item => item.invoiceId), allocations,
      amount: allocations.reduce((sum, item) => sum + item.amount, 0), currency: invoices[group[0]].currency,
      method: 'studio_balance', status: invoices[group[0]].status, createdBy: actor, createdAt: paidAt,
    }
  })
  const timeOffRequests = Array.from({ length: 32 }, (_, index) => {
    const status = index < 10 ? 'pending' : index < 22 ? 'approved' : index < 28 ? 'denied' : 'cancelled'
    const startDate = index < 10 ? date(12, 7) : index < 14 ? date(12, 14) : date(11, 9)
    const halfDay = index % 5 === 1
    const endDate = halfDay ? startDate : date(index < 14 ? 12 : 11, Number(startDate.slice(-2)) + 2)
    const requestedAt = index < 14 ? '2026-11-18T15:00:00.000Z' : '2026-10-28T15:00:00.000Z'
    const reviewedAt = ['approved', 'denied'].includes(status) ? requestedAt.replace('15:00', '16:00') : null
    const cancelledAt = status === 'cancelled' ? requestedAt.replace('15:00', '17:00') : null
    return {
      id: id('tor', index), workerId: workers[30 + index % 18].id,
      type: index % 4 < 2 ? 'vacation' : index % 4 === 2 ? 'sick' : 'unpaid',
      status, startDate, endDate, duration: halfDay ? 'half_day' : 'full_day', days: halfDay ? 0.5 : 3,
      note: ['Family visit.', 'Personal appointment.', 'Travel plans.', 'Family commitments.'][index % 4],
      createdBy: actor, createdAt: requestedAt, updatedAt: reviewedAt || cancelledAt || requestedAt,
      reviewedBy: reviewedAt ? actor : null, reviewedAt,
      decisionNote: status === 'denied' ? 'Please coordinate alternate dates with the team.' : null, cancelledAt,
    }
  })
  const activity = [
    ...payments.map(item => ({ action: 'payment.released', entityType: 'payment', entityId: item.id, createdAt: item.createdAt, relatedIds: item.invoiceIds })),
    ...timeOffRequests.filter(item => item.reviewedAt).map(item => ({
      action: 'time_off.' + item.status, entityType: 'time_off_request', entityId: item.id, createdAt: item.reviewedAt, relatedIds: [item.workerId],
    })),
  ].map((event, index) => ({ ...event, id: id('evt', index), actorId: actor }))
  return { organization, currentUser, legalEntities, workers, contracts, invoices, payments, timeOffRequests, activity }
}
