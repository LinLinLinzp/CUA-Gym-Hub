import { EXPENSE, TRAVEL, cents, totalLines } from '../model.js'

const people = [
  ['riley', 'Riley Chen', 'Operations Program Manager', 'Operations', 'OPS-210', 'morgan'],
  ['morgan', 'Morgan Bell', 'Director of Operations', 'Operations', 'OPS-100', 'elena'],
  ['amara', 'Amara Okafor', 'Field Operations Lead', 'Operations', 'OPS-210', 'riley'],
  ['luis', 'Luis Romero', 'Logistics Coordinator', 'Operations', 'OPS-220', 'riley'],
  ['elena', 'Elena Park', 'VP, Business Operations', 'Operations', 'OPS-100'],
  ['isabel', 'Isabel Martin', 'Client Services Manager', 'Client Services', 'CS-310', 'elena'],
  ['devon', 'Devon Brooks', 'Finance Business Partner', 'Finance', 'FIN-120', 'morgan'],
  ['priya', 'Priya Desai', 'Project Controller', 'Finance', 'FIN-140', 'devon'],
  ['mateo', 'Mateo Silva', 'Client Delivery Specialist', 'Client Services', 'CS-320', 'isabel'],
  ['noelle', 'Noelle Hart', 'Facilities Coordinator', 'Operations', 'OPS-230', 'riley'],
]
const expenseThemes = [
  ['Denver field readiness workshop', 'Review installation plans with the field engineering team.'],
  ['Distribution center site visit', 'Assess receiving processes with the warehouse supervisor.'],
  ['Regional operations briefing', 'Present operating milestones and train regional leads.'],
  ['Vendor onboarding session', 'Walk the new supplier through service expectations.'],
  ['Quarterly inventory walkthrough', 'Reconcile physical inventory with the site coordinator.'],
  ['Client deployment support', 'Support the client team during equipment commissioning.'],
  ['Systems acceptance review', 'Verify acceptance criteria for the fall equipment release.'],
  ['Project controls workshop', 'Align cost tracking and reporting with project leads.'],
  ['Service readiness audit', 'Review field service documentation with local staff.'],
  ['Facilities inspection', 'Confirm access and space requirements at the project site.'],
  ['Project kickoff meeting', 'Agree on delivery scope and next steps with partners.'],
  ['Mobile equipment pilot', 'Test equipment and record feedback from crew leads.'],
]
const travelThemes = [
  ['Denver installation planning', 'Align installation sequencing with the Denver team.', 'Denver, CO'],
  ['Receiving process review', 'Walk through the new receiving lanes with site staff.', 'Columbus, OH'],
  ['Regional client workshop', 'Facilitate requirements sessions with the client engineering team.', 'Austin, TX'],
  ['Project handover', 'Transfer site documentation and train local operators.', 'Portland, OR'],
  ['Supplier assessment', 'Verify manufacturing capacity and review quality records.', 'Milwaukee, WI'],
  ['Operations planning summit', 'Set field team priorities for the next delivery cycle.', 'Minneapolis, MN'],
  ['Warehouse safety review', 'Complete the annual safety walkthrough with local leads.', 'Charlotte, NC'],
  ['Equipment acceptance visit', 'Witness load tests and complete the acceptance checklist.', 'Phoenix, AZ'],
  ['Partner implementation review', 'Review milestones and staffing with the implementation partner.', 'Raleigh, NC'],
  ['Systems rollout preparation', 'Validate the rollout schedule and site readiness.', 'Seattle, WA'],
  ['Client training visit', 'Lead hands-on training for the client support team.', 'Providence, RI'],
]
const programs = ['North region', 'Fall rollout', 'Client services', 'Winter planning']
const hotels = [
  ['Lodging', 'Juniper House Hotel', 224.4, 'juniper-house-receipt.svg', '2026-11-08', 1218],
  ['Ground Transport', 'Blue Fern Rail', 168.5, 'blue-fern-rail-receipt.svg', '2026-10-28', 1207],
  ['Office Supplies', 'Ridgeway Supply Co.', 118.75, 'ridgeway-supply-receipt.svg', '2026-10-19', 1219],
]
const smallExpenses = [
  ['Meals', 'Cedar Street Kitchen', 'Meal during field work'],
  ['Ground Transport', 'Cityline Shuttle', 'Local ground transportation'],
  ['Office Supplies', 'Aster Office Market', 'Materials for the onsite team'],
  ['Meals', 'Maple Junction Café', 'Working lunch between sessions'],
  ['Ground Transport', 'Harbor Loop Parking', 'Parking at the project site'],
]
const origins = ['Boston, MA', 'Hartford, CT', 'Albany, NY', 'Newark, NJ']
const states = ['draft', 'pending_approval', 'sent_back', 'approved', 'draft', 'approved', 'draft']
const date = (offset, hour = 15) => new Date(Date.UTC(2026, 10, 18 + offset, hour, 20)).toISOString()
const days = offset => date(offset).slice(0, 10)

