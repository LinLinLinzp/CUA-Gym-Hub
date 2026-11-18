# Databricks Mock — TODO

> Status: IMPLEMENTED AND VERIFIED  
> Last updated by: dev agent, 2026-11-18  
> [Research](assets/README.md) · [State model](assets/data_model.md) · [Design](DESIGN.md)

`[ ]` Not started · `[~]` In progress · `[x]` Done

## P0 — Application shell and Harbor

- [x] **Scaffold and build.** Create the React/Vite app with a lockfile. Use `127.0.0.1:5489` and `strictPort` for local dev. Import `stateApi(createInitialData)` from `../../templates/state-api.js` in `vite.config.js`, copy `templates/dataManager.js` unchanged to `src/utils/dataManager.js`, and put fixed defaults in `src/data/seed.js`. The middleware owns `/post`, `/state`, and `/go`, including the JSON proof at `/go`. Bundle all runtime resources locally and verify `npm run build`.
- [x] **Shell and routes.** Render a text Databricks masthead, Acme Analytics workspace identity, synthetic user, and horizontal Overview, Workspace, Jobs and Compute navigation. Provide `/`, `/workspace`, `/workspace/notebooks/:notebookId`, `/jobs`, `/jobs/:jobId`, `/jobs/:jobId/runs/:runId`, `/compute`, and `/compute/:clusterId`. Route through shared providers, preserve `sid` through navigation and use `withSid()` when leaving the SPA router. Unknown and removed records show a section-specific recovery link. On overview, derive counts and current activity from state and provide direct create and details entry points.
- [x] **State lifecycle and resilience.** Await one `loadState(APP, createInitialData)` call before mounting routes, with a neutral loading view. Apply each confirmed business action atomically, then call `saveState(APP, fullNextState)` once through a shared store. Draft forms, read-only search, sort, filters and navigation stay in UI state. Default absent optional collections and fields at read time, handle missing record links and empty, sparse, and large injected worlds, and never rewrite injected values on mount. Dates relative to now use `new Date()`. No automatic jobs, notebook runs, cluster transitions, or state writes on timers.
- [x] **Verification handoff.** Write `SCHEMA.md` from implementation with every top-level key, record shape, and an **Observable State Changes** table mapping every business action to exact fields. Use Chromium Playwright on localhost at port 5489 with the package named by `PILOT_PLAYWRIGHT`. Use fresh `sid` values and inspect `/go?sid=…` after representative workflows in all three P1 sections. Cover reloads, deep links, isolation, empty/sparse and large worlds, zero idle POSTs after boot, and invalid submissions. Document executed tests and observed state in `TEST.md`. The parent runner handles Docker certification and commits.

## P1 — Notebooks

- [x] **Browse, create, and rename.** Workspace lists notebook name, language, folder, owner, compute, and modified time with name/path search, language filter, and sort. New Notebook accepts name, folder, and default language (Python, SQL, Scala, or R), starts with one code cell, and navigates to its editor. Notebook details offer rename and language selection. Create writes a `notebooks[]` record and `activity[]` event. Rename or default-language edits update `notebooks[].name` or `.language`, plus `updatedAt`, and append an event. Derive full path from folder and name so jobs keep stable IDs through rename.
- [x] **Edit and organize cells.** Show an ordered editor with editable code and Markdown cells, per-cell language labels, and add, remove, and move actions. Use a visible Save changes action for cell source/type drafts, with an unsaved indicator. Save and cell actions persist `notebooks[].cells`, update `updatedAt`, and append the relevant `activity[]` event. New cells receive stable IDs. Preserve drafts across in-editor actions or explicitly prompt before discarding them.
- [x] **Attach, detach, and run.** Attach picker lists running clusters with runtime; show stopped clusters with a link to Compute. Attach and detach write `notebooks[].clusterId`, `updatedAt`, and an event. Run Cell, Shift+Enter on a focused code cell, and Run All use the attached running cluster. Commit any included edits with the same action as the run, then create one `notebookRuns[]` record with ordered selected runnable cell IDs and per-cell results. Display the latest output under each cell. Exclude Markdown and blank cells from execution and show feedback when no runnable selection or running compute is available. Use deterministic fixture outputs without running user-supplied code.
- [x] **Delete.** Confirm notebook deletion using its name. Block deletion when current job tasks reference it and link to those jobs. Otherwise remove the `notebooks[]` record, append a deletion event preserving ID and name, and keep `notebookRuns[]` as history.

