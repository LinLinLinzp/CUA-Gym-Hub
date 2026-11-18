# Vimeo account workspace — TODO

> READY FOR DEV · Plan agent · 2026-11-18  
> [Design system](DESIGN.md) · [Workflow research](assets/README.md) · [Proposed state model](assets/data_model.md)

## P0 — Shell and Harbor runtime

- [x] Scaffold React and Vite inside `websites/vimeo_mock`. Include `package-lock.json` and an `npm run build` script. Configure Vite dev and preview on port `5360` with `strictPort`. Import `stateApi(createInitialData)` from `../../templates/state-api.js` in `vite.config.js` and copy `templates/dataManager.js` unchanged to `src/utils/dataManager.js`. Let the middleware serve `/state`, `/post`, `/go`, `/upload`, and `/files`. `/go` returns `initial_state`, `current_state`, and `state_diff` as JSON.
- [x] Render the account workspace in `DESIGN.md`. Use text branding `Vimeo` in the header and document title. `/` and `/videos` open the Library, `/videos/:videoId` opens video details, `/videos/:videoId/review` opens Review, `/showcases` lists showcases, and `/showcases/:showcaseId` opens an editor. Keep `?sid=` through navigation and use `withSid()` for internal links outside the router. Wrap all routes in their providers. Show a recovery link for missing records and unmatched routes. Support hard reloads of every route.
- [x] Put deterministic English `createInitialData()` in `src/data/seed.js`. Await `loadState('vimeo', createInitialData)` before showing routes and show a neutral loading state meanwhile. Commit each successful business action through one store function with the whole next state. Call `saveState` once per committed action. Apply cascading edits atomically. Keep browsing, drafts, selection, playback, and feedback messages in transient UI state. Confirm canceled, invalid, and unchanged actions emit no writes. Preserve injected keys and support replaced arrays, missing optional fields, and large lists. Derive relative dates from `new Date()` and use ISO timestamps for committed actions.
- [x] Maintain `SCHEMA.md` alongside the implementation. List every top-level key, each record shape, and an **Observable State Changes** table keyed by the real UI actions. Use the state model below as the handoff and match the final schema to actual code. Keep runtime operations and asset requests local and available from the built site.

## P1 — Videos

- [x] Show thumbnails, titles, durations, privacy, and modified dates in the Library. Provide grid and list views, case-insensitive search over title, descriptions, and tags, a privacy filter, and sorting by last modified, newest, title, and duration. Combine filters, show result counts and a clear action for zero matches, and retain access to controls in empty worlds. Opening a video shows its local preview and editable Title, Description, and Tags. Search, view, and filter operations write no state.
- [x] Provide **Upload video** with a local file picker and drop zone, optional title prefilled from the filename, and privacy selection. Validate the selection and required fields, submit on confirmation to the contract's sid-scoped `/upload` endpoint, and persist after success. Disable duplicate submits during upload and retain the draft on errors. Append `videos[]` with the returned local file metadata in `source`, seeded/default privacy settings, initial timestamps and actor. Append `activity[]` with `video.created`. Reopen the uploaded video from the Library after reload. Use native controls for supported media and a local still when a file cannot play.
- [x] **Save details** patches the video's `title`, `description`, `tags`, `updatedAt`, and `updatedBy`, and appends `video.updated` with the actual `changedFields`. **Delete video** shows a named confirmation, removes the video and its `reviewComments[]`, and removes that id from every showcase's `videoIds`, stamping affected showcases. Append `video.deleted` with affected comment and showcase IDs. The video disappears from search and its prior detail route shows recovery navigation.

## P1 — Showcases

