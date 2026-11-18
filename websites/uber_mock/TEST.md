# Uber Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5320  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested (distinct page layouts) | 15 |
| Elements tested (grouped Playwright checks) | 21 |
| ✅ Passed | 19 |
| ❌ Failed | 2 |
| ⚠️ Skipped (out of scope) | 0 |

All five seed workflows passed against Vite dev and again with Chromium loading the built `dist` documents and assets against the same localhost Harbor API. The two failures use separate injected sessions and are documented below. `npm run build` passed.

## ✅ Passing Tests

### SEED.md workflows and state changes

| Workflow | Browser evidence | Changes observed via `/go` |
| --- | --- | --- |
| **Trips** | Searched the ledger and used its status and expense profile filters and pagination. Reassigned the Ferry Building trip to Studio travel. The detail retained the session and profile on reload, and the list showed the new classification. | On `trip_001`, `trips[].expenseProfileId` changed from `profile_001` to `profile_002`. `expenseAssignment` was written with `previousProfileId`, `profileId`, `status: assigned`, `actorId: rider_maya` and ISO `createdAt`. The original receipt collection matched the baseline. |
| **Receipts** | Opened the linked receipt and verified the original billed profile, masked payment, receipt search, billed profile and date filters. Downloaded `UB-261116-001.pdf`. Parsed the PDF and verified the $18.90 trip fare and $3.50 booking fee, quantity 1 each, and the $22.40 total. Confirmed resend to the displayed email. | Two `receiptActions[]` records were appended with distinct `id` values, `receiptId: receipt_001`, `tripId: trip_001`, `actorId: rider_maya` and `createdAt`. The download recorded `action: downloaded` and `status: completed`. The resend recorded `action: resend_requested`, `status: queued` and `recipientEmail: maya.chen@example.com`. |
| **Expense profiles** | Opened an archived profile, verified the form rejected invalid input, created Bay Study, then opened the prefilled edit form and saved Bay Studio Work. | Appended one `expenseProfiles[]` record with `id`, `riderId: rider_maya`, `name`, `type: business`, `status: active`, `receiptEmail`, `paymentMethodId`, `reportFrequency`, `expenseProvider: Concur`, `createdAt`, `updatedAt` and `updatedBy: rider_maya`. Editing kept the ID and creation timestamp, changed the name, email, payment method and frequency to Bay Studio Work, `bay.studio@example.org`, `pay_03` and `monthly`, and advanced `updatedAt`. |
| **Lost items** | Used the searchable completed-trip picker and verified the trip shortcut preselected the trip. Rejected an invalid callback phone, submitted a bag report, found it using history search and status, confirmed the item was returned, and reloaded the case. | Appended a `lostItemReports[]` record with `id`, `tripId: trip_001`, `reporterId: rider_maya`, `category: bag`, `description`, `callbackPhone`, `status: submitted`, `createdAt` and `updatedAt`. Returning the same case changed `status` to `returned`, advanced `updatedAt` and recorded `resolvedAt` and `resolvedBy: rider_maya`. |
| **Refunds** | Started from a charged trip, checked default line amounts, and verified the per-line and receipt-total limits. Requested $9.00 of fare and $2.50 of booking fee. Found the request in history and withdrew it. The directory picker also offered the cancellation fee on a charged canceled trip. | Appended a `refundRequests[]` record with `id`, `tripId: trip_001`, `receiptId: receipt_001`, `requesterId: rider_maya`, `reason: unexpected_fare`, `description`, `requestedAmount: 11.50`, `currency: USD`, `status: submitted`, `createdAt` and `updatedAt`. Its `lineItems[]` recorded `receiptLineId`, `label`, `quantity`, `chargedAmount` and `requestedAmount` for both selected charges. Withdrawal changed `status` to `withdrawn`, advanced `updatedAt` and wrote `withdrawnAt` and `withdrawnBy: rider_maya`. Both line snapshots matched their submitted values. |

### Controls and Harbor runtime

