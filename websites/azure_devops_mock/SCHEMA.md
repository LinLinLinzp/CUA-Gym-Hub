# Azure DevOps Mock Schema

**Base URL** `http://localhost:5479/`

**Go endpoint** `GET /go?sid=<sid>` returns `initial_state`, `current_state`, and `state_diff`.

**State endpoint** `GET /state?sid=<sid>` returns `stored_state`, `has_custom_state`, and `sid`.

**Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`.

**Reset** `POST /post?sid=<sid>` with `{"action":"reset"}` restores the existing baseline on the server.

The first state write establishes `initial_state`. On startup the client reads `GET /state?sid=<sid>`, merges nested objects over defaults, and replaces any supplied arrays. A fresh browser profile also sends the merged snapshot with `set` as part of loading. User actions submit complete snapshots with `set_current`. Inject the complete baseline when comparing `state_diff` to user actions. A partial baseline can also show changes from default hydration.

The store waits for the server's acknowledgement before reporting a save. Tabs in the same browser profile use a shared lock when Web Locks are available. Each save reads the server snapshot before applying the action. Work item saves update the edited fields and append typed revisions. If an edited field already has a different change, the form identifies the conflicting fields and keeps the draft open.

Saves whose read follows a prior acknowledgement build on that saved snapshot across browser profiles. Two writers can read the same snapshot and submit competing replacements. A fresh profile can also prepare its baseline before another profile saves and send it afterward. Either sequence can erase acknowledged changes from `current_state`.

## State Schema

All IDs are nonempty strings. Display work item, PR, run, and release numeric IDs as text in URLs and UI. Resolve references using the entity kind and ID, which stays stable after renames. Generate IDs for user-created records from the latest state, avoiding existing IDs in the relevant collection and avoiding reuse in history. For work items, PRs, runs and releases a numeric string greater than the collection's existing numeric IDs is sufficient because the plan retains those records. Seed all IDs and timestamps as fixed literals or as deterministic transformations of fixed input. Where a date is written by user action, use one `new Date().toISOString()` value per action. Date-only sprint bounds use `YYYY-MM-DD`.

An injected work item with `id: "."` appears in the list. Opening it shows the unavailable view because the browser collapses its editor URL to the parent path.

Each example below shows field names, JSON types and realistic values. ID fields, including actors, reference the appropriate entity. Nullable fields appear as `null` or with a non-null example and a note. In examples, the sample timestamps are fixed seed values. A missing optional field, empty collection or unresolved reference can be rendered via a fallback without editing the injected record. Require valid target records before committing a new relation. Do not use indices as IDs or assume any injected row has one of the default IDs.

### Workspace

| Top-level key | Example record | Notes |
| --- | --- | --- |
| `organization` | `{ id: 'org-harbor', slug: 'harbor-labs', name: 'Harbor Labs', defaultProjectId: 'proj-commerce' }` | Object. Default project may be null or absent. |
| `preferences` | `{ currentUserId: 'usr-maya', theme: 'light', updatedBy: 'usr-maya', updatedAt: '2026-11-10T10:00:00.000Z' }` | Object. Theme is `light\|dark`. The actor and timestamp may be absent before a theme change. Use a safe displayed fallback if no user resolves. Actions requiring attribution need a resolvable user. |
| `projects[]` | `{ id: 'proj-commerce', organizationId: 'org-harbor', slug: 'Harbor-Commerce', name: 'Harbor Commerce', description: 'Checkout, payments and order services.', process: 'Agile', visibility: 'private', defaultTeamId: 'team-checkout', memberIds: ['usr-maya','usr-alex'], createdAt: '2026-05-18T09:00:00.000Z' }` | Show public/private label as metadata, and treat unavailable team or members as missing data. |
| `teams[]` | `{ id: 'team-checkout', projectId: 'proj-commerce', name: 'Checkout Team', memberIds: ['usr-maya','usr-alex'], areaPath: 'Harbor Commerce/Checkout', defaultSprintId: 'spr-commerce-22', wipLimits: { Active: 6, Resolved: 4 } }` | Area path is a display string. Sprint ID may be null. WIP values are integers and optional. |
| `users[]` | `{ id: 'usr-maya', displayName: 'Maya Chen', email: 'maya.chen@example.test', initials: 'MC', avatarColor: '#37648E' }` | Render a local initials avatar, with a neutral placeholder for unknown actors. |
| `sprints[]` | `{ id: 'spr-commerce-22', projectId: 'proj-commerce', teamId: 'team-checkout', name: 'Sprint 22', path: 'Harbor Commerce/Sprint 22', startDate: '2026-11-09', endDate: '2026-11-22' }` | Derive time-relative status at render time. Use the team's configured sprint for defaults, independent of the viewed date. |

### Boards

| Top-level key | Example record | Notes |
| --- | --- | --- |
| `workItems[]` | `{ id: '1042', projectId: 'proj-commerce', teamId: 'team-checkout', type: 'Bug', title: 'Fix duplicate order confirmation', description: 'Retrying card authorization creates two order emails.', acceptanceCriteria: 'One confirmation per order ID.', state: 'Active', assignedToId: 'usr-alex', priority: 2, storyPoints: 3, areaPath: 'Harbor Commerce/Checkout', sprintId: 'spr-commerce-22', tags: ['payments','regression'], parentId: '1034', boardOrder: 200, createdBy: 'usr-maya', createdAt: '2026-11-10T09:00:00.000Z', changedBy: 'usr-maya', changedAt: '2026-11-11T11:30:00.000Z' }` | Types Bug, User Story, Task, Feature. Training states New, Active, Resolved, Closed. Priority is integer 1–4, story points nonnegative or null. Assignee, sprint and parent nullable. Parent must be same project and acyclic. |
| `workItemRevisions[]` | `{ id: 'rev-1042-2', workItemId: '1042', action: 'move', changes: { state: { from: 'New', to: 'Active' }, boardOrder: { from: 100, to: 200 } }, createdBy: 'usr-maya', createdAt: '2026-11-11T11:30:00.000Z' }` | Action `create\|edit\|move\|reorder\|bulkAssign\|bulkSprint\|closeFromPullRequest`. Changes are keyed by business field with typed JSON values and `null` previous values on create. |
| `workItemComments[]` | `{ id: 'wic-1042-1', workItemId: '1042', body: 'Reproduced with a delayed authorization response.', createdBy: 'usr-alex', createdAt: '2026-11-11T12:00:00.000Z' }` | Nonblank discussion body. |
| `queries[]` | `{ id: 'query-checkout-bugs', projectId: 'proj-commerce', name: 'Checkout bugs in progress', scope: 'shared', clauses: [{ field: 'type', operator: 'equals', value: 'Bug' },{ field: 'state', operator: 'equals', value: 'Active' }], createdBy: 'usr-maya', createdAt: '2026-10-20T09:00:00.000Z', updatedBy: 'usr-maya', updatedAt: '2026-11-11T09:00:00.000Z' }` | Scope `my\|shared`. My Queries filters by creator and current user. Clause keys use `type\|state\|assignedToId\|sprintId\|title`, with `equals` or `contains` for title only. Values are strings, with null allowed for unassigned/unscheduled equality. An empty clause list matches the project. |

Sort each lane by numeric `boardOrder`, with ID as a stable tiebreaker. Give a moved or reordered card a value between neighboring cards, or place it at a boundary if either neighbor is missing. When editing State via the form, place the item at the end of its new lane and include the changed `boardOrder` in the revision. Use the same rule when completing a linked work item from a PR. The team's Stories board includes Bugs at requirement level. The list and sprint views retain all four types.

### Repos

| Top-level key | Example record | Notes |
| --- | --- | --- |
| `repositories[]` | `{ id: 'repo-checkout', projectId: 'proj-commerce', slug: 'checkout-api', name: 'checkout-api', defaultBranchId: 'br-checkout-main', requiredApprovals: 0, createdBy: 'usr-maya', createdAt: '2026-05-18T10:00:00.000Z' }` | Git only. Null default branch represents an empty repo. `requiredApprovals` is an optional nonnegative integer fixture for PRs targeting the default branch. |
| `branches[]` | `{ id: 'br-checkout-retry', repoId: 'repo-checkout', name: 'feature/retry-guard', baseBranchId: 'br-checkout-main', headCommitId: 'c-retry-02', workItemIds: ['1042'], createdBy: 'usr-maya', createdAt: '2026-11-10T10:00:00.000Z', updatedBy: 'usr-maya', updatedAt: '2026-11-11T15:00:00.000Z' }` | Base is null for main. Git branch names are unique within a repo. Display short names and accept `refs/heads/` in branch URL lookups. |
| `commits[]` | `{ id: 'c-retry-02', repoId: 'repo-checkout', branchId: 'br-checkout-retry', parentCommitIds: ['c-main-09'], message: 'Guard duplicate order confirmation', changes: [{ path: 'src/orders/confirm.ts', kind: 'edit', before: 'return notify(order)', after: 'return notifyOnce(order)' }], createdBy: 'usr-maya', createdAt: '2026-11-11T15:00:00.000Z' }` | Change kind `add\|edit\|delete`. `before` is null for add and `after` is null for delete. Paths use forward slashes and no leading slash. First parent points to the prior head. A merge commit has the previous target head first and the source head second. The initial commit has no parents. |
| `pullRequests[]` | `{ id: '321', repoId: 'repo-checkout', sourceBranchId: 'br-checkout-retry', targetBranchId: 'br-checkout-main', sourceCommitId: 'c-retry-02', targetCommitId: 'c-main-09', title: 'Guard duplicate order confirmation', description: 'Adds an idempotency check before sending mail.', status: 'active', isDraft: false, reviewers: [{ userId: 'usr-alex', required: false, vote: 'approved', votedAt: '2026-11-11T16:00:00.000Z' }], workItemIds: ['1042'], tags: ['payments'], mergeCommitId: null, closedBy: null, closedAt: null, createdBy: 'usr-maya', createdAt: '2026-11-11T15:10:00.000Z', updatedBy: 'usr-alex', updatedAt: '2026-11-11T16:00:00.000Z' }` | Status `active\|completed\|abandoned`. Vote `none\|approved\|approvedWithSuggestions\|waitingForAuthor\|rejected`. `votedAt` is null until voted. Existing required review rows and repo minimum approval count are local workflow gates. A completed PR records final branch-head snapshots plus a merge commit ID. An abandoned PR sets closure fields. |
| `pullRequestComments[]` | `{ id: 'prc-321-1', pullRequestId: '321', parentId: null, path: 'src/orders/confirm.ts', line: 18, body: 'Can we add a retry case to the integration test?', status: 'active', createdBy: 'usr-alex', createdAt: '2026-11-11T15:20:00.000Z', updatedBy: 'usr-alex', updatedAt: '2026-11-11T15:20:00.000Z' }` | Parent ID is null for a root or points to the thread root for a reply. File path and one-indexed line are null for overview comments. Root status `active\|resolved`. Replies inherit the root location. |

To render files, build a branch snapshot by applying each commit's changes along first parents from root to head. Resolve folders from paths. For active PRs, use current branch heads for inspection and completion, with stored head snapshots as fallbacks when rendering history. For completion, identify a shared ancestor through commit parents, then apply source-only changes to the target. Block completion when both heads changed a path differently relative to the base. Disjoint changes and identical edits are safe. Compute the merge commit's changes against the prior target head. Document this local merge behavior and keep history checks cycle-safe for injected data.

### Pipelines

| Top-level key | Example record | Notes |
| --- | --- | --- |
| `pipelines[]` | `{ id: 'pipe-checkout-ci', projectId: 'proj-commerce', name: 'Checkout API CI', repoId: 'repo-checkout', defaultBranchId: 'br-checkout-main', yamlPath: 'azure-pipelines.yml', createdBy: 'usr-maya', createdAt: '2026-06-01T09:00:00.000Z', updatedBy: 'usr-maya', updatedAt: '2026-11-10T10:00:00.000Z' }` | YAML is versioned in Git commits. Resolve text at the selected branch/head. Require a repo, branch and a valid existing or committed YAML path on Save. |
| `pipelineRuns[]` | `{ id: '5202', projectId: 'proj-commerce', pipelineId: 'pipe-checkout-ci', repoId: 'repo-checkout', branchId: 'br-checkout-main', commitId: 'c-main-09', number: '20261111.2', reason: 'manual', status: 'completed', result: 'succeeded', variables: { configuration: 'Release' }, stages: [{ id: 'build', name: 'Build', status: 'completed', result: 'succeeded', jobs: [{ id: 'compile', name: 'Compile and test', status: 'completed', result: 'succeeded', logLines: ['Restored packages.','42 tests passed.'] }] }], requestedBy: 'usr-maya', createdAt: '2026-11-11T16:30:00.000Z', startedAt: '2026-11-11T16:30:00.000Z', finishedAt: '2026-11-11T16:32:00.000Z', rerunOfRunId: null, canceledBy: null }` | Status `queued\|inProgress\|completed`, result `succeeded\|failed\|canceled\|null`. Stages/jobs use those status/result values. Times may be null for unfinished runs. Reason `manual\|individualCI\|pullRequest`. New sandbox runs record `manual`. Variables are plain local string values. |
| `pipelineArtifacts[]` | `{ id: 'artifact-5202-drop', projectId: 'proj-commerce', pipelineId: 'pipe-checkout-ci', runId: '5202', name: 'drop', version: '20261111.2', files: [{ path: 'manifest.json', content: '{ "service": "checkout-api" }', sizeBytes: 29 }], createdBy: 'usr-maya', createdAt: '2026-11-11T16:32:00.000Z' }` | Generate offline downloads from the file records and calculate `sizeBytes` from UTF-8 bytes. A successful run can publish more than one artifact. |

Save and run resolves the run's commit only after applying any YAML commit. Run pipeline and Run new validate the YAML file at the selected branch head before appending a run or artifact. New runs use the deterministic fixture's completed/succeeded stage and job results with a `drop` record. Run number uses the date and a collision-free sequence. Cancel sets the existing run to completed/canceled, preserves successful stages/jobs, and cancels unfinished stages/jobs. Prefer a coherent finite set of seed statuses and log lines over animations or background writes.

### Classic Releases

| Top-level key | Example record | Notes |
| --- | --- | --- |
| `releaseDefinitions[]` | `{ id: 'rd-checkout', projectId: 'proj-commerce', name: 'Checkout API Release', artifactPipelineId: 'pipe-checkout-ci', stages: [{ id: 'qa', name: 'QA', dependsOnStageId: null, approverIds: [] },{ id: 'prod', name: 'Production', dependsOnStageId: 'qa', approverIds: ['usr-maya'] }], createdBy: 'usr-maya', createdAt: '2026-06-03T09:00:00.000Z', updatedBy: 'usr-maya', updatedAt: '2026-11-10T09:00:00.000Z' }` | Stages are ordered. Stage IDs are unique within the definition. Dependencies reference earlier stages. Use unique approvers from project membership. |
| `releases[]` | `{ id: '8102', projectId: 'proj-commerce', definitionId: 'rd-checkout', name: 'Release-8102', artifactId: 'artifact-5202-drop', runId: '5202', artifactVersion: '20261111.2', status: 'active', description: 'Promote the checkout regression fix.', stages: [{ id: 'qa', name: 'QA', dependsOnStageId: null, approverIds: [], status: 'succeeded', latestDeploymentId: 'dep-8102-qa-1' },{ id: 'prod', name: 'Production', dependsOnStageId: 'qa', approverIds: ['usr-maya'], status: 'pendingApproval', latestDeploymentId: 'dep-8102-prod-1' }], createdBy: 'usr-alex', createdAt: '2026-11-11T17:00:00.000Z', updatedBy: 'usr-alex', updatedAt: '2026-11-11T17:20:00.000Z' }` | Status `active\|succeeded\|failed`. Stage status `ready\|blocked\|pendingApproval\|succeeded\|failed\|rejected`. Stage IDs and approval rules are snapshotted at creation. Latest deployment is null until a stage is attempted. |
| `deployments[]` | `{ id: 'dep-8102-qa-1', projectId: 'proj-commerce', releaseId: '8102', stageId: 'qa', artifactId: 'artifact-5202-drop', attempt: 1, status: 'succeeded', requestedBy: 'usr-alex', createdAt: '2026-11-11T17:10:00.000Z', startedAt: '2026-11-11T17:10:00.000Z', finishedAt: '2026-11-11T17:10:00.000Z', finishedBy: 'usr-alex', logs: [{ step: 'Download artifact', status: 'succeeded', lines: ['Resolved drop 20261111.2.'] },{ step: 'Deploy to QA', status: 'succeeded', lines: ['Deployment completed.'] }] }` | Status `pendingApproval\|succeeded\|failed\|rejected`. Attempt is an integer per release/stage. Pending or rejected deployments may have null start times. Pending finish fields are null. |
| `releaseApprovals[]` | `{ id: 'approval-8102-prod-1-maya', releaseId: '8102', stageId: 'prod', deploymentId: 'dep-8102-prod-1', approverId: 'usr-maya', status: 'pending', comment: '', createdBy: 'usr-alex', createdAt: '2026-11-11T17:20:00.000Z', decidedBy: null, decidedAt: null }` | Status `pending\|approved\|rejected\|canceled`. A rejection cancels sibling approvals still pending on that attempt and stamps their decision metadata. |

Use these explicit transitions for release persistence.

| Action | Transition |
| --- | --- |
| Create release | Snapshot definition stages and chosen successful run's artifact. Set root stages ready, dependent stages blocked and release active. |
| Deploy or Redeploy | Allowed from ready or a terminal stage if the prerequisite has any previous successful attempt. Store a fresh attempt and set `latestDeploymentId`. An ungated request records success and task output in the same action. A gated stage records pending approval, nullable start/finish fields, and one pending row per designated approver. Prior attempts remain queryable. |
| Approve | Record actor, decision time and text. When all approval rows on the pending attempt are approved, set deployment/stage succeeded, stamp start/finish metadata and store logs in that transaction. Approval before the final vote changes only the approval record and release update metadata. |
| Reject | Record the decision, close sibling pending approval rows, mark the attempt and stage rejected, and write finish metadata and an explanatory log. |
| Recompute release | In the same transaction, unlock blocked stages whose prerequisite has a successful attempt. Ready stages stay ready across prerequisite redeploys. If all latest stages succeeded, set release succeeded. If any latest stage is failed/rejected and none is awaiting approval, set failed. Otherwise set active. |

### Default IDs

| Surface | Seeded IDs |
| --- | --- |
| Workspace | Organization `org-harbor` (`harbor-labs`), project `proj-commerce` (`Harbor-Commerce`), team `team-checkout`, current user `usr-maya`, assignee `usr-alex` |
| Boards | Work items `1042` and `1034`, iteration `spr-commerce-22`, query `query-checkout-bugs` |
| Repos | Repository `repo-checkout` (`checkout-api`), branches `br-checkout-main` and `br-checkout-retry`, PR `321` |
| Pipelines | Definition `pipe-checkout-ci`, successful run `5202`, in-progress run `5205`, artifact `artifact-5202-drop` |
| Releases | Definition `rd-checkout`, release `8102`, stages `qa` and `prod`, pending approval `approval-8102-prod-1-maya` |

## Minimal Inject Example

Post this body to a fresh session to replace the Work items list in Harbor Commerce with a single bug. Other collections retain their defaults.

```json
{
  "action": "set",
  "state": {
    "workItems": [
      {
        "id": "2001",
        "projectId": "proj-commerce",
        "teamId": "team-checkout",
        "type": "Bug",
        "title": "Verify order confirmation retries",
        "state": "New",
        "priority": 2,
        "boardOrder": 100,
        "createdBy": "usr-maya",
        "createdAt": "2026-11-18T06:00:00.000Z",
        "changedBy": "usr-maya",
        "changedAt": "2026-11-18T06:00:00.000Z"
      }
    ],
    "workItemRevisions": [],
    "workItemComments": []
  }
}
```

## Observable State Changes (for LLM evaluation)

The paths below are relative to `current_state`. Brackets denote the record
selected by its stable ID. The top-level keys in `state_diff` identify
collections or objects changed since the baseline.

| Action | Fields written |
| --- | --- |
| Create work item or quick-add story | New `workItems[]` record and `workItemRevisions[]` record with `action=create` and typed `changes`. |
| Edit work item | Patch changed fields from `workItems[].{type,title,description,acceptanceCriteria,state,assignedToId,priority,storyPoints,areaPath,sprintId,tags,parentId}` and update `changedBy` and `changedAt`. Update `boardOrder` when the lane changes. Append `workItemRevisions[]` with `action=edit` and typed changes. A conflict or unchanged save makes no writes. |
| Move or reorder a board card | `workItems[].{state,boardOrder,changedBy,changedAt}` as applicable; append one revision with `action=move` or `reorder`. |
| Bulk assign or move to sprint | `workItems[].{assignedToId,changedBy,changedAt}` or `workItems[].{sprintId,changedBy,changedAt}`; append one revision per affected item with `action=bulkAssign` or `bulkSprint`. |
| Add discussion | Append `workItemComments[]`; update `workItems[].{changedBy,changedAt}`. |
| Save flat-list query | Append `queries[]`, or replace `queries[].{name,scope,clauses}` with the editor values and stamp `updatedBy` and `updatedAt`. A stale editor can restore older values in untouched fields. |
| Create or initialize repository | Append `repositories[]` for create; when initialized, set `repositories[].defaultBranchId` and append `branches[]` and `commits[]`, including a README file change. |
| Create branch | Append `branches[]`, including `baseBranchId,headCommitId,workItemIds`. |
| Commit a file | Append `commits[]` with `parentCommitIds` and `changes[]` from the current branch head to the submitted file contents. Update `branches[].{headCommitId,updatedBy,updatedAt}`. A conflicting edit to the selected branch and path keeps the draft open. Identical contents make no writes. |
| Create or publish PR | Append `pullRequests[]`, or update `pullRequests[].{isDraft,updatedBy,updatedAt}`. |
| Comment or reply on PR | Append `pullRequestComments[]` with thread location and parent ID. |
| Resolve or reopen PR thread | Update root `pullRequestComments[].{status,updatedBy,updatedAt}`. |
| Vote on PR | Update `pullRequests[].{reviewers,updatedBy,updatedAt}`. |
| Complete PR | Set `pullRequests[].{status,closedBy,closedAt,mergeCommitId,sourceCommitId,targetCommitId,updatedBy,updatedAt}`; append merge `commits[]` and update target `branches[].{headCommitId,updatedBy,updatedAt}`. When selected, close linked `workItems[]` with new lane order and change metadata, plus a `workItemRevisions[]` record per update. |
| Abandon PR | Set `pullRequests[].{status,closedBy,closedAt,updatedBy,updatedAt}`. |
| Save YAML pipeline | Append `pipelines[]`, or update the edited name or source fields in `pipelines[].{name,repoId,defaultBranchId,yamlPath}` and stamp `{updatedBy,updatedAt}`. Reuse the latest file for untouched YAML. For an edited file, check its original contents at the destination branch and path before appending a commit and advancing the branch head. |
| Run, Save and run, or Run new | Append `pipelineRuns[]` and a successful run's `pipelineArtifacts[]`; retain `rerunOfRunId` for Run new. Save and run also applies the definition and Git writes in the same snapshot. |
| Cancel run | Set `pipelineRuns[].{status,result,finishedAt,canceledBy}` and unfinished `stages[].{status,result}` and `stages[].jobs[].{status,result}`. |
| Save release definition | Append `releaseDefinitions[]`, or apply changes to `releaseDefinitions[].{name,artifactPipelineId,stages}` and stamp `{updatedBy,updatedAt}`. Conflicting changes to the same field block the save. `stages[]` is validated as an ordered configuration. Releases keep the independent stage snapshots captured at creation. |
| Create release | Append `releases[]` with artifact pin and independent stage snapshots. |
| Deploy or redeploy | Append `deployments[]` and gated `releaseApprovals[]`; update `releases[].{status,updatedBy,updatedAt}` and `stages[].{status,latestDeploymentId}`, unblocking dependent stages when eligible. |
| Approve or reject | Update the decision in `releaseApprovals[].{status,comment,decidedBy,decidedAt}` and stamp `releases[].{updatedBy,updatedAt}`. Rejection also updates sibling pending approvals' `status`, `decidedBy`, and `decidedAt`. Terminal decisions update `deployments[].{status,logs,startedAt,finishedAt,finishedBy}` as applicable, `releases[].status`, and `releases[].stages[].{status,latestDeploymentId}` as applicable in the same snapshot. |
| Change theme | Update `preferences.{theme,updatedBy,updatedAt}`. |

If injected board ranks are tied or a gap has reached numeric precision, a reorder normalizes the affected lane’s `workItems[].boardOrder` ranks in the same save. The moved card receives the change metadata and revision.
