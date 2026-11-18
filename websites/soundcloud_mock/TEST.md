# SoundCloud Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5357  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | --- |
| Route patterns tested | 9 |
| Seed workflows passed | 4 of 4 |
| Workflow state writes verified per run | 13 |
| P0 or P1 bugs | 0 |
| P2 bugs | 1 |

All workflows passed in Chromium using the installed Node Playwright. Session `sc-qa-ca40155a` exercised the Vite app. Session `sc-qa-3b8a41f0` repeated the suite with Playwright serving the compiled `dist` HTML and assets and passing Harbor API requests through to the same localhost server.

## ✅ Passing Tests

| Workflow | Browser checks | Exact changes verified through `/go?sid=…` |
| --- | --- | --- |
| Upload | File picker and drop zone accepted input. Missing file, empty WAV, and blank title showed validation. An injected upload error exposed retry. Publishing a synthetic WAV opened its detail page. Tracks showed the release after reload. Downloaded bytes matched the test file. | One save appended `uploads[]` with `id, trackId, actorId, status, createdAt, file.originalName, file.storedName, file.url, file.sizeBytes, file.contentType` and `tracks[]` with `id, ownerId, uploadId, title, genre, tags, description, visibility, artworkKey, durationSeconds, status, createdAt`. |
| Track editing | Canceled a title edit, then saved metadata and privacy. Reload restored the edited track. Audio playback and keyboard waveform selection responded. | Updated the same track's `title, genre, tags, description, visibility, updatedBy, updatedAt`. |
| Playlist creation | Required a title. Created an empty playlist from the list and a playlist containing the selected track from track detail. Escape dismissed the creation dialog. | Each creation appended `playlists[]` with `id, ownerId, title, description, visibility, trackIds, artworkKey, createdAt`. |
| Playlist editing | Filtered the list and searched the picker by title and artist. Added tracks, checked the duplicate and boundary guards, reordered, and verified the order after reload. Canceled one removal, then saved removal and metadata changes. Added a track from track detail with explicit confirmation. | Order and add actions updated `trackIds, updatedBy, updatedAt`. The metadata save also updated `title, description, visibility`. The playlist privacy edit left its track record intact. |
| Comments | Rejected blank comments and replies. Posted timed and untimed comments and a reply. Canceled a removal, then confirmed it. The reply remained visible after reload and the inbox filter and deep link worked. | Each post appended `comments[]` with `id, trackId, authorId, parentId, offsetSeconds, body, status, createdAt`. Verified offsets of 1 second, null, and an inherited 1 second. Removal updated `status` to `deleted` and wrote `deletedBy, deletedAt`. |
| Stats | Confirmed the default 30-day interval. Chart hover, chart/table switch, seven-day likes report, invalid custom dates, and single-track zero-result report behaved as expected. Reload restored the last applied date bounds, track, and metric. | Each Apply appended `insightViews[]` with `id, actorId, trackId, metric, startDate, endDate, resultCount, metricTotal, createdAt`. Independently counted and summed matching `dailyStats` rows. A zero-result apply persisted zeros. `dailyStats` stayed identical to baseline. |

- Each successful mutation produced one state POST. The final `state_diff` contained exactly `tracks`, `uploads`, `playlists`, `comments`, and `insightViews`. Validation, cancellation, playback, filter preview, chart hover, reload, and idle checks produced no additional write after the initial baseline POST.
- Direct navigation covered all eight app routes and the catch-all. Missing-record views linked back to their lists. Overview shortcuts, the keyboard skip link, the mobile menu, and the wordmark worked. Internal links retained the SID.
- A separate SID retained the original seed and accepted independent writes. Empty and partial injected sessions rendered. Editing a partial playlist preserved an unavailable track ID and an unknown root key. A 450-track injection rendered and filtered correctly.
- The seed exposed 25 users, 48 tracks, 30 uploads, 24 playlists, 76 comments, and 138 daily stat rows. Both suites reported zero unexpected console or page errors and zero external requests.
- `npm run build` passed. The site's `dataManager.js` matched the repository template byte for byte.

## ❌ Bugs for Dev Agent

### BUG-001 · P2 · Duplicate track titles have identical Add button labels

| Field | Result |
| --- | --- |
| Route | `/playlists/:playlistId` |
| Element | Add tracks dialog |
| Action | Search for Soft Relay |
| Expected | Each Add button's accessible name distinguishes the track by artist when titles match. |
| Actual | Both buttons are named “Add Soft Relay.” The visible artist text distinguishes the rows, and the Mira Vale row adds the correct track. |
| Console errors | None |
| Fix hint | Include the artist in the button's accessible name. |

## Visual Alignment Feedback

Reviewed Chromium screenshots for all eight app views at 1440 × 950 and the Overview at 390 × 844 against the site's `DESIGN.md`. The plum navigation, editorial titles, original local artwork, tables, and mobile controls rendered as intended.

## Round History

- Round 1 recorded passing workflow checks against Vite and the built SPA.
- Round 2 independently reran the four workflows and checked the compiled bundle, direct routes, injected states, and responsive layout. Documented one accessibility issue in the track picker.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `152760`. The local evidence is `factory/build/dyn_certify/152760/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `users → 0 → displayName`.
