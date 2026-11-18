# Blackboard — TODO

> Status: DEVELOPMENT AND LOCAL VERIFICATION COMPLETE  
> Last updated by: dev agent, 2026-11-18  
> Research: `assets/README.md` | Data model: `assets/data_model.md` | Design: `DESIGN.md`

## Status Legend

- [ ] Not started
- [~] In progress
- [x] Done

## P0 — Core Shell and Harbor

- [x] **Scaffold and build.** Build the React/Vite site in this directory, title it Blackboard, and include a lockfile for the parent runner. Set Vite to port 5433 with `strictPort`. Import the unchanged repository `stateApi(createInitialData)` in `vite.config.js` and copy `templates/dataManager.js` unchanged to `src/utils/dataManager.js`. Use the API middleware's JSON `GET /go`. The built app uses local resources and the Harbor state API.
- [x] **Shell and routing.** Show the text wordmark and instructor identity in the global masthead. Global navigation links to Courses, Grade Center, and Announcements. Render Courses at `/` and `/courses`. Add `/grade-center`, `/announcements`, `/courses/:courseId`, `/courses/:courseId/roster`, `/courses/:courseId/settings`, `/courses/:courseId/grade-center`, and `/courses/:courseId/announcements`. Place all routes inside their providers, retain `?sid=` on router navigation, and use `withSid()` on links that leave the router. Missing courses show a safe return link. Follow the original responsive design in DESIGN.md.
- [x] **Initialize and persist through one store.** Await `loadState('blackboard_mock', createInitialData)` before rendering business routes. During load show a neutral status. Commit each successful user mutation atomically and call `saveState` once with the whole resulting state. Keep forms, filters, sorting, and navigation transient. Preserve injected top-level keys. Handle arrays containing zero, one, or hundreds of records, missing optional fields, and absent foreign-key targets. No idle writes or clock-driven state changes.
- [x] **Verifier documentation.** Add `SCHEMA.md` covering every persisted top-level key and the exact fields written by each business action. Reconcile the implementation with `assets/data_model.md` before testing.

## P1 — Courses

- [x] **Find and open a course.** Display code, title, term, instructor, and access status. Search title, code, or instructor and combine with term, access, and Favorites filters. Default to all terms and access states, pin favorites within the result set, and sort non-favorites by title within each term. Keep result counts and a clear-filters action. Course title opens an overview with description, visible course content, enrollment count, and links to roster, settings, Grade Center, and Announcements. Roster lists enrolled students with name and username search. Browsing and filtering write no records.
- [x] **Favorite and unfavorite.** Expose a toggle on the course card and overview with the same state and an accessible pressed state. Update `courses[].favorite` and `updatedAt`. Append a `course.favorite` activity linked to the course with the boolean value, timestamp, and instructor id.
- [x] **Manage course access.** Open Course Settings from a course card or overview. Explain Open, Closed, and Complete, then save the selected access in an explicit action. Completed courses remain browsable, and instructors can reopen them in Course Settings. Course content mutations are disabled while complete, including grades and announcements. Update `courses[].access` and `updatedAt`. Append a `course.access` activity with previous and next access. Repeated saves of the same value leave state unchanged.

## P1 — Grade Center

- [x] **Find work in the Grade Center.** The global view lists courses with counts of submissions needing grading and grades awaiting post. Opening a course shows a Grades grid and a Gradable Items list. Offer student name or username search in the grid, item title/category filters, and sortable student names and item list columns. Grid rows are enrolled students and columns are course items. Show earned points, points possible, and readable statuses for ungraded, needing grading, awaiting post, and posted. Selecting a grade cell or student row from an item detail view opens the same grade editor. Browsing writes no records.
- [x] **Create a manual grade item.** Add Item opens a form for title, description, category, optional due date, and points possible. Require a trimmed title and positive finite points with up to two decimal places. Save creates one `gradeItems[]` record with `kind: 'manual'` and appends `gradeItem.create`. The item appears in both views without manufacturing empty grade records or adding a Course Content row.
- [x] **Enter or edit points and feedback.** Show student, item, points possible, editable points, and optional feedback. Accept zero and up to two decimal places within the allowed range. Save creates or updates the single `grades[]` record for the item and student and appends `grade.save`. First score becomes `graded`, and a posted score stays `posted` when edited. Preserve the original `createdAt`, and keep feedback, actor, and update time on the grade. Leaving the form without saving writes no records.
- [x] **Post one grade or all eligible grades for an item.** Offer Post Grade in an eligible grade editor and Post All Grades on an item, with a confirmation showing the number to be posted. Bulk posting applies to the entire course item, even if the view is filtered. Post only numeric, unposted graded records. Update `grades[].status`, `postedAt`, `postedBy`, `updatedAt` and `updatedBy` for the affected batch and append one `grade.post` activity containing the exact grade ids and quantity. A second post with no eligible grades writes nothing.

