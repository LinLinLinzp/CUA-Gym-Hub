import { dateDay, dayDate } from './schedule.js'
import { APPROVAL_OPTIONS, projectColumns, projectDefaults } from './sheets.js'

const people = [
  ['Avery Morgan', 'Program Manager'], ['Leah Brooks', 'Operations Lead'], ['Jules Bennett', 'Product Designer'],
  ['Nora Patel', 'Release Manager'], ['Caleb Chen', 'Engineering Lead'], ['Iris Bell', 'Brand Strategist'],
  ['Evan Rivera', 'Quality Lead'], ['Sofia Park', 'Customer Success Manager'], ['Owen Foster', 'Facilities Manager'],
  ['Maya Reed', 'Finance Analyst'], ['Miles Hayes', 'People Partner'], ['Tessa Walsh', 'Marketing Manager'],
  ['Liam Kim', 'IT Service Lead'], ['Chloe Price', 'Technical Writer'], ['Theo Singh', 'Implementation Specialist'],
  ['Amara Stone', 'Procurement Specialist'], ['Finn Wood', 'Account Manager'], ['Ella Patel', 'Workplace Coordinator'],
  ['Noah Diaz', 'Data Analyst'], ['Lena Ford', 'Content Designer'], ['Ravi Shah', 'Security Engineer'],
  ['Ivy Martins', 'Support Specialist'], ['Dylan Scott', 'Product Manager'], ['Priya Lewis', 'Project Coordinator'],
  ['Jasper Cole', 'Systems Administrator'], ['Grace Zhao', 'Business Analyst'], ['Sam Ellis', 'UX Researcher'],
  ['Mia Carter', 'Payroll Specialist'], ['Hugo Ross', 'Vendor Manager'], ['Isabel Moore', 'Communications Lead'],
]

const workspaceFixtures = [
  ['launch', 'Product Launch', 'Release schedules, product sign-offs, and launch readiness', [
    ['launch_plan', 'Launch Delivery Plan'], ['release_readiness', 'Release Readiness Checklist'], ['beta_feedback', 'Beta Feedback Tracker'],
    ['rollout', 'Regional Rollout'], ['launch_assets', 'Launch Asset Requests'],
  ]],
  ['operations', 'Operations', 'Shared tracking for operations and vendors', [
    ['vendor_intake', 'Vendor Request Log'], ['purchasing', 'Purchase Requests'], ['suppliers', 'Supplier Review Schedule'],
    ['exceptions', 'Operations Exceptions'], ['service_improvements', 'Service Improvement Queue'],
  ]],
  ['success', 'Customer Success', 'Customer onboarding, adoption, and account reviews', [
    ['enterprise_onboarding', 'Enterprise Onboarding'], ['renewal', 'Renewal Calendar'], ['customer_escalations', 'Customer Escalations'],
    ['training', 'Customer Training Requests'], ['success_reviews', 'Quarterly Success Reviews'],
  ]],
  ['facilities', 'Facilities', 'Workplace projects, access, and maintenance', [
    ['facilities_refresh', 'Facilities Refresh'], ['office_access', 'Office Access Requests'], ['maintenance', 'Maintenance Schedule'],
    ['equipment', 'Equipment Inventory'], ['room_bookings', 'Training Room Bookings'],
  ]],
  ['finance', 'Finance', 'Budgets, expenses, and month-end reporting', [
    ['forecast', 'Department Budget Forecast'], ['expenses', 'Expense Exception Review'], ['invoices', 'Invoice Follow-up'], ['close', 'Month-end Close'],
  ]],
  ['people', 'People', 'Hiring, onboarding, and internal programs', [
    ['onboarding_requests', 'Onboarding Requests'], ['hiring', 'Hiring Coordination'], ['employee_programs', 'Employee Programs'], ['learning', 'Learning Budget Requests'],
  ]],
  ['marketing', 'Marketing', 'Campaigns, content, and event delivery', [
    ['campaign_calendar', 'Campaign Calendar'], ['creative_intake', 'Creative Brief Intake'], ['events', 'Field Events'], ['web', 'Website Content Updates'],
  ]],
  ['it', 'IT', 'Internal support requests and service operations', [
    ['it_intake', 'IT Service Requests'], ['licenses', 'License Renewals'], ['devices', 'Device Rollout'], ['security', 'Security Review Queue'],
  ]],
]

