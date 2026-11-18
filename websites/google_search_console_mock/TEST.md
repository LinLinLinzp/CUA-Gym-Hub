# Google Search Console Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5471  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested | 6 supported view variants |
| Elements tested | 15 grouped checks, including visual and runtime checks |
| ✅ Passed | 10 |
| ❌ Failed | 5 |
| ⚠️ Skipped (out of scope) | 0 |

All three seed workflows passed in Chromium via the installed Node Playwright. Each successful workflow mutation was checked against the previous `/go` `current_state`, the preserved `initial_state` and the cumulative `state_diff`. Each action posted one `set_current` request. The workflow marker records the seed results. The open findings below include a separate same-session persistence failure.

---

## ✅ Passing Tests

| Seed workflow | Verified interaction and outcome | Changed fields observed through `/go` |
| --- | --- | --- |
| Properties | Searched and filtered the list, selected another verified property, reloaded and confirmed its sitemap scope, then selected the original property from the workspace picker. | `account.activePropertyId`, `propertyEvents[]` appended with `type: selected`, `propertyId`, `status`, `id`, `actorId`, `createdAt`. |
| Properties | Rejected malformed and duplicate values. Added a normalized URL prefix with HTML tag verification deferred, reloaded its pending detail, then verified ownership with the HTML file option. Verified and restored a removed Domain property through DNS using its original ID. | New `properties[]` record with `id`, `type`, `siteUrl`, `status`, `permissionLevel`, `verificationMethod`, `createdAt`, `createdBy` and nullable verification and removal fields. Verification set `status`, `permissionLevel`, `verificationMethod`, `verifiedAt`, `verifiedBy` and `account.activePropertyId`. Restore cleared `removedAt` and `removedBy`. `propertyEvents[]` appended `added`, `verified` or `restored` events as applicable. |
| Properties | Removed the active property after testing cancellation. Confirmed selection fell back to the first verified property and stale details showed a recovery link. Also exercised the type filter, empty search, picker dismissal, clipboard copy, sheet Back and Escape. | `properties[].status`, `removedAt`, `removedBy`, `account.activePropertyId`, `propertyEvents[]` with `type: removed`. Cancellation, copying and local controls left these fields unchanged. |
| URL inspection | Inspected through the global and page forms, tested Domain and prefix validation, and confirmed normalized URLs, saved and unknown verdicts, history, result reload, verdict filtering, expandable report sections and links to sitemap details. | Appended `inspections[]` with `id`, `propertyId`, `pageId`, `url`, `index`, `actorId`, `createdAt`. Invalid input, result links and history reads left state unchanged. |
| URL inspection | Ran and repeated a live test, queued indexing, reloaded, and confirmed an existing request appeared on repeat. A noindex fixture blocked indexing before and after its live test. An eligible unknown URL queued without a live test. | Appended `liveTests[]` with `id`, `inspectionId`, `propertyId`, `url`, `result`, `actorId`, `createdAt`. Appended `indexingRequests[]` with `id`, `inspectionId`, `propertyId`, `url`, `liveTestId`, `status`, `actorId`, `createdAt`. Queued requests kept the Google Index snapshot unchanged. |
| Sitemaps | Exercised search, status filtering, each sort column and paging in both directions. Rejected cross-scope URLs and fragments. Submitted a relative URL in Domain and nested prefix scopes and confirmed Pending and detail reload. | Appended `sitemaps[]` with `id`, `propertyId`, `url`, `type`, `status`, `createdAt`, `createdBy`, `lastSubmittedAt`, `lastSubmittedBy`, `submissionCount` and initial last-read, issue, discovery and removal fields. Appended `sitemapEvents[]` with `type: submitted`, `id`, `sitemapId`, `propertyId`, `url`, `status`, `actorId`, `createdAt`. |
| Sitemaps | Opened a fetch-failure detail, retried the failed sitemap, cancelled a removal, then removed and restored a test entry. Confirmed the same ID was reused, the prior read, counts and issues survived retry, and Escape closed the actions menu. | Retry and restoration set `sitemaps[].status`, `lastSubmittedAt`, `lastSubmittedBy`, `submissionCount`, `removedAt`, `removedBy` and appended `sitemapEvents[]` with `type: resubmitted`. Removal set `status`, `removedAt`, `removedBy` and appended an event with `type: removed`. Related inspection history persisted. |

