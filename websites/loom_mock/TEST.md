# Loom Mock — Test Report

> Round: 2
> Date: 2026-11-18
> Server: http://localhost:5407
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested | 7 |
| Elements tested (grouped by behavior) | 16 |
| ✅ Passed | 16 |
| ❌ Failed | 0 |
| ⚠️ Skipped (out of scope) | 0 |

Chromium tested the root, library, folder index, folder detail, video detail, archive and fallback routes. The main session started with 48 videos, 24 folders, 72 comments and 8 users. It made one baseline `set` and 25 successful user-driven `set_current` requests. The test read `/go?sid=…` before and after each mutation and verified that `initial_state` stayed stable. The browser reported no page errors or off-localhost requests. The updated application also passed `npm run build`. The parent runner handles Docker dynamic certification.

## ✅ Passing Tests

| Route and behavior | Browser result and fields verified via `/go` |
| --- | --- |
| Library browse, sort and search | Root-only recordings, title and duration sort, case-insensitive search across folders and filed video descriptions, typed location labels, no-results state and clear control. No state changes. |
| Video create and play | Verified blank-title validation, cancel, trimmed input, current folder as the default destination, 56-second local playback and session-aware clipboard link. Create appended `videos[]` with `id`, `title`, `description`, `folderId`, `ownerId`, `sampleKey`, `durationSeconds`, `status`, `createdAt`, `updatedAt` and `updatedBy`. |
| Video edit, rename and duplicate | Edit changed `title`, `description` and `updatedAt`. Rename changed `title` and `updatedAt`. Duplicate created a new `videos[]` record with its own `id`, prefixed `title`, current `ownerId`, fresh timestamps, the source location and media fields, and no copied comments. |
| Video move | Verified the current destination, disabled no-op move, move to My Library with `folderId: null`, then move back to the folder. Search and reload reflected the new location. Move changed `videos[].folderId` and `updatedAt`. |
| Video archive, restore and delete | Archive changed `videos[].status`, `archivedAt` and `updatedAt` and blocked playback on direct visit. Restore set `status: active`, `archivedAt: null` and `updatedAt`. It retained the original active folder or changed `folderId` to null if the former folder was archived. Confirmed permanent deletion changed `status`, `deletedAt` and `updatedAt` on the video and its remaining active comments. Already-deleted and unrelated comments retained their state. |
| Folder create and rename | Rejected blank and case-insensitive duplicate names. Create appended `folders[]` with `id`, `name`, `ownerId`, `status`, `createdAt`, `updatedAt` and `updatedBy`. Rename changed `name` and `updatedAt`. The empty folder showed the video creation entry point and the library breadcrumb. |
| Folder archive and restore | Archive changed `folders[].status`, `archivedAt` and `updatedAt`. Its recordings kept their existing statuses and folder IDs, disappeared from active views, and reappeared on restore. A conflicting active folder name blocked restore. Successful restore set `status: active`, `archivedAt: null` and `updatedAt`. |
| Folder permanent deletion | Confirmation showed the affected video count. One save changed `status`, `deletedAt` and `updatedAt` on the folder, its retained video and the remaining active comment. |
| Comment post, reply and seek | Posting appended `comments[]` with `id`, `videoId`, `parentId: null`, `authorId`, `body`, `timestampSeconds: 13`, `status`, `createdAt`, `updatedAt` and `updatedBy`. Reply used the same fields with the parent's ID and a null timestamp. Seeking moved the player without saving, including when the timestamp exceeded the sample duration. |
| Comment edit and delete | Owned reply edit changed `comments[].body`, `editedAt` and `updatedAt`. Owned post and reply deletion changed `status`, `deletedAt` and `updatedAt`. Deleting a post with a reply retained the reply under a deleted-thread marker. Teammate edit and delete controls were absent. |
| Bulk selection, move and archive | Checkbox selection and cancel updated the UI. Batch move saved once and changed `folderId` and `updatedAt` on both selected videos. Batch archive changed `status`, `archivedAt` and `updatedAt` on the selected video. |
| Navigation and keyboard | Verified folder panel link, folder and archive rows, breadcrumbs, wordmark, encoded video ID and reload, dialog Escape and focus return, and comment menu Enter and Escape. Navigation and canceled dialogs left persisted state unchanged. |
| Harbor isolation, reset and injection | Verified session propagation, API reset, empty collections, missing optional fields and links, an orphan reply at 0:00 and a 350-video library. Extra injected data survived a mutation. An idle tab sent no writes and displayed the active tab's saved folder after reload. |
| Duration sort regression | A video missing `durationSeconds` used its local sample's 1:13 duration and sorted above a stored 0:35 video. The full `/go` response stayed the same through sorting and navigation. |
| Responsive controls regression | The library fit at 300, 390, 619, 620, 621, 650, 880 and 881px with search, selection mode and a recording selected. |
| Icon target regression | Clear search and the comment action trigger met the 36 × 36px minimum and displayed keyboard focus. |

Each mutation assigned the signed-in actor to `updatedBy`. The before-and-after trace recorded that field as changed when the old actor differed or was absent.

## ❌ Bugs for Dev Agent

No open issues observed in this round.

## Visual Alignment Feedback

Reviewed desktop captures of the library, folder index, folder detail, video detail and archive, plus the 390px library, against the original design in `DESIGN.md`. The masthead, recording grid, folder panel and player with discussion rendered with the bundled original media and text wordmark.

## Round History

### Round 1 → Round 2

- AUDIT-001 fixed. Longest first uses the same duration as the card.
- AUDIT-002 fixed. The masthead search can shrink and recording controls can wrap.
- AUDIT-003 fixed. Search and comment icon controls use 36px minimum targets.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `159672`. The local evidence is `factory/build/dyn_certify/159672/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `users → 0 → name`.
