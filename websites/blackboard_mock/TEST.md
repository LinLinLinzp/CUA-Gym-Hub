# Blackboard Mock — Test Report

> Round: 1
> Date: 2026-11-18
> Server: http://localhost:5433
> Tested by: playwright agent

## Summary

WORKFLOWS: PASS

| Metric | Count |
|--------|-------|
| Routes tested, including the fallback | 11 |
| Elements tested, grouped by check | 18 |
| ✅ Passed | 15 |
| ❌ Failed | 3 |
| ⚠️ Skipped (out of scope) | 0 |

The three SEED workflows passed in Chromium using the Node Playwright installation from `PILOT_PLAYWRIGHT`. The 15 passing groups comprise the three workflow groups, ten supplemental interaction and contract checks, the injected-world suite, and the production build. The three failures are separate audit reproductions described below. The rerun used the site's existing Vite dev listener on localhost port 5433. Harbor

---

## ✅ Passing Tests

### Courses

1. Combined instructor search, Fall 2026, Open access, and Favorites. Opened Environmental Policy, selected Roster, and searched for Amina Patel by username. Reloaded the roster with its original session ID.
2. Removed Environmental Policy from Favorites and added it again. Verified `courses[].favorite`, `courses[].updatedAt`, and `activity[].details.favorite` after each click. The activity had type `course.favorite` and the course ID in both `courseId` and `entityId`.
3. Saved Open → Complete → Closed → Open in Course Settings. Verified `courses[].access`, `courses[].updatedAt`, and `course.access` activities with `details.before` and `details.after`. Saving the current access was disabled, and a completed course disabled new grade items and announcements while remaining browsable.

### Grade Center

1. Followed Environmental Policy from the global queue. Created the 12.50-point Field Observation item with a description, Participation category and due date. Verified the new `gradeItems[]` record's `id`, `courseId`, `title`, `description`, `kind: 'manual'`, `category`, `dueOn`, `pointsPossible`, `createdAt`, and `createdBy`. The `gradeItem.create` activity included `details.itemId` and `details.pointsPossible`. The action left Grades and Course Content unchanged.
2. Filtered the grid by username, item title and category, saved a zero with feedback, then opened the same grade from Gradable Items and saved 10.25 with revised feedback. Verified `grades[].id`, `courseId`, `itemId`, `studentId`, `score`, `feedback`, `status`, `updatedAt` and `updatedBy`. The insert set `createdAt` and `createdBy`, and the edit retained them and the same `id`. Each `grade.save` activity recorded `details.itemId`, `studentId`, `score` and `status`.
3. Confirmed individual posting and then edited the posted score. The grade retained `posted` status and its original `postedAt` after edit. Filtered the Policy Brief student view to Amina, confirmed the full item count, and posted the entire eligible batch. Verified exact `grade.post` `details.itemId`, `gradeIds`, and `quantity`, as well as `status`, `postedAt`, `postedBy`, `updatedAt` and `updatedBy` on each posted grade. All records outside the batch, including grades from other courses, were identical. Posting a second time was disabled.
4. Confirmed blank titles, excessive precision, a score above the maximum, Escape and cancel caused no writes. Opened and reloaded the read-only student summary from a sparse roster.

### Announcements

1. Selected Environmental Policy in the global view. Created a draft, found it by message text and status, opened it, edited the title and posted it under the same ID. Verified the record's `id`, `courseId`, `title`, `message`, `status`, `authorId`, `createdAt`, `updatedAt`, `updatedBy`, `publishAt`, `hideAt`, and `postedAt`. The draft used `announcement.save` with `details.status`. Posting used `announcement.post` with `details.status` and `details.postedAt`. Editing the posted message kept its publication timestamp.
2. Scheduled a course announcement in New York time, rescheduled it under the same ID, and checked the exact ISO `publishAt` and `hideAt`, null `postedAt`, and `announcement.schedule` activity `details.status`, `publishAt` and `hideAt`. Advanced the browser clock from Scheduled to Posted and then Hidden. The visible status changed on render while the persisted record remained scheduled and no POST occurred.
3. Copied the scheduled announcement. The `announcement.copy` activity recorded `details.sourceAnnouncementId` and `details.status`. The copy had a fresh ID, the source title and message, and null `publishAt`, `hideAt` and `postedAt`. Canceled deletion, then confirmed it. Verified `announcement.delete` referenced the copy ID and recorded `details.title` and `details.status`. The original record was identical.
4. Verified direct Post Now creates a new posted record. Scheduled another announcement without a hide time and returned it to Draft under the same ID with all publication times cleared. Blank content, invalid schedule dates and cancel produced no writes.

### Harbor and responsive checks