## P1 — Announcements

- [x] **Find and read announcements.** Global Announcements offers a course selector with an all-courses list. Each course opens a course-scoped list. Show title, course where relevant, status, and date. Search titles and messages, filter by course and status, and sort by title or date. Opening a row shows the full message and publication details. Browsing writes no records.
- [x] **Compose a draft or post immediately.** New Announcement opens a form with a course when launched globally, title, and message. Require a valid course and nonblank trimmed title and message. Provide Save Draft and Post Now. Both create the corresponding `announcements[]` record and an `announcement.save` or `announcement.post` activity. Post Now is available on existing drafts too, updates the same id, and sets `postedAt`. Publishing targets the whole selected course.
- [x] **Schedule or reschedule.** The composer also offers publication time and optional hide time, with times entered in the browser's local time zone and stored as ISO timestamps. Require a future publication time and a hide time strictly after publication when present. Save Schedule creates a scheduled announcement or updates the same draft or future scheduled record with `status: 'scheduled'`, `publishAt`, and `hideAt`, then appends `announcement.schedule`. At render time derive that a past-due scheduled record is Posted, and Hidden after its hide time. Keep its persisted schedule and never write because the clock passed a threshold.
- [x] **Edit, copy, and delete.** Edit applies to the current id and preserves posting status and timestamps for previously posted messages. Existing drafts can be edited or posted, and scheduled records can be rescheduled or returned to draft before publication. Copy creates a fresh draft in the same course, with the same message and publication fields cleared. Delete requires confirmation and removes exactly the selected current record. Each write touches `announcements[]` and appends the corresponding `announcement.save`, `announcement.copy`, or `announcement.delete` activity. Cancel and validation errors write nothing.

## P2 — Secondary

- [x] Add a read-only per-student Grade Center summary link if the primary grid and item workflows have passed. Derive it from the student's grades and course items.

## Data Seed

- [x] Build deterministic English fixtures in `src/data/seed.js` per the data model. Seed at least 36 courses, 48 students, 60 enrollments, 36 grade items, 150 grade records, and 42 announcements. Use fixed ids and varied statuses. Ensure a clearly discoverable open course supports searching, favoriting, changing access, grading, posting, and every announcement state without requiring user-created setup.

## Acceptance

- [x] Run `npm run build` and use Chromium through Node Playwright from `PILOT_PLAYWRIGHT` against localhost on port 5433. For a persistent Vite process, use `Start-Process -WindowStyle Hidden` with an absolute Vite entry point. Use gitignored runner scratch or remove it after checks.
- [x] In `TEST.md`, cover all three SEED workflows with Playwright actions and exact `/go` state fields. Verify fresh and reloaded deep links with `sid`, a second isolated session, no idle POSTs after boot, cancel/validation no-ops, and empty, sparse and large injected states. Verify scheduled status under a controlled browser clock without a network write as it crosses the boundary. Parent runner owns Docker certification and commits.
- [x] Include these end-to-end paths in the evidence. Courses combines search and filters, opens the roster, toggles favorites, and saves an access change. Grade Center creates a manual item, saves and edits a grade with feedback, posts one grade and an item batch, and verifies cross-course grades are untouched. Announcements creates and edits a draft, posts it under the same id, schedules another announcement, copies it to a draft, and confirms deletion of the copy. Inspect the linked records and activity in `/go` after each mutation.

## Out of Scope

- Authentication, student-role switching, course provisioning, real email or uploads, assessment authoring, full LMS administration, and proprietary visual resources. The account starts signed in as Dr. Elena Morales.








