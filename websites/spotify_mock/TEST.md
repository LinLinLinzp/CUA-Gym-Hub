# Spotify Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5355  
> Tested by: playwright agent  
> Browser: Chromium through the Node Playwright installation at `PILOT_PLAYWRIGHT`

WORKFLOWS: PASS

All four SEED workflows passed on the Vite dev server and against the built bundle served locally by Vite preview. Checks used separate synthetic sessions and inspected `GET /go?sid=<sid>` after each successful mutation. Invitation workflow checks used November 18, 2026 at 16:00 UTC.

## Summary

| Metric | Count |
| --- | ---: |
| Route patterns tested, including the fallback | 11 |
| SEED workflows passed | 4 |
| Open issues | 2 |

## ✅ Passing Tests

| Workflow | Browser checks | Observed fields in `current_state` |
| --- | --- | --- |
| Playlists | Rejected a whitespace-only name, checked Escape and focus restoration, created a public playlist with trimmed details, renamed it, selected a cover, and confirmed deletion by name. Added tracks by album search and from the catalog destination picker. Moved tracks with the Move up control and drag and drop. Removed a track and verified contiguous active positions. | Create populated `playlists[].id`, `ownerId`, `name`, `description`, `visibility`, `status`, `collaborative`, `createdAt`, and `updatedAt`. Edit changed `name` and `artKey`. Add populated `playlistItems[].id`, `playlistId`, `trackId`, `position`, `status`, `addedBy`, `createdAt`, `updatedAt`, and `updatedBy`. Moves changed `position` and removal changed `status` and set `removedAt`. Delete changed `playlists[].status` and set `deletedAt` and `deletedBy`. Linked cleanup changed `libraryEntries[].status`, `playlistCollaborators[].status`, and `playlistInvites[].status` with update timestamps and actor fields. Track history persisted. |
| Library | Saved a track from Browse, found and removed it from Liked Songs, and saved and removed an album across reload. Saved a read-only external playlist, found it using collection search, and removed it. Verified title sorting, type filters, and catalog search by artist and album. | Save populated `libraryEntries[].id`, `userId`, `targetType`, `targetId`, `status`, `createdAt`, `updatedAt`, and `updatedBy`. Removal updated `status` and reused the original entry ID. Album save left track relationships unchanged. |
| Follow | Followed Marble Hours, unfollowed from Following, and refollowed on the artist page. Toggled Inez Romero from her profile and verified her listing in Following. Checked the signed-in profile. | `follows[].id`, `followerId`, `targetType`, `targetId`, `status`, `createdAt`, and `updatedAt` recorded the new artist relationship. Unfollow and refollow updated `status` and reused the original relationship ID. |
| Collaborative playlists | Converted a public playlist to private collaboration. Generated a targeted link with seven-day expiry, copied it to the clipboard, and revoked it. Removed an editor while preserving past attribution. Cancelled and then confirmed disabling collaboration. Joined the seeded invite, verified Shared with you and editor-only track access, then added, moved, and removed a contributed track. Exercised used, expired, revoked and missing links. | Enable changed `playlists[].collaborative` and `visibility` and assigned `updatedAt`. Generation populated `playlistInvites[].id`, `token`, `playlistId`, `invitedBy`, `recipientId`, `status`, `createdAt`, `expiresAt`, `updatedAt`, and `updatedBy`. Join set `status`, `acceptedBy`, and `acceptedAt` on the invite and created a linked `playlistCollaborators[]` record with `id`, `playlistId`, `userId`, `inviteId`, `role`, `status`, `createdAt`, `updatedAt`, and `updatedBy`. Member removal and disabling closed the affected membership and invitation `status` fields. Collaborative track edits recorded `playlistItems[].addedBy` and `updatedBy`. |

## Harbor and browser checks

