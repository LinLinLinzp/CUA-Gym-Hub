# Ramp Mock — Audit Report

> Round 1  
> Date 2026-11-18  
> Audited by the audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers / stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 0 |
| Schema mismatches | 0 after documentation update |
| Workflow validation | 2 |
| Total open | 2 |

## P0 — Dead or broken code

No findings.

## P1 — Incomplete features

### AUDIT-001 · An invalid injected draft can enter approval

- **File** `src/pages/Bills.jsx:64`
- **Element** Submit for approval on a draft or rejected bill.
- **Issue** The submission guard checks that line items exist and the stored invoice amount is positive. It does not validate each line or reconcile the line totals with the invoice amount. In Chromium, an injected draft with a quantity of zero, a $0 line total, and a $100 invoice total entered `pending_approval`. `/go` showed a linked $100 approval and the unchanged zero-quantity line.
- **Fix** Share invoice validation between saving and submitting. Check the vendor/invoice pair and reconcile the stored invoice amount against the calculated line totals in cents. Keep an invalid draft editable and explain what must be corrected before submission.

### AUDIT-002 · A paid bill can receive a duplicate payment when its pointer is absent

- **File** `src/pages/Bills.jsx:181` and `src/pages/Bills.jsx:245`
- **Element** Schedule payment and Mark paid externally on an approved bill.
- **Issue** The UI and write guard look up a payment through `bills[].paymentId` alone. An injected approved bill without that field already had a paid record in its visible history through `payments[].billId`. Mark paid externally appended a second paid record for the same bill and `/go` retained both.
- **Fix** Check payments linked by bill ID in the action controls and the store mutation. Block a new payment when a scheduled or paid record already exists. Keep canceled records visible in history and allow subsequent scheduling after an unschedule.

## P2 — Minor issues

No findings.

## Data Pipeline Status

| Component | Status | Evidence |
| --- | --- | --- |
| `src/utils/dataManager.js` | Pass | SHA-256 matches the shared template. |
| Store state sync | Pass | One baseline write and one full-state write per successful user action in the main suite. Changes include structured business records and activity. Navigation, validation, cancel, reload in the same context, and idle time did not generate additional writes. |
| Vite `/post`, `/state`, and `/go` | Pass | Uses the shared plugin. Chromium workflow tests passed against dev and built preview. `/state.stored_state` matched `/go.current_state`. |
| Session isolation | Pass | Separate session IDs loaded distinct data. Edits in the large injected world preserved unrelated records and custom fields, and left the main session unchanged. |
| Initial snapshot and reset | Pass | Later mutations preserved `initial_state`. Harbor reset restored that snapshot and cleared `state_diff`. |
| Injection rendering | Pass | Empty data, a single bill or approval, 311 cards plus a null entry, sparse relationships, unknown statuses, and deep links rendered without page errors. The two bill action findings still apply to injected records. |
| Offline assets | Pass | Chromium blocked any request outside localhost and reported no external request attempts. The UI uses system fonts, live brand text, and a CSS card illustration. |
| Schema accuracy | Pass | All top-level keys and mutation footprints match the seed and observed writes. |

## SCHEMA.md Updates

Added the localhost endpoint reference, Harbor reset behavior, default ID ranges, and a minimal single-card injection example. The state shapes and action mappings are unchanged.
