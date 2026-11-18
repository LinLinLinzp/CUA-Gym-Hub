import { roundCost } from '../domain.js'

const HARBOR = 'proj-harborview'
const JUNIPER = 'proj-juniper'
const stamp = '2026-10-08T16:00:00.000Z'
const audit = { createdAt: stamp, createdById: 'person-maya' }
const date = (day) => new Date(Date.UTC(2026, 9, day)).toISOString().slice(0, 10)
const pad = (n) => String(n).padStart(3, '0')

const harborQuestions = [
  ['Penthouse louver rough opening', 'Confirm the required opening width for louver L-03 at grid E.', 'Roof'],
  ['West stair handrail return', 'Can the return terminate against the concrete wall at landing 2?', 'West Stair'],
  ['Medical gas riser sleeve spacing', 'Is a 100 mm clear gap acceptable between the oxygen and air sleeves?', 'Level 1 Shaft'],
  ['Curtainwall base flashing', 'Identify the termination height above the plaza pavers.', 'South Elevation'],
  ['Imaging room shielding at conduit', 'Provide the lead lining detail at the data conduit penetration.', 'Imaging Suite'],
  ['Lab casework backing height', 'Confirm backing elevations at the wall-mounted specimen cabinets.', 'Lab 211'],
  ['Level 2 corridor soffit clearance', 'Can the soffit drop 50 mm below detail A-412?', 'L2 East Corridor'],
  ['Fire pump discharge test header', 'Confirm the required clearance from the west loading door.', 'Service Yard'],
  ['Visitor entrance canopy drain', 'Identify where the canopy drain connects to the storm branch.', 'Main Entry'],
  ['Roof curb insulation transition', 'Can the board insulation continue under the welded curb flange?', 'Roof'],
  ['Foundation dowel embedment', 'Provide dowel embedment at the new retaining wall return.', 'Grid B-4'],
  ['Reception desk floor box', 'Verify the floor box centerline relative to the accessible counter.', 'Main Lobby'],
  ['Smoke damper access panels', 'Confirm the clear opening required through the corridor ceiling.', 'Level 2'],
  ['Pediatric room door seals', 'Is the perimeter gasket listed in the finish schedule acceptable?', 'Pediatric Wing'],
  ['Clean steam branch slope', 'Confirm whether the branch may drop before turning into the riser.', 'Mechanical Floor'],
  ['Cooling tower maintenance aisle', 'Verify that the revised service clearance meets equipment requirements.', 'Roof'],
  ['Generator conduit routing', 'Confirm the path around the existing footing on the east side.', 'Generator Yard'],
  ['Elevator pit ladder clearance', 'Can the ladder mounting bracket shift 100 mm toward grid D?', 'Elevator 2'],
  ['Isolation wall resilient channels', 'Confirm the channel direction behind the patient room headwall.', 'Patient Room 312'],
  ['Ambulance bay trench cover', 'Verify the wheel load rating required for the removable grate.', 'Ambulance Bay'],
  ['Sanitary vent through parapet', 'Provide the transition to the vent termination above the screen wall.', 'Roof'],
  ['Pharmacy millwork power feed', 'Confirm the floor outlet location for the dispensing counter.', 'Pharmacy'],
  ['Nurse station sprinkler layout', 'Check coverage beneath the suspended acoustic canopy.', 'Level 3'],
  ['Seismic joint floor cover', 'Identify the required cover width at the link bridge threshold.', 'Link Bridge'],
]
const juniperQuestions = [
  ['Platform canopy anchor pattern', 'Confirm the slot direction at the canopy column base.', 'Platform 2'],
  ['Bus wash trench invert', 'Verify the invert elevation at the grit interceptor.', 'Wash Bay'],
  ['Fare gate data conduit', 'Can the conduits emerge behind the kiosk plinth?', 'Passenger Hall'],
  ['Driver breakroom sink offset', 'Confirm the supply rough-in dimension for the accessible sink.', 'Staff Annex'],
  ['Service pit ladder finish', 'Is hot-dip galvanized steel acceptable for the ladder?', 'Maintenance Bay'],
  ['Wayfinding sign mounting depth', 'Identify the backing depth at the north concourse column.', 'North Concourse'],
]
const harborSubmittals = [
  ['Curtainwall mullion shop drawings', '08 44 13', 'Shop Drawing'], ['Firestop systems at rated partitions', '07 84 00', 'Product Data'],
  ['Isolation valve product data', '23 05 23', 'Product Data'], ['Lobby porcelain tile samples', '09 30 00', 'Sample'],
  ['Patient lift rail layout', '11 73 00', 'Shop Drawing'], ['Roof membrane warranty', '07 54 23', 'Certificate'],
  ['Level 2 ductwork coordination', '23 31 13', 'Shop Drawing'], ['Structural steel connection details', '05 12 00', 'Shop Drawing'],
  ['Emergency transfer switch data', '26 36 00', 'Product Data'], ['Medical gas manifold assembly', '22 63 00', 'Shop Drawing'],
  ['Radiation shielding inspection report', '13 49 00', 'Certificate'], ['Loading dock leveler data', '11 13 19', 'Product Data'],
  ['Door hardware sets', '08 71 00', 'Product Data'], ['Acoustic wall panel samples', '09 84 13', 'Sample'],
  ['Stormwater chamber layout', '33 46 00', 'Shop Drawing'], ['Exterior brick pattern panel', '04 21 13', 'Mockup'],
  ['Air handling unit controls', '23 09 00', 'Product Data'], ['Waterproofing at elevator pits', '07 14 16', 'Product Data'],
  ['Lab fume hood cut sheets', '11 53 13', 'Product Data'], ['Smoke barrier glazing assembly', '08 88 13', 'Product Data'],
  ['Generator exhaust supports', '23 51 00', 'Shop Drawing'], ['South plaza concrete pavers', '32 14 13', 'Sample'],
]
const juniperSubmittals = [
  ['Canopy fascia panels', '07 42 13', 'Shop Drawing'], ['Bus wash grit interceptor', '22 13 19', 'Product Data'],
  ['Platform warning tile', '32 17 26', 'Sample'], ['Fare kiosk floor raceways', '26 05 33', 'Shop Drawing'],
  ['Vehicle lift calibration record', '11 11 26', 'Certificate'], ['Concourse LED strip fixtures', '26 51 00', 'Product Data'],
]
const harborOrders = [
  'East corridor duct offset', 'Temporary loading dock access', 'Level 3 electrical closet relocation', 'Credit for lobby ceiling panels',
  'Lab exhaust support reinforcement', 'Additional fireproofing at transfer beams', 'Patient room headwall revisions', 'South entry frost protection',
  'Roof drain reroute', 'Pharmacy millwork relocation', 'Replace south plaza trench cover', 'West stair smoke partition',
  'Ambulance canopy lighting', 'Imaging conduit sleeve additions', 'Mechanical room housekeeping pads', 'Retaining wall waterproofing',
  'Curtainwall anchor extensions', 'Emergency power meter cabinet',
]
const juniperOrders = [
  'Platform canopy bracing', 'Additional trench at wash bay', 'Passenger hall signage relocation',
  'Credit for spare raceway', 'Service pit ventilation duct', 'North concourse access ramp',
]
const harborDates = [8, 9, 12, 14, 15, 19, 20, 22, 26, 28, 30, 33, 35, 37, 40, 42, 44, 47, 49]
const juniperDates = [20, 23, 29, 34, 41, 48]
const conditions = ['Overcast', 'Light rain', 'Clear', 'Morning fog', 'Partly cloudy']
const harborWork = [
  ['Set lab branch hangers.', 'Level 2', 'Isolation valves'],
  ['Fit storm drain couplings at the riser.', 'Service Court', 'Grooved couplings'],
  ['Install bracing for the exhaust curb.', 'Roof', 'Galvanized strut'],
  ['Pressure-test the chilled water branch.', 'Mechanical Room', 'Test caps'],
  ['Survey the curb offsets for the air handling unit.', 'Penthouse', 'Rubber isolation pads'],
]
const juniperWork = [
  ['Fit drain connections at the grit interceptor.', 'Wash Bay', 'Drain cleanouts'],
  ['Set the canopy column templates.', 'Platform 2', 'Anchor bolts'],
  ['Check the conduit route at the fare gate.', 'Passenger Hall', 'Rigid conduit'],
]
const harborNotes = [
  'Surveyor verified curtainwall bench marks.', 'Inspection cleared the west shaft before board close-up.',
  'Keep the loading area clear for the next glazing shipment.', 'Roof access reopened after the morning safety check.',
  'Concrete crew confirmed placement sequence at the south stair.',
]
const juniperNotes = [
  'Transit operations confirmed the temporary footpath limits.', 'Layout marks for the fare kiosks were checked against the tile grid.',
  'The site team cleared the north gate for tomorrow’s steel delivery.',
]