const workItems = [
  ['Confirm release checklist', 'Review rollout dependencies', 'Collect regional feedback', 'Update release notes', 'Schedule stakeholder walkthrough', 'Verify support handoff', 'Review launch assets', 'Confirm sign-off owner', 'Prepare readiness report', 'Close remaining action items'],
  ['Review supplier documents', 'Confirm site access', 'Validate cost estimate', 'Share service schedule', 'Check insurance dates', 'Confirm delivery window', 'Resolve invoice mismatch', 'Collect approval details', 'Update contract information', 'Review service coverage'],
  ['Book customer kickoff', 'Confirm account contacts', 'Review onboarding goals', 'Prepare training materials', 'Capture adoption feedback', 'Check renewal timeline', 'Follow up on open issues', 'Share product guidance', 'Complete account review', 'Record customer next steps'],
  ['Inspect meeting rooms', 'Confirm installation window', 'Review building access', 'Coordinate vendor visit', 'Update equipment list', 'Confirm electrical checks', 'Test wayfinding signage', 'Book workspace walkthrough', 'Update maintenance logs', 'Review safety checklist'],
  ['Reconcile department spend', 'Check invoice coding', 'Confirm budget allocation', 'Review cost center changes', 'Verify purchase order', 'Collect expense documentation', 'Update forecast assumptions', 'Review pending payments', 'Prepare variance summary', 'Complete close checklist'],
  ['Confirm new starter details', 'Schedule hiring panel', 'Review orientation checklist', 'Collect training requests', 'Confirm manager assignment', 'Book employee session', 'Share program materials', 'Update learning budget', 'Review benefits guidance', 'Close follow-up tasks'],
  ['Review campaign brief', 'Draft event announcement', 'Confirm asset handoff', 'Check landing page copy', 'Approve audience segment', 'Prepare partner toolkit', 'Book event support', 'Collect creative feedback', 'Schedule publication', 'Review campaign results'],
  ['Confirm service owner', 'Review access request', 'Schedule device enrollment', 'Check renewal terms', 'Validate backup status', 'Assign security review', 'Document support process', 'Update software inventory', 'Verify endpoint configuration', 'Close service ticket'],
]

const launchTasks = [
  ['row_launch_kickoff', 'Launch kickoff', '2026-11-16', '2026-11-16', 1, []],
  ['row_launch_design', 'Design handoff', '2026-11-17', '2026-11-19', 3, ['row_launch_kickoff']],
  ['row_launch_build', 'Build release candidate', '2026-11-20', '2026-11-23', 2, ['row_launch_design']],
  ['row_launch_review', 'Launch readiness review', '2026-11-24', '2026-11-24', 0, ['row_launch_build']],
  ['row_launch_enablement', 'Draft field enablement guide', '2026-11-17', '2026-11-23', 5, []],
  ['row_launch_security', 'Complete product security review', '2026-11-25', '2026-11-27', 2, []],
  ['row_launch_qa', 'Run end-to-end release checks', '2026-11-30', '2026-12-02', 3, []],
  ['row_launch_support', 'Brief customer support', '2026-12-01', '2026-12-03', 3, []],
  ['row_launch_demo', 'Record customer walkthrough', '2026-12-03', '2026-12-07', 3, []],
  ['row_launch_rollout', 'Regional launch window', '2026-12-08', '2026-12-08', 0, []],
]
const launchBacklog = [
  'Verify analytics events', 'Review translation requests', 'Prepare community announcement', 'Publish release summary',
  'Check accessibility findings', 'Confirm launch day coverage', 'Review service dashboards', 'Prepare feedback survey',
  'Draft onboarding email', 'Audit help center links', 'Confirm infrastructure contacts', 'Send partner preview',
  'Reserve launch briefing room', 'Confirm billing FAQ', 'Check data retention notice', 'Review product screenshots',
  'Verify device compatibility', 'Update incident playbook', 'Collect launch metrics', 'Schedule rollout retrospective',
  'Review pilot lessons', 'File outstanding enhancement requests',
]
const vendorTasks = [
  'Visitor badges for Northgate Electrical', 'Loading dock access for Cedar Office Supply', 'Replace access keys for Skylark Cleaning',
  'Central HVAC maintenance visit', 'Elevator inspection escort', 'Catering delivery for quarterly review', 'Office chair replacement',
  'Secure bins for records pickup', 'Conference display repair', 'Guest network access for Westline Design', 'After-hours flooring installation',
  'Atrium signage proofs', 'Printer supply replenishment', 'Lighting inspection at Pine Street', 'Mailroom access for courier',
  'Lobby desk refurbishment', 'Video wall installation', 'Server room sensor calibration', 'Weekly landscape crew badges',
  'Emergency exit signage replacement', 'Window cleaning access', 'Badge return for temporary crew', 'Parking permits for contractor',
  'Water cooler service', 'Orientation lunch delivery', 'Lab equipment freight pickup', 'Fire alarm testing escort',
  'Reception painting estimate', 'Conference phone installation', 'Furniture delivery for training suite', 'Secure disposal collection',
  'Kitchen equipment inspection',
]
const facilitiesTasks = [
  'Confirm renovation scope', 'Inventory available desks', 'Schedule electrical assessment', 'Replace task seating',
  'Install new wayfinding', 'Paint east meeting rooms', 'Commission training suite', 'Test badge readers',
  'Inspect reception lighting', 'Walk through with workplace team', 'Record final defects', 'Collect access keys',
]
const priorities = ['Low', 'Normal', 'Urgent']
const statuses = ['Not Started', 'In Progress', 'Complete', 'Blocked']
const approvedCell = { id: 'col_approval', title: 'Approval Status', type: 'dropdown', options: APPROVAL_OPTIONS }
const priorityCell = { id: 'col_priority', title: 'Priority', type: 'dropdown', options: priorities }
const costs = { id: 'col_cost', title: 'Estimated Cost', type: 'number' }
const reviewed = { id: 'col_reviewed', title: 'Reviewed', type: 'checkbox' }
const notes = { id: 'col_notes', title: 'Notes', type: 'text' }
const generalColumns = [
  { id: 'col_task', title: 'Work Item', type: 'text', primary: true },
  projectColumns[1], projectColumns[2], priorityCell, { id: 'col_due', title: 'Due Date', type: 'date' },
  costs, reviewed, approvedCell, notes,
]
const vendorColumns = [
  { id: 'col_request', title: 'Request', type: 'text', primary: true },
  projectColumns[2], priorityCell,
  { id: 'col_date', title: 'Visit Date', type: 'date' },
  { id: 'col_type', title: 'Request Type', type: 'dropdown', options: ['Site Access', 'Equipment', 'Delivery', 'Maintenance'] },
  costs, reviewed, approvedCell, notes,
]