export function createInitialData() {
  const users = people.map(([id, name, roleTitle, department, costCenter, manager]) => ({
    id: 'u-' + id, name, roleTitle, department, costCenter, ...(manager && { managerId: 'u-' + manager }),
  }))
  const byId = new Map(users.map(user => [user.id, user]))
  const activity = []
  const approvals = []

  function makeDocument(type, index) {
    const expense = type === EXPENSE
    const reserved = expense ? [45, 46] : [39, 40]
    const id = (expense ? 'ER-' + (1000 + index) : 'TR-' + (2000 + index))
    const mine = index <= (expense ? 28 : 26)
    const peerPool = ['amara', 'luis', 'noelle', 'devon', 'priya', 'mateo', 'isabel']
    const ownerId = 'u-' + (mine ? 'riley' : reserved.includes(index) ? (expense ? 'amara' : 'luis') : peerPool[index % peerPool.length])
    const owner = byId.get(ownerId)
    const status = reserved.includes(index) ? 'pending_approval' :
      expense && index % 8 === 0 ? 'paid' : states[(index - 1) % states.length]
    const themes = expense ? expenseThemes : travelThemes
    const [name, businessPurpose, destination] = themes[(index - 1) % themes.length]
    const title = index <= themes.length ? name : name + ' · ' + programs[Math.floor((index - 1) / themes.length) % programs.length]
    const offset = -1 - ((index * 5 + (expense ? 0 : 3)) % 34)
    const createdAt = date(offset - 6, 10)
    const updatedAt = date(offset)
    const document = { id, ownerId, title, businessPurpose, costCenter: owner.costCenter, currency: 'USD', status, createdAt, updatedAt }

    if (expense) {
      const reportDate = days(offset - 2)
      const count = 1 + (index % 4)
      const entries = Array.from({ length: count }, (_, lineIndex) => {
        const pick = smallExpenses[(index + lineIndex) % smallExpenses.length]
        const [category, merchant, description] = pick
        const amount = (1130 + ((index * 243 + lineIndex * 961) % 5800)) / 100
        const line = { id: 'EE-' + (4000 + index * 10 + lineIndex), createdBy: ownerId, createdAt, updatedAt,
          transactionDate: reportDate, category, merchant, amount, quantity: 1,
          paymentType: (index + lineIndex) % 3 ? 'out_of_pocket' : 'company_card', description }
        if (lineIndex === 0 && index % 4 !== 1) {
          const [largeCategory, largeMerchant, largeAmount, fileName, transactionDate, size] = hotels[index % hotels.length]
          if (transactionDate > reportDate) return line
          Object.assign(line, { category: largeCategory, merchant: largeMerchant, transactionDate, amount: largeAmount,
            description: 'Field operations expense', receipt: { fileName, url: '/receipts/' + fileName, contentType: 'image/svg+xml', size, attachedAt: updatedAt, attachedBy: ownerId } })
        }
        return line
      })
      Object.assign(document, { reportDate, entries, totalAmount: totalLines(type, entries) })
    } else {
      const startOffset = -5 + index
      const expectedExpenses = [
        ['Airfare', 'Round-trip economy travel to ' + destination, 1, 210 + (index * 47) % 430 + .5],
        ['Lodging', 'Hotel near the project site', Math.max(1, index % 5), 108 + (index * 17) % 110 + .25],
        ['Ground Transport', 'Transfers between the terminal and project site', 2, 22 + index % 19 + .5],
        ['Meals', 'Meals during site work', 1 + index % 5, 37.5],
      ].slice(0, 2 + (index % 3)).map(([category, description, quantity, unitAmount], lineIndex) => ({
        id: 'XE-' + (3000 + index * 10 + lineIndex), createdBy: ownerId, createdAt, updatedAt,
        category, description, quantity, unitAmount, lineTotal: cents(unitAmount) * quantity / 100,
      }))
      Object.assign(document, { origin: origins[index % origins.length], destination, startDate: days(startOffset),
        endDate: days(startOffset + index % 5), expectedExpenses, estimatedTotal: totalLines(type, expectedExpenses) })
    }

    const amount = expense ? document.totalAmount : document.estimatedTotal
    const baseEvent = { subjectType: type, subjectId: id, subjectTitle: title, amount, currency: 'USD' }
    function addEvent(action, actorId, time, eventStatus, fields = {}) {
      activity.push({ id: 'ACT-' + (7001 + activity.length), action, actorId, createdAt: time, status: eventStatus, ...baseEvent, ...fields })
    }
    addEvent('created', ownerId, createdAt, 'draft')
    const recalled = status === 'draft' && index % 5 === 0
    if (status !== 'draft' || recalled) {
      const approverId = owner.managerId || 'u-morgan'
      const submittedAt = date(offset - 2, 11)
      const approvalStatus = recalled ? 'recalled' : status === 'pending_approval' ? 'pending' : status === 'paid' ? 'approved' : status
      const approval = { id: 'APR-' + (3001 + approvals.length), subjectType: type, subjectId: id, subjectTitle: title,
        submitterId: ownerId, submitterName: owner.name, approverId, status: approvalStatus, currency: 'USD', amount, createdAt: submittedAt }
      Object.assign(document, { approverId, submittedAt })
      addEvent('submitted', ownerId, submittedAt, 'pending_approval', { approvalId: approval.id })
      if (approvalStatus !== 'pending') {
        approval.decidedBy = recalled ? ownerId : approverId
        approval.decidedAt = updatedAt
        if (approvalStatus === 'sent_back') {
          approval.comment = expense ? 'Please clarify how this expense supports the project.' : 'Please clarify the site visit agenda and ground transportation estimate.'
        }
        addEvent(approvalStatus, approval.decidedBy, updatedAt, status, { approvalId: approval.id, ...(approval.comment && { comment: approval.comment }) })
      }
      approvals.push(approval)
    }
    return document
  }

  const expenseReports = Array.from({ length: 48 }, (_, index) => makeDocument(EXPENSE, index + 1))
  const travelRequests = Array.from({ length: 42 }, (_, index) => makeDocument(TRAVEL, index + 1))
  return { account: { activeUserId: 'u-riley', organizationName: 'Alder Ridge Engineering', currency: 'USD' },
    users, expenseReports, travelRequests, approvals, activity }
}