- **[/] Account navigation** · Verified the masthead brand, all account navigation destinations, active selection, four shortcuts, recent trip link, and keyboard skip link. SPA navigation and reloads retained `sid`.
- **[All five ledgers] Search and pagination** · Expanded lists, reached filtered empty results, and cleared filters. Checked Active, Archived and All expense profile views.
- **[Trip and receipt details] Dialogs and related links** · Verified hover feedback, assignment Cancel and Escape, focus restoration, and the disabled save for an unchanged assignment. Followed trip, receipt and profile links, checked invalid receipt dates, canceled resend and dismissed a confirmation.
- **[Profile and support forms] Validation and cancellation** · Verified missing-field messages, draft cancellation, saved edit defaults after reload, line checkbox selection and deselection, and cancellation of return and withdrawal confirmations.
- **[Deep links] Missing records** · Verified unavailable records in all five sections, an unavailable profile edit, and the global fallback. Each rendered with a working link back.
- **[Harbor state] Persistence and isolation** · The seed workflow session issued one baseline `set` and nine `set_current` posts. Its final diff contained only `trips`, `receiptActions`, `expenseProfiles`, `lostItemReports` and `refundRequests`. Read-only actions, invalid submissions and canceled confirmations left the supplementary session diff empty. A separate session retained the original trip profile. Reset worked, and a settled tab issued zero posts over 2.2 seconds.
- **[Injected state] Collection sizes and sparse records** · Rendered empty arrays, single partial records and 360 trips. Verified missing relationship and missing email handling, picker eligibility, large-list search and deep-link reload.
- **[Runtime assets] Browser health** · No console errors, page exceptions, failed localhost HTTP responses or external requests were observed in the checked scenarios. The state manager matched the shared template byte for byte.

## ❌ Bugs for Dev Agent

### BUG-001 · P0 · Fare review can persist another trip’s charge

| Field | Value |
| --- | --- |
| Route | `/trips/selected-trip` → `/refunds/new?tripId=selected-trip` |
| Element | View receipt and Request fare review |
| Action | Inject `selected-trip.receiptId: other-receipt`, with `other-receipt.tripId: other-trip` and a separate `correct-receipt.tripId: selected-trip`. Open the trip, request a review and submit the charge offered by the form. |
| Expected | Receipt link and review both use `correct-receipt` and `correct-line` for `selected-trip`. |
| Actual | The receipt link opened `other-receipt`. `/go` persisted `refundRequests[].tripId: selected-trip`, `receiptId: other-receipt` and `lineItems[0].receiptLineId: other-line`. |
| Console errors | None |
| Fix hint | In `relatedReceipt`, reject an explicit receipt whose populated `tripId` differs from the selected trip ID. Look up a matching receipt by trip ID and suppress the review action when no consistent charge exists. Preserve support for a partial receipt whose explicit trip reference is absent. |

### BUG-002 · P1 · Trip list misorders timestamps with different UTC offsets

| Field | Value |
| --- | --- |
| Route | `/trips` |
| Element | Trip ledger ordering |
| Action | Inject one trip at `2026-11-16T10:00:00+02:00` and one at `2026-11-16T09:00:00Z`, then open the list. |
| Expected | The 09:00 UTC ride appears above the 08:00 UTC ride. |
| Actual | The 08:00 UTC ride appears first. |
| Console errors | None |
| Fix hint | Sort valid timestamps by their parsed instant in `newest`. Keep missing or invalid dates last and preserve order for ties. The shared helper also serves receipt and support histories and trip pickers. |

## Visual Alignment Feedback

Reviewed local captures of all 15 page layouts against `DESIGN.md`. The navy masthead, warm ledger panels, serif headings and original route art are visible in the desktop captures. At 850, 601 and 360 pixels all 15 layouts fit the viewport. The 360-pixel overview stacks the content and keeps horizontal scrolling inside the navigation strip.

## Round History

### Round 1 → Round 2

- All seed workflows passed again on dev and built assets.
- BUG-001 and BUG-002 were reproduced independently from AUDIT-001 and AUDIT-002.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `149696`. The local evidence is `factory/build/dyn_certify/149696/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `paymentMethods → 0 → brand`.
