# Kaggle state design

`createInitialData()` returns a plain JSON-compatible object with the keys below. Use stable string IDs, numeric counts/scores/bytes, fixed ISO timestamps in fixtures and `new Date().toISOString()` for user actions. Fields marked `?` may be omitted on injected records. The examples are synthetic.

## Account and catalog records

| Top-level key | Shape | Example values and relationships |
|---|---|---|
| `account` | `{id, username, displayName}` strings | `usr-morgan`, `morganlee`, Morgan Lee |
| `users[]` | `{id, username, displayName, initials?}` strings | `usr-inez`, `inezpark`, Inez Park, IP. Ownership references may resolve through account or users. |
| `competitions[]` | `{id, slug, title, host, category, summary?, description?, metric?, scoreDirection?, status, startsAt?, endsAt?, teamCount?, rulesVersion?, rules?, files?}` | `cmp-ferry`, `harbor-ferry-demand`, Harbor Ferry Demand, Coastal Transit Lab, Forecasting, MAE, `lower`, `open`, team count 342, rules version 1. Files are File records; rules are plain text; dates are ISO strings. `status` is `open\|closed` and `scoreDirection` is `higher\|lower`. |
| `competitionLeaderboard[]` | `{id, competitionId, teamName, score, submittedAt?}` | `rank-ferry-01`, `cmp-ferry`, Tidepool Lab, 0.1264. Rank is derived. |
| `notebooks[]` | `{id, slug, ownerId, title, language, visibility, summary?, tags?, votes?, cells?, datasetIds?, forkedFromId?, latestVersionId?, createdAt, updatedAt}` | `nb-ferry-baseline`, `weekday-demand-baseline`, `usr-inez`, Weekday Demand Baseline, `python`, `public`, tags `["forecasting"]`, votes 18, `["ds-ferry"]`, latest `nv-ferry-02`. Languages `python\|r`; visibility `private\|public`. Cells describe the draft. |
| `datasets[]` | `{id, slug, ownerId, title, description?, license, visibility, tags?, downloadCount?, latestVersionId?, createdAt, updatedAt}` | `ds-ferry`, `harbor-ferry-ridership`, `usr-inez`, Harbor Ferry Ridership, `CC BY 4.0`, `public`, tags `["transport"]`, 240, `dv-ferry-02`. |

## Child and activity records

With the exception of fixture leaderboard rows above, activity records have an `id`, `actorId` and `createdAt` shared across shapes below. All ID references are strings.

| Top-level key | Additional fields | Example |
|---|---|---|
| `competitionEntries[]` | `competitionId, rulesVersion` (integer), `status` | `cmp-ferry`, 1, `joined`. Uniqueness by competition, actor and rules revision. |
| `competitionSubmissions[]` | `competitionId, entryId, file, description, status, score` | `cmp-ferry`, `entry-ferry-01`, File record, “Weekday baseline”, `scored`, numeric 0.1524. |
| `notebookDraftSaves[]` | `notebookId, status` | `nb-ferry-baseline`, `saved`. Mutable draft fields live on the parent. |
| `notebookVersions[]` | `notebookId, number, title, cells, datasetIds, message` | `nb-ferry-baseline`, 2, Weekday Demand Baseline, a Cell array, `["ds-ferry"]`, “Compare weekend patterns”. Snapshot contents remain immutable. |
| `datasetVersions[]` | `datasetId, number, files, notes` | `ds-ferry`, 2, a File array, “Add October boardings”. File lists remain immutable. |
| `datasetEdits[]` | `datasetId, changedFields` (string array), `status` | `ds-ferry`, `["title","license"]`, `saved`. |
| `downloads[]` | `entityType, entityId, versionId, fileId, status` | `dataset`, `ds-ferry`, `dv-ferry-02`, `file-ridership-oct`, `requested`. For a `competition`, versionId is null. A record represents initiating the browser download. |
| `visibilityChanges[]` | `entityType, entityId, from, to` | `notebook`, `nb-ferry-baseline`, `private`, `public`. Entity type can also be `dataset`. |

**File record** — `{id, name, sizeBytes, contentType, url, preview?}`. Example `file-ridership-oct`, `ridership.csv`, 1452, `text/csv`, `/fixtures/ferry-ridership.csv`, `{columns: ["date","route","boardings"], rows: [["2025-10-01","Bay Loop","43"]]}`. Use a local fixture URL or the same-origin URL returned by Harbor. Preserve bytes and original filename. Preview rows are optional.

**Cell record** — `{id, type, source}`. Example `cell-ridership-summary`, `markdown`, `"Review missing boardings by route."`. Type is `code` or `markdown`. Array order is editor order.

## Seed relationships

Return the account, several synthetic owners, the three catalogs and every child array in the tables. Include selected seeded participation, original notebook and dataset versions, and leaderboard fixtures. Initialize the draft-save, visibility, download and dataset-edit arrays empty. Version numbers increase from the highest number for that parent. Generate slugs from titles at creation, disambiguate within the route scope and keep the slug stable through edits. Use exact parent IDs for links and derive counts from stored records where applicable. Missing links in injected worlds render readable fallbacks and disable dependent actions.

## Observable state changes

| User action | Persisted write |
|---|---|
| Accept competition rules | Append one entry with the actor, competition and accepted revision. |
| Submit predictions | Append one submission referencing the exact joined entry and uploaded file with the deterministic score. |
| Download competition or dataset file | Append one download with the exact entity, version where applicable, and file ID. |
| New Notebook, Copy & Edit, New Notebook from dataset | Append one notebook owned by the actor with `visibility: "private"` and initial draft. Set `forkedFromId` only for copies and initialize `datasetIds` from the chosen context. Clear inherited versions and votes on copies. |
| Save notebook draft | Update `title, cells, datasetIds, updatedAt`; append one `notebookDraftSaves` record. |
| Save notebook version | Update `title, cells, datasetIds, updatedAt, latestVersionId`; append one version containing the saved snapshot. |
| Change notebook visibility | Update `visibility, updatedAt`; append one visibility record. |
| Create dataset | Append the dataset with ownership and metadata and append its first version. Parent points to that version. |
| Edit dataset | Update changed `title, description, license, tags, visibility` and `updatedAt`; append one edit record. Append a visibility record when that field changes. |
| Publish dataset version | Append one version and update the parent's `latestVersionId, updatedAt` together. |

Search, navigation, previews, version selection, unsaved edits, canceled forms and invalid commands require no business writes. Store transient UI state locally in components or in the route.
