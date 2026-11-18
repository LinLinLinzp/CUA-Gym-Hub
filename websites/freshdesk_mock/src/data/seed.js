import { PRIORITIES, SOURCES, STATUSES, TYPES, slaFields } from './model.js'

const teamData = [
  ['logistics', 'Logistics', 'Shipment and warehouse support', 'Freight and delivery'],
  ['billing', 'Billing', 'Invoices and account adjustments', 'Billing and credits'],
  ['suppliers', 'Supplier operations', 'Supplier intake and documentation', 'Supplier onboarding'],
  ['access', 'Site access', 'Visitor credentials and shift access', 'Access and scheduling'],
  ['equipment', 'Equipment support', 'Facility equipment and maintenance', 'Equipment and maintenance'],
  ['service', 'Service desk', 'General account and portal support', 'Account and portal'],
]
const agentNames = ['Morgan Ellis', 'Jordan Reyes', 'Avery Chen', 'Samir Desai', 'Taylor Cole', 'Casey Okafor',
  'Riley Shaw', 'Jamie Navarro', 'Robin Brooks', 'Parker Reed', 'Mina Park', 'Alex Rivera']
const contactNames = ['Drew Patel', 'Nora Kim', 'Amelia Ortiz', 'Maya Bennett', 'Devon Price', 'Leah Diallo',
  'Miles Foster', 'Rosa Ibarra', 'Aisha Malik', 'Theo Martin', 'Hannah Wu', 'Kiran Shah',
  'Eva Costa', 'Noel Garcia', 'Isaac Ford', 'Claire Sato', 'Sonia Rao', 'Liam Hayes', 'Jonah Lim', 'Ruth Allen',
  'Elena Silva', 'Adam Wells', 'Marta King', 'Evan Bell', 'Layla Hassan', 'Owen Green', 'Grace Lin',
  'Imani Scott', 'Akira Tan', 'Priya Nair', 'Dylan Cruz', 'Finn West', 'Naomi James', 'Zoe Hill',
  'Omar Ali', 'Luis Vega', 'Mila Ross', 'Hugo Lee', 'Anna Hart', 'Tariq Moore']
const companies = ['Cedar Point Supply', 'Eastbank Foods', 'Harbor Lane Freight', 'Orchard Tools', 'Pine Ridge Retail',
  'Mariner Packaging', 'Bridgeview Parts', 'Millstone Distribution']

