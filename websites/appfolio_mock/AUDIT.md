# AppFolio Property Manager — Audit Report

> Round 1  
> 2026-11-18  
> Audited by the audit agent

## Summary

| Category | Open issues |
| --- | --- |
| Dead handlers or stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 0 |
| Schema mismatches | 0 |
| Seed data integrity | 1 |
| Total | 1 |

## P0 — Dead or Broken Code

None found.

## P1 — Incomplete Features

### AUDIT-001 · Seeded rent charges use invalid dates and duplicate billing periods

- **File** — `src/data/seed.js`, the `rentCharges` generator.
- **Issue** — The generator clamps posting dates to the lease term, then unconditionally sets the due date to the fifth of that month. Nine seeded charges have a due date before their posting date, which the charge form rejects. Clamping also gives five pairs of rent charges the same lease, description, date, and amount. For example, `charge-012` and `charge-060` both post September rent for `lease-012` on September 15 with a September 5 due date. Each charge contributes separately to the ledger and portfolio totals.
- **Fix** — Assign recurring rent charges to distinct billing periods within each affected lease term and make each due date fall on or after its posting date. Retain the fixed IDs, inventory counts, and payment links. Verify each linked receipt is dated on or after its charge was posted.

## P2 — Minor Issues

None found.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | Pass | Byte-for-byte template match. Routes wait for state to load. |
| Store state sync | Pass | Every accepted business action saves the whole JSON workspace once through `commit`. Audit metadata uses the runtime clock and account ID. |
| Vite `/post` and `/state` | Pass | Injection, current writes, and reset to the first baseline work through the shared template. |
| Vite `/go` | Pass | Returns initial state, current state, and top-level diffs. The first baseline remained intact after updates and a later `set`. |
| Session isolation | Pass | Browser navigation and reloads kept the session ID. A separate API session showed no injected data. |
| Idle and read-only behavior | Pass | After one baseline POST, only 19 accepted mutations posted. Navigation, search, pagination, rejected forms, Escape dismissal, reloads, and the idle check produced zero writes. No timer-driven persistence in the source. |
| Injected state | Pass | Empty collections, minimal singleton records with missing optional fields and unresolved links, and 350 records per collection rendered without browser errors. Unknown injected data survived mutations. Lists and details reloaded at 390px without page overflow. |
| Offline assets | Pass | Built preview used only localhost requests. The app uses system fonts, the AppFolio text wordmark, and the original local portfolio motif. |
| Build and routing | Pass | `npm run build` passed. Each built detail route loaded directly and reloaded in a fresh Chromium context. |
| Schema | Pass | All eight top-level keys and every business mutation are documented. |

## Workflow Checks

The audit used installed Node Playwright and Chromium against localhost port 5439. Both the dev server and the built Vite preview passed the following checks.

| Workflow | Observed behavior and state |
| --- | --- |
| Properties | Created and edited a property and unit, with linked IDs in `properties[]` and `units[]`. Verified search, pagination, reload, and rejection of a duplicate unit label and archiving with linked live leases. |
| Leases | Created a term, edited `monthlyRent`, renewed with `renewedFromLeaseId`, and ended the original with `status`, `endedOn`, and `endReason`. Rejected an overlapping term. |
| Work orders | Created and edited an order, then assigned, scheduled, started, and completed it. Verified status, action fields, event history, and actor links in `workOrders[]`. Canceled a second order and verified its timestamp and reason. |
| Rent | Posted a charge and recorded two receipts linked by `leaseId` and `chargeId`. The outstanding balance moved from $115.50 to $75.25 to $0.00. The ledger showed Partial and then Paid. Rejected a due date before posting and an overpayment. |

Docker dynamic certification is handled by the parent runner after the Playwright phase.

## SCHEMA.md Updates

Added the localhost API reference, fixed seed ID ranges, an empty portfolio injection example, and baseline and reset semantics verified against the Harbor template. Retained the record shapes and observable-state map.
