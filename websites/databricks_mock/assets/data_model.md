# Databricks workspace state model

`createInitialData()` returns a fresh JSON value with the keys below. Use fixed string IDs and ISO timestamps in seed data. Generate IDs for user-created records and use `new Date().toISOString()` for action timestamps. All types below describe data written by the app. Injected records can omit optional fields and can reference unavailable resources.

## Top-level keys

| Key | Type | Seed and example |
| --- | --- | --- |
| `workspace` | `Workspace` | `{id: 'ws-acme', name: 'Acme Analytics'}` |
| `currentUser` | `User` | `usr-maya`, Maya Chen |
| `users` | `User[]` | Maya Chen, Javier Ortiz, Priya Raman, Samira Bennett, Noah Park, Alma Reed |
| `notebooks` | `Notebook[]` | 36 notebooks starting with `nb-001` |
| `notebookRuns` | `NotebookRun[]` | 36 historical runs starting with `nbr-001` |
| `jobs` | `Job[]` | 30 jobs starting with `job-001` |
| `jobRuns` | `JobRun[]` | 60 runs starting with `run-001` |
| `clusters` | `Cluster[]` | 24 clusters starting with `cl-001` |
| `clusterEvents` | `ClusterEvent[]` | 48 events starting with `cle-001` |
| `activity` | `ActivityEvent[]` | Recent notebook/job events starting with `act-001`; overview can combine them with cluster events |

Workspace fields are `id` and `name` (strings). User fields are `id`, `name`, and `email` (strings), for example `usr-maya`, `Maya Chen`, and `maya.chen@acme.example`. Owner and actor IDs reference these users. `currentUser.id` is the actor for new actions. Provide a readable fallback for unresolved people.

## Notebook and execution records

| Field | Type | Example or meaning |
| --- | --- | --- |
| `Notebook.id`, `name`, `folder` | string | `nb-001`, `Orders quality checks`, `/Shared/Retail` |
| `Notebook.language` | `python` \| `sql` \| `scala` \| `r` | `sql`, default for new code cells |
| `Notebook.ownerId`, `createdBy`, `updatedBy` | string | `usr-maya` |
| `Notebook.clusterId` | string or null | `cl-001` or null for detached |
| `Notebook.cells` | `Cell[]` | Ordered editable cell documents |
| `Notebook.createdAt`, `updatedAt` | ISO string | `2026-10-06T14:20:00.000Z` |
| `Cell.id`, `source` | string | `cell-001`, `SELECT 42 AS order_count` |
| `Cell.kind`, `language` | `code` \| `markdown`, notebook language or null | `code`, `sql`; Markdown uses null language |
| `NotebookRun.id`, `notebookId`, `notebookName`, `clusterId`, `actorId` | string | `nbr-001`, `nb-001`, `Orders quality checks`, `cl-001`, `usr-maya` |
| `NotebookRun.scope`, `status` | `cell` \| `all`, `succeeded` \| `failed` | `cell`, `succeeded` |
| `NotebookRun.createdAt`, `endedAt` | ISO string | `2026-10-06T14:20:00.000Z` |
| `NotebookRun.cellIds`, `results` | string array, `CellResult[]` | `['cell-001']`, ordered stable results |
| `CellResult.cellId`, `language`, `source` | string | `cell-001`, `sql`, `SELECT 42 AS order_count`; snapshot of what ran |
| `CellResult.status`, `output` | `succeeded` \| `failed`, `Output` | `succeeded`, `{kind:'table', columns:['order_count'], rows:[[42]]}` |

`Output` is `{kind:'text'|'error', text:string}` or `{kind:'table', columns:string[], rows:(string|number|boolean|null)[][]}`. Example text is `Processed 24 synthetic records.` Example error is `The selected compute is unavailable.` Use fixtures selected by language and simple recognized inputs. Never evaluate cell source. Derive current notebook outputs from the newest run containing each cell ID. A missing or blank source displays safely and is excluded from new runs.

## Job and run records

| Field | Type | Example or meaning |
| --- | --- | --- |
| `Job.id`, `name`, `description` | string | `job-001`, `Daily orders refresh`, `Validate the daily order extract.` |
| `Job.ownerId`, `createdBy`, `updatedBy` | string | `usr-maya` |
| `Job.createdAt`, `updatedAt` | ISO string | `2026-10-06T14:20:00.000Z` |
| `Job.tasks`, `schedule` | `Task[]`, `Schedule` or null | Notebook tasks and optional recurring schedule |
| `Task.key`, `notebookId` | string | `validate-orders`, `nb-001` |
| `Task.compute` | `{mode:'serverless', clusterId:null}` or `{mode:'cluster', clusterId:string}` | `{mode:'cluster', clusterId:'cl-001'}` |
| `Task.parameters`, `dependsOn` | string-to-string object, string array | `{region:'west'}`, `['load-orders']` |
| `Schedule.frequency`, `time`, `timezone` | `daily` \| `weekly`, `HH:mm` string, IANA timezone | `weekly`, `08:30`, `America/New_York` |
| `Schedule.weekday`, `paused` | integer 0–6 (Sunday = 0) or null for daily, boolean | `1`, `false` |
| `JobRun.id`, `jobId`, `jobName`, `actorId` | string | `run-001`, `job-001`, `Daily orders refresh`, `usr-maya` |
| `JobRun.trigger`, `status` | `manual` \| `scheduled`, `queued` \| `running` \| `succeeded` \| `failed` \| `canceled` | `manual`, `succeeded` |
| `JobRun.createdAt`, `startedAt`, `endedAt` | ISO strings, start/end nullable | `2026-10-06T14:20:00.000Z` |
| `JobRun.canceledAt`, `canceledBy` | ISO string or null, string or null | Populated on cancel |
| `JobRun.parameterOverrides` | string-to-string object | `{region:'east'}`, overrides same-named task parameters only for this run |
| `JobRun.tasks` | `TaskRun[]` | One snapshot/result per saved task |
| `TaskRun` | `Task` fields plus `notebookName`, `status`, `output`, `startedAt`, `endedAt` | `notebookName` is string or null, parameters are the effective parameters, status uses job statuses plus `skipped`, output is `Output` or null, and timestamps are ISO strings or null |

