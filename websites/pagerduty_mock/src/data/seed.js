const teamNames = ['Platform', 'Commerce', 'Security', 'Data', 'Customer Experience', 'Networking', 'Developer Tools', 'Messaging']
const people = ['Maya Chen', 'Omar Patel', 'Elena Torres', 'Noah Kim', 'Priya Kapoor', 'Liam Brooks', 'Aisha Greene', 'Evan Reed', 'Sofia Martin', 'Mateo Silva', 'Zoe Walker', 'Grace Wu', 'Daniel Carter', 'Jon Bell', 'Mina Park', 'Sam Rivera', 'Hannah Ross', 'Leo Price', 'Ivy Shah', 'Nina Adams', 'Arjun Rao', 'Micah Lane', 'Isabel Cruz', 'Amir Cohen', 'Rowan Hayes', 'Lena Scott', 'Anika Das', 'Ian Foster', 'Riley Stone', 'Theo Lin', 'Camila Ruiz', 'Nora Blake', 'Jules Fox', 'Tessa Reed', 'Alex Doyle', 'Sara Wong']
const servicesList = ['Checkout API', 'Identity Gateway', 'Search Indexer', 'Core API', 'Order Processing', 'Fraud Signals', 'Warehouse Sync', 'Support Portal', 'Edge Routing', 'Build Pipeline', 'Email Delivery', 'Session Store', 'Billing Webhooks', 'Token Rotation', 'Analytics Ingest', 'Customer Profiles', 'DNS Resolver', 'Artifact Registry', 'Push Delivery', 'Kubernetes Control Plane', 'Inventory Cache', 'Audit Collector', 'Query Engine', 'Help Center', 'Transit Gateway', 'Feature Flags', 'SMS Relay', 'Object Storage', 'Payment Ledger', 'Secrets Vault', 'Report Export', 'Status Notifications']
const titles = ['Checkout gateway latency above threshold', 'Elevated token refresh failures', 'Search indexing backlog growing', 'Core API error rate increased', 'Delayed order confirmations', 'Fraud signals stream lag', 'Warehouse sync missed its SLA', 'Support portal response time elevated', 'Packet loss at regional edge', 'Build queue waiting for capacity', 'Outbound email delivery delayed', 'Session cache memory pressure', 'Billing webhook retries increasing', 'Service certificate approaching expiry', 'Analytics ingestion dropped events', 'Profile lookup p95 elevated']
const slug = name => name.toLowerCase().replaceAll(' ', '-')
const stamp = (actor, time) => ({ createdBy: actor, createdAt: time, updatedBy: actor, updatedAt: time })