const cases = [
  [
    ['Freight pickup missed at Dock 3', 'The driver did not check in for the afternoon pickup. Can dispatch confirm a replacement slot?'],
    ['Pallet count differs from packing slip', 'The inbound team counted eighteen pallets against the slip showing twenty. Please reconcile the receiving scan.'],
    ['Change receiving slot for Tuesday', 'The cold room is reserved in the morning. Could we move the delivery to the afternoon receiving window?'],
    ['Delivery scan missing for Route 12', 'The driver confirmed the stop, but the delivery scan has not appeared in the portal.'],
    ['Outbound labels print with old address', 'Labels for the west depot still show the previous street address. Is the destination file up to date?'],
    ['Gate seal recorded against wrong trailer', 'The seal number in the gate log belongs to the trailer in the adjacent bay.'],
    ['Tote return count needs reconciling', 'The carrier picked up six stacks of totes. Only four are marked returned on the dashboard.'],
    ['Confirm delivery window for depot transfer', 'We need a receiving window for the transfer from South Yard before the truck can be dispatched.'],
  ],
  [
    ['Duplicate invoice for November freight', 'Both invoices list the same shipment reference and arrival date. Can one be reviewed for a credit?'],
    ['Credit memo missing from statement', 'The approved credit for damaged cartons is absent from the latest account statement.'],
    ['Purchase order omitted from invoice', 'Accounts payable needs the purchase order reference added before they can process the invoice.'],
    ['Request a copy of September statement', 'Our finance team needs the September statement to close the quarter.'],
    ['Freight surcharge differs from agreement', 'The surcharge appears higher than the amount in the current rate card.'],
    ['Update invoice distribution email', 'Please direct new invoices to the central payables inbox starting next week.'],
    ['Payment applied to the wrong site', 'Our remittance was for the east warehouse but shows against the central warehouse balance.'],
    ['Invoice quantities differ from receipt', 'The invoice lists units that were returned during receiving. Can billing review the adjustment?'],
  ],
  [
    ['Supplier onboarding packet needs review', 'We submitted the insurance certificate and tax form on Monday. Is anything outstanding?'],
    ['Insurance certificate expires this month', 'The supplier uploaded a renewal certificate and wants to confirm it is attached to their account.'],
    ['Duplicate supplier record after intake', 'The intake form generated two profiles for the same company. Please confirm which ID to use.'],
    ['Add secondary supplier contact', 'Please add the quality lead as a contact for receiving and product recalls.'],
    ['Supplier intake link has expired', 'The onboarding invitation shows as expired when our vendor opens it.'],
    ['Warehouse compliance form returned', 'The form was returned without notes. Which fields need to be corrected before resubmitting?'],
    ['Update lead time on vendor profile', 'The vendor has moved its packaging line and needs to update standard production lead time.'],
    ['Confirm approved vendor reference', 'Procurement is ready to place the order and needs the approved reference number.'],
  ],
  [
    ['Night shift badge stops at mezzanine door', 'The badge opens the main entrance, but the mezzanine reader rejects it during the night shift.'],
    ['Arrange access for visiting technician', 'A technician will arrive for a conveyor inspection and needs a temporary badge at the west gate.'],
    ['Weekend gate schedule needs confirmation', 'The maintenance crew is arriving early Saturday. Will the south gate be staffed?'],
    ['Remove access for former contractor', 'The contract ended yesterday. Please remove the badge from the active access list.'],
    ['Visitor kiosk does not print passes', 'The kiosk accepts the details but the pass does not print. Staff are signing visitors in by hand.'],
    ['Request badge for receiving supervisor', 'A new supervisor is covering the late receiving shift and requires warehouse access.'],
    ['Loading bay access denied after shift change', 'My rotation moved to evenings and the loading bay reader no longer grants access.'],
    ['Reserve training room for safety briefing', 'The morning briefing needs a room near the production floor for twelve attendees.'],
  ],
  [
    ['Dock scanner fails after battery swap', 'The screen powers on but the scanner no longer reads carton barcodes after the swap.'],
    ['Conveyor belt drifts on Line B', 'The belt moves toward the guard on startup. We stopped the line for an inspection.'],
    ['Schedule forklift inspection', 'The unit is due for its monthly check. Could a technician come before the Thursday loading shift?'],
    ['Temperature logger stopped reporting', 'The cold storage logger has been offline since the power interruption.'],
    ['Request replacement thermal printer', 'The label printer feeds continuously and shows a sensor error on every job.'],
    ['Handheld terminal will not hold charge', 'The terminal shuts down after twenty minutes even with a fully charged spare battery.'],
    ['Cooling unit shows high-pressure warning', 'A warning appeared during startup. The unit has been left off pending a technician review.'],
    ['Verify service history for lift platform', 'Please confirm the date and scope of the platform’s last preventive maintenance visit.'],
  ],
  [
    ['Account invitation returns an error', 'The invited team member sees an error immediately after opening the account activation link.'],
    ['Portal export missing October transactions', 'Only November entries appear in the spreadsheet even though the on-screen report includes October.'],
    ['Update primary account contact', 'The previous account contact moved to a new role. Please update the directory entry.'],
    ['Report downloads with blank columns', 'The warehouse utilization export has empty location and capacity columns.'],
    ['Portal shows archived locations', 'The location menu still lists two buildings that were retired last quarter.'],
    ['Recurring report uses wrong time zone', 'The daily report is dated one day earlier for our overnight team.'],
    ['Team member cannot see shared dashboard', 'The user can sign in but the operations dashboard does not appear in their navigation.'],
    ['Question about portal maintenance window', 'Will the portal be available for dispatch confirmations during Sunday maintenance?'],
  ],
]

