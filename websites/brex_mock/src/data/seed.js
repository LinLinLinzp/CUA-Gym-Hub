export const categories = ['Office supplies', 'Software', 'Travel', 'Meals', 'Professional services', 'Equipment', 'Events', 'Shipping']

const names = [
  ['maya', 'Maya Chen'], ['eli', 'Eli Brooks'], ['sofia', 'Sofia Patel'], ['noah', 'Noah Williams'],
  ['amara', 'Amara Okafor'], ['owen', 'Owen Reed'], ['isabel', 'Isabel Torres'], ['leo', 'Leo Kim'],
  ['nina', 'Nina Park'], ['theo', 'Theo Martin'], ['priya', 'Priya Shah'], ['jules', 'Jules Laurent'],
  ['mia', 'Mia Campbell'], ['dante', 'Dante Rivera'], ['ruth', 'Ruth Cohen'], ['sam', 'Sam Nguyen'],
  ['iris', 'Iris Walsh'], ['hugo', 'Hugo Santos'], ['lena', 'Lena Fischer'], ['caleb', 'Caleb Young'],
  ['nora', 'Nora Ahmed'], ['milo', 'Milo James'], ['ana', 'Ana Costa'], ['jonah', 'Jonah Ford'],
  ['iman', 'Iman Ali'], ['ella', 'Ella Morgan'], ['remy', 'Remy Adams'], ['tara', 'Tara Singh'],
]
const departments = ['Finance', 'Design', 'Engineering', 'Operations', 'Sales']
const limitNames = [
  'Design Operations', 'Engineering Tools', 'Team Travel', 'Studio Supplies', 'Client Workshops', 'Sales Enablement',
  'Content Production', 'Office Operations', 'Cloud Services', 'Recruiting', 'Partner Events', 'Research Incentives',
  'Field Marketing', 'Employee Onboarding', 'Accessibility Research', 'Hardware Refresh', 'Learning and Development',
  'Photography', 'UK Studio Operations', 'European Travel', 'Toronto Client Visits', 'Prototyping', 'Spring Offsite',
  'Studio Relocation', 'Regional Roadshow', 'Brand Launch',
]
const merchants = [
  ['Paper Field Supply', 'Office supplies'], ['Atlas Rail', 'Travel'], ['Common Table', 'Meals'],
  ['Fern & Finch Print', 'Professional services'], ['Signal Grove', 'Software'], ['Union Desk', 'Equipment'],
  ['Alder House Hotel', 'Travel'], ['Harbor Parcel', 'Shipping'], ['Juniper Studio Hire', 'Events'],
  ['Cedar Cloud', 'Software'], ['Good Oak Kitchen', 'Meals'], ['Rivet Sound', 'Equipment'],
  ['Pollen Research', 'Professional services'], ['Pine Street Stationery', 'Office supplies'], ['Lumen Hall', 'Events'],
  ['Westline Courier', 'Shipping'],
]
const memos = ['Workshop supplies', 'Project team travel', 'Client planning session', 'Production proof', 'Monthly subscription', 'Studio equipment', 'Onsite visit', 'Client sample delivery']
const may = 'usr_maya'
const stamp = (day, time = '15:00') => `${day}T${time}:00.000Z`
const pad = number => String(number).padStart(2, '0')

