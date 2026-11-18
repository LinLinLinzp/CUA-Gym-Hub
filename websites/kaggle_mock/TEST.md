# Kaggle Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5497  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
|--------|-------|
| Route patterns tested, including the catch-all | 13 |
| Interaction and contract check groups | 44 |
| ✅ Passed | 44 |
| ❌ Failed | 0 |
| ⚠️ Skipped (out of scope) | 3 |

The skipped areas were production authentication, execution of arbitrary notebook code, and external integrations. Chromium reported zero unexpected console errors, page exceptions, or external requests in the final round. `npm run build` passed. A separate smoke test loaded `dist/` HTML, JS, and CSS in Chromium on the localhost origin, used the live Harbor state endpoints, created a notebook, and hard-reloaded its editor.

## ✅ Passing Tests

- **Home and workspace** — Verified catalog cards, the Kaggle wordmark, account menu open and close, Escape focus return, outside dismissal, workspace links and groups, browser back/forward, and the friendly unknown-route fallback. Navigation retained `sid` and produced no business writes.
- **Competitions** — Searched by title, summary, and category. Tested category, open, closed, and joined filters, deadline and teams ordering, pagination, keyboard search focus, hover, and card navigation. Opened Overview, Data, Rules, Leaderboard, and My Submissions. Exercised revision acceptance, download, prediction submission, score, and the signed-in leaderboard row. A prior revision did not unlock participation after a revision bump. Joined status and submissions survived reload. Closed competitions and users who had yet to accept the current rules were gated. Invalid files, simulated upload failure, and cancelled dialogs produced no writes.
- **Notebooks** — Searched by title, owner, and tag. Tested language and ownership filters, votes and updated sorting, pagination, and detail navigation. Opened saved cells, example output, linked datasets, and older snapshots. Created and forked private drafts. Renamed, edited, added, reordered, and removed cells, and added and removed a dataset input. Saved a draft and two immutable versions, inspected version 1 after version 2 existed, and changed visibility in both directions. Verified protected editing, stable slug, refreshed draft and version contents, and workspace entries. Blank titles, unchanged drafts, unsaved changes, and cancellations produced no writes.
- **Datasets** — Searched by title, owner, and tag. Tested license, file type, and ownership filters, updated and download sorting, and pagination. Viewed license, files, history, previews, and column summaries. Created a private dataset with two local files, edited its metadata and visibility, published a replacement version with release notes, and downloaded exact file bytes from both versions. Created a notebook with the dataset preselected. Verified stable slug, metadata, latest file list, retained historical files, linked notebook input, and workspace entries on subsequent navigation and reload. Invalid selections, failed upload and download, unchanged edits, cancellations, and preview and history browsing produced no writes.
- **Harbor** — Verified `/post`, `/go`, reset to baseline, session isolation, and an idle browser sending no post after boot while a second browser wrote to the same SID. Tested the default 30 competitions, 36 notebooks, and 42 datasets, an empty injected world with merged account fields, a sparse world with missing relationships and optional fields, and a world with 270 records per catalog. Confirmed same-origin file transfers, SID retention, final-page pagination, and deep-link reloads.

### Observed `/go` changes

Every row below reflects a real UI action checked against `/go?sid=…` before and after. Each action produced one `set_current` request and changed exactly the listed top-level keys. Every appended activity includes `id`, `actorId`, and ISO `createdAt` in addition to the fields shown.

