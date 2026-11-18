import { contextSnapshot, executeSql } from '../sql.js'

const createdAt = '2026-08-04T14:00:00.000Z'
const date = i => '2026-09-' + String(8 + i % 20).padStart(2, '0') + 'T10:30:00.000Z'
const key = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '_')
const userNames = [
  'Morgan Chen', 'Avery Brooks', 'Priya Raman', 'Jordan Ellis', 'Mateo Rivera', 'Nora Kim',
  'Sofia Bennett', 'Arjun Shah', 'Lena Hoffmann', 'Elliot Parker', 'Maya Thompson', 'Owen Reed',
  'Isabel Torres', 'Alex Nguyen', 'Riley Carter', 'Samira Patel', 'Oliver Hayes', 'Zoe Martin',
  'Hannah Price', 'Daniel Wu', 'Ingest Runner', 'Billing Pipeline', 'Dashboard Refresh', 'Quality Monitor',
]
const roleNames = [
  'ACCOUNTADMIN', 'SECURITYADMIN', 'SYSADMIN', 'USERADMIN', 'PUBLIC', 'BI_READER',
  'BI_DEVELOPER', 'DATA_ENGINEER', 'PLATFORM_OPERATOR', 'FINANCE_ANALYST', 'FINANCE_OWNER',
  'SALES_ANALYST', 'SALES_OWNER', 'SUPPORT_ANALYST', 'MARKETING_ANALYST', 'CRM_LOADER',
  'INGEST_SERVICE', 'QUALITY_REVIEWER', 'FULFILLMENT_READER', 'REVENUE_OPS',
  'PRODUCT_ANALYST', 'GROWTH_READER', 'RISK_ANALYST', 'CATALOG_EDITOR', 'COMPLIANCE_READER', 'FORECAST_EDITOR',
]
const warehouseSeeds = [
  ['ANALYTICS_WH', 'Ad hoc analysis and business reporting'],
  ['INGEST_WH', 'Scheduled partner and customer feeds'],
  ['TRANSFORM_WH', 'Daily transformation jobs'],
  ['FINANCE_WH', 'Monthly close and reconciliations'],
  ['REPORTING_WH', 'Shared reporting compute'],
  ['MARKETING_WH', 'Campaign measurement and attribution'],
  ['REVENUE_WH', 'Revenue operations and forecasting'],
  ['DATA_SCIENCE_WH', 'Exploratory modeling'],
  ['BILLING_WH', 'Invoice and usage checks'],
  ['SALES_WH', 'Sales operations dashboards'],
  ['FULFILLMENT_WH', 'Shipment analysis and SLA reporting'],
  ['CATALOG_WH', 'Product enrichment and inventory'],
  ['SUPPORT_WH', 'Case volume and resolution time'],
  ['SANDBOX_WH', 'Development and prototyping'],
  ['QUALITY_WH', 'Validation jobs and sampling'],
  ['STREAMING_WH', 'Micro-batch processing'],
  ['RISK_WH', 'Risk and exception monitoring'],
  ['COMPLIANCE_WH', 'Audit and compliance reporting'],
  ['MIGRATION_WH', 'Data migration and backfills'],
  ['PARTNER_WH', 'Partner onboarding analysis'],
  ['FORECAST_WH', 'Demand planning'],
  ['STAGING_WH', 'Pre-release integration checks'],
  ['CUSTOMER_360_WH', 'Customer profile aggregation'],
  ['RETENTION_WH', 'Cohort and repeat purchase analysis'],
  ['EXECUTIVE_WH', 'Executive reporting'],
  ['AUDIT_WH', 'Access and change reviews'],
  ['PRODUCT_WH', 'Product performance and telemetry'],
  ['ARCHIVE_WH', 'Occasional archive queries'],
]
const worksheetTitles = [
  'Order sample', 'Warehouse inventory', 'Role inventory', 'Daily sales check', 'Close reconciliation', 'Customer context',
  'Partner feed sample', 'Shipment backlog', 'Quarterly forecast', 'Warehouse review', 'Catalog spot check', 'Analysis context',
  'Campaign attribution', 'Renewals snapshot', 'Support case review', 'Revenue checks', 'Data quality sampling', 'Finance context',
  'Returns audit', 'Order history sample', 'Fulfillment dashboard', 'Role audit', 'Segment preview', 'Growth context',
  'Billing validation', 'Inventory sweep', 'Demand planning', 'Compute capacity', 'Regional orders', 'Risk context',
  'Access review', 'Product taxonomy', 'Customer refresh', 'Pipeline health', 'Large order sample', 'Analyst context',
]

