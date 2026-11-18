# Dropbox Mock — Audit Report

> Round: 1  
> Date: 2026-11-18  
> Audited by: audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers / stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 1 |
| Workflow validation | 1 |
| Schema mismatches | 1 |
| Total | 3 |

## P0 — Dead/Broken Code

### AUDIT-001 · A delayed boot write can erase the first mutation from `/go` · Resolved on 2026-11-18

- **Files**: `src/store.jsx:26`, `src/utils/dataManager.js:56`
- **Reproduction**: In a fresh SID, hold the boot `POST /post` with `action=set` while allowing the workspace to render. Create a folder and let its `set_current` complete. Release the held `set`.
- **Observed**: The UI still shows the new folder. The intermediate `/go.current_state` contains it. After the delayed boot write, the folder disappears from `current_state` and appears in `initial_state`. The user action has been reversed in the verifier’s state.
- **Fix**: Keep writes gated until the server has acknowledged the fresh-SID baseline. Retain the required shared client and API templates unchanged. Add a regression check that delays the baseline and verifies the original initial state and the resulting folder and activity in current state.

## P1 — Incomplete Features

### AUDIT-002 · A 255-character filename passes validation and fails at upload

- **Files**: `src/model.js:64`, `src/model.js:240`
- **Reproduction**: Upload a file named with 251 ASCII letters followed by `.txt`. The dialog enables Upload and sends the request.
- **Observed**: Local Harbor returns HTTP 400 and the dialog displays “Upload failed. Try again.” No account records change. The app sends the full original filename and Harbor prepends a nine-character storage prefix, exceeding the filesystem’s 255-character component limit.
- **Fix**: Use a short transport filename for the upload and preserve the original filename in the existing logical name and submission metadata. Cover both the Files toolbar and recipient upload form with the same boundary test.

## P2 — Minor Issues

### AUDIT-003 · Three seed event shapes differ from the corresponding live events

- **File**: `src/data/seed.js:119`, `src/data/seed.js:167`
- **Observed**: Seeded `file.delete` events lack `parentId`. The seeded `request.edit` event omits the current and previous title and description. The seeded `share.invite` event lacks `reactivated`. The corresponding live events include these keys.
- **Fix**: Populate those keys in the seed so a verifier inspecting initial history and live mutations can use the same shape. The schema now calls out the current seed exceptions.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| Shared state client and Vite API | Pass | Client hash matches the unchanged template. Vite imports the shared API unchanged. |
| Boot and store sync | P0 | Delay can reverse the baseline and first mutation. Ordinary browser acceptance observed one baseline and one post per transaction. |
| Idle writes | Pass | Two open tabs emitted zero state writes during the 4.5-second idle check. The application timer clears only toast text. |
| `/post`, `/state`, `/go`, reset and isolation | Pass | Separate SIDs stayed isolated. Repeated set preserved the baseline, set_current updated current, and reset restored the saved baseline. |
| Structured writes | Pass | File, sharing, request, and revision operations recorded linked business records and activity in `/go`. |
| Injected state | Pass | Playwright covered empty, one-record, and 420-record worlds, missing optional fields, missing targets, a cyclic folder reference, deep links and reload. |
| Offline build and UI | Pass | Build succeeded. Browser acceptance observed only local requests. The UI uses the text brand, system fonts, synthetic records and original local previews. The desktop layout matches the site’s design direction. |
| Schema | Updated | The baseline and reset semantics, stable IDs, fixture and seed exceptions are documented. |

## SCHEMA.md Updates

Added endpoint usage, a minimal injected world, stable seed IDs and the seed event exceptions. Checked the action-to-field table against the mutation functions.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Fixed and retested.** Chromium held the startup POST and verified action controls stayed unavailable through acknowledgement. File creation and versioning, sharing and requests passed reloaded against Harbor.

Docker dynamic certification run `188924` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