const stamp = (day, hour = 9) => '2026-11-' + String(day).padStart(2, '0') + 'T' + String(hour).padStart(2, '0') + ':15:00.000Z'
const metadata = (actor, day = 12, hour = 9) => ({ createdAt: stamp(2), createdBy: actor, updatedAt: stamp(day, hour), updatedBy: actor })
const shifted = (date, days) => dayDate(dateDay(date) + days)
const initialActors = ['usr_avery', 'usr_leah']

export function createInitialData() {
  const users = people.map(([name, role], index) => ({
    id: initialActors[index] ?? 'usr_' + name.toLowerCase().replaceAll(' ', '_'),
    name, role, email: name.toLowerCase().replaceAll(' ', '.') + '@example.test',
  }))
  const workspaces = workspaceFixtures.map(([id, name, description], index) => ({
    id: 'ws_' + id, name, description, ownerId: users[index].id,
  }))
  const sheets = []
  const rows = []
  workspaceFixtures.forEach(([, , , entries], workspaceIndex) => {
    const workspace = workspaces[workspaceIndex]
    entries.forEach(([key, name], localIndex) => {
      const index = sheets.length
      const id = 'sh_' + key
      const launch = key === 'launch_plan'
      const vendor = key === 'vendor_intake'
      const facilities = key === 'facilities_refresh'
      const project = launch || facilities
      const ownerId = workspace.ownerId
      const columns = project ? [...projectColumns, priorityCell, costs, reviewed, approvedCell, notes] : vendor ? vendorColumns : generalColumns
      const day = launch || vendor || facilities ? 17 : 6 + index % 11
      sheets.push({
        id, name, workspaceId: workspace.id, ownerId, status: 'active', columns,
        ...(project ? { projectSettings: { ...projectDefaults, dependenciesEnabled: launch, holidays: launch ? ['2026-11-26'] : [] } } : {}),
        ...(vendor ? { savedFilters: [{ id: 'flt_vendor_urgent', name: 'Urgent requests', columnId: 'col_priority', operator: 'equals', value: 'Urgent' }] } : {}),
        ...metadata(ownerId, day, launch ? 17 : vendor ? 16 : facilities ? 15 : 10),
      })
      const total = launch || vendor ? 32 : facilities ? 12 : key === 'onboarding_requests' ? 0 : 10
      for (let offset = 0; offset < total; offset++) {
        const scheduled = launch ? launchTasks[offset] : undefined
        const vendorRowId = vendor && offset === 0 ? 'row_vendor_badges' : null
        const cells = {
          [vendor ? 'col_request' : 'col_task']: scheduled?.[1] ?? (launch ? launchBacklog[offset - launchTasks.length] : vendor ? vendorTasks[offset] : facilities ? facilitiesTasks[offset] : workItems[workspaceIndex][(offset + localIndex) % 10]),
          col_assigned: users[(index + offset * 3) % users.length].id,
          col_priority: priorities[(index + offset) % priorities.length],
          col_cost: offset % 5 === 4 ? 0 : 95 + (index * 65 + offset * 145) % 4300 + (offset % 2 ? 0.5 : 0),
          col_reviewed: offset % 3 === 0,
        }
        if (!vendor) cells.col_status = statuses[(index + offset) % statuses.length]
        if (offset % 4 === 0) cells.col_notes = ['Owner confirmed the next step.', 'Awaiting the updated estimate.', 'Review at the next team check-in.'][offset % 3]
        if (scheduled) {
          const [, , start, finish, duration, predecessors] = scheduled
          cells.col_start = start
          cells.col_finish = finish
          cells.col_duration = duration
          if (predecessors.length) cells.col_predecessors = predecessors.map(rowId => ({ rowId, type: 'FS', lagDays: 0 }))
          cells.col_percent = [100, 80, 45, 0, 60, 15, 0, 0, 0, 0][offset]
        } else if (facilities && offset < 10) {
          cells.col_start = shifted('2026-11-16', offset * 2)
          if (offset !== 6) cells.col_finish = shifted(cells.col_start, 1 + offset % 4)
          cells.col_percent = [100, 85, 60, 30, 15, 0, 0, 0, 0, 0][offset]
        } else if (vendor) {
          cells.col_priority = offset < 2 ? 'Urgent' : priorities[offset % 3]
          cells.col_type = vendorColumns[4].options[offset % 4]
          cells.col_date = shifted('2026-11-18', offset)
        } else if (!project) cells.col_due = shifted('2026-11-18', (index + offset * 2) % 35)
        if (cells.col_percent != null) cells.col_status = cells.col_percent === 100 ? 'Complete' : cells.col_percent > 0 ? 'In Progress' : 'Not Started'
        rows.push({
          id: scheduled?.[0] ?? vendorRowId ?? 'row_' + key + '_' + (offset + 1),
          sheetId: id, position: offset + 1, cells, source: 'grid', status: 'active', ...metadata(ownerId, day),
        })
      }
    })
  })

  const intakeSheets = sheets.filter(sheet => ['launch_plan', 'facilities_refresh', 'onboarding_requests'].every(key => sheet.id !== 'sh_' + key)).slice(0, 24)
  const forms = []
  const formSubmissions = []
  intakeSheets.forEach((sheet, index) => {
    const key = sheet.id.slice(3)
    const vendor = key === 'vendor_intake'
    const id = vendor ? 'frm_vendor_intake' : 'frm_' + key
    const primary = sheet.columns[0].id
    const rowPlacement = index % 2 || vendor ? 'top' : 'bottom'
    const field = (columnId, label, options = {}) => ({ id: 'ff_' + key + '_' + columnId.slice(4), columnId, label, required: false, hidden: false, ...options })
    const fields = [
      field(primary, vendor ? 'Access request' : 'Work item', { required: true, helpText: 'Provide a short description.' }),
      field('col_priority', 'Priority', vendor ? { hidden: true, required: true, defaultValue: 'Urgent' } : { defaultValue: 'Normal' }),
      field('col_assigned', 'Requested for'),
      field(vendor ? 'col_date' : 'col_due', vendor ? 'Visit date' : 'Due date'),
      field('col_cost', 'Estimated cost'),
      field('col_reviewed', 'Reviewed', { defaultValue: false }),
      field('col_notes', 'Additional details'),
    ]
    if (vendor) fields.splice(1, 0, field('col_type', 'Request type', { defaultValue: 'Site Access' }))
    if (index % 3 === 2) fields.splice(1, 0, fields.splice(3, 1)[0])
    forms.push({
      id, sheetId: sheet.id, title: vendor ? 'Vendor Access Request' : sheet.name + ' Form',
      description: vendor ? 'Submit access needs for an upcoming vendor visit.' : 'Send your details to the team managing ' + sheet.name + '.',
      fields, confirmationMessage: vendor ? 'Your vendor access request has been received.' : 'Thank you. Your response has been received.',
      rowPlacement, status: index % 6 === 5 ? 'inactive' : 'active', ...metadata(sheet.ownerId, 13),
    })
    const linked = rows.filter(row => row.sheetId === sheet.id)
    const selected = rowPlacement === 'top' ? linked.slice(0, 2) : linked.slice(-2)
    selected.forEach((row, offset) => {
      const submissionId = vendor && offset === 0 ? 'sub_vendor_badges' : 'sub_' + key + '_' + (offset + 1)
      const actor = vendor && offset === 0 ? 'usr_leah' : row.cells.col_assigned
      if (!vendor && row.cells.col_priority === 'Low' && offset === 0) row.cells.col_priority = 'Normal'
      const values = Object.fromEntries(fields.filter(item => row.cells[item.columnId] != null).map(item => [item.columnId, row.cells[item.columnId]]))
      formSubmissions.push({ id: submissionId, formId: id, sheetId: sheet.id, rowId: row.id, values, status: 'submitted', createdAt: stamp(10 + offset), createdBy: actor })
      Object.assign(row, { source: 'form', formSubmissionId: submissionId, createdAt: stamp(10 + offset), createdBy: actor })
    })
  })

  const ruleSheets = [sheets.find(sheet => sheet.id === 'sh_vendor_intake'), sheets[0], ...intakeSheets.filter(sheet => sheet.id !== 'sh_vendor_intake')].slice(0, 24)
  const approvalWorkflows = []
  const approvalRequests = []
  ruleSheets.forEach((sheet, index) => {
    const key = sheet.id.slice(3)
    const vendor = index === 0
    const id = vendor ? 'aw_vendor_review' : 'aw_' + key
    const approverId = index < 4 ? 'usr_avery' : users[(index + 3) % users.length].id
    const trigger = index % 3 === 0 ? { event: 'rowAdded' } : { event: 'rowChanged', columnId: 'col_priority' }
    const linkedRows = rows.filter(row => row.sheetId === sheet.id)
    const condition = vendor || index % 3 === 2 ? { columnId: 'col_priority', operator: 'equals', value: linkedRows[0].cells.col_priority } : undefined
    const rule = {
      id, sheetId: sheet.id, name: vendor ? 'Urgent vendor sign-off' : sheet.name + ' approval',
      status: index % 7 === 6 ? 'paused' : 'active', trigger, ...(condition ? { condition } : {}), approverId, responseColumnId: 'col_approval',
      subject: vendor ? 'Review vendor access' : 'Review ' + sheet.name,
      message: vendor ? 'Confirm the vendor is on the site list and approve the requested access.' : 'Review the row details and record your decision.',
      ...metadata(sheet.ownerId, 13),
    }
    approvalWorkflows.push(rule)
    linkedRows.slice(0, index < 12 ? 2 : 1).forEach((row, offset) => {
      const status = vendor ? (offset === 0 ? 'pending' : 'approved') : index === 1 ? (offset === 0 ? 'pending' : 'declined') :
        ['pending', 'approved', 'declined', 'canceled'][(index + offset * 2) % 4]
      const decision = status === 'approved' || status === 'declined'
      if (status !== 'canceled') row.cells.col_approval = status === 'pending' ? 'Submitted' : status === 'approved' ? 'Approved' : 'Declined'
      approvalRequests.push({
        id: vendor && offset === 0 ? 'apr_vendor_badges' : 'apr_' + key + '_' + (offset + 1),
        workflowId: id, sheetId: sheet.id, rowId: row.id, approverId, requestedBy: vendor ? 'usr_leah' : sheet.ownerId,
        responseColumnId: 'col_approval', subject: rule.subject, message: rule.message,
        status, createdAt: stamp(13 + offset, 10 + index % 6),
        ...(decision ? {
          readAt: stamp(15), readBy: approverId, respondedAt: stamp(15), respondedBy: approverId,
          responseNote: status === 'approved' ? 'Approved after reviewing the updated details.' : 'Please confirm the remaining details before resubmitting.',
        } : {}),
        ...(status === 'canceled' ? { canceledAt: stamp(16), canceledBy: sheet.ownerId } : {}),
      })
    })
  })
  return {
    currentUserId: 'usr_avery', users, workspaces, sheets, rows, forms, formSubmissions, approvalWorkflows, approvalRequests,
    preferences: { favoriteSheetIds: ['sh_launch_plan', 'sh_vendor_intake'] },
  }
}
