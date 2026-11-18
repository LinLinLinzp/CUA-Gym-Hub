# supabase_mock Schema

**Base URL**: `http://localhost:5486/`  
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}`

The API returns project records as top-level fields under `initial_state` and `current_state`. The browser state utility uses `supabase_mock` in its local storage keys. `state_diff` groups changes by top-level field and returns the full value for each changed field. Reset restores the stored initial value, or the defaults when a baseline has yet to be stored. Use a fresh SID for each injected test world.

An already selected project and operator provide context. IDs and record links are strings. All timestamps are ISO 8601 strings.

## State Schema

| Key | Record fields |
| --- | --- |
| `project` | `id`, `name`, `organization` are strings. |
| `currentUser` | `id`, `name`, `email` are strings. This operator is independent of project Auth users. |
| `tables[]` | `id`, `schema`, `name`, `description` are strings. `rlsEnabled` is a boolean. `columns` is an array of column definitions. Includes record metadata. |
| `rows[]` | `id`, `tableId` are strings. `values` is an object keyed by column ID. Values are typed JSON. Large `bigint` values are decimal strings. Includes record metadata. |
| `authUsers[]` | `id`, normalized `email`, and `provider` are strings. `status` is `active`, `unconfirmed`, `invited`, or `banned`. `invitedAt`, `confirmedAt`, `lastSignInAt`, and `bannedAt` are timestamp strings or null. Includes record metadata. |
| `buckets[]` | `id` and `name` are strings. `public` is a boolean. `maxFileSizeBytes` is a positive safe integer or null. `allowedMimeTypes` is a string array. `null` size and an empty MIME array denote unrestricted uploads. Includes record metadata. |
| `objects[]` | `id`, `bucketId`, and bucket-relative `path` are strings. `kind` is `file` or `folder`. `sizeBytes` is a number or null. `mimeType` and `url` are strings or null. Folder records have null file metadata. File URLs use `/fixtures/…` or `/files/…`. Includes record metadata. |
| `policies[]` | `id`, `targetId`, and `name` are strings. `targetType` is `table` or `bucket`. `command` is `SELECT`, `INSERT`, `UPDATE`, `DELETE`, or `ALL`. `roles` is a string array. `usingExpression` and `checkExpression` are strings or null. Includes record metadata. |
| `activity[]` | `id`, `action`, `entityType`, `entityId` are strings. `actorId` is an operator ID or null. `createdAt` is a timestamp string. `related` and `details` are JSON objects described below. |

Record metadata consists of `actorId` as the operator ID or null, plus `createdAt` and `updatedAt` timestamps. An edit preserves `createdAt` and sets `actorId` and `updatedAt`. The timestamp on an edited record and its activity entry comes from the same clock reading.

A column definition has string `id`, `name`, `type`, boolean `nullable` and `primaryKey`, and a typed JSON `defaultValue` or null. Optional `defaultExpression` is `identity`, `uuid`, or `now()`. Column renames preserve IDs. Bucket policy previews scope the expression to the bucket on `storage.objects`, and the saved expression fields contain the user-entered text. An omitted check expression remains null for `UPDATE` and `ALL`.

Harbor can replace arrays and can merge objects over defaults. Unknown top-level and record fields are kept through edits. A folder may be inferred from object paths even when it has no record.

### Default IDs

| Entity | Default IDs |
| --- | --- |
| Project and operator | `proj_trailhead`, `operator_rowan` |
| Tables and columns | `table_inspections`, `table_work_orders`, `table_route_summaries`. Each column uses `col_<table name>_<column name>`, such as `col_inspections_title`. |
| Rows | `row_inspections_1` through `row_inspections_36`, `row_work_orders_1` through `row_work_orders_36`. Other populated tables use the same pattern. |
| Auth users | `auth_amelia` and `auth_<first>_<last>`, such as `auth_milo_bennett`. |
| Buckets and objects | `bucket_field_reports`, `bucket_site_photos`, `bucket_new_intake`. Objects use `obj_<bucket index>_<position>` with one-based indices, except `obj_weekly_report`. |
| Policies | `policy_inspections_read`, followed by `policy_2` through `policy_32`. |

## Minimal Inject Example

Pass this object as `state` to open an empty project with the default operator.

```json
{
  "project": { "id": "proj_audit", "name": "Audit Workspace", "organization": "Example Fieldwork" },
  "tables": [],
  "rows": [],
  "authUsers": [],
  "buckets": [],
  "objects": [],
  "policies": [],
  "activity": []
}
```

## Observable State Changes

Every successful action writes the full state through the shared sync utility and appends its listed `activity[]` record. `entityType` is the action prefix. `entityId` identifies the affected entity. Deleting a parent removes dependent records in that same write.

| Action | Record change | Activity `related` | Activity `details` |
| --- | --- | --- | --- |
| `table.created` | Append a table with `schema`, `name`, `description`, `rlsEnabled`, and `columns`. | `tableId` | `schema`, `name`, `description` |
| `table.updated` | Set the table’s `name` and `description`. | `tableId` | `schema`, `name`, `description` |
| `table.rls_updated` | Set the table’s `rlsEnabled` from Tables or Policies. | `tableId` | `rlsEnabled` |
| `table.deleted` | Remove the table, its rows via `tableId`, and its table policies via `targetId`. | `tableId` | `schema`, `name`, `rowIds`, `policyIds` |
| `column.added` | Append to `tables[].columns`. Write the new column ID and its backfill, default, or null into each existing row’s `values`. | `tableId`, `columnId` | `name`, `rowIds` |
| `column.renamed` | Set the column’s `name`. Existing row keys retain the column ID. | `tableId`, `columnId` | `fromName`, `toName` |
| `row.inserted` | Append to `rows` with `tableId` and typed `values`, including generated defaults. | `tableId`, `rowId` | `columnIds` |
| `row.updated` | Set the row’s typed `values`. | `tableId`, `rowId` | `columnIds` |
| `row.deleted` | Remove the row. | `tableId`, `rowId` | `values` |
| `auth_user.created` | Append an email user. Set `status` to `unconfirmed` or `active`, with `confirmedAt` for a confirmed creation. | `userId` | `email`, `status` |
| `auth_user.invited` | Append an email user with `status: invited` and `invitedAt`. | `userId` | `email`, `status` |
| `auth_user.confirmed` | Set `status: active` and `confirmedAt`. | `userId` | `email`, `fromStatus`, `toStatus` |
| `auth_user.banned` | Set `status: banned` and `bannedAt`. | `userId` | `email`, `fromStatus`, `toStatus` |
| `auth_user.unbanned` | Clear `bannedAt` and restore `active`, `invited`, or `unconfirmed` from the user’s timestamps. | `userId` | `email`, `fromStatus`, `toStatus` |
| `auth_user.deleted` | Remove the Auth user. | `userId` | `email`, `fromStatus` |
| `bucket.created` | Append a bucket with `name`, `public`, `maxFileSizeBytes`, and `allowedMimeTypes`. | `bucketId` | `name`, `public`, `maxFileSizeBytes`, `allowedMimeTypes` |
| `bucket.updated` | Set the bucket’s `public`, `maxFileSizeBytes`, and `allowedMimeTypes`. | `bucketId` | `name`, `public`, `maxFileSizeBytes`, `allowedMimeTypes` |
| `bucket.deleted` | Remove the empty bucket and its bucket policies via `targetId`. | `bucketId` | `name`, `policyIds` |
| `object.folder_created` | Append a folder record with `bucketId`, `path`, `kind: folder`, and null file metadata. | `bucketId`, `objectId` | `path`, `kind`, `sizeBytes`, `mimeType` |
| `object.uploaded` | Append a file with `bucketId`, `path`, `kind: file`, `sizeBytes`, `mimeType`, and `url` after a successful Harbor upload. | `bucketId`, `objectId` | `path`, `kind`, `sizeBytes`, `mimeType` |
| `object.renamed` | Set the file’s `path` within its existing folder. | `bucketId`, `objectId` | `fromPath`, `toPath` |
| `object.moved` | Set the file’s `path` to a different folder in the same bucket. The file ID and URL are preserved. | `bucketId`, `objectId` | `fromPath`, `toPath` |
| `object.deleted` | Remove the file or empty folder record. | `bucketId`, `objectId` | `path`, `kind` |
| `policy.created` | Append a policy with target IDs, `name`, `command`, `roles`, `usingExpression`, and `checkExpression`. | `policyId`, `targetType`, `targetId` | `name`, `command` |
| `policy.updated` | Set those same policy fields on the existing record. | `policyId`, `targetType`, `targetId` | `name`, `command` |
| `policy.deleted` | Remove the policy record. | `policyId`, `targetType`, `targetId` | `name`, `command` |

Search, filter changes, navigation, downloads, opening or canceling editors, validation failures, and idle time make no business-state writes. File deletion removes metadata from the workspace. The state API stores uploaded binaries independently.