- Checked `/go?sid=...` after each write. The main workflow session sent one baseline `set` and exactly 22 `set_current` requests. Each successful action appended one activity with an `id`, `type`, `actorId`, `courseId`, `entityId`, `createdAt`, and action-specific `details`. `/go` exposed the expected top-level diff. `/state` returned the matching stored state.
- Opened and hard-reloaded each course deep link with its session query. Checked independent session state and a second idle tab on the current session. Neither reloads nor the idle tab posted after its baseline. A mutation in the sparse session left the empty session unchanged.
- Exercised empty arrays, sparse records with missing optional fields and orphan links, unknown injected keys, and large views with 260 courses, 244 students enrolled in one course, and 306 announcements. A sparse-session mutation retained the injected custom key and used the injected actor.
- Checked desktop and 390 px layouts. The grade grid scrolled horizontally inside the page, and the mobile composer used the full viewport width. Browser runs recorded zero page errors and zero requests outside localhost.
- Compared the copied data manager with the repository template by file hash. They match.

### Supplemental interaction checks

- **Courses and navigation.** Verified no-match recovery with Clear filters, the course card settings link, Overview and its enrollment link, the course breadcrumb, the Blackboard wordmark, and the unknown-route recovery link. Navigation retained the session ID.
- **Grade Center.** Verified student sort reversal and both directions for Item, Category, Due date, and Points. The Policy Brief grid header opened item details. Cancel closed the batch-post confirmation without writing.
- **Announcements.** Verified both title and date sort directions, drawer Close with focus returned to the opening row, course selection in the global composer, and expanding and collapsing the scheduling fields. These browse and cancel checks left the complete `/go` result unchanged.
- **Harbor.** Tested `reset` in a separate session after `set` and `set_current`. The reset restored that session's baseline and left the workflow session unchanged. The supplemental checks recorded zero browser console errors.

---

## ❌ Bugs for Dev Agent

### BUG-001 · P0 · A delayed baseline erases the first write

| Field | Value |
|-------|-------|
| Route | `/courses/course-env-210?sid=<fresh session>` |
| Element | Favorite Environmental Policy |
| Action | Hold the boot `POST /post` with action `set`, click Favorite after the page renders, wait for `set_current`, and release the baseline. |
| Expected | `/go` preserves the baseline and the favorite mutation as separate initial and current states. |
| Actual | After `set_current`, current state held one activity. After the baseline arrived, current state reverted to zero activities, and initial state contained the mutation. |
| Console errors | None observed. |
| Fix hint | Coordinate baseline ordering with the shared Harbor owner while keeping the data manager identical to the repository template. See AUDIT-001 in AUDIT.md. |

### BUG-002 · P1 · Out-of-range seed grades block feedback-only edits

| Field | Value |
|-------|-------|
| Route | `/courses/course-env-210/grade-center` |
| Element | Samir Hassan's posted Policy Brief grade |
| Action | Open the posted grade, change only Feedback, and save. |
| Expected | The editor saves feedback while retaining the score and posting metadata. |
| Actual | The seeded score is 106 out of 100 and fails validation. `/go` is unchanged. In the fixture, 136 of 405 grades exceed their item maximum. |
| Console errors | None observed. |
| Fix hint | Bound the generated scores by `pointsPossible` while preserving fixture IDs and statuses. See AUDIT-002 in AUDIT.md. |

### BUG-003 · P1 · A skipped local time saves an hour later

| Field | Value |
|-------|-------|
| Route | `/courses/course-env-210/announcements` |
| Element | Publish at |
| Action | Set the browser zone to America/New_York, freeze the clock to November 18, 2026, and schedule publication for March 14, 2027 at 02:30. |
| Expected | A field validation message explains that the selected local time does not exist, and the form stays open without writing. |
| Actual | The form saved the schedule and `/go` returned `publishAt: 2027-03-14T07:30:00.000Z`, which displays as 03:30 local. |
| Console errors | None observed. |
| Fix hint | Validate the local date and time after converting it to an instant. Apply the same check to the optional hide time. See AUDIT-003 in AUDIT.md. |

---

## Visual Alignment Feedback

Reviewed the local Chromium captures against the site's original DESIGN.md. The desktop workspace showed the text wordmark, graphite masthead, ivory canvas, CSS course artwork, and the two-column overview. At 390 px the navigation wrapped, course cards stacked, the grade grid scrolled within its container, and the composer filled the viewport. Captures are in the gitignored `test-results/` directory.

## Round History

### Existing local verification → Round 1

- All three SEED workflows and the build passed on rerun.
- BUG-001, BUG-002, and BUG-003 reproduced independently.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `153784`. The local evidence is `factory/build/dyn_certify/153784/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `terms → 0 → name`.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Fixed and retested.** Chromium held the startup POST and verified that action controls stayed unavailable through acknowledgement. Grade entry, roster and announcements passed against the built preview.

Docker dynamic certification run `188924` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
