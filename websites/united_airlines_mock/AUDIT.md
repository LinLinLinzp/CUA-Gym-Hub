# United Airlines Mock — Audit Report

> Round 1  
> Date 2026-11-18  
> Audited by audit agent

## Summary

| Category | Found | Fixed | Open |
| --- | ---: | ---: | ---: |
| Dead handlers / stubs | 0 | 0 | 0 |
| Missing state tracking | 0 | 0 | 0 |
| Data pipeline gaps | 0 | 0 | 0 |
| Schema documentation | 1 | 1 | 0 |
| Workflow and design gaps | 3 | 3 | 0 |
| Total | 4 | 4 | 0 |

## P0 — Dead/Broken Code

None found.

## P1 — Incomplete Features

### AUDIT-001 · Missing-miles requests depended on an undisclosed ticket number

- **Files** `src/pages/Trips.jsx`, `src/pages/Mileage.jsx`
- **Issue** A request required a 13-digit number that was absent from the itinerary.
- **Fixed** Trip details now list ticket numbers under Travelers, and the request form points to that section. A missing optional number has a fallback. Chromium submitted a valid request using the number read from the trip UI.

### AUDIT-002 · Seeded redemption preceded credit issuance

- **File** `src/data/seed.js`
- **Issue** The history for `cr-003` showed a redemption for `bkg-019` before the credit existed.
- **Fixed** The fixture issues the credit one week before the booking that redeems it. The IDs, expiry and amounts are unchanged.

### AUDIT-003 · Tablet panels and phone seat map

- **File** `src/styles.css`
- **Issue** Content panels remained side by side below the documented 860 px threshold. Phones just above 400 px needed to scroll the seat map even though the compact spacing fit.
- **Fixed** Content panels stack below 860 px, and compact seat spacing applies through 445 px. Chromium verified stacking at 768 px and six visible 44 px seat columns without horizontal scrolling at 414 px.

## P2 — Minor Issues

### AUDIT-004 · Verifier setup details missing from the schema

- **File** `SCHEMA.md`
- **Fixed** Added endpoint usage, default IDs, and a minimal injectable world. Reconciled the read-only ticket display and confirmed mutation table against the implementation.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | Pass | SHA-256 matches the shared template. |
| Store state sync | Pass | One whole-state `set_current` per accepted mutation. Idle views, drafts, and rejections wrote no mutations. |
| Vite `/state` and `/post` | Pass | The shared API loaded injected worlds, accepted writes, and restored the initial snapshot on reset. |
| Vite `/go` | Pass | Each confirmed action changed exactly its documented top-level keys, with linked and structured records. |
| Session isolation and initial snapshot | Pass | A second session retained the seed. Both repeated `set` and `set_current` preserved the first snapshot. |
| Offline and injected rendering | Pass | No external requests or page exceptions in the Chromium suite. Empty, partial, and large worlds rendered, including deep-link reloads. |
| `SCHEMA.md` | Pass | The ten state keys, record shapes, and mutation footprints match the code. |

## SCHEMA.md Updates

The endpoint guide, default identifiers, and empty-world injection example are now in [SCHEMA.md](SCHEMA.md). Browser results are in [TEST.md](TEST.md). Docker dynamic certification is pending the parent runner.
