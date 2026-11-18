# SoundCloud Mock — Audit Report

> Round: 1  
> Date: 2026-11-18  
> Audited by: audit agent

## Summary

| Category | Open issues |
| --- | ---: |
| Dead handlers / stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 0 |
| Schema mismatches | 0 |
| Workflow validation, navigation and visibility | 3 |
| Total | 3 |

## P0 — Dead/Broken Code

None found. The four required workflows produced structured changes in `/go`.

## P1 — Incomplete Features

### AUDIT-001 · Invalid audio is published

- **File** `src/tracks.jsx:34`, `src/tracks.jsx:69`, `src/tracks.jsx:93`
- **Reproduction** Select a nonempty text file named `Invalid Audio.wav` and click **Publish track**. The track detail opens, and `/go` contains new upload and track records marked `published` with a null duration.
- **Cause** Selection checks file size and filename, and metadata decode errors and timeouts fall through to publication.
- **Fix** Validate the audio container before uploading or committing the track. Keep duration optional for valid formats where the browser cannot read it. Verify that invalid content displays an inline error and leaves both arrays unchanged.

### AUDIT-002 · Pending upload overrides workspace navigation

- **File** `src/tracks.jsx:81`, `src/tracks.jsx:115` and `src/App.jsx:32`
- **Reproduction** Delay the localhost multipart response, publish a valid WAV, then use the workspace navigation to open **Insights**. Releasing the response redirects to the uploaded track.
- **Cause** The submit handler calls the captured navigation callback after the Upload route has unmounted.
- **Fix** Keep a successful upload in state and open its detail only if the user is still on the submitting Upload page. Verify that leaving during a pending request preserves the chosen route and that the release appears once in Tracks.

### AUDIT-003 · Other artists’ private releases are exposed

- **File** `src/playlists.jsx:121`, `src/playlists.jsx:143` and `src/tracks.jsx:301`
- **Reproduction** In an owned public playlist, find an unowned private release from the default catalog in **Add tracks**. Add it and save. Its ID is persisted in the playlist, and the row opens the private release detail for the signed-in creator.
- **Cause** The track picker, playlist row lookup and track detail use the full track collection without checking visibility against ownership.
- **Fix** Apply the same access rule to browsing, adding, and resolving track details. Retain inaccessible IDs already present in injected playlists during unrelated saves. Verify that owned private releases and other artists’ public releases still work.

## P2 — Minor Issues

None logged.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | ✅ | SHA-256 matches the repository template. Boot awaits `loadState`, and the template performs the baseline write. |
| Store state sync | ✅ | Mutations synchronously derive from the latest in-memory state and call the template save once. Chromium observed no extra POST on reload or during 2.8 seconds of idle time. The audio metadata timeout and comment scroll callback do not independently save state. |
| `vite.config.js` /post | ✅ | Imported the unchanged plugin. Live checks verified `set`, `set_current` and `reset`. Reset restores the original baseline per the template. |
| `vite.config.js` /go | ✅ | Baseline and current state were available with a top-level diff. The workflow diff contained exactly `tracks`, `uploads`, `playlists`, `comments` and `insightViews`. |
| Session isolation | ✅ | A second SID retained its seed. A detail link preserved the SID. |
| Baseline handling | ✅ | A subsequent `set` and `set_current` preserved the first baseline. |
| Structured records | ✅ | Verified linked audio upload and track records, track edit attribution, ordered playlist IDs and edit attribution, comment reply linkage and inherited offset, removal fields, and applied Insights result count and metric total. Historical `dailyStats` matched the baseline. |
| Injected state | ✅ | Empty arrays rendered on all top-level and missing-record routes. A partial world rendered a track, an orphaned reply and a playlist with an unavailable track reference. The prior browser run in `TEST.md` also covered a 450-track injection. |
| Local assets and build | ✅ | `npm run build` passed. The workbench uses CSS artwork, system fonts, a text wordmark and bundled icons. Chromium recorded localhost requests and no page errors on the tested routes. |
| `SCHEMA.md` accuracy | ✅ | The documented root keys and write fields match the source and observed state. |

## SCHEMA.md Updates

Added base URL and endpoint examples, root data types, representative fixed IDs and an empty-world injection payload. Retained the table mapping each business action to its write fields.

The independent Chromium audit ran on localhost port 5357. The existing [browser acceptance report](TEST.md) records the full dev and built-SPA runs. Docker dynamic certification is pending with the parent runner.
