# google_cloud_console_mock Schema

**Base URL**: `http://localhost:5484/`  
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}`

The workspace loads a new browser session through `GET /state?sid=…` and publishes the merged baseline through `POST /post?sid=…`. Inject before opening the app with a fresh `sid`, since the state manager reuses the browser's cached snapshot on reload. Injected arrays replace seeded arrays, and injected objects merge with defaults. The first write to a session establishes its immutable server baseline. Reset restores the server's current snapshot from that baseline and clears its diff. The shared store saves a whole-state snapshot with `action: "set_current"` once per successful business transaction. For a modified top-level array, `state_diff.<key>.modified` contains the current array. Use durable record IDs to inspect individual changes.

IDs, foreign keys, names, and labels are strings. Timestamps are ISO 8601 strings; usage dates are UTC calendar dates formatted as `YYYY-MM-DD`. Creation metadata is `createdAt` and `actorId`. Update metadata is `updatedAt` and `updatedBy`. Actors reference `currentUser.id` and all rows with creation metadata retain it when updated.

## State Schema

| Key and type | Fields |
|---|---|
| `currentUser` object | `id`, `displayName`, `email` |
| `projects` array | `id`, `name`, `number` (string), `billingAccountId` (ID or null), creation metadata, optional update metadata |
| `iamBindings` array | `id`, `projectId`, `principalType` (`user`, `group`, `serviceAccount`), `principal` (normalized email), `roleId`, `source` (`direct` or `inherited`), optional `sourceName`, `status` (`active` or `revoked`), creation metadata, optional update metadata |
| `vmInstances` array | `id`, `projectId`, `name`, `region`, `zone`, `machineType`, `bootImage`, `bootDiskGb` (integer), `internalIp`, `externalIp` (string or null), `status` (`RUNNING`, `TERMINATED`, `DELETED`), optional `lastResetAt` timestamp, creation metadata, optional update metadata |
| `buckets` array | `id`, `projectId`, `name`, `locationType` (`region`, `dual-region`, `multi-region`), `location`, `storageClass` (`STANDARD`, `NEARLINE`, `COLDLINE`, `ARCHIVE`), `accessMode` (`uniform` or `fine-grained`), `publicAccessPrevention` (boolean), `status` (`active` or `deleted`), creation metadata, optional update metadata |
| `storageObjects` array | `id`, `bucketId`, `name` (object path), `sizeBytes` (integer), `contentType` (MIME string), `status` (`active` or `deleted`), creation metadata, optional update metadata |
| `billingAccounts` array | `id`, `name`, `currency` (ISO currency code), `status` (`active` or `closed`) |
| `billingCosts` array | `id`, `billingAccountId`, `projectId`, `date`, `service`, `amount` (number in currency units), `currency` (ISO currency code) |
| `budgets` array | `id`, `billingAccountId`, `name`, `projectIds` (ID array, empty for all projects), `period` (`monthly`), `amount` (number in currency units rounded to cents), `currency`, `thresholds` (objects with a positive numeric `percent` and `basis` of `actual` or `forecast`, unique per percentage and basis), `status` (`active` or `deleted`), creation metadata, optional update metadata |
| `activity` array | `id`, `kind`, `entityId`, optional `projectId`, optional `billingAccountId`, creation metadata, `changes` (object described below) |

### Default IDs

| Entity | Seeded IDs |
|---|---|
| Signed-in user | `user-riley-morgan` |
| Projects | `northstar-platform`, `ridge-staging`, `studio-research`, `greenfield-sandbox` |
| IAM bindings | `iam-001` through `iam-036` |
| VM instances | `vm-001` through `vm-036` |
| Buckets | `bucket-001` through `bucket-036` |
| Storage objects | `object-001` through `object-072` |
| Billing accounts | `billing-northstar`, `billing-research` |
| Billing costs | `cost-001` through `cost-096` |
| Budgets | `budget-001` through `budget-024` |
| Activity | `activity-001` through `activity-016` |

## Minimal Inject Example

This request body replaces the primary resource lists with empty arrays. The first seeded project and billing account remain available for creating resources.

```json
{
  "action": "set",
  "state": {
    "iamBindings": [],
    "vmInstances": [],
    "buckets": [],
    "storageObjects": [],
    "billingCosts": [],
    "budgets": [],
    "activity": []
  }
}
```

## Observable State Changes (for LLM evaluation)

Every activity row references the affected resource via `entityId`. IAM, VM, bucket, object, and project billing events include `projectId`. Budget events include `billingAccountId` and also `projectId` when the budget targets exactly one project. Project billing events use the destination account for the event scope when billing is enabled or changed and the previous account when billing is disabled.

| User action | Resource writes | Activity kind and `changes` fields |
|---|---|---|
| Grant access or add a direct role | Append one `iamBindings` row per role with `id`, `projectId`, `principalType`, `principal`, `roleId`, `source: "direct"`, `status: "active"`, creation metadata | `iam.grant` per binding with `principal`, `roleId`, `status` |
| Revoke direct roles | Set `iamBindings.status: "revoked"` and update metadata on each selected binding | `iam.revoke` per binding with `principal`, `roleId`, `status` |
| Replace direct roles | Apply grants and revocations in one transaction | Both IAM event kinds for the respective bindings |
| Create instance | Append `vmInstances` row with selected name, region, zone, machine type, image, disk size, synthetic IPs, `id`, `projectId`, `status: "RUNNING"`, creation metadata | `vm.create` with `name`, `zone`, `status` |
| Stop, start, reset or delete an instance | Set `status` to `TERMINATED`, `RUNNING`, `RUNNING`, or `DELETED`, respectively, and write update metadata. Reset also writes `lastResetAt` | `vm.stop`, `vm.start`, `vm.reset`, or `vm.delete` with `name`, `status`, and `lastResetAt` for reset |
| Create bucket | Append `buckets` row with submitted configuration, `id`, `projectId`, `status: "active"`, creation metadata | `bucket.create` with `name`, `location`, `status` |
| Change storage class | Change `buckets.storageClass` and write update metadata | `bucket.update` with `name`, `storageClass` |
| Upload files | Append one `storageObjects` row per file with `id`, `bucketId`, `name`, `sizeBytes`, `contentType`, `status: "active"`, creation metadata | `object.upload` per object with `bucketId`, `name`, `sizeBytes`, `status` |
| Delete object | Set `storageObjects.status: "deleted"` and update metadata | `object.delete` with `bucketId`, `name`, `status` |
| Delete empty bucket | Set `buckets.status: "deleted"` and update metadata | `bucket.delete` with `name`, `status` |
| Create budget | Append `budgets` row with `id`, `billingAccountId`, `name`, `projectIds`, `period: "monthly"`, `amount`, `currency`, `thresholds`, `status: "active"`, creation metadata | `budget.create` with `name`, `amount`, `currency`, `status` |
| Edit budget | Set `budgets.name`, `projectIds`, `amount`, `thresholds` and update metadata | `budget.update` with `name`, `amount`, `currency`, `status` |
| Delete budget | Set `budgets.status: "deleted"` and update metadata | `budget.delete` with `name`, `status` |
| Enable, change or disable project billing | Set `projects.billingAccountId` to the destination account ID or null, plus update metadata. Usage rows stay associated with their original `billingAccountId` | `project.billing_change` with `previousBillingAccountId` and `billingAccountId` (both nullable) |

Routes, scope selection, report inputs, filters, sorting, pagination, cancelled dialogs, validation failures, and idle time are read-only. Overview groups the selected project's month-to-date usage by currency. Its Reports link preselects that project and date range, and Reports aggregates usage by the account recorded on each row. Budget spend filters these usage rows by account, current UTC month through the current date, and the configured project scope. Forecast progress projects the month-to-date daily average through the end of the current month.

