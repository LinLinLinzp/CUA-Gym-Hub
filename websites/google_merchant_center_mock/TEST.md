# Google Merchant Center Mock — Test Report

> Round: 3  
> Date: 2026-11-18  
> Server: http://localhost:5470  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
|---|---:|
| Route patterns tested, including the fallback | 12 |
| Scenario groups tested | 8 |
| ✅ Passed | 8 |
| ❌ Failed | 0 |
| ⚠️ Skipped Playwright scenario groups | 0 |

Chromium ran through the installed Node Playwright from `PILOT_PLAYWRIGHT`. All browser traffic stayed on localhost. No browser console errors or uncaught page errors were observed. `npm run build` passed, and the app's `dataManager.js` matched the Harbor template byte-for-byte.

## ✅ Passing Tests

- **Overview and navigation** — Verified seeded counts for 60 products, 24 sources, and 36 issues. Exercised the brand link, top navigation, skip link, breadcrumbs, status shortcuts, open issues, recent run history, and unknown page and record recovery. Navigation preserved the session ID.
- **Products** — Exercised title/SKU/offer search, combined filters, three sorting options, pagination, selection, and linked source and issue detail. Tested required fields, duplicate offer identity, invalid price and URL, cancellation, create/edit, visibility from list and detail, bulk hide/show, keyboard dismissal and focus restoration, and manual removal. Feed-owned product detail directed removal to its source.
- **Data sources** — Exercised search, input method/type/status filters, pagination, related product and issue links, setup/history and expandable run entries. Validated names, file link, schedule and missing upload. Tested both methods, raw CSV and TSV uploads, partial processing, file-level failure, sample scheduled fetch, missing local fixture, ownership transfers, source removal, and persistent run history.
- **Needs attention** — Exercised issue metrics, search, impact/status/market/type filters, pagination, filtered CSV export, record links, and cancelled and invalid submissions. Corrected seeded GTIN and image issues in the linked editor. Submitted a website check, a request for review, and a disagreement and verified each after reload.
- **Harbor endpoints and injected worlds** — Verified one baseline write on a fresh session, one `set_current` per accepted mutation, and zero writes for browse-only actions, validation, cancellation and cached reloads. Verified `/post` injection and reset, `/go` baseline/current/diff, isolation between session IDs, and a same-session passive browser tab with zero writes during a 5.2-second observation after another tab saved. The UI handled empty arrays, sparse records with missing associations, and 350 catalog entries. A sparse product edit retained an injected unknown field.

### Workflow evidence from `/go`

Each row lists the state changes observed immediately after the browser action. Audit records were checked for action, associated record IDs, actor, and timestamps.