## P1 — Jobs

- [x] **Browse, create, and edit a notebook job.** Provide a job list with name, owner, trigger, task count, and last run status. Search by name and filter by schedule or last run status. Create Job takes a name and first notebook task with task key, notebook selector, execution compute (Serverless or named cluster), and optional key/value parameters. Save opens job details. Details expose Tasks, Runs, and schedule controls. Edit job name/description and add, edit, or remove tasks while retaining at least one task on saved jobs. Support optional dependencies between task keys, reject duplicate keys, missing references and cycles, and reconcile dependency keys when renaming a task. Write `jobs[]` on create or update `.name`, `.description`, `.tasks`, and `.updatedAt` on edits as applicable, and append `activity[]` events.
- [x] **Configure a schedule.** Support manual jobs and daily or weekly scheduled jobs with time, timezone, and weekday for weekly schedules. Save, pause, resume, or remove the schedule in job details. Each action writes `jobs[].schedule`, `updatedAt`, and an `activity[]` event. The schedule is inspectable configuration and never triggers a background write.
- [x] **Run now and inspect runs.** Use saved tasks and optional one-run parameter overrides. On Run now, append `jobRuns[]` with trigger, actor, job ID, run status, task snapshots, task results, and timestamps, plus an `activity[]` event. Execute in dependency order in one deterministic local action. A missing notebook or unavailable selected cluster creates a failed task; dependent tasks become skipped. Keep job configuration intact and derive last status from runs. Run details display task statuses, inputs, and results. Cancel active or queued seeded runs by setting `jobRuns[].status`, `endedAt`, cancellation fields and unfinished task statuses, and appending a cancellation event.
- [x] **Delete.** Confirm by name and block while active or queued runs exist. On delete, remove the `jobs[]` record and append a deletion event. Retain `jobRuns[]` snapshots and keep their historical deep links readable.

## P1 — Clusters

- [x] **Browse, create, and configure compute.** Compute lists cluster name, state, owner, runtime, sizing, and auto-termination, with status filter and name search. Create compute accepts name, runtime, node type, single/fixed/autoscaling sizing, and auto-termination minutes. Ensure whole-number sizing, selected mode fields only, and minimum ≤ maximum. Create a `clusters[]` record in `running` state and append a `clusterEvents[]` create event. The detail configuration form edits those fields, updates `updatedAt`, and writes an update event. Configuration remains editable in either lifecycle state in this local model.
- [x] **Start, restart, terminate, and inspect history.** Compute details show configuration, named lifecycle actions, attached notebook count, and event history. Start on `terminated` and Restart or Terminate on `running`. Confirm actions that interrupt attached work, and apply transitions on confirmation in one write. Update `clusters[].status`, `updatedAt`, and lifecycle timestamps and append a `clusterEvents[]` record with the previous and resulting status. Keep notebook and job cluster IDs on termination so usage can resume after Start. Render the configured auto-termination duration without automatically terminating anything.
- [x] **Delete.** Allow a terminated cluster to be deleted after confirmation if no notebook or job task references it. Surface blockers and link to the relevant records. Remove the `clusters[]` record and append a deletion event preserving the cluster ID, name, and previous status.

## P2 — Secondary depth

- [x] **Duplicate notebook.** Copy name with an editable suffix, folder, language, and cells into a new notebook with new notebook/cell IDs and no attached cluster. Write the new notebook plus a duplication event referencing the source ID. Keep output history associated with the source.

## Data seed

- [x] 36 notebooks across shared, team, and personal folders, all four languages, and varied compute attachments; 36 notebook runs with varied output types.
- [x] 30 jobs with notebook tasks, valid dependency examples, varied schedules/compute, and 60 job runs across historical and active states.
- [x] 24 clusters across running and terminated, at least four node types, three runtime labels, all sizing modes, and 48 historical lifecycle events. Use fixed IDs and dates for seed records and coherent cross-links. Use English names and synthetic accounts only.

## Out of scope

- Account setup, sign-in, remote services, production accounts, and cloud resource provisioning.
- Actual code execution, background scheduling, real Spark, and unrelated product areas such as Unity Catalog administration.
