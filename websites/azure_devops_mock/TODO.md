# Azure DevOps Mock — TODO

> Status: COMPLETE
>
> Last updated by: dev agent, 2026-11-18
>
> [Research](assets/README.md) · [Design](DESIGN.md) · [Data model](assets/data_model.md) · [Harbor contract](../../HARBOR_CONTRACT.md) · [Seed brief](SEED.md)

## Status legend

- `[ ]` Not started
- `[~]` In progress
- `[x]` Done

## P0 — Core shell and runtime

- [x] **P0.1 Scaffold and offline build.** Create a React + Vite project here with a committed `package-lock.json`. Set Vite dev and local preview to port **5479** with `strictPort: true`. Use `npm run dev -- --port 5479` for browser testing. Set the page title to **Azure DevOps**. Use local assets and system or bundled fonts. Verify `npm run build` and serve `dist/` with SPA fallback and the Harbor state API.
- [x] **P0.2 State and session.** Copy `templates/dataManager.js` byte-for-byte to `src/utils/dataManager.js`, import `stateApi` directly from `../../templates/state-api.js` in Vite config, and supply `createInitialData` from `src/data/seed.js`. Use `APP = 'azure_devops_mock'`. Show a neutral loading view until `loadState(APP, createInitialData)` resolves. Use one shared store and persist one complete next-state snapshot per successful mutation via `saveState(APP, newState)`, including any related writes in the same action. Keep route transitions, input drafts, filters, selection and inspection read-only. Use the template-owned `GET /state`, `POST /post` and `GET /go`. Read `/go?sid=…` as JSON with `initial_state`, `current_state` and `state_diff`.
- [x] **P0.3 Routes and navigation.** Put all routes under the same store, theme and toast providers. Use a project switcher, persistent service rail and contextual tabs per [DESIGN.md](DESIGN.md). `/` opens the Projects hub. Implement `/:org` and the project routes in the table below. Preserve `sid` on router links, redirects and search-param changes. Apply `withSid()` when an internal link leaves the router, including links opened in a new tab. Load the same context after a hard reload, and show a return link for unknown project and entity IDs.
- [x] **P0.4 Injected state and idle behavior.** Use seeded/injected project and user references and handle zero, one and hundreds of rows per collection. Render optional values and missing references with safe fallbacks and disable commits, runs or deploy actions where required data is missing. Honor array replacement and nested-object merging from the template. Keep initial load single-flight so there is one template baseline write on a fresh session, even with development remounts. Use `new Date()` for relative rendering and ISO timestamp writes. Keep state mutation tied to explicit actions, including build and deploy results.
- [x] **P0.5 Verifier handoff.** Maintain `SCHEMA.md` with every implemented top-level key, record shape and an **Observable State Changes** table listing exact field paths per action. In Playwright, exercise Boards, Repos, Pipelines and Releases and record the named changed fields in `TEST.md`. Check built-app hard reloads, fresh `sid` isolation, injected worlds, invalid submissions and an idle tab alongside a writing tab. Once the build is staged at `factory/build/sites/azure_devops/dist`, run `python3 factory/hub_tools/dyn_certify.py azure_devops` from the CUA-Gym parent directory. The app's local endpoints use `http://localhost:5479`.
  - [TEST.md](TEST.md) records the four Playwright walkthroughs and observed state fields. Dev checks on the production bundle exercised those workflows, injected worlds, reloads, session isolation, delayed snapshot writes and invalid submissions. Harbor certification passed from a temporary staging copy with one load POST and zero idle POSTs.

### Route map

Paths in the right column are relative to `/:org/:project` unless shown otherwise. Use project slugs and stable entity IDs, URL-encode segments, and keep `sid` alongside the view's query parameters.

| Surface | Routes |
| --- | --- |
| Organization and project | `/`, `/:org`, `/:org/:project` (project root), `/_summary`, `/_search?q=…&type=…` |
| Boards | `/_workitems`, `/_workitems/new`, `/_workitems/edit/:id`, `/_boards/board/:teamId`, `/_backlogs/backlog/:teamId`, `/_sprints/backlog/:teamId/:sprintId`, `/_queries` |
| Repos | `/_git/:repo?version=…&path=…`, `/_git/:repo/branches`, `/_git/:repo/commits`, `/_git/:repo/pullrequests`, `/_git/:repo/pullrequestcreate`, `/_git/:repo/pullrequest/:id` |
| Pipelines | `/_build`, `/_build?definitionId=…`, `/_build/new`, `/_build/definition/:id/edit`, `/_build/results?buildId=…` |
| Releases | `/_release`, `/_release?definitionId=…`, `/_releaseDefinition?definitionId=…`, `/_releaseProgress?releaseId=…&stageId=…` |
| Preferences | `/_settings` (P2) |

