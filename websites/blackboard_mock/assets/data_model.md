# Blackboard state model

`src/data/seed.js` exports `createInitialData()`, returning a fresh JSON-serializable object of the following shape. Record examples use synthetic values. A question mark marks fields that can be absent from injected records. New writes include the fields listed for that action. Optional timestamps produced by the app use ISO 8601 strings or `null`. Preserve unknown injected keys when writing.

| Top-level key | Record shape and representative values |
| --- | --- |
| `account` | Object with string `id` (`usr-instructor-01`), `name` (Dr. Elena Morales), and `role` (`instructor`). The account id serves as mutation actor. |
| `terms[]` | String `id` (`term-fall-2026`), `name` (Fall 2026), and optional date-only `startsOn` (`2026-08-24`) and `endsOn` (`2026-12-18`). Sort dated terms by descending start date. |
| `courses[]` | String `id` (`course-env-210`), `code` (ENV 210-01), `title` (Environmental Policy), `termId`, `instructorId`, optional `instructorName`, `subject` (Environmental Studies), and `description`. `access` is `open`, `closed`, or `complete`. `favorite` is boolean. Include `createdAt` and optional `updatedAt`. |
| `students[]` | String `id` (`stu-001`), `firstName` (Amina), `lastName` (Patel), `username` (apatel), and optional `email` (apatel@example.test). |
| `enrollments[]` | String `id` (`enr-env210-001`), `courseId`, and `studentId`. Status is `enrolled` or `inactive`. Include `createdAt`; each course/student pair occurs once. |
| `courseContent[]` | String `id` (`content-env210-w07`), `courseId`, optional `gradeItemId`, `title` (Week 7: Policy Instruments), `kind` (`module`, `assignment`, `quiz`, or `resource`), and optional `description`. `visible` is boolean and `position` is a number. |
| `gradeItems[]` | String `id` (`item-env210-policy-brief`), `courseId`, and `title` (Policy Brief). Optional string `description`. `kind` is `assignment`, `quiz`, or `manual`. `category` is `assignment`, `quiz`, `participation`, or `other`. `pointsPossible` is a positive number (100). Optional `dueOn` is a local date-only string. Include `createdAt`, `createdBy`, `updatedAt?`, and `updatedBy?`. |
| `grades[]` | String `id` (`grade-env210-brief-001`), `courseId`, `itemId`, `studentId`. `status` is `needs_grading`, `graded`, or `posted`. `score` is a number (91.5) or `null` for an existing ungraded submission. Optional text `feedback` (Clear policy recommendation.), `submittedAt`, `postedAt`, `postedBy`, `updatedAt`, and `updatedBy`. Include `createdAt` and `createdBy`. Each item/student pair occurs once. No record is needed when there is no submission or grade. Zero is a valid score. |
| `announcements[]` | String `id` (`ann-env210-004`), `courseId`, `title` (Room change for Thursday), `message` (Meet in Cedar Hall 204 for the policy workshop.), `authorId`, and `status` (`draft`, `scheduled`, or `posted`). Include `createdAt`, `updatedAt`, `updatedBy`, and nullable `publishAt`, `hideAt`, and `postedAt`. |
| `activity[]` | Append-only action records. Each has a unique string `id`, `type`, `actorId`, `courseId`, `entityId`, ISO `createdAt`, and JSON object `details`. For posting one grade, `entityId` is its id. For item-wide posting, it is the item id. Seed this array empty. |

## Relationships and display defaults

