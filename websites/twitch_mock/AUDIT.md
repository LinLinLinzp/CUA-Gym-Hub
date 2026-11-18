# Twitch Mock — Audit Report

> Round 1 · November 18, 2026 · Audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers or stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 1 |
| Incomplete UI behavior | 2 |
| Open schema mismatches | 0 |
| Total | 3 |

## P0 — State can disappear from Harbor

### AUDIT-001 · Reload can discard an acknowledged save · Resolved on 2026-11-18

- **Files** [src/utils/statePosts.js](src/utils/statePosts.js#L17) and [src/workspace.jsx](src/workspace.jsx#L32)
- **Reproduction** On Stream Settings, save one title. Let the server accept its POST and hold the response in Playwright. Save a second title while the first response is pending, wait for “Stream info saved,” and reload before releasing the first response.
- **Observed** The reloaded UI showed the second title from local storage. Only the first POST reached localhost. `/go` retained the first title and one `update_stream_info` event. The second request was waiting in the previous page’s in-memory queue.
- **Fix** Ensure the newest user save reaches Harbor across a reload, or keep a durable record of unacknowledged saves and recover it without replaying acknowledged snapshots. Keep both Harbor templates unchanged and preserve ordered requests and zero writes from idle or ordinary reloads. Add a regression that asserts the second title and both events in `/go` after reload.

## P1 — Incomplete UI behavior

### AUDIT-002 · Expired timeout leaves an action that no longer works

- **File** [src/pages/Moderation.jsx](src/pages/Moderation.jsx#L94)
- **Reproduction** Open a viewer with an active one-second timeout. Move the browser clock beyond the expiry and click **Remove Timeout** without navigating or changing filters.
- **Observed** The command skipped the expired restriction and wrote no moderation action. The card still displayed **Timed out** and **Remove Timeout** until typing into viewer search rerendered it.
- **Fix** Refresh the displayed restriction and filter results when expiry makes the command stale. Keep expiry derived from the clock and leave persisted restrictions and moderation history untouched.

### AUDIT-003 · Overview misses upcoming streams outside its 62-day range

- **File** [src/pages/Stream.jsx](src/pages/Stream.jsx#L161)
- **Reproduction** Inject a singleton `scheduleEntries` array with a scheduled stream 90 days in the future and open Overview.
- **Observed** The record appeared in `/go` while the card displayed “No upcoming streams.”
- **Fix** Select the earliest eligible future occurrence from the actual entries, accounting for recurrence, cancelled occurrences, and vacation. Cover a distant one-time stream and a weekly series with a future start.

## P2 — Minor issues

None.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | Pass | SHA-256 matched the unchanged template. |
| Workspace state sync | Open P0 | All ordinary mutations saved structured records. A delayed response plus reload reproduced AUDIT-001. |
| Vite `/state`, `/post`, `/go` | Pass | The unchanged template handled injected worlds and returned all three `/go` keys. |
| Session isolation | Pass | Four distinct workflow sessions kept separate snapshots. |
| Initial snapshot and reset | Pass | `set_current` kept the initial snapshot and `reset` restored the server current snapshot to it. |
| Idle and offline behavior | Pass | Both suites observed zero additional POSTs over six seconds of idle and zero external requests. Source inspection found no timer-driven writes. |
| Injected rendering | Pass with open P1 | Empty, singleton, sparse and large fixtures rendered without errors. A valid distant schedule row reproduced AUDIT-003. |
| Design and assets | Pass | The type and core palette match the design. The Twitch text wordmark, synthetic account and local CSS cover artwork appear in a distinct editorial layout. |
| Production build | Pass | `npm run build` passed. Playwright passed using built assets and the local Harbor API on port 5359. Docker certification remains with the parent runner. |

## SCHEMA.md Updates

Added the localhost endpoints, reset behavior, key types, seeded IDs and a singleton injection example. Reviewed the observable state mappings against the store, routes and browser results.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Fixed and retested.** The delayed first server response showed no early confirmation. After both successful stream title changes, a hard reload preserved the second title and both audit events.

Docker dynamic certification run `175552` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
