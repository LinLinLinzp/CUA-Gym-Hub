# Duolingo Mock — Audit Report

> Round 1  
> Date 2026-11-18  
> Audited by the audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers / stubs | 1 |
| Missing state tracking | 0 |
| Data pipeline gaps | 1 |
| Schema mismatches | 0 |
| Historical display | 1 |
| Total | 3 |

The standard Playwright suite passed for Courses, Goals, and Friends Quests. Production assets built successfully. Separate Chromium probes exercised those assets against the localhost state API and reproduced the issues below.

## P0 — Dead or broken code

### AUDIT-001 · A delayed boot POST can overwrite a successful first action · Resolved on 2026-11-18

- **Files** `src/account.jsx:17`, `src/utils/dataManager.js:40`, and `../../templates/state-api.js:67`.
- **Reproduce** With a fresh SID, hold the app's boot POST with action `set`. Add Korean on Courses and wait for `set_current` to succeed. Release the held POST and read `/go`.
- **Observed** After the first response, `current_state.profile.activeCourseId` was `course-ko`. After the baseline response, it was `course-es` while the browser still displayed Korean. The first user mutation became `initial_state`, and the late baseline replaced its enrollment and course event in current state.
- **Fix** Ensure the initial baseline is acknowledged before the site enables business actions. Add a regression case that delays the baseline and verifies that the original initial snapshot and the user's latest current snapshot survive. Preserve the site's required byte-for-byte template copy and coordinate any shared transport changes with the template owner.

## P1 — Incomplete features

### AUDIT-002 · Partner save silently fails across quest expiry

- **Files** `src/pages/FriendsQuests.jsx:160` and `src/actions.js:121`.
- **Reproduce** Open a date-bounded available quest, select an eligible partner, advance the clock beyond `endsAt`, and click Save partner.
- **Observed** The action correctly rejects the expired join and writes no event. The dialog stays open with its save button enabled and gives no feedback. The nudge dialog uses the same silent rejection pattern.
- **Fix** On an expired submission, show why the action is unavailable and refresh the underlying quest view so the ended state is visible.

### AUDIT-003 · Historical Goals view includes goals created after the selected period

- **Files** `src/model.js:69` and `src/pages/Goals.jsx:60`.
- **Reproduce** On November 18, create a daily goal named “Created on November 18” and select November 16 as the period date.
- **Observed** The new goal appears as Active for November 16. When no settings event predates the selected period end, the snapshot falls back to the current goal even if its creation date confirms it did not exist then.
- **Fix** Exclude goals whose known creation date is at or after the selected period end. Preserve display fallbacks in injected worlds with no creation date.

## P2 — Minor issues

None found.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| dataManager.js | Open | Byte-for-byte stock template. Boot baseline acknowledgement is covered by AUDIT-001. |
| Account state sync | Open | Normal accepted mutations send one full snapshot. Lesson, goal, and quest records share one snapshot. AUDIT-001 affects the first action when requests arrive out of order. |
| Vite /post, /state, and /go | Verified | Tested session reads, injection, repeat `set`, `set_current`, baseline reset, and top-level diff. Reset restores the initial snapshot under the Harbor template. |
| Session isolation and navigation | Verified | Separate SIDs stayed isolated. SPA links preserved the query string. Direct loads and reloads passed. |
| Initial snapshot | Open | Preserved through ordinary updates. Late boot POST exposed AUDIT-001. |
| Injected state | Verified | Empty, minimal, and 135-row collections rendered. Tested missing optional fields, stale references, and preservation of an extra injected key. |
| Idle behavior | Verified | A cached idle tab issued zero writes. The notice timer only dismisses transient feedback. |
| Offline assets and design | Verified | No off-origin browser requests. The plum and cream design uses the Duolingo text wordmark, an original CSS notebook illustration, and synthetic fixtures. |
| SCHEMA.md | Updated | Documented all 14 keys and linked business records. |

## SCHEMA.md Updates

Added API examples, default IDs, a minimal injection, and field paths for each observable business action. Docker certification is handled by the parent runner.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Previously fixed, retested.** Chromium delayed the baseline before enrolling in a course and verified that the original Harbor snapshot stayed intact.

Docker dynamic certification run `154644` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