const templates = [
  [
    ['Confirm pickup investigation', 'pickup-check', 'Hi {{ticket.requester.name}}, we are checking pickup details for #{{ticket.id}} ({{ticket.subject}}).'],
    ['Request delivery evidence', 'delivery-proof', 'Please send the carrier name and the delivery scan or signed receipt for this shipment.'],
    ['Receiving window confirmed', 'receiving-slot', 'The receiving team has confirmed the revised window. Please ask the driver to check in at the gate.'],
    ['Check pallet discrepancy', 'pallet-count', 'Please share a photo of the packing slip and the actual pallet count recorded at receiving.'],
    ['Carrier follow-up', 'carrier-update', 'We contacted the carrier and will update ticket #{{ticket.id}} when dispatch confirms the route.'],
    ['Outbound label check', 'label-check', 'Please share a sample of the label and its intended warehouse so we can verify the routing file.'],
  ],
  [
    ['Invoice investigation', 'invoice-review', 'Hi {{ticket.requester.name}}, billing is comparing the invoice with your order and receipt.'],
    ['Request invoice reference', 'invoice-ref', 'Please provide the invoice number and the purchase order listed on your statement.'],
    ['Credit under review', 'credit-review', 'We have routed the credit request to billing. We will update #{{ticket.id}} after review.'],
    ['Statement requested', 'statement-copy', 'We are locating the statement. Please confirm the statement month and the site it covers.'],
    ['Payment allocation check', 'payment-match', 'Please share the remittance reference and settlement date so we can trace the payment.'],
    ['Rate card verification', 'rate-check', 'We are checking the surcharge against the rate card that applied on the shipping date.'],
  ],
  [
    ['Intake received', 'intake-confirm', 'Hi {{ticket.requester.name}}, supplier operations has received the onboarding packet.'],
    ['Insurance details needed', 'insurance-copy', 'Please attach a current certificate of insurance that shows your legal business name and policy dates.'],
    ['Verify supplier profile', 'vendor-profile', 'Please confirm your supplier reference and legal business name so we can find the correct profile.'],
    ['Compliance form follow-up', 'compliance-form', 'We are reviewing the compliance form and will post remaining requirements under #{{ticket.id}}.'],
    ['Confirm supplier contact', 'vendor-contact', 'Please send the new contact’s name, job title and work email address.'],
    ['Vendor approval review', 'vendor-approval', 'We will confirm the supplier reference once onboarding and procurement finish their reviews.'],
  ],
  [
    ['Badge issue next steps', 'badge-check', 'Please share the door location, approximate time and last four digits of the badge number.'],
    ['Visitor access request', 'visitor-access', 'Please confirm the visitor’s name, host, arrival window and worksite.'],
    ['Gate schedule confirmation', 'gate-schedule', 'The site supervisor is verifying gate coverage. We will post the confirmed hours to #{{ticket.id}}.'],
    ['Contractor access update', 'contractor-access', 'We are verifying the end date and the badge record before updating site access.'],
    ['Alternate check-in point', 'checkin-alt', 'Please use the staffed reception desk for check-in while we review the kiosk issue.'],
    ['Shift access verification', 'shift-access', 'Please send the effective date of the schedule change and the doors needed for the new shift.'],
  ],
  [
    ['Equipment triage request', 'equipment-triage', 'Hi {{ticket.requester.name}}, please send the asset tag, worksite and the message shown on the display.'],
    ['Inspection scheduling', 'inspection-slot', 'Please provide two windows when the asset can be checked without interrupting the shift.'],
    ['Equipment service history', 'asset-history', 'We are checking the maintenance log for the equipment referenced in {{ticket.subject}}.'],
    ['Replacement request received', 'asset-replace', 'We received the replacement request and are checking available stock with the site team.'],
    ['Printer fault follow-up', 'printer-fault', 'Please share the model number and the error displayed when the printer feeds a label.'],
    ['Equipment status update', 'asset-update', 'A technician is reviewing the maintenance request. Updates will be recorded on #{{ticket.id}}.'],
  ],
  [
    ['Acknowledge portal issue', 'portal-ack', 'Hi {{ticket.requester.name}}, we are reviewing {{ticket.subject}} and will follow up on ticket #{{ticket.id}}.'],
    ['Request export settings', 'export-settings', 'Please share the report name, date range and filters used to generate the export.'],
    ['Verify account contact', 'account-contact', 'Please confirm the affected account and the new contact’s business email address.'],
    ['Check invitation details', 'invite-review', 'Please confirm the invited address and when the invitation was opened so we can check its status.'],
    ['Dashboard access review', 'dashboard-access', 'We are checking workspace membership and dashboard sharing for the affected user.'],
    ['Share maintenance timing', 'maintenance-window', 'We are verifying the maintenance window and will update #{{ticket.id}} with the confirmed schedule.'],
  ],
]

