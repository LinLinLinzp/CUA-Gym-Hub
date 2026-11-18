# myUSCIS Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5511  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
|--------|-------|
| Routes tested | 8 |
| Elements tested (grouped checks) | 13 |
| ✅ Passed | 12 |
| ❌ Failed | 1 |
| ⚠️ Skipped (out of scope) | 0 |

Chromium exercised all three SEED workflows with synthetic data and fresh sessions. The workflow checks asserted server state through `GET /go?sid=<sid>`.

---

## ✅ Passing Tests

- **`/` · Account shell.** The wordmark and navigation lead to the expected routes. Keyboard activation of the skip link focuses the main content.
- **`/` · Overview links.** Case list, case lookup, draft, form catalog, and address links open their destinations with the session intact.
- **`/cases` · Tracked case filters.** Search and status filtering update the result list without a server write.
- **`/cases` · Receipt lookup.** The button has hover feedback. Invalid input shows validation. Valid unknown and matched receipts persist normalized audit records.
- **`/cases/:caseId` · Case detail.** The history is newest first. Tracking adds one association and disappears after reload. The breadcrumb returns to the case list.
- **`/forms` · Catalog and filing lists.** Tabs and both search fields work. Start creates a draft. Existing filings and drafts open from the list.
- **`/forms/drafts/:draftId` · Draft and submission.** Save, resume, validation, signature, duplicate guard, receipt, case link, and return link work.
- **`/forms/drafts/:draftId` · Reference-only injection.** An injected I-485 review draft remains accessible and savable. A dispatched submit event leaves server state unchanged. Save updates only `formDrafts`.
- **`/address-change` · Address wizard.** Address fields, state selector, same-address toggle, pending case selection, keyboard receipt addition, removal, back, and cancel respond. Invalid receipts produce validation.
- **`/address-change/:requestId` · Confirmation and history.** The address workflow handles both linked receipts and no pending cases. Confirmation and history links open durable records.
- **`*` and missing case · Recovery.** Recovery links lead back to the overview or case list with the same session.
- **Harbor API and built routes.** Verified session isolation, reset, idle tabs, empty/sparse/large injected states, localhost-only assets, and hard reloads.

---

## Commands

Run from `websites/myuscis_mock` in PowerShell.

```powershell
npm install --cache .scratch/npm-cache
npm run build
$node = (Get-Command node).Source
$vite = (Resolve-Path node_modules/vite/bin/vite.js).Path
$dev = Start-Process -FilePath $node -ArgumentList ('"' + $vite + '" --configLoader native --port 5511') -WorkingDirectory (Get-Location).Path -WindowStyle Hidden -PassThru
node .scratch/acceptance.cjs
node .scratch/navigation.cjs
node .scratch/audit.cjs
Stop-Process -Id $dev.Id
$preview = Start-Process -FilePath $node -ArgumentList ('"' + $vite + '" preview --configLoader native --port 5511') -WorkingDirectory (Get-Location).Path -WindowStyle Hidden -PassThru
node .scratch/acceptance.cjs --preview
node .scratch/audit.cjs
Stop-Process -Id $preview.Id
```

The scratch runner is gitignored and loads Node Playwright using `PILOT_PLAYWRIGHT`. Wait for the listener to accept connections before starting Chromium. The browser allowed requests only to `http://127.0.0.1:5511`. Commit-time ID generation was exercised with `crypto.randomUUID` unavailable.

## Workflow results