## P1 — Primary workflows

### Project and search

- [x] **P1.1 Projects, Summary and search.** Show English project cards, project/team context, members, and linked work/build/deploy counts derived from records. Global search opens grouped Work items, Code and Pull requests results with title, ID or path matches scoped to the selected project. Provide a category filter, an empty result and working detail links. **Writes** None.

### Boards

- [x] **P1.2 Work items list and editor.** Show Recently updated and Assigned to me scopes and filters for keyword, type, state, assignee, area and tags. Rows show ID/type, title, assignee, state, iteration and changed date. New Work Item offers Bug, User Story, Task and Feature. Form requires title and supports rich text or plain multiline description and acceptance criteria, assignment, State, priority, story points, area, iteration, tags and same-project parent. Default to the selected team and its configured area and iteration. `Save` keeps the editor open and `Save & Close` returns to the caller. **Writes** Create `workItems[]` and append `workItemRevisions[]`. Edit the submitted item fields plus `changedBy` and `changedAt`, update `boardOrder` if State changed, and append a revision with typed field changes. Derive related development links from `branches[].workItemIds` and `pullRequests[].workItemIds`.
- [x] **P1.3 Kanban.** Render the selected team's Agile Stories board (User Story and Bug) with New, Active, Resolved and Closed columns, counts and WIP labels where configured. Cards show type and ID, title, owner, tags and points when present. Quick-add a story in New, move or reorder cards by drag and drop, and provide a Move to column menu as the keyboard/touch equivalent. Open cards in the same work item editor. **Writes** Quick add creates `workItems[]` and `workItemRevisions[]`. A move updates `state`, `boardOrder`, `changedBy` and `changedAt` plus one revision. A same-column reorder changes `boardOrder` and the change metadata plus one revision. Cancelled drops and drops without movement write nothing.
- [x] **P1.4 Backlogs and sprints.** Show the selected team's backlog in order with parent context and sprint choices. Sprints show date ranges and work assigned to the selected iteration. Support row multiselect and explicit Assign to or Move to iteration, validating project and team context. **Writes** Update `assignedToId` or `sprintId` on each affected `workItems` row plus `changedBy` and `changedAt`, and append one `workItemRevisions` record per changed row in the same commit.
- [x] **P1.5 Discussion and history.** Display work item revisions newest first, with actor, changed fields and time. Add Discussion accepts nonblank content. **Writes** Append `workItemComments[]` with `workItemId`, `body`, `createdBy` and `createdAt`. Update the item's `changedBy` and `changedAt`.
- [x] **P1.6 Queries.** Show My Queries and Shared Queries with a flat-list editor. Support clauses for type, state, assignee, iteration and title, joined by AND, and Run Query opens matching rows. Require a name for Save and display it in its selected scope. **Writes** Create `queries[]` or patch `name`, `scope`, `clauses`, `updatedBy` and `updatedAt`. Running a query is read-only.

### Repos

