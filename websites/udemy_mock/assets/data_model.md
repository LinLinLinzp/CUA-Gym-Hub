# Udemy Account Data Model

`createInitialData()` in `src/data/seed.js` returns an object with the keys below. Arrays hold plain records. IDs are strings and dates are ISO strings. A `?` marks optional fields. `null` marks an explicitly cleared value. The examples form one linked fixture and illustrate values and types. Use fixed values in the seed and generate IDs and timestamps when a user action is accepted. Keep an existing record's creation fields on edit.

## Shared fields

Each authored or mutable record below includes this metadata, with the account or profile ID of the person who performed the action.

```json
{
  "createdAt": "2026-09-08T13:10:00.000Z",
  "createdBy": "profile_morgan",
  "updatedAt": "2026-09-08T13:10:00.000Z",
  "updatedBy": "profile_morgan"
}
```

Set both field pairs on create. On edit, set the update pair using the verb's actor and the time of the action. Where a seeded world omits optional update data, display the creation timestamp if it exists. Existing injected records retain their metadata and any additional fields unless the current action changes them.

## Top-level keys and record shapes

| Key | Shape and example values |
| --- | --- |
| `account` | Object `{profileId: 'profile_morgan'}`. The profile ID identifies the current actor in both modes. |
| `profiles` | Array of `{id: 'profile_morgan', name: 'Morgan Ellis', headline?: 'Illustrator and educator'}`. Use local text initials for display. |
| `courses` | Array of `{id: 'course_field_sketching', instructorId: 'profile_morgan', title: 'Field Sketching with Ink', subtitle?: 'A portable drawing practice', description?: 'Build confident lines through short outdoor studies.', category: 'Illustration', status: 'published', submittedAt?: '2026-09-08T13:10:00.000Z', …metadata}`. Status is `draft`, `in_review`, or `published`. |
| `sections` | Array of `{id: 'section_ink_01', courseId: 'course_field_sketching', title: 'Choosing a viewpoint', position: 1, …metadata}`. Position is a positive integer scoped to the course. |
| `lectures` | Array of `{id: 'lecture_ink_01', sectionId: 'section_ink_01', title: 'A five-minute contour study', durationMinutes: 8, content?: 'Pick a subject and draw one continuous outline.', position: 1, …metadata}`. Position is scoped to the section. Derive the course through the section. |
| `enrollments` | Array of `{id: 'enrollment_morgan_ink', profileId: 'profile_morgan', courseId: 'course_field_sketching', status: 'active', lastLectureId?: 'lecture_ink_01', completedLectureIds: ['lecture_ink_01'], lastAccessedAt?: '2026-09-11T16:20:00.000Z', archivedAt?: null, completedAt?: null, …metadata}`. Status is `active` or `archived`. Lecture IDs must belong to this course. Keep at most one enrollment per profile and course. |
| `courseLists` | Array of `{id: 'list_weekend', profileId: 'profile_morgan', name: 'Weekend studio', description?: 'Courses to revisit on Saturdays', courseIds: ['course_field_sketching'], status: 'active', deletedAt?: null, …metadata}`. Status is `active` or `deleted`. |
| `questions` | Array of `{id: 'question_contour_01', courseId: 'course_field_sketching', lectureId?: 'lecture_ink_01', authorId: 'profile_jules', title: 'How should I handle broken contours?', body?: 'Should I lift the pen between overlapping shapes?', topAnswerId?: 'answer_contour_01', status: 'active', deletedAt?: null, …metadata}`. `status` is `active` or `deleted`. `lectureId` and `topAnswerId` may be null. The author and creator start as the same profile. |
| `answers` | Array of `{id: 'answer_contour_01', questionId: 'question_contour_01', authorId: 'profile_morgan', body: 'Try tracing each shape separately on a second study.', status: 'active', …metadata}`. Replies are visible only while their question is active. |
| `questionFollows` | Array of `{id: 'follow_morgan_contour', questionId: 'question_contour_01', profileId: 'profile_morgan', following: true, …metadata}`. Upsert by question and profile. Unfollow sets `following` to false. |
| `questionReads` | Array of `{id: 'read_morgan_contour', questionId: 'question_contour_01', profileId: 'profile_morgan', isRead: true, …metadata}`. Upsert by question and profile. Missing rows count as unread. Mark unread writes `isRead: false` to an existing read record. |
| `performance` | Optional P2 array of `{id: 'performance_ink_2026_10', courseId: 'course_field_sketching', periodStart: '2026-10-01', learnerCount: 138, averageRating: 4.7, minutesTaught: 6120}`. Seeded, read-only metrics. Omit the key until this feature is implemented. |

## Relationships and derived views

- Resolve profiles by ID and use a neutral fallback when a referenced profile is unavailable. Scope learner library and lists to `account.profileId`. Scope instructor courses and queue to course ownership. Include at least two synthetic courses in both scopes for testing shared Q&A. Links to missing course, lecture, list or question records show a recovery link to the parent view.
- Compute percent complete from the intersection of `completedLectureIds` and the course's current lectures, deduplicated. An empty course shows zero progress. Store `completedAt` when a lesson action first completes the course and clear it on an explicit mark-incomplete action. Archiving sets the enrollment status and archive time. Restoring sets `status: 'active'` and `archivedAt: null`.
- Resolve top answer from an active answer with the same `questionId`. Use that relationship for answered/unanswered. Compute reply counts and most recent discussion activity from active answers and their timestamps. The learner follows and instructor reads are independent of answer state.
- Use `status: 'deleted'` with `deletedAt` for list and question deletion. Keep underlying IDs and related records for verification. UI queries exclude deleted entities and suppress replies, follows and reads associated with deleted questions.
- Trim text input before validation. Treat unchanged values, cancelled forms, and unqualified actions as no-ops. Derive new positions from the greatest existing position in the applicable parent. Use a stable unambiguous runtime ID for every new record.

## Seed coverage

Return `account`, `profiles`, `courses`, `sections`, `lectures`, `enrollments`, `courseLists`, `questions`, `answers`, `questionFollows`, and `questionReads` in every default world. Create 36 courses across Illustration, Photography, Writing, Design, Music, and Digital Skills. Enroll Morgan in 24 courses, including at least four archived courses, four unstarted courses, and four completed courses. Associate at least 12 courses with Morgan as instructor, spanning all three course statuses. With the two planned overlaps, use the remaining courses as unenrolled synthetic catalog records. Create 24 or more profiles, 72 or more sections, 180 or more lectures, six lists with mixed memberships, and 48 or more questions with 72 or more replies. Put a variety of lecture-level and course-level threads in each primary workflow's starting courses. Include owned and unowned questions, read-but-unanswered, unread-but-answered, followed and unfollowed cases.

Define recognizable starting records such as `course_field_sketching`, `course_photo_essays` and `course_scene_structure`. Use fixed chronological dates for the default state so search, order and filtering stay reproducible. New user actions use the runtime clock. Avoid any randomized data or write on mount beyond the template's initial sync.
