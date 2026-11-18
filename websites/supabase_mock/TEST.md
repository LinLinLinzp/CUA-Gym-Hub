# Supabase Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5486  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
|--------|-------|
| Routes tested | 8 (7 application routes and the fallback) |
| Elements tested | 61 grouped checks |
| ✅ Passed | 60 |
| ❌ Failed | 1 (P2 download filename) |
| ⚠️ Skipped (out of scope) | 0 planned checks |

The final Chromium run passed 60 checks, including 33 UI-driven business writes. The separate download-name expectation reproduced the P2 issue below. `npm run build` passed.

---

## ✅ Passing Tests

- **[/] Project shell.** The text wordmark, skip link, navigation, all four overview cards, state-derived counts, and fallback recovery worked. The initial state contained 24 tables, 40 users, 24 buckets, 32 policies, at least 120 rows, and at least 90 storage objects.
- **[/tables, /tables/:tableId] Tables.** Schema and name filtering, row search, ascending and descending sorting, pagination, Data and Columns views, missing-table recovery, and hard reload worked. Invalid names, duplicate columns and keys, invalid typed values, missing required backfill, and canceled actions preserved state. Creation with generated defaults, table edits, typed backfill, column rename, row insert/edit/delete, RLS, and table cascade deletion persisted through `/go`.
- **[/auth/users] Authentication.** Provider and status filtering, email and ID search, pagination, detail close, and hard reload worked. Invalid and case-insensitive duplicate emails were rejected. Created a confirmed user, created an unconfirmed user in the idle-tab check, recorded an invitation, banned and unbanned the invited user, confirmed that user, and deleted it after checking the cancel path. Statuses and timestamps persisted.
- **[/storage, /storage/:bucketId] Storage.** Bucket and object search, access filtering, nested folder breadcrumbs, direct reload, missing bucket and folder recovery, and seeded download worked. Created a bucket, changed its restrictions, created a folder, uploaded through `/upload`, downloaded byte-for-byte, renamed and moved the file, deleted the file and folder, and deleted the emptied bucket with its dependent policy. Size, MIME, duplicate names and paths, missing destinations, and deleting nonempty containers were rejected without a state write.
- **[/policies] Policies.** Target and command filters, target search, pagination, deep-link reload, and per-target controls worked. Saved an expression-only edit to the seeded inspections policy, created an INSERT policy, moved it to a bucket as an UPDATE policy, and deleted it. Checked command-specific fields, roles, duplicate rejection, SQL preview, optional UPDATE check behavior, and RLS propagation to Tables.
- **[/state, /post, /go] Harbor.** Verified a single initial baseline write, exactly one full-state `set_current` per successful business action, exact before/after changed keys, and activity links. Checked empty worlds, one record per collection with missing optional fields, and 220 records per business collection. An injected top-level field and an injected record field survived an edit. Separate SIDs remained isolated and reset restored the injected baseline. After a same-SID write in the active tab, the idle tab emitted zero writes and `/go` stayed unchanged during observation. All browser requests were local. Chromium logged no page crashes or console errors. The local `dataManager.js` matched the template byte-for-byte.

### State fields verified through `/go?sid=…`

Every successful row below appended one `activity[]` record with the named `action`, the affected `entityId`, the entity type, actor, ISO timestamp, and relevant `related` and `details` fields. Inserted business records included their IDs and creation/update metadata. Edits retained IDs and updated metadata.

