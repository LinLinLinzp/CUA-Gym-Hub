# Snowflake Mock — Test Report

> Round: 2  
> Date: November 18, 2026  
> Server: http://localhost:5488  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested, including recovery | 9 |
| Playwright test groups passed | 8 |
| Playwright test groups failed | 0 |

The installed Node Playwright and Chromium exercised the development app on localhost. `npm run build` passed, and the app's `dataManager.js` matched the Harbor template byte for byte.

## ✅ Passing Tests

### Observable state changes through `/go`

Each main-session transaction was verified against `/go.current_state` and cross-checked against `/state.stored_state`. The final `/go` response retained the original seed in `initial_state` and reported the persisted changes in `state_diff`.

| Workflow | Verified fields and records |
| --- | --- |
| Create warehouse | `warehouses[]` received a generated ID, canonical `name`, `size`, `status`, `autoSuspendSeconds`, `autoResume`, `minClusters`, `maxClusters`, `activeClusters`, `running`, `queued`, `comment`, `ownerRoleId`, `createdByUserId`, `createdAt`, and `updatedAt`. Activity included `warehouse.created`. Duplicate name, negative timeout, and invalid cluster range produced validation feedback. |
| Edit, resume, and suspend warehouse | Verified `size`, `autoSuspendSeconds`, `minClusters`, and the clamped `activeClusters`. Resume and suspend updated `status`, `activeClusters`, `running`, `queued`, and `updatedAt`. Activity included `warehouse.updated` with from/to values and `warehouse.resumed` and `warehouse.suspended`. |
| Drop warehouse | Removed the `warehouses[]` record and set the matching `worksheets[].context.warehouseId` to null, with a new `updatedAt`. The linked grant became `REVOKED` and recorded `revokedAt` and `revokedByUserId`. The transaction appended `grant.revoked` and `warehouse.dropped` with `clearedWorksheetIds` and `revokedGrantIds`. Query snapshots kept the warehouse name. |
| Create and save worksheet | Creation appended a `worksheets[]` record with `id`, `title`, empty `sql`, `context`, `ownerUserId`, `createdAt`, and `updatedAt`. Saving changed `title`, `sql`, `context.roleId`, `context.warehouseId`, `context.databaseId`, `context.schemaId`, and `updatedAt`. Activity included `worksheet.created` and `worksheet.updated` with dotted context field names. Ctrl+S persisted the draft through hard reload. Canceling or discarding an unsaved edit, running blank SQL, and saving an unchanged draft made zero writes. |
| Run SQL | Verified literal values and aliases, a quoted semicolon, selected and cursor statements, context functions, both SHOW commands, and qualified and unqualified ORDERS queries with and without LIMIT. Runs recorded `id`, `worksheetId`, `worksheetTitle`, `sql`, `context`, `status`, `rowCount`, `durationMs`, `columns`, `rows`, `error`, `actorUserId`, and `createdAt`. Activity `worksheet.query_ran` linked the run ID. An auto-resume run saved pending edits and resumed compute in the same POST at the same timestamp. |
| Failed SQL, worksheet deletion, and query history | Verified `WAREHOUSE_REQUIRED`, `WAREHOUSE_SUSPENDED`, and `UNSUPPORTED_SQL` with failed status, error details, and empty results. Errors and recent runs remained readable after reload. Deleting the worksheet removed its live record, appended `worksheet.deleted`, and preserved the run and its snapshots in account query history. |
| Create and edit role | Verified `roles[]` with canonical `name`, `type`, `comment`, owner and creator IDs, and timestamps. The optional parent grant and `role.created` and `grant.created` events arrived together. Comment edit updated `comment` and `updatedAt` and appended `role.updated`. The duplicate name was rejected. |
| Grant and revoke | Verified valid directions for a user, parent role, and warehouse privilege. Grants wrote `id`, `kind`, `roleId`, `targetId`, `privilege`, `status`, grantor IDs, and timestamps. Revocation updated `status`, `revokedAt`, and `revokedByUserId`, with `grant.revoked`. Regranting kept the old revoked record and created a new ID. The duplicate active grant and role cycle were rejected. |
| Drop custom role | Removed the `roles[]` record, updated related grants' `status`, `revokedAt`, and `revokedByUserId`, and appended `grant.revoked` and `role.dropped`. An injected linked graph confirmed clearing `account.activeRoleId`, `users[].defaultRoleId`, `worksheets[].context.roleId`, `warehouses[].ownerRoleId`, and `roles[].ownerRoleId`, with `updatedAt` on changed worksheets, warehouses, and roles. Historical run context retained the role ID. The system role detail exposed grant management while protecting role metadata and deletion. |

## Runtime checks

- The main session made 29 POSTs, including one bootstrap POST. Initial idle time added no POSTs. Passive filters and sort, navigation, canceled or rejected operations, and reload did not write business changes.
- SPA transitions preserved `sid`. A separate injected session left the main session unchanged. Empty, singleton, missing-optional-field, and 350-record collections rendered through list and detail routes. Missing IDs and unknown routes showed recovery links.
- Inspected desktop overview and worksheet captures against the original site design. Verified that warehouse tables scroll inside the panel at a 375px viewport. The suite captured zero browser errors and zero requests outside localhost.

## ❌ Bugs for Dev Agent

No open P0 or P1 issues in this run.

## Round History

### Round 1 → Round 2

- **AUDIT-001 fixed.** Ctrl+S and Ctrl+Enter inside both worksheet confirmations produced zero POSTs and identical `/go.current_state`. Both shortcuts worked in the editor.
- **AUDIT-002 fixed.** Unchanged warehouse forms made zero writes on complete and partial records. A comment-only edit preserved absent compute settings, and a real cluster limit edit adjusted `activeClusters`.
- **AUDIT-003 fixed.** The no-warehouse filter and the warehouse with ID `none` each returned its own single result. Filtering made zero writes.
- **AUDIT-004 fixed.** The toolbar spacing measured 24px and the Revoke control measured at least 36px high at both 1440px and 375px.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `93244`. The local evidence is `factory/build/dyn_certify/93244/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `warehouses → 0 → name`.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Previously fixed, retested.** The browser regression exercised Ctrl+S and Ctrl+Enter inside both confirmations and in the worksheet editor.

Docker dynamic certification run `125084` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
