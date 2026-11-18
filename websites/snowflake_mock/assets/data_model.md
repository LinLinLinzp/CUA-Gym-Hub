# Harbor state model

Use the following shape for `createInitialData()` and the development-phase `SCHEMA.md`. Every ID is a string. New records use uniquely generated IDs, and seeds use stable, readable IDs. `createdAt`, `updatedAt`, and `revokedAt` are ISO 8601 strings. Create one `new Date().toISOString()` per user transaction and reuse it across its writes. Values marked nullable use JSON `null`; tolerate missing values on injected records.

## Top-level keys

| Key | Type | Seed and purpose |
| --- | --- | --- |
| `account` | Account object | Northwind Analytics and the active user |
| `warehouses` | Warehouse array | 28 warehouses across X-Small, Small, Medium, Large, and X-Large, with a mix of Started and Suspended |
| `worksheets` | Worksheet array | 36 realistic titles and local SQL examples with a range of owner and context combinations |
| `roles` | Role array | 26 roles including `ACCOUNTADMIN`, `SECURITYADMIN`, `SYSADMIN`, `USERADMIN`, and `PUBLIC` |
| `users` | User array | 24 seeded colleagues and service identities |
| `grants` | Grant array | 64 distinct records with role-to-role, role-to-user, and warehouse privilege entries and some revocations |
| `queryRuns` | QueryRun array | 32 compact successful and failed run records linked to seeded worksheets |
| `activity` | Activity array | A small fixed set of examples, plus records for successful mutations and nonempty SQL runs |
| `catalog` | Database array | Three sample databases with nested schemas and an `ORDERS` table |

## Records and examples

```js
// Account
{ id: 'acct_northwind', name: 'Northwind Analytics', locator: 'NW24819',
  region: 'AWS US East (N. Virginia)', activeUserId: 'usr_morgan', activeRoleId: 'role_accountadmin' }

// User
{ id: 'usr_morgan', name: 'MORGAN_CHEN', displayName: 'Morgan Chen', type: 'PERSON',
  defaultRoleId: 'role_accountadmin', createdAt: '2026-08-04T14:00:00.000Z' }

// Warehouse
{ id: 'wh_analytics', name: 'ANALYTICS_WH', size: 'SMALL', status: 'STARTED',
  ownerRoleId: 'role_sysadmin', autoSuspendSeconds: 300, autoResume: true,
  minClusters: 1, maxClusters: 2, activeClusters: 1, running: 2, queued: 0,
  comment: 'Ad hoc analysis and business reporting', createdByUserId: 'usr_morgan',
  createdAt: '2026-08-04T14:00:00.000Z', updatedAt: '2026-09-14T10:30:00.000Z' }

// Worksheet
{ id: 'ws_order_sample', title: 'Order sample', sql: 'SELECT * FROM ORDERS LIMIT 10;',
  context: { roleId: 'role_bi_reader', warehouseId: 'wh_analytics',
    databaseId: 'db_commerce', schemaId: 'schema_sales' },
  ownerUserId: 'usr_morgan', createdAt: '2026-09-08T09:00:00.000Z', updatedAt: '2026-09-14T10:30:00.000Z' }

// Role
{ id: 'role_bi_reader', name: 'BI_READER', type: 'CUSTOM', comment: 'Read access for reporting teams',
  ownerRoleId: 'role_securityadmin', createdByUserId: 'usr_morgan',
  createdAt: '2026-08-06T13:30:00.000Z', updatedAt: '2026-09-02T16:00:00.000Z' }

// Grant
{ id: 'grant_bi_sysadmin', kind: 'ROLE_TO_ROLE', roleId: 'role_bi_reader', targetId: 'role_sysadmin',
  privilege: null, status: 'ACTIVE', grantedByUserId: 'usr_morgan', grantedByRoleId: 'role_securityadmin',
  createdAt: '2026-08-06T13:30:00.000Z', revokedAt: null, revokedByUserId: null }

// QueryRun
{ id: 'run_order_sample', worksheetId: 'ws_order_sample', worksheetTitle: 'Order sample',
  sql: 'SELECT * FROM ORDERS LIMIT 10', actorUserId: 'usr_morgan',
  context: { roleId: 'role_bi_reader', roleName: 'BI_READER', warehouseId: 'wh_analytics',
    warehouseName: 'ANALYTICS_WH', databaseId: 'db_commerce', databaseName: 'COMMERCE',
    schemaId: 'schema_sales', schemaName: 'SALES' },
  status: 'SUCCEEDED', rowCount: 1, durationMs: 18, columns: ['ORDER_ID', 'ORDER_TOTAL'],
  rows: [[1001, 139.50]], error: null, createdAt: '2026-09-14T10:30:00.000Z' }

// Activity
{ id: 'evt_resize_analytics', type: 'warehouse.updated', entityType: 'warehouse',
  entityId: 'wh_analytics', entityLabel: 'ANALYTICS_WH', actorUserId: 'usr_morgan',
  actorRoleId: 'role_accountadmin', createdAt: '2026-09-14T10:30:00.000Z',
  changes: { size: { from: 'XSMALL', to: 'SMALL' } }, relatedIds: {} }

// Database with nested schema and table fixtures
{ id: 'db_commerce', name: 'COMMERCE', schemas: [
  { id: 'schema_sales', name: 'SALES', tables: [
    { id: 'tbl_orders', name: 'ORDERS', columns: ['ORDER_ID', 'ORDER_TOTAL'],
      rows: [[1001, 139.50], [1002, 86.00], [1003, 215.90]] }
  ] }
] }
```

