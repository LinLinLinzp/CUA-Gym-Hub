# Vimeo Mock — Audit Report

> Round 1 · 2026-11-18 · Audit agent

Round 2 Playwright verification closed AUDIT-001 and AUDIT-002. See [TEST.md](TEST.md) for the regression results.

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers and stubs | 1 |
| Missing state tracking | 1 |
| Data pipeline gaps | 0 |
| Schema mismatches remaining | 0 |
| Total | 2 |

## P0 — A queued save can disappear from Harbor

### AUDIT-001 · Reload drops a queued write after the UI reports success · Resolved on 2026-11-18

- **Files** `src/utils/stateSync.js:5`, `src/store.jsx:36`
- **Affected workflows** All persisted actions share this path.
- **Observed** Held the response to the first of two review comments after the localhost middleware saved it. The UI displayed both comments. Reloaded before releasing the first response. Both comments appeared after reload from the browser cache, but `/go` contained only the first. The browser sent just one `set_current` request.
- **Cause** The adapter waits for the previous response before issuing the next fetch. The store updates the UI and reports success before the queued fetch starts. The queue belongs to the old document and can disappear on reload. The shared loader restores the local cache on reload.
- **Fix** Preserve write ordering and ensure any action reported as saved has reached the server. Either recover outstanding writes across document reloads or keep the UI in a pending state until persistence is acknowledged and handle failures visibly. Keep both shared templates unchanged. Verify the final state through `/go` after a reload while a previous response is delayed.

## P1 — Incomplete Features

### AUDIT-002 · An injected timestamp and the timeline disagree when duration is omitted

- **File** `src/pages/Video.jsx:165`
- **Affected workflow** Timestamped review feedback on an injected video with a still preview and an omitted `durationSeconds`.
- **Observed** Injected an open comment at 45 seconds. Clicking its timecode displayed `0:45` as elapsed. The slider stayed disabled at zero, the marker was missing, and Add timestamp was disabled.
- **Fix** Use finite comment anchors to establish a scrub range when both media duration and stored duration are missing. Keep the unknown video duration distinguishable from that range. Selecting a comment should align the elapsed display, marker, slider position, and timestamp composer.

## P2 — Minor Issues

None verified.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| Shared state manager | Pass | SHA-256 matches `templates/dataManager.js`. Boot awaits the loader before routes render. |
| Store and server sync | Open P0 | Normal workflows saved complete snapshots and structured events. The app-side queue can lose a write on reload. |
| Vite `/post` and `/state` | Pass | Verified injection, initial baseline preservation, current updates, and reset with the shared handler. |
| Vite `/go` | Pass | Returns initial and current state plus top-level diffs. All standard workflow changes were observable. |
| Session isolation and idle behavior | Pass | Fresh test sessions were isolated. No idle or cached-reload writes were observed. The upload metadata timeout only runs during a user-initiated upload. |
| Injected worlds | Open P1 | Empty, partial, and 360-video worlds rendered. The partial review date and author fallbacks rendered. An omitted duration with an existing anchor exposed AUDIT-002. |
| Build and assets | Pass | `npm run build` succeeded. The workflow run used system fonts and local media and emitted no off-origin requests. The implementation uses the original studio-catalog design and text branding. |
| Schema | Updated | Added endpoint examples, default IDs, an injection example, and the observed save limitation. |

## Verification

- The existing Playwright suite passed on localhost port 5360. It covered video upload, editing and cascading deletion, showcase creation and membership, both Share panels, review comments and thread status, and the injected-state smoke checks.
- `tests/test_audit_edges.mjs` reproduced both findings in Chromium and confirmed the Harbor baseline reset. The runner uses the installed Playwright package.
- Docker certification remains with the parent runner.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Previously fixed, retested.** The browser suite recovered pending feedback from Harbor after reload. It also verified that a rejected save retained the draft and succeeded on retry.

Docker dynamic certification run `125084` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