const policyNames = [
  ['Priority freight', 'Depot portal requests', 'Carrier incident desk', 'Freight phone coverage'],
  ['Invoice review', 'Portal billing support', 'Billing issue intake', 'Billing email coverage'],
  ['Supplier intake', 'Vendor portal requests', 'Supplier issue escalation', 'Supplier phone coverage'],
  ['Site access incidents', 'Badge portal requests', 'Security desk inquiries', 'Site access email'],
  ['Equipment incident response', 'Maintenance intake', 'Equipment issues desk', 'Equipment phone support'],
  ['Portal service desk', 'Account requests', 'Portal access inquiries'],
]

const pad = number => String(number).padStart(2, '0')
const slug = name => name.toLowerCase().replaceAll(' ', '.')
const historyStart = '2026-10-01T14:00:00.000Z'
const anchor = Date.parse('2026-11-18T09:20:00.000Z')
const offset = (date, minutes) => new Date(Date.parse(date) + minutes * 60000).toISOString()
const targetMatrix = scale => Object.fromEntries(PRIORITIES.map((priority, index) => {
  const factor = 2 ** (3 - index) * scale
  return [priority, { firstResponseMinutes: 30 * factor, everyResponseMinutes: 60 * factor, resolutionMinutes: 240 * factor }]
}))

