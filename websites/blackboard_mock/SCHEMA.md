# blackboard_mock Schema

**Base URL** `http://localhost:5433/`  
**Go Endpoint** `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject** `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset** `POST /post?sid=<sid>` with body `{"action":"reset"}`, restoring the stored baseline

`src/data/seed.js` exports `createInitialData()`, returning a fresh JSON-serializable object of the following shape. Record examples use synthetic values. A question mark marks fields that can be absent from injected records. New writes include the fields listed for that action. Optional timestamps produced by the app use ISO 8601 strings or `null`. Preserve unknown injected keys when writing.

Verify business actions against `current_state`. The browser sends one `set_current` request per successful action with the complete world and the corresponding activity record.

## State Schema

| Key | Type | Description |
| --- | --- | --- |
| `account` | Object | String `id`, `name`, and `role` (`instructor`). The account id serves as mutation actor. |
| `terms` | Array | String `id`, `name`, and optional date-only `startsOn` and `endsOn`. Sort dated terms by descending start date. |
| `courses` | Array | String `id`, `code`, `title`, `termId`, `instructorId`, optional `instructorName`, `subject`, and `description`. `access` is `open`, `closed`, or `complete`. `favorite` is boolean. Include `createdAt` and optional `updatedAt`. |
| `students` | Array | String `id`, `firstName`, `lastName`, `username`, and optional `email`. |
| `enrollments` | Array | String `id`, `courseId`, and `studentId`. `status` is `enrolled` or `inactive`. Include `createdAt`. Each course/student pair occurs once. |
| `courseContent` | Array | String `id`, `courseId`, optional `gradeItemId`, `title`, `kind` (`module`, `assignment`, `quiz`, or `resource`), and optional `description`. `visible` is boolean and `position` is a number. |
| `gradeItems` | Array | String `id`, `courseId`, and `title`. Optional string `description`. `kind` is `assignment`, `quiz`, or `manual`. `category` is `assignment`, `quiz`, `participation`, or `other`. `pointsPossible` is a positive number. `dueOn` may be omitted, `null`, or a local date-only string. Include `createdAt`, `createdBy`, `updatedAt?`, and `updatedBy?`. |
| `grades` | Array | String `id`, `courseId`, `itemId`, `studentId`. `status` is `needs_grading`, `graded`, or `posted`. `score` is a number or `null` for an existing ungraded submission. Optional string fields include `feedback`, `submittedAt`, `postedAt`, `postedBy`, `updatedAt`, and `updatedBy`. Include `createdAt` and `createdBy`. Each item/student pair occurs once. A missing record displays as ungraded. Zero is a valid score. |
| `announcements` | Array | String `id`, `courseId`, `title`, `message`, `authorId`, and `status` (`draft`, `scheduled`, or `posted`). Include `createdAt`, `updatedAt`, `updatedBy`, and nullable `publishAt`, `hideAt`, and `postedAt`. |
| `activity` | Array | Append-only action records. Each has a unique string `id`, `type`, `actorId`, `courseId`, `entityId`, ISO `createdAt`, and JSON object `details`. For posting one grade, `entityId` is its id. For item-wide posting, it is the item id. The seed starts with an empty array. |

### Default IDs

| Record | ID |
| --- | --- |
| Dr. Elena Morales | `usr-instructor-01` |
| Fall, Summer, and Spring 2026 | `term-fall-2026`, `term-summer-2026`, `term-spring-2026` |
| Environmental Policy, Fall 2026 | `course-env-210` |
| Amina Patel | `stu-001` |
| Amina's Environmental Policy enrollment | `enr-env210-001` |
| Week 7: Policy Instruments | `content-course-env-210-workshop` |
| Policy Brief | `item-env210-policy-brief` |
| Amina's Policy Brief grade | `grade-env210-policy-brief-001` |
| Room change for Thursday | `ann-env210-002` |

## Relationships and display defaults

- Course links to term and instructor. Enrollment joins course and student. Course content, items, grades, and announcements carry `courseId`. Grades link to the grade item and student, and the item must belong to the same course. A content item may link to an assessment's gradable item. A manually added column has no content link.
- Scope data by exact ids. Use readable fallbacks such as Untitled course and No term when display values are missing. Broken foreign-key rows may be omitted from dependent views. Render a placeholder for missing optional display fields, and require a resolved course, item, or student before letting the user mutate it. Do not persist fallback values.
- Derive grade counts only from the current course's enrolled students and valid items. A grade needing posting has `status: 'graded'` and a finite score. A submission needing grading has `status: 'needs_grading'`. An absent grade or submission displays an ungraded placeholder.
- Derive announcement display state on render. Before `publishAt`, a valid scheduled record displays Scheduled. From `publishAt` until `hideAt`, it displays Posted. At or after `hideAt`, it displays Hidden and remains visible to the instructor under the Hidden filter. Use the scheduled publication timestamp as the display posting date in this case. A malformed or missing optional time displays a fallback and triggers no repair write.
- Use `new Date()` to derive current time and generate timestamps for user actions. Use a unique id for newly created records. All mutations use the signed-in `account.id`. Omit real personal data and use reserved domains for fixture emails.

## Minimal Inject Example

Send this object as `state` with the `set` action in a fresh session. Array keys replace defaults and the omitted account uses the default instructor.

```json
{
  "terms": [],
  "courses": [{ "id": "course-audit", "title": "Archival Methods", "access": "open" }],
  "students": [],
  "enrollments": [],
  "courseContent": [],
  "gradeItems": [],
  "grades": [],
  "announcements": [],
  "activity": []
}
```

## Observable State Changes (for LLM evaluation)

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


