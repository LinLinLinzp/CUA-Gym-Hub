# eBay Seller Hub Mock — Test Report

> Round: 1
> Date: 2026-11-18
> Server: http://localhost:5461
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
|--------|-------|
| Routes tested | 12 |
| Elements tested (grouped checks below) | 35 |
| ✅ Passed | 33 |
| ❌ Failed | 2 |
| ⚠️ Skipped (out of scope) | 0 |

The 12 route patterns include Overview, four queues, four record details, two creation forms, and the promotion edit route. The fallback route was checked separately. Chromium ran at 1440 × 900 for desktop and 390 × 844 for mobile.

## ✅ Passing Tests

- **Overview and navigation.** All five navigation destinations, four Overview queue shortcuts, the brand link, breadcrumbs, and the keyboard skip link worked. Navigation retained the requested SID.
- **Listings, Orders, Returns, and Promotions queues.** Status tabs, the category and promotion type filters, sort selection, search, empty-result recovery, and forward/backward paging responded to input. Orders provided a shortcut to the Needs response return queue.
- **Details and related records.** Seeded record links opened details. Details survived hard reloads, breadcrumbs returned to the queue, and a return linked to its order and back.
- **Listing editor and selection.** Blank publish, duplicate SKU, and zero publish quantity showed validation. Select-all, clear selection, Escape dismissal, and toast dismissal worked.
- **Order and return dialogs.** Blank tracking was rejected, cancel closed the dialog, and a partial offer equal to the full refund amount was rejected. Issuing a refund or sending an offer removed the corresponding action from the resolved case.
- **Promotion editor.** Wizard navigation, eligible-inventory search and selection, date entry, publishing options, and duplicate coupon validation worked. Promotions left the entire `listings` array unchanged.
- **Persistence and transaction boundaries.** Each of the 23 successful mutations below produced exactly one `set_current` and the listed changes in `GET /go?sid=…`. Browsing, dismissal, and rejected submissions produced no writes. The ended coupon survived reload.
- **Harbor isolation.** Separate SIDs retained independent worlds. The API accepted `set`, `set_current`, and `reset`. Reset restored the original injected marker. A fresh world posted one baseline and an idle page produced no further writes.
- **Injected states and routing.** Empty queues, sparse single records, and 240 records per queue rendered correctly. Sparse details survived reload, and missing records and unknown routes provided recovery links. An expired scheduled promotion displayed Ended while its stored status remained `scheduled`.
- **Layout and offline operation.** Desktop queues, representative details and forms, and the mobile Overview and Listings screens were visually reviewed. At 390 px all queues fit the page and their tables scrolled within labeled regions. No browser console or page errors occurred and no non-local requests were attempted. `npm run build` passed and the client data manager matched the repository template byte for byte.

### Observed `/go` changes by SEED workflow

Paths list fields that changed from the immediately preceding `current_state`. The corresponding top-level keys also appeared in `state_diff`. Every listed event appended a structured `activity[]` record with `id`, `type`, `entityType`, `entityId`, `actorId`, `createdAt`, and `details`.

New refund records in this table had `id`, `orderId`, `kind`, `status`, `lines[].{orderLineId,listingId,quantity,amount}`, `shippingAmount`, `taxAmount`, `totalAmount`, `actorId`, and `createdAt`. The table calls out added fields for each refund variant.

