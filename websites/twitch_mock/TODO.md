# Twitch creator workspace — TODO

> Status: DEV COMPLETE  
> Last updated by plan agent on 2026-11-18  
> Read [DESIGN.md](DESIGN.md), [research](assets/README.md), [state model](assets/data_model.md), [SEED.md](SEED.md), and the [Harbor contract](../../HARBOR_CONTRACT.md).

Status markers are `[ ]` queued, `[~]` in progress, and `[x]` complete.

## P0 — App shell and runtime

- [x] **Vite + React.** Include the npm lockfile and an offline production build. Use localhost port `5359` with `strictPort`. On Windows, start a persistent server via `Start-Process -WindowStyle Hidden` with the absolute `node_modules/vite/bin/vite.js` entry point and the site as working directory. Put test scratch in an ignored directory or remove it after use.
- [x] **Creator account and navigation.** Render the synthetic `@fieldnotelive` account with the text wordmark “Twitch”, an Overview, and four visible destinations. Routes are `/` and `/stream-manager` (overview with stream summary and Edit Stream Info), `/settings/stream`, `/content/video-producer`, `/moderation`, and `/schedule` (also available at `/settings/channel/schedule`). Keep `sid` through router links, aliases, and back/forward. Use `withSid()` for links that leave the router. Include a working recovery link on unknown paths. Every route and hard reload receives the same providers. See [DESIGN.md](DESIGN.md) for layout and responsive rules.
- [x] **State boot and writes.** Import unchanged `templates/state-api.js` in `vite.config.js` and copy unchanged `templates/dataManager.js` to `src/utils/dataManager.js`. Await `loadState('twitch', createInitialData)` behind a neutral loader. Wire `saveState('twitch', nextState)` once at the store boundary for each successful user mutation, including one snapshot per bulk operation. The template owns HTTP `/state`, `/post`, and `/go`; `/go` returns JSON. Editor drafts, searches, filters, selection, rendering, and elapsed time cause zero writes. Give each committed operation an actor, timestamp and target id. Handle replacement arrays, missing optional fields, and dangling references without dropping valid injected records or saving fallbacks.
- [x] **Verifier documentation.** Publish and maintain `SCHEMA.md` for the implemented shapes, including an **Observable State Changes** table. After `npm run build`, verify every navigation path and the P1 workflows with Node Playwright (`PILOT_PLAYWRIGHT`, installed Chromium), using distinct local `sid`s. Probe injected empty, singleton and large collections, separate sessions, reload after changes, and idle after baseline with zero writes. Record actual `/go` fields, UI outcomes, and any gaps in `TEST.md`. The runner handles Docker certification and commits after the test report.

## P1 — Seed workflows