export function createInitialData() {
  const account = { id: 'acct_northwind', name: 'Northwind Analytics', locator: 'NW24819', region: 'AWS US East (N. Virginia)', activeUserId: 'usr_morgan', activeRoleId: 'role_accountadmin' }
  const roles = roleNames.map((name, i) => ({
    id: 'role_' + key(name), name, type: i < 5 ? 'SYSTEM' : 'CUSTOM',
    comment: ['Account administration', 'Security and grants administration', 'Object and compute administration', 'User and role administration', 'Baseline access available to all users', 'Read access for reporting teams'][i] ?? name.toLowerCase().replaceAll('_', ' ') + ' access',
    ownerRoleId: i === 0 ? null : i < 5 ? 'role_accountadmin' : 'role_securityadmin',
    createdByUserId: account.activeUserId, createdAt, updatedAt: date(i),
  }))
  const users = userNames.map((displayName, i) => ({
    id: i === 0 ? 'usr_morgan' : 'usr_' + key(displayName), name: key(displayName).toUpperCase(), displayName,
    type: i < 20 ? 'PERSON' : 'SERVICE', defaultRoleId: i === 0 ? account.activeRoleId : roles[5 + (i - 1) % 21].id, createdAt,
  }))
  const sizes = ['SMALL', 'XSMALL', 'MEDIUM', 'LARGE', 'XLARGE']
  const warehouses = warehouseSeeds.map(([name, comment], i) => {
    const started = i % 3 === 0 || i % 7 === 0
    const minClusters = i % 8 === 4 ? 2 : 1
    return {
      id: 'wh_' + key(name.slice(0, -3)), name, comment, size: sizes[i % sizes.length], status: started ? 'STARTED' : 'SUSPENDED',
      ownerRoleId: i % 3 !== 2 ? 'role_sysadmin' : roles[5 + i % 21].id,
      autoSuspendSeconds: [300, 60, 600, 120, 0][i % 5], autoResume: i % 5 !== 4,
      minClusters, maxClusters: minClusters + (i % 3 === 0 ? 1 : i % 3 === 2 ? 2 : 0),
      activeClusters: started ? minClusters : 0, running: started ? (i + 2) % 8 : 0, queued: started ? i % 4 : 0,
      createdByUserId: account.activeUserId, createdAt, updatedAt: date(i),
    }
  })
  const columns = ['ORDER_ID', 'CUSTOMER', 'ORDER_STATUS', 'ORDER_TOTAL']
  const rows = Array.from({ length: 30 }, (_, i) => [
    1001 + i, ['Alder & Co.', 'Cedar Lane Market', 'Harbor Supply', 'Wren House', 'Juniper Works'][i % 5],
    ['SHIPPED', 'PENDING', 'DELIVERED', 'DELIVERED', 'RETURNED'][i % 5], i < 3 ? [139.50, 86.00, 215.90][i] : ((i * 3217 + 7250) % 32530) / 100,
  ])
  const catalog = [
    { id: 'db_commerce', name: 'COMMERCE', schemas: [
      { id: 'schema_sales', name: 'SALES', tables: [{ id: 'tbl_orders', name: 'ORDERS', columns, rows }] },
      { id: 'schema_fulfillment', name: 'FULFILLMENT', tables: [] },
    ] },
    { id: 'db_finance', name: 'FINANCE', schemas: [{ id: 'schema_ledger', name: 'LEDGER', tables: [] }] },
    { id: 'db_platform', name: 'PLATFORM', schemas: [{ id: 'schema_operations', name: 'OPERATIONS', tables: [] }] },
  ]
  const statements = ['SELECT * FROM ORDERS LIMIT 10;', 'SHOW WAREHOUSES;', 'SHOW ROLES;',
    'SELECT * FROM COMMERCE.SALES.ORDERS LIMIT 5;', "SELECT 'Northwind' AS ACCOUNT, 1 AS READY;", 'SELECT CURRENT_ROLE(), CURRENT_WAREHOUSE();']
  const worksheets = worksheetTitles.map((title, i) => {
    const database = catalog[i % statements.length === 0 ? 0 : i % 3]
    return {
      id: i === 0 ? 'ws_order_sample' : 'ws_' + key(title), title, sql: statements[i % statements.length],
      context: { roleId: roles[5 + i % 21].id, warehouseId: warehouses[[11, 18, 30].includes(i) ? 4 : i % 28].id, databaseId: database.id, schemaId: database.schemas[0].id },
      ownerUserId: users[i % 20].id, createdAt, updatedAt: date(i),
    }
  })
  function grant(id, kind, roleId, targetId, privilege = null, revoked = false) {
    return {
      id, kind, roleId, targetId, privilege, status: revoked ? 'REVOKED' : 'ACTIVE',
      grantedByUserId: account.activeUserId, grantedByRoleId: 'role_securityadmin', createdAt,
      revokedAt: revoked ? date(8) : null, revokedByUserId: revoked ? account.activeUserId : null,
    }
  }
  const grants = [
    grant('grant_user_security', 'ROLE_TO_ROLE', 'role_useradmin', 'role_securityadmin'),
    grant('grant_security_account', 'ROLE_TO_ROLE', 'role_securityadmin', 'role_accountadmin'),
    grant('grant_sys_account', 'ROLE_TO_ROLE', 'role_sysadmin', 'role_accountadmin'),
    ...roles.slice(5).map(({ id }, i) => grant(i === 0 ? 'grant_bi_sysadmin' : 'grant_parent_' + i, 'ROLE_TO_ROLE', id, roles[i % 3 === 1 ? 1 : 2].id)),
    ...users.map(user => grant('grant_' + user.id, 'ROLE_TO_USER', user.defaultRoleId, user.id)),
    ...warehouses.slice(0, 16).map((warehouse, i) => grant('grant_wh_' + i, 'WAREHOUSE_PRIVILEGE', roles[5 + i % 21].id, warehouse.id, ['USAGE', 'OPERATE', 'MONITOR'][i % 3], i % 5 === 4)),
  ]
  const queryRuns = worksheets.slice(0, 32).map((worksheet, i) => {
    const snapshot = contextSnapshot(catalog, roles, warehouses, worksheet.context)
    const sql = worksheet.sql.slice(0, -1)
    const result = executeSql(sql, { catalog, roles, warehouses }, worksheet.context, snapshot)
    return {
      id: i === 0 ? 'run_order_sample' : 'run_seed_' + i, worksheetId: worksheet.id, worksheetTitle: worksheet.title,
      sql, actorUserId: worksheet.ownerUserId, context: snapshot,
      status: result.error ? 'FAILED' : 'SUCCEEDED', rowCount: result.rows.length, durationMs: 18 + i % 9,
      columns: result.columns, rows: result.rows, error: result.error ?? null, createdAt: date(i),
    }
  })
  const activity = [
    ['evt_resize_analytics', 'warehouse.updated', 'warehouse', warehouses[0], 6, { size: { from: 'XSMALL', to: 'SMALL' } }, {}],
    ['evt_order_sample_ran', 'worksheet.query_ran', 'worksheet', worksheets[0], 0, {}, { queryRunId: queryRuns[0].id }],
    ['evt_bi_reader_created', 'role.created', 'role', roles[5], 3, {}, {}],
    ['evt_reporting_created', 'warehouse.created', 'warehouse', warehouses[4], 2, {}, {}],
    ['evt_forecast_created', 'worksheet.created', 'worksheet', worksheets[8], 1, {}, {}],
  ].map(([id, type, entityType, entity, i, changes, relatedIds]) => ({
    id, type, entityType, entityId: entity.id, entityLabel: entity.name ?? entity.title,
    actorUserId: account.activeUserId, actorRoleId: account.activeRoleId, createdAt: date(i), changes, relatedIds,
  }))
  return { account, warehouses, worksheets, roles, users, grants, queryRuns, activity, catalog }
}
