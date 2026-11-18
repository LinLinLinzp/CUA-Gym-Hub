# Udemy Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://127.0.0.1:5372  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested | 11 |
| Elements tested | 17 grouped checks |
| ✅ Passed | 15 |
| ❌ Failed | 2 |
| ⚠️ Skipped (out of scope) | 0 |

The production build passed. Both Playwright runners completed with installed Chromium on localhost. The main runner checked 35 successful writes against `/go?sid=…`, including the stored records, the unchanged baseline, and the exact `state_diff` for each write. Each accepted action sent one successful `set_current` and changed only the expected top-level key. Navigation, filters, cancelled and invalid forms, reloads, and idle tabs sent no writes.

## ✅ Passing Tests

### Workflow state observed through `/go`

Creation metadata comprises `createdAt`, `createdBy`, `updatedAt`, and `updatedBy`. Update metadata comprises `updatedAt` and `updatedBy`. All records used the signed-in synthetic account for actor fields.

| Seed workflow | Route and action | Observed writes |
| --- | --- | --- |
| Courses | `/my-learning` search, category and progress filters, sort, and archive and restore across the library and course detail | Search and filters wrote nothing. Archive and restore updated `enrollments[].status`, `archivedAt`, and update metadata. Archived courses disappeared from their lists and returned after restoration with `courseIds` intact. |
| Courses | `/learn/:courseId` resume, choose a lesson, complete the course, and mark a lesson incomplete | Resume and selection wrote `enrollments[].lastLectureId`, `lastAccessedAt`, and update metadata. Completion and reopening updated `completedLectureIds`, `completedAt`, and update metadata. The standard seeded course showed 100% at completion. |
| Courses | `/my-learning/lists/:listId` create, edit, add and remove a course, and confirm deletion | Create appended `courseLists[]` with `id`, `profileId`, `name`, `description`, `courseIds`, `status`, `deletedAt`, and creation metadata. Edit changed `name` and `description`. Membership changed `courseIds`. Deletion set `status: "deleted"` and `deletedAt`. Each update included update metadata. |
| Q&A | `/learn/:courseId?tab=qa` search question and reply text, filter, and publish | Search and filters wrote nothing. Publish appended `questions[]` with `id`, `courseId`, `lectureId`, `authorId`, `title`, `body`, `topAnswerId`, `status`, `deletedAt`, and creation metadata. The thread opened with its course and lecture links and appeared in the instructor inbox. |
| Q&A | `/learn/:courseId/questions/:questionId` follow and unfollow, reply, and edit | Follow appended a `questionFollows[]` record with `id`, `questionId`, `profileId`, `following`, and creation metadata. Unfollow changed `following` and update metadata on that row. Reply appended `answers[]` with `id`, `questionId`, `authorId`, `body`, `status`, and creation metadata. Editing changed `questions[].title`, `body`, and update metadata. |
| Instructor dashboard | `/instructor` and `/instructor/courses/:courseId` find, create, and edit a course | Search and status filters wrote nothing. Creation appended `courses[]` with `id`, `instructorId`, `title`, `subtitle`, `description`, `category`, `status: "draft"`, and creation metadata. Edit changed `title`, `subtitle`, `description`, `category`, and update metadata. |
| Instructor dashboard | `/instructor/courses/:courseId?tab=curriculum` add and edit sections and lessons, then submit | Section creation appended `sections[]` with `id`, `courseId`, `title`, `position`, and creation metadata. Rename changed `title` and update metadata. Lesson creation appended `lectures[]` with `id`, `sectionId`, `title`, `durationMinutes`, `content`, `position`, and creation metadata. Editing changed `title`, `durationMinutes`, `content`, and update metadata. Review gating prevented incomplete submissions. Submission wrote `courses[].status: "in_review"`, `submittedAt`, and update metadata. |
| Instructor dashboard and Q&A | `/instructor/questions` and `/instructor/questions/:questionId` triage, reply, choose and clear a top answer, and delete the shared thread as its author | Inbox filters and sort wrote nothing. Opening an unread row appended `questionReads[]` with `id`, `questionId`, `profileId`, `isRead`, and creation metadata. Marking unread or read changed `isRead` and update metadata. Reply appended `answers[]` with the same fields as the learner reply. Selecting and clearing separately updated `questions[].topAnswerId` and update metadata. Deletion updated `questions[].status`, `deletedAt`, and update metadata. Both views hid the deleted thread. Linked replies, follows, and reads remained in `/go`. |
| Instructor dashboard | `/instructor/performance` chart, table, course and month filters, and clear filters | No state changes. A single course and month yielded one table row. Clearing filters restored the chart. |

### Browser and Harbor behavior

- Checked `/`, `/my-learning`, `/my-learning/lists/:listId`, `/learn/:courseId`, `/learn/:courseId/questions/:questionId`, `/instructor`, `/instructor/courses/:courseId`, `/instructor/questions`, `/instructor/questions/:questionId`, `/instructor/performance`, and the unknown-route fallback. The wordmark, account navigation, tabs, inbox summary, back links, and saved list links worked and preserved the session ID. Dialog focus, close and Escape behavior, toast dismissal, and hover feedback worked.
- Verified the seed counts, empty arrays, account object merging, absent references and optional fields, fallback lesson selection, preservation of injected properties, and ID generation without `crypto.randomUUID`. The library and inbox rendered 280 injected records each. `/post` reset restored the server baseline and cleared the diff. `/state` and `/go` agreed, and a fresh browser context showed the reset state. Another session retained independent state.
- Compared desktop and 390 px mobile captures with `DESIGN.md`. The layout used the specified editorial library, original geometric artwork, and instructor workspace. The tested mobile library, lesson workspace, dashboard, and thread fit the viewport. The main runner observed no console errors, uncaught page errors, rejected state writes, or requests outside localhost. Gitignored evidence is under `tests/` and `test-results/`.

## ❌ Bugs for Dev Agent

### BUG-001 · P1 · Incomplete large courses can display 100%

| Field | Value |
| --- | --- |
| Route | `/my-learning` and `/learn/:courseId` |
| Element | Library, resume, and course detail progress meters |
| Action | Load an enrollment with 249 of 250 lectures completed and select In progress |
| Expected | The course appears in In progress and its meter displays less than 100% until the last lesson is complete |
| Actual | The course appears in In progress, all three meters show 100%, and `/go` has `completedAt: null`. Completing the final lesson correctly records 250 completed IDs and sets `completedAt`. |
| Console errors | None |
| Fix hint | In `src/data/selectors.js`, reserve a 100% result for nonempty courses with all lessons complete. |

### BUG-002 · P2 · Text buttons miss the minimum height

| Field | Value |
| --- | --- |
| Route | `/my-learning` and `/learn/:courseId/questions/:questionId` |
| Element | Clear filters and Select as top answer or Clear top answer |
| Action | Measure the controls at a 390 px viewport |
| Expected | The design specifies a 42 px minimum button height. |
| Actual | Each measured control is 34 px high. Both still work. |
| Console errors | None |
| Fix hint | Restore the shared `.text-button` minimum height in `src/styles.css`. |

## Visual Alignment Feedback

BUG-002 records the verified deviation from the site's design. The visual check used local app captures and the project's design brief.

## Round History

### Round 1 → Round 2

- All three Seed workflows passed again. Added per-write baseline and diff checks, session reset checks, focus checks, and more desktop and mobile captures.
- Reproduced both prior audit findings.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `121792`. The local evidence is `factory/build/dyn_certify/121792/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `profiles → 0 → name`.
