# Recreation.gov Mock — Audit Report

> Round 1  
> Date 2026-11-18  
> Audited by audit agent

## Summary

| Category | Found | Open |
|---|---:|---:|
| Dead handlers or stubs | 1 | 0 |
| Missing state tracking | 0 | 0 |
| Data pipeline gaps | 1 | 0 |
| Schema documentation gaps | 1 | 0 |
| Total | 3 | 0 |

## P0 — Fixed

### AUDIT-001 · Repeat claim from an injected selected application

- **Location** `src/data/domain.js`, `claimPlan`
- **Finding** A reservation could already reference the selected application through `lotteryApplicationId` while the application omitted its optional `reservationId`. A second claim could create another permit.
- **Resolution** The claim guard checks both sides of the relationship. Playwright verified that the injected application displays an unavailable message, offers no claim action, and writes no records.

## P1 — Fixed

### AUDIT-002 · Application form offered for incomplete lottery records

- **Locations** `src/lotteries.jsx` and `src/data/domain.js`
- **Finding** The application form could render with an unresolved destination when the entrance still supplied a party limit. Submission could never succeed. The form also omitted preflight validation of the application fee.
- **Resolution** The form and transaction share checks for the account, application window, duplicate applications, linked entry point, party limit, eligible dates, preference limit, and fee. The unavailable form displays the specific reason. Playwright verified the missing-destination case with zero writes and reran submission with a complete opportunity.

## P2 — Fixed

### AUDIT-003 · Verifier documentation omitted the minimal injection example

- **Resolution** `SCHEMA.md` now includes endpoint syntax, state and diff envelopes, default fixture IDs, record types, and an empty-world injection example. It documents the template's reset behavior, which restores the baseline.

## Data Pipeline Status

| Component | Status | Evidence |
|---|---|---|
| `dataManager.js` | Pass | Byte-for-byte match with the Harbor template. First load sends a baseline and cached reloads use local storage. |
| Store state sync | Pass | All five business actions use one store commit path. Successful actions call `saveState` once. Invalid actions, browsing, and an idle clock advance sent zero mutation writes. |
| `/post`, `/state`, `/go` | Pass | Shared state API. Browser writes appeared as structured records in `/go` and matched `/state`. Updating and resetting current state preserved the original baseline. |
| Session isolation | Pass | A separate session could not load the first session’s new reservation. SPA navigation and hard reloads retained the session. |
| Injected worlds | Pass | Empty arrays, partial linked records, and a catalog of 320 facilities rendered. Empty and missing-record routes also survived hard reloads at 360 px. |
| Offline assets and build | Pass | Local illustration and system fonts. Chromium reported no external requests. `npm run build` passed. |
| Schema accuracy | Pass | All seven state keys, structured record fields, and write paths are documented. |

## Design alignment

The existing account interface uses the text Recreation.gov wordmark, the original local landscape illustration, the evergreen and cream palette, serif headings, and a responsive account rail. The source review found no empty handlers, stub links, remote assets, or timer-driven state writes. Local acceptance details are in [TEST.md](TEST.md).

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Previously fixed, retested.** The injected selected application that already had a reservation showed that it could not be claimed. A valid permit claim produced its linked reservation.

Docker dynamic certification run `125084` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