Store results in dependency order and use task keys within each job. Active seeded tasks can transition to canceled, while finished task results remain as recorded. Simulated manual runs complete in the confirming action. `JobRun.tasks` captures the task configuration and the notebook name at the time of execution. Run pages can render through `JobRun.jobId` and `jobName` even after the job is deleted.

## Cluster and lifecycle records

| Field | Type | Example or meaning |
| --- | --- | --- |
| `Cluster.id`, `name`, `ownerId` | string | `cl-001`, `Retail analytics shared`, `usr-maya` |
| `Cluster.runtime`, `nodeType` | string | `16.4 LTS`, `m5d.xlarge` |
| `Cluster.scaling` | `{mode:'single'}` or `{mode:'fixed', workers:number}` or `{mode:'autoscale', minWorkers:number, maxWorkers:number}` | `{mode:'autoscale', minWorkers:2, maxWorkers:6}`; worker values are positive integers |
| `Cluster.autoTerminationMinutes` | nonnegative integer | `45`; `0` means off |
| `Cluster.status` | `running` \| `terminated` | `running` |
| `Cluster.createdBy`, `updatedBy` | string | `usr-maya` |
| `Cluster.createdAt`, `updatedAt` | ISO string | `2026-10-06T14:20:00.000Z` |
| `Cluster.lastStartedAt`, `lastRestartedAt`, `lastTerminatedAt` | ISO string or null | Create initializes start, Start updates start, Restart updates start and restart, Terminate updates termination |
| `ClusterEvent.id`, `clusterId`, `clusterName`, `actorId` | string | `cle-001`, `cl-001`, `Retail analytics shared`, `usr-maya` |
| `ClusterEvent.action` | `created` \| `updated` \| `started` \| `restarted` \| `terminated` \| `deleted` | `restarted` |
| `ClusterEvent.previousStatus`, `status` | cluster status or null | Creation has null previous status. Deletion has null resulting status. Updates can retain status. |
| `ClusterEvent.createdAt`, `changes` | ISO string, object | Exact changed cluster configuration fields on edits; `{}` on lifecycle actions |

## Activity events and links

Each `ActivityEvent` has `id`, `entityType` (`notebook` or `job`), `entityId`, `entityName`, `action`, `actorId`, `createdAt`, and `changes` (plain object). `relatedId` (string or null) references a run or source notebook when applicable. Use specific action values such as `created`, `renamed`, `language_changed`, `cells_saved`, `cell_added`, `cell_removed`, `cell_moved`, `attached`, `detached`, `run_started`, `run_canceled`, `settings_updated`, `tasks_updated`, `schedule_saved`, `schedule_paused`, `schedule_resumed`, `schedule_removed`, `deleted`, and `duplicated`. `changes` carries relevant IDs and changed fields, for example `{clusterId:'cl-001'}`, `{cellId:'cell-001', fromIndex:2, toIndex:0}`, or `{status:'canceled'}`. Cluster activity is represented by `clusterEvents` directly.

- Notebook attach and jobs' named compute resolve through `clusters[].id`. Job task notebooks resolve through `notebooks[].id`. Full notebook paths are derived from `folder` and `name`.
- Runs reference the parent record by ID and preserve names and inputs at execution. Deleting a notebook, job, or cluster does not erase historical records. Current references are checked before deleting a dependency.
- Edits that update a notebook, job, or cluster also update its `updatedAt` and `updatedBy`. Activity records capture the actor and timestamp for create, edit, execution, and deletion. Use the final implementation to write the exact action-to-field mapping in `SCHEMA.md`.

## Suggested seed worlds

Build deterministic arrays in `createInitialData()` with coherent IDs. Use `/Shared/Retail`, `/Shared/Finance`, `/Teams/Data Platform`, and `/Users/maya.chen@acme.example` to vary notebook paths. Include detached notebooks and notebooks attached to both running and stopped clusters. Add Python, SQL, Scala, and R cells and Markdown documentation, with seeded text, table, and error outputs. Use illustrative, nonsensitive dataset names such as `retail.silver.orders` and `finance.daily_rollup`.

Include manual jobs, daily and weekly jobs, paused schedules, Serverless and named-cluster tasks, and examples with two dependent tasks. Seed successful, failed, queued, running, and canceled runs with coherent task statuses and timestamps. Cover `15.4 LTS`, `16.4 LTS`, and `17.3 LTS` runtime labels, at least four node types, three sizing modes, and both cluster states. Include a running cluster with attached notebooks and a terminated, unreferenced cluster that can be deleted.
