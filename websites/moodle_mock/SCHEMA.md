# moodle_mock Schema

**Base URL** `http://localhost:5432/`  
**Go Endpoint** `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`  
**Reset** `POST /post?sid=<sid>` with `{"action":"reset"}`

The app key is `moodle`. Use `GET /state?sid=<sid>` to read the stored state. The `/go` endpoint groups diffs by top-level key. New records have generated string IDs and default record IDs are fixed. Use a fresh SID when loading an injected world in a browser. For the shared Vite API, reset restores the initial snapshot or the default seed.

On a fresh session, the shared loader merges the injected world over the seed and sends one baseline `set`. Injected arrays replace seed arrays and objects merge recursively. A committed action sends one full-state `set_current` and preserves unknown keys. Navigation, searches, filters, dialogs, validation, cancelled edits, and idle time do not change persisted state.

## State Schema

Every mutable record includes `id`, `actorId`, `createdAt`, and `updatedAt`. Updates preserve the record ID and creation timestamp and set the actor and update timestamp. New records written together share one ISO UTC timestamp. Unless stated otherwise, IDs and text fields are strings and dates are strings using the indicated format.

| Key | Type and fields |
| --- | --- |
| `account` | Object with `userId` and `displayName`. The seed instructor is `usr-instructor`, Elena Park. |
| `users` | Array of `{id, name, email, role}`. Role is `teacher` or `student`. |
| `categories` | Array of `{id, name}`. |
| `courses` | Mutable array with `fullName, shortName, categoryId, summary, startDate, endDate, visibility`. Dates use YYYY-MM-DD and `endDate` may be null. |
| `courseSections` | Mutable array with `courseId, title, position`. Position is a nonnegative integer. |
| `coursePreferences` | Mutable array with `courseId, userId, starred` (boolean), keyed by course and instructor. |
| `enrolments` | Mutable array with `courseId, userId, role, status, method`. Role is `student` or `teacher`, status is `active` or `suspended`, and new UI enrolments use `method: "manual"`. Keyed by course and user. |
| `assignments` | Mutable array with `courseId, sectionId, title, instructions, opensAt, dueAt, maxPoints, visibility, submissionType`. `sectionId` is null for unfiled activities. `opensAt` and `dueAt` are nullable ISO datetimes. `maxPoints` is a positive number and `submissionType` is `online_text`. |
| `submissions` | Mutable array with `courseId, assignmentId, studentId, text, status, submittedAt, late`. Status is `draft` or `submitted`, `submittedAt` is a nullable ISO datetime, and `late` is a boolean. Keyed by course, assignment, and student. |
| `gradeItems` | Mutable array with `courseId, assignmentId, type, name, maxPoints, visibility`. Activity items have `type: "assignment"` and the linked assignment ID. Manual items have `type: "manual"` and `assignmentId: null`. `maxPoints` is a positive number. |
| `grades` | Mutable array with `courseId, gradeItemId, studentId, submissionId, score, feedback, gradedBy, gradedAt, override`. `submissionId` and `gradedBy` are nullable IDs, `gradedAt` is a nullable ISO datetime, `score` is a number or null, and `override` is null or the object below. Keyed by course, item, and student. |

Visibility is `visible` or `hidden`. Missing visibility and enrolment status default to visible and active when reading. Instructor tables retain access to hidden grading items. Learners require an active enrolment and a visible course and assignment that has opened. Learners see feedback and the effective score when the linked grade item is visible.

The `override` object contains `score` (number or null), `feedback`, `actorId`, `createdAt`, and `updatedAt`. When present, its score and feedback are effective, including an explicit null score. With no override, base grade values are effective. An override-only row begins with null `submissionId, score, gradedBy, gradedAt` and empty base `feedback`. A learner is marked Graded in the submission roster when the submitted work has a numeric base score, including zero. The course total divides effective scores by the maxima of all items with valid effective scores. It displays an em dash when none contribute.

### Default IDs

| Entity | Fixed examples |
| --- | --- |
| Instructor and learner | `usr-instructor` (Elena Park), `usr-sam-ortiz` (Sam Ortiz) |
| Category, course and section | `cat-sciences`, `crs-env-210`, `sec-env-210-general` |
| Course star and student enrolment | `pref-env-210-elena`, `enr-env-210-sam-ortiz` |
| Assignment and grade items | `asn-env-210-field-notes`, `item-env-210-field-notes`, `item-env-210-participation` (manual) |
| Submission and grade | `sub-field-notes-sam`, `grd-field-notes-sam` |

### Minimal Inject Example

```json
{
  "account": {"displayName": "Morgan Ellis"},
  "users": [],
  "categories": [],
  "courses": [],
  "courseSections": [],
  "coursePreferences": [],
  "enrolments": [],
  "assignments": [],
  "submissions": [],
  "gradeItems": [],
  "grades": []
}
```

Use the example as the `state` in the injection body. The account keeps the default `userId` and the empty arrays replace the corresponding seed arrays.

## Observable State Changes (for LLM evaluation)

| Action | Collections and fields written |
| --- | --- |
| Create course | Append `courses` with form fields above, `courseSections` with `courseId, title: "General", position: 0`, and `enrolments` with `courseId, userId: account.userId, role: "teacher", status: "active", method: "manual"`. |
| Save course settings | Update the existing `courses` row's `fullName, shortName, categoryId, summary, startDate, endDate, visibility`. |
| Star or unstar | Upsert `coursePreferences` with `courseId, userId: account.userId, starred`. |
| Enrol selected users | Append or reactivate one `enrolments` row per selection with `courseId, userId, role: "student", status: "active", method: "manual"`. |
| Suspend or restore | Update `enrolments.status` in place to `suspended` or `active`. Related submissions and grades are retained. |
| Create or edit assignment | Append or update `assignments` with `courseId, sectionId, title, instructions, opensAt, dueAt, maxPoints, visibility, submissionType: "online_text"`. Upsert the linked `gradeItems` row with `courseId, assignmentId, type: "assignment", name: title, maxPoints, visibility`. Explicitly saving an injected assignment with a missing grade item creates the item. |
| Save draft | Upsert `submissions` with `courseId, assignmentId, studentId, text, status: "draft", submittedAt: null, late: false`. Actor is the learner. |
| Submit for grading | Upsert the same `submissions` row with `text, status: "submitted", submittedAt` (the action time), and `late` (whether submission is after a valid due date). Actor is the learner. |
| Save activity grade | Upsert `grades` with `courseId, gradeItemId, studentId, submissionId, score, feedback, gradedBy, gradedAt`. Preserve any override. The actor and grader are the instructor. |
| Create manual grade item | Append `gradeItems` with `courseId, assignmentId: null, type: "manual", name, maxPoints, visibility`. |
| Save manual grade | Upsert `grades` with `courseId, gradeItemId, studentId, score, feedback, gradedBy, gradedAt, submissionId: null, override: null`. |
| Save override | Upsert `grades.override` with `score, feedback, actorId, createdAt, updatedAt`. Preserve the prior override creation time and the entire base grade and submission link. |
| Remove override | Set `grades.override` to null and retain the base grade and submission link. |
| Export CSV | Reads effective scores for all active students and all grade items in the course. No state write. |
