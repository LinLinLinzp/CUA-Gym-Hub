# Marriott Bonvoy Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5325  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested, including the fallback | 10 |
| Verification groups | 11 |
| Passed | 11 |
| Failed | 0 |
| Skipped verification groups | 0 |

The workflow suite passed in installed Chromium on the localhost Vite server and on the rebuilt `dist/` bundle. The bundle run served HTML, JS and CSS from `dist/` through Playwright and used the live Harbor API on port 5325. The browser clock was frozen at November 18, 2026, 16:00 UTC. `npm run build` passed, and the site's `dataManager.js` matched the shared template's SHA-256 hash.

## ✅ Passing Tests

| SEED workflow | Browser verification | Exact changes observed in `/go` |
| --- | --- | --- |
| Stays | Used Upcoming, Past and Cancelled views, searched by confirmation, sorted and paged results. Rejected an earlier checkout and fractional guest count, dismissed the review and checked focus restoration, then confirmed an edit, reloaded and confirmed cancellation. | For `stays[id=stay-032]`, the edit changed `checkOut` from 2026-12-04 to 2026-12-05, changed `guests` to 3 and set `updatedAt`. Cancellation set `status` to `cancelled`, set `cancelledAt` and wrote `updatedAt`. `stayActions[]` gained a `modify` entry and a `cancel` entry, each with `id`, `stayId`, `actorId`, `action`, `status`, `createdAt`, `before` and `after`. Both snapshots contain `checkIn`, `checkOut`, `guests` and `status`. |
| Points | Checked signed amounts and the derived balance, filtered by activity type and time range, changed the sort and searched by description. Rejected a missing stay and negative points. Verified the copy link for a stay without an available folio. Opened a claim from a past stay, verified the preselected stay and folio, submitted it and reloaded the case. | `requests[]` gained one record with `id`, `type: missing_stay_credit`, `status: submitted`, `stayId: stay-026`, `folioId: folio-026`, `estimatedPoints: 4600`, `notes`, `actorId`, `createdAt`, `updatedAt` and `history[]` with a submitted entry. The `pointsActivity` ledger still yielded 95,841 points. |
| Folio | Searched by folio number, filtered availability, changed checkout sorting and opened an itemized bill. Captured the PDF and verified its filename, charge text, total and cross-reference offset. Requested a copy of an unavailable bill after correcting an invalid email. | `folioActions[]` gained a row with `id`, `action: download`, `status: initiated`, `folioId: folio-001`, `stayId: stay-001`, `actorId`, `createdAt`, `total: 615.66`, `currency: USD` and `filename: folio-F-2026-0148.pdf`. `requests[]` gained a record with `id`, `type: folio_copy`, `status: submitted`, `stayId: stay-005`, `folioId: folio-005`, `contactEmail`, `notes`, `actorId`, `createdAt`, `updatedAt` and a submitted entry in `history[]`. |
| Requests | Filtered by type and status, searched by case ID, and submitted towels and housekeeping for an in-progress stay. Rejected zero quantity and an out-of-stay date. Dismissed withdrawal with Escape, checked focus restoration and then confirmed withdrawal. | `requests[]` gained two `hotel_service` rows. Both had `id`, `type`, `stayId: stay-031`, `status: submitted`, `service`, `notes`, `actorId`, `createdAt`, `updatedAt` and submitted `history[]`. Towels stored `quantity: 2`. Housekeeping stored `requestedDate: 2026-11-19` and `requestedTime: 14:30`. Withdrawal set that case's `status` to `cancelled`, set `cancelledAt`, wrote `updatedAt` and appended `{ status: cancelled, actorId, createdAt }` to its history. |

All initial history entries recorded `status`, `actorId` and `createdAt`. Timestamps used the frozen clock for the accepted actions.

- **Harbor sync and isolation.** The main session sent one baseline `set` and eight `set_current` requests. Invalid input, discarded edits, dismissed dialogs, searches, filters, route changes, hard reloads and an idle second tab produced zero additional writes. `initial_state` matched the boot snapshot and the final `state_diff` contained only `stays`, `stayActions`, `folioActions` and `requests`.
- **Injected worlds.** Separate sessions rendered empty arrays, one-record arrays with missing optional fields and orphaned relations, and 300 sparse records per primary list. Pagination, empty states, detail fallbacks and direct reloads worked. An injected reservation edit preserved unknown root and record fields. Each session retained its own data.
- **Supplemental interactions.** Verified overview shortcuts, brand and account navigation, keyboard skip link, stay and request sorting, reverse pagination, edit-button hover, discarding and reopening a draft, dismissing reservation cancellation, points and folio cross-links, the pillows quantity field, and unsupported request and page fallbacks. This session produced only its baseline write.
- **Audit regressions.** With `crypto.randomUUID()` disabled, a generated stay-action ID reached `/go`. A separate fixture with 28,000 CJK characters saved its reservation edit and retained its entire metadata payload. Reset restored the baseline and cleared the diff in both fixtures. The production bundle suite also ran with `crypto.randomUUID()` disabled.
- **Build and browser errors.** The production build passed. The workflow runs reported no browser errors or requests outside localhost.

## ❌ Bugs for Dev Agent

None found in this round.

## Visual Alignment Feedback

Reviewed Chromium captures against the site's original `DESIGN.md`. The desktop overview displayed the locally authored CSS arch illustration and textual wordmark. The lists and form showed their labels and primary actions, and the mobile folio kept the wide table within its labeled horizontal scroll region at 390 px. Test captures and runner files are in the ignored `test-results/` directory.

## Round History

- Round 1 recorded passing workflows and fixed UUID compatibility and oversized UTF-8 payload issues.
- Round 2 reran all workflows against dev and freshly built assets, confirmed both audit fixes and covered additional navigation and form controls.

The parent runner owns Docker dynamic certification and commits.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `162580`. The local evidence is `factory/build/dyn_certify/162580/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `stays → 0 → memberId`.
