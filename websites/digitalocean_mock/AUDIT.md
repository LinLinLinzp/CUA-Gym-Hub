# DigitalOcean Mock — Audit Report

> Round 1 · November 18, 2026 · Audit agent

## Summary

| Category | Open findings |
| --- | ---: |
| Dead handlers or stubs | 0 |
| Missing state tracking in business handlers | 0 |
| Server persistence | 2 |
| Form validation | 1 |
| Design alignment | 1 |
| Schema mismatches after documentation update | 0 |
| Total | 4 |

## P0 — Persistence blockers

### AUDIT-001 · A valid injected world can exceed Chromium's keepalive byte limit

- **Location** `src/store.jsx:10` and `src/utils/dataManager.js:70`.
- **Reproduction** Inject the seeded DNS records plus 28 TXT records containing 150 three-byte characters each. Create a Droplet. The serialized save has 59,731 JavaScript code units and 68,131 UTF-8 bytes. The unchanged template enables keepalive by code-unit length. Chromium rejects the fetch before it reaches `/post`. The UI and local reload show the new Droplet, but `/go` has neither the Droplet nor its activity.
- **Fix** Keep the shared file byte-for-byte unchanged. In the existing app-side fetch wrapper, measure the UTF-8 body size and disable keepalive when it exceeds the browser limit. Verify the persisted resource and activity through `/go` and surface failed saves to the user.

### AUDIT-002 · A delayed baseline can overwrite a saved mutation

- **Location** `src/store.jsx:7`, `src/utils/dataManager.js:57`, and `state-api.js:67`.
- **Reproduction** Delay the first browser `POST /post` with action `set`, leaving `GET /state` and `set_current` unaffected. Open `/droplets/new` in a fresh session and create a Droplet. `set_current` returns 200 and `/go` shows the new row. Release the baseline request. The local API replaces `current_state` with the seed and leaves the newly created Droplet in `initial_state`, reversing the expected diff. Both dev and built preview reproduce the ordering failure.
- **Fix** Coordinate baseline completion and mutation writes in the app's store integration while keeping both templates unchanged. Run the same delayed-response check and verify that the saved resource and action are present in `current_state` and absent from the pristine `initial_state`.

## P1 — Incomplete behavior and design alignment

### AUDIT-003 · Correcting a CAA tag leaves the previous value error in place

- **Location** `src/Domains.jsx:260`, `src/Domains.jsx:296`, and `src/ui.jsx:84`.
- **Reproduction** In Add DNS Record, choose CAA with tag `issue`, enter `mailto:dns@example.com`, and submit. Change the tag to `iodef` and submit again. The address is valid for `iodef`, but native form validation blocks submission because the custom error is still attached to the value input. Editing the value clears it and allows the save. Edit uses the same form.
- **Fix** Clear or revalidate the CAA value's field error when its tag changes. Verify the corrected tag and original value together in the persisted record.

### AUDIT-004 · Secondary controls fall below the documented 40 px minimum

- **Location** `src/styles.css:83` and `src/styles.css:109`.
- **Issue** Inventory row actions and compact controls are 34 px tall. Dialog close controls are 36 px tall. `DESIGN.md` specifies a 40 px minimum for buttons. The main action sizes, palette, type hierarchy, spacing, and panel elevations align in the spot-check.
- **Fix** Apply the documented minimum to those controls and confirm the wide tables still scroll within their containers on narrow screens.

## P2 — Minor issues

None recorded.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| Shared templates | Match | Both site copies match the repository templates by SHA-256. The Harbor contract takes precedence over the generic audit's Slack-specific debounce, reset, and diff assumptions. |
| Store synchronization | Open P0 | All 23 standard mutations persisted their resource and activity changes. Multibyte payloads and a delayed baseline can lose server state. |
| `/post`, `/state`, `/go` | Exercised | Vite dev and preview use the same `stateApi(createInitialData)` middleware. Verified full-world writes, injected array replacement, partial object merge, and JSON diffs. Preview reset restored the original server world and cleared the diff. |
| Session isolation | Pass | Tested separate SIDs and verified links and deep-link reloads retain the SID. |
| Initial state handling | Open P0 | Baseline stays unchanged in the normal order. A delayed baseline exposes the first-write race in AUDIT-002. |
| Idle and offline behavior | Pass | No timer-driven writes in source, zero extra POSTs in a 3.2-second idle window, and zero external browser requests across the workflow suite. |
| Injected state rendering | Pass | Empty lists and sparse records rendered, including a 320-Droplet world and a mobile deep-link reload. |
| SCHEMA.md | Updated | Added endpoint semantics, fixture ID patterns, and a minimal injection example. The observable changes table matches the business handlers. |

Local build and browser results are in [TEST.md](TEST.md). Docker dynamic certification belongs to the parent runner.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Fixed and retested.** Chromium saved a Droplet from an injected UTF-8 world over 64 KiB. Harbor retained the Droplet, its activity and the injected records.
- **AUDIT-002 · Fixed and retested.** The pending startup POST withheld action controls. Harbor retained matching initial and current baseline snapshots on acknowledgement.

Docker dynamic certification run `188924` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