export function createInitialData() {
  const data = {
    account: { companyName: 'Northbank Builders', currentUserId: 'person-maya', defaultProjectId: HARBOR },
    projects: [
      { id: HARBOR, number: 'P-2617', name: 'Harborview Medical Pavilion', city: 'Portland, OR', memberIds: ['person-maya', 'person-leo', 'person-nadia', 'person-jordan', 'person-elsie', 'person-tomas'] },
      { id: JUNIPER, number: 'P-2624', name: 'Juniper Transit Annex', city: 'Tacoma, WA', memberIds: ['person-maya', 'person-olivia', 'person-caleb', 'person-renee'] },
    ],
    people: [
      { id: 'person-maya', name: 'Maya Chen', role: 'Project Engineer', companyId: 'company-northbank' },
      { id: 'person-leo', name: 'Leo Bennett', role: 'Mechanical Engineer', companyId: 'company-cedar' },
      { id: 'person-nadia', name: 'Nadia Ortiz', role: 'Structural Engineer', companyId: 'company-rivermark' },
      { id: 'person-jordan', name: 'Jordan Ellis', role: 'Project Manager', companyId: 'company-northbank' },
      { id: 'person-elsie', name: 'Elsie Park', role: 'Architect', companyId: 'company-linden' },
      { id: 'person-tomas', name: 'Tomas Reid', role: 'Superintendent', companyId: 'company-northbank' },
      { id: 'person-olivia', name: 'Olivia Shaw', role: 'Transit Project Manager', companyId: 'company-northbank' },
      { id: 'person-caleb', name: 'Caleb Brooks', role: 'Site Utilities Lead', companyId: 'company-sound' },
      { id: 'person-renee', name: 'Renee Whitaker', role: 'Structural Reviewer', companyId: 'company-bayline' },
    ],
    companies: [
      { id: 'company-northbank', name: 'Northbank Builders', trade: 'General Contractor', projectIds: [HARBOR, JUNIPER] },
      { id: 'company-cedar', name: 'Cedar Mechanical', trade: 'Mechanical', projectIds: [HARBOR] },
      { id: 'company-rivermark', name: 'Rivermark Structural', trade: 'Structural Steel', projectIds: [HARBOR] },
      { id: 'company-linden', name: 'Linden Studio', trade: 'Architecture', projectIds: [HARBOR] },
      { id: 'company-sound', name: 'Sound Civil Works', trade: 'Site Utilities', projectIds: [JUNIPER] },
      { id: 'company-bayline', name: 'Bayline Fabrication', trade: 'Structural Steel', projectIds: [JUNIPER] },
    ],
    contracts: [
      { id: 'contract-harbor-general', projectId: HARBOR, number: 'PC-001', title: 'General Construction', companyId: 'company-northbank', status: 'Approved', originalAmount: 4230000 },
      { id: 'contract-harbor-mechanical', projectId: HARBOR, number: 'PC-002', title: 'Mechanical & Plumbing', companyId: 'company-cedar', status: 'Complete', originalAmount: 1185000 },
      { id: 'contract-harbor-shell', projectId: HARBOR, number: 'PC-003', title: 'Shell Fit-out Allowance', companyId: 'company-rivermark', status: 'Draft', originalAmount: 220000 },
      { id: 'contract-juniper-general', projectId: JUNIPER, number: 'PC-001', title: 'Transit Annex Construction', companyId: 'company-northbank', status: 'Approved', originalAmount: 2815000 },
    ],
    rfis: [], rfiResponses: [], submittals: [], submittalReviews: [], dailyLogs: [], dailyLogEntries: [],
    changeOrders: [], changeOrderLineItems: [], activity: [],
  }
  for (const project of data.projects) seedProject(data, project)
  return data
}

