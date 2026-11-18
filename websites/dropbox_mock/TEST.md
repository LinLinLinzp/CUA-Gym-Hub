# Dropbox Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://127.0.0.1:5392  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| App routes tested | 12, including the fallback |
| Seed workflow groups passed | 4 of 4 |
| Open audit findings | 3 |
| P0 / P1 / P2 | 1 / 1 / 1 |

Local Chromium ran the acceptance, edge, smoke, supplemental controls and audit scripts using the Node Playwright package at `PILOT_PLAYWRIGHT`. The workspace UI was already implemented. This round used the existing Dropbox Vite listener on the assigned port and verified a fresh production build.

## ✅ Passing Tests

| Seed workflow | Browser actions exercised | State fields observed through `/go` |
| --- | --- | --- |
| Files | Browsed folders and breadcrumbs, previewed local artwork, sorted and filtered, created a folder, rejected a duplicate, uploaded by picker and drop, kept both names, renamed, bulk moved, copied, bulk deleted, restored to the original and an alternate folder, searched with locations, and reloaded. | New folders and files appended `files[]` records with `id`, `name`, `kind`, `parentId` and `status`. Upload and copy added linked `versions[]` and set `files.currentVersionId`, `mimeType` and `sizeBytes`. Rename changed `files.name`. Move changed `parentId`. Delete set `status`, `deletedAt`, `deletedBy` and `deletionRootId`. Restore set active status, cleared deletion markers and set the chosen root `parentId`. Each mutation added `activity[]` entries linked to the affected IDs. The stored upload URL returned the original bytes. |
| Sharing | Opened Share from Files, Preview and Shared. Checked inherited access, invited a viewer, changed the role, removed and reactivated the membership, created and copied a local link, edited its role and audience, and revoked it. Checked incoming and outgoing lists, audience rejection and the already-open link after revocation. | `shareMembers[]` changed `fileId`, `email`, `role`, `status` and `removedAt`. Reactivation kept the membership ID. `shareLinks[]` changed `fileId`, `audience`, `role`, `status` and `revokedAt`. Editing kept the link ID and `token`. `activity[]` tracked member and link actions. |
| File requests | Created and edited a request, submitted two files via the copied recipient URL, reviewed them as the owner, closed the request, verified the unavailable form, reopened the same URL and submitted again to the new destination. Checked duplicate names, clipboard fallback and hard reload. | `fileRequests[]` recorded `title`, `description`, `destinationFolderId`, `status`, `closedAt` and the stable `token`. Each `requestSubmissions[]` row recorded `requestId`, `fileId`, `destinationFolderId`, `originalName`, `uploaderName`, `uploaderEmail`, `createdAt` and `status`. Each submission added matching `files[]`, `versions[]` and `activity[]` records. Closing during an in-flight upload left those three collections and `requestSubmissions[]` unchanged. |
| Versions | Replaced an uploaded file, previewed distinct current and historical text, verified the current revision could not be restored, restored the historical revision, then reloaded to the restored content. | Replacement and restore kept `files.id` and set `currentVersionId`, `sizeBytes`, `mimeType`, `updatedAt` and `updatedBy`. Both appended `versions[]` records. Restore recorded `versions.sourceVersionId` and `activity.details.previousVersionId`, `sourceVersionId` and `versionId`. Prior revisions remained available. |

- **Read-only controls / state**. Account toggle, folder rail, search button, filters, sort directions, select-all and clear, link copying, preview navigation, Shared tabs, deleted-file search, request tabs and request links responded. Read-only actions left the account diff unchanged.
- **Forms and recovery**. Checked email validation, native file chooser opening, invalid and duplicate inputs, Escape focus return, upload failure, cancellation and a bulk move conflict. Rejected and canceled actions left account state unchanged.
- **Harbor API**. Directly verified `/state`, `/go`, and `/post` actions `set`, `set_current` and `reset`. The core browser run observed one baseline POST and 25 mutation POSTs, with one POST per accepted transaction. Two idle tabs sent zero additional state POSTs during 4.5 seconds and the full `/go` response stayed equal.
- **Routes and injected state**. Exercised `/`, `/files`, `/folder/:id`, `/file/:id`, `/file/:id/versions`, `/shared`, `/requests`, `/requests/:id`, `/receive/:token`, `/shared-link/:token`, `/deleted` and the fallback. Checked session isolation, retained `?sid=`, hard reloads, empty and single-record worlds, 420 injected rows, missing optional fields, dangling references and a folder cycle.
- **Build and runtime**. `npm run build` passed. The state client hash matched the unchanged template and Vite imports the shared state API. Browser acceptance saw no uncaught page errors or off-origin requests. The supplemental controls check saw no console errors.

## ❌ Bugs for Dev Agent

### BUG-001 · P0 · Delayed boot POST loses the first saved change

| Field | Value |
| --- | --- |
| Route | `/files` in a fresh SID |
| Element | New folder |
| Action | Hold the initial `set` POST in Playwright, create a folder, wait for `set_current`, then release the held POST. |
| Expected | The original baseline and the new folder in `current_state` and `state_diff`. |
| Actual | The UI shows the folder, but after the delayed POST `/go.current_state` loses it and `initial_state` contains it. |
| Console errors | None observed. Both POSTs succeeded. |
| Fix hint | Gate mutations on baseline acknowledgement while retaining the unchanged template. |

### BUG-002 · P1 · Accepted 255-character filename fails during upload

| Field | Value |
| --- | --- |
| Route | `/files` |
| Element | Upload files |
| Action | Select a file named with 251 ASCII letters followed by `.txt`, then click Upload. |
| Expected | An accepted file uploads and records a file and revision. |
| Actual | The button is enabled. The local upload handler returns HTTP 400, the dialog reports failure and `state_diff` remains empty. |
| Console errors | Upload request returned HTTP 400. |
| Fix hint | Send a shorter transport filename and preserve the full logical filename in account records. |

### BUG-003 · P2 · Seed event details differ from live event details

| Field | Value |
| --- | --- |
| Route | `/go` initial state compared with live browser mutations |
| Element | Seed activity rows |
| Action | Inspect seeded delete, request edit and share invite events. |
| Expected | The seeded and live forms of an event expose the same detail keys. |
| Actual | Seeded delete omits `parentId`. Seeded request edit omits title and description before and after values. Seeded invite omits `reactivated`. |
| Console errors | None. |
| Fix hint | Populate the missing fields in the seed and update the documented schema exceptions. |

## Visual Alignment Feedback

The desktop Files, Shared, Deleted files, request detail, recipient and version views use the horizontal navy navigation, serif titles, light canvas and local artwork specified in [DESIGN.md](DESIGN.md). The 390 px file layout wraps the navigation, collapses the folder rail and offers a row Details action without horizontal overflow. QA screenshots were generated locally under the ignored `test-results/` directory.

## Round History

- The four seed workflows passed again in round 2. Both previously reported browser failures reproduced. The seed activity discrepancy remains documented.
- The parent runner handles Docker dynamic certification and commits.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `111168`. The local evidence is `factory/build/dyn_certify/111168/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `users → 0 → name`.
