# Audible Mock — Test Report

> Round: 2
> Date: 2026-11-18
> Server: http://localhost:5373
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Route patterns tested | 9 |
| Interaction and verification groups tested | 14 |
| ✅ Passed | 12 |
| ❌ Failed | 2 |
| ⚠️ Skipped (out of scope) | 0 |

Chromium was driven through the installed Node Playwright on the local Vite dev server. The seeded workflows used a frozen clock of `2026-11-18T12:00:00.000Z`. Each of the ten successful seeded actions sent one full snapshot and passed checks against `GET /go?sid=<sid>` for the exact changed keys and related record fields.

## ✅ Passing Tests

- **Library filters and status.** Searched by title, author, and narrator. Used All, Finished, and Unfinished, all three sorts, the filter reset, and a title link. Marked an in-progress book finished and then unfinished. Checked immediate filter membership and reloaded to verify the saved status.
- **Included titles.** Canceled removal with Escape and checked focus restoration. Confirmed removal, reactivated the same row from Browse, and added titles from Wish List and title detail. Verified duplicate controls disappear for owned titles.
- **Wish List.** Saved from Browse and detail, searched and sorted the Wish List, removed from the list and detail, and resaved with a fresh ID. Verified a purchased title left the active list.
- **Credits.** Opened the summary from the balance link and checked issue dates, expirations, used and expired credits, and signed activity. Exercised purchase dialogs from Wish List, Browse, and title detail. The seeded confirmation named the title and projected a balance of four. Cancel preserved five credits. Confirm spent the earliest-expiring credit and showed four remaining.
- **Returns.** Opened an order from the purchase confirmation, canceled a return, then confirmed the named one-credit refund. The balance rose to five, the receipt showed the refund, the title left the Library, and the refund appeared in history. Duplicate returns and cash, blocked, and old orders showed eligibility reasons.
- **Purchase history controls.** Switched between Orders and Refunds, exercised all preset date ranges, custom range validation, and Show all dates. Followed receipt, ledger, refund, credit summary, and back links.
- **Shared shell.** Opened the rail destinations and wordmark, verified active navigation and hover feedback, followed the keyboard skip link, submitted a new header query by button and Enter, cleared Browse and Wish List searches, and dismissed a status message. Navigation preserved the SID.
- **Harbor endpoints and isolation.** Verified JSON from `/go`, injection through `/post`, baseline preservation, `/state`, and reset. A second SID in the same Chromium context retained the seed. Fresh seed boot sent one baseline `set`. Reload, idle, navigation, sorting, filters, canceled dialogs, and blocked actions left state and POST counts unchanged.
- **Injected worlds.** Opened empty collections and a single partial title with missing relationships. Filtered a 430-title catalog and saved a full snapshot above the keepalive threshold while retaining custom account and top-level fields.
- **Boundary fixtures.** An order exactly 365 elapsed days old returned without a Library entitlement. Orders 1 ms beyond the cutoff or 1 ms in the future were ineligible. Leap-day credit expiration clamped to February 28. A credit expiring at confirmation was declined with zero writes. Redemption selected by expiration, issuance, and ID as expected.
- **Routes and layout.** Direct-loaded root, Library, Browse, title detail, Wish List, Credits, Purchase history, Order details, and fallback at desktop and 390 px widths. Checked missing-title and missing-order recovery, no horizontal overflow, and local cover loading. The route and control run recorded no browser errors, failed HTTP responses, or off-origin requests.
- **Production build.** `npm run build` passed. The site state client matched the shared template byte for byte. The parent runner handles Docker certification.

### Observed seed state changes from /go

