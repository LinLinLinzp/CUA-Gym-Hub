# DoorDash Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5316  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Route patterns tested, including root redirect and fallback | 11 |
| Shared filter buttons tested individually | 13 |
| Successful mutation confirmations verified per acceptance run | 18 |
| Required workflow suites passed on both dev and dist | 4 of 4 |
| Open persistence bugs | 2 |

The installed Node Playwright Chromium passed the SEED acceptance suite on Vite dev and on the built `dist/` assets. The production harness served those assets on the same localhost origin and used the live Harbor middleware for `/state`, `/post`, and `/go`.

## ✅ Passing Tests

### SEED workflows and observable state changes

| Workflow | Exercised in Chromium | Confirmed in `/go` |
| --- | --- | --- |
| Orders | Combined item search and status filtering, cleared filters, opened a receipt, dismissed reorder with Escape and verified restored focus, rejected fractional quantity, placed a modified reorder, reloaded, and confirmed cancellation. | Reorder appended one `orders[]` record with `id`, `sourceOrderId`, `status: placed`, `merchantId`, `merchantName`, `items` with adjusted `quantity`, recalculated `totals`, `deliveryAddress`, `paymentLabel`, `createdBy`, and `createdAt`. Cancellation changed exactly `status`, `canceledAt`, `updatedAt`, and `canceledBy` on that order. |
| Group orders | Combined search and filter, rejected an incomplete start form, created a group with a past informational deadline, verified clipboard copy, rejected a wrong token, joined and edited a guest cart, reloaded the guest tab, edited the host cart, closed the group, and rejected a stale guest save. Dismissed checkout, placed the group order, and rejected duplicate checkout from a second host tab in the same context. Canceled separate open and closed groups. | Creation appended `groupOrders[]` with `id`, `name`, `merchantId`, `merchantName`, `hostId`, `inviteToken`, `createdBy`, `createdAt`, `deadlineAt`, `status: open`, and `participants` with an empty host cart. Join added a guest to `participants`. Cart saves set `participants[].items`. Both set `updatedAt` and `updatedBy`. Close set `status`, `closedAt`, `updatedAt`, and `updatedBy`. Checkout set `status`, `orderId`, `placedAt`, `updatedAt`, and `updatedBy` and appended one `orders[]` record with `groupOrderId`, `items[].participantId`, `items[].quantity`, and receipt `totals` in the same post. Cancel set `status`, `canceledAt`, `updatedAt`, and `updatedBy`. |
| Refunds | Rejected empty and excessive quantity requests, reviewed an incorrect-item request with credit and a note, reloaded its details, followed both receipt links, verified that the full requested quantity was unavailable for a duplicate, searched under Requested, and checked the issue date of a historical refund. | Appended one `refunds[]` record with `id`, `orderId`, `merchantName`, `status: requested`, `reason`, `method`, `note`, `createdBy`, `createdAt`, `items[]` with `orderItemId`, `name`, `quantity`, and `amountCents`, and record-level `totalCents`. The source receipt was byte-for-byte equivalent as JSON. |
| DashPass | Scheduled annual, paused, resumed, rejected cancellation without a reason, canceled, reactivated within paid access, reloaded, and opened billing details. In isolated worlds, reactivated expired membership on annual and enrolled an inactive membership on monthly. | Every action updated `dashpass.updatedAt` and appended one `dashpassEvents[]` entry with `id`, `membershipId`, `type`, `actorId`, `createdAt`, `effectiveAt`, `previousStatus`, `nextStatus`, `previousPlanId`, `nextPlanId`, and cancellation `reason` where applicable. Plan change set `pendingPlanId` and used the next charge as `effectiveAt`. Pause set `status`, `pausedAt`, `nextBillingAt`, and `accessUntil`. Cancellation set `status`, `canceledAt`, `cancelReason`, `pendingPlanId`, `nextBillingAt`, and `accessUntil`. Resume and paid reactivation restored `status`, `nextBillingAt`, and `accessUntil` and cleared `pausedAt`, `canceledAt`, and `cancelReason`. Expired reactivation and enrollment set `status`, `planId`, `pendingPlanId`, `paymentMethodId`, `paymentLabel`, `nextBillingAt`, `accessUntil`, `pausedAt`, `canceledAt`, and `cancelReason`. Each appended a `dashpassPayments[]` charge with `id`, `eventId`, `membershipId`, `planId`, `paymentMethodId`, `paymentLabel`, `periodStart`, `periodEnd`, `amountCents` (9600 or 999), `status`, `createdAt`, and `actorId`. Monthly January 31 enrollment ended February 28. |

