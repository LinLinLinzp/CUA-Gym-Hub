# Moodle planning state model

`createInitialData()` returns an object with the keys below. IDs are stable strings. Seed IDs and timestamps are fixed literals and new IDs are unique within their collections. New or edited records use ISO UTC timestamps from `new Date().toISOString()`. Every mutable record has `id`, `actorId`, `createdAt` and `updatedAt`. On creation, both times use the action timestamp. On update, retain `id` and `createdAt` and set `actorId` and `updatedAt` to the actor and time of the change. Grade entries also carry per-component attribution since activity marking and override editing are independent.

## Top-level keys

| Key and type | Fields and examples |
| --- | --- |
| `account` object | `userId` string `usr-instructor`, `displayName` string `Elena Park`. This is the current instructor and display-name fallback. |
| `users[]` | `id` string `usr-sam-ortiz`, `name` string `Sam Ortiz`, `email` string `sam.ortiz@example.test`, `role` enum `teacher / student`. |
| `categories[]` | `id` string `cat-sciences`, `name` string `Sciences`. |
| `courses[]` | Mutable fields above with `id` `crs-env-210`, `fullName` string `Environmental Field Methods`, `shortName` string `ENV 210`, `categoryId` string `cat-sciences`, `summary` string `Field observation and sampling methods for urban watersheds.`, `startDate` date string `2026-09-08`, `endDate` date string `2026-12-18` or null, `visibility` enum `visible / hidden`. |
| `courseSections[]` | Mutable fields above with `id` `sec-env-210-general`, `courseId` string `crs-env-210`, `title` string `General`, `position` nonnegative integer `0`. |
| `coursePreferences[]` | Mutable fields above with `id` `pref-env-210-elena`, `courseId` string `crs-env-210`, `userId` string `usr-instructor`, `starred` boolean `true`. Unique by course and user. |
| `enrolments[]` | Mutable fields above with `id` `enr-env-210-sam`, `courseId` string `crs-env-210`, `userId` string `usr-sam-ortiz`, `role` enum `student / teacher`, `status` enum `active / suspended`, `method` string `manual`. Unique by course and user. |
| `assignments[]` | Mutable fields above with `id` `asn-env-210-field-notes`, `courseId` string `crs-env-210`, `sectionId` string `sec-env-210-general`, `title` string `Watershed field notes`, `instructions` string `Describe your survey transect and two sources of uncertainty.`, `opensAt` ISO datetime string `2026-10-12T13:00:00.000Z` or null, `dueAt` ISO datetime string `2026-11-23T22:00:00.000Z` or null, `maxPoints` positive number `50`, `visibility` enum `visible / hidden`, `submissionType` string `online_text`. |
| `submissions[]` | Mutable fields above with `id` `sub-field-notes-sam`, `courseId` string `crs-env-210`, `assignmentId` string `asn-env-210-field-notes`, `studentId` string `usr-sam-ortiz`, `text` string `The eastern bank showed higher turbidity after rainfall.`, `status` enum `draft / submitted`, `submittedAt` ISO datetime string or null, `late` boolean `false`. Unique by assignment and student. |
| `gradeItems[]` | Mutable fields above with `id` `item-env-210-field-notes`, `courseId` string `crs-env-210`, `assignmentId` string `asn-env-210-field-notes` or null, `type` enum `assignment / manual`, `name` string `Watershed field notes`, `maxPoints` positive number `50`, `visibility` enum `visible / hidden`. Unique assignment link for activity items. |
| `grades[]` | Mutable fields above with `id` `grd-field-notes-sam`, `courseId` string `crs-env-210`, `gradeItemId` string `item-env-210-field-notes`, `studentId` string `usr-sam-ortiz`, `submissionId` string `sub-field-notes-sam` or null, `score` number `42.5` or null, `feedback` string `Explain how the rainfall affected the readings.`, `gradedBy` string `usr-instructor` or null, `gradedAt` ISO datetime string or null, `override` object or null. Unique by grade item and student. |

