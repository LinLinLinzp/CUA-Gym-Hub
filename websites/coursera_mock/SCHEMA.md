# coursera_mock Schema

**Base URL**: `http://localhost:5370/`  
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}`

The app uses the Harbor templates for `GET /state`, `POST /post`, and JSON `GET /go`. Add `?sid=<session-id>` to inspect a session. The first client load merges injected objects over the seed and replaces injected arrays in full. It publishes a baseline `set` through the template. Each accepted business action publishes one whole-state `set_current`. The template caches the current snapshot in session-scoped localStorage for reloads.

In `/go`, `initial_state` is the server's original snapshot, including a fixture the runner posted first. `current_state` is the latest server snapshot. `state_diff` is keyed by changed top-level fields, with each replacement value under `modified` or `added`. Use `current_state` to assert individual row changes.

The state API retains the first initial snapshot and restores it to current state on reset. The client loads a fresh injection on its first visit for that session. A browser with an existing cache for the same session reads its cached copy on reload.

## State Schema

All IDs, labels and statuses below are strings. Timestamps use ISO 8601 UTC strings. Optional fields can be absent or null. Injected metadata is retained on writes.

| Top-level key | Shape |
| --- | --- |
| `learner` | Object with `id` and `displayName`. |
| `courses` | Array of objects with `id`, `title`, `issuerName`, `topic`, `level`, `description`, `artworkKey`, numeric `estimatedMinutes`, boolean `certificateEligible`, and `modules`. Each module has `id`, `title`, and ordered string arrays `lessonIds` and `assignmentIds`. |
| `lessons` | Array of objects with `id`, `courseId`, `title`, numeric `estimatedMinutes`, and string array `paragraphs`. |
| `assignments` | Array of objects with `id`, `courseId`, `title`, `instructions`, `type` (`quiz`), numeric `estimatedMinutes` and `passingPercent`, optional timestamp `dueAt`, and `questions`. Each question has `id`, `prompt`, `correctOptionId`, and `options`, an array of objects with `id` and `label`. |
| `enrollments` | Array of objects with `id`, `learnerId`, `courseId`, `status` (`in_progress`, `withdrawn`, or `completed`), numeric `progressPercent`, timestamps `createdAt` and `updatedAt`, and optional timestamps `completedAt`, `withdrawnAt`, and `reenrolledAt`. |
| `lessonCompletions` | Array of objects with `id`, `learnerId`, `enrollmentId`, `courseId`, `lessonId`, `status: "completed"`, and timestamp `createdAt`. |
| `assignmentAttempts` | Array of objects with `id`, `learnerId`, `enrollmentId`, `courseId`, `assignmentId`, `status` (`passed` or `failed`), numeric `attemptNumber` and `scorePercent`, timestamp `createdAt`, and `answers`, an ordered array of objects with `questionId` and `optionId`. |
| `certificates` | Array of objects with `id`, `learnerId`, `enrollmentId`, `courseId`, `courseTitle`, `learnerName`, `issuerName`, `verificationCode`, `status: "issued"`, and timestamp `createdAt`. Names are issuance snapshots. |
| `certificateActions` | Array of objects with `id`, `learnerId`, `certificateId`, `courseId`, `type` (`download` or `copy_link`), `status: "completed"`, timestamp `createdAt`, and either `fileName` or `verificationPath`, according to type. |

### Default IDs

| Scenario | Course | Enrollment | Reading | Quiz |
| --- | --- | --- | --- | --- |
| Available to enroll | `course-film-scene` | Created on enrollment | `lesson-film-scene-01` | `assignment-film-scene-01` |
| Failed quiz ready to retake | `course-archive` | `enrollment-archive` | `lesson-archive-01` | `assignment-archive-01` |
| Ready to finish | `course-museum-meaning` | `enrollment-museum-meaning` | `lesson-museum-meaning-01` | `assignment-museum-meaning-01` |

The default learner is `learner-001` (Maya Chen). The archive fixture includes `completion-archive-01` and `attempt-archive-1`. An example issued credential is `certificate-museum-5` with code `CRS-0005-R`.

## Minimal Inject Example

Use this state in the `set` payload to render a single enrollable course and a reading. Empty arrays explicitly replace the corresponding seed collections.

```json
{
  "learner": { "id": "learner-audit", "displayName": "Sam Reed" },
  "courses": [
    {
      "id": "course-audit",
      "title": "Reading an Exhibition",
      "issuerName": "Field Studies Studio",
      "certificateEligible": true,
      "modules": [
        { "id": "module-audit", "title": "Observation", "lessonIds": ["lesson-audit"], "assignmentIds": [] }
      ]
    }
  ],
  "lessons": [
    {
      "id": "lesson-audit",
      "courseId": "course-audit",
      "title": "Begin with the label",
      "paragraphs": ["Write down one fact the exhibition label gives you about the object."]
    }
  ],
  "assignments": [],
  "enrollments": [],
  "lessonCompletions": [],
  "assignmentAttempts": [],
  "certificates": [],
  "certificateActions": []
}
```

## Observable State Changes (for LLM evaluation)

| User action | Changed keys and fields |
| --- | --- |
| Confirm **Enroll** | Append to `enrollments` with new `id`, active `learnerId`, selected `courseId`, `status: "in_progress"`, `progressPercent: 0`, `createdAt`, `updatedAt`. An existing enrollment blocks a second insert. |
| Confirm **Unenroll** | Update the active `enrollments` row's `status` to `withdrawn` and set `withdrawnAt`, `updatedAt`. Attempts and reading completions remain available on rejoining. |
| Confirm **Re-enroll** | Update that `enrollments` row's `status` to `in_progress`, set `withdrawnAt: null`, `reenrolledAt`, and `updatedAt`. |
| **Mark complete** | Append to `lessonCompletions` with new `id`, `learnerId`, `enrollmentId`, `courseId`, `lessonId`, `status: "completed"`, `createdAt`. Update the linked enrollment's `progressPercent` and `updatedAt`. The same enrollment and lesson can have one completion. |
| Confirm **Submit quiz** | Append to `assignmentAttempts` with new `id`, linked IDs, ordered `answers`, next `attemptNumber`, `scorePercent`, `status` and `createdAt`. Update the linked enrollment's `progressPercent` and `updatedAt`. Opening a retake changes only the form. |
| Confirm **Finish course** | Set the linked `enrollments` row's `status: "completed"`, `progressPercent: 100`, `completedAt`, and `updatedAt`. If the course is eligible and the learner has no credential for it, append one `certificates` row with the fields above in the same save. |
| **Download PDF** | On download initiation, append to `certificateActions` with new `id`, linked IDs, `type: "download"`, `status: "completed"`, `createdAt`, and `fileName`. |
| **Copy verification link** | On successful copy, append to `certificateActions` with new `id`, linked IDs, `type: "copy_link"`, `status: "completed"`, `createdAt`, and relative `verificationPath`, including `?sid=` when present. The clipboard gets the absolute same-origin URL. |
| Read, filter, navigate, cancel, fail validation, or wait | No business writes. Opening or refreshing the certificate and verification pages is read-only after the initial load. |

Progress is the rounded percentage of unique module requirements fulfilled. A linked reading counts once, and a quiz counts once after a passing attempt. Attempts are graded against the recorded options and compared to the threshold before rounding the stored score to two decimal places. Finishing requires at least one linked requirement and fulfillment of every requirement, including across repeated module references. Unresolved requirements block finishing. Only an active enrollment accepts work.

The default fixture includes 64 courses, 36 enrollments, 96 readings, 64 assignments, 60 quiz attempts, 60 reading completions, and 24 issued certificates.