- **Account and users.** Strings throughout, with nullable `activeUserId`, `activeRoleId`, and `defaultRoleId`. User type is `PERSON` or `SERVICE`. If the account points to a missing user or role, display a generic identity and use `null` for the missing actor link. The area can still be browsed and managed with injected empty collections.
- **Warehouses.** `size` is `XSMALL`, `SMALL`, `MEDIUM`, `LARGE`, or `XLARGE`. `status` is `STARTED` or `SUSPENDED`. `autoSuspendSeconds`, cluster counts, `running`, and `queued` are numbers. `autoResume` is boolean. `ownerRoleId` and `createdByUserId` are nullable. Seed active cluster counts within the configured range and zero work counters for suspended warehouses. New records start with zero running and queued. Counters are fixtures. Explicit suspend sets both workload counters and active clusters to zero. Resume starts with zero workload and the minimum active clusters. Editing cluster limits on a started warehouse clamps its active cluster count into the new range.
- **Worksheets.** All `context` IDs and `ownerUserId` are nullable; `title` and `sql` are strings. Choose existing IDs as defaults when available. Changing a database clears its old schema. For `SELECT * FROM ORDERS`, resolve the unqualified name within the selected database and schema; use the named database and schema for fully qualified SQL. Give an actionable context error when the lookup fails.
- **Roles.** `type` is `SYSTEM` or `CUSTOM`; `ownerRoleId` and `createdByUserId` are nullable. Seed the system chain `USERADMIN → SECURITYADMIN → ACCOUNTADMIN` and `SYSADMIN → ACCOUNTADMIN` with arrows pointing from a child to its parent. Assign users and custom child roles across departments. On custom role deletion clear current references to that role in `account.activeRoleId`, `users[].defaultRoleId`, `worksheets[].context.roleId`, and other roles’ or warehouses’ `ownerRoleId` values. Keep creator and actor fields in historical records intact.
- **Grants.** `kind` is `ROLE_TO_ROLE`, `ROLE_TO_USER`, or `WAREHOUSE_PRIVILEGE`. For role grants, `roleId` is the role being granted and `targetId` is the receiving parent role or user. For a warehouse privilege, `roleId` is the grantee, `targetId` is the warehouse, and `privilege` is `USAGE`, `OPERATE`, or `MONITOR`; other grants use `null` privilege. `status` is `ACTIVE` or `REVOKED`, and the grant and revoke actor IDs and `revokedAt` can be nullable. Determine duplicate grants by kind, role, target, and privilege. Cascade revocations use the usual revocation fields and events in the same transaction as the object drop.
- **Query runs.** All values in `context` are nullable strings. `status` is `SUCCEEDED` or `FAILED`; `rowCount` and `durationMs` are numbers. `columns` is a string array, and `rows` is an array of arrays of JSON scalars. Failed runs use zero rows and `error: { code: string, message: string }`; successes use `error: null`. Retain snapshots after deletion of live objects. Use bounded catalog data and deterministic results. Measure or use a fixed simulated duration without background writes.
- **Activity.** `entityType` is `warehouse`, `worksheet`, `role`, or `grant`. Keep `entityLabel` for history. IDs under `relatedIds` are strings or arrays of strings, with keys such as `queryRunId`, `revokedGrantIds`, and `clearedWorksheetIds`. `changes` maps field or dotted context names to JSON values under `from` and `to`, with `null` for missing values. Creation and deletion can report just the subject and related IDs. Skip update events for unchanged values.
- **Catalog.** Use plain nested arrays with strings for IDs, names, and column labels. Fixture rows contain JSON scalars. Seed at least 24 synthetic ORDERS rows with numeric amounts. The catalog has no editing surface.

## Observable state changes

| User action | Writes in one Harbor transaction |
| --- | --- |
| Create warehouse | Append `warehouses` and `warehouse.created` in `activity` |
| Edit warehouse | Update changed settings, `activeClusters` if clamped, and `updatedAt`; append `warehouse.updated` |
| Suspend or resume | Update `warehouses[].status`, `activeClusters`, `running`, `queued`, and `updatedAt`; append corresponding activity |
| Drop warehouse | Remove the warehouse, clear matching worksheet `context.warehouseId` and update affected worksheets’ `updatedAt`, revoke matching active grants, append `warehouse.dropped` and cascade revocation events |
| Create worksheet | Append `worksheets` and `worksheet.created` |
| Rename or save worksheet | Update changed `title`, `sql`, or `context`, plus `updatedAt`; append `worksheet.updated` |
| Run a nonempty SQL statement | Save pending worksheet edits when present, append `queryRuns` and `worksheet.query_ran` with its `queryRunId`, and apply the warehouse-resume changes if the run resumes it |
| Delete worksheet | Remove the worksheet and append `worksheet.deleted` |
| Create role | Append `roles` and `role.created`; optional parent adds `grants` and `grant.created` |
| Edit role comment | Update `roles[].comment` and `updatedAt`; append `role.updated` |
| Drop custom role | Remove role, clear matching live references, update the affected worksheets’, roles’, and warehouses’ `updatedAt`, revoke related active grants, append `role.dropped` and cascade revocation events |
| Grant access | Append `grants` and `grant.created` |
| Revoke access | Update `grants[].status`, `revokedAt`, and `revokedByUserId`; append `grant.revoked` |

Derive list totals and graph edges from their underlying records. Only committed actions change business state. Passive views, sorting, filters, empty edits, validation failures that prevent committing, and idle time leave business state untouched.