- One startup baseline `set` per fresh session and one `set_current` per successful business action. Invalid names, cancellation, unchanged saves, search, filtering, sorting, invitation views, copying, reloads, and idle time did not create business writes.
- Delayed the startup POST until Chromium showed the loading state, then released it and created the first playlist. The baseline retained 30 playlists and the current state held 31. A second tab on the same SID remained idle during the mutation and posted nothing in development. A separate SID retained its independent defaults. `GET /state` matched `/go` current state.
- Opened and reloaded every route against empty injected collections, including recovery views. Searched an injected 431-track catalog with missing optional links. Reordered and removed individual duplicate tracks by playlist item ID. Deleting the injected playlist closed its saved library entry, active collaborator, and pending invite in one write.
- Checked the library and a playlist at 390, 620, 768, and 1440 px without horizontal overflow. Reviewed desktop and mobile Chromium captures. Chromium reported zero page errors, and all browser requests used localhost.
- On the built bundle at 390 px, checked the keyboard skip link, dialog bounds and close button, primary and profile navigation, library shortcuts, Shared filter, all five Browse expansions, clearing a no-result search, and album-to-artist navigation. These interactions wrote only the baseline. Confirmed separate SID writes and reset through `/post` and `/go`. The browser reported zero console errors or HTTP failures on this pass.
- Confirmed the seed JSON round-trips, matches the required catalog counts, and includes 120 playlist items. Verified the read-only playlist, editor ownership, and self-follow guards in the action handler. The copied `src/utils/dataManager.js` matched the workspace template byte for byte.
- `npm run build` passed. Vite emitted two non-blocking dependency warnings about React Router's `"use client"` directives. Docker dynamic certification is delegated to the parent runner.

## Reproduction

Run from `websites/spotify_mock` in PowerShell. Use an unused SID for each fixture. The local scratch runner at `node_modules/.spotify-contract.cjs` loads Chromium from `PILOT_PLAYWRIGHT` and fixes the browser clock at `2026-11-18T16:00:00.000Z` for invitation checks.

```powershell
npm run build
$node = (Get-Command node).Source
$vite = (Resolve-Path node_modules/vite/bin/vite.js).Path
$dev = Start-Process -FilePath $node -ArgumentList ('"' + $vite + '" --configLoader native --host localhost --port 5355 --strictPort') -WorkingDirectory (Get-Location).Path -WindowStyle Hidden -PassThru
node node_modules/.spotify-contract.cjs
Stop-Process -Id $dev.Id
$preview = Start-Process -FilePath $node -ArgumentList ('"' + $vite + '" preview --configLoader native --host localhost --port 5355 --strictPort') -WorkingDirectory (Get-Location).Path -WindowStyle Hidden -PassThru
node node_modules/.spotify-contract.cjs
Stop-Process -Id $preview.Id
```

Wait for each listener before starting Chromium. With a fresh installation, use the workflow steps and state assertions above to recreate the ignored runner.

## ❌ Bugs for Dev Agent

### BUG-001 · P1 · Out-of-order saves lose a track in Harbor state

| Field | Value |
| --- | --- |
| Route | `/playlist/playlist-sunday` |
| Element | Add tracks |
| Action | Hold the first `set_current` request in Playwright, add a second track, wait for its POST, then release the first request. |
| Expected | `/go` retains both added tracks after both requests complete. |
| Actual | `/go` shows both tracks after the second request, then drops the second track when the first request completes. The dialog still shows both as added. Reproduced in development and preview. |
| Console errors | None. Both requests returned HTTP 200. |
| Fix hint | Preserve commit order for full-state writes while keeping the shared template unchanged. |

### BUG-002 · P2 · Default incoming invitation ages out of the seed

| Field | Value |
| --- | --- |
| Routes | `/library`, `/invite/kitchen-maya` |
| Action | Open a fresh SID with Chromium fixed at November 23, 2026. |
| Expected | The default world still offers a joinable invitation for the collaboration workflow. Explicit expiry fixtures should show the expired state. |
| Actual | The only incoming seed invitation expired on November 22 at 12:00 UTC. The library has no pending invitations and the direct link correctly shows the expired state. Reproduced in development and preview. |
| Console errors | None. |
| Fix hint | Keep a fixed incoming fixture valid for the supported task dates and retain the separate expired fixture for coverage. |

## Round History

- Round 2 independently reran the workflow suite against development and preview, added mobile navigation and reset coverage, and reproduced both issues above.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `146268`. The local evidence is `factory/build/dyn_certify/146268/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `users → 0 → name`.
