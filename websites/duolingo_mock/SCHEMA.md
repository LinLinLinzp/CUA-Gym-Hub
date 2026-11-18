# duolingo_mock Schema

- **Base URL** `http://localhost:5369/`
- **Go endpoint** `GET /go?sid=<sid>` returns `initial_state`, `current_state`, and `state_diff`.
- **Current state** `GET /state?sid=<sid>` returns `stored_state`, `has_custom_state`, and `sid`.
- **Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`.
- **Reset** `POST /post?sid=<sid>` with `{"action":"reset"}` restores the initial snapshot.

Use the same SID in the page URL and API calls. The client sends one full snapshot with action `set_current` per accepted business action. Injected keys outside the schema are preserved.

## State Schema

All record IDs and references are strings. Quantities are numbers and timestamps are ISO 8601 UTC strings. A nullable date or reference can be absent in injected records.

| Key | Type | Record fields |
| --- | --- | --- |
| `profile` | object | id, displayName, username, activeCourseId (course ID or null), gems |
| `courses` | array | id, name, languageCode, baseLanguage, family, learners, description |
| `lessons` | array | id, courseId, order, title, prompt, options (array of strings), answerIndex (zero-based), xp |
| `enrollments` | array | id, actorId, courseId, status (enrolled or removed), run, xp, lessonsCompleted, createdAt, updatedAt, removedAt |
| `courseEvents` | array | id, actorId, courseId, enrollmentId, run, type (enrolled, switched, removed), previousActiveCourseId, activeCourseId, createdAt |
| `lessonAttempts` | array | id, actorId, courseId, lessonId, enrollmentId, run, status (completed), xp, perfect (boolean), createdAt |
| `goals` | array | id, actorId, label, metric (xp or lessons), cadence (daily or weekly), target, status (active or archived), createdAt, updatedAt, archivedAt |
| `goalEvents` | array | id, actorId, goalId, type (created, updated, archived), label, metric, cadence, target, createdAt |
| `goalProgress` | array | id, actorId, goalId, lessonAttemptId, metric, amount, createdAt |
| `friends` | array | id, displayName, username, courseName, mutual (boolean), eligible (boolean) |
| `friendQuests` | array | id, title, metric (xp, lessons, perfect_lessons), target, rewardGems, partnerId, status (available, active, completed, claimed, expired), startsAt, endsAt, joinedAt, completedAt, claimedAt |
| `questContributions` | array | id, questId, actorId, lessonAttemptId (nullable for historical partner rows), metric, amount, createdAt |
| `questNudges` | array | id, questId, actorId, recipientId, messageKey, message, status (sent), createdAt |
| `questEvents` | array | id, questId, actorId, partnerId, type (joined, completed, reward_claimed), amount (gems for claims, zero otherwise), createdAt |

### Default IDs

- Account `learner-avery`, active course `course-es`, enrollment `enrollment-es` (run 3), and next lesson `lesson-es-03`.
- Other enrolled courses `course-fr`, `course-it`, and `course-ja`. Removed enrollments `enrollment-de` and `enrollment-sv`.
- Goals `goal-daily-xp` and `goal-weekly-lessons`.
- Active quest `quest-team-xp` with `friend-maya`, joinable quest `quest-study-pair`, eligible partner `friend-liam`, and claimable quest `quest-weekend-review`.

## Minimal Inject Example

Send this as `state` in an injection to start from an empty account. Arrays replace the seeded collections. The profile object merges over defaults. With no enrolled courses, the account displays no active course.

```json
{
  "profile": {
    "id": "learner-test",
    "displayName": "Drew Ellis",
    "username": "drew",
    "gems": 0
  },
  "courses": [],
  "lessons": [],
  "enrollments": [],
  "courseEvents": [],
  "lessonAttempts": [],
  "goals": [],
  "goalEvents": [],
  "goalProgress": [],
  "friends": [],
  "friendQuests": [],
  "questContributions": [],
  "questNudges": [],
  "questEvents": []
}
```

## Observable State Changes (for LLM evaluation)

| User action | Fields written |
| --- | --- |
| Add course | Creates an `enrollments[]` record or reuses the removed enrollment `id` and original `createdAt`. Sets `actorId`, `courseId`, `run` (1 or previous run plus one), `status: enrolled`, `xp: 0`, `lessonsCompleted: 0`, `updatedAt`, and `removedAt: null`. Sets `profile.activeCourseId` and appends `courseEvents[]` with `type: enrolled`. |
| Switch course | Sets `profile.activeCourseId` and appends `courseEvents[]` with `type: switched`. |
| Confirm removal | Sets `enrollments[].status: removed`, updates `updatedAt` and `removedAt`, resets `xp` and `lessonsCompleted` to zero, updates `profile.activeCourseId` when needed, and appends `courseEvents[]` with `type: removed`. |
| Finish lesson | Appends `lessonAttempts[]` with `status: completed`. Increments `enrollments[].xp` and `lessonsCompleted` and sets `updatedAt`. Appends qualifying `goalProgress[]` and `questContributions[]`. Sets newly completed `friendQuests[].status: completed` and `completedAt` and appends `questEvents[]` with `type: completed` in the same snapshot. |
| Create goal | Appends `goals[]` with `status: active` and `archivedAt: null`, and appends `goalEvents[]` with `type: created`. |
| Edit goal | Updates `goals[].label`, `metric`, `cadence`, `target`, and `updatedAt`. Appends `goalEvents[]` with `type: updated` and the new settings. |
| Confirm goal archive | Sets `goals[].status: archived`, `updatedAt`, and `archivedAt`. Appends `goalEvents[]` with `type: archived`. |
| Choose and save partner | Sets `friendQuests[].partnerId`, `status: active`, and `joinedAt`. Appends `questEvents[]` with `type: joined`. |
| Confirm nudge | Appends `questNudges[]` with `status: sent`, the partner as `recipientId`, and the preset `messageKey` and `message`. |
| Claim reward | Sets `friendQuests[].status: claimed` and `claimedAt`, increments `profile.gems` by the nonnegative reward, and appends `questEvents[]` with `type: reward_claimed` and that `amount`. |
| Navigate, filter, change goal period, select practice answer, cancel, preview, repeat a claimed reward or already finished lesson, save a goal with identical settings, or leave a tab idle | No business records written. |

The account actor comes from `profile.id`. Records created by one action share its timestamp. Daily goal periods use UTC dates and weekly periods start on Monday UTC. Goal completion is derived from period progress. A historical period excludes goals with a known creation date at or after the period end. Quest date-window status and a fallback active course are derived for display.