- [x] List showcases with local cover, title, privacy mode, and derived count. Provide title search, privacy filtering, and newest-first sorting. **New showcase** opens title, description, and privacy fields. On save append `showcases[]` with a fixed shape, empty `videoIds`, timestamps and actor, and append `showcase.created`. Open the new editor. **Save details** patches title and description and stamps the record, and appends `showcase.updated`. A confirmed **Delete showcase** removes its record and appends `showcase.deleted` with its member video IDs. The member videos remain in the Library.
- [x] In a showcase editor, **Add videos** opens a searchable checkbox picker. Preserve selected IDs while searching and mark existing members as added. Save once, append new IDs in selection order, and prevent duplicates. Each member row offers **Remove from showcase** and **Move up** / **Move down** controls with disabled boundaries. The displayed order follows `videoIds`; adding, removing, and reordering all update `videoIds`, `updatedAt`, and `updatedBy` and append `showcase.videos_added`, `showcase.video_removed`, or `showcase.videos_reordered` with the affected IDs and final order. Removal from a showcase leaves the video and its comments intact. Skip unresolved IDs when displaying injected data.

## P1 — Privacy

- [x] Open **Share** from the video header, with the current mode visible in the header and Library. Support Public, Unlisted, Password, Embed only, and Private, with a plain-language audience note for each. Require a synthetic viewing password for Password and clear it when switching to another mode. Support a downloads toggle. Apply both changes only on **Save privacy**. Patch `videos[].privacy`, `updatedAt`, and `updatedBy`; append `video.privacy_changed` with old and new modes and changed field names. Cancel restores the stored settings. Library badges and filters reflect the saved mode.
- [x] Open **Share** in the showcase editor for Public, Password, Embed only, and Private with audience notes and the same conditional password behavior. Patch `showcases[].privacy`, `updatedAt`, and `updatedBy`; append `showcase.privacy_changed` with old and new modes and changed field names. Show the saved mode in the editor and list. Treat these as account-side controls over synthetic content and keep review comments in the separate review view.

## P1 — Review comments

- [x] From a video, **Review** opens its preview, a timeline showing elapsed time and duration, timestamp markers, and a thread panel scoped to that video. Play a local clip where available. Support keyboard scrubbing and selecting comment anchors even with a still preview. Show author, text, creation date, and a clickable timestamp where present. Provide Open, Resolved, and All filters and a timecode/newest sort. Use the current playback position when the reviewer selects **Add timestamp**. Validate and trim comment text. **Post comment** appends `reviewComments[]` with `videoId`, `parentId: null`, `body`, a numeric `timeSeconds` or `null`, author, timestamps, and `status: 'open'`; append `comment.created`.
- [x] On an open thread, **Reply** appends a child comment with the same video ID and its root comment ID in `parentId`; append `comment.replied`. **Resolve thread** and **Reopen thread** stamp all records in that thread with the new status and editor metadata, set or clear `resolvedAt`/`resolvedBy`, and append `comment.resolved` or `comment.reopened` with the affected IDs. Keep resolved threads discoverable in Resolved or All. Preserve other threads and videos throughout.

## P2 — Follow-up

- [x] Reuse the P1 showcase membership action for an **Add to showcase** library bulk command. Append `showcase.videos_added` for each affected showcase and save the batch once.

## Seed data

- [x] Seed 36 videos, 24 showcases, 72 comments including replies, 8 people, and an empty `activity` array. See the [state model](assets/data_model.md) for distribution, sample records and relationships. Use original local thumbnail art and short original footage as described in [DESIGN.md](DESIGN.md). Keep seed records compact and free of network dependencies.

## Verification handoff

- [x] Run `npm run build` and test with the Chromium and Node Playwright installed through `PILOT_PLAYWRIGHT`. Use only `http://localhost:5360` with fresh `sid` values and gitignored or removed scratch files. For a persistent Vite process use `Start-Process -WindowStyle Hidden` with an absolute Vite entry point. Check baseline, a direct detail route and reload, session isolation, no idle `/post` requests after startup, and an injected world with empty arrays, partial records, and hundreds of rows.
- [x] Record actual side effects read from `/go?sid=...` in `TEST.md`. Exercise each SEED workflow through visible controls. Upload/edit/delete videos, create/edit a showcase and add/reorder/remove videos, save video and showcase privacy then check cancellation and password clearing, and post timestamped feedback, reply, resolve, and reopen. Inspect affected records and reload the modified views. The parent runner handles Docker certification and commit after `TEST.md` exists.

## Out of scope

Authentication, billing, external publishing, public discovery, real account access, remote encoding, live streaming, external review invitations, and identity management.
