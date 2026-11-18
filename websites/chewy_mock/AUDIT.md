# Chewy Mock — Audit Report

> Round 1  
> November 18, 2026  
> Audited by the audit agent

## Summary

| Category | Found | Open |
| --- | ---: | ---: |
| Dead handlers and stubs | 0 | 0 |
| Missing state tracking | 0 | 0 |
| State calculation and validation | 2 | 0 |
| Design alignment | 1 | 0 |
| Schema documentation | 1 | 0 |
| Total | 4 | 0 |

## P0 — Dead or Broken Code

No findings. All four required workflow groups persisted structured records observable through `/go`.

## P1 — Incomplete Features

### AUDIT-001 · Split returns could over-refund tax

- **File** · `src/model.js`
- **Issue** · Rounding each partial request separately could exhaust more than the proportional tax. Four $0.10 returns on a $1.00 order with $0.05 tax and $0.60 of ineligible merchandise returned $0.03 tax when the proportional amount was $0.02.
- **Resolved** · Each request uses the rounded cumulative allocation less tax already refunded. Chromium verified four submissions and their `taxRefund`, `shippingRefund`, and `refundAmount` in `/go`.

### AUDIT-002 · Autoship skip could persist a malformed date

- **File** · `src/pages/Autoships.jsx`
- **Issue** · Advancing a plan scheduled for December 31, 9999 produced a date outside the documented four-digit year format.
- **Resolved** · The plan disables Skip when the resulting date is unsupported and explains how to recover. The write path validates the same calendar bound. Chromium verified the disabled action and that changing the date restores it.

### AUDIT-003 · Autoship product buttons missed the minimum control height

- **File** · `src/styles.css`
- **Issue** · Edit quantity and Remove product used a 36-pixel override against the 44-pixel design minimum.
- **Resolved** · Both use the shared button dimensions. Chromium measured at least 44 pixels per control and confirmed the page fit the mobile viewport.

## P2 — Minor Issues

### AUDIT-004 · Schema lacked injection and reset examples

- **File** · `SCHEMA.md`
- **Resolved** · Added API usage, reset behavior, default IDs, and a complete empty-world injection example. Documented the cumulative tax calculation.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | Pass | SHA-256 matched the template. Routes render after loading. |
| Account provider state sync | Pass | Each successful mutation wrote one full snapshot. Idle tabs, read-only actions and validation failures emitted no current-state writes. |
| `/post`, `/state`, and `/go` | Pass | Tested injection, current-state updates, diff, and reset on localhost. |
| Session isolation and baseline | Pass | SID navigation retained the session. Later writes preserved the stored initial snapshot. Reset restored current state to the baseline as specified by the shared template. |
| Injected state | Pass | Deep links rendered with empty, sparse, and 400-record collections. A mutation preserved the other large collections. |
| Offline assets | Pass | The built bundle uses system fonts and original CSS and inline icon artwork. Chromium recorded zero off-origin requests. |
| `SCHEMA.md` | Updated | Persisted keys and observable actions match the implementation. |

## SCHEMA.md Updates

Added the local API reference, deterministic seed IDs, and an injection example. Clarified cumulative return tax and the supported Autoship schedule date format.