export function createInitialData() {
  const currentUserId = 'usr-maya-chen'
  const timeZone = 'America/New_York'
  const epoch = '2026-11-16T14:00:00.000Z'
  const teams = teamNames.map((name, index) => ({ id: 'team-' + slug(name), name, description: ['Core infrastructure and reliability', 'Checkout and payments', 'Identity and access', 'Analytics and data systems', 'Customer-facing systems', 'Network and connectivity', 'Build and release tooling', 'Delivery infrastructure'][index] }))
  const users = people.map((name, index) => ({
    id: 'usr-' + slug(name), name, email: slug(name).replace('-', '.') + '@example.test',
    role: index === 0 ? 'Team Lead' : 'Responder', teamIds: [teams[index % teams.length].id],
  }))
  const coverageNames = [...teamNames, 'API Infrastructure', 'Payments', 'Data Pipelines', 'Site Reliability', 'Service Operations', 'Customer Support']
  const schedules = Array.from({ length: 30 }, (_, index) => {
    const name = coverageNames[index % 14] + (index < 14 ? ' Primary' : index < 28 ? ' Secondary' : index === 28 ? 'Weekend Response' : 'Release Coverage')
    const id = 'sch-' + slug(name)
    const zone = [timeZone, 'America/Chicago', 'America/Los_Angeles', 'Europe/London', 'UTC'][index % 5]
    const startHour = ['14', '15', '17', '09', '09'][index % 5]
    const startAt = '2026-11-16T' + startHour + ':00:00.000Z'
    const weekday = [1, 2, 3, 4, 5].map(dayOfWeek => ({ dayOfWeek, startTime: '09:00', endTime: '17:00' }))
    const layer = (suffix, layerName, members, restrictions) => ({
      id: id + '-' + suffix, name: layerName, userIds: members, rotationType: 'weekly', rotationDays: 7,
      startAt, handoffTime: '09:00', restrictions,
    })
    return {
      id, name, description: 'On-call coverage for ' + name.replace(/ (Primary|Secondary)$/, '') + '.',
      timeZone: zone, teamId: teams[index % 8].id,
      layers: [
        layer('core', 'Primary rotation', [users[index].id, users[(index + 8) % 36].id, users[(index + 16) % 36].id], index % 3 === 2 ? weekday : []),
        ...(index % 5 === 0 ? [layer('business', 'Business hours', [users[(index + 8) % 36].id, users[index].id], weekday)] : []),
      ],
      ...stamp(currentUserId, epoch),
    }
  })
  const escalationPolicies = Array.from({ length: 28 }, (_, index) => {
    const name = schedules[index].name
    const id = 'pol-' + slug(name)
    return {
      id, name, teamId: teams[index % 8].id, description: 'Routes alerts for ' + name + '.', repeatCount: index % 4,
      rules: [
        { id: id + '-01', delayMinutes: 15, targets: index % 7 === 6 ? [{ type: 'user', id: users[index].id }] : [
          { type: 'schedule', id: schedules[index].id }, ...(index % 4 === 0 ? [{ type: 'user', id: users[index].id }] : []),
        ] },
        { id: id + '-02', delayMinutes: 30, targets: [{ type: 'user', id: users[(index + 1) % 36].id }] },
      ],
      ...stamp(currentUserId, epoch),
    }
  })
  const services = servicesList.map((name, index) => {
    const policy = escalationPolicies[index === 0 ? 1 : index === 1 ? 2 : index === 2 ? 3 : index === 3 ? 0 : index % 26]
    return { id: 'svc-' + (index === 0 ? 'checkout' : slug(name)), name, description: 'Production monitoring for ' + name + '.', teamId: policy.teamId, escalationPolicyId: policy.id }
  })
  const scheduleOverrides = Array.from({ length: 12 }, (_, index) => ({
    id: index === 0 ? 'ovr-platform-01' : 'ovr-' + (index + 1), scheduleId: schedules[index].id, userId: users[index].id,
    startAt: new Date(Date.UTC(2026, 10, 18 + Math.floor(index / 4), 14)).toISOString(),
    endAt: new Date(Date.UTC(2026, 10, 18 + Math.floor(index / 4), 18)).toISOString(),
    status: index === 11 ? 'canceled' : 'active', canceledAt: index === 11 ? epoch : null, canceledBy: index === 11 ? currentUserId : null,
    ...stamp(currentUserId, epoch),
  }))
  const incidents = Array.from({ length: 64 }, (_, index) => {
    const service = services[index % services.length]
    const policy = escalationPolicies.find(item => item.id === service.escalationPolicyId)
    const number = 1042 - index
    const status = index % 8 < 2 ? 'triggered' : index % 8 < 4 ? 'acknowledged' : 'resolved'
    const createdAt = new Date(Date.UTC(2026, 10, 18, 16) - index * 17_400_000).toISOString()
    const acknowledgedAt = status === 'triggered' ? null : new Date(Date.parse(createdAt) + 180_000).toISOString()
    const resolvedAt = status === 'resolved' ? new Date(Date.parse(createdAt) + 1_680_000).toISOString() : null
    const owner = users[index % 5 === 2 ? 0 : index % people.length].id
    const title = index < 16 ? titles[index] : service.name + [' regional latency elevated', ' health checks failing', ' saturation above threshold', ' intermittent upstream timeouts'][Math.floor(index / 16)]
    return {
      id: 'inc-' + number, number, title, description: 'Monitoring detected abnormal behavior in ' + service.name + '. Review service metrics and recent deployments.',
      serviceId: service.id, escalationPolicyId: policy.id, policySnapshot: { policyId: policy.id, rules: structuredClone(policy.rules), repeatCount: policy.repeatCount },
      assignmentTarget: { type: 'escalation_policy', id: policy.id }, assigneeIds: [owner], status, urgency: index % 5 < 3 ? 'high' : 'low',
      priority: ['P2', 'P1', 'P3', 'P4', null, 'P5'][index % 6], acknowledgedAt, acknowledgedBy: acknowledgedAt ? owner : null,
      resolvedAt, resolvedBy: resolvedAt ? owner : null,
      ...stamp(currentUserId, createdAt), updatedAt: resolvedAt || acknowledgedAt || createdAt, updatedBy: status === 'triggered' ? currentUserId : owner,
    }
  })
  const incidentNotes = Array.from({ length: 40 }, (_, index) => ({
    id: 'note-' + incidents[index].number + '-01', incidentId: incidents[index].id,
    body: ['Reviewed the service dashboards and confirmed the alert.', 'Checked the latest deploy and shared the timeline with the service owner.', 'Reviewed upstream health checks. Continuing to monitor the affected region.', 'The on-call team is reviewing recent changes to the service.'][index % 4],
    createdBy: incidents[index].assigneeIds[0], createdAt: new Date(Date.parse(incidents[index].createdAt) + 240_000).toISOString(),
  }))
  const event = (type, entityType, entityId, actorId, createdAt, details) => ({ id: 'evt-' + type + '-' + (details.noteId || details.overrideId || entityId), type, entityType, entityId, actorId, createdAt, details })
  const activity = [
    ...incidents.flatMap(item => [
      event('incident.created', 'incident', item.id, item.createdBy, item.createdAt, { serviceId: item.serviceId, escalationPolicyId: item.escalationPolicyId, assigneeIds: item.assigneeIds }),
      ...(item.acknowledgedAt ? [event('incident.acknowledged', 'incident', item.id, item.acknowledgedBy, item.acknowledgedAt, { previousStatus: 'triggered', status: 'acknowledged' })] : []),
      ...(item.resolvedAt ? [event('incident.resolved', 'incident', item.id, item.resolvedBy, item.resolvedAt, { previousStatus: 'acknowledged', status: 'resolved' })] : []),
    ]),
    ...incidentNotes.map(note => event('incident.note_added', 'incident', note.incidentId, note.createdBy, note.createdAt, { noteId: note.id })),
    ...schedules.map(item => event('schedule.created', 'schedule', item.id, currentUserId, epoch, { layerIds: item.layers.map(layer => layer.id) })),
    ...scheduleOverrides.flatMap(item => {
      const details = { overrideId: item.id, userId: item.userId, startAt: item.startAt, endAt: item.endAt }
      return [
        event('schedule.override_added', 'schedule', item.scheduleId, currentUserId, epoch, details),
        ...(item.canceledAt ? [event('schedule.override_canceled', 'schedule', item.scheduleId, item.canceledBy, item.canceledAt, details)] : []),
      ]
    }),
    ...escalationPolicies.map(item => event('policy.created', 'escalation_policy', item.id, currentUserId, epoch, { ruleIds: item.rules.map(rule => rule.id), affectedServiceIds: services.filter(service => service.escalationPolicyId === item.id).map(service => service.id) })),
  ]
  return { account: { name: 'Acme Operations', currentUserId, timeZone }, users, teams, services, incidents, incidentNotes, schedules, scheduleOverrides, escalationPolicies, activity }
}
