# Twitch Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5359  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Route paths exercised, including recovery | 8 |
| Seed workflows passed | 4 of 4 |
| Persisted actions verified through /go per run | 23 |
| Open P0 findings | 1 |
| Open P1 findings | 2 |

Installed Chromium ran through Node Playwright from PILOT_PLAYWRIGHT. The same workflow suite passed against the Vite app and the npm run build output. The built-assets run fulfilled browser asset requests from dist/ and used the localhost Harbor state endpoints on port 5359.

## ✅ Passing Tests

- The root and Overview, Stream Settings, Video Producer, Moderation, Schedule and its alias, and the unknown-route recovery path loaded. Browser back and forward, the Twitch link, horizontal navigation and the Ctrl+/ finder kept the session ID. Each named route also loaded and hard-refreshed with empty replacement arrays.
- Each workflow run sent one baseline POST and 23 user-driven POSTs. Invalid and cancelled forms, selection, filters, navigation, reloads and six seconds of idle added zero POSTs. The session isolation probe wrote a marker in another session and verified that reset restored its initial snapshot.
- The default /go baseline had 24 categories, 36 videos, 32 viewers, 48 messages, 30 moderation actions and 30 schedule entries. A separate injected world with 240 videos and 220 viewers rendered, filtered and saved a sparse video edit. Round 1 also verified a singleton with dangling references and confirmed that a sparse edit preserved unknown properties and absent optional fields.
- There were zero uncaught page errors, console errors or remote requests in both workflow runs. The unchanged dataManager.js matched its template by SHA-256.
- The five main views fit at 390px without page-level horizontal overflow. Desktop captures matched the site's original editorial design in DESIGN.md, including the text wordmark, synthetic account, and CSS-generated cover art.

### Workflow results

The table includes controls exercised in both rounds. Each action's domain change and corresponding audit record were read from /go.


| Workflow | Verified UI behavior | Observed `/go` fields |
| --- | --- | --- |
| Edit Stream Info | Escape and Cancel discarded drafts, and Escape returned focus. Whitespace-only title and a duplicate custom tag were rejected. Category search, the notification counter, language, tags and a classification label worked. Both the Overview and refreshed Stream Settings displayed the committed title. | `streamSettings.title, goLiveNotification, categoryId, language, tags, classificationLabels, updatedAt`. `stateChanges[]` contained `update_stream_info`, target `stream-001`, actor `creator-001`, and matching before/after fields. |
| Save VOD Defaults | Disabling storage disabled the dependent controls while retaining chosen preferences. The values persisted on reload. | `streamSettings.storePastBroadcasts = false`, `alwaysPublishVods = true`, `excludedCategoryIds = ["cat-music","cat-photo"]`, and `updatedAt`. `stateChanges[]` contained `update_vod_settings`. `videos[]` was identical before and after. |
| Find and edit a video | Exercised search by title and description, type and visibility filters, sort controls, 12-row pages, reset after empty results, and the row menu. Saved a title, description, category and language on the same recording. | `video-011` retained its ID, 384 views and 4,235-second duration. `videos[].title`, `description`, `categoryId`, `language`, and `updatedAt` changed. `stateChanges[]` contained `update_video`. |
| Publish, unpublish and delete videos | Unpublished a single recording. Bulk publish skipped a recording already published. Bulk unpublish and delete each affected two recordings, with one save per action. The delete dialog displayed the selected count or single title. Deleted recordings disappeared. | `videos[].status, publishedAt, updatedAt` changed on publication actions. Unpublish cleared `publishedAt`. Deleted rows had `status = deleted` and `deletedAt = updatedAt`. `publish_video`, `unpublish_video` and `delete_video` events targeted the affected IDs. |
| Restrict viewers and reverse restrictions | Filtered banned viewers and searched by login. An expired timeout displayed as clear. Applied a custom 900-second timeout, removed it, timed out the viewer again, banned the timed-out viewer, and unbanned them. The log retained the restriction and reversal history. | `viewers[].restriction` and `updatedAt` tracked the changes. `modActions[]` contained `timeout`, `untimeout`, `ban` and `unban` with actor and viewer IDs, trimmed reason, expiry, duration, resulting status, and related action IDs where applicable. |
| Delete chat message | Cancelled then confirmed deletion of the selected message. The viewer card marked it removed and the action log found the deletion by viewer and action type. | `chatMessages[msg-001].status = deleted` with `deletedAt` and `deletedBy = creator-001`. `modActions[]` contained `delete_message` linked to `viewer-001` and `msg-001`. |
| One-time schedule | Month navigation and Today worked. Add Stream used the selected date and rejected a 25-minute duration. Edited, cancelled, restored and deleted the saved stream. | `scheduleEntries[]` stored title, category, UTC `startsAt`, `America/New_York`, duration, `recurrence = once`, `weekday = null` and timestamps. The edit changed `title`, `durationMinutes`, and `updatedAt`. Cancel and restore changed `status` and `updatedAt`. Delete also populated `deletedAt`. The lifecycle recorded `create_schedule_entry`, `update_schedule_entry`, `cancel_schedule_entry`, `restore_schedule_entry` and `delete_schedule_entry`. |
| Weekly schedule | Created Saturday and Sunday series in one form and one save. The Sunday series displayed at 6 PM before and after the March 2027 daylight-saving transition. Cancelled and restored March 7 while March 14 stayed scheduled, then edited and removed only the Sunday series. | Two `scheduleEntries[]` rows with weekdays 6 and 7 and two creation events. `scheduleExceptions[]` upserted a single row for the Sunday entry and March 7, with `cancel_occurrence` and `restore_occurrence` events. The exception stored `id`, `entryId`, `occurrenceDate`, `status`, `createdAt`, and `updatedAt`. The Sunday series edit changed `title` and `updatedAt`, and deletion changed `status`, `deletedAt`, and `updatedAt`. Its exception survived deletion. The Saturday record stayed identical. |
| Vacation Mode | Rejected a reversed range. A valid range appeared on the agenda and persisted after reload. | `scheduleSettings.vacationEnabled = true`, `vacationStartDate = 2027-03-06`, `vacationEndDate = 2027-03-09`, and `updatedAt`. `stateChanges[]` contained `update_vacation`. Existing schedule rows were identical before and after. |

