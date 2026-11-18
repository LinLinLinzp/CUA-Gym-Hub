# Databricks_mock Schema

**Base URL** `http://127.0.0.1:5489/`  
**Go Endpoint** `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject** `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset** `POST /post?sid=<sid>` with body `{"action":"reset"}`

Inject into a fresh session before opening its first browser page. Reset restores the server's initial snapshot, or the seed if the session has no snapshot. The application sends a complete state snapshot for each accepted business action. New records use prefixed UUIDs and action timestamps use ISO 8601 UTC strings.

## State Schema

| Key | Shape |
| --- | --- |
| `workspace` | `{ id, name }` |
| `currentUser` | `User` |
| `users` | `User[]` |
| `notebooks` | `Notebook[]` |
| `notebookRuns` | `NotebookRun[]` |
| `jobs` | `Job[]` |
| `jobRuns` | `JobRun[]` |
| `clusters` | `Cluster[]` |
| `clusterEvents` | `ClusterEvent[]` |
| `activity` | `ActivityEvent[]` |

- **User** has `id`, `name`, and `email`. User IDs link owners, editors, and actors to users. A missing actor falls back to the default actor ID when the app writes a new action.
- **Notebook** has `id`, `name`, `folder`, `language`, `clusterId` (string or null), ordered `cells`, and the ownership and edit fields below. Its display path is derived from folder and name. `language` is `python`, `sql`, `scala`, or `r`.
- **Cell** has `id`, `kind` (`code` or `markdown`), `language` (a notebook language or null for Markdown), and `source` (string).
- **NotebookRun** has `id`, `notebookId`, `notebookName`, `clusterId`, `actorId`, `createdAt`, `endedAt`, `scope` (`cell` or `all`), `status` (`succeeded` or `failed`), ordered `cellIds`, and ordered `results`.
- **CellResult** has `cellId`, `language`, `source`, `status` (`succeeded` or `failed`), and `output`.
- **Job** has `id`, `name`, `description`, `tasks`, `schedule` (object or null), and the ownership and edit fields below.
- **Task** has `key`, `notebookId`, `compute` (`{ mode: 'serverless', clusterId: null }` or `{ mode: 'cluster', clusterId }`), `parameters` (string-to-string object), and `dependsOn` (array of task keys in the same job).
- **Schedule** has `frequency` (`daily` or `weekly`), `time` (HH:mm), `timezone` (IANA name), `weekday` (0 for Sunday through 6 for Saturday, null for daily), and `paused` (boolean).
- **JobRun** has `id`, `jobId`, `jobName`, `actorId`, `trigger` (`manual` or `scheduled`), `status` (`queued`, `running`, `succeeded`, `failed`, or `canceled`), `createdAt`, nullable `startedAt`, `endedAt`, `canceledAt`, and `canceledBy`, plus `parameterOverrides` (string-to-string object) and `tasks` (task snapshots in dependency order).
- **TaskRun** contains the Task fields with effective parameters plus nullable `notebookName`, `startedAt`, `endedAt`, and `output`. The `status` field accepts job-run statuses plus `skipped`.
- **Output** is `{ kind: 'text' | 'error', text }` or `{ kind: 'table', columns, rows }`. Table columns are strings. Rows are arrays of strings, numbers, booleans, or null.
- **Cluster** has `id`, `name`, `runtime`, `nodeType`, `scaling`, `autoTerminationMinutes` (nonnegative integer, 0 for off), `status` (`running` or `terminated`), nullable `lastStartedAt`, `lastRestartedAt`, `lastTerminatedAt`, and the ownership and edit fields below.
- **Scaling** is `{ mode: 'single' }`, `{ mode: 'fixed', workers }`, or `{ mode: 'autoscale', minWorkers, maxWorkers }`. All worker counts are positive integers.
- **ClusterEvent** has `id`, `clusterId`, `clusterName`, `actorId`, `createdAt`, `action`, `previousStatus` and `status` (cluster status or null), and `changes` (configuration field values that changed, otherwise an empty object).
- **ActivityEvent** has `id`, `entityType` (`notebook` or `job`), `entityId`, `entityName`, `actorId`, `createdAt`, `action`, `changes`, and `relatedId` (associated run or source notebook ID, otherwise null).

Notebooks, jobs, and clusters have `ownerId`, `createdBy`, `createdAt`, `updatedBy`, and `updatedAt`. The reads tolerate missing optional fields and missing linked records. The baseline push includes defaults merged using the shared Harbor utility.

### Default IDs

- Workspace `ws-acme`. Current actor `usr-maya`. Other users are `usr-javier`, `usr-priya`, `usr-samira`, `usr-noah`, and `usr-alma`.
- Notebooks `nb-001` through `nb-036`, cells `cell-001` through `cell-072`, notebook runs `nbr-001` through `nbr-036`.
- Jobs `job-001` through `job-030`, job runs `run-001` through `run-060`. Seeded active and queued runs are `run-032` and `run-035`, respectively.
- Clusters `cl-001` through `cl-024`, cluster events `cle-001` through `cle-048`, and activity `act-001` through `act-012`.

## Minimal Inject Example

Send the following JSON to the inject endpoint. The notebook and job are directly accessible at `/workspace/notebooks/nb-example` and `/jobs/job-example` with the same `sid`.