| Workflow and action | Observed record changes | Appended activity type |
|---|---|---|
| Listings · Create draft | New `listings[].{id,title,sku,category,condition,description,price,quantity,thumbnail,status,actorId,createdAt,updatedAt}` with status `draft` | `listing_created` |
| Listings · Publish draft | `listings[].{status,publishedAt,updatedAt}` with status `active` | `listing_published` |
| Listings · Revise | `listings[].{price,quantity,updatedAt}` | `listing_revised` |
| Listings · End one | `listings[].{status,endedAt,updatedAt}` with status `ended` | `listing_ended` |
| Listings · Relist | `listings[].{status,publishedAt,relistedAt,updatedAt}` with status `active` | `listing_relisted` |
| Listings · Bulk end | The same three end fields on each of two selected rows | `listing_ended` per row |
| Listings · Direct publish | New listing fields from Create draft, plus `publishedAt`, with status `active` | `listing_created`, `listing_published` |
| Orders · Mark shipped | `orders[].{status,shippedAt,updatedAt}` with status `shipped` | `order_shipped` |
| Orders · Save tracking on an awaiting order | `orders[].{status,shippedAt,updatedAt,tracking}` with status `shipped` and `tracking.{carrier,number,updatedAt}` | `order_tracking_saved` |
| Orders · Edit tracking on a shipped order | `orders[].{tracking,updatedAt}`. The original `shippedAt` persisted. | `order_tracking_saved` |
| Orders · Cancel paid order | `orders[].{status,paymentStatus,canceledAt,cancellationReason,updatedAt}` with status `canceled` and payment `refunded`. Added a `cancellation` refund with status `issued`, a reason in `note`, and the original order's line IDs, quantities, and paid total. | `order_canceled` |
| Returns · Accept | `returns[].{status,acceptedAt,returnShippingPayer,authorizationNumber,updatedAt}` with status `accepted` | `return_accepted` |
| Returns · Mark received | `returns[].{status,receivedAt,updatedAt}` with status `received` | `return_received` |
| Returns · Issue full refund after receipt | `returns[].{status,refundId,resolvedAt,updatedAt}` with status `refunded`. Added an issued `return_full` refund with `returnId`. The order remained paid because it retained an unrefunded balance. | `return_refunded` |
| Returns · Issue full refund directly from a request | Same return and issued refund fields as above. Together with the previously issued refund, this covered the entire order. `orders[].{paymentStatus,updatedAt}` changed in the same write with payment status `refunded`. | `return_refunded` |
| Returns · Send partial offer | `returns[].{status,partialOfferId,offeredAt,updatedAt}` with status `offer_sent`. Added a `return_partial` refund with status `offered`, `returnId`, and `note`. | `return_partial_offered` |
| Promotions · Save sale event draft | New `promotions[].{id,name,type,status,discount,listingIds,actorId,createdAt,updatedAt}` with status `draft` | `promotion_created` |
| Promotions · Revise draft | `promotions[].{name,updatedAt}` | `promotion_revised` |
| Promotions · Schedule order discount | New promotion fields from Save draft, plus `minimumOrderTotal`, `startsAt`, `endsAt`, and `publishedAt`, with status `scheduled` | `promotion_created`, `promotion_scheduled` |
| Promotions · Reschedule | `promotions[].{startsAt,updatedAt}` | `promotion_revised`, `promotion_scheduled` |
| Promotions · End scheduled discount | `promotions[].{status,endedAt,updatedAt}` with status `ended` | `promotion_ended` |
| Promotions · Launch coupon | New promotion fields from Save draft, plus `code`, `startsAt`, `endsAt`, and `publishedAt`, with status `active`. Coupon code persisted in uppercase. | `promotion_created`, `promotion_started` |
| Promotions · End active coupon | `promotions[].{status,endedAt,updatedAt}` with status `ended` | `promotion_ended` |

Stopping after a partial offer left the related order untouched. Refund totals, line quantities, and links to the original order and return were checked via `/go`.

## ❌ Bugs for Dev Agent

### BUG-001 · P2 · Corrected discount retains its validation error

| Field | Value |
|-------|-------|
| Route | `/promotions/new` |
| Element | Discount (%) and form error banner |
| Action | On a new promotion, fill the name, jump to Dates and review, then attempt to schedule without a discount. After the wizard returns to Offer details, enter a valid discount such as 12. |
| Expected | Once corrected, the field can drop the stale error and its invalid state. |
| Actual | The field continues to show its old error and `aria-invalid=true` until a successful submit. Saving the draft succeeds. |
| Console errors | None |
| Fix hint | Clear or revalidate the affected field on input and derive the form banner from the remaining errors. |

### BUG-002 · P2 · Confirmation from another workflow persists during navigation

| Field | Value |
|-------|-------|
| Route | `/returns/:id` → `/promotions/new` |
| Element | Success notification |
| Action | Send a partial refund offer, navigate to Promotions, and open Create promotion. |
| Expected | The previous confirmation clears after leaving its workflow or expires on its own. |
| Actual | “Partial refund offer sent.” remains in the promotion form until manually dismissed or replaced. The notification can be dismissed. |
| Console errors | None |
| Fix hint | Clear notices on cross-section navigation, allowing confirmations to survive the redirect within their own section. |

## Visual Alignment Feedback

The comparison used the site's original design brief. The plum navigation, ivory workspace, plain-text brand, and local parcel and product illustrations appeared as designed. Mobile uses a wrapping row of direct navigation links. Screenshots are local test scratch files and are excluded from the deliverable.

## Round History

### Round 1

- All four required workflows passed. Two non-blocking feedback issues are recorded above.
- Docker dynamic certification is pending with the parent runner.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `81000`. The local evidence is `factory/build/dyn_certify/81000/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `listings → 0 → title`.
