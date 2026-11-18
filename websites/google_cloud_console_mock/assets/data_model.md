# Google Cloud Console planned state model

`src/data/seed.js` exports the pure `createInitialData()` factory. Each invocation returns fresh JSON-compatible records. Use fixed IDs and timestamps for seeds. Generate IDs and `new Date().toISOString()` timestamps for user changes. Seed by deterministic enumeration and never append default rows to a server-supplied array.

## Top-level shape

```js
{
  currentUser: { id, displayName, email },
  projects: [],
  iamBindings: [],
  vmInstances: [],
  buckets: [],
  storageObjects: [],
  billingAccounts: [],
  billingCosts: [],
  budgets: [],
  activity: [],
}
```

Use string IDs as durable references. Store selections in route/query state and keep dialogs, filters, pagination, and feedback in local UI state. Keep display labels and fixed option catalogs in code. Defaults may include missing parents after injection, so resolve relationships by ID at render time and handle unavailable records. Use the first available scope only when a scope was omitted. For a missing optional value, render an em dash or omit the corresponding detail row.

In the tables below, `Timestamp` is an ISO 8601 string, such as `2026-11-04T14:18:00.000Z`. `Creation` adds `createdAt: Timestamp` and `actorId: string`. `Update` adds optional `updatedAt: Timestamp` and `updatedBy: string`; write them only on a mutation to an existing record. The actor for seeded and default user operations can be `user-riley-morgan`.

## User and project

| Entity | Fields and types | Example values |
|---|---|---|
| `currentUser` | `id: string`, `displayName: string`, `email: string` | `user-riley-morgan`, Riley Morgan, `riley.morgan@example.test` |
| `projects[]` | `id: string`, `name: string`, `number: string`, `billingAccountId: string or null`, Creation, Update | `northstar-platform`, Northstar Platform, `794120603815`, `billing-northstar` |

Use four projects with fixed IDs `northstar-platform`, `ridge-staging`, `studio-research`, and `greenfield-sandbox`. List Northstar first. Link the first two to `billing-northstar`, Studio Research to `billing-research`, and leave Greenfield Sandbox unlinked. A billing link mutation modifies the project and writes an activity entry with both account IDs. Historical costs retain their original account reference.

## IAM bindings

| Field | Type | Example |
|---|---|---|
| `id` | string | `iam-001` |
| `projectId` | project ID | `northstar-platform` |
| `principalType` | `user\|group\|serviceAccount` | `group` |
| `principal` | string, normalized email | `platform-ops@example.test` |
| `roleId` | string | `roles/compute.instanceAdmin.v1` |
| `source` | `direct\|inherited` | `direct` |
| `sourceName` | optional string for inherited roles | Northstar Organization |
| `status` | `active\|revoked` | `active` |
| Creation, Update | common fields | See above |

Seed 36 grants. Make the default project expose at least 24 distinct principals after grouping, with several receiving multiple roles. Include direct and inherited grants and a mix of users, groups, and service accounts. Offer Viewer, Editor, Compute Instance Admin (v1), Storage Admin, Storage Object Viewer, and Billing Viewer in the local role catalog. A recognized role shows a friendly label plus its ID in the picker. Render unknown injected roles with their IDs. Uniqueness is checked on active `projectId + principalType + principal + roleId`. A restored grant creates a new ID and leaves its revoked predecessor in history.

## VM instances

| Field | Type | Example |
|---|---|---|
| `id`, `projectId`, `name` | strings | `vm-001`, `northstar-platform`, `edge-router-01` |
| `region`, `zone`, `machineType` | strings | `us-central1`, `us-central1-a`, `e2-standard-2` |
| `bootImage`, `bootDiskGb` | string, integer | `debian-12`, `30` |
| `internalIp`, `externalIp` | string, string or null | `10.24.0.11`, `192.0.2.11` |
| `status` | `RUNNING\|TERMINATED\|DELETED` | `RUNNING` |
| `lastResetAt` | optional timestamp | `2026-11-04T14:18:00.000Z` |
| Creation, Update | common fields | See above |

Seed 36 VMs, including 24 in the default project with running and stopped records across three or more zones. Include E2 machine sizes and Debian 12 and Ubuntu 24.04 LTS boot images. Generate deterministic private-range and documentation-range addresses for seeds, and assign synthetic addresses on create. Use compatible zone options for each region. External IP is `null` when it is disabled. The active table filters `DELETED`; direct links can show the deletion status without lifecycle controls.

## Buckets and stored object metadata

| Entity | Fields and types | Example values |
|---|---|---|
| `buckets[]` | `id: string`, `projectId: string`, `name: string`, `locationType: region\|dual-region\|multi-region`, `location: string`, `storageClass: STANDARD\|NEARLINE\|COLDLINE\|ARCHIVE`, `accessMode: uniform\|fine-grained`, `publicAccessPrevention: boolean`, `status: active\|deleted`, Creation, Update | `bucket-001`, `northstar-platform`, `northstar-telemetry-raw`, `region`, `us-central1`, `STANDARD`, `uniform`, `true`, `active` |
| `storageObjects[]` | `id: string`, `bucketId: string`, `name: string`, `sizeBytes: integer`, `contentType: string`, `status: active\|deleted`, Creation, Update | `object-001`, `bucket-001`, `2026/11/access-log.ndjson`, `20480`, `application/x-ndjson`, `active` |