```json
{
  "action": "set",
  "state": {
    "notebooks": [
      {
        "id": "nb-example",
        "name": "Order sample",
        "folder": "/Shared",
        "language": "sql",
        "cells": [{ "id": "cell-example", "kind": "code", "language": "sql", "source": "SELECT 42 AS order_count" }]
      }
    ],
    "jobs": [
      {
        "id": "job-example",
        "name": "Validate orders",
        "tasks": [{ "key": "validate", "notebookId": "nb-example", "compute": { "mode": "serverless", "clusterId": null } }]
      }
    ],
    "clusters": [],
    "notebookRuns": [],
    "jobRuns": [],
    "clusterEvents": [],
    "activity": []
  }
}
```

## Observable State Changes (for LLM evaluation)

Each edit marked **stamp** also sets the edited record’s `updatedBy` and `updatedAt`. Each appended event contains its full record shape listed above. An empty event payload means `changes: {}`.

| User action | Primary state write | Appended event |
| --- | --- | --- |
| Create notebook | Append `notebooks[]` with the name, folder, language, a null cluster ID, and one empty code cell | `activity[]` `created` |
| Rename notebook | Set `notebooks[].name` + stamp | `renamed` with `changes.name` |
| Change default notebook language | Set `notebooks[].language` + stamp | `language_changed` with `changes.language` |
| Save notebook cells | Replace ordered `notebooks[].cells` + stamp | `cells_saved` with `changes.cellIds` |
| Add a code or Markdown cell | Append the new cell, persist included drafts in `notebooks[].cells` + stamp | `cell_added` with `changes.cellId` and `kind` |
| Remove a cell | Remove the selected cell, persist remaining drafts in `notebooks[].cells` + stamp | `cell_removed` with `changes.cellId` |
| Move a cell | Reorder cells, persist drafts in `notebooks[].cells` + stamp | `cell_moved` with `changes.cellId`, `fromIndex`, and `toIndex` (zero-based) |
| Attach or detach compute | Set `notebooks[].clusterId` to the selected cluster ID or null + stamp | `attached` or `detached` with `changes.clusterId` |
| Run cell, Shift+Enter, or Run all | Append one `notebookRuns[]` with selected runnable cell IDs and result snapshots. If drafts exist, replace `notebooks[].cells` + stamp in the same write | `run_started` with `changes.cellIds`, `clusterId`, `cellsSaved`, and run `relatedId` |
| Duplicate notebook | Append `notebooks[]` with copied folder, language, saved cell content and fresh notebook/cell IDs, and null cluster ID | `duplicated` with `changes.sourceNotebookId` and the source notebook `relatedId` |
| Delete eligible notebook | Remove matching record from `notebooks[]`. Its runs remain in `notebookRuns[]` | `deleted` with the notebook ID and name |
| Create job | Append `jobs[]` with name, empty description, first task, and null schedule | `activity[]` `created` |
| Edit job settings | Set `jobs[].name`, `description` + stamp | `settings_updated` with `changes.name` and `description` |
| Add, edit, or remove job task | Replace `jobs[].tasks` including reconciled dependency references + stamp | `tasks_updated` with `changes.tasks` |
| Save schedule | Set `jobs[].schedule` + stamp | `schedule_saved` with `changes.schedule` |
| Pause or resume schedule | Set `jobs[].schedule.paused` + stamp | `schedule_paused` or `schedule_resumed` with `changes.schedule` |
| Remove schedule | Set `jobs[].schedule` to null + stamp | `schedule_removed` with `changes.schedule: null` |
| Run job now | Append a full `jobRuns[]` record with effective task parameters, ordered task snapshots and outputs | `run_started` with `changes.status` and job run `relatedId` |
| Cancel active or queued run | Set `jobRuns[].status`, `endedAt`, `canceledAt`, `canceledBy`, and each running or queued task’s `status` and `endedAt` | `run_canceled` with `changes.status` and job run `relatedId` |
| Delete eligible job | Remove matching record from `jobs[]`. Its runs remain in `jobRuns[]` | `deleted` with the job ID and name |
| Create compute | Append `clusters[]` with configuration, `status: running`, and `lastStartedAt` | `clusterEvents[]` `created` with null previous status and running result |
| Edit compute configuration | Set `clusters[].name`, `runtime`, `nodeType`, `scaling`, `autoTerminationMinutes` + stamp | `updated` with previous and resulting status and changed configuration values in `changes` |
| Start terminated compute | Set `clusters[].status: running`, `lastStartedAt` + stamp | `started` with terminated → running status |
| Restart running compute | Set `clusters[].status: running`, `lastStartedAt`, `lastRestartedAt` + stamp | `restarted` with running → running status |
| Terminate running compute | Set `clusters[].status: terminated`, `lastTerminatedAt` + stamp. Current attachments retain their IDs | `terminated` with running → terminated status |
| Delete eligible terminated compute | Remove matching record from `clusters[]`. Events remain in `clusterEvents[]` | `deleted` with terminated previous status, null resulting status, and cluster ID/name |

Searches, filters, sorting, navigation, unsubmitted drafts, and rejected actions write no business state. Notebook cell drafts stay in memory when navigating within the app and are cleared on page reload. Schedule settings and auto-termination durations are configuration read by the workspace. All execution results come from local fixtures.
