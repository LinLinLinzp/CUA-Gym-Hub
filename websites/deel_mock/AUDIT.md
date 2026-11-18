# Deel Mock — Audit Report

> Round 1  
> Date 2026-11-18  
> Audited by the audit agent

## Summary

| Category | Open issues |
| --- | ---: |
| Dead handlers or stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 1 |
| Schema mismatches | 0 |
| Other UI behavior | 1 |
| Total | 2 |

The app uses a horizontal slate header, plain-text Deel branding, synthetic Northstar Studio records, system fonts and original CSS artwork. The build and existing six-suite Chromium run passed. The targeted audit reproduced the two findings below on `127.0.0.1:5396`.

## P0 — Dead/Broken Code

### AUDIT-001 · A stale tab can replace completed writes for the same session

- **Files** `src/context/Workspace.jsx:24`, `src/data/invoices.js:5`
- **Issue** The mutation boundary validates against a tab-local snapshot. The Harbor API accepts the resulting whole-state write, so a second tab can confirm an already released invoice or overwrite an unrelated mutation.
- **Reproduction** Open `inv-001` in two tabs and `tor-001` in a third tab with the same `sid` and browser context. Open both payment reviews. Confirm the first and wait for `set_current` to succeed. Confirm the second. Both writes succeed and `/go` shows a new `paymentId`, while the first payment and event have disappeared. Approve `tor-001` in the third tab. `/go` now shows the approval, and `inv-001` is Open again with neither payment present.
- **Fix** At the workspace mutation boundary, serialize writes across same-origin tabs for the same session and revalidate actions against the latest shared state before calling the required `saveState`. Verify that the second payment is rejected and that a stale time-off tab can approve a request while preserving the earlier payment and activity. Keep both Harbor templates unchanged and keep idle tabs read-only.

## P1 — Incomplete Features

### AUDIT-002 · The calendar marks weekends as leave days

- **File** `src/pages/TimeOff.jsx:85`
- **Issue** Request quantity and balance count weekdays, but the calendar marks every date in an approved range.
- **Reproduction** Inject an approved full-day request from Friday, December 4, to Monday, December 7, 2026, with `days: 2`. In the December calendar, Saturday and Sunday each display an approved request count of `1`.
- **Fix** Apply the same weekday rule to cell counts and retain the approved request in the monthly list.

## P2 — Minor Issues

None open.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | Pass | File hash matches the Harbor template. The provider awaits load before displaying routes. |
| Workspace state sync | Fail | Every successful single-tab action writes structured records and activity once. A stale tab can supersede those writes. |
| `/post`, `/state`, `/go` | Pass | Tested custom state, `set_current`, baseline preservation, diff and reset. Reset restores the initial state per the Harbor template. |
| Session isolation | Pass | Separate `sid` values kept different injected worlds. Links and hard reloads preserved `sid`. |
| Idle writes | Pass | No idle business writes. The download timer only releases its local object URL. |
| Injected data and offline assets | Pass | Empty, sparse and 220-record worlds rendered. Chromium observed no external runtime requests across the workflow suite. |
| `SCHEMA.md` | Pass | Record shapes and observable fields match the audited action code. |

## SCHEMA.md Updates

Added endpoint syntax, seed ID ranges, a minimal injection payload, and the observed baseline and reset behavior. The action table already matches the source.
