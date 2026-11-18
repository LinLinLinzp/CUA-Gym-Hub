# Loom Mock — TODO

> Status: VERIFIED LOCALLY
> Last updated by: dev agent, 2026-11-18
> Research: `assets/README.md` | Data model: `assets/data_model.md` | Design: `DESIGN.md`

## Status Legend

- [ ] Not started
- [~] In progress
- [x] Done

## P0 — Core Shell and Harbor

- [x] **Project and local runtime.** Scaffold Vite and React with a package lock and a production build. Use port 5407 for local browser tests. Start persistent Vite with PowerShell `Start-Process -WindowStyle Hidden`, the absolute Vite entry point, and the target directory as its working directory.
- [x] **Pre-signed-in shell and routes.** Render a text Loom wordmark, library navigation, and the current account using the layout in `DESIGN.md`. Route `/` and `/library` to the library, `/folders` to the folder index, `/folders/:folderId` to an individual folder, `/share/:videoId` to the video detail, and `/archive` to Archive. Preserve `sid` across navigation and copied internal URLs. Provide a useful missing-record page with a library link for invalid or deleted IDs. Support direct visits and reloads through the normal shell.
- [x] **Hydration, state and isolation.** Copy `templates/dataManager.js` unchanged to `src/utils/dataManager.js`. Import the repo's `stateApi(createInitialData)` and register it in Vite so the same endpoints work in dev and preview. Create deterministic defaults in `src/data/seed.js`. Await `loadState('loom', createInitialData)` before mounting the routed views, with a neutral loading state. Commit each successful user mutation through one store-level path and call `saveState('loom', nextState)` with the complete JSON-serializable state. The template serves `GET /state`, `POST /post` and `GET /go`; verify the latter returns `initial_state`, `current_state` and `state_diff`. Keep existing injected keys and do not write on navigation, render, playback, canceled forms or idle time.
- [x] **Injected worlds and verifier documentation.** Show useful empty states and render singleton and large injected arrays without fabricating missing records. Treat optional relationships and fields defensively, keep date math relative to `new Date()`, and render safely with all entity arrays empty. Use original local assets and system or bundled fonts. Write `SCHEMA.md` with every actual top-level key, record shape, and an Observable State Changes table for every mutation below.

## P1 — Primary Workflows

- [x] **Videos — browse and find.** Display active root-level recordings in My Library and active member recordings in the opened folder. Each video exposes title, duration, owner or neutral fallback, last update and a labeled item menu. Search case-insensitively across active videos and folders, including filed videos, using title/name, description and optional tags. Show typed results with location labels, a clear button and a no-results state. Offer newest, title and duration sorting on video lists and keep route changes and searches read-only.
- [x] **Videos — create and open.** Use New Video to open a form with title, description, a labeled local sample picker and current folder as the default destination when applicable. Make the selected original local sample playable via native controls on the resulting detail page. Validate trimmed nonblank title before submit. Save appends one `videos[]` record with `id, title, description, ownerId, folderId, sampleKey, durationSeconds, status, createdAt, updatedAt, updatedBy`. Cancel writes nothing.
- [x] **Videos — edit and duplicate.** Expose Edit details from the video view and Rename and Duplicate from the item menu. Save updates `videos[].title, description, updatedAt, updatedBy` as applicable. Duplicate creates a fresh active `videos[]` record in the same location with a new `id`, a “Copy of …” title, copied description and sample metadata, and current owner and timestamps. Discussion stays with the source video.
- [x] **Videos — move between locations.** From a video menu, open Move with a listing of active folders and My Library. Show the current destination and disable a no-op move. Confirm updates `videos[].folderId, updatedAt, updatedBy`. My Library writes `folderId: null`. The change is visible in the origin, destination and search after save and reload.
- [x] **Videos — archive, restore and delete.** Archive hides a video from active views and exposes it in Archive, with a Restore action and explicit confirmation for permanent deletion. Status transitions update `videos[].status, updatedAt, updatedBy` and set or clear `archivedAt` or set `deletedAt` as specified in the data model. Restore to the prior folder if it still exists and is active, otherwise clear `folderId` and restore to My Library. Deleting an archived video also marks its remaining comments deleted. Archived videos show an archived state on direct visit and deleted videos show a missing-record page.
- [x] **Folders — create, browse and rename.** Offer New Folder from the library and folder index. Validate a trimmed name and reject case-insensitive duplicates among active folders. Create appends `folders[]` with `id, name, ownerId, status, createdAt, updatedAt, updatedBy`. Show names and active video counts, open each folder on its own route, and expose Rename with the same validation. Rename updates `folders[].name, updatedAt, updatedBy`. An empty folder still provides a way back to the library and an entry point to create a video.
- [x] **Folders — archive, restore and delete.** Confirm Archive from the folder menu and show the archived folder in Archive. Archive and Restore write `folders[].status, archivedAt, updatedAt, updatedBy`. Active member videos are hidden while the parent folder is archived and reappear on restore, with their stored locations and statuses intact. Confirm permanent folder deletion with the number of member videos affected. Mark `folders[]`, retained member `videos[]`, and their remaining `comments[]` deleted with `status, deletedAt, updatedAt, updatedBy` in one state change. Prevent duplicate active folder names on restore and give the user an explanatory message if blocked.
- [x] **Comments — post, reply and jump to a timestamp.** Display discussion on the active video detail with author, message, date, optional timestamp chip, and visible replies. Support a top-level comment with an optional timestamp initialized from the player's current time and one level of replies. Disable blank submissions. Posting writes `comments[]` with `id, videoId, parentId, authorId, body, timestampSeconds, status, createdAt, updatedAt, updatedBy`. Reply writes the same shape with a linked `parentId` and null timestamp. A timestamp chip seeks the player and leaves the state untouched.
- [x] **Comments — edit and delete.** Show Edit and Delete on the signed-in author's own posts and replies. Save edits to `comments[].body, updatedAt, updatedBy, editedAt`. Confirm deletion, then set `comments[].status, deletedAt, updatedAt, updatedBy`. If a deleted top-level post has active replies, leave a neutral thread marker with the replies readable. Hide other deleted comments. Keep video discussions scoped to their respective `videoId`.
- [x] **Workflow verification.** In Chromium on localhost:5407, exercise video create, edit, duplicate, move and archive lifecycle, folder create, rename and archive lifecycle, and comment post, reply, edit, seek and delete. Verify the exact persisted fields via `/go?sid=…` and check reload and deep links, empty and sparse injected worlds, two isolated session IDs, and idle behavior after baseline. Include the results and changed fields in `TEST.md`. Run `npm run build` and leave Docker certification to the parent runner.

## P2 — Secondary Features

- [x] **Bulk video organization.** Add an opt-in visible selection mode on active video lists. Move or archive the selected IDs with the same state fields and confirmation rules as the equivalent P1 actions, using one state save per confirmed batch. Reset selection when leaving the view.

## Data Seed

- [x] Provide 48 fixed-ID videos, 24 fixed-ID folders, 72 fixed-ID comments and 8 synthetic accounts. Include root and filed videos, a mix of short and longer examples, empty folders, archived standalone videos, an archived folder with member videos, and videos with no discussion, timestamped discussion and replies. Include comments by the current user and teammates. See `assets/data_model.md`.

## Out of Scope

- Authentication, account creation and billing.
- Actual screen or camera capture, external imports, hardware permissions, production services, external notifications and permission administration.
- AI, transcription generation, integrations and organization administration.
