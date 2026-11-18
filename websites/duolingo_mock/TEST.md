# Duolingo Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5369  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested | 6 |
| Elements tested (grouped checks below) | 13 |
| ✅ Passed | 13 |
| ❌ Failed | 0 |
| ⚠️ Skipped (out of scope) | 0 |

Chromium used the installed Node Playwright from `PILOT_PLAYWRIGHT` with the browser clock fixed to 2026-11-18 17:00 UTC. The workflow suite ran against the Vite dev server. The audit regressions loaded the generated `dist` assets at the same localhost origin and used the listener's state API.

## ✅ Passing Tests

### SEED workflows and persisted state via `/go`

Each successful mutation posted one full snapshot. The suite compared each snapshot with the preceding `/go.current_state`, checked which top-level keys changed, and verified `/go.state_diff` against the original baseline. It also checked `/state.stored_state` against `/go.current_state`.

| Workflow | Browser interaction and exact state fields checked |
| --- | --- |
| Courses · search, add and switch | Searched by language code and name, filtered by enrollment, sorted by popularity, added Korean, and switched to Spanish. Adding changed `profile.activeCourseId` and created an `enrollments[]` record with `id`, `actorId`, `courseId`, `run`, `status`, `xp`, `lessonsCompleted`, `createdAt`, `updatedAt`, and `removedAt`. Both actions appended a `courseEvents[]` record with `id`, `actorId`, `createdAt`, `type`, `courseId`, `enrollmentId`, `run`, `previousActiveCourseId`, and `activeCourseId`. Switching left enrollments intact. |
| Courses · remove and re-add | Canceled removal, then confirmed removal of Spanish. Verified `enrollments[].status`, `xp`, `lessonsCompleted`, and `removedAt`, the French fallback in `profile.activeCourseId`, and a linked `courseEvents[]` removal. Re-add kept the enrollment `id` and `createdAt`, incremented `run`, set `status` to enrolled, cleared `removedAt`, and restarted at 0 XP and Unit 1. The previous attempt stayed in history. |
| Courses · complete a lesson | Checked a correct answer and finished Spanish Unit 3. Verified `lessonAttempts[].id`, `actorId`, `courseId`, `lessonId`, `enrollmentId`, `run`, `status`, `xp`, `perfect`, and `createdAt`. Verified the increment to `enrollments[].xp` and `lessonsCompleted`, and the new `updatedAt`. Two immediate finish clicks produced one attempt. Next lesson and reload opened Unit 4. An injected lesson exercised incorrect-answer feedback, `perfect: false`, and the exhausted course state. |
| Goals · create, edit, track and archive | Rejected blank names and fractional targets. Created a trimmed daily XP goal and edited it to a weekly lessons goal. Verified `goals[].id`, `actorId`, `label`, `metric`, `cadence`, `target`, `status`, `createdAt`, `updatedAt`, and `archivedAt`, plus linked `goalEvents[]` entries for created, updated, and archived. A finished lesson appended `goalProgress[]` with `id`, `actorId`, `goalId`, `lessonAttemptId`, `metric`, `amount`, and `createdAt`. Checked historical, Completed, and Archived views, cancellation and focus return, and progress retention after archive. |
| Friends Quests · join and nudge | Searched by name and username, canceled a selection, paired with Liam, and sent a preset nudge. Verified `friendQuests[].partnerId`, `status`, and `joinedAt`, and fields `id`, `questId`, `actorId`, `partnerId`, `type`, `amount`, and `createdAt` on the joined `questEvents[]` entry. Verified `questNudges[].id`, `questId`, `actorId`, `recipientId`, `messageKey`, `message`, `status`, and `createdAt`. The nudge appeared in the challenge and Overview. |
| Friends Quests · contribute, complete and claim | One lesson completed both an XP quest and the joined lessons quest. Verified `questContributions[].id`, `questId`, `actorId`, `lessonAttemptId`, `metric`, `amount`, and `createdAt`. In the same save, both quests received `status: completed` and `completedAt`, with linked completed events. Claim set `friendQuests[].status` to claimed and set `claimedAt`, added 20 to `profile.gems`, and appended exactly one `questEvents[]` reward_claimed record with `amount: 20`. Repeated click and hard reload preserved the single payout. |

### Route and Harbor checks

- **Overview, Courses, Goals, Friends Quests and Learn.** Checked direct loads, SPA tabs, the wordmark, summary and activity links, enrolled course chips, and lesson navigation. An unknown route linked back to Overview. SPA links preserved the SID.
- **Injected worlds.** Used separate SIDs for empty collections, a minimal state with missing optional values and stale IDs, and 135-row catalogs and histories. Verified isolation, search, empty states, fallback rendering, and preservation of an extra injected key through a save.
- **Read-only interactions and offline loading.** Filters, dialogs canceled before submission, identical goal edits, practice answer selection, and an idle same-SID tab issued zero additional POSTs. Recorded zero off-origin browser requests and zero uncaught browser errors.
- **Build and API.** `npm run build` passed. The generated assets used the local state API. Verified repeated `set`, `set_current`, session isolation, and reset to the initial baseline. The site's data manager matched the shared template byte for byte.

### Audit regression checks

- **AUDIT-001.** Held the baseline POST while opening Courses. The loading state persisted until the baseline responded. After enrollment, `/go.initial_state` retained the original profile and `/go.current_state` contained the new Korean enrollment, event, and active-course ID.
- **AUDIT-002.** Expired quests with the partner and nudge dialogs open. Both submissions displayed feedback, closed the dialog, and moved the quest to ended history. `/go` was unchanged.
- **AUDIT-003.** A daily goal created November 18 was absent from the November 16 period and returned with Current period. Both date changes preserved `/go`.

## ❌ Bugs for Dev Agent

No open bugs from this round.

## Visual Alignment Feedback

Reviewed screenshots of all five primary views at 1280 px and 360 px against `DESIGN.md`. The Duolingo text wordmark, notebook illustration, course catalog, goal rows, quest cards, and practice controls were legible at both widths. No route overflowed horizontally. Screenshots and runners are in the Git-ignored `test-results/` directory.

## Round History

### Round 1 → Round 2
- AUDIT-001 · Fixed and retested.
- AUDIT-002 · Fixed and retested for partner selection and nudges.
- AUDIT-003 · Fixed and retested.

TEST COMPLETE: duolingo_mock — PASS ✅

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `178052`. The local evidence is `factory/build/dyn_certify/178052/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `courses → 0 → name`.
