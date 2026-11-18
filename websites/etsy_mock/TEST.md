# Etsy Mock — Test Report

> Round: 2
> Date: 2026-11-18
> Server: http://127.0.0.1:5312
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
|---|---:|
| Routes tested | 16, including the unknown-route fallback |
| State-changing browser interactions tested | 28 |
| ✅ Passed | 10 test groups, including all four seed workflows |
| ❌ Failed | 0 |
| ⚠️ Skipped (out of scope) | 1 certification step assigned to the parent runner |

## ✅ Passing Tests

| SEED.md workflow | Browser result | Fields verified through `/go` |
|---|---|---|
| Buy | Searched by shop, changed marketplace filters, checked back navigation, validated required variants and personalization, merged identical configurations, and blocked excess stock. Updated and removed cart lines. Placed one Buy it now order despite duplicate submission and retained the cart. Placed a separate cart order that split into two shop receipts. All three receipts reloaded. | Cart edits changed `cartItems` and appended `cartActivity` with before and after quantities. Buy it now changed only `orders` and `listings`. Cart checkout changed `orders`, `listings`, `cartItems`, and `cartActivity`. Orders had paid status, source, item and delivery data, totals, masked payment, and address snapshots. Stock decreased and purchased cart activity linked to the matching order. |
| Messages to shops | Rejected a blank inquiry, sent a trimmed listing message, reloaded and replied, reused a shop-only thread, and marked unread threads read from both the inbox and conversation. | Send and reply changed `messages` and `threads`. Checked message body, buyer actor type, context and thread references, and `threads[].lastMessageId`. Reading changed only `threads`, setting `unread`, `readAt`, and `updatedBy` while preserving `updatedAt`. |
| Cases and returns | Filtered Purchases and reached Help with order through the receipt. Requested a return for one of two purchased units on ET-1008 and found the linked conversation after reload. Opened a case for ET-1007, commented, tested Cancel and Escape, then confirmed closure and reopened the case from Purchases and Cases. Tested a blocked order, an existing open case, and the 48-hour and delivery-window boundaries. | The partial return changed `helpRequests`, `returnRequests`, `threads`, and `messages`. Confirmed the case and help flows' linked IDs, one-unit return quantity, unit-price amount, and requested status. The return preserved the order record. Case submission, comment, and close each changed only `cases`. Confirmed order and help IDs, requested amount, log actions, closed status, and matching `updatedAt` and `closedAt`. Eligibility checks created no case. |
| Favorites | Saved and removed a listing from a result card and listing detail, followed and unfollowed a shop, searched saved items, and created and edited a collection. A collection retained a listing after it was unfavorited. Unchecking and rechecking it worked before save, and Cancel preserved membership. Explicit removal persisted. Changed favorites privacy. | Hearts and follows changed `favorites` and `favoriteActivity`. Creating a populated collection changed `collections`, `collectionItems`, and `favoriteActivity`. Renaming and changing visibility changed `collections` and `favoriteActivity`. Explicit removal changed `collectionItems` and `favoriteActivity`. Privacy changed `buyer.favoriteItemsVisibility`, `buyer.updatedAt`, and `favoriteActivity`. |

- Chromium from `PILOT_PLAYWRIGHT` visited and reloaded all 16 routes with session IDs intact. Cold boot made one baseline write. Idle, navigation, reload, and marketplace filters made no additional writes in the baseline test.
- A second browser session did not inherit the primary session's orders or favorite events. The local API preserved the first baseline through later `set` and `set_current` writes, then cleared the diff on reset.
- Injected empty and partial records rendered, a 300-listing world rendered all 300 cards, and checkout refused an injected overstocked cart. A fixed clock verified that case eligibility starts at the later of the 48-hour wait and delivery-window end.
- Chromium recorded zero browser errors and zero requests to an external origin. `npm run build` passed. The client data manager matched the Harbor template byte for byte.

## ❌ Bugs for Dev Agent

No open issues found in this round.

## Visual Alignment Feedback

Reviewed local captures of the original account design, including desktop routes, the populated cart and checkout, the escalation form, and the mobile overview. At 360 px, the overview, marketplace, listing, messages, order help, case detail, and favorites fit the viewport. Confirmed heading line heights, hero tracking, and button weight against `DESIGN.md`.

## Round History

### Round 1 → Round 2

- AUDIT-001 fixed. Computed styles match the account typography spec.
- AUDIT-002 fixed. A persisted collection member stays selectable throughout the draft. Unchecking, rechecking, and canceling were verified through Playwright and `/go`.

The parent runner owns Docker dynamic certification and the commit. This round used the local Vite development server for browser testing and verified the production build separately.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `91836`. The local evidence is `factory/build/dyn_certify/91836/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `shops → 0 → name`.