| Workflow and action | Fields verified |
| --- | --- |
| Library · mark finished | `library[].listeningStatus` became `finished`, `progressPercent` became 100, and `updatedAt` was stamped. `libraryActivity[]` appended `marked_finished` with the Library and title links, member, action time, quantity 1, and resulting status and progress. |
| Library · mark unfinished | `library[].listeningStatus` became `not_started`, `progressPercent` became 0, and `updatedAt` was stamped. `libraryActivity[]` appended the linked `marked_unfinished` event. |
| Library · remove, re-add, and add included titles | Removal set `library[].status` to `removed` and stamped `updatedAt`, with a linked `removed_included` event. Re-add set the same row to `active` at its original progress. A new add created an active included row with zero progress and creation and update timestamps. Both additions appended linked `added_included` events. Only `library` and `libraryActivity` changed. |
| Wish List · save, remove, and resave | Save appended `wishlist[]` with the title, member, timestamps, and `status: saved`. Removal set that row to `removed` and stamped `updatedAt`. Resave appended a fresh ID. Only `wishlist` changed. |
| Credits · redeem one credit from Wish List | `credits[]` recorded `status: spent`, `spentAt`, and `purchaseId`. `creditTransactions[]` appended a linked `redeemed` debit of −1. `purchases[]` appended a completed credit order for quantity 1, one credit, and USD 0. `library[]` appended the active purchased entitlement, and `libraryActivity[]` appended the linked `acquired` event. The saved `wishlist[]` row became `purchased` with `purchaseId` and `updatedAt`. |
| Returns · confirm a one-credit refund | `purchases[]` recorded `status: returned`, `returnId`, and `returnedAt`. `returns[]` appended the completed refund, linked credit, and item with order and title IDs, quantity 1, one credit, and USD 0. `library[]` recorded `status: returned` and `updatedAt`, and `libraryActivity[]` appended the linked `returned` event. `credits[]` appended an available return credit with a one-year expiration. `creditTransactions[]` appended a linked +1 refund. The refund, credit, ledger, and Library event shared the member and action timestamp. |

## ❌ Bugs for Dev Agent

### BUG-001 · P0 · An out-of-order save can restore stale Wish List state

| Field | Value |
| --- | --- |
| Route | `/title/:titleId` |
| Element | Add to Wish List and Remove from Wish List |
| Action | Delay the add's `set_current` request in Playwright, remove the title, wait for the removal response, then release the add. |
| Expected | `/go` continues to show `wishlist[].status = removed`, consistent with the UI. |
| Actual | `/go` first shows `removed`, then reverts to `saved` after the older request arrives. The UI still offers Add to Wish List. |
| Console errors | None |
| Fix hint | Coordinate snapshot ordering at the persistence boundary while preserving the shared client and API templates. |

### BUG-002 · P1 · Resubmitting the same catalog query can leave unrelated results visible

| Field | Value |
| --- | --- |
| Route | `/browse?q=Cartographer&sid=<sid>` |
| Element | Search catalog and Search audiobooks |
| Action | Change Search audiobooks to “A field guide to dusk”, then press Enter in the header Search catalog field, which still contains “Cartographer”. |
| Expected | The Browse filter and results reflect “Cartographer”. |
| Actual | The URL still contains `q=Cartographer`, while the Browse filter and results still show “A field guide to dusk”. |
| Console errors | None |
| Fix hint | Synchronize the Browse filter on each explicit header submission, including when the query string stays the same. |

## Visual Alignment Feedback

The original local design in `DESIGN.md` was the visual reference. Desktop captures of Library, Browse, Wish List, Credit summary, Purchases, Refunds, title detail, and Order details show consistent typography, artwork, and spacing. The 390 px title and confirmation captures show wrapped navigation and a stacked dialog with both actions in view. No layout defect was observed in these captures.

## Round History

### Round 1 → Round 2

- All four seed workflows passed again on the dev server. Round 1 also recorded a successful Vite preview run.
- BUG-001 and BUG-002 reproduced from the audit.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `135780`. The local evidence is `factory/build/dyn_certify/135780/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `titles → 0 → title`.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Fixed and retested.** The delayed add did not expose Remove before acknowledgement. After adding and removing, both writes reached Harbor and the latest Wish List status was removed.

Docker dynamic certification run `175552` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
