# Hugging Face Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5496  
> Tested by: playwright agent using installed Chromium and Node Playwright from PILOT_PLAYWRIGHT

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested | 21 views, including the Access tabs and recovery route |
| Elements tested | 175 interaction executions across the dev workflow and route suites |
| ✅ Passed | 175 |
| ❌ Failed | 0 in the final rerun |
| ⚠️ Skipped (out of scope) | 0 in-scope checks skipped |

## ✅ Passing Tests

All four SEED workflows passed. Access coverage is divided into gating and requests, review, and tokens. Every accepted action produced one POST and changed only its domain collection plus `activity[]` in `/go`. The initial snapshot stayed identical.

| Case and route | Browser coverage | Fields changed in `/go` |
| --- | --- | --- |
| M1 · `/models` | Searched by tag and description, opened Overview, Files and Settings, rejected invalid and duplicate names, created a model, saved settings, liked and unliked, and reloaded. | Creation appended `models[]` with `id`, `ownerId`, `owner`, `slug`, `name`, `description`, `tags`, `task`, `license`, `visibility`, `gating`, counters, `likedBy`, starter README in `files[]`, `createdAt`, `updatedAt`, and `createdBy`. Settings changed `description`, `tags`, `task`, `license`, `visibility`, and `updatedAt`. Like and unlike changed `likedBy`. Activity recorded `repository.created`, `repository.updated`, and `model.like_changed` with `details.liked`. |
| D1 · `/datasets` | Filtered by format, inspected split counts and rows, created and edited a dataset, saved and edited a UTF-8 text file, and reloaded its direct file view. | Creation appended `datasets[]` with repository identity and timestamps, `description`, `format`, `license`, `visibility`, starter README, and empty `splits` and `sampleRows`. Settings changed `format`, `license`, `visibility`, and `updatedAt`. File saves changed repository `updatedAt` and upserted `files[]` by stable `id`, with `path`, `content`, `sizeBytes`, `updatedAt`, and `updatedBy`. The edit preserved the file's original `createdAt` and `createdBy`. Activity recorded `repository.created`, `repository.updated`, and `dataset.file_saved` with `details.fileId`, `path`, and `operation`. |
| S1 · `/spaces` | Filtered by SDK, opened a local Static preview and checked its available controls, created a Docker Space, changed hardware, paused, restarted from Paused and Running, and reloaded. | Creation appended `spaces[]` with repository identity, `description`, `visibility`, starter README, actor and timestamps, `sdk`, `hardware`, `runtimeStatus`, and `lastStartedAt`. Settings changed `hardware` and `updatedAt`. Pause and restart changed `runtimeStatus` and `updatedAt`. Both restarts refreshed `lastStartedAt`. Activity recorded `repository.created`, `repository.updated`, `space.paused`, and `space.restarted` with `details.fromStatus` and `details.toStatus` for the runtime actions. |
| A1 · Gated repository card, files and settings | Opened a gated public model card and locked files, checked that consent was required, requested manual and automatic access, read model files and dataset samples after automatic acceptance, checked a rejected request, and opened the review queue from gated dataset settings. | The requests appended `accessRequests[]` with `id`, `repoType`, `repoId`, `requesterId`, `consent`, `purpose`, pending or accepted `status`, timestamps, and nullable review fields. Gating changed `datasets[].gating` and `updatedAt`. A later edit changed `visibility` to private and set `gating` to off. Activity recorded `access.requested` with `details.requestId` and `details.status`, `repository.gating_changed` with `details.fromMode` and `details.toMode`, and `repository.updated`. |
| A2 · `/access?tab=received` and Sent | Filtered received requests by status and resource, canceled a rejection draft, approved and rejected distinct requests, checked pending counts, moved an approved request to pending, approved a rejected request, and opened Sent. | Reviews changed `accessRequests[].status`, `updatedAt`, `reviewedAt`, `reviewedBy`, and `rejectionReason`. Each `access.reviewed` entry recorded `details.requestId`, `details.fromStatus`, and `details.toStatus`. |
| A3 · `/access?tab=tokens` | Required a permission for fine-grained tokens, created Read, Write and Fine-grained tokens, copied the one-time dummy value, canceled and confirmed revocation, and checked masked metadata after reload. Confirmed the mobile Revoke button can be used at 320 px. | Creation appended `accessTokens[]` with `id`, `ownerId`, `name`, `role`, `permissions`, `suffix`, `status`, `createdAt`, and null revocation fields. Revocation changed `status`, `revokedAt`, and `revokedBy`. Both `token.created` and `token.revoked` linked `details.tokenId`. The full dummy value was absent from `/go`. |

### Route, state and build checks

- All route views loaded directly on desktop and at 375 and 320 px with zero Chromium console errors, page errors, or horizontal page overflow. Checked brand, breadcrumbs, overview links, skip-to-content, mobile menu, catalog controls, and Activity filters.
- Revoke and Reject cancellation restored focus to the opening button. Canceled drafts, invalid submissions, unchanged saves, filters, and navigation produced zero writes.
- A fresh session bootstrapped with 30 records for each repository kind and an empty diff. A second tab in the same session and the final idle window produced no POSTs.
- Empty collections, sparse records, missing references, and a 340-record catalog rendered. A large model update persisted over 64 KB, and a private repository belonging to another user stayed inaccessible. A separate session passed `/state`, `set_current`, `/go`, and reset checks without changing the primary session.
- Session IDs survived navigation, query-string file links, redirects after creation, and hard reloads. Browser requests stayed on localhost.
- `npm run build` passed. All workflows passed again using the compiled HTML, JavaScript, and CSS from `dist/` served to Chromium by Playwright interception on localhost. The state endpoints remained live on the existing development listener at port 5496.

## ❌ Bugs for Dev Agent

No open findings.

## Visual Alignment Feedback

Reviewed local Chromium screenshots of the original workspace design at desktop and mobile widths. The mobile token list now stacks each row with readable field labels and an on-screen Revoke control.

## Round History

### Round 1 → Round 2

- AUDIT-001 · Modal cancellation lost keyboard focus. Retested successfully on the token and access review dialogs.
- BUG-001 · Mobile token statuses wrapped mid-word and Revoke required horizontal scrolling. Fixed with a responsive row layout and verified at 320 and 375 px.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `144120`. The local evidence is `factory/build/dyn_certify/144120/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `users → 0 → username`.
