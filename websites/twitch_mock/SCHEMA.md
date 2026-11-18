# twitch_mock Schema

**Base URL** — `http://localhost:5359/`  
**Go Endpoint** — `GET /go?sid=<sid>` returns `{initial_state, current_state, state_diff}`  
**Inject** — `POST /post?sid=<sid>` with `{"action":"set","state":{...}}` before opening the site with that session ID  
**Reset** — `POST /post?sid=<sid>` with `{"action":"reset"}` restores the server's initial snapshot. Use a fresh browser context to read it without the previous browser cache.

## State Schema

The state object contains plain JSON. IDs are strings. Timestamps are ISO UTC strings, and schedule calendar dates use the ISO `YYYY-MM-DD` format. Optional keys carry a `?` suffix. Unrecognized fields are preserved on record edits.

| Key | Type | Description |
| --- | --- | --- |
| `account` | object | `id, login, displayName, channelName, tier` |
| `moderators` | array | `id, login, displayName` |
| `categories` | array | `id, name, artworkKey?` |
| `streamSettings` | object | `id, title, goLiveNotification, categoryId, language, tags[], classificationLabels[], storePastBroadcasts, alwaysPublishVods, excludedCategoryIds[], updatedAt`. Storage and publishing flags are booleans. Tags, labels and category IDs are strings. |
| `videos` | array | `id, title, description?, categoryId, language, type, status, durationSeconds, viewCount, artworkKey?, createdAt, updatedAt, publishedAt, deletedAt?`. Type is `past_broadcast`, `highlight`, or `upload`. Status is `published`, `unpublished`, or `deleted`. Counts are integers. Publication time may be null. |
| `viewers` | array | `id, login, displayName, joinedAt?, updatedAt?, restriction`. Restriction is null or `{type, reason, startedAt, expiresAt, actionId}`. Type is `ban` or `timeout`. A ban has a null expiry. |
| `chatMessages` | array | `id, viewerId, text, createdAt, status, deletedAt?, deletedBy?`. Status is `visible` or `deleted`. |
| `modActions` | array | `id, action, actorId, viewerId, messageId?, reason, durationSeconds?, expiresAt?, relatedActionId?, resultingStatus, createdAt`. Status is `timed_out`, `banned`, `clear`, or `deleted`. A timeout stores its whole-second duration and expiry. A restriction change may link the previous active restriction. |
| `scheduleSettings` | object | `id, timezone, vacationEnabled, vacationStartDate, vacationEndDate, updatedAt`. Timezone is an IANA name. Vacation dates are nullable and the range is inclusive. |
| `scheduleEntries` | array | `id, title, categoryId, startsAt, timezone, durationMinutes, recurrence, weekday, status, createdAt, updatedAt, deletedAt?`. Recurrence is `once` or `weekly`. Weekday is null or ISO 1–7. Status is `scheduled`, `cancelled`, or `deleted`. |
| `scheduleExceptions` | array | `id, entryId, occurrenceDate, status, createdAt, updatedAt`. One row per entry and local occurrence date. Status is `cancelled` or `restored`. |
| `stateChanges` | array | `id, action, actorId, targetType, targetId, status, changes, createdAt`. Status is `applied`. Each changed field maps to `{from,to}`. A missing prior value is represented by null. |

### Default IDs

- Account `creator-001`, moderators `moderator-001` and `moderator-002`, stream settings `stream-001`, schedule settings `schedule-001`.
- Categories `cat-art`, `cat-makers`, `cat-photo`, `cat-music`, `cat-talk`, `cat-chat`, `cat-pottery`, `cat-books`, `cat-print`, `cat-drawing`, `cat-paint`, `cat-textiles`, `cat-design`, `cat-film`, `cat-travel`, `cat-food`, `cat-history`, `cat-science`, `cat-wood`, `cat-writing`, `cat-illustration`, `cat-sculpture`, `cat-garden`, and `cat-archive`.
- Record ranges `video-001`–`video-036`, `viewer-001`–`viewer-032`, `msg-001`–`msg-048`, `mod-action-001`–`mod-action-030`, and `slot-001`–`slot-030`. Seeded exception IDs combine an entry ID and its derived local occurrence date, such as `slot-001:YYYY-MM-DD`.