- [x] **Stream settings: Edit Stream Info.** From Overview and Stream Settings, open the same form with title, Go Live Notification (counter), searchable category, language, up to 10 custom tags, and Content Classification Labels. Trim text and validate before saving. Cancel and Escape discard drafts. A successful changed Save updates `streamSettings.title`, `goLiveNotification`, `categoryId`, `language`, `tags`, `classificationLabels` and `updatedAt` as applicable, and appends a `stateChanges` record with `action: update_stream_info` and the exact changed fields. Confirm the summary and deep-link view display the same committed values.
- [x] **Stream settings: VOD defaults.** In Stream Settings, edit Store Past Broadcasts, Always Publish VODs, and Excluded Categories with explicit Save. Keep dependent preferences visible and disabled when storage is off, with an explanation. Existing video publication is independent of these defaults. A successful change updates `streamSettings.storePastBroadcasts`, `alwaysPublishVods`, `excludedCategoryIds` and `updatedAt` as applicable, and appends `stateChanges.action: update_vod_settings`.
- [x] **VODs: Find and edit videos.** Video Producer lists thumbnails, titles, durations, categories, type, visibility, date, and views. Search title/description and filter by type and visibility, sort by newest, views or duration, and paginate at 12 per page. Offer a scoped row menu and details editor for title, description, category and language. Save updates the matching `videos[]` fields and `updatedAt`, and appends `stateChanges.action: update_video` with its id. Empty results offer Clear filters. Test that changing metadata preserves the video id and metrics.
- [x] **VODs: Publish, unpublish and delete.** Offer per-video and selected-row actions. Confirm deletion with title or count, use explicit confirmation verbs and reflect results immediately. Publish/unpublish sets `videos[].status`, `publishedAt` and `updatedAt`; delete sets `status: deleted`, `deletedAt`, `updatedAt` and hides the record from regular views. Append one `stateChanges` entry per affected video (`publish_video`, `unpublish_video`, or `delete_video`) in the same whole-state save. Clear selection on search, filter or page change, and skip selected rows already in the requested publication state.
- [x] **Mod actions: Find viewers, timeout, ban, unban.** Moderation pairs a searchable Viewer list/active Restriction filter with a selected viewer card and a filterable Mod Actions log. Provide a duration selector for Timeout, optional reason, and a confirmation for Ban. Unban removes an active ban and Remove Timeout clears an active timeout. Set `viewers[].restriction` and `updatedAt`, and append a `modActions` record with `viewerId`, action `timeout`, `ban`, `unban` or `untimeout`, reason, actor, `createdAt`, `durationSeconds`/`expiresAt` where applicable, and `resultingStatus`. Compute expired timeout state against the runtime clock without saving; support moving a timed-out viewer to banned. Verify history remains after reversal.
- [x] **Mod actions: Remove a chat message.** On a viewer's recent chat, show Delete Message for active messages and confirm the chosen message. Set its `chatMessages[].status: deleted`, `deletedAt`, and `deletedBy`, and append `modActions.action: delete_message` with both viewer and message ids. Reflect removal and keep the audit row visible. Cancel and opening the viewer card make zero writes.
- [x] **Schedule: Add and edit streams.** Use an agenda with month/range controls and an Add Stream form for title, category, date or weekday(s), time, duration and the displayed IANA channel timezone. Support One time and Weekly, and distinguish editing a dated stream from editing a weekly series. For multi-weekday creation, add one `scheduleEntries` row per weekday. Create and edit those rows with `startsAt`, `timezone`, `durationMinutes`, `recurrence`, `weekday`, `status`, category and title; add `createdAt`/`updatedAt` as applicable. Write a `stateChanges` entry (`create_schedule_entry` or `update_schedule_entry`) for each affected id. Validate dates, required fields and duration. Recurring projections across daylight saving preserve local wall-clock time.
- [x] **Schedule: Cancel, restore, delete and vacation mode.** Cancel or restore a one-time item by updating `scheduleEntries[].status` and `updatedAt`. For a weekly occurrence, use a `scheduleExceptions` row keyed by entry id and occurrence date, with status `cancelled` or `restored`, leaving the rest of its series visible. Confirm removing an entry/series and write `scheduleEntries[].status: deleted`, `deletedAt`, `updatedAt`. Vacation Mode saves `scheduleSettings.vacationEnabled`, date range and `updatedAt`, surfacing vacation dates without rewriting the agenda records. Append the relevant `stateChanges` entry for every mutation (`cancel_schedule_entry`, `restore_schedule_entry`, `cancel_occurrence`, `restore_occurrence`, `delete_schedule_entry`, `update_vacation`).

### Form validation

- Limit Go Live Notification to 140 characters. Require a nonblank stream title. Deduplicate custom tags case-insensitively and cap the list at 10.
- Use common timeout presets and allow a whole-second custom duration from 1 to 1,209,600. Limit reasons to 500 characters. A banned viewer can be unbanned before a timeout is applied.
- Limit schedule titles to 140 characters and duration to whole minutes from 30 to 1380. Default the agenda to the runtime's current month and prefill Add Stream from the selected date. Reject a vacation end date earlier than its start. [Schedule field limits](https://dev.twitch.tv/docs/api/reference/schedule#create-channel-stream-schedule-segment) · [Moderation field limits](https://dev.twitch.tv/docs/api/reference/moderation#ban-user) · [Notification limit](https://help.twitch.tv/s/article/how-to-use-go-live-notifications?language=en_US)

## P2 — Optional depth

- [x] **Quick navigation.** If needed after P1, offer a keyboard-accessible local destination finder indexed to the four workflows. `Ctrl+/` focuses the finder. Search and navigation write no state.

## Data seed

- [x] Implement `src/data/seed.js` with fixed ids, English content and linked fixtures. Include one creator and two moderators, 24 categories, 36 videos, 32 viewers, 48 chat messages, 30 moderation actions, 30 schedule entries, and several occurrence exceptions. Mix video types and visibility, active and expired restrictions, one-time and weekly streams, and past and future dates. Use the seed matrix and samples in [assets/data_model.md](assets/data_model.md).

## Out of scope

Authentication, account switching, stream keys, actual broadcasting or ingest, real file uploads, media exports, monetization, public channel rendering, analytics, clips, highlight rendering, AutoMod configuration, and external integrations. Use original local artwork and synthetic fixtures throughout.