### Runtime and build

- The default baseline contained 8 merchants, 38 orders, 24 groups, 24 refunds, 25 membership events, and 24 payments. The client helper matched the repository template by SHA-256. The existing Vite listener served the target app on port 5316 and was reused.
- Each successful action produced exactly one full `set_current` request with the expected changed top-level keys. Dismissal, clipboard copy, validation, navigation, refresh, stale confirmations, and 2.2 seconds idle produced zero additional writes. The default workflow SID posted one baseline.
- Tested SID isolation and `/post` reset, nav active states, all 13 status filters, clear filters, wordmark and backlink navigation, hard reload, direct deep links and missing-record links, dialog close and focus restoration, toast dismissal, empty collections, partial records without related entities, and a searchable 340-order collection.
- No uncaught page errors, browser console errors in the supplemental route check, or external requests.
- `npm run build` passed. The dist run used browser routing to serve the production files while keeping the dev listener available. Scratch runner and screenshots are in ignored `tests/` and `test-results/`.
- Reproduction commands from this directory with Vite running are `node tests/test_acceptance.mjs`, `node tests/test_acceptance.mjs --dist`, and `node tests/test_ui_round2.mjs`.

## Visual Alignment Feedback

Reviewed ten rendered views at 1280 px and 360 px using the site's original design in `DESIGN.md`. The plum masthead, warm canvas, serif headings, local food art, and active navigation were consistent across the account. No tested view had page-level horizontal overflow. At 360 px, the DashPass billing table scrolled within its panel and the charge link opened its detail page.

## ❌ Bugs for Dev Agent

### BUG-001 · P0 · Delayed write rolls back a confirmed cancellation

| Field | Value |
| --- | --- |
| Route | `/orders/:orderId` |
| Element | Confirm cancellation |
| Action | Hold the first cancellation POST, confirm a second cancellation, then release the first POST. |
| Expected | `/go` retains both canceled records. |
| Actual | Once the older POST arrived, `orders[]` in `/go` reverted `DD-240117` to `placed`. The browser retained both local cancellations. |
| Reproduction | `node tests/test_audit_write_order.mjs` |
| Fix hint | Keep the templates unchanged and wait for an earlier full-state POST to settle before sending the next one. |

### BUG-002 · P0 · A host action erases a guest from an independent browser context

| Field | Value |
| --- | --- |
| Route | `/group-orders/:groupId` and its invite route |
| Element | Join group, then Confirm close |
| Action | Open the host view, join from an independent Chromium context, reload the host, and close the group. |
| Expected | The closed group retains the acknowledged guest in `groupOrders[].participants`. |
| Actual | `/go` showed the guest after joining. The host still loaded its cached group, and closing removed the guest from `/go`. |
| Reproduction | `node tests/test_audit_guest_context.mjs` |
| Fix hint | Reconcile from the current session snapshot before rendering a resumed view and before applying a confirmed mutation. |

## Round History

### Round 1 → Round 2

- All four SEED workflows passed again on dev and dist.
- Both persistence issues from `AUDIT.md` reproduced against the local dev server.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `43924`. The local evidence is `factory/build/dyn_certify/43924/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `merchants → 0 → name`.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Fixed and retested.** Delaying a cancellation in one tab no longer let that older snapshot overtake a second same-session tab write. The workflow suite passed.
- **AUDIT-002 · Fixed and retested.** A reloaded host in one context saw a guest added in another context. A subsequent close kept that guest in Harbor. Simultaneous writes from isolated contexts still lack a server-side compare-and-swap guarantee.

Docker dynamic certification run `188924` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