## Minimal Inject Example

The following request body replaces the video library with one recording. Harbor fills omitted top-level fields from the defaults on first load.

```json
{
  "action": "set",
  "state": {
    "videos": [
      {
        "id": "audit-video-001",
        "title": "Studio proofs",
        "type": "past_broadcast",
        "status": "unpublished",
        "categoryId": "cat-art"
      }
    ]
  }
}
```

## Observable State Changes

Every row below describes one whole-state save per successful user submission. Bulk operations include one event per affected record. Events take `actorId` from `account.id` and share a timestamp with the domain change. `GET /go?sid=…` exposes `initial_state`, `current_state` and the Harbor top-level `state_diff` for that session.

| User action | Domain state written | Event |
| --- | --- | --- |
| Save Edit Stream Info | Changed `streamSettings` fields from `title, goLiveNotification, categoryId, language, tags, classificationLabels`, and `updatedAt` | `stateChanges.update_stream_info` targeting `streamSettings` |
| Save VOD Defaults | Changed `streamSettings` fields from `storePastBroadcasts, alwaysPublishVods, excludedCategoryIds`, and `updatedAt` | `stateChanges.update_vod_settings` targeting `streamSettings` |
| Save video details | Changed `videos[]` fields from `title, description, categoryId, language`, and `updatedAt` | `stateChanges.update_video` targeting `video` |
| Publish or unpublish videos | `videos[].status, publishedAt, updatedAt`. Unpublish clears `publishedAt`. | `stateChanges.publish_video` or `unpublish_video` targeting each `video` |
| Delete videos | `videos[].status = deleted, deletedAt, updatedAt` | `stateChanges.delete_video` targeting each `video` |
| Timeout or ban viewer | `viewers[].restriction, updatedAt` | `modActions.timeout` or `ban` with viewer, actor, reason, resulting status and applicable duration, expiry and prior action |
| Remove timeout or unban | `viewers[].restriction = null, updatedAt` | `modActions.untimeout` or `unban` with viewer, actor, resulting status and prior action |
| Delete chat message | `chatMessages[].status = deleted, deletedAt, deletedBy` | `modActions.delete_message` with both viewer and message IDs |
| Add streams | New `scheduleEntries[]` with `id, title, categoryId, startsAt, timezone, durationMinutes, recurrence, weekday, status, createdAt, updatedAt` | `stateChanges.create_schedule_entry` targeting each `scheduleEntry` |
| Edit stream or weekly series | Changed `scheduleEntries[]` fields from `title, categoryId, startsAt, timezone, durationMinutes, recurrence, weekday`, and `updatedAt` | `stateChanges.update_schedule_entry` targeting `scheduleEntry` |
| Cancel or restore one-time stream | `scheduleEntries[].status, updatedAt` | `stateChanges.cancel_schedule_entry` or `restore_schedule_entry` targeting `scheduleEntry` |
| Cancel or restore weekly occurrence | Upserts `scheduleExceptions[]` by `entryId, occurrenceDate` with `id, status, createdAt, updatedAt` | `stateChanges.cancel_occurrence` or `restore_occurrence` targeting `scheduleException` |
| Delete stream or weekly series | `scheduleEntries[].status = deleted, deletedAt, updatedAt` | `stateChanges.delete_schedule_entry` targeting `scheduleEntry` |
| Save Vacation Mode | Changed `scheduleSettings` fields from `vacationEnabled, vacationStartDate, vacationEndDate`, and `updatedAt` | `stateChanges.update_vacation` targeting `scheduleSettings` |

Searches, filters, drafts, selection, navigation, agenda projections and timeout expiry are presentation logic. They leave state unchanged. The baseline is initialized by the Harbor template and is separate from user mutations.