- [x] **P1.7 Files and repository creation.** Offer a repo selector, branch selector, folder trail, file tree and Contents/Preview/History tabs. Show a file and commits based on the selected branch snapshot. New repository asks for a unique Git repo name and an optional README. **Writes** Append `repositories[]`. When initialized with a README, append `branches[]` and `commits[]` with the README change and set `repositories[].defaultBranchId`. Render the empty-repository state with a local Initialize action that creates the same branch and commit records.
- [x] **P1.8 Branches and commits.** Show Mine/All branches, name filter, last commit and open PR link. New branch requires a unique valid name and a base branch, with optional work-item links. Files supports creating and editing text files with a Commit dialog for the message and selected branch. Commits shows authors, dates and changed paths. **Writes** Append `branches[]` with `baseBranchId`, `headCommitId` and `workItemIds`. Committing adds `commits[]` with `parentCommitIds` and structured `changes[]`, and updates the chosen `branches[].headCommitId`, `updatedBy` and `updatedAt`.
- [x] **P1.9 Create pull request.** Show Active/Completed/Abandoned in the selected repo, searchable by ID or title, with branch pair, author and reviewers. New pull request chooses distinct source and target branches in the repo, shows changed-file preview, and requires title with optional description, reviewers, linked work items and tags. Include Create as draft and Publish. **Writes** Append `pullRequests[]` with branch/head IDs, reviewers, work item links, tags, actor, timestamp, `status: 'active'` and `isDraft`. Publish updates `isDraft`, `updatedBy` and `updatedAt`.
- [x] **P1.10 Review and complete pull request.** Show Overview, Files and Commits, line-level diffs, reviewer votes, linked work, and applicable seeded approval requirements. Support overview and inline comment threads, reply, resolve, vote, Complete and Abandon. Completion requires a published active PR, satisfied local approval requirements and a merge without conflicting file changes. Offer a merge commit and an optional `Complete linked work items` checkbox. **Writes** Comments and replies append `pullRequestComments[]`. Resolve updates the root comment's `status`, `updatedBy` and `updatedAt`. Voting replaces or adds the actor's `pullRequests[].reviewers[]` vote and stamps the PR. Complete updates PR status, closure/merge fields and final head snapshots, appends `commits[]` and moves the target `branches[].headCommitId` with change metadata. The checkbox additionally sets linked `workItems[].state` to `Closed` with appropriate `boardOrder`, change metadata and one `workItemRevisions` record per changed item. Abandon updates PR status and closure/change metadata.

### Pipelines

- [x] **P1.11 Pipeline lists and run inspection.** Provide Recent, All and Runs tabs, with name, branch and result filters as applicable. Pipeline detail lists its runs, and Run Summary shows reason, requester, branch, commit, result, stages/jobs/logs and artifacts. Use local log text and link back to related commits and work items. **Writes** None.
- [x] **P1.12 Create or edit a YAML pipeline.** Step through source (Azure Repos Git), repository, branch, existing YAML path or starter template, then review YAML. Save associates the definition with a path and branch. Save and run performs that write and the run writes in P1.13 together. In Edit, validate nonempty YAML syntax and path and save changed content to the repository via the normal commit path. Render YAML as text offline. **Writes** Append or update `pipelines[]` with repository, default branch, YAML path, pipeline name and change metadata. A starter or edited YAML file also appends `commits[]` with the YAML file change and advances the selected `branches[]` head and metadata. Existing unchanged YAML is reused.
- [x] **P1.13 Run, cancel and run again.** Run pipeline and Run new open branch, optional variables and the run confirmation. Show the newest run with its resolved commit, stage/job result and `drop` artifact. Successful new runs resolve in the confirming action using a local fixture. Seed queued and in-progress runs to exercise Cancel and seed failed runs for logs and Run new. **Writes** Run and Run new append `pipelineRuns[]` with branch, commit, variables, status, result, actor and timestamps and append `pipelineArtifacts[]` for successful runs. Run new additionally sets `rerunOfRunId`. Cancel sets an eligible existing run's `status` to `completed` and `result` to `canceled`, records `finishedAt` and `canceledBy`, and sets status/result on unfinished stages and jobs to the same pair.

### Releases

