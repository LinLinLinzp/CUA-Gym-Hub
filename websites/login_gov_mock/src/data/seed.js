const accountId = 'acct_jordan'
const emailIds = ['email_personal', 'email_work', 'email_alternate']
const serviceId = number => `svc_${String(number).padStart(3, '0')}`
const stamp = (year, month, day) => new Date(Date.UTC(year, month - 1, day, 15, 30)).toISOString()

const serviceDirectory = [
  ['Pathways', 'Workforce Access Bureau', 'Employment', 'Review job-readiness resources and career appointments.'],
  ['National Archive Requests', 'Public Records Office', 'Records', 'Find historical records and track copy requests.'],
  ['Community Housing Applications', 'Community Housing Office', 'Housing', 'Review rental assistance and housing applications.'],
  ['Travel Enrollment Portal', 'Travel Programs Bureau', 'Travel', 'Manage traveler program enrollment and appointments.'],
  ['ScholarLink', 'Education Access Agency', 'Education', 'Browse scholarship programs and application dates.'],
  ['Family Benefits Center', 'Family Services Administration', 'Benefits', 'View notices for family support programs.'],
  ['PermitDesk', 'Regional Permit Office', 'Travel', 'Review recreation permit availability.'],
  ['Public Service Apprenticeships', 'Public Sector Training Office', 'Employment', 'Track apprenticeship opportunities and interviews.'],
  ['Military Service Records', 'Service Records Bureau', 'Records', 'Find request forms for military service records.'],
  ['Rental Support Exchange', 'Housing Support Commission', 'Housing', 'Browse local rental support resources.'],
  ['Adult Learning Network', 'Continuing Education Office', 'Education', 'Find skills courses and adult education classes.'],
  ['Health Coverage Notices', 'Coverage Services Board', 'Benefits', 'Read updates about health coverage programs.'],
  ['TransitPass', 'Regional Mobility Authority', 'Travel', 'Review available regional transit passes.'],
  ['Federal Fellowship Directory', 'Public Talent Office', 'Employment', 'Explore public service fellowships.'],
  ['Land Records Search', 'Land Survey Bureau', 'Records', 'Browse public property and survey records.'],
  ['Homeowner Repair Program', 'Neighborhood Investment Agency', 'Housing', 'Review home maintenance grant programs.'],
  ['Student Grants Portal', 'Student Funding Office', 'Education', 'Check grant programs and upcoming deadlines.'],
  ['Retirement Planning Center', 'Retirement Programs Bureau', 'Benefits', 'Save retirement planning resources.'],
  ['ParkPass', 'Public Lands Service', 'Travel', 'Browse public lands access and visitor passes.'],
  ['Career Transition Center', 'Employment Transitions Office', 'Employment', 'Explore career transition programs.'],
  ['County Certificate Requests', 'County Records Bureau', 'Records', 'Track requests for certified county records.'],
  ['Housing Waitlist Center', 'Public Housing Office', 'Housing', 'Check housing waitlist notices.'],
  ['Community College Transfers', 'Higher Education Transfer Office', 'Education', 'Find college transfer guides.'],
  ['Nutrition Support Directory', 'Food Access Bureau', 'Benefits', 'Locate nutrition assistance programs.'],
  ['Federal Careers Workspace', 'Federal Workforce Services', 'Employment', 'Manage a sample federal career profile.', true],
  ['Community Learning Exchange', 'Learning Resources Bureau', 'Education', 'Save classes and public learning events.'],
  ['International Trip Notices', 'Citizen Travel Office', 'Travel', 'Set up sample trip notifications.', true],
  ['Personal Records Vault', 'Civil Documents Administration', 'Records', 'Access a sample personal records request.', true],
  ['Home Energy Assistance', 'Residential Energy Office', 'Housing', 'Review home energy assistance programs.', true],
  ['Caregiver Support Hub', 'Community Care Bureau', 'Benefits', 'Find resources for family caregivers.'],
  ['Public Internship Register', 'Youth Employment Office', 'Employment', 'Track public-sector internship listings.'],
  ['Academic Credential Requests', 'Education Records Office', 'Education', 'Review sample credential requests.', true],
  ['Border Appointment Center', 'Traveler Appointments Agency', 'Travel', 'Review sample travel appointment details.', true],
  ['Open Records Exchange', 'Information Access Office', 'Records', 'Follow public information requests.'],
  ['Affordable Home Finder', 'Residential Access Bureau', 'Housing', 'Save affordable housing listings.'],
  ['Income Support Workspace', 'Public Benefits Administration', 'Benefits', 'Review a sample income support case.', true],
]

