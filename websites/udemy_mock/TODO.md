# Udemy Account — Implementation Plan

> Status: READY FOR DEV  
> Last updated by plan agent on 2026-11-18  
> [Design](DESIGN.md) · [Research](assets/README.md) · [Data model](assets/data_model.md)

## Status Legend

- [ ] Not started
- [~] In progress
- [x] Done

## P0 — Core shell and Harbor runtime

- [x] Scaffold React and Vite in this directory. Set Vite to port `5372` with `strictPort`, include `package-lock.json`, and keep the app offline with system fonts and original local visuals. Use `Udemy` as text in the shell and page titles. See [DESIGN.md](DESIGN.md).
- [x] Put all screens inside the store and feedback providers. Support `/` and `/my-learning` for the library, `/my-learning/lists/:listId`, `/learn/:courseId` with Overview, Curriculum and Q&A, `/learn/:courseId/questions/:questionId`, `/instructor`, `/instructor/courses/:courseId`, `/instructor/questions`, and `/instructor/questions/:questionId`. Preserve `sid` when switching screens or tabs and use `withSid()` for links outside the router. Verify hard reload and unknown or unavailable records. Navigation and filters alone write no state.
- [x] Copy `templates/dataManager.js` unchanged into `src/utils/dataManager.js` and import `stateApi` from `../../templates/state-api.js` in `vite.config.js`. Export `createInitialData()` from `src/data/seed.js`. Await `loadState(APP, createInitialData)` before mounting routes. Show neutral loading UI, then call `saveState(APP, nextState)` once in the store for each accepted user action that changes the whole state. Leave `/state`, `/post`, and `/go` to the template middleware. Exercise baseline sync, session isolation, array replacement, object merge, reload, and zero idle writes. Never mutate on mount, timers, or render.
- [x] Render empty, singleton, and large injected arrays, optional fields and absent references on every screen. Show descriptive empty states and clear-filter actions. Disable or hide actions whose target records are unavailable. Use stable IDs for joins and JSON-compatible state. Format relative dates from `new Date()` and preserve injected fields on mutation.
- [x] Run `npm run build` and exercise the site on localhost only. Run Playwright with Node from `PILOT_PLAYWRIGHT` and installed Chromium. Use an ignored scratch path or remove the runner. If starting a persistent Vite process, use `Start-Process -WindowStyle Hidden` with the absolute Vite entry point and the site as working directory. Verify each P1 mutation against `/go?sid=…` and cover the empty injected world and idle writes. The implementation phase writes `SCHEMA.md` from the exact implemented shapes and observable changes. The browser-test phase records results and changed state fields in `TEST.md` for the parent runner's certification.

## P1 — Courses

- [x] **Find and organize enrolled courses.** Start in My learning. Provide search over course title and instructor, category and progress filters, and sort by recent activity or title. Expose active and archived library views. Archive and restore from the course menu and reflect changes across the library and course detail. Write `enrollments[].status`, `archivedAt`, `updatedAt`, and `updatedBy`. Search, sort and filter write no state.
- [x] **Resume and track learning.** Open a course from the library, show the overview and sectional curriculum, and resume the recorded lecture or fall back to the first available one. Explicitly starting or selecting a different lecture writes `enrollments[].lastLectureId`, `lastAccessedAt`, `updatedAt`, and `updatedBy`. Marking a lecture complete or incomplete writes `completedLectureIds`, `completedAt`, `updatedAt`, and `updatedBy`. Derive counts and progress from distinct valid IDs. Opening a route, reloading, and visiting another section leave progress alone.
- [x] **Manage course lists.** Create or rename a list with a name and optional description. Add or remove an active enrollment's course via a checked list selector. Preserve memberships on archive, hide archived entries in list views, and restore their display on unarchive. Confirm list deletion and use a tombstone so the verifier can read the deletion. Write `courseLists[]` on create, and update `name`, `description`, `courseIds`, `status`, `deletedAt`, `updatedAt`, and `updatedBy` as applicable. A cancelled form writes no state.

## P1 — Course Q&A

- [x] **Find and post a question.** Open Q&A from a course, search question titles, bodies and reply text, and filter by current lecture, followed, or unanswered. Show author, lecture, timestamp, reply count, and answer status. Publish a question with a required trimmed title, optional details, and the current lecture if selected. Write a linked `questions[]` record with actor, timestamps, and `status: 'active'`. Open the saved thread and make it discoverable from both learner and applicable instructor views.
- [x] **Participate in a thread.** Post a nonblank reply as the current account, toggle Follow replies, and edit or confirm deletion of a question where ownership permits. Write `answers[]` for replies, `questionFollows[]` for follow/unfollow, and `questions[].title`, `body`, `status`, `deletedAt`, `updatedAt`, and `updatedBy` as applicable. A deleted thread and its replies disappear from both views while their linked records remain available to the verifier. Show the top answer when one is selected.

## P1 — Instructor dashboard

- [x] **Find and edit courses.** Show search and status filters for the signed-in instructor's courses and summary counts derived from visible records. New course opens a form for title and category and creates a `courses[]` record with `status: 'draft'` and the ownership fields. Edit details in the course workspace and write `courses[].title`, `subtitle`, `description`, `category`, `updatedAt`, and `updatedBy`. Required or invalid fields should leave state untouched and show actionable feedback.
- [x] **Build curriculum and submit for review.** Add and rename sections, then add and edit lessons within them. Use local lesson content, require a positive duration, and list records by `position`. Write `sections[]` and `lectures[]` and their update metadata. Enable review when title, category, description and at least one lesson with content are present. Submit changes `courses[].status` to `in_review` and writes `submittedAt`, `updatedAt`, and `updatedBy`. Show the new status on the dashboard and after reload. Approval and publication require seeded records.
- [x] **Triage and answer course questions.** Use the shared threads in the instructor inbox. Filter owned courses by unread or unanswered and sort by recent activity or oldest. Clicking a thread in the inbox marks it read. The thread also has a Mark read/unread control. Both actions write `questionReads[]` only when the value changes. A direct visit or reload simply renders the thread. Posting creates `answers[]`. Selecting a top answer sets `questions[].topAnswerId`, `updatedAt`, and `updatedBy`; clearing it resets the ID to `null`. Only an authorized instructor or the question author may select an answer, and the answer must belong to the thread. Replying and selecting a top answer are separate actions. Unanswered means no top answer, independent of unread status and reply count.

## P2 — Secondary features

- [x] **Instructor performance.** Use fixed metrics and course/date filters for a read-only summary of learner count, rating, and engagement. Render an accessible table if there are too few points for a chart. The filters write no state.

## Data seed

- [x] Seed at least 36 courses (24 enrollments across active and archived states and 12 instructor-managed courses), 72 sections, 180 lectures, 48 questions, 72 answers, 6 lists, and 24 profiles. Use fixed IDs, fixed ISO timestamps, original titles, varied questions, and synthetic English names and descriptions. Cover in-progress, completed, unstarted and archived enrollments, draft/review/published instructor courses, unread/answered combinations, question follows, and nested course and lecture joins. See [assets/data_model.md](assets/data_model.md) for the fixture and exact state contract.

## Out of scope

- Authentication, account creation, commerce, production APIs, external media, notifications sent outside the app, and live review or publication.
