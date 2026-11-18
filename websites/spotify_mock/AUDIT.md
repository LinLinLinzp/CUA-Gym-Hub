# Spotify Mock — Audit Report

> Round: 1  
> Date: 2026-11-18  
> Audited by: audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers / stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 1 |
| Schema mismatches | 0 |
| Workflow and design alignment | 2 |
| Total | 3 |

## P0 — Dead/Broken Code

### AUDIT-001 · Out-of-order saves erase a successful playlist edit

- **Files** `src/store.jsx:16`, `src/utils/dataManager.js:64`
- **Issue** The store computes each mutation from the latest client state, then starts a full-state POST without waiting for the preceding POST to finish. Harbor applies snapshots in arrival order.
- **Reproduction** In Chromium, hold the first `set_current` request while adding two different tracks from the Add tracks dialog. Let the second request complete, then release the first request. Both return HTTP 200. The UI marks both tracks as added, but `/go` regresses from 122 to 121 playlist items. Reproduced on dev and built preview.
- **Fix** Ensure the application serializes full-state write delivery in user action order. Preserve the required template files byte for byte, keep one snapshot per successful mutation and retain idle behavior. Verify that after both adds finish, `current_state.playlistItems` contains both new item IDs and `initial_state` is unchanged.

## P1 — Incomplete Features

### AUDIT-002 · The default incoming invitation has a one-week calendar window

- **Files** `src/data/seed.js:147`, `src/data/model.js:36`, `src/collection.jsx:29`
- **Issue** The only joinable incoming seed invite expires on November 22, 2026 at 12:00 UTC. At a browser clock of November 23, the default library has no pending invitation and the direct invitation URL offers no Join playlist action. Reproduced on dev and built preview. The standard suite uses a fixed November 18 clock, which keeps the seeded invite joinable during that run.
- **Fix** Keep a joinable incoming fixture throughout the supported runtime dates while keeping seed values deterministic. Preserve the seven-day calculation for new user-generated invitations and the separate expired and revoked fixtures.

### AUDIT-003 · Shared typography differs from the design specification

- **File** `src/styles.css:32`, `src/styles.css:52`, `src/styles.css:86`
- **Issue** The base section heading uses 27px against the specified 26px. The Spotify wordmark uses weight 790 and tracking −0.055em against 750 and −0.035em. Metadata uses 450 against 400. The core palette, gutters, collection rail and dialog elevation match the design.
- **Fix** Align the shared typography declarations with the specified tokens and check the masthead and collection at desktop and mobile widths.

## P2 — Minor Issues

None.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | ✅ | Byte-for-byte template copy. |
| Store state sync | ⚠️ | Normal mutations persist structured records. Delayed delivery can overwrite a newer full snapshot, as shown in AUDIT-001. |
| Vite `/post` | ✅ | Standard template handles injection, baseline and user writes in dev and preview. |
| Vite `/state` and `/go` | ✅ | Observed current state and top-level diff for all four workflows. |
| Session isolation | ✅ | Separate test SIDs stayed isolated and navigation retained the SID. |
| Baseline handling | ✅ | Delaying the baseline kept the loading view visible. The original baseline survived the first edit. |
| Idle behavior | ✅ | Same-SID idle tab emitted no business writes. Source scan found no timer-driven mutations. |
| Injection and offline rendering | ✅ | Empty and incomplete records, duplicate item IDs, 431 tracks and deep-link reloads passed. Chromium requested only localhost resources. The text masthead and bundled cover artwork implement the site's original account design. |
| `SCHEMA.md` accuracy | ✅ | All top-level keys and business mutations are documented. |

`npm run build` and the existing Chromium workflow suite passed in development and built preview on port 5355. Targeted Chromium checks reproduced AUDIT-001 and AUDIT-002 on both servers. Docker dynamic certification is assigned to the parent runner.

## SCHEMA.md Updates

Added the endpoint summary, verified seed IDs and a minimal injected world. Retained the record shapes and mutation table and named the template's reset behavior.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Fixed and retested.** Chromium delayed the first track-add POST and clicked two distinct tracks. No second POST overtook the first; Harbor retained both track IDs and the original baseline. Playlist, collaboration and saved-library workflows passed.

Docker dynamic certification run `135192` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
