# Patreon Mock — Test Report

> Round: 2
> Date: 2026-11-18
> Server: http://localhost:5365
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Route patterns tested, including fallback | 11 |
| Elements tested, grouped by workflow | 25 |
| ✅ Passed | 25 |
| ❌ Failed | 0 |
| ⚠️ Skipped (out of scope) | 0 |

The 25 checks comprise the 21 persisted actions and four read-only workflow groups below. The suite passed in installed Chromium with Node Playwright from `PILOT_PLAYWRIGHT` on the dev app and the built bundle. `npm run build` passed. For the built-bundle run, Playwright served the files from `dist/` on the same localhost origin and requests used the Vite state API.

## ✅ Passing Tests

- **Posts library and editor** — Combined status, audience, format, title search and sorting. Preview showed the actual seeded post body and local image, and a separate preview loaded 24-second local audio. Escape closed Preview and restored focus. The editor blocked invalid submission, accepted a title-only draft, scheduled and published with the selected tier and media, preserved publication time on edit, duplicated to a distinct draft, and soft-deleted only after confirmation. Reload restored the published edit.
- **Tiers list and editor** — Rejected empty and duplicate names and an over-precision price. Added and removed benefit inputs. Verified price edits on new and linked tiers. Linked tiers could be unpublished and republished with member pledges and post references intact. Unlinked tiers could be retired.
- **Members directory and detail** — Combined email search, type, tier, status, date filters and sorting. Selected a row, opened its detail, and verified the filtered CSV values and formula escaping on injected data. Rejected a whitespace-only note and verified adding, editing and removing notes. The `members` array matched its baseline.
- **Messages inbox and conversation** — Composed from member detail, the inbox and selected member rows. Reused an existing thread, opened a new thread for a former paid member, rejected submission without eligible recipients and handled a mixed selection. Verified the bulk confirmation count and looked up each linked message. Opening and reloading a conversation preserved read state. Search matched message text, explicit read toggles persisted, and replying preserved the unread flag.

### Observed state changes via /go

The table reports value differences between consecutive snapshots from `/go?sid=patreon_qa_1795009624456`. Existing actor fields sometimes retained the same value because the same creator performed each action.

| # | UI action | Collection and fields changed |
| ---: | --- | --- |
| 1 | Save new draft | Added a `posts` record with `id`, `authorId`, `title`, `body`, `format`, `mediaId`, `audience`, `tierIds`, `status`, `createdAt`, `updatedAt`, `updatedBy`, `scheduledAt`, `publishedAt`, `deletedAt` |
| 2 | Schedule the draft | `posts`: `format`, `mediaId`, `audience`, `tierIds`, `status`, `updatedAt`, `scheduledAt` |
| 3 | Publish now | `posts`: `status`, `updatedAt`, `scheduledAt` (cleared), `publishedAt` |
| 4 | Save published edit | `posts`: `body`, `updatedAt` |
| 5 | Duplicate as draft | Added a `posts` record with the fields in check 1, a new ID, and null scheduling and publication dates |
| 6 | Confirm post deletion | `posts`: `status`, `updatedAt`, `deletedAt` |
| 7 | Create tier | Added a `tiers` record with `id`, `name`, `description`, `monthlyPrice`, `currency`, `benefits`, `status`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `unpublishedAt`, `retiredAt` |
| 8 | Edit new tier price | `tiers`: `monthlyPrice`, `updatedAt` |
| 9 | Edit linked tier price | `tiers`: `monthlyPrice`, `updatedAt` |
| 10 | Confirm unpublish | `tiers`: `status`, `updatedAt`, `unpublishedAt` |
| 11 | Confirm republish | `tiers`: `status`, `updatedAt`, `unpublishedAt` (cleared) |
| 12 | Confirm tier retirement | `tiers`: `status`, `updatedAt`, `retiredAt` |
| 13 | Add member note | Added a `memberNotes` record with `id`, `memberId`, `authorId`, `body`, `createdAt`, `updatedAt`, `updatedBy`, `deletedAt` |
| 14 | Edit member note | `memberNotes`: `body`, `updatedAt` |
| 15 | Confirm note removal | `memberNotes`: `updatedAt`, `deletedAt` |
| 16 | Send from member detail | `threads`: `lastMessageAt`, `updatedAt`. Added one `messages` record with `id`, `threadId`, `senderId`, `recipientId`, `body`, `status`, `createdAt`, `batchId` |
| 17 | Mark conversation unread | `threads`: `unreadCount`, `readAt` (cleared), `updatedAt` |
| 18 | Send reply | `threads`: `lastMessageAt`, `updatedAt`. Added one `messages` record with the fields in check 16 |
| 19 | Mark conversation read | `threads`: `unreadCount`, `readAt`, `updatedAt` |
| 20 | Send from inbox to a former paid member | Added one `threads` record with `id`, `memberId`, `creatorId`, `createdAt`, `unreadCount`, `readAt`, `lastMessageAt`, `updatedAt`, `updatedBy`. Added one `messages` record with the fields in check 16 |
| 21 | Send to selected members | `threads`: `lastMessageAt` and `updatedAt` for two threads. Added two `messages` records with the fields in check 16 and assigned their `batchId`. Added one `messageBatches` record with `id`, `senderId`, `body`, `recipientIds`, `threadIds`, `messageIds`, `recipientCount`, `status`, `createdAt` |

