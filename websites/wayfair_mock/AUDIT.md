# Wayfair Mock — Audit Report

> Round: 1  
> Date: 2026-11-18  
> Audited by: audit agent

## Summary

The table records findings from the first audit. The final Chromium retest resolved AUDIT-001 and AUDIT-002. AUDIT-003 remains open.

| Category | Issues |
| --- | ---: |
| Dead handlers / stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 1 |
| Schema mismatches | 0 |
| Workflow behavior | 1 |
| Design alignment | 1 |
| Total | 3 |

## P0 — Dead/Broken Code

### AUDIT-001 · Confirmed changes could disappear from /go (resolved)

- **Location** `src/context/Account.jsx:23`, `src/utils/dataManager.js:64`.
- **Issue** The session lock covers the read and local update. The unchanged template starts the full-state POST and returns immediately, so the lock releases and the UI reports success while the save is pending. An older POST can finish after a newer one and overwrite its snapshot.
- **Reproduction** `node test-results/audit_write_order.mjs`. Two tabs share one session and each confirms cancellation of one unit of the two-unit line `wf-1005-i1`. Hold the first POST, let the second complete, then release the first. Both confirmations show success and both POSTs return 200. The `/go` snapshot goes from two canceled units and two linked records back to one of each.
- **Fix** Coordinate a persistence acknowledgement with the Harbor runtime owner. Keep same-session saves ordered through the server response and report failed saves in the confirmation flow. The shared `saveState` ABI currently returns no response, and the build brief requires both templates verbatim. Any fix must work on the built Harbor site as well as localhost. Verify that the delayed-write case keeps both records and the quantity of two.
- **Retest** The account store keeps the same-browser session lock until the request initiated by the shared template completes. Chromium verified the delayed-write case and an HTTP 503 followed by a successful retry against the final production bundle. See [TEST.md](TEST.md).

## P1 — Incomplete Features

### AUDIT-002 · An order-launched appointment review could silently drop its draft (resolved)

- **Location** `src/pages/Deliveries.jsx:96`, the `isScheduling` condition.
- **Issue** The route-triggered dialog is mounted only while `canBook` remains true. A same-session update can close it during review and discard the entered instructions. The URL still contains `schedule=1`. The confirmation handler already has a stale booking error, which the user cannot reach once the dialog unmounts.
- **Reproduction** `node test-results/audit_slot_draft.mjs`. Give `wf-1001-s1` one available slot. Open scheduling from its order, enter instructions and reach review in tab A. Book the remaining slot from tab B. Tab A loses the dialog and its draft without feedback.
- **Fix** Check eligibility when opening the dialog, then keep the draft mounted while the user works. Show the changed booking or unavailable window in the dialog, preserve the instructions, and clear the route flag on dismissal.
- **Retest** Chromium verified that booking the last slot in the second tab left the first tab's review and instructions intact. The first tab showed the stale-booking error without emitting a second save.

### AUDIT-003 · Overview illustration exceeds the desktop design allocation

- **Location** `src/styles.css:93`, `src/styles.css:97`.
- **Issue** `DESIGN.md` specifies a desktop overview panel up to 176 px tall with a 40% illustration area. The CSS uses a 176 px minimum, a 49% image element and a 1.12 scale.
- **Fix** Constrain the desktop artwork to the specified area and keep the narrow layout content-sized. Check both default and injected account names for text overlap and clipping.

## P2 — Minor Issues

None identified.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | Pass for template integrity | SHA-256 matches the repository template. |
| Account context state sync | Pass in the same Chromium context | Overlapping confirmations wait for acknowledgement within the same session and storage context. A rejected save shows a retryable error. |
| Vite `/post` and `/state` | Pass | Localhost injection, current-state writes, reads and reset follow the shared template. Reset restores the initial snapshot. |
| Vite `/go` | Pass | Returns the initial snapshot, current snapshot and top-level diff. The retest retained both cancellation records after overlapping confirmations. |
| Session isolation and idle writes | Pass | Separate IDs stayed isolated. An idle tab issued zero POSTs after loading and reflected another tab's cancellation. |
| Initial snapshot handling | Pass | `set_current` preserved the initial snapshot and reset restored it. A fresh sparse injection renders with merged defaults. |
| Offline assets and routes | Pass | Chromium blocked external requests. Local artwork loaded, all routes reloaded and empty, sparse, single-record and large injected collections rendered. No timer-driven state writes were found. |
| `SCHEMA.md` | Updated | All seven top-level keys and six confirmation transitions match the code. |

## Verification

`npm run build` passed. Nine original suites passed, covering orders, deliveries, damage claims, returns, stale return review, runtime acceptance, seed integrity, clipboard and service filters. The original audit runners reproduced both tab issues. The subsequent Chromium checks passed against the final production bundle on port 5313. See [TEST.md](TEST.md).

## SCHEMA.md Updates

Added endpoint details, reset semantics, default IDs, a runnable injection and same-browser write-order semantics. Kept the existing field-level verifier mappings.

## Order context follow-up

Order cards expose the individual shipment state and the next action for each product. Eligible items launch delivery scheduling, damage reporting or returns on the current order screen. The dialogs retain the selected product and order, and service references remain discoverable from the order after saving. The global delivery, claims and returns views continue to support their direct entry points.

The comparison used public Wayfair order help and shipping guidance. Visual verification of the signed-in product screens remains pending a matching account sample.

## Public interface walkthrough · 2026-11-19

The overview organizes the documented order-management tasks into shortcuts. The order pages use a lighter surface, visible account navigation and a consistent action hierarchy. Appointment windows are grouped by date, and a mobile bottom sheet keeps the header and actions available. A rejected save focuses the error, and a confirmed item request displays its reference in context.

Wayfair consumer pages returned a browser access denial in this environment. The public Help and Contact article provided order-entry guidance. The public Homebase case study rendered in Chromium and showed examples of the white surface, purple actions and mobile bottom sheet. Visual review of authenticated order and service screens still requires a matching sample. [Help and Contact](https://www.wayfair.com/help-and-contact) · [Homebase case study](https://www.aboutwayfair.com/careers/tech-blog/how-wayfairs-design-system-empowers-feature-teams-to-dream-bigger)
