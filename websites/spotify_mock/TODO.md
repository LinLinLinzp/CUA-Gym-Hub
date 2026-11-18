# Spotify — Implementation TODO

> Status: IMPLEMENTED AND VERIFIED  
> Last updated by: dev agent, 2026-11-18  
> Research: [assets/README.md](assets/README.md) · Design: [DESIGN.md](DESIGN.md) · State: [assets/data_model.md](assets/data_model.md)

## Status legend

- [ ] Not started
- [~] In progress
- [x] Done

## P0 — Shell and Harbor integration

- [x] Scaffold the target site with Vite and React, npm scripts and a lockfile. Use port **5355** with strict port handling for local dev and preview. Use the workspace template `stateApi(createInitialData)` in Vite and copy `templates/dataManager.js` unchanged to `src/utils/dataManager.js`. Define `createInitialData()` in `src/data/seed.js`. Build a self-contained offline `dist/`.
- [x] Await `loadState('spotify', createInitialData)` before mounting interactive routes. Save the complete JSON state once per successful business action with a central store that computes from the latest state. The template serves `GET /go` as JSON alongside `GET /state` and `POST /post`. Keep navigation, search, filters, sorting, dialog drafts and feedback transient. Avoid saves on render, mount, navigation, idle, cancelled actions and unchanged submissions.
- [x] Implement the warm editorial account shell in DESIGN.md. Provide Your Library, Browse and a profile/Following entry point, plus a prominent Create playlist button. Support `/` (library landing), `/library`, `/library/liked-songs`, `/search`, `/playlist/:id`, `/album/:id`, `/artist/:id`, `/profile/:id`, `/following`, and `/invite/:token`. Mount routes under shared providers, keep `?sid=` on internal navigation and use `withSid()` for links leaving the router. Handle missing entities, broken optional links, empty arrays and large injected worlds with useful empty and recovery states.
- [x] Publish implementation-aligned `SCHEMA.md` with all top-level keys, record shapes and an **Observable State Changes** table naming the exact writes for every P1 business action. Verify the build, direct routes and reloads, state injection, per-SID isolation, idle network behavior and all four SEED workflows through the browser on localhost:5355. Use the installed Node Playwright from `PILOT_PLAYWRIGHT` and Chromium. Capture the actual tests and observed state paths in `TEST.md`. If starting a persistent dev server on Windows, use `Start-Process -WindowStyle Hidden` with the absolute Vite entry point. Keep runner scratch files ignored or remove them.

## P1 — Seed workflows

- [x] **Playlists · Create, edit and delete.** Open a form from Create playlist. Require a trimmed name, offer description and visibility, and open the new playlist after save. Let owners edit details from the playlist and confirm deletion by name. Deletion returns to Your Library and removes the playlist from discovery and collection views. **Writes** `playlists[]` with owner, details, status and timestamps. Delete sets `status` to `deleted` and records actor/time, and closes associated active library entries and collaboration access in the same write. See the mutation table for exact fields.
- [x] **Playlists · Add, remove and reorder tracks.** Provide Add tracks on editable playlists with inline catalog search. Expose Add to playlist on track rows in catalog and saved views, listing eligible destinations. Show the ordered contents with title, artist, album and duration. Provide Remove from playlist and drag reorder with accessible Move up / Move down actions. Operate on playlist item IDs so injected duplicate tracks can be manipulated independently. **Writes** `playlistItems[]` with track, playlist, position, actor, timestamps and removal status, plus `playlists[].updatedAt`. Read-only playlists offer library and navigation actions.
- [x] **Library · Save, remove and find items.** On track, album and eligible external playlist surfaces, offer clear Save/Remove controls with state reflected across views. Your Library includes owned and shared playlists, saved albums, followed artists, saved external playlists and a direct Liked Songs entry driven by saved tracks. Add type filters, collection text search, and Recent and Title sorting. Browse searches tracks, albums, artists, playlists and profiles by name, and tracks by artist or album. Detail views provide stable links back into the catalog. **Writes** `libraryEntries[]` per track/album/playlist and account with `saved` or `removed` status plus timestamps. Search, filter, sort and navigation are read-only. Saving an album leaves its individual tracks unchanged.
- [x] **Follow · Follow and unfollow artists and people.** Show explicit Follow/Following on artist and user profile views, and expose followed artists and people in a Following view linked from the account. The control toggles and remains synchronized from either view. Exclude the current account from follow targets. **Writes** `follows[]` with follower, target type/ID, status and timestamps. Saving an external playlist uses the library relationship from the previous item.
- [x] **Collaborative playlists · Enable and invite.** Owners access Manage collaborators from a playlist. Offer Enable collaboration, Invite collaborators, a copyable in-app invitation link, and a pending list with Revoke. Enabling collaboration makes the playlist private. Generate invitations only on explicit action with a seven-day expiry based on the runtime clock. Copying an existing link only affects the clipboard and feedback. Seed an incoming invite for the active user and expose it from Your Library. Its invite route shows playlist and inviter, supports Join playlist, and renders expired/revoked/used and missing states. Use a same-origin invite URL and preserve SID. **Writes** `playlists[].collaborative`, visibility and timestamps on enable; `playlistInvites[]` on create/revoke/accept; `playlistCollaborators[]` on join. Joining also updates `playlists[].updatedAt` and puts the playlist in Shared with you through the membership.
- [x] **Collaborative playlists · Edit together and manage access.** Show collaborator names and track attribution in collaborative playlists. Seed both an owned playlist with active members and a playlist owned by another user where the current account has edit access. Collaborators can add, remove and reorder tracks through the same track actions. Owners can remove a member or turn off collaboration with confirmation. Update membership and edit affordances immediately. **Writes** `playlistItems[]` for edits, with the current actor; `playlistCollaborators[]` status, actor and timestamp on removal; `playlists[]` on disable, closing active memberships and pending invites in one update. Check authorization in the action handler as well as the UI.

## P2 — Depth

- [x] Allow owners to choose a cover from original bundled presets in the playlist edit form. Persist the selected preset as `playlists[].artKey` with the playlist edit timestamp and document it in SCHEMA.md if implemented.

## Data seed

- [x] Seed 30 synthetic English-language people including Maya Chen, 32 artists, 36 albums, 144 tracks and 30 playlists with fixed identifiers and times. Provide distinct but related catalog titles, duration values, several genres, an empty owned playlist and an ordered playlist with enough tracks to reorder and remove. Seed library/follow entries alongside unsaved/unfollowed candidates. Include owned normal and collaborative playlists, public playlists by other users, an already-shared playlist and a joinable incoming invite. Keep all catalog art local and original. See [the data model](assets/data_model.md) for fixtures.

## Out of scope

- Authentication, billing, playback or streaming, live activity, sending external invitations, production accounts, and production service calls. The app starts with a synthetic account and runs offline aside from its local state API.


