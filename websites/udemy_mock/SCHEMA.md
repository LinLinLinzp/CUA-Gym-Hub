# udemy_mock Schema

**Base URL** `http://127.0.0.1:5372/`  
**Go Endpoint** `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject** `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset** `POST /post?sid=<sid>` with body `{"action":"reset"}`  
**Read stored state** `GET /state?sid=<sid>` → `{stored_state, has_custom_state, sid}`  
**Save current state** `POST /post?sid=<sid>` with body `{"action":"set_current","state":{...}}`

The Harbor state is JSON. Each accepted mutation sends the complete state in a single `set_current` request. `state_diff` maps each changed top-level key to an object containing the full new value under `modified` or `added`. The first accepted state write establishes the server baseline. Reset restores that baseline or the default seed when there is no saved baseline. `account.profileId` is the acting profile in both learner and instructor views.

Every authored or mutable row includes `createdAt`, `createdBy`, `updatedAt`, and `updatedBy`. Timestamps are ISO 8601 strings. The actor fields store profile IDs. Creation sets all four fields. Updates preserve the creation fields and any injected properties outside the update. A question or list with `status: "deleted"` remains in its array.

## State Schema

| Key | Record fields |
| --- | --- |
| `account` | Object with `profileId` (string). |
| `profiles[]` | `id`, `name`, optional `headline` (strings). |
| `courses[]` | `id`, `instructorId`, `title`, `category` (strings), `status` (`draft`, `in_review`, or `published`), optional `subtitle`, `description`, and `submittedAt` (strings), plus metadata. |
| `sections[]` | `id`, `courseId`, `title` (strings), `position` (number scoped to course), plus metadata. |
| `lectures[]` | `id`, `sectionId`, `title` (strings), `durationMinutes` (positive number), optional `content` (string), `position` (number scoped to section), plus metadata. |
| `enrollments[]` | `id`, `profileId`, `courseId` (strings), `status` (`active` or `archived`), optional `lastLectureId` (string or null), `completedLectureIds` (array of IDs), optional `lastAccessedAt`, `archivedAt`, and `completedAt` (timestamp or null), plus metadata. |
| `courseLists[]` | `id`, `profileId`, `name` (strings), optional `description` (string), `courseIds` (array of IDs), `status` (`active` or `deleted`), optional `deletedAt` (timestamp or null), plus metadata. |
| `questions[]` | `id`, `courseId`, `authorId`, `title` (strings), optional `body` (string), optional `lectureId` and `topAnswerId` (ID or null), `status` (`active` or `deleted`), optional `deletedAt` (timestamp or null), plus metadata. |
| `answers[]` | `id`, `questionId`, `authorId`, `body` (strings), `status` (`active` for new replies), plus metadata. |
| `questionFollows[]` | `id`, `questionId`, `profileId` (strings), `following` (boolean), plus metadata. One row per question and profile. |
| `questionReads[]` | `id`, `questionId`, `profileId` (strings), `isRead` (boolean), plus metadata. One row per question and profile. |
| `performance[]` | `id`, `courseId` (strings), `periodStart` (ISO calendar date), `learnerCount`, `averageRating`, `minutesTaught` (numbers). Read-only. |

### Default IDs

| Key | Count | Representative fixed IDs |
| --- | ---: | --- |
| `account` | 1 | `profile_morgan` is the active profile. |
| `profiles` | 24 | `profile_morgan`, `profile_jules`, `profile_24` |
| `courses` | 36 | `course_field_sketching`, `course_photo_essays`, `course_scene_structure` |
| `sections` | 72 | `section_field_sketching_01`, `section_field_sketching_02` |
| `lectures` | 180 | `lecture_field_sketching_01_01`, `lecture_field_sketching_01_02` |
| `enrollments` | 24 | `enrollment_morgan_field_sketching`, `enrollment_morgan_photo_essays` |
| `courseLists` | 6 | `list_weekend`, `list_reference`, `list_photo`, `list_writing`, `list_music`, `list_design` |
| `questions` | 48 | `question_1` through `question_48` |
| `answers` | 72 | `answer_1_1`, `answer_48_2` |
| `questionFollows` | 16 | `follow_morgan_question_1`, `follow_morgan_question_16` |
| `questionReads` | 12 | `read_morgan_question_2`, `read_morgan_question_46` |
| `performance` | 18 | `performance_course_field_sketching_08`, `performance_course_poster_series_10` |

## Minimal Inject Example

Send this body to `POST /post?sid=<new-sid>`, then open the app with the same session ID. Explicit arrays replace the corresponding seed arrays. Objects merge with the seed.

