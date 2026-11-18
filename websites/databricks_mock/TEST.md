# Databricks workspace test report

WORKFLOWS: PASS

| Verification | Result |
| --- | --- |
| Date | 2026-11-18 |
| Browser | Headless Chromium via the installed Node Playwright package |
| Server | `http://127.0.0.1:5489` |
| Round | 2 |
| Routes | All eight application route patterns and the unknown-route fallback |
| Runs | Eight check groups passed against the Vite dev server. `npm run build` passed. Round 1 also exercised Vite preview. |
| Proof | Fresh session IDs, successful POST response checks, and state comparisons through `/go?sid=…` |
| Reproduction | `node test-results/verify.mjs` while the local server runs |

## Passing tests

| Group | Exercised behavior | Observed state |
| --- | --- | --- |
| Shell and Harbor baseline | Overview navigation and each creation shortcut preserve the session. Fresh worlds booted with a single `set`. After a 1.5-second idle period the request count stayed at one. | Empty initial `state_diff`. Baseline held 36 notebooks and notebook runs, 30 jobs, 60 job runs, 24 clusters, and 48 cluster events. |
| Notebook browse and edit | Name/path search, language filter, sort, creation, rename, default language, typed code and Markdown drafts, save, add, reorder, and remove. | `notebooks[]` and `activity[]` changed per accepted action. Cell order, draft source, stable IDs, name, and language were checked. Searches, invalid creation, and unsubmitted source changes sent no POST. |
| Compute setup and notebook execution | Invalid autoscaling bounds and fractional sizes, valid autoscaling create, fixed-size configuration edit, status search, attach picker including stopped compute, Shift+Enter, Run cell, Run all, and blank/detached run rejection. Reloaded the notebook to inspect the latest output. Duplicated the notebook after a visible draft notice. | `clusters[]` and `clusterEvents[]` recorded size and correct configuration changes. Attachment updated `notebooks[].clusterId`. Runs appended `notebookRuns[]` with ordered nonblank code cells and fixture output. Drafts included in a run persisted with a single POST. Duplicate had new cell IDs and a null cluster ID. |
| Job authoring, scheduling, and successful run | Create a job with a named-cluster task and parameters, edit job settings, add a dependent Serverless task, reject duplicate task keys and cycles, and rename a prerequisite. Saved daily and weekly schedules, rejected an invalid timezone, paused, resumed, and removed the schedule. Searched and filtered jobs and used a one-run parameter override. | `jobs[]` and `activity[]` contained task and schedule updates. A rename reconciled `tasks[].dependsOn`. The successful run appended `jobRuns[]` with ordered task snapshots and the effective override. Stored task parameters kept their original values. |
| Compute lifecycle, failure, and deletion | Restart, terminate, and start compute. Attempted referenced notebook and compute deletions. Ran a job against terminated compute, removed a task, verified the final task was required, then deleted the job, detached and deleted the notebook, and deleted terminated compute. Checked recovery links and the historical run deep link. | `clusters[]` and `clusterEvents[]` recorded lifecycle statuses and timestamps. Termination kept current attachment IDs. `jobRuns[]` stored a failed cluster task and a skipped dependent. Accepted deletions removed only the target business record and appended a deletion event. Prior run and event records remained. |
| Active and queued runs | Seeded running and queued runs blocked job deletion and appeared as links in the dialog. Canceled both runs from their run pages. | `jobRuns[].status`, `endedAt`, `canceledAt`, `canceledBy`, and unfinished task statuses changed. `activity[]` recorded cancellation with the run ID. |
| Notebook draft navigation | Entered a draft and followed the attached cluster link, stopped cluster link from the attach dialog, job link from the blocked deletion dialog, Overview navigation, and the Workspace breadcrumb. Back restored the draft each time. Saved, reloaded, and verified the saved source. The unknown-route recovery link returned to Overview with the same session. | Navigation sent zero writes and `/go` still showed an empty `state_diff`. Save updated `notebooks[].cells[].source` and `updatedAt`, stamped `updatedBy` with the current actor, and appended an `activity[]` event with action `cells_saved`. |
| Resilience and mobile | Reloaded deep links and changed session IDs. Injected empty, sparse, and large datasets. Checked missing notebook execution, rejection and correction of a dangling task dependency, narrow-screen table scrolling, and browser request origins. | The independent session kept only the seeded records. Injected arrays replaced defaults. Sparse data persisted without mount-time normalization of its records. Lists rendered 350 notebooks, 310 jobs, and 265 clusters. There were no browser page errors or external requests. |

The desktop overview, notebook editor, and narrow workspace list were also inspected from local Chromium screenshots. The automated checks assert one `set_current` POST for each accepted action they exercise and zero POSTs for invalid actions and read-only interactions.

## Bugs for Dev Agent

No open issues from the executed checks.

## Round history

- Round 2 resolved `AUDIT-001`. Notebook drafts stay in memory across in-app navigation. A full reload clears drafts that have yet to be saved.
- Round 1 verified that unavailable dependency options remain visible and editable for the full edit dialog session.
-

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `177868`. The local evidence is `factory/build/dyn_certify/177868/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `users → 0 → name`.
