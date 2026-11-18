const teams = [
  ['Platform', 'Service mesh overview', 'Kubernetes capacity', 'Deployment health', 'Control plane latency', 'Build pipeline throughput', 'Runtime inventory'],
  ['Checkout', 'Checkout service overview', 'Payment authorization', 'Order processing', 'Cart conversion', 'Checkout API latency', 'Refund processing'],
  ['Edge', 'Edge traffic overview', 'CDN cache efficiency', 'Gateway latency', 'Regional availability', 'Origin request health', 'DNS performance'],
  ['Storage', 'Storage workload overview', 'Database connections', 'Replication lag', 'Object store throughput', 'Backup completion', 'Disk capacity'],
  ['Reliability', 'Incident response overview', 'Service level objectives', 'Error budget burn', 'Synthetic probe results', 'On-call operations', 'Dependency availability'],
  ['Security', 'Security operations overview', 'Access log analytics', 'Certificate expiry', 'Policy enforcement', 'Identity service health', 'Audit event throughput'],
]
const actor = 'usr-maya'
const date = '2026-01-12T14:25:00.000Z'
const creation = { createdBy: actor, createdAt: date }
const revision = { ...creation, updatedBy: actor, updatedAt: date }
export const defaultRange = { from: 'now-6h', to: 'now' }
export const sourceProm = 'ds-prom'

export function createInitialData() {
  const folders = []
  const dashboards = []
  const evaluationGroups = []
  const alertRules = []
  const contactPoints = []

  teams.forEach(([team, ...titles], teamIndex) => {
    const key = team.toLowerCase()
    const folderId = 'fld-' + key
    const overviewId = 'db-' + key + '-overview'
    const latencyId = key === 'checkout' ? 'pnl-latency' : 'pnl-' + key + '-latency'
    const contactId = 'cp-' + key
    folders.push({ id: folderId, title: team, ...creation })

    titles.forEach((title, index) => {
      const id = index ? 'db-' + key + '-' + index : overviewId
      const definitions = [
        [index ? id + '-trend' : latencyId, index ? 'Request throughput' : 'p95 request latency', 'timeseries', index ? 'requests/s' : 'seconds', key + '_request_duration_seconds'],
        [id + '-stat', 'Successful requests', 'stat', '%', key + '_request_success_ratio'],
        [id + '-table', 'Regional request summary', 'table', 'requests/s', key + '_requests_total'],
      ]
      dashboards.push({
        id, title, folderId,
        description: index ? 'Operational metrics for ' + title.toLowerCase() + '.' : 'Latency, traffic, and availability across the ' + key + ' services.',
        tags: [key, index % 2 ? 'staging' : 'production', index % 3 ? 'traffic' : 'slo'],
        timeRange: { from: index % 2 ? 'now-24h' : 'now-6h', to: 'now' },
        panels: (index === 5 ? [] : definitions.slice(0, index === 0 ? 3 : (index % 3) + 1)).map(
          ([panelId, panelTitle, type, unit, query]) => ({
            id: panelId, title: panelTitle, type, unit, dataSourceId: sourceProm, query: 'rate(' + query + '[5m])',
          }),
        ),
        ...revision,
        updatedAt: new Date(Date.UTC(2026, 0, 12 + index + teamIndex, 14, 25)).toISOString(),
      })
    })

    const receivers = ['on-call', 'engineering', 'incident channel', 'event intake', 'weekly digest']
    receivers.forEach((name, index) => {
      const id = index ? contactId + '-' + index : contactId
      const email = { addresses: [key + '-' + (index ? 'digest' : 'oncall') + '@example.test'] }
      const slack = { channel: '#' + key + '-oncall', url: 'https://hooks.example.test/' + key }
      const webhook = { url: 'https://events.example.test/' + key, method: 'POST' }
      const settingsByType = { email, slack, webhook }
      const types = [['email', 'slack'], ['email'], ['slack'], ['webhook'], ['email', 'webhook']]
      contactPoints.push({
        id, name: team + ' ' + name, ...revision,
        integrations: types[index].map((type) => ({
          id: 'int-' + id.slice(3) + '-' + type,
          type, disableResolveMessage: index === 4, settings: settingsByType[type],
        })),
      })
    })

    const ruleNames = ['API error rate', 'p95 latency above target', 'Request volume drop', 'Saturation near limit', 'Probe failures', 'Job completion delayed']
    const metrics = ['request_error_ratio', 'request_duration_seconds', 'requests_total', 'saturation_ratio', 'probe_success', 'job_duration_seconds']
    const states = ['normal', 'normal', 'pending', 'alerting', 'no_data', 'error']
    for (const [groupIndex, name] of ['service-slos', 'infrastructure'].entries()) {
      const id = 'grp-' + key + (groupIndex ? '-infra' : '-slos')
      evaluationGroups.push({ id, name, folderId, intervalSeconds: groupIndex ? 120 : 60, ...creation })
      for (let offset = 0; offset < 3; offset++) {
        const index = groupIndex * 3 + offset
        const evaluationState = states[(index + teamIndex) % states.length]
        alertRules.push({
          id: 'rule-' + key + (index ? '-' + index : '-errors'),
          name: team + ' ' + ruleNames[index],
          folderId, evaluationGroupId: id, dataSourceId: sourceProm,
          query: 'rate(' + key + '_' + metrics[index] + '[5m])',
          condition: { operator: index === 2 || index === 4 ? 'lt' : 'gt', threshold: [0.05, 0.7, 12, 0.85, 0.9, 60][index] },
          pendingSeconds: index % 2 ? 120 : 300, noDataState: 'no_data', errorState: 'error',
          labels: { severity: index % 2 ? 'warning' : 'critical', team: key },
          annotations: { summary: ruleNames[index] + ' for ' + team + '.', runbookUrl: 'https://runbooks.example.test/' + key },
          contactPointId: index === 5 ? null : index >= 3 ? contactId + '-2' : contactId,
          dashboardId: index < 3 ? overviewId : null,
          panelId: index === 0 ? latencyId : null,
          isPaused: (teamIndex + index) % 7 === 6, evaluationState,
          health: ['no_data', 'error'].includes(evaluationState) ? evaluationState : 'ok',
          ...revision,
        })
      }
    }
  })
  return {
    workspace: { id: 'ws-acme', name: 'Acme Operations' },
    currentUser: { id: actor, name: 'Maya Chen', email: 'maya@example.test', role: 'Editor' },
    folders,
    dataSources: [
      { id: sourceProm, name: 'Prometheus', type: 'prometheus' },
      { id: 'ds-testdata', name: 'TestData DB', type: 'testdata' },
    ],
    dashboards,
    starredDashboardIds: ['db-checkout-overview', 'db-platform-overview', 'db-reliability-overview'],
    evaluationGroups, alertRules, contactPoints,
    notificationTests: [],
    activity: [],
  }
}
