# CVS Pharmacy Mock — Audit Report

> Round 1 · 2026-11-18 · Audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers / stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 1 |
| Schema mismatches | 0 |
| Total | 1 |

## P0 — Dead/Broken Code

### AUDIT-001 · A stale tab can erase a confirmed action · Resolved on 2026-11-18

- **File** `src/state.jsx:14`, with the pickup validation in `src/actions.js:45`.
- **Issue** Each tab validates and builds the full state from its own in-memory snapshot. The shared API replaces current state with that snapshot on `set_current`. A tab open before a saved action can submit a stale action, or silently revert an unrelated saved record while confirming a valid action.
- **Reproduction** Open `/pickup/pickup-001` in tab A and `/prescriptions/rx-001` in tab B with the same fresh SID. Open the hide dialog in B. Confirm a drive-thru pickup check-in in A. Verify `pickupOrders[0].status: "checked_in"` through `/go`. Confirm the hide in B. The prescription becomes hidden and the pickup reverts to `ready`. With the ready pickup open in both tabs, a stale counter confirmation also replaces the saved drive-thru method.
- **Fix** Reconcile against the latest state for the SID at user confirmation, then run the action validation and build one full-state save from that state. Preserve newer changes to unrelated records and surface the existing validation error if the selected action is stale. Keep the Harbor templates unchanged and use no background writes. Regression coverage should verify that the stale hide preserves the check-in and the second check-in leaves the first check-in’s method and timestamps intact.

## P1 — Incomplete Features

No findings.

## P2 — Minor Issues

No findings.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | Pass | Byte-for-byte match to the shared template. Boot loads state before showing account routes. |
| Store state sync | Fail | One write per successful confirmation in a single tab. Two active tabs can overwrite each other’s saved actions. See AUDIT-001. |
| Vite `/post` and `/state` | Pass | Verified `set`, `set_current`, injection, and reset. The shared template restores the baseline on reset. |
| Vite `/go` | Pass | Returns initial state, current state, and changed top-level keys. |
| Session isolation | Pass | Verified independent SIDs and SID preservation through workflow links. |
| Initial state | Pass | `set_current` kept the established baseline. |
| Idle state writes | Pass | One baseline POST, followed by no additional POSTs during 1.5 seconds of idle observation. Source has no timers that write state. |
| Injected state | Pass | Twelve routes and hard reloads rendered with empty, singleton, and 300-record collections, including records with missing display fields. |
| Offline assets and build | Pass | `npm run build` passed. Chromium loaded the compiled JS, CSS, and local SVG with only the localhost state API, wrote a pickup check-in, and reloaded the detail route. |
| `SCHEMA.md` | Pass | All nine top-level keys and every business write are documented. |

## Workflow Evidence

| Workflow | Verified on localhost port 5340 |
| --- | --- |
| Prescriptions | Rx search, hide confirmation, Escape focus restoration, restore via Hidden, and month, year, and patient history filters. Print invoked the browser print control. Hide and restore changed `prescriptions[].hidden`, `updatedAt`, and `updatedBy`. |
| Refills | Detail link preselection, a two-item review, one save containing linked `refillOrders[]` and `pickupOrders[]` records, an accurate total, an open-order eligibility block, and pickup detail reload. |
| Pickup | Drive-thru selection and persistence of `status`, `checkedInAt`, `checkedInBy`, `checkInMethod`, `updatedAt`, and `updatedBy`. Single-tab repeat prevention passed. The stale two-tab cases reproduced AUDIT-001. |
| Vaccine appointments | Two-vaccine booking, occupied slot exclusion, rescheduling in place with the same confirmation code, cancellation, and reload. Verified `vaccineAppointments[]` creation and lifecycle fields. |
| Account UI | Original local artwork loaded. Seven workflow routes fit a 320px viewport without document overflow. No stub handlers were found. |

## SCHEMA.md Updates

Added endpoint examples, the fixed seed IDs, an empty-world injection example, and the expected schema headings. Retained the field-level write mapping and verified it against the action code and `/go`.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Fixed and retested.** A stale tab hid a prescription without reversing its pickup check-in. A stale duplicate check-in preserved the original drive-through method.

Docker dynamic certification run `125084` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
