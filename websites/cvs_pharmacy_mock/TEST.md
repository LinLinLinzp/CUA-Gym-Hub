# CVS Pharmacy Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5340  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested | 12 |
| Elements tested (grouped checks) | 17 |
| ✅ Passed | 15 |
| ❌ Failed | 2 reproductions of one issue |
| ⚠️ Skipped (out of scope) | 0 |

The seed workflows passed in Chromium against both Vite dev and the built bundle, using the shared localhost state API. The two-tab data-loss bug below remains open.

---

## ✅ Passing Tests

### Seed workflows and observed `/go` writes

| Workflow | Browser verification | Changed fields in `/go` |
| --- | --- | --- |
| Prescriptions | Searched by medication and Rx number, filtered by patient and visibility, opened details, dismissed a hide prompt, then hid and restored the same prescription. Reloaded to verify persistence. Filtered history by patient, month, and year and invoked print. | Hide and restore modified the selected `prescriptions[]` row’s `hidden` and `updatedAt`. Hide populated `updatedBy` with the account ID, which restore retained. Search, detail, history, printing, and dismissing the dialog caused no writes. |
| Refills | Opened from a prescription detail with its item preselected, added a second eligible item, chose a pickup window, reviewed, confirmed, and followed the receipt to pickup details. Verified six ineligibility reasons and the new order’s duplicate block. | A single save appended a `refillOrders[]` row with `id`, `patientId`, `storeId`, `pickupOrderId`, `items`, `estimatedTotal`, `pickupWindow`, `status: "submitted"`, `createdAt`, and `createdBy`. It also appended a linked `pickupOrders[]` row with `id`, `patientId`, `storeId`, `refillOrderId`, `items`, `estimatedTotal`, `pickupWindow`, `status: "preparing"`, `createdAt`, and `createdBy`. The item snapshots held quantities 30 and 90 and the estimated total was $20.50. Prescription refill counts stayed the same. |
| Pickup | Opened a ready order from the list, selected drive-thru, confirmed, and reloaded to verify the method. A counter-only location offered only counter check-in. Preparing and checked-in orders had no check-in action. | Only the selected `pickupOrders[]` row changed. It gained `status: "checked_in"`, `checkedInAt`, `checkedInBy`, `checkInMethod: "drive_thru"`, `updatedAt`, and `updatedBy`. The single-tab repeat was rejected. |
| Vaccine appointments — book | Scheduled three vaccines for one patient, verified the selection limit, chose a pharmacy, day, and time, reviewed, and opened details from the receipt. The action rejected an occupied store slot and a simultaneous visit for the same patient. | Appended one `vaccineAppointments[]` row with `id`, `patientId`, `vaccineIds`, `storeId`, `scheduledFor`, `status: "scheduled"`, `confirmationCode`, `createdAt`, and `createdBy`. |
| Vaccine appointments — reschedule | Carried the patient and vaccines forward, changed both pharmacy and time, and confirmed. The action rejected a no-op reschedule. | The existing `vaccineAppointments[]` row changed its `storeId`, `scheduledFor`, `rescheduledAt`, `updatedAt`, and `updatedBy`. The ID and confirmation code stayed the same. |
| Vaccine appointments — cancel | Dismissed the first prompt, then cancelled and reloaded. Verified past and cancelled visits could not be changed. | The existing `vaccineAppointments[]` row changed `status` to `cancelled` and gained `cancelledAt` and a new `updatedAt`. The same account ID remained in `updatedBy`. |

### Controls, routes, and runtime

- **Account shell.** Verified keyboard skip link, wordmark, active navigation and hover cursor, overview shortcuts, representative preview links, and the unknown-route return link. In-app navigation preserved the SID.
- **Prescriptions and history.** Verified forward and back links, the filtered empty result, Escape dismissal and restored button focus, and visible rows under print media.
- **Refills and vaccine forms.** Verified patient and pharmacy selectors, selection and deselection, day changes clearing the chosen time, required-field validation, and review screens returning to editable drafts. These interactions made no business writes.
- **Deep links and injection.** All 11 account routes loaded directly with fresh SIDs in empty, singleton, partial, and 200-plus-record worlds. Missing records had a return link. Partial worlds preserved unrelated injected keys on write and rejected pickup check-in without linked entities.
- **State API and idle behavior.** `/post` set, set-current, and reset stayed isolated by SID. The workflow SID posted one baseline plus one save per successful confirmation. An idle tab posted nothing and preserved a later external write.
- **Build and offline assets.** `npm run build` passed with a React Router bundling warning about its `"use client"` directive. Chromium loaded generated JS, CSS, and the original local artwork using localhost only. No browser page errors were observed. The local state adapter matched the shared template byte for byte.

---

## ❌ Bugs for Dev Agent

### BUG-001 · P0 · A stale tab can overwrite a confirmed pickup check-in

| Field | Value |
| --- | --- |
| Route | `/pickup/pickup-001` and `/prescriptions/rx-001` |
| Element | Confirm check-in and Hide prescription |
| Action | Open both routes with the same fresh SID. Open the hide dialog. Confirm drive-thru check-in in the pickup tab, then confirm hide in the other tab. Separately, open the ready pickup in two tabs, start both check-ins, and confirm drive-thru followed by counter. |
| Expected | Hiding a prescription preserves the already saved check-in. A second check-in is rejected and preserves the first method and timestamps. |
| Actual | In `/go`, the hide saved successfully and reverted the pickup status from `checked_in` to `ready`. In the second reproduction, the later POST succeeded and replaced `checkInMethod: "drive_thru"` with `"counter"`. |
| Console errors | None |
| Fix hint | Reconcile with the latest SID state at confirmation and revalidate the action before saving the full state in `src/state.jsx`. See `AUDIT-001`. |

---

## Visual Alignment Feedback

Captured all 11 account routes locally. The inspected overview, prescription list, and scheduling form match the original layout in `DESIGN.md`, including the text wordmark and local SVG illustration. All 11 account routes fit a 320 px viewport without horizontal document overflow. The navigation strip scrolls within its own area at narrow widths.

## Round History

### Round 1 → Round 2

- Seed workflows passed again on the dev server and built bundle.
- AUDIT-001 reproduced in two Playwright scenarios and remains open as BUG-001.
-

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `68532`. The local evidence is `factory/build/dyn_certify/68532/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `patients → 0 → name`.