| Workflow and browser action | Changed state and verified field values |
|---|---|
| Products · Create manual offer `QA-MAT-01` | Appended `products[]` with generated `id`, `offerId`, title, description, brand, condition, price, currency, availability, country, language, link, imageLink, GTIN, MPN, actor and timestamps. Verified `price=31.25`, `currency=CAD`, `status=pending`, `visibility=visible`, and `feedId=null`. Appended `productChanges[]` with `action=created` and matching `productId`. |
| Products · Edit and hide the same offer | Updated `products[].title`, `price` to 35.50, and `updatedAt`. Appended `productChanges[]` with `action=updated` and exact before/after values. List Hide changed `visibility` to `hidden` and updated `updatedAt`, with a `visibility_changed` audit. Reload displayed Show. Detail Show and bulk hide/show produced corresponding visibility audits for affected IDs. |
| Products · Remove a manual product | Set `products[].deletedAt` and `updatedAt` on `prd-001`, appended a `removed` product audit, and set its open issues to `resolved` with `resolution=product_removed`, `resolvedAt` and `updatedAt`. Appended linked `issueActions[]` records. |
| Feeds · Create and edit a source | Appended `feeds[]` with identity, setup fields and `status=never_run`, plus a created `feedChanges[]` record. Renaming the file source changed `name` and `updatedAt` and appended an audit with the exact name delta. The scheduled source stored `method=scheduled_fetch`, `sourceUrl`, `fixtureKey`, and `schedule={frequency:weekly,time:19:45,timezone:Europe/London}`. Editing the link and cadence changed `sourceUrl`, `fixtureKey`, `schedule` and `updatedAt`, with a matching setup audit. Configuration saves produced no run records. |
| Feeds · Upload a local primary file and inspect history | Appended `feedRuns[]` with `trigger=upload`, filename and byte count, `status=partial`, counts 2 received / 1 accepted / 1 rejected, and row 3's `invalid_price` error. Updated `feeds[].status`, `lastRunId`, `lastRunAt` and `updatedAt`. Created `QA-FEED-01` with `feedId` pointing to the source, and appended its `productChanges[]` audit with `feedRunId`. Reload restored the run history. A malformed file appended a failed run with `invalid_file` and zero row counts and changed only run records and source metadata. |
| Feeds · Run a scheduled source | The sample fixture produced a `feedRuns[]` row with `trigger=manual_update`, `input.sourceUrl`, `input.fixtureKey` and two accepted rows. Source status and latest-run fields updated. `NL-LOCAL-001` and `NL-LOCAL-002` gained linked product and creation audit records. A non-fixture link recorded a failed run with `missing_fixture`. |
| Feeds · Update, transfer, and remove | A supplemental upload changed an existing product's `price` and `updatedAt` while keeping its `feedId`, and linked its audit to the run. A primary upload updated an existing product in place and transferred its `feedId`, preserving visibility and creation time. Source removal tombstoned its owned products and the source using `deletedAt` and `updatedAt`, and appended `feedChanges[]` and `productChanges[]` removal records. Active source and removed-product issues closed with timestamps, `feed_removed` or `product_removed` resolution and linked `issueActions[]`. Run history, a transferred offer and its issue, and a product only updated by a removed supplemental source were retained. Removal after a Primary to Supplemental change still handled the two offers owned by the source. |
| Issues · Fix seeded product issues | Correcting `prd-001.gtin` resolved `iss-001` in the same save, setting `status=resolved`, `resolution=data_corrected`, `resolvedAt` and `updatedAt`. `iss-002` remained open and the product stayed disapproved. Updating `prd-005.imageLink` resolved `iss-003` and changed the product's approval status to approved. Both saves appended linked `productChanges[]` and `issueActions[]`. |
| Issues · Website check, review and disagreement | Updated `issues[].status` to `under_review`, `latestReviewId` and `updatedAt` for `iss-002`, `iss-005` and `iss-006`. Appended `issueReviews[]` rows with `status=submitted`, related record IDs, country, reason, actor, timestamp, acknowledgement and an explanation for disagreement. Appended `issueActions[]` rows with `action=review_requested`, `status=under_review` and matching `reviewId`. Each request remained under review after reload, and the action was removed from issue detail. |

---

## ❌ Bugs for Dev Agent

No open findings from the final Playwright run.

## Visual review

Reviewed localhost screenshots against the site's original [design guide](DESIGN.md) at 1440 × 1000 and checked a 390 × 844 mobile viewport. Reviewed the overview, populated lists, product and source editors, product detail, run history, and issue review detail. The mobile product table scrolled inside its panel and the editor fit the viewport. The text brand and locally drawn illustrations and thumbnails rendered throughout.

## Round History

### Round 1 → Round 2

- BUG-001 · P1 · Switching a Primary source to Supplemental hid offers it still owned and excluded them from removal. Fixed by using each product's stored `feedId` for ownership, displaying those offers in source detail, and applying the existing removal workflow. Supplemental runs still leave existing ownership intact.

### Round 2 → Round 3

- Verified archived history expansion, source ownership transfer, active issue preservation, and mobile table scrolling. All eight scenario groups passed.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `152980`. The local evidence is `factory/build/dyn_certify/152980/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `products → 0 → sku`.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Previously fixed, retested.** The revised browser fixture switched a source from Primary to Supplemental, verified its previously owned active offer stayed visible, then retired the source and checked removal and unrelated offers.

Docker dynamic certification run `182740` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
