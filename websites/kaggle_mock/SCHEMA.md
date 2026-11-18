# kaggle_mock Schema

**Base URL**: `http://localhost:5497/`  
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}`

The shared API preserves the first initial snapshot. Reset restores the current world to that snapshot. `/go` reports changed top-level keys as `{modified: value}` and added keys as `{added: value}`. Use a fresh SID when opening an injected world in a browser that already cached an earlier visit.

## State Schema

Each ID is a string. Fixture IDs are fixed and IDs for new records are generated locally. Dates are ISO timestamps. The app writes the whole world after a successful command. An injected array replaces its seeded array, and an injected object merges into the seeded object.

| Key | Shape |
|---|---|
| `account` | `{id, username, displayName}` |
| `users[]` | `{id, username, displayName, initials?}` |
| `competitions[]` | `{id, slug, title, host, category, summary?, description?, metric?, scoreDirection?, status, startsAt?, endsAt?, teamCount?, rulesVersion?, rules?, files?}`. Status is `open\|closed`, score direction is `higher\|lower`, and the missing rules revision defaults to 1. |
| `competitionLeaderboard[]` | `{id, competitionId, teamName, score, submittedAt?}`. The signed-in entrant's best score and rank are derived from submissions. |
| `competitionEntries[]` | Activity with `competitionId, rulesVersion, status`. The status is `joined` and the uniqueness key is competition, actor and rules revision. |
| `competitionSubmissions[]` | Activity with `competitionId, entryId, file, description, status, score`. The status is `scored` and `score` is numeric. |
| `notebooks[]` | `{id, slug, ownerId, title, language, visibility, summary?, tags?, votes?, cells?, datasetIds?, forkedFromId?, latestVersionId?, createdAt, updatedAt}`. Language is `python\|r`. |
| `notebookDraftSaves[]` | Activity with `notebookId, status`. The status is `saved`. |
| `notebookVersions[]` | Activity with `notebookId, number, title, cells, datasetIds, message`. |
| `datasets[]` | `{id, slug, ownerId, title, description?, license, visibility, tags?, downloadCount?, latestVersionId?, createdAt, updatedAt}`. Catalog download totals add the seeded count and recorded downloads. |
| `datasetVersions[]` | Activity with `datasetId, number, files, notes`. |
| `datasetEdits[]` | Activity with `datasetId, changedFields, status`. `changedFields` is a string array and status is `saved`. |
| `downloads[]` | Activity with `entityType, entityId, versionId, fileId, status`. Entity type is `competition\|dataset`, `versionId` is null for competitions, and status is `requested`. |
| `visibilityChanges[]` | Activity with `entityType, entityId, from, to`. Entity type is `notebook\|dataset`. |

- Each activity has `id`, `actorId` and `createdAt`.
- A file has `{id, name, sizeBytes, contentType, url, preview?}`. Fixture URLs start with `/fixtures/` and upload URLs come from Harbor under `/files/`. CSV previews, when present, have `{columns, rows}`, with rows stored as arrays of field values.
- A cell has `{id, type, source}` with type `code|markdown`. The array stores the display order.
- When an injected notebook omits draft `cells` or `datasetIds`, the view and editor use the corresponding field from the latest saved version. An explicit empty array is retained.
- Visibility is `private|public`. Visibility history uses null for the prior value if an injected record omitted it.
- Version numbers increase from the highest existing number for the parent. Entity slugs are unique within the owner's route scope and stay stable through renames.

### Default IDs

| Entity | Fixture IDs |
|---|---|
| Account | `usr-morgan` |
| Additional owners | `usr-inez`, `usr-dev`, `usr-alba`, `usr-nia` |
| Competitions | `cmp-ferry`, `cmp-2` through `cmp-30` |
| Notebooks | `nb-ferry-baseline`, `nb-2` through `nb-36` |
| Datasets | `ds-ferry`, `ds-2` through `ds-42` |
| Seeded participation and submissions | `entry-2`, `entry-3`, `entry-5`, `sub-1`, `sub-2` |

## Minimal Inject Example

This partial world replaces the competition catalog and its related records. The account, notebook catalog, and dataset catalog retain their seeded defaults.

```json
{
  "competitions": [{"id":"cmp-injected","slug":"test-challenge","title":"Test Challenge","status":"open"}],
  "competitionEntries": [],
  "competitionSubmissions": [],
  "competitionLeaderboard": []
}
```

## Observable State Changes (for LLM evaluation)

Every appended activity includes the common activity fields above.

| Confirmed user action | Fields written |
|---|---|
| Accept Rules | Append `competitionEntries[]{competitionId, rulesVersion, status}` for the open competition and current revision. |
| Submit predictions | Append `competitionSubmissions[]{competitionId, entryId, file, description, status, score}` after validating and uploading a CSV with `id` and `prediction` columns and unique row IDs. |
| Download File | Append `downloads[]{entityType, entityId, versionId, fileId, status}` for the exact competition file or selected dataset version file. |
| Create Notebook, Create Copy, or Create Notebook from Dataset | Append `notebooks[]{id, slug, ownerId, title, language, visibility, cells, datasetIds, tags, votes, createdAt, updatedAt}`. The notebook starts private with zero votes. Copies also include `forkedFromId`, copy saved cells with new cell IDs, and carry accessible source dataset inputs. Creating from a dataset preselects that dataset's ID. |
| Save Draft | Update the notebook's `title, cells, datasetIds, updatedAt` and append `notebookDraftSaves[]{notebookId, status}`. |
| Save Version | Update the notebook's `title, cells, datasetIds, updatedAt, latestVersionId` and append `notebookVersions[]{notebookId, number, title, cells, datasetIds, message}`. |
| Change notebook visibility | Update the notebook's `visibility, updatedAt` and append `visibilityChanges[]{entityType, entityId, from, to}`. |
| Create Dataset | Append `datasets[]{id, slug, ownerId, title, description, license, visibility, tags, latestVersionId, createdAt, updatedAt, downloadCount}` and `datasetVersions[]{datasetId, number, files, notes}`. The first version has number 1, and the dataset links to it. |
| Save dataset details | Update `updatedAt` and changed fields among `title, description, license, tags, visibility`. Append `datasetEdits[]{datasetId, changedFields, status}`. Append `visibilityChanges[]{entityType, entityId, from, to}` if visibility changed. |
| Publish Version | Append `datasetVersions[]{datasetId, number, files, notes}` and update the dataset's `latestVersionId, updatedAt`. |

Browsing, searching, filtering, sorting, paging, choosing a version, viewing a preview, editing an unsaved form, cancelling, saving an unchanged draft, repeated acceptance of the same rules revision, failed validation, and failed file transfers leave the business state unchanged.