| Seed workflow | Action | Record changes observed in `current_state` and checked against `state_diff` |
|---------------|--------|-------------------------------------------------------------------------------|
| Tables | `table.created` | Appended `tables[]` with `schema`, `name`, `description`, `rlsEnabled`, and typed `columns[]` including identity and timestamp defaults. |
| Tables | `table.updated` | Changed `tables[].name` and `description` on the same table ID. |
| Tables and Policies | `table.rls_updated` | Changed `tables[].rlsEnabled` from each UI. |
| Tables | `row.inserted` | Appended `rows[]` with `tableId` and `values` keyed by column ID. Generated identity and timestamp values persisted alongside entered values. |
| Tables | `column.added` | Appended an integer definition to `tables[].columns` and backfilled the existing row in `rows[].values` under the new column ID. |
| Tables | `column.renamed` | Changed `tables[].columns[].name`. Column ID and the row value keyed to it were preserved. |
| Tables | `row.updated` | Changed `rows[].values` for the same record, including a text value set to null and an integer set to 12. |
| Tables | `row.deleted` | Removed the row by ID. Activity retained the old `values`. |
| Tables | `table.deleted` | Removed the table, its remaining row, and its policy from `tables[]`, `rows[]`, and `policies[]` in one write. Activity retained `rowIds` and `policyIds`. |
| Authentication | `auth_user.created` | Appended `authUsers[]` with normalized `email`, `provider`, `status`, and `confirmedAt` when chosen. |
| Authentication | `auth_user.invited` | Appended `authUsers[]` with normalized `email`, email `provider`, invited `status`, and `invitedAt`. |
| Authentication | `auth_user.banned`, `auth_user.unbanned`, `auth_user.confirmed` | Changed `authUsers[].status` and set or cleared `bannedAt` or set `confirmedAt` as applicable. |
| Authentication | `auth_user.deleted` | Removed the user by ID. Activity retained the email and previous status. |
| Storage | `bucket.created`, `bucket.updated` | Appended a named `buckets[]` record, then changed `public`, `maxFileSizeBytes`, and `allowedMimeTypes`. |
| Storage | `object.folder_created` | Appended `objects[]` with `bucketId`, `path`, folder `kind`, and null file metadata. |
| Storage | `object.uploaded` | Appended `objects[]` with `bucketId`, `path`, file `kind`, `sizeBytes`, `mimeType`, and the successful upload's SID-scoped `url`. |
| Storage | `object.renamed`, `object.moved` | Changed `objects[].path` twice while preserving the object ID and URL. Activity retained `fromPath` and `toPath`. |
| Storage | `object.deleted` | Removed the file and then the empty folder from `objects[]`. Activity retained each object's `path` and `kind`. |
| Storage | `bucket.deleted` | Removed the empty bucket and its linked bucket policy from `buckets[]` and `policies[]` in one write. Activity retained the dependent policy ID. |
| Policies | `policy.created`, `policy.updated` | Appended and edited `policies[]` with `name`, `targetType`, `targetId`, `command`, `roles`, `usingExpression`, and `checkExpression`. The seeded policy accepted an expression edit under its existing ID and name. |
| Policies | `policy.deleted` | Removed the policy by ID. Activity retained the target identifiers and command. |

Read-only controls, downloads, draft edits, canceled submissions, and validation failures produced no business-state writes. Where a later action restored a collection to its baseline, `/go` correctly omitted that key from the net diff while retaining the append-only activity evidence.

---

## ❌ Bugs for Dev Agent

### BUG-001 · P2 · Download suggests the original upload filename

| Field | Value |
|-------|-------|
| Route | `/storage/:bucketId?folder=archive` |
| Element | Download link for `renamed.txt` |
| Action | Upload `note.txt`, rename to `renamed.txt`, move to `archive`, and download |
| Expected | Chromium suggests `renamed.txt`, matching the object name shown in Storage |
| Actual | Chromium suggests `note.txt`. The bytes match the upload, and `/go` records the correct current path and unchanged file URL. |
| Console errors | None |
| Fix hint | The Harbor file response's attachment filename overrides the link's download name. Derive the suggested name from the current object path in the client while preserving the stored Harbor URL and shared template. |

---

## Visual Alignment Feedback

Reviewed the original local design on the five main views at 1440 × 1000, and at 390 × 844. The desktop split panes, utility bar, selected navigation, typography, and form controls matched the local design direction. The mobile layouts stacked, kept grid and navigation overflow within their containers, and fit the policy drawer to the viewport. Screenshots and the runnable Chromium checks are under the gitignored `test-results/` directory.

## Round History

### Round 1 → Round 2

- Fixed duplicate default policy names on the same target by distinguishing repeated entries with their roles. Preserved the policy IDs and verified that the seeded inspections policy accepts a USING-only edit.
- BUG-001 remains reproducible. All four seeded workflows passed, including binary download and the rename/move state changes.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `136548`. The local evidence is `factory/build/dyn_certify/136548/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `tables → 0 → schema`.
