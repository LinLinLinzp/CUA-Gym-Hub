# Duolingo — TODO

> Status: IMPLEMENTED AND BROWSER VERIFIED  
> Last updated by the plan agent on 2026-11-18  
> See [DESIGN.md](DESIGN.md), [research](assets/README.md), and [data model](assets/data_model.md).

## Status legend

- [ ] Not started
- [~] In progress
- [x] Done

## P0 — Account shell and runtime

- [x] **Scaffold and serve.** Build a Vite + React SPA with React Router, a local lockfile, and offline assets. Bind Vite to localhost port `5369` with `strictPort: true`. Import `stateApi(createInitialData)` from the unchanged root `templates/state-api.js` in `vite.config.js`. Copy root `templates/dataManager.js` unchanged to `src/utils/dataManager.js`. Set the document title and plain-text wordmark to `Duolingo`. Follow the root Harbor contract.
- [x] **Layout and routing.** Build the account shell defined in DESIGN.md with Overview (`/`), Courses (`/courses`), Goals (`/goals`), and Friends Quests (`/friends-quests`). Give `Learn` at `/learn` a route from the active course. Keep `?sid=` across SPA navigation and use `withSid()` for internal links outside the router. Place every route within the providers it uses. Support direct loads and reloads on all routes. Give an unknown route a clear link back to Overview.
- [x] **Harbor store.** Define deterministic defaults in `src/data/seed.js`. Await `loadState(APP, createInitialData)` before rendering any route, with one boot invocation and a neutral loading state. Centralize `saveState(APP, nextState)` with one whole-state save per successful business action, including cross-workflow updates in the same snapshot. Preserve unknown injected keys. Use frontend fallbacks for missing optional fields, stale references, and empty collections without repairing the state on boot. Filter, navigate, preview, and cancel without writes. Read back the template's `/state` and `/go` and exercise separate `sid` values. No idle saves or remote requests.
- [x] **Verifier handoff.** Write implementation `SCHEMA.md` with every top-level key and record type and an Observable State Changes table with the exact fields each action writes. Match the schema to implementation, including the cross-workflow lesson action and no-op cases. Pass `npm run build` and verify the built output against the state API. The parent runner handles Docker dynamic certification and commits.

## P1 — Seed workflows

- [x] **Courses — browse, add, switch, and remove.** Show current course, other enrolled courses, and a catalog with search by course or language, an enrollment filter, and alphabetical or popularity sorting. Offer `Add course` on unenrolled entries and `Switch course` on other enrolled entries. Enrollment creates or reactivates `enrollments[]` with zero progress, sets `profile.activeCourseId`, and appends an `enrolled` event to `courseEvents[]`. Switching updates `profile.activeCourseId` and appends a `switched` event. `Remove course` opens a named confirmation with the effect on progress. Confirming sets the enrollment to `removed`, clears current enrollment progress, appends a `removed` event, and picks a remaining active course or `null`. Show a first-course empty state. Re-adding must not restore previous progress. See the [data model](assets/data_model.md#courses).
- [x] **Courses — complete a lesson.** `Continue learning` opens the active course's next unit and a short original practice exercise. Show answer feedback and a summary with `Finish lesson`. Only the finish action appends a `lessonAttempts[]` record and increments `enrollments[].xp` and `lessonsCompleted`. It also appends qualifying rows to `goalProgress[]` and `questContributions[]` and updates any newly completed quest in the same save. A lesson is identified by its stable lesson ID plus the enrollment's current run, so repeated clicks and reloads cannot award it twice. Offer a clear next step when there is no active enrollment or the course is finished. See [lesson completion](assets/data_model.md#lesson-completion).
- [x] **Goals — create, edit, track, and archive.** Show active goals above history, with search and All, Active, Completed, and Archived filters. `New goal` and `Edit goal` expose a label, XP or Lessons metric, Daily or Weekly cadence, and a positive whole-number target. Save adds or updates a `goals[]` record and appends a `created` or `updated` entry to `goalEvents[]`. Progress is attributed through `goalProgress[]` rows on lesson finish and grouped by the goal's current period. Archive requires confirmation and sets `goals[].status` to `archived`, records `archivedAt`, and appends an `archived` event. Preserve earlier progress rows. Show the selected period and the numeric progress against the target. See the [data model](assets/data_model.md#goals).
- [x] **Friends Quests — choose a partner and join.** Show an active shared challenge with this account's and the partner's contributions, plus ready-to-join cards and searchable history with status filters. For an available challenge, `Choose partner` opens a searchable list of eligible friends. Save pairs an eligible friend, updates `friendQuests[].partnerId`, `status`, and `joinedAt`, and appends a `joined` record to `questEvents[]`. Prevent duplicate participation and explain an empty eligible list. Show expired challenges as unavailable from their date at render time. See the [data model](assets/data_model.md#friends-quests).
- [x] **Friends Quests — contribute, nudge, and claim.** A qualifying finished lesson appends a `questContributions[]` row linked to the quest and attempt. When contributions meet the target, the same save sets `friendQuests[].status` to `completed`, records `completedAt`, and appends a `completed` event to `questEvents[]`. `Send nudge` opens a chooser of original preset messages and appends `questNudges[]` on confirmation. `Claim reward` awards the displayed gems once by updating the quest to `claimed`, stamping `claimedAt`, incrementing `profile.gems`, and appending `reward_claimed` to `questEvents[]`. Each action updates the originating view and the Overview immediately. See the [data model](assets/data_model.md#friends-quests).

## P2 — Account history

- [x] Use recent lesson completions and course, goal, and quest events to fill the Overview's recent activity list. Link each item to its feature view. Hide the list when there is no activity. Reading activity adds no records.

## Data seed

- [x] Seed 36 catalog courses for English-speaking learners, four current enrollments and two previously removed, and four short original lessons per course. Use clearly distinct names, language families and popularity values, and deep enough progress to exercise add, switch and remove.
- [x] Seed 24 goals, 36 lesson attempts, and at least 36 goal progress rows. Include current and prior periods, daily and weekly targets, multiple metrics, and completed and archived histories.
- [x] Seed 28 friends and 26 Friends Quests including an in-progress quest, available challenges, claimable rewards, and ended historical quests. Include 40+ contributions and at least a dozen nudges. Match references and dates and include metrics for XP, lessons, and perfect lessons. See the [data model](assets/data_model.md#seed-fixtures) for date handling.

## Acceptance for the Playwright phase

- [x] Using the installed Node Playwright from `PILOT_PLAYWRIGHT` and Chromium, run against localhost port `5369`. Use hidden `Start-Process` with an absolute Vite entry point if a persistent listener is needed. Save scratch files in a Git-ignored location within the site or remove them after the run.
- [x] Record each SEED workflow in `TEST.md` with the exact state fields checked. Courses should cover searching, enrolling, switching, finishing a lesson, confirming removal, and re-adding with clean progress. Goals should cover creating, editing, lesson progress, filtering, and archiving. Friends Quests should cover pairing from a searchable roster, sending a nudge, contributing via a lesson, reaching the target, and claiming once. Verify IDs, actors, timestamps, status and quantity changes against `/go`.
- [x] Use separate SIDs for seeded and injected scenarios. Inject empty, one-row and 100-plus-row collections with optional fields omitted and stale IDs. Check direct loads and hard reloads, isolation, no writes during idle or canceled actions, no runtime requests off the local origin, and the desktop and narrow layouts. Verify a repeat claim and a repeat lesson finish cannot award twice.

## Out of scope

Authentication, payments, real messaging, contact syncing, production accounts, proprietary artwork, screenshots of the existing product, and visual replicas of its interface.