An `override` object has `score` number or null, `feedback` string, `actorId` string, and `createdAt` and `updatedAt` ISO strings. Preserve the existing override's creation time when editing it. A null override means the base result is effective. A present override can intentionally leave the effective score blank with a null score. Grade rows created solely to store an override start with null base score, null attribution and submission link, and empty base feedback. Clearing the override sets it to null and retains the grade row. Do not attach an override-only grade to a submission until an instructor saves the activity grade.

## Relationships and display

- Course links to its category. Sections, preferences, enrolments, assignments and grade items link to their course. An assignment's section must belong to its course. New course writes include the teacher enrolment so it can appear in My courses.
- Submissions link to one assignment and learner. Grades link to a same-course item and learner, plus a same-assignment submission when marked from the assignment. Assignment detail and Gradebook read the same grade records.
- Derive roster and counts from active enrolments, and retain historical submissions and grades when enrolment is suspended. Derive no submission from the missing row. The teacher roster can group submitted work as Graded when the base score is a number and Needs grading otherwise. A gradebook override alone does not mark the student's submission graded.
- For course totals, divide the sum of nonnull effective scores by the sum of their corresponding valid item maxima, using all items in the course regardless of display filters. A genuine zero counts toward the denominator. If no effective grade exists, display an em dash. The teacher can see hidden items. Learner assignment view displays effective score and feedback only when the assignment and its linked item are visible.
- Treat dates missing or invalid in injected fields as unscheduled, and use the app clock for current/future/past, overdue and late. An absent visibility field defaults to visible and an absent enrolment status on a valid roster row defaults to active. Missing linked records show a fallback or a recoverable state. Keep unknown injected keys across saves.

## Observable State Changes

| User action | Record writes in one save |
| --- | --- |
| Create course | Append course, General section and active instructor enrolment with the shared metadata. |
| Save Course Settings | Update existing course fields from the form and mutation metadata. |
| Star or unstar | Upsert `coursePreferences` keyed by course and instructor, setting `starred`. |
| Enrol selected users | Append active student enrolments per selected user, or reactivate a previously suspended row. |
| Suspend or restore | Update `enrolments.status` and mutation metadata on the same row. |
| Create or edit assignment | Create the assignment and linked item. Edit changes the assignment form fields and synchronizes the linked item's `name`, `maxPoints`, and `visibility`. If an injected assignment has no linked grade item, explicit save creates it. |
| Save draft | Upsert submission with text, `status: draft`, null `submittedAt` and `late: false`, attributed to the synthetic learner. |
| Submit for grading | Upsert submission with text, `status: submitted`, `submittedAt` and derived `late`, attributed to the synthetic learner. |
| Save activity grade | Upsert grade with `submissionId`, `score`, `feedback`, `gradedBy` and `gradedAt`, retaining any `override`. Require a valid submitted row and an existing linked grade item. |
| Create manual grade item | Append grade item with `type: manual`, null `assignmentId`, name, maximum and visibility. |
| Save manual item grade | Upsert grade with base score, feedback and base attribution, with null `submissionId` and `override`. |
| Override or remove override | Upsert `grades.override` with its attribution or clear it to null. Base values and the submission remain intact. |

## Default seed recipe

Use at least **30 courses**, **6 categories**, **36 students**, **42 sections**, **100 enrolments**, **48 assignments**, **54 grade items**, **48 submissions**, **36 grades**, and a handful of starred courses. Use stable readable IDs and compact, specific descriptions. Spread courses across disciplines and date windows, and include a hidden future course. Keep `crs-env-210` easy to find, with 24 active students, at least one suspended student and one available learner, multiple sections, several assignments and a manual item. Include zero, fractional and missing scores, draft and missing submissions, late and on-time submitted work, and an override over an existing base mark. Include both assessed and untouched submissions.

Use date strings for the academic calendar. Seed dated items on both sides of the example term and include an unscheduled visible assignment for submission tests under any frozen clock. Make the seed compact enough for responsive full-state saves and use only synthetic names, emails and academic work. Compute display counts, totals and date-relative states when reading.
