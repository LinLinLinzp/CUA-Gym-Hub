# Blackboard Mock — Audit Report

> Round: 1  
> Date: 2026-11-18  
> Audited by: audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers / stubs | 0 |
| Missing state tracking on wired actions | 0 |
| Data pipeline gaps | 1 |
| Schema mismatches after update | 0 |
| Incomplete workflows or invalid fixtures | 2 |
| Total | 3 |

## P0 — Dead/Broken Code

### AUDIT-001 · A delayed baseline can erase the first user action

- **Files** `src/store.jsx:14`, `src/utils/dataManager.js:56`, and `templates/state-api.js` in the shared repository.
- **Reproduction** Open Environmental Policy in a fresh localhost session. In Playwright, hold the boot `POST /post` with `action: "set"`, allow the workspace to render, then click the favorite toggle. Wait for `set_current` and confirm `/go` shows one activity. Release the original `set`.
- **Observed** The server's `current_state.activity` returned to zero while the UI still showed the course as unfavorited. The first mutation had already become the recorded initial state, so the late baseline also inverted the expected diff.
- **Fix** Coordinate with the shared Harbor owner so the initial baseline completes before business actions can be saved. The shared loader currently returns after starting the baseline request. Keep the site's data manager byte-for-byte identical to the approved template. Repeat the throttled test and verify the baseline contains zero activities while current state retains the favorite change and its activity.

## P1 — Incomplete Features

### AUDIT-002 · Seeded posted scores exceed the item maximum

- **Files** `src/data/seed.js:107` and `src/grades.jsx:115`.
- **Reproduction** In Environmental Policy's Grade Center, filter to Samir Hassan and Policy Brief. The seeded cell shows 106 of 100 and Posted. Open it, change only Feedback, and select Save grade.
- **Observed** The editor rejects the unchanged score and writes no update. A fixture-wide check found 136 of 405 grades above their linked item's `pointsPossible`. Positions 3 and 4 apply factors of 1.06 and 1.14 to seeded posted grades.
- **Fix** Generate scores between zero and the item maximum while preserving fixture ids and status distribution. Verify the fixture range and confirm a feedback-only edit keeps the seeded posted status and posting metadata.

### AUDIT-003 · Scheduling silently shifts a nonexistent local time

- **File** `src/announcements.jsx:18`.
- **Reproduction** Use Chromium in `America/New_York` with the browser clock fixed to November 18, 2026. Compose an announcement and schedule publication for March 14, 2027 at 02:30 local time.
- **Observed** The composer accepted the skipped hour and persisted `2027-03-14T07:30:00.000Z`, which displays as 03:30 local time. The optional hide field uses the same conversion.
- **Fix** Validate the entered local date and time against the converted instant's local components. Show a field error for a skipped local time and keep the editor open without a write. Cover both publication and hide times.

## P2 — Minor Issues

None found.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | ⚠️ | Matches the shared template by SHA-256. Baseline completion race reproduced in AUDIT-001. |
| Store state sync | ⚠️ | The normal workflow run recorded one baseline and 22 structured mutation POSTs. All domain writes pass through the store. AUDIT-001 affects the first action when requests arrive out of order. |
| Vite `/post` and `/state` | ✅ | JSON injection, current-state readback, and reset to the stored baseline passed on port 5433. |
| Vite `/go` | ✅ | Normal writes exposed the expected initial state, current state, and top-level diff. |
| Session isolation and idle behavior | ✅ | A mutation in one session left a separate session unchanged. Reloads and a second idle tab issued no additional writes. Schedule display transitions issued no writes. |
| Initial state handling | ⚠️ | An existing baseline survives later writes. A first `set_current` can become the initial state when it overtakes boot initialization. |
| Injected worlds and routing | ✅ | Empty and sparse worlds, 260 courses, 244 enrolled students in one course, and 306 announcements rendered. Deep links and hard reloads retained the session. A write preserved the injected actor and unknown key. |
| Offline assets and build | ✅ | The production build passed. Chromium reported no external requests or page errors in the two existing suites. The original ivory and graphite workspace uses text branding, system fonts, and local CSS artwork. |
| `SCHEMA.md` | ✅ | Top-level keys, action fields, and activity details match the source and normal observed writes. |

## SCHEMA.md Updates

Added the localhost endpoints, reset semantics, verified default ids, and a minimal injected world. Clarified nullable manual-item due dates and retained the per-action verifier field mapping.