- Course links to term and instructor. Enrollment joins course and student. Course content, items, grades, and announcements carry `courseId`. Grades link to the grade item and student, and the item must belong to the same course. A content item may link to an assessment's gradable item. A manually added column has no content link.
- Scope data by exact ids. Use readable fallbacks such as Untitled course and No term when display values are missing. Broken foreign-key rows may be omitted from dependent views. Render a placeholder for missing optional display fields, and require a resolved course, item, or student before letting the user mutate it. Do not persist fallback values.
- Derive grade counts only from the current course's enrolled students and valid items. A grade needing posting has `status: 'graded'` and a finite score. A submission needing grading has `status: 'needs_grading'`. An absent grade or submission displays an ungraded placeholder.
- Derive announcement display state on render. Before `publishAt`, a valid scheduled record displays Scheduled. From `publishAt` until `hideAt`, it displays Posted. At or after `hideAt`, it displays Hidden and remains visible to the instructor under the Hidden filter. Use the scheduled publication timestamp as the display posting date in this case. A malformed or missing optional time displays a fallback and triggers no repair write.
- Use `new Date()` to derive current time and generate timestamps for user actions. Use a unique id for newly created records. All mutations use the signed-in `account.id`. Omit real personal data and use reserved domains for fixture emails.

## Observable state changes

Each row also appends the named `activity[]` record with the shared fields in the top-level table. One user mutation produces one save, including both the activity and domain changes.

| User action | Domain write | Activity type and details |
| --- | --- | --- |
| Favorite or unfavorite | Update course `favorite` and `updatedAt`. | `course.favorite` with `{ favorite }` |
| Change course access | Update course `access` and `updatedAt`. | `course.access` with `{ before, after }` |
| Create manual item | Append item with `id, courseId, title, description, kind, category, pointsPossible, dueOn, createdAt, createdBy`. | `gradeItem.create` with `{ itemId, pointsPossible }` |
| Save grade | Upsert `id, courseId, itemId, studentId, score, feedback, status, updatedAt, updatedBy`. Include `createdAt, createdBy` on insert and preserve existing creation, submission, and posting metadata. | `grade.save` with `{ itemId, studentId, score, status }` |
| Post one or all grades for item | Update each eligible grade's `status` to `posted` and set `postedAt, postedBy, updatedAt, updatedBy`. | `grade.post` with `{ itemId, gradeIds, quantity }` |
| Save or edit announcement | Create the full record or update `title, message, status, updatedAt, updatedBy`. Clear `publishAt, hideAt, postedAt` when returning a future scheduled record to draft. Preserve publication fields when editing an already published record, including a schedule whose publication time has passed. | `announcement.save` with `{ status }` |
| Post announcement now | Create full posted record or update the same draft id with submitted `title, message`, `status: 'posted'`, `postedAt, updatedAt, updatedBy` and null schedule times. | `announcement.post` with `{ status: 'posted', postedAt }` |
| Schedule or reschedule | Create full scheduled record or update the same id with submitted `title, message`, `status: 'scheduled'`, `publishAt, hideAt, updatedAt, updatedBy` and `postedAt: null`. | `announcement.schedule` with `{ status: 'scheduled', publishAt, hideAt }` |
| Copy announcement | Append a new record with the same course, title, and message, current actor and timestamps, `status: 'draft'`, and all three publication times null. | `announcement.copy` with `{ sourceAnnouncementId, status: 'draft' }` |
| Delete announcement | Remove the selected `announcements[]` record by id. | `announcement.delete` with `{ title, status }`, identifying the removed id and course in shared fields |
| Read, cancel, invalidate, navigate, filter, sort, or cross a schedule boundary | No domain write. | No activity. |

## Seed plan

Build arrays with stable keys and dates across Spring 2026, Summer 2026, and Fall 2026. Include at least 36 courses, 48 students, 60 enrollments, 36 content rows, 36 grade items, 150 grades, and 42 announcements. Vary instructor names, disciplines, section codes, teaching materials, categories, enrollment sizes, access, and favorite flags. Use fixed ISO seed dates and stable iteration order, and keep incoming state independent of seed object references.

Use ENV 210-01 Environmental Policy as a discoverable Fall 2026 course with Open access, at least 16 enrolled students, eight items, scores with and without feedback, zero, decimal points, blank cells, ungraded submissions, and both posted and unposted scores. Include a manual item and at least five announcements, with drafts, posted records, a future schedule set on a fixed date, and a past schedule with an expiry date. Use an injected clock and fixture in time-dependent tests so calendar drift cannot make scheduled checks flaky. Include one closed course suitable for opening and one complete course suitable for reopening. Use multiple sections with similar names to make search meaningful.