- **All routes.** Direct load and reload passed for overview, properties, property detail, inspection, sitemap list and sitemap detail. Overview drilldowns, the brand link, skip link, browser history and recovery links responded. SPA links preserved `sid` and navigation produced no business-state writes.
- **Harbor runtime.** Empty, sparse singleton and large injected worlds rendered. The large fixture contained 221 properties and 250 sitemaps. Fresh `sid` values remained isolated. The local API checks confirmed `/state`, `/post` reset, and `/go` baseline and diff behavior. Idle observation produced zero posts after boot. The workflow suite observed zero external requests and the control suite observed no browser console or page errors.
- **Build and template.** `npm run build` passed. `src/utils/dataManager.js` had the same SHA-256 hash as the shared template. The report uses the existing site dev listener on port 5471.

---

## ❌ Bugs for Dev Agent

### BUG-001 · P0 · A stale tab erases another tab’s saved action

| Field | Value |
| --- | --- |
| Route | `/properties` and `/sitemaps` in tabs sharing one `sid` |
| Element | Global Inspect and sitemap Submit |
| Action | Open both tabs. Inspect a new URL in the first tab and confirm it in `/go`. Submit a sitemap from the second, already-open tab. |
| Expected | `/go` retains the inspection and the sitemap. |
| Actual | `/go` contains the new sitemap and loses the previously saved inspection. |
| Console errors | None needed to reproduce. Both writes returned success. |
| Fix hint | Reconcile and serialize mutations against the latest same-session state while preserving the shared templates and the absence of idle posts. See `AUDIT-001`. |

### BUG-002 · P1 · Pending property details lack a route from the list

| Field | Value |
| --- | --- |
| Route | `/properties` |
| Element | `atlas-outfitters.example` row name |
| Action | Click the property name and look for details or removal. |
| Expected | A visible path to the pending property’s detail and removal controls. |
| Actual | Both the name and Verify open the same verification sheet. Directly loading `/properties/prop_atlas` exposes removal. |
| Console errors | None observed. |
| Fix hint | Link the name to the detail page and keep the separate Verify button. See `AUDIT-002`. |

### BUG-003 · P1 · An active filter hides a newly submitted sitemap

| Field | Value |
| --- | --- |
| Route | `/sitemaps?status=success` |
| Element | Sitemap Submit |
| Action | Choose Success and submit a new sitemap. |
| Expected | The successful submission provides a visible route to the new record. |
| Actual | The toast confirms submission and `/go` contains the new Pending record, but the filter hides its row and the toast has no detail link. |
| Console errors | None observed. |
| Fix hint | Include a confirmation link to the sitemap detail or reveal the submitted record in the report. See `AUDIT-003`. |

---

## Visual Alignment Feedback

Desktop overview, property and sitemap lists and details, the verification sheet, and URL inspection were checked against `DESIGN.md`. The text brand, dark masthead, horizontal navigation, indigo actions, status labels and original local artwork rendered as specified. The mobile document fit its viewport and the sitemap table scrolled within its own region.

| ID | View | Observed issue | Fix hint |
| --- | --- | --- | --- |
| VISUAL-001 · P2 | `/properties` verification sheet at 1440px | Clicking Copy changes the label to `Copie` and `d` on separate lines. The clipboard value is correct. | Give the button enough width for `Copied` and let the token wrap. |
| VISUAL-002 · P2 | `/sitemaps` at 390px | Ordinary sitemap URLs wrap over five or six lines in the narrow URL column, making adjacent records hard to scan. | Set a readable URL column width inside the existing horizontal scroll region and retain the full URL on detail. |

## Round History

### Round 1 → Round 2

- Re-ran the seed workflows and added direct `state_diff` assertions, supplementary interaction checks, and a review of locally captured renders.
- Reproduced `AUDIT-001` through `AUDIT-003` as BUG-001 through BUG-003. Recorded two visual issues.
- Docker dynamic certification is owned by the parent runner.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `50260`. The local evidence is `factory/build/dyn_certify/50260/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `properties → 0 → type`.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Fixed and retested.** A sitemap submission from an already open tab preserved the other tab’s URL inspection in Harbor. Property, indexing and sitemap acceptance checks also passed.

Docker dynamic certification run `175552` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