function seedProject(data, project) {
  const harbor = project.id === HARBOR
  const site = harbor ? 'harbor' : 'juniper'
  const person = (i) => project.memberIds[1 + i % (project.memberIds.length - 1)]
  const tradeCompany = harbor ? 'company-cedar' : 'company-sound'
  const slug = (kind, n) => kind + '-' + site + '-' + pad(n)
  const contractIds = data.contracts.filter((contract) => contract.projectId === project.id && contract.status !== 'Draft').map((contract) => contract.id)

  for (const [i, [subject, question, location]] of (harbor ? harborQuestions : juniperQuestions).entries()) {
    const n = i + 1
    const id = slug('rfi', n)
    const status = harbor && n === 7 ? 'Open' : ['Open', 'Closed', 'Draft', 'Open', 'Open', 'Closed'][i % 6]
    const assigneeIds = status === 'Draft' ? [] : [harbor && n === 7 ? 'person-leo' : person(i)]
    let officialResponseId = null
    if (status === 'Closed' || (status === 'Open' && [1, 4, 7, 10, 13].includes(n))) {
      const replies = harbor && n === 7
        ? ['Maintain clearance at the smoke barrier and revise the duct offset.', 'The mechanical team can issue the revised duct section with the next coordination set.']
        : ['The site team confirmed the field dimensions at ' + location + '.', 'Use the coordinated detail for ' + subject.toLowerCase() + ' in the next drawing issue.']
      for (const [index, text] of replies.entries()) {
        const replyId = slug('reply', n) + (index === 0 ? 'a' : 'b')
        data.rfiResponses.push({ id: replyId, rfiId: id, text, createdById: assigneeIds[0], createdAt: '2026-11-10T17:20:00.000Z' })
        if (index === (harbor && n === 7 ? 0 : 1)) officialResponseId = replyId
      }
    }
    data.rfis.push({ id, projectId: project.id, number: 'RFI-' + pad(n), subject, question, location, status, assigneeIds,
      dueDate: status === 'Draft' ? null : harbor && n === 7 ? '2026-11-23' : date(24 + i * 2), officialResponseId, ...audit })
  }

  for (const [i, [title, specSection, type]] of (harbor ? harborSubmittals : juniperSubmittals).entries()) {
    const n = i + 1
    const id = slug('sub', n)
    const reviewerId = harbor && n === 3 ? 'person-leo' : person(i)
    const revision = i === 2 || i === 8 ? 1 : 0
    const status = i === 2 ? 'In Review' : ['Draft', 'In Review', 'In Review', 'Approved', 'Revise and Resubmit', 'Rejected', 'Approved as Noted'][i % 7]
    const description = harbor && n === 3 ? 'Provide valve schedules and pressure ratings for the lab branch.'
      : 'Review the ' + title.toLowerCase() + ' for compliance with section ' + specSection + ' and the coordinated drawings.'
    const record = { id, projectId: project.id, number: 'SUB-' + pad(n), title, specSection, type, description, revision, status, reviewerId,
      responsibleCompanyId: i % 3 ? tradeCompany : 'company-northbank', ballInCourtId: status === 'In Review' ? reviewerId : null,
      dueDate: harbor && n === 3 ? '2026-11-24' : date(30 + i * 2), attachments: [], ...audit }
    data.submittals.push(record)
    const review = (r, decision, comments) => data.submittalReviews.push({ id: slug('review', n) + '-r' + r, submittalId: id,
      revision: r, decision, comments, createdById: reviewerId, createdAt: r === 0 ? '2026-11-12T14:30:00.000Z' : '2026-11-16T14:30:00.000Z' })
    if (revision) review(0, 'Revise and Resubmit', harbor && n === 3 ? 'Include pressure ratings above 150 psi.' : 'Include the installation clearances in the revision.')
    const comments = {
      Approved: '', 'Approved as Noted': 'Coordinate installation with the updated finish schedule.',
      'Revise and Resubmit': 'Attach the current coordination drawing and identify material thickness.',
      Rejected: 'The submitted assembly does not match the specified performance rating.',
    }
    if (status in comments) review(revision, status, comments[status])
  }

  const work = harbor ? harborWork : juniperWork
  const notes = harbor ? harborNotes : juniperNotes
  for (const [i, dayNumber] of (harbor ? harborDates : juniperDates).entries()) {
    const day = date(dayNumber)
    const id = 'day-' + site + '-' + day
    const complete = i % 4 === 1 || i === 17
    const dayAudit = { createdAt: day + 'T14:00:00.000Z', createdById: 'person-maya' }
    data.dailyLogs.push({ id, projectId: project.id, date: day, status: complete ? 'Complete' : 'Open',
      completedAt: complete ? day + 'T22:10:00.000Z' : null, completedById: complete ? 'person-maya' : null, ...dayAudit })
    const [description, location, material] = work[i % work.length]
    const entries = [
      ['weather', { condition: conditions[i % conditions.length], tempF: 45 + (i * 7) % 17, observedAt: '07:00', notes: i % 5 === 1 ? 'West access path wet.' : '' }],
      ['manpower', { companyId: tradeCompany, workerCount: 4 + i % 6, hoursPerWorker: i % 3 ? 8 : 7.5, location, description }],
    ]
    if (i < (harbor ? 12 : 3)) entries.push(i % 2
      ? ['note', { text: notes[i % notes.length], location }]
      : ['delivery', { companyId: tradeCompany, material, quantity: 6 + i, unit: 'each', receivedAt: '09:45', notes: 'Checked against the packing list.' }])
    for (const [index, [type, details]] of entries.entries()) {
      data.dailyLogEntries.push({ id: slug('entry', i * 4 + index + 1), dailyLogId: id, type, details, ...dayAudit })
    }
  }

  for (const [i, title] of (harbor ? harborOrders : juniperOrders).entries()) {
    const n = i + 1
    const id = slug('co', n)
    const reviewerId = harbor && n === 5 ? 'person-leo' : harbor ? 'person-jordan' : 'person-olivia'
    const status = ['Pending Approval', 'Approved', 'Draft', 'Rejected', 'Pending Approval', 'Draft'][i % 6]
    const submitted = status !== 'Draft'
    const decided = ['Approved', 'Rejected'].includes(status)
    const quantity = harbor && n === 5 ? 5 : 2 + i % 9
    const unitCost = title.startsWith('Credit') ? -385.50 : harbor && n === 5 ? 970 : 260.25 + i * 157
    const amount = roundCost(quantity * unitCost)
    const description = harbor && n === 5 ? 'Add bracing at the penthouse curb.' : 'Update the contract scope for ' + title.toLowerCase() + '.'
    data.changeOrders.push({ id, projectId: project.id, contractId: contractIds[i % contractIds.length], number: 'CO-' + pad(n), title,
      reason: title.startsWith('Credit') ? 'Credit' : 'Design Revision', description, status,
      scheduleImpactDays: n === 5 ? 2 : i % 7 - 2, totalAmount: amount, reviewerId,
      ...(submitted ? { submittedAt: '2026-11-13T18:00:00.000Z', submittedById: 'person-maya' } : {}),
      ...(decided ? { decidedAt: '2026-11-16T18:00:00.000Z', decidedById: reviewerId,
        decisionComment: status === 'Rejected' ? 'Provide supplier pricing to support the proposed value.' : 'Pricing confirmed against the approved scope.' } : {}),
      ...audit })
    data.changeOrderLineItems.push({ id: slug('line', n) + 'a', changeOrderId: id, costCode: i % 2 ? '01-5000' : '05-1200',
      description: harbor && n === 5 ? 'Brace assemblies' : title, quantity, unitCost, amount, ...audit })
  }

  const pending = data.changeOrders.find(({ projectId, status }) => projectId === project.id && status === 'Pending Approval')
  const closed = data.rfis.find(({ projectId, status }) => projectId === project.id && status === 'Closed')
  data.activity.push(
    { id: 'activity-' + site + '-01', projectId: project.id, entityType: 'rfi', entityId: closed.id, action: 'close',
      previousStatus: 'Open', newStatus: 'Closed', createdAt: '2026-11-11T19:00:00.000Z', createdById: 'person-maya' },
    { id: 'activity-' + site + '-02', projectId: project.id, entityType: 'changeOrder', entityId: pending.id, action: 'submit',
      previousStatus: 'Draft', newStatus: 'Pending Approval', createdAt: pending.submittedAt, createdById: pending.submittedById },
  )
}