export function createInitialData() {
  const members = names.map(([key, name], index) => ({
    id: `usr_${key}`, name, email: `${key}@example.test`, department: departments[Math.floor(index / 6)],
    role: index === 0 ? 'finance_admin' : 'employee',
  }))
  const limits = limitNames.map((name, index) => ({
    id: index === 0 ? 'lim_design_ops' : `lim_${pad(index + 1)}`, name,
    ownerId: members[index % members.length].id,
    amount: index === 0 ? 3500 : 1250 + index * 325,
    currency: ({18: 'GBP', 19: 'EUR', 20: 'CAD', 24: 'EUR'})[index] ?? 'USD',
    recurrence: ['monthly', 'quarterly', 'one_time'][index % 3],
    status: index < 22 ? 'active' : 'archived',
    createdBy: may, createdAt: stamp('2026-10-15'),
  }))
  const cards = Array.from({ length: 32 }, (_, index) => ({
    id: index === 0 ? 'crd_design_ops' : `crd_${pad(index + 1)}`,
    name: index < 26 ? limitNames[index] : `${departments[index % departments.length]} purchasing`,
    holderId: members[index % 25].id, limitId: limits[index % limits.length].id,
    format: index % 3 === 2 ? 'physical' : 'virtual',
    last4: String(417 + index * 191).padStart(4, '0'),
    status: index < 24 ? 'active' : index < 29 ? 'locked' : 'canceled',
    createdBy: may, createdAt: stamp('2026-10-16'),
  }))
  // Alternate purchase history across all cards, including canceled cards.
  const expenses = Array.from({ length: 72 }, (_, index) => {
    const card = index < 56 ? cards[index % cards.length] : null
    const limit = card ? limits.find(item => item.id === card.limitId) : limits[(index - 56) % 22]
    const [merchant, category] = merchants[index % merchants.length]
    const transactionDate = index === 0 ? '2026-11-10' : index < 28 ? `2026-11-${pad(16 - Math.floor(index / 2))}` : `2026-10-${pad(31 - Math.floor((index - 28) / 2))}`
    const employeeId = card?.holderId ?? members[(index - 56) % members.length].id
    const status = index % 4 === 0 || index % 7 === 1 ? 'pending_review' : index % 9 === 0 ? 'denied' : 'approved'
    return {
      id: index === 0 ? 'exp_paper_field' : `exp_${pad(index + 1)}`,
      kind: card ? 'card' : 'reimbursement', merchant, category,
      memo: memos[index % memos.length], amount: index === 0 ? 46.8 : ((index * 4237) % 58231 + 1925) / 100,
      currency: limit.currency, transactionDate, employeeId, cardId: card?.id ?? null, limitId: limit.id,
      status, createdBy: employeeId, createdAt: stamp(transactionDate, '18:40'),
      ...(status !== 'pending_review' && {
        reviewedBy: may, reviewedAt: stamp(transactionDate, '21:00'),
        reviewReason: status === 'denied' ? 'Outside the approved project scope' : null,
      }),
    }
  })
  const receipts = Array.from({ length: 42 }, (_, index) => {
    const expense = expenses[index]
    const filename = index === 0 ? 'paper-field-nov10.pdf' : `receipt-${pad(index + 1)}.pdf`
    return {
      id: index === 0 ? 'rcp_paper_field' : `rcp_${pad(index + 1)}`, filename,
      fileUrl: `/receipts-fixtures/${filename}`, mimeType: 'application/pdf', size: 683,
      expenseId: index < 32 ? expense.id : null,
      status: index < 32 ? 'attached' : index < 40 ? 'unmatched' : 'removed',
      createdBy: expense.employeeId, createdAt: stamp(expense.transactionDate, '19:00'),
    }
  })
  const limitIncreaseRequests = Array.from({ length: 24 }, (_, index) => {
    const limit = limits[Math.max(0, index - 1)]
    const status = index < 10 ? 'pending' : index < 19 ? 'approved' : 'denied'
    return {
      id: index === 0 ? 'lir_design_workshop' : `lir_${pad(index + 1)}`,
      limitId: limit.id, requestedBy: limit.ownerId, additionalAmount: index === 0 ? 450 : 150 + index * 15,
      currency: limit.currency,
      reason: ['Additional seats for the workshop', 'Support the next project milestone', 'Cover remaining vendor costs'][index % 3],
      status, createdBy: limit.ownerId, createdAt: stamp('2026-11-11', '16:00'),
      ...(status !== 'pending' && {
        decidedBy: may, decidedAt: stamp('2026-11-12', '16:00'),
        decisionReason: status === 'denied' ? 'The current allocation covers the approved scope' : null,
      }),
    }
  })
  const activity = cards.slice(0, 24).map((card, index) => ({
    id: index === 0 ? 'act_design_card_issue' : `act_card_issue_${pad(index + 1)}`,
    action: 'card.issued', actorId: may, createdAt: card.createdAt, targetType: 'card', targetId: card.id,
    relatedIds: { holderId: card.holderId, limitId: card.limitId },
    changes: { status: { from: null, to: 'active' } },
  }))
  return {
    workspace: { id: 'wrk_northstar', name: 'Northstar Studio', currency: 'USD' },
    currentUser: { id: may, name: 'Maya Chen', role: 'finance_admin' },
    members, cards, expenses, receipts, limits, limitIncreaseRequests, activity,
  }
}