## ❌ Bugs for Dev Agent

### AUDIT-001 · P0 · Reload can drop an acknowledged save

| Field | Result |
| --- | --- |
| Route | /settings/stream |
| Action | Save a title while Playwright holds the previous save's server response. Reload after the second title is visible. |
| Expected | Harbor receives both updates and keeps the latest title. |
| Actual | The UI and local cache kept the second title. /go held the first title and one update event. |
| Fix hint | Recover an unacknowledged user save after reload while preserving request order. |

### AUDIT-002 · P1 · Timeout expiry leaves a stale action on screen

| Field | Result |
| --- | --- |
| Route | /moderation |
| Action | Advance Chromium's clock past the active timeout, then click Remove Timeout. |
| Expected | The UI switches to Clear and shows the actions available to a clear viewer. |
| Actual | The action produced no visible response. The card continued showing Remove Timeout and /go showed no new moderation event. Typing in viewer search refreshed the card. |
| Fix hint | Refresh the displayed status when the active timeout expires. |

### AUDIT-003 · P1 · Overview misses a future stream

| Field | Result |
| --- | --- |
| Route | / |
| Action | Inject one scheduled stream 90 days after the browser's clock and open Overview. |
| Expected | The next-stream card shows the eligible stream. |
| Actual | /go contained the event. The card displayed “No upcoming streams.” |
| Fix hint | Derive the next eligible occurrence from the scheduled entries and their exceptions. |

See [AUDIT.md](AUDIT.md) for the original reproductions and source locations.

## Round History

### Round 1 → Round 2

- All four seed workflows passed again on both the development app and built assets.
- AUDIT-001, AUDIT-002 and AUDIT-003 reproduced again in fresh local sessions.
-

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `160064`. The local evidence is `factory/build/dyn_certify/160064/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `moderators → 0 → login`.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Fixed and retested.** The delayed first server response showed no early confirmation. After both successful stream title changes, a hard reload preserved the second title and both audit events.

Docker dynamic certification run `175552` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
