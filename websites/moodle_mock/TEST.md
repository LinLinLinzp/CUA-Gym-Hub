# Moodle Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5432  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Route patterns tested, including the fallback | 16 |
| SEED workflows passed | 3 |
| Open P0 bugs | 0 |
| Open P1 bugs | 1 |

Round 2 ran installed Chromium through Node Playwright at `PILOT_PLAYWRIGHT` against the Vite dev server on loopback. The main suite used `moodle-acceptance-1794999771767` and the layout suite used `moodle-layout-1794999829277`. The main suite fixed the browser clock at November 18, 2026 in America/New_York. Local runners are `test_workflows.mjs`, `test_audit.mjs`, and `.mock-files/ui-review.mjs`.

## ✅ Passing Tests

Each accepted mutation in the principal workflow sent one `set_current` with the full resulting state. Assertions read `/go.current_state` or `/go.state_diff` using the same SID. The combined diff contained `courses`, `courseSections`, `coursePreferences`, `enrolments`, `assignments`, `gradeItems`, `submissions`, and `grades`.

| Workflow | Browser result and observed fields |
| --- | --- |
| Courses | Search by code, filter by category and date, switch sorting and paginate. Star off/on upserts `coursePreferences.starred` for the instructor. Creating `BIO 399` adds `courses`, its `courseSections` General row, and its active teacher `enrolments` row with linked course ID and a common `createdAt`. Settings updates `courses.fullName, visibility, actorId` on the same ID. Case-insensitive duplicate codes and reversed course dates trigger validation with no POST. |
| Participants | Find Alma Rossi using the eligible-user search and enrol her. `enrolments` records the course, learner, `status: active` and `method: manual`. Suspend and restore update `status` on the same ID. Participant email search works. Escape closes the enrolment dialog and restores trigger focus without writing. |
| Assignments | A section link opens a preselected form. Creation writes `assignments.sectionId, submissionType` and its linked `gradeItems.assignmentId, name, maxPoints, visibility` with a common `createdAt`. The edit renames the assignment and syncs its grade item maximum and visibility. Zero maximum, due before open, and maximum below a stored override trigger validation without a POST. Assignment search, course and visibility filters, due sort, and submission status filters work. |
| Learner submission | Hidden and not-yet-open assignments show the unavailable view. Blank text triggers validation without a POST. A draft writes `submissions.text, status: draft, submittedAt: null, late: false, actorId` for the learner and survives a hard reload. Submission keeps the ID, sets `status: submitted`, captures `submittedAt` equal to `updatedAt`, marks `late: true` for a past due date, and makes the text read-only. |
| Activity grade | Instructor opens submitted text from the roster. A score above the maximum is rejected without a POST. Saving zero sets `grades.score, feedback, gradedBy, gradedAt, submissionId`; Gradebook displays `0%`. |
| Gradebook override | Setting `grades.override.score` to 26.5 and writing `override.feedback, actorId, createdAt` leaves the base grade and submission link intact. The learner sees the effective feedback. Saving a blank override stores null and retains the override creation time. Clearing it sets `override: null` and restores zero. |
| Manual item and export | Setup creates `gradeItems` with `assignmentId: null, type: manual, name, maxPoints, visibility`. A candidate score of 8 writes base `grades.score, feedback, gradedBy` with null `submissionId` and `override`. Filtering to the manual item still calculates the total from both grades, showing `20%`. The downloaded CSV contains the student ID, both item headers and effective scores 0 and 8, with no POST. |

## Harbor and layout checks

- One baseline POST on fresh boot. The principal run preserved its state through hard reloads and had zero idle POSTs during observation. In-app navigation preserved the SID.
- Empty injected arrays replaced defaults. Partial account injection merged with the default user ID and displayed the injected name when the user list was empty. A separate SID could neither see nor replace the principal run's changes.
- A world with one minimal course and 245 active students supported pagination, search and grading. A write retained the extra injected top-level key. A direct link with mismatched IDs rendered inside the shell. Explicitly saving an injected assignment with no grade item created its linked item.
- All 16 route patterns rendered on direct load, including the fallback. The audit also loaded all 15 planned routes with empty arrays and exercised a sparse roster of 250 students. The wordmark, breadcrumb, fallback link, and Gradebook pagination and search navigated as expected. Form cancellation and grade-dialog dismissal left the diff empty. Both grade-dialog dismissal buttons returned focus to the trigger. The primary button changed color on hover.
- Chromium reported zero page errors, zero console errors in the layout suite, and zero off-origin requests from the pages tested. At 390 px the mobile menu worked and wide gradebook columns scrolled within the table.
- The default state includes 30 courses, six categories, 36 learners plus the instructor, 42 sections, 142 enrolments, 48 assignments, 58 submissions, 54 grade items and 44 grades. It covers missing, draft, ungraded, graded and overridden submissions.
- `npm run build` passed, and the local `dataManager.js` matched the shared template by SHA-256. Round 1 also passed the principal suite against Vite preview. Round 2 exercised the dev server.

## ❌ Bugs for Dev Agent

### BUG-001 · P1 · Activities add action selects the first named section

| Field | Value |
| --- | --- |
| Route | `/courses/injected` |
| Element | **Add assignment** in the **Activities** panel |
| Action | Inject a course with a named section and an assignment without a `sectionId`. Open **Activities**, click **Add assignment**, enter a title, and save with the preselected section. |
| Expected | The form selects **Activities (no section)** and `/go.current_state.assignments[].sectionId` is null on the new record. |
| Actual | The form selects the named section and `/go` records its ID, `general`. The form still allows choosing **Activities (no section)** manually. |
| Console errors | None observed. |
| Fix hint | Preserve an explicit empty section query value from the Activities link. Keep the default selection for the page-level add button and the explicit ID for named sections. |

## Visual Alignment Feedback

Desktop screenshots of Dashboard, My courses and Grader report and the mobile Grader report were reviewed against [DESIGN.md](DESIGN.md). The text wordmark, plum navigation, locally authored artwork and mobile table scroll appear as designed. Additional screenshots are in the ignored `.mock-files` directory.

## Round History

### Round 1 → Round 2

- BUG-001 ([AUDIT-001](AUDIT.md)) remains reproducible.
- All three SEED workflows passed again against the dev server.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `114124`. The local evidence is `factory/build/dyn_certify/114124/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `users → 0 → name`.