export function createInitialData() {
  const emails = [
    { id: emailIds[0], address: 'jordan.avery@example.com', label: 'Personal', status: 'confirmed' },
    { id: emailIds[1], address: 'j.avery.work@example.com', label: 'Work', status: 'confirmed' },
    { id: emailIds[2], address: 'jordan.avery.alt@example.com', label: 'Alternate', status: 'confirmed' },
  ]
  const services = serviceDirectory.map(([name, agency, category, description, requiresIdentity], index) => ({
    id: serviceId(index + 1), name, agency, category, description,
    requiresVerifiedIdentity: Boolean(requiresIdentity),
    requestedAttributes: requiresIdentity ? ['email', 'given_name', 'family_name'] : ['email'],
  }))
  const connections = []
  const connectionEvents = []
  for (let number = 1; number <= 24; number++) {
    const serial = String(number).padStart(3, '0')
    const id = `conn_${serial}`
    const related = { connectionId: id, accountId, serviceId: serviceId(number), actorId: accountId }
    const connectedAt = stamp(2024 + (number > 12 ? 1 : 0), (number - 1) % 12 + 1, 3)
    const originalEmail = (number - 1) % emails.length
    const finalEmail = number % 4 === 0 ? (originalEmail + 1) % emails.length : originalEmail
    const snapshot = (status, index) => ({
      status, sharedEmailId: emails[index].id, sharedEmailAddress: emails[index].address, sharedAttributes: ['email'],
    })
    connectionEvents.push({
      ...related, id: `evt_${serial}_connected`, type: 'connected', createdAt: connectedAt,
      before: null, after: snapshot('connected', originalEmail),
    })
    let updatedAt = connectedAt
    if (originalEmail !== finalEmail) {
      updatedAt = stamp(2024 + (number > 12 ? 1 : 0), (number - 1) % 12 + 1, 8)
      connectionEvents.push({
        ...related, id: `evt_${serial}_email`, type: 'shared_email_changed', createdAt: updatedAt,
        before: snapshot('connected', originalEmail), after: snapshot('connected', finalEmail),
      })
    }
    const disconnectedAt = number > 12 ? stamp(2026, (number - 13) % 5 + 1, number - 11) : null
    const status = disconnectedAt ? 'disconnected' : 'connected'
    if (disconnectedAt) {
      updatedAt = disconnectedAt
      connectionEvents.push({
        ...related, id: `evt_${serial}_disconnected`, type: 'disconnected', createdAt: updatedAt,
        before: snapshot('connected', finalEmail), after: snapshot('disconnected', finalEmail),
      })
    }
    connections.push({
      id, accountId, serviceId: related.serviceId, status, sharedEmailId: emails[finalEmail].id,
      sharedAttributes: ['email'], createdAt: connectedAt, connectedAt, updatedAt,
      ...(disconnectedAt ? { disconnectedAt } : {}),
    })
  }

  const verificationAttempts = Array.from({ length: 24 }, (_, index) => {
    const lateExit = index % 4 >= 2
    const year = 2021 + Math.floor(index / 6)
    const month = index % 6 * 2 + 1
    return {
      id: `va_${String(index + 1).padStart(3, '0')}`,
      accountId, actorId: accountId, status: 'canceled',
      ...(index % 3 !== 0 ? { serviceId: serviceId(index + 1) } : {}),
      method: index % 2 === 0 ? 'online' : 'in_person',
      step: lateExit ? 'review' : 'sample_identity',
      ...(lateExit ? { documentType: index % 2 === 0 ? 'passport' : 'state_id' } : {}),
      sampleIdentityConfirmed: lateExit, sampleContactConfirmed: lateExit,
      createdAt: stamp(year, month, 10), updatedAt: stamp(year, month, 12), canceledAt: stamp(year, month, 12),
    }
  })

  return {
    account: { id: accountId, displayName: 'Jordan Avery', primaryEmailId: emailIds[0] },
    emails,
    identity: { accountId, status: 'unverified', updatedAt: stamp(2026, 6, 4) },
    verificationAttempts, services, connections, connectionEvents,
  }
}