| Workflow | Browser checks | Observed changes in `current_state` |
| --- | --- | --- |
| Case status | Filtered tracked I-765 cases by Under review. Rejected bad syntax. Checked unknown `MSC9900000099` and matched `  ioe-9700000033  ` to untracked `case-033`. Opened and tracked the case, verified the tracking action disappeared after reload, and checked newest-first history on `case-001`. | Valid checks appended only `caseStatusChecks[]`, with normalized receipts and the correct outcome, case ID, and status snapshot. The unknown lookup used null case fields. Tracking appended only `trackedCases[]` for `case-033`. Filters, invalid lookup, detail views, and reload wrote nothing. |
| Forms | Found reference-only I-485 and started I-765. Saved Maya Rivera and `maya.rivera@example.test`, reloaded, and resumed through Your filings. Required-field and signature checks blocked invalid submissions. Answered `Renewal` and `C09`, signed with Maya Rivera, and dispatched the submit event twice. Reloaded the confirmation and opened receipt `IOE9800000001`. | Start, save, and forward steps changed only `formDrafts`. The same draft ID was retained. The final save set `answers`, `currentStep`, `status`, `submittedAt`, and `updatedAt` on that draft and added exactly one record each to `formSubmissions`, `cases`, `caseEvents`, and `trackedCases` with matching IDs. The submission stored the answers and signature, and the new case was `received`. |
| Address change | Entered distinct addresses at 82 Juniper Lantern Road and PO Box 174. Rejected invalid, unknown, closed, and duplicate receipt entries. Selected tracked `IOE9700000001`, added untracked `  ioe-9700000038  `, went back from review, and dispatched the confirmation event twice. Reloaded `COA-000025`. Submitted a second request at 19 Alder Grove Row using the same-address and no-pending-cases choices. | The first save added one `addressChanges[]` record with address snapshots and normalized links, updated both `profile` addresses and `updatedAt`, and updated only `cases[case-001]` and `cases[case-038]` with `mailingAddress` and `addressChangeId`. The second save updated only `profile` and `addressChanges` and stored an empty `caseLinks` array. Cancel, back, and validation failures wrote nothing. |

## Runtime checks

- A fresh session posted one baseline `set`. The main workflow run posted ten `set_current` snapshots and kept its baseline intact.
- A second tab sharing the main session stayed idle through the mutations and posted nothing. A different session kept a separate baseline and case check.
- Empty injected collections, sparse records with missing and dangling relationships, and a 320-case injection rendered. The large fixture supported filtering and persisted a lookup while retaining all 320 cases.
- Overview, case detail, draft, and address detail opened directly and reloaded against the built bundle. Built JS and CSS returned HTTP 200, a lookup persisted through preview, and no request targeted a non-local origin.
- The overview rendered at desktop and phone widths. At 390 px the document fit the viewport without horizontal scrolling. Chromium reported no page or console errors.
- `npm run build` passed. The copied `dataManager.js` matched the template byte for byte.

## ❌ Bugs for Dev Agent

### AUDIT-001 · P0 · Delayed startup write can overwrite the first user action

| Field | Value |
|-------|-------|
| Route | `/cases` in dev and built preview |
| Element | Check case status on a fresh session |
| Action | Hold the initial `POST /post` with `action: set` in Playwright, check `IOE9700000033`, wait for `set_current`, then release the startup POST. |
| Expected | `/go` shows 24 checks in `initial_state` and 25 in `current_state` with a new `caseStatusChecks` diff. |
| Actual | `/go` shows 25 checks in `initial_state` and 24 in `current_state`. The UI had already shown the successful lookup. |
| Console errors | None |
| Fix hint | Have the shared Harbor client await acknowledgment of the startup baseline before allowing mutations. The site uses the contract's unchanged state client and API. |

---

## Visual Alignment Feedback

Reviewed localhost captures of the overview, case list and detail, form catalog and draft, address list and confirmation against the original layout in `DESIGN.md`. Also reviewed the 390 px overview, including the wrapped navigation and single-column cards. The captures used the site's text wordmark and local CSS artwork.

## Round History

### Round 1 → Round 2

- AUDIT-001 remains reproducible on dev and preview.
- AUDIT-002 is fixed. The injected reference-only draft saves and reloads, and the filing guard blocks submission.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `164024`. The local evidence is `factory/build/dyn_certify/164024/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `cases → 0 → receiptNumber`.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Fixed and retested.** Chromium held the startup POST and verified action controls waited for acknowledgement. Case lookup, signed submission and address updates passed against the production build.

Docker dynamic certification run `188924` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