| Workflow and confirmed action | `/go` state fields changed |
|---|---|
| Competition — accept current rules in the seeded and reissued-revision worlds | Appended `competitionEntries[]` with `competitionId`, `rulesVersion`, `status=joined`. The earlier revision entry remained intact. |
| Competition — download unlocked `ridership.csv` | Appended `downloads[]` with `entityType=competition`, `entityId`, `versionId=null`, `fileId`, `status=requested`. |
| Competition — submit the local sample CSV | Appended `competitionSubmissions[]` with `competitionId`, `entryId`, `file` (`id`, `name`, `sizeBytes`, `contentType`, `url`), `description`, `status=scored`, numeric `score`. The leaderboard derived the personal row from the submission. |
| Notebook — create private R draft | Appended `notebooks[]` with `id`, `slug`, `ownerId`, `title`, `language`, `visibility=private`, `cells`, `datasetIds`, `tags`, `votes`, `createdAt`, `updatedAt`. |
| Notebook — copy and edit the saved baseline | Appended a separate `notebooks[]` record with `id`, `slug`, `ownerId`, `title`, `language`, `visibility=private`, copied `cells` with new IDs, `datasetIds`, `tags`, `votes`, `createdAt`, `updatedAt`, and `forkedFromId`. The original was unchanged. |
| Notebook — save edited draft | Updated `notebooks[].title`, `cells`, `datasetIds`, `updatedAt`. Appended `notebookDraftSaves[]` with `notebookId`, `status=saved`. |
| Notebook — save versions 1 and 2 | Updated `notebooks[].title`, `cells`, `datasetIds`, `updatedAt`, `latestVersionId`. Appended `notebookVersions[]` with `notebookId`, `number`, `title`, `cells`, `datasetIds`, `message`. |
| Notebook — private to public to private | Updated `notebooks[].visibility`, `updatedAt`. Appended `visibilityChanges[]` with `entityType=notebook`, `entityId`, `from`, `to` for each transition. |
| Dataset — create dataset with CSV and TXT | Appended `datasets[]` with `id`, `slug`, `ownerId`, `title`, `description`, `license`, `visibility=private`, `tags`, `downloadCount`, `latestVersionId`, `createdAt`, `updatedAt`. Appended `datasetVersions[]` with `datasetId`, `number=1`, `files`, `notes`. File records included `id`, `name`, `sizeBytes`, `contentType`, `url`, and CSV `preview` with `columns` and `rows`. |
| Dataset — save details and make public | Updated `datasets[].title`, `description`, `license`, `tags`, `visibility`, `updatedAt`. Appended `datasetEdits[]` with `datasetId`, `changedFields`, `status=saved` and `visibilityChanges[]` with `entityType=dataset`, `entityId`, `from=private`, `to=public`. |
| Dataset — publish replacement files | Updated `datasets[].latestVersionId`, `updatedAt`. Appended `datasetVersions[]` with `datasetId`, `number=2`, `files`, `notes`. Version 1 remained unchanged. |
| Dataset — download file from each version | Appended `downloads[]` with `entityType=dataset`, `entityId`, the selected `versionId` and `fileId`, `status=requested`. |
| Dataset — create notebook from collection | Appended `notebooks[]` with private visibility, owner and starter draft fields. The new notebook's `datasetIds` contained the selected dataset's ID. The dataset was unchanged. |
| All three workflows — browse, filter, sort, paginate, preview, select stored versions, edit an unsaved form, cancel, or fail validation or transfer | No changes to business records and no `set_current` request. |

## ❌ Bugs for Dev Agent

No open bugs found in the final round.

## Visual Alignment Feedback

Evaluated the local UI against `DESIGN.md`. Captured desktop home, workspace, catalogs, competition details, notebook detail and editor, and dataset detail and history, plus mobile home and catalog. The indigo hero with original chart art, horizontal navigation, catalog controls, cards, and two-column notebook editor rendered as designed. The home and catalog had no document overflow at a 390 px viewport. All screenshots and the test runner are under gitignored `.local-tests/`.

## Round History

### Round 1 → Round 2

- **BUG-001 · P1 · Active dataset preview was a no-op.** Clicking the selected Preview now collapses it and updates `aria-pressed`. Clicking again reopens it. Switching files and versions was retested without business-state changes.
- **BUG-002 · P1 · A well-shaped CSV without prediction fields could be scored.** Validation now checks for `id` and `prediction` columns and unique row IDs. Browser tests confirmed malformed rows, missing columns, and duplicate IDs produced no file upload or persisted submission, and the supplied sample still scored.

**TEST COMPLETE — kaggle_mock passed all seeded workflows in Chromium on localhost.**

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `123136`. The local evidence is `factory/build/dyn_certify/123136/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `users → 0 → username`.