```json
{
  "action": "set",
  "state": {
    "account": {"profileId": "profile_morgan"},
    "profiles": [{"id": "profile_morgan", "name": "Morgan Ellis"}],
    "courses": [],
    "sections": [],
    "lectures": [],
    "enrollments": [],
    "courseLists": [],
    "questions": [],
    "answers": [],
    "questionFollows": [],
    "questionReads": [],
    "performance": []
  }
}
```

## Observable State Changes

| User action | Exact state written |
| --- | --- |
| Archive or restore a course | Update the actor's `enrollments[]` row by ID. Set `status` to `archived` or `active`, `archivedAt` to the action timestamp or null, and `updatedAt`, `updatedBy`. |
| Start or resume a lesson, or select a different lecture | Update the actor's `enrollments[]` row. Set `lastLectureId`, `lastAccessedAt`, `updatedAt`, and `updatedBy`. Resume falls back to the first lesson if the stored lesson is unavailable. |
| Mark a lesson complete or incomplete | Update `enrollments[].completedLectureIds`, `completedAt`, `updatedAt`, and `updatedBy`. The completion set contains distinct course lecture IDs. `completedAt` is set when all lessons are complete and cleared when a lesson becomes incomplete. |
| Create a course list | Append `courseLists[]` with a generated `id`, actor `profileId`, trimmed `name` and `description`, empty `courseIds`, `status: "active"`, `deletedAt: null`, and creation/update metadata. |
| Edit a list | Update `courseLists[].name`, `description`, `updatedAt`, and `updatedBy`. |
| Check or uncheck a list for an active course | Update `courseLists[].courseIds`, `updatedAt`, and `updatedBy`. Archiving hides that membership in the library and preserves the ID in storage. |
| Confirm list deletion | Set `courseLists[].status` to `deleted` and set `deletedAt`, `updatedAt`, and `updatedBy`. |
| Publish a question | Append `questions[]` with a generated `id`, `courseId`, `lectureId` (current lesson or null), actor `authorId`, trimmed `title` and `body`, `topAnswerId: null`, `status: "active"`, `deletedAt: null`, and creation/update metadata. |
| Edit a question | Update the actor's `questions[].title`, `body`, `updatedAt`, and `updatedBy`. |
| Confirm question deletion | Set the actor's `questions[].status` to `deleted` and set `deletedAt`, `updatedAt`, and `updatedBy`. Linked answers, follows, and reads remain in storage. |
| Reply as a learner or instructor | Append `answers[]` with a generated `id`, `questionId`, actor `authorId`, trimmed `body`, `status: "active"`, and creation/update metadata. |
| Follow or unfollow replies | Upsert `questionFollows[]` by `questionId` and actor `profileId`. Set `following`, `updatedAt`, and `updatedBy`. Create `id`, `createdAt`, and `createdBy` on insert. |
| Open an unread inbox thread or mark read/unread | Upsert `questionReads[]` by `questionId` and instructor `profileId`. Set `isRead`, `updatedAt`, and `updatedBy`. Create `id`, `createdAt`, and `createdBy` on insert. A direct URL load or reload leaves the read flag alone. |
| Select or clear a top answer | Set `questions[].topAnswerId` to an active answer ID from the same question or null and set `updatedAt` and `updatedBy`. Only the question author or course instructor can make the change. |
| Create an instructor draft | Append `courses[]` with a generated `id`, actor `instructorId`, trimmed `title` and `category`, empty `subtitle` and `description`, `status: "draft"`, and creation/update metadata. |
| Edit course details | Update `courses[].title`, `subtitle`, `description`, `category`, `updatedAt`, and `updatedBy`. |
| Add a section | Append `sections[]` with a generated `id`, `courseId`, trimmed `title`, the next `position` in the course, and creation/update metadata. |
| Rename a section | Update `sections[].title`, `updatedAt`, and `updatedBy`. |
| Add a lesson | Append `lectures[]` with a generated `id`, `sectionId`, trimmed `title` and `content`, numeric `durationMinutes`, the next `position` in the section, and creation/update metadata. |
| Edit a lesson | Update `lectures[].title`, `durationMinutes`, `content`, `updatedAt`, and `updatedBy`. |
| Submit a ready draft for review | Set `courses[].status` to `in_review` and set `submittedAt`, `updatedAt`, and `updatedBy`. Readiness requires title, category, description, and at least one lesson with content. |

Search, filters, sort, performance views, invalid form submits, canceled dialogs, and idle time leave persisted state alone. The library derives progress from the intersection of stored completion IDs and the current curriculum. Q&A uses a valid top-answer relationship to determine answer status independently of the read flag or number of replies.