- [x] **P1.14 Classic Releases hub and definition editor.** Place Releases under Pipelines. The hub has a searchable definition list and a history view for the selected definition with artifact version, manager and stage badges. New release pipeline and Edit open a definition editor. Require a name, one artifact source pipeline and at least one ordered stage. Each stage supports a name, a prerequisite earlier stage and optional designated pre-deployment approvers. **Writes** Append or update `releaseDefinitions[]` with `name`, `artifactPipelineId`, `stages[]` and actor/time metadata. Existing releases keep their snapshots.
- [x] **P1.15 Create release.** The Create release panel selects a successful build artifact version from the selected definition's source and accepts a description. Confirm creates a numbered release and opens its stage view. Each version remains pinned and every stage starts ready for an eligible manual deployment or blocked behind its prerequisite. **Writes** Append `releases[]` with `definitionId`, `artifactId`, `runId`, `artifactVersion`, `status`, `description`, `createdBy`, `createdAt` and independent `stages[]` snapshots.
- [x] **P1.16 Deploy, approve, reject and redeploy.** Each stage shows its latest attempt, approval state and Logs. Deploy requires any prerequisite to have succeeded. Save a numbered attempt and its local task log in that action, or a pending deployment with one approval per designated approver. Approve and Reject require a pending decision for the acting user and support a comment. Once all approve, the same confirmation finishes the current attempt. A rejection ends that attempt and cancels sibling pending approvals. Redeploy creates another attempt and repeats approval where configured. **Writes** Append `deployments[]` and, for gated attempts, `releaseApprovals[]`. An approval or rejection updates `releaseApprovals[].status`, `comment`, `decidedBy` and `decidedAt`. A terminal attempt records `deployments[].status`, `logs`, `startedAt` if started, `finishedAt` and `finishedBy`. Update `releases[].status`, affected `stages[].status` and `latestDeploymentId`, plus release `updatedBy` and `updatedAt` in the same state write. After a successful prerequisite, mark downstream blocked stages ready in that action. Open Logs reads the chosen attempt.

## P2 — Secondary features

- [x] **P2.1 Project settings and theme.** Provide a project overview panel with name, description and membership summary, and a profile menu with Light/Dark selection. Theme changes write `preferences.theme`, `updatedBy` and `updatedAt`. Project settings is read-only.
- [x] **P2.2 Keyboard and layout polish.** Add a keyboard-shortcuts overlay and board commands for opening and moving focused cards, and ensure existing actions are usable in a collapsible shell at 768 px. Board moves use P1.3's writes. Shortcut help and navigation only read state.

## Data seed

- [x] Seed one organization, three Agile projects, six teams, eighteen users and at least twenty-four sprint records. The primary project is **Harbor Commerce**, and the signed-in user is **Maya Chen**. Make default team, project and user records consistent.
- [x] Seed at least 72 work items and 24 queries, with real English titles, mixed states, priorities, assignees, tags and projects. Seed parent-child examples, discussion and revision history, current and past sprint examples.
- [x] Seed at least 24 repositories, 48 branches, 96 commits and 36 pull requests with useful file trees, working diffs, an approvable PR, a merge conflict, draft and completed/abandoned examples, reviewer votes and inline comments.
- [x] Seed at least 24 YAML definitions, 72 runs and 36 downloadable artifact records, including runs in all planned statuses. Each default pipeline branch contains a resolvable YAML file. Seed at least one failed run plus queued and in-progress runs.
- [x] Seed at least 24 Classic release definitions, 48 releases and 72 deployment attempts across projects, with pending, succeeded and rejected approvals, useful logs and repeat attempts. Keep the cross-service fixture and IDs in [the data model](assets/data_model.md).

## Out of scope

- Authentication, account creation, real Git transport and external repository providers.
- Live workflow execution, shell commands, hosted agents, external notifications and real environment deployments.
- Marketplace, billing, service connections, extensions, TFVC, organization security, Test Plans and package feeds.

## Acceptance walkthroughs

| Workflow | Browser actions in a fresh `sid` | Verify in `/go` and after reload |
| --- | --- | --- |
| Boards | Create a bug, edit assignment/priority, move it to Active, add a discussion comment and move it into a sprint | `workItems` has a stable ID and final state, `workItemRevisions` records typed mutations and `workItemComments` links the submitted text to its author and item |
| Repos | Branch from main, commit a file edit, open a linked PR, post an inline comment, vote and Complete | `branches`, `commits`, `pullRequests` and `pullRequestComments` capture the source/target refs, file change, vote, closed state and merge commit. Inspect the target file from Repos |
| Pipelines | Create a YAML definition, run on a selected branch with a variable, open logs and cancel a separate in-progress run | `pipelines`, `pipelineRuns` and `pipelineArtifacts` show definition, commit, variables, result, artifact and cancellation metadata |
| Releases | Select a successful run version, create a release, deploy QA, deploy gated Production, then approve as Maya | `releases` pins the artifact/run, `deployments` records stage and attempt outcome, `releaseApprovals` records the decision and actor |
| Harbor gates | Open an empty injected project, repeat on a sparse project and a large dataset, reload a deep link, write from a second tab while the first idles, and test another `sid` | Empty/sparse views render, the selected URL retains `sid`, idle traffic performs no mutations, and the second session remains isolated |
