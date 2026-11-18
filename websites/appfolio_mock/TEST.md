# AppFolio Property Manager Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5439  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Primary routes tested | 9 |
| Seed workflows passed | 4 |
| Successful workflow submissions verified through `/go` | 19 |
| Open bugs | 0 |

Node Playwright from `PILOT_PLAYWRIGHT` drove installed Chromium against Vite dev and the built Vite preview. `npm run build` passed. The browser used November 18, 2026 in America/New_York, advancing the timestamp for each successful submission.

## ✅ Passing Tests

- **Overview and shell.** Verified the four metric links, both queues, links to seeded work orders and lease details, the brand link, keyboard skip navigation, confirmation link and dismissal, and session ID retention.
- **Properties and units.** Created and edited Oriole Gardens and its linked unit. Checked search, type and status filters, sort controls, pagination, the rent-ready checkbox, dialog focus, Escape, Close and Cancel. Duplicate labels and archiving while current or future leases were linked produced zero writes. The records survived reload.
- **Leases.** Created a term on the new unit, edited its rent, renewed it and ended the original term. The successor started May 1, 2027 and referenced the original lease. The original kept its April 30 contractual end date and recorded April 15 as its confirmed end date. Invalid renewal dates and overlapping terms produced zero writes. Verified property and phase filters, end-date sort and the lease–ledger links.
- **Work orders.** Created and edited an order, assigned it, scheduled and rescheduled it, started it and completed it. Canceled a separate order. Verified order search, property/priority/status filters, priority sort, linked location and structured history.
- **Rent.** Selected the correct ledger by lease start date, posted a $100.01 charge and recorded $40.25 and $59.76 payments. The charge progressed from Open to Partial to Paid. The same-day transaction running balance went from $100.01 to $59.76 to $0.00. A due date before posting and an overpayment produced zero writes. The final payment survived reload.
- **Harbor.** The workflow session issued one baseline POST and one `set_current` POST per accepted submission. Read-only navigation, filters and a 1.8-second idle window issued zero further POSTs. All four detail routes loaded directly and reloaded in fresh contexts. Isolated sessions rendered empty arrays, singleton records with missing optional fields and unresolved references, and 420 properties, units, leases and orders. An unknown injected key survived a create action. API reset restored the session baseline and an untouched session kept the defaults.
- **Seed integrity.** Verified 72 unique charge IDs and 48 linked payments through `/go`. Every charge posted within its lease term, every due date fell on or after posting, every rent billing month was unique per lease, and every receipt followed or matched its charge date.

### Observed state changes via `GET /go?sid=…`

Each row records values that changed between successive `current_state` reads in the workflow session. The final `state_diff` contained `properties`, `units`, `leases`, `workOrders`, `rentCharges` and `rentPayments`.

| Workflow action | Collection | Fields observed |
| --- | --- | --- |
| Add property | `properties[]` | Appended `id`, `name`, `address1`, `address2`, `city`, `region`, `postalCode`, `type`, `status`, `notes`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`. |
| Edit property | `properties[]` | Changed `notes` and `updatedAt`. |
| Add unit | `units[]` | Appended `id`, `propertyId`, `label`, `beds`, `baths`, `marketRent`, `rentReady`, `status`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`. |
| Edit unit | `units[]` | Changed `label` from B-204 to B-205, `marketRent` to 1540.50 and `updatedAt`. |
| Create lease | `leases[]` | Appended `id`, `propertyId`, `unitId`, `residentName`, `residentEmail`, `startDate`, `endDate`, `monthlyRent`, `deposit`, `status`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`. |
| Edit lease | `leases[]` | Changed `monthlyRent` to 1510.35 and `updatedAt`. |
| Renew lease | `leases[]` | Appended the same fields as creation plus `renewedFromLeaseId` pointing to the original lease. |
| End original lease | `leases[]` | Changed `status` to `ended` and set `endedOn`, `endReason` and `updatedAt`. |
| Create work order | `workOrders[]` | Appended `id`, `propertyId`, `unitId`, `title`, `description`, `category`, `priority`, `permissionToEnter`, `status`, `history`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`. |
| Edit work order | `workOrders[]` | Changed `description` and `updatedAt`. Appended an `edited` event to `history`. |
| Assign work order | `workOrders[]` | Changed `status`, `assigneeId` and `updatedAt`. Appended an `assigned` event with `assigneeId`. |
| Schedule work order | `workOrders[]` | Changed `status`, `scheduledFor` and `updatedAt`. Appended a `scheduled` event with `scheduledFor`. |
| Reschedule work order | `workOrders[]` | Changed `scheduledFor` and `updatedAt`. Appended a second `scheduled` event with the new date. |
| Start work | `workOrders[]` | Changed `status`, `startedAt` and `updatedAt`. Appended a `started` event. |
| Complete work | `workOrders[]` | Changed `status`, `completedAt`, `completionNote` and `updatedAt`. Appended a `completed` event with the note. |
| Cancel a separate order | `workOrders[]` | Changed `status`, `canceledAt`, `cancelReason` and `updatedAt`. Appended a `canceled` event with the reason. |
| Post charge | `rentCharges[]` | Appended `id`, `leaseId`, `postedOn`, `dueOn`, `status`, `type`, `description`, `amount`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`. |
| Record partial and final payments | `rentPayments[]` | Appended two records with `id`, `leaseId`, `chargeId`, `amount`, `receivedOn`, `status`, `method`, `reference`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`. Both linked to the posted charge and its original lease. |

## ❌ Bugs for Dev Agent

No open issues from this run. The parent runner handles Docker dynamic certification.

## Visual Alignment Feedback

Reviewed local screenshots against the original design in `DESIGN.md`. Desktop overview, lists and details rendered with the text wordmark, designed color palette and original local motif. The 390 px lists contained horizontal overflow within table regions. Chromium reported zero console errors, uncaught page errors or external requests.

## Round History

### Round 1 → Round 2

- Fixed AUDIT-001 by keeping seeded recurring rent periods distinct and ensuring due dates are on or after posting. The fixed IDs, inventory counts and payment links were retained.
- Made the keyboard skip link focus the main content.
- Added lease start dates to the rent list so original and renewed ledgers can be distinguished. Same-day receipts now use recording time for their running-balance order.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `151024`. The local evidence is `factory/build/dyn_certify/151024/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `properties → 0 → name`.