| Read-only group | Observable state change |
| --- | --- |
| Posts search, filters, sorting and media preview | None |
| Tier dependencies, editor validation and canceled availability confirmation | None |
| Member filters, selection, detail navigation and CSV | None |
| Message search, opening a conversation and canceled or rejected sends | None |

### Harbor runtime

- Observed one baseline `set` and exactly one `set_current` for each of the 21 accepted actions in each main run. The final diff contained `posts`, `tiers`, `memberNotes`, `threads`, `messages` and `messageBatches`. The copied client state manager matched the shared template byte for byte.
- Tested direct visits and hard reloads across the 10 declared route patterns and the fallback, including missing record links. Independent sessions rendered empty collections, single records with missing optional fields, and lists of up to 350 posts, 230 tiers, 330 members and 310 conversations.
- Confirmed session isolation and baseline reset via `/state`, `/post` and `/go`. Filter changes retained `sid`. A second tab in the populated session emitted zero writes on load or during 2.6 seconds idle. An elapsed schedule remained scheduled until an explicit Save draft, which set `posts.status` and cleared `posts.scheduledAt` while keeping an unknown injected key.
- Browser checks observed zero page errors, failed HTTP responses or off-origin requests. The CSV used a local download blob.

## ❌ Bugs for Dev Agent

No open findings from this run.

## Visual Alignment Feedback

Reviewed desktop captures of Posts, its editor, Tiers, Members and a conversation against the site's original design brief. Reviewed the mobile Posts library and checked the main lists, creation forms, member profile and conversation for page-level horizontal overflow at 320 px. Mobile Messages provided a working Back to conversations link.

## Round History

### Round 1 → Round 2

- AUDIT-001 fixed. In a frozen-clock session, two replies with reverse-sort IDs appeared in stored send order. `/go` confirmed both records shared the timestamp, and the second reply remained the inbox snippet after reload.
- AUDIT-002 fixed. With Chromium in Los Angeles, the UTC date agreed in the member directory, detail, both filter bounds and CSV for a near-midnight injected timestamp.
- AUDIT-003 fixed. At 320 px the note Edit and Remove buttons measured at least 40 px high, and dialog Close and notification Dismiss measured at least 40 × 40 px and responded to clicks.

Docker dynamic certification and committing are pending in the parent runner.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `152404`. The local evidence is `factory/build/dyn_certify/152404/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `media → 0 → name`.