export function createInitialData() {
  const groups = teamData.map(([key, name, description]) => ({ id: `grp-${key}`, name, description }))
  const agents = agentNames.map((name, index) => ({
    id: `agt-${pad(index + 1)}`, name, email: `${slug(name)}@northline.example.test`,
    role: index === 0 ? 'admin' : 'agent',
    groupIds: [...new Set([groups[index % groups.length].id, groups[(index + 1) % groups.length].id,
      ...(index === 0 ? ['grp-service'] : [])])],
  }))
  const contacts = contactNames.map((name, index) => ({
    id: `con-${pad(index + 1)}`, name, email: `${slug(name)}@example.test`,
    company: companies[index % companies.length], createdAt: historyStart, createdBy: 'agt-01',
  }))
  const businessSchedules = [{ id: 'biz-ops', name: 'Operations hours (UTC)', timeZone: 'UTC',
    weekdays: [1, 2, 3, 4, 5], startMinute: 540, endMinute: 1020 }]
  const slaPolicies = []
  for (const [groupIndex, names] of policyNames.entries()) {
    for (const [index, name] of names.entries()) {
      const group = groups[groupIndex]
      const hoursMode = index === 1 || index === 3 ? 'business' : 'calendar'
      slaPolicies.push({
        id: index === 0 ? `sla-${teamData[groupIndex][0]}` : `sla-${teamData[groupIndex][0]}-${index + 1}`,
        name, description: `${group.name} coverage for ${['incidents', 'portal and intake requests', 'problem reports', 'direct support'][index]}.`,
        enabled: index !== 3 && !(index === 2 && groupIndex % 2 === 0), isDefault: false, rank: slaPolicies.length + 1,
        matchMode: index === 2 ? 'any' : 'all', conditions: [{ field: 'groupId', value: group.id },
          { field: index === 1 || index === 3 ? 'source' : 'type', value: ['incident', 'portal', 'problem', 'phone'][index] }],
        hoursMode, scheduleId: hoursMode === 'business' ? 'biz-ops' : null, targets: targetMatrix(index === 1 ? 2 : 1),
        createdBy: 'agt-01', createdAt: historyStart, updatedAt: historyStart, deletedAt: null,
      })
    }
  }
  slaPolicies.push({ id: 'sla-default', name: 'Default SLA', description: 'Standard account response and resolution targets.',
    enabled: true, isDefault: true, rank: slaPolicies.length + 1, matchMode: 'all', conditions: [], hoursMode: 'calendar',
    scheduleId: null, targets: targetMatrix(3), createdBy: 'agt-01', createdAt: historyStart, updatedAt: historyStart, deletedAt: null })

  const cannedResponseFolders = teamData.map(([key, , , name]) => ({
    id: `crf-${key === 'logistics' ? 'freight' : key}`, name, createdBy: 'agt-01', createdAt: historyStart, updatedAt: historyStart,
  }))
  const cannedResponses = templates.flatMap((items, groupIndex) => items.map(([title, shortCode, body], index) => {
    const visibility = (index === 0 && groupIndex === 0) || index === 3 ? 'groups' : index === 5 ? 'myself' : 'everyone'
    return {
      id: `cr-${String(groupIndex * 6 + index + 1).padStart(3, '0')}`, folderId: cannedResponseFolders[groupIndex].id,
      title, body, shortCode, visibility, groupIds: visibility === 'groups' ? [groups[groupIndex].id] : [],
      ownerId: index !== 5 || groupIndex % 2 === 0 ? 'agt-01' : 'agt-02',
      createdAt: historyStart, updatedAt: historyStart, deletedAt: null,
    }
  }))

  const tickets = []
  const ticketConversations = []
  const ticketEvents = []
  function addMessage(ticket, actorId, kind, visibility, body, createdAt) {
    const id = `msg-${String(ticketConversations.length + 1).padStart(3, '0')}`
    ticketConversations.push({ id, ticketId: ticket.id, authorId: actorId, kind, visibility, body, cannedResponseIds: [], createdAt })
    const type = kind === 'reply' ? 'reply_sent' : kind === 'note' ? 'note_added' : 'customer_reply_received'
    const changes = { updatedAt: { from: ticket.updatedAt, to: createdAt } }
    if (kind === 'reply') {
      changes.firstRespondedAt = { from: null, to: createdAt }
      changes.lastRespondedAt = { from: null, to: createdAt }
    } else if (kind === 'customer_reply') {
      changes.lastCustomerReplyAt = { from: null, to: createdAt }
      changes.nextResponseDueAt = { from: null, to: ticket.nextResponseDueAt }
    }
    ticketEvents.push({ id: `te-${ticketEvents.length + 1}`, ticketId: ticket.id, type, actorId, createdAt, changes, conversationId: id })
    ticket.updatedAt = createdAt
  }

  for (let caseIndex = 0; caseIndex < cases[0].length; caseIndex++) {
    for (const [groupIndex, groupCases] of cases.entries()) {
      const index = tickets.length
      const [subject, description] = groupCases[caseIndex]
      const group = groups[groupIndex]
      const requesterId = contacts[index % contacts.length].id
      const assigned = agents.filter(agent => agent.groupIds.includes(group.id))
      const assigneeId = index % 7 === 5 || index % 7 === 6 ? null : assigned[caseIndex % assigned.length].id
      const createdAt = new Date(anchor - index * 123 * 60000).toISOString()
      const status = caseIndex === 0 ? (groupIndex % 3 !== 2 ? 'open' : 'pending') : STATUSES[(caseIndex + groupIndex) % STATUSES.length]
      const priority = PRIORITIES[(index + 2) % PRIORITIES.length]
      const number = 1048 - index
      const ticket = {
        id: `tkt-${number}`, number, subject, description, requesterId, status, priority,
        type: index === 0 ? 'incident' : TYPES[(caseIndex + groupIndex) % TYPES.length],
        source: SOURCES[(caseIndex + groupIndex) % SOURCES.length], groupId: group.id, assigneeId,
        tags: [teamData[groupIndex][0]], createdBy: 'agt-01', createdAt, updatedAt: createdAt,
        resolvedAt: null, closedAt: null, firstRespondedAt: null, lastRespondedAt: null, lastCustomerReplyAt: null,
        firstResponseDueOverrideAt: null, resolutionDueOverrideAt: null,
      }
      Object.assign(ticket, slaFields({ slaPolicies, businessSchedules }, ticket, { creating: true }))
      ticketEvents.push({ id: `te-${ticketEvents.length + 1}`, ticketId: ticket.id, type: 'created',
        actorId: 'agt-01', createdAt, changes: {}, conversationId: null })
      const responder = assigneeId || assigned[0].id
      addMessage(ticket, responder, 'note', 'private', index === 0 ? 'Dispatch is checking the pickup log.' :
        `Routed to ${group.name} for initial review.`, offset(createdAt, 10))
      if (index % 3 !== 0 || status === 'closed' || status === 'resolved') {
        ticket.firstRespondedAt = offset(createdAt, 25)
        ticket.lastRespondedAt = ticket.firstRespondedAt
        addMessage(ticket, responder, 'reply', 'public',
          `Thanks for flagging this, ${contacts[index % contacts.length].name.split(' ')[0]}. We’ve recorded the details and will follow up here.`, ticket.firstRespondedAt)
      }
      if (ticket.firstRespondedAt && index % 5 === 0 && (status === 'open' || status === 'pending')) {
        ticket.lastCustomerReplyAt = offset(createdAt, 45)
        ticket.nextResponseDueAt = slaFields({ slaPolicies, businessSchedules }, ticket).nextResponseDueAt
        addMessage(ticket, requesterId, 'customer_reply', 'public', 'Thanks for the update. Please let us know when you have an estimated timeline.', ticket.lastCustomerReplyAt)
      }
      if (status === 'resolved' || status === 'closed') {
        ticket.resolvedAt = offset(createdAt, 90)
        ticket.closedAt = status === 'closed' ? offset(createdAt, 110) : null
        const updatedAt = ticket.closedAt || ticket.resolvedAt
        ticketEvents.push({ id: `te-${ticketEvents.length + 1}`, ticketId: ticket.id, type: 'updated', actorId: responder, createdAt: updatedAt,
          changes: { status: { from: 'open', to: status }, resolvedAt: { from: null, to: ticket.resolvedAt },
            ...(ticket.closedAt && { closedAt: { from: null, to: ticket.closedAt } }), updatedAt: { from: ticket.updatedAt, to: updatedAt } }, conversationId: null })
        ticket.updatedAt = updatedAt
      }
      tickets.push(ticket)
    }
  }
  return {
    account: { id: 'acct-ops', name: 'Northline Operations', currentAgentId: 'agt-01' }, agents, groups, contacts, tickets,
    ticketConversations, ticketEvents, slaPolicies, businessSchedules, cannedResponseFolders, cannedResponses, adminEvents: [],
  }
}
