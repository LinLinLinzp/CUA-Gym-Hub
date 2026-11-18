# Toast Mock — Test Report

> Round 2  
> Date November 18, 2026  
> Server http://127.0.0.1:5459  
> Tested by playwright agent, installed Chromium via `PILOT_PLAYWRIGHT`

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested, including the fallback route | 8 |
| Seed workflows passed | 4 |
| Business transactions verified against `/go` | 24 |
| Open P0 or P1 bugs found | 0 |

## ✅ Passing Tests

Each transaction issued one successful `set_current` request. I compared `/go.current_state` immediately before and after each write and checked the corresponding entries in `/go.state_diff`. The session's initial state remained intact.

| SEED workflow | Browser result | Observed state fields |
| --- | --- | --- |
| Menus · save drafts | Added and edited a menu and group, added an item, and edited an existing item. Rejected a price with three decimal places. Verified the old price remained available in ordering and the new item was absent before publication. | `menus[]` wrote `name`. `menuGroups[]` wrote `name`, `menuId`. `menuItems[]` wrote `name`, `menuGroupId`, `description`, `priceCents`, `availability`. New rows wrote `id`, `createdAt`, `createdBy`. Edited rows wrote `updatedAt`, `updatedBy` and preserved any live `published` snapshot. All saved drafts had `publicationStatus: "draft"`. |
| Menus · publish | Reviewed and published the drafts, then selected the new $10.25 item in an order. An injected orphan draft was blocked. | Affected records in `menus[]`, `menuGroups[]`, and `menuItems[]` updated `published`, `publicationStatus`, `publishedAt`, `publishedBy`, `updatedAt`, `updatedBy`. `menuPublications[]` gained `id`, `status`, `menuIds`, `menuGroupIds`, `menuItemIds`, `createdAt`, `createdBy`. |
| Orders · open and edit | Opened four checks, exercised line removal and validation for an empty check, reloaded a new check, and edited its item quantity from two to three. | New `orders[]` rows wrote `id`, `checkId`, `checkNumber`, `businessDate`, `serviceType`, `guestName`, `tableLabel`, `status`, `refundStatus`, `refundedAmountCents`, and creation audit. The edit wrote `lines`, `subtotalCents`, `taxCents`, `tipCents`, `totalCents`, and update audit. Lines carried `id`, `menuItemId`, `name`, `quantity`, `unitPriceCents`, `lineTotalCents`, `taxCents`. |
| Orders · settle and void | Settled three checks with a synthetic card. Voided a separate open check with a reason and verified its original line snapshots remained intact. | Settlement set `orders[].status` to `paid`, wrote totals and update audit, and appended `payments[]` with `id`, `orderId`, `checkId`, `method`, `last4`, `status`, `amountCents`, `refundStatus`, `refundedAmountCents`, `createdAt`, `createdBy`. Void wrote `orders[].status`, `voidReason`, `updatedAt`, `updatedBy`. |
| Labor · add, correct, and close | Closed an overnight entry for 450 worked minutes, corrected it to 435, added an open entry, and saved and corrected a 30-minute fall-back shift. Rejected reversed times and an overlapping entry. | `timeEntries[]` wrote `employeeId`, `jobId`, `businessDate`, `clockIn`, `clockOut`, `breakMinutes`, `workedMinutes`, `cashTipsCents`, `status`, and creation or update audit. `timeEntryChanges[]` gained linked `timeEntryId`, `changeType`, `reason`, `before`, `after`, `id`, `createdAt`, `createdBy`. The repeated-hour entry retained `05:45Z` and `06:15Z`, with identical instants in its history snapshot. |
| Refunds · item, full, and custom | Found a paid check through Refunds. Refunded 1.5 units for $16.73, including $1.35 tax. A full refund matched settlement and included $5.00 tip. A custom refund returned $7.55 after an over-limit amount was rejected. Verified history, detail reload, original-check navigation, and repeat and cash refund blocks. | `refunds[]` gained `id`, `orderId`, `checkId`, `paymentId`, `type`, `lines`, `subtotalCents`, `taxCents`, `tipCents`, `amountCents`, `reason`, `status`, `createdAt`, `createdBy`. Item lines carried `orderLineId`, `menuItemId`, `name`, `quantity` and cent amounts. Both linked `orders[]` and `payments[]` updated `refundedAmountCents`, `refundStatus`, `updatedAt`, `updatedBy` in the same write. |

### Runtime and interaction

- Overview summaries, the text wordmark, sidebar routes, check links, refund lookup, and detail links navigated successfully. Sidebar navigation preserved `sid`. Switching between Orders and refund lookup restored each view's default order status.
- Exercised menus, orders, labor, and refund search and filters, plus previous and next pagination. Sampled modal focus on opening and restoration after Escape. Sampled search, filtering, cancellation, refund review, and validation failures produced zero business writes.
- A fresh session issued one boot baseline and zero idle writes during a 1.25-second observation. A second session retained its own state. Reset restored the first session's baseline and cleared its diff.
- Exercised empty ledgers, sparse injected records, missing detail IDs, an unknown route, and a 420-check injection. Verified main-route and detail reloads. The browser reported zero console errors and made zero off-origin requests.
- `npm run build` passed. The client data manager SHA-256 matched the unmodified repository template.

## ❌ Bugs for Dev Agent

No open P0 or P1 findings from this run.

## Visual Alignment Feedback

Reviewed the seven implemented views in captured Chromium screenshots at 1440 × 900 against the site's original design. At 390 px the navigation fits by wrapping and ledger overflow stays inside each table. No proprietary references were used.

## Round History

- AUDIT-001 fixed. Orders restores All statuses after switching from refund lookup. Refund lookup starts on Paid.
- AUDIT-002 fixed. Labor offers first and second occurrences when a wall clock time repeats and preserves the selected instant through correction.
- Narrow navigation fixed. Refunds remains visible at 390 px without horizontally scrolling the navigation bar.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `186212`. The local evidence is `factory/build/dyn_certify/186212/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `menus → 0 → name`.
