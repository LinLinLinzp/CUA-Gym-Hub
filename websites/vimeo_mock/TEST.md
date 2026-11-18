# Vimeo Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5360  
> Tested by: playwright agent using Chromium and the installed Node Playwright from `PILOT_PLAYWRIGHT`

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested, including recovery | 7 |
| SEED workflows tested | 4 |
| SEED workflows passed | 4 |
| Open bugs | 0 |

## ✅ Passing Tests

The primary run used sid `vimeo-mwm4iu57-workflow`. It started with 36 videos, 24 showcases, 72 comments, eight people, and no activity. The four workflows produced 18 state writes and 19 activity records. Each committed event contained an ID, type, target type and ID, actor ID, ISO timestamp, and structured details. The bulk membership action made one write and recorded two events. State assertions read `/go?sid=vimeo-mwm4iu57-workflow`.

| SEED workflow | Browser actions and fields verified through `/go` |
| --- | --- |
| Videos · Library | Opened the grid and list, combined search and privacy filtering, cleared zero results, sorted by title, and navigated through the row menu. These actions and an unchanged details save produced zero writes. Supplemental checks covered newest and duration sorting, menu Escape and focus restoration, and clearing bulk selection. |
| Videos · Upload | Validated an empty submission, selected local WebM footage, verified filename title prefilling, and uploaded from the dialog. A new `videos[]` record held `id`, `title`, `description`, `tags`, `thumbnailKey`, `durationSeconds`, `privacy`, `source`, `createdAt`, `createdBy`, `updatedAt`, and `updatedBy`. The source contained the matching byte count, `video/webm` content type, original and stored filenames, and a session-scoped file URL. `video.created` recorded the original filename and privacy mode. The uploaded preview loaded from its local file endpoint after reload. Drag and drop also prefilled the title, and closing that draft produced zero writes. |
| Videos · Edit and delete | Saving details changed `videos[].title`, `description`, `tags`, `updatedAt`, and `updatedBy`. `video.updated.details.changedFields` listed title, description, and tags, and the revised title survived reload. Canceling deletion left the video intact. Confirming removed `video_001` from `videos[]`, removed its six `reviewComments[]` records, and removed its ID from six `showcases[].videoIds` arrays while stamping those showcases. `video.deleted` stored the affected comment and showcase IDs. The deleted video URL showed recovery navigation. |
| Showcases · Create, edit, and delete | Combined title search and privacy filtering and cleared zero results. Creation appended a `showcases[]` record with `id`, `title`, `description`, `privacy`, empty `videoIds`, and creator and editor fields. `showcase.created` stored the selected mode and opened the editor. Editing changed the title and editor fields and appended `showcase.updated` with `changedFields: ["title"]`. Confirming deletion removed the showcase, appended `showcase.deleted` with its member IDs, and retained the member videos. |
| Showcases · Membership | Added `video_002` then `video_001` across separate picker searches. Existing members and boundary controls were disabled. Moved `video_001` up, removed it, and confirmed its video and comments remained. The editor retained the remaining member after reload. Each action changed `showcases[].videoIds`, `updatedAt`, and `updatedBy` and appended `showcase.videos_added`, `showcase.videos_reordered`, or `showcase.video_removed` with affected IDs and the final order. A supplemental run verified Move down. |
| Showcases · Bulk membership | Added one video from the Library to two showcases. One write updated both showcases’ `videoIds` and editor fields, and two `showcase.videos_added` events recorded the respective affected IDs and orders. |
| Privacy · Video | Saved Password with downloads enabled, then saved Embed only. `videos[].privacy.mode`, `password`, `allowDownloads`, and editor fields reflected the actions. `video.privacy_changed` recorded `previousMode`, `mode`, and the changed privacy fields. Embed only cleared the password and retained downloads. A supplemental run checked all five audience notes, rejected an empty viewing password, and confirmed that a saved Private mode appeared in the Library badge and filter. Escape canceled a draft, restored focus, and wrote nothing. |
| Privacy · Showcase | Canceling a Password draft left saved privacy intact. Saving Password and then Public updated `showcases[].privacy.mode`, `password`, and editor fields. The final password was null. Both `showcase.privacy_changed` events recorded the old and new modes and changed fields. The saved mode survived reload. |
| Review comments · Post and reply | Played and paused the eight-second clip, selected a 0:02 marker, and scrubbed by keyboard. Posting appended a trimmed `reviewComments[]` root with `videoId: "video_001"`, `parentId: null`, `timeSeconds: 2.1`, author and editor fields, open status, and null resolution fields. Replying appended a child with the same video ID, the root ID as `parentId`, and null time anchor. `comment.created` and `comment.replied` recorded the video, parent, and anchor. Supplemental checks covered blank comment and reply validation, timestamp removal, the All filter, and newest sorting. |
| Review comments · Resolve and reopen | Resolve changed both records’ `status`, `updatedAt`, `updatedBy`, `resolvedAt`, and `resolvedBy`. The Resolved filter exposed both records. Reopen returned both to open and cleared `resolvedAt` and `resolvedBy`. `comment.resolved` and `comment.reopened` recorded the video, affected IDs, and final status. The reopened thread and reply survived reload. |

### Harbor and rendering

- A fresh browser session sent one baseline `set`. No state writes were emitted during idle browsing or ordinary reload. A separate sid still contained the seed video deleted from the primary run. Internal routes and file URLs retained the sid.
- Tested `/`, `/videos`, video details, Review, showcase list and editor, and the unmatched-route recovery view. Direct links and hard reloads rendered. The main browser suites reported no off-origin requests.
- Injected empty catalogs, partial records, unknown authors, and unresolved member IDs. A 360-video catalog rendered and filtered at 375 px without horizontal overflow. A write from a partial world preserved its injected `taskKey`.
- Verified `set`, `set_current`, and `reset` against `/go`. A repeated `set` preserved the existing baseline, and reset restored it.
- `npm run build` passed. The copied state manager matched the Harbor template by SHA-256.

## ❌ Bugs for Dev Agent

No open bugs from this round.

## Visual Alignment Feedback

Compared local screenshots of the Library, video details, Review, showcase list, and showcase editor with the original design in `DESIGN.md`. Checked the paper canvas, aubergine masthead, local film artwork, layout spacing, and legibility. The responsive Library check used a 375 px viewport.

## Round History

### Round 1 → Round 2

- **AUDIT-001 fixed.** Held the first comment save response after Harbor received it. The workspace showed the pending state and disabled duplicate submission. Reload recovered the saved comment from Harbor, and a second comment saved normally after reload. A separate simulated 503 retained the draft and left activity empty until retry succeeded.
- **AUDIT-002 fixed.** Injected a video with no duration and an existing 45-second anchor. Its marker, timecode link, keyboard scrubber, and timestamp composer agreed. Posting persisted `reviewComments[].timeSeconds: 45` and the matching `comment.created` event while leaving video duration unset.
- **Favicon 404 fixed.** The console smoke check now passes with an existing original local image as the favicon.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `166272`. The local evidence is `factory/build/dyn_certify/166272/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `people → 0 → name`.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Previously fixed, retested.** The browser suite recovered pending feedback from Harbor after reload. It also verified that a rejected save retained the draft and succeeded on retry.

Docker dynamic certification run `125084` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