Seed 36 buckets, including 24 in the default project, and 72 objects across the buckets. Include empty buckets, regional `us-central1` and `europe-west1`, dual-region `nam4`, and multi-region `us`/ `eu` choices. Track bucket count from active bucket records and object counts from active object records. Upload uses browser File metadata with `application/octet-stream` as an unknown type fallback. Treat input paths as object names. A multiple-file upload checks duplicate names within the batch and bucket before creating the rows together. Delete an empty bucket by tombstoning it and retaining its deleted object rows.

## Billing accounts, costs and budgets

| Entity | Fields and types | Example values |
|---|---|---|
| `billingAccounts[]` | `id: string`, `name: string`, `currency: string`, `status: active\|closed` | `billing-northstar`, Northstar Operating Account, `USD`, `active` |
| `billingCosts[]` | `id: string`, `billingAccountId: string`, `projectId: string`, `date: YYYY-MM-DD string`, `service: string`, `amount: number`, `currency: string` | `cost-001`, `billing-northstar`, `northstar-platform`, `2026-11-04`, Compute Engine, `54.35`, `USD` |
| `budgets[]` | `id: string`, `billingAccountId: string`, `name: string`, `projectIds: string[]`, `period: monthly`, `amount: number`, `currency: string`, `thresholds: Threshold[]`, `status: active\|deleted`, Creation, Update | `budget-001`, `billing-northstar`, Platform monthly operations, `['northstar-platform']`, `monthly`, `1200.00`, `USD`, `[{ percent: 50, basis: 'actual' }]`, `active` |
| Threshold | `percent: number`, `basis: actual\|forecast` | `90`, `forecast` |

Seed 2 active USD billing accounts, 96 costs across both accounts, and 24 active budgets in the default billing account. Seed October and November 2026 cost dates with multiple services, including Compute Engine, Cloud Storage, and Cloud Logging. Use stable IDs `cost-001` through `cost-096` and `budget-001` through `budget-024`. Reports open on the latest period available for the selected account and show its dates. Budget current month and month-to-date metrics derive from each task's clock and date rows. Budget progress uses account, project scope and billing period. An empty `projectIds` array means all projects under the account. Budget thresholds are finite positive percentages expressed as percentages, such as `50` for 50%. Accept each percentage once per basis. Round stored currency amounts and aggregate in cents. Show only active accounts as billing link destinations.

## Activity and observable mutations

An `activity[]` row stores `id: string`, `kind: string`, `entityId: string`, optional `projectId: string`, optional `billingAccountId: string`, `actorId: string`, `createdAt: Timestamp`, and `changes: object`. The project or account ID locates the event in its scope. For object activity, include `changes.bucketId` as well. Use concise values to keep persisted history compact. Keep UI sentences derived from the data.

| Action | State row and resulting fields | Activity kind and minimum changes |
|---|---|---|
| Grant or add role | Add active `iamBindings` row with Creation | `iam.grant` · `principal`, `roleId`, `status` |
| Revoke role | Set binding `status` to `revoked` with Update | `iam.revoke` · `principal`, `roleId`, `status` |
| Replace roles | Apply adds and revocations together | One grant or revoke entry per changed binding |
| Create VM | Add running `vmInstances` row with Creation | `vm.create` · `name`, `zone`, `status` |
| Stop, start, reset or delete VM | Set `status` or `lastResetAt` with Update | `vm.stop`, `vm.start`, `vm.reset`, `vm.delete` · `name`, `status`, plus `lastResetAt` on reset |
| Create bucket | Add active `buckets` row with Creation | `bucket.create` · `name`, `location`, `status` |
| Update bucket class | Set `storageClass` with Update | `bucket.update` · `name`, `storageClass` |
| Delete bucket | Set bucket `status` to `deleted` with Update | `bucket.delete` · `name`, `status` |
| Add object metadata | Add active `storageObjects` row with Creation | `object.upload` · `bucketId`, `name`, `sizeBytes`, `status` |
| Delete object metadata | Set object `status` to `deleted` with Update | `object.delete` · `bucketId`, `name`, `status` |
| Create budget | Add active `budgets` row with Creation | `budget.create` · `name`, `amount`, `currency`, `status` |
| Edit budget | Set submitted `name`, `projectIds`, `amount`, and `thresholds` with Update | `budget.update` · `name`, `amount`, `currency`, `status` |
| Delete budget | Set budget `status` to `deleted` with Update | `budget.delete` · `name`, `status` |
| Enable, change or disable a project's billing | Update `projects.billingAccountId` with Update | `project.billing_change` · `previousBillingAccountId`, `billingAccountId`, each nullable |

Seed 16 activity entries with valid links and fixed IDs `activity-001` through `activity-016`. Sort the view by timestamp and stable ID. Test `/go` against entity IDs and event types, then document the final field names and action mapping in root `SCHEMA.md`.
