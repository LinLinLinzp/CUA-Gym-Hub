# KAYAK Account — Audit Report

> Round 1 · 2026-11-18 · Audit agent

Round 2 resolved AUDIT-001. Chromium verified that the complete 7,000-character note persisted through `/go` in both the multibyte and ASCII cases. See [TEST.md](TEST.md) for the retest results.

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers or stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 1 |
| Open schema mismatches | 0 |
| Total | 1 |

## P0 — Dead or broken code

### AUDIT-001 · Multibyte notes can be saved locally and lost on the server · Resolved on 2026-11-18

- **Files** `src/utils/dataManager.js:64`, `src/utils/stateTransport.js:12`, `src/store.jsx:21`
- **Reproduction** Open the seeded `booking_001` receipt in a fresh Chromium session on localhost. Edit its notes to 7,000 repetitions of `旅` and save. The app displayed “Booking notes saved.” and cached all 7,000 characters. The receipt in `/go` retained its original 37-character note and `state_diff` stayed empty. The same action with 7,000 ASCII characters persisted and appeared under `state_diff.bookings`.
- **Cause** The state helper enables keepalive below 60,000 JavaScript code units. The failing request contained 59,189 code units but occupied 73,231 UTF-8 bytes, exceeding Chromium's 64 KiB keepalive budget. The site transport forwards that option unchanged. The helper catches the rejected fetch and the store has already announced success.
- **Fix** In the site transport, measure the encoded body size and turn off keepalive above the byte threshold. Keep the shared templates intact and preserve serial delivery. Recheck both notes saves with fresh session IDs and require `/go` to contain the full notes and updated actor and timestamp.

## P1 — Incomplete features

None found.

## P2 — Minor issues

None found.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | Pass | Byte-for-byte match with the Harbor template. Boot awaits state before rendering routes. |
| Account store and state transport | Fail | One centralized snapshot per successful mutation. The multibyte keepalive failure leaves the server stale. |
| Vite `/state`, `/post` and `/go` | Pass | Shared plugin in dev and built preview. Direct checks verified the diff, reset and session isolation. |
| Initial snapshot | Pass | Updating current state preserved the initial snapshot. Reset restored it and cleared the diff. |
| Injected state and navigation | Pass | Empty, sparse and 350-record arrays rendered. Deep links, hard reload, session query retention and an injected actor passed. |
| Idle writes and assets | Pass | The Chromium suite observed one baseline for a fresh session and zero idle business writes. Browser requests used localhost. Assets and fonts are local CSS or system resources. |
| Seed and UI | Pass | Confirmed 24 trips, 48 itinerary items, 30 alerts and 36 bookings. The designed account shell uses a text wordmark and original CSS artwork. Required controls are wired. |
| Build | Pass | `npm run build` and the built-preview booking save passed. Vite reported a future config loader compatibility warning for the shared template. |
| `SCHEMA.md` | Pass | Lists persisted fields and the observable footprint of each supported action. |

## SCHEMA.md Updates

Documented the API endpoints and reset behavior, the fixed seed IDs, a sparse injection example, and the notes action for both booking sources.

## Verification

Reran the existing localhost Chromium suite for trip planning, price alerts, bookings and Harbor state behavior. The trip deletion test observed one write that deleted the trip, removed its active manual items and unlinked its bookings. Alert tests verified lifecycle changes and derived expiration. The bookings tests verified receipt notes, manual reservation lifecycle and moving and unlinking assignments. The built-preview test observed a booking note change through the standard state API. Docker dynamic certification is owned by the parent runner.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Previously fixed, retested.** The targeted UTF-8 replay sent a 73,231-byte snapshot. Harbor and the browser retained the complete 7,000-character note.

Docker dynamic certification run `154644` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
