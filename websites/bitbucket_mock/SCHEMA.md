# bitbucket_mock Schema

| Endpoint | Usage |
| --- | --- |
| **Base URL** | `http://localhost:5478/` |
| **Go Endpoint** | `GET /go?sid=<sid>` returns `{initial_state, current_state, state_diff}`. Each changed top-level key has an `added` or `modified` value. |
| **Inject** | `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`. A fresh client reads `GET /state?sid=<sid>`, recursively merges objects over defaults and replaces arrays. |
| **Reset** | `POST /post?sid=<sid>` with `{"action":"reset"}` restores the recorded baseline. Use a fresh browser context to reload server state after an injection or reset. |

Read this state at `GET /go?sid=…` in `current_state`. The same response provides the initial state and changes grouped by top-level key. The store preserves unrelated injected keys. Atlassian's REST resources inform the relationships between repositories, refs, PR participants, pipeline targets and steps. The mock uses its own flat, JSON-serializable arrays. Derive list summaries from the records below. [Repository API](https://developer.atlassian.com/cloud/bitbucket/rest/api-group-repositories/) · [Pull request API](https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pullrequests/) · [Pipelines API](https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pipelines/)

## State Schema

| Key | Type | Description |
| --- | --- | --- |
| `currentUserId` | string | ID of the current user |
| `workspaces` | object[] | 2 workspace records |
| `projects` | object[] | 6 project records scoped to workspaces |
| `users` | object[] | 24 actor records |
| `repositories` | object[] | 36 repositories with project IDs and settings |
| `repositoryStars` | object[] | 24 user and repository star records |
| `branches` | object[] | 90 refs with repository and head commit IDs |
| `commits` | object[] | 180 commits with parent IDs and file changes |
| `pullRequests` | object[] | 60 pull requests |
| `pullRequestComments` | object[] | 80 review comments and replies |
| `pullRequestTasks` | object[] | 36 review tasks |
| `pullRequestReviews` | object[] | 50 review decisions |
| `pullRequestActivity` | object[] | 120 activity records |
| `pipelineDefinitions` | object[] | 36 definitions with fixture steps |
| `pipelineRuns` | object[] | 96 runs with step attempts and logs |

### Default IDs

| Entity | Seed IDs |
| --- | --- |
| Current user | `usr-riley-chen` |
| Workspaces | `ws-northstar`, `ws-pinecone` |
| Projects | `prj-platform`, `prj-experience`, `prj-data`, `prj-developer-tools`, `prj-research`, `prj-infrastructure` |
| Atlas repository and star | `repo-atlas-api`, `star-riley-atlas` |
| Atlas branches and commits | `br-atlas-api-main`, `br-atlas-api-retry`, `cmt-atlas-api-base`, `cmt-atlas-api-retry` |
| Atlas review fixtures | `pr-atlas-47`, `prc-pr-atlas-47-1`, `prt-pr-atlas-47-1`, `rev-pr-atlas-47-1`, `pra-pr-atlas-47-latest` |
| Atlas pipeline fixtures | `pd-atlas-api-build`, `pd-atlas-api-release`, `run-atlas-api-302`, `run-atlas-api-303` |

Return a fresh object each time. Use fixed literal IDs and dates, or generate them deterministically from fixture input. New records can use `crypto.randomUUID()`. On a user action capture `new Date().toISOString()` once, use it for all fields updated by that action, and store the signed-in user's ID. IDs are strings. PR and build numbers, durations and line numbers are integers. All timestamps are ISO 8601 strings. `?` marks fields optional in injected fixtures and `| null` marks fields explicitly empty when applicable. Missing lists render as empty. Preserve unrelated injected keys when saving. Commit content, descriptions and logs are inert text.

Creation and update stamps use `createdAt` (for example, `2026-10-12T14:10:00.000Z`), `createdBy` (for example, `usr-riley-chen`), `updatedAt?` and `updatedBy?` of the same types. Creator and modifier fields refer to `users[].id`. When an action both creates and updates a record, initialize its update fields from the same actor and timestamp. **Touch repository** means update `repositories[].updatedAt` and `updatedBy`.

## Workspace and directory

| Record | Fields and example values | Relationships and defaults |
| --- | --- | --- |
| `workspaces[]` | `id: string = 'ws-northstar'`, `slug: string = 'northstar-engineering'`, `name: string = 'Northstar Engineering'` | Workspace slug is unique. Use Northstar as default when present, otherwise use the first available workspace. |
| `projects[]` | `id: string = 'prj-platform'`, `workspaceId: string = 'ws-northstar'`, `key: string = 'PLAT'`, `name: string = 'Platform'`, `description?: string = 'Shared platform tooling and services'` | Project key is unique within its workspace. |
| `users[]` | `id: string = 'usr-riley-chen'`, `name: string = 'Riley Chen'`, `username: string = 'rileychen'`, `workspaceIds?: string[] = ['ws-northstar']`, `avatarColor?: string = '#245A81'` | Filter the reviewer picker by workspace where membership is present. Use initials and a neutral swatch if avatar fields are absent. If the injected world lacks the current user, allow browsing and require an available identity for changes. |
| `repositories[]` | `id: string = 'repo-atlas-api'`, `workspaceId: string = 'ws-northstar'`, `projectId: string = 'prj-platform'`, `name: string = 'atlas-api'`, `slug: string = 'atlas-api'`, `description?: string = 'Public transit routing API'`, `visibility: 'private' \| 'public'`, `defaultBranchId: string = 'br-atlas-api-main'`, creation and update stamps, `deletedAt?: timestamp \| null`, `deletedBy?: userId \| null`, `pipelinesEnabled?: boolean = true`, `pipelineConfiguredAt?: timestamp`, `pipelineConfiguredBy?: userId`, `pipelineSettingsUpdatedAt?: timestamp`, `pipelineSettingsUpdatedBy?: userId`, `mergeChecks?: { requiredApprovals?: number, requireResolvedTasks?: boolean }` (example `{ requiredApprovals: 1, requireResolvedTasks: true }`). | Project and default branch belong to this workspace/repository. New repositories start with Pipelines disabled and both merge checks off. Exclude deleted repos and descendants from ordinary lists/routes, and keep their records in state. |
| `repositoryStars[]` | `id: string = 'star-riley-atlas'`, `repositoryId: string = 'repo-atlas-api'`, `userId: string = 'usr-riley-chen'`, creation and update stamps, `starredAt: timestamp`, `removedAt: timestamp \| null` | One record per user/repository. Set `removedAt` on unstar. Restarring clears it and refreshes `starredAt`. The modification fields record the actor. Hide stars for deleted repositories. |

## Source and history

| Record | Fields and example values | Relationships and defaults |
| --- | --- | --- |
| `branches[]` | `id: string = 'br-atlas-api-retry'`, `repositoryId: string = 'repo-atlas-api'`, `name: string = 'feature/retry-budget'`, `sourceBranchId: string \| null = 'br-atlas-api-main'`, `headCommitId: string \| null = 'cmt-atlas-api-retry'`, creation and update stamps, `closedAt?: timestamp \| null`, `closedBy?: userId \| null` | Branch names are unique among active branches of a repository. An uninitialized main branch has a null head. Keep closed branches for historical links, and omit them from creation and run pickers. |
| `commits[]` | `id: string = 'cmt-atlas-api-retry'`, `repositoryId: string = 'repo-atlas-api'`, `branchId: string = 'br-atlas-api-retry'`, `hash: string = '115068aab8f36c02f1e4a51a09f0414731d109aa'`, `message: string = 'Document retry budget defaults'`, `parentIds: string[] = ['cmt-atlas-api-base']`, `changes: FileChange[]`, `createdAt`, `createdBy`. | Each parent belongs to the same repository. The branch is where the commit was created. Reachability, using parent links, determines which branch histories include the commit. |
| `FileChange` | `path: string = 'docs/retries.md'`, `operation: 'add' \| 'modify' \| 'delete' = 'modify'`, `content: string \| null = '# Retry budget\\nDefault: 3 attempts.\\n'`. | Store the full resulting text for that path. A delete uses null. Keep deltas relative to the first parent. Only the merge result and fixture commits need delete changes. |

For Source, apply first-parent deltas in order. For branch history and PR ancestry, traverse all parents. For an open PR, read live branch heads, then use their nearest common ancestor and the source head for the diff. The Commits tab lists commits reachable from the source and absent from the destination. A source commit with no effective file changes does not make a new PR eligible.

On merge, compare each source change to the common ancestor and destination. Apply source-only changes and preserve destination-only changes. Treat differing edits to the same path as a conflict and show the paths in the UI. This file-level conflict rule is a sandbox simplification. A merge commit uses parent IDs in destination-then-source order, with resulting deltas relative to the original destination. A squash commit uses only the destination parent. Recompute at submit and require the two reviewed heads to still match the preview. Close the source only if it is active, is not the default branch and is not referenced by another open PR as source or destination. When closure is unavailable, explain why in the confirmation before submission.

## Pull requests and review

| Record | Fields and example values | Relationships and defaults |
| --- | --- | --- |
| `pullRequests[]` | `id: string = 'pr-atlas-47'`, `repositoryId: string = 'repo-atlas-api'`, `number: integer = 47`, `sourceBranchId: string = 'br-atlas-api-retry'`, `destinationBranchId: string = 'br-atlas-api-main'`, `sourceCommitId: string \| null = 'cmt-atlas-api-retry'`, `destinationCommitId: string \| null = 'cmt-atlas-api-base'`, `title: string = 'Document the retry budget'`, `description?: string = 'Clarify defaults for transient failures.'`, `authorId: string = 'usr-maya-patel'`, `reviewerIds?: string[] = ['usr-riley-chen', 'usr-oliver-grant']`, `closeSourceOnMerge?: boolean = false`, `status: 'open' \| 'merged' \| 'declined'`, creation and update stamps. | The branch IDs belong to the same repository. Store head IDs on creation and overwrite with pre-transition heads on merge/decline for closed PR detail. Open PRs use live heads when available and stored heads for fallback display. Allocate `number` from the repository's existing maximum plus one, including closed PRs. |
| Merged fields on `pullRequests[]` | `mergedAt?: timestamp`, `mergedBy?: userId`, `mergeCommitId?: string`, `mergeStrategy?: 'merge_commit' \| 'squash'`, `sourceBranchClosed?: boolean`. | A new merge sets these fields together and links to the new destination commit. See [the audit](AUDIT.md) for a lineage discrepancy in seeded historical merges. |
| Declined fields on `pullRequests[]` | `declinedAt?: timestamp`, `declinedBy?: userId = 'usr-riley-chen'`, `declineReason?: string = 'Superseded by the consolidated retry change.'`. | Set on decline. The reason may be an empty string. |
| `pullRequestComments[]` | `id: string = 'prc-pr-atlas-47-1'`, `pullRequestId: string = 'pr-atlas-47'`, `parentCommentId: string \| null`, `body: string = 'Can we link to the examples from the README?'`, `anchor: InlineAnchor \| null`, creation and update stamps, `status: 'open' \| 'resolved'` (on thread root), `resolvedAt?: timestamp \| null`, `resolvedBy?: userId \| null`. | Root comments use null parent. Replies point to their thread root and inherit its anchor, if any, at render time. Reopening clears resolution fields and records the modifier. |
| `InlineAnchor` | `path: string = 'docs/retries.md'`, `side: 'source' \| 'destination'`, `line: integer = 2`, `commitId: string = 'cmt-atlas-api-retry'`. | Associate an anchor with the commit matching its side at submission. If the anchored line no longer appears, retain the comment in Overview with its original location. |
| `pullRequestTasks[]` | `id: string = 'prt-pr-atlas-47-1'`, `pullRequestId: string = 'pr-atlas-47'`, `commentId: string \| null = 'prc-pr-atlas-47-1'`, `assigneeId: userId \| null = 'usr-maya-patel'`, `body: string = 'Add a README cross-reference'`, `status: 'open' \| 'completed'`, creation and update stamps, `completedAt?: timestamp \| null`, `completedBy?: userId \| null`. | If the task is linked to a comment, it belongs to the same PR. Assign to a reviewer or the PR author. Reopening clears completion fields. |
| `pullRequestReviews[]` | `id: string = 'rev-pr-atlas-47-1'`, `pullRequestId: string = 'pr-atlas-47'`, `reviewerId: userId = 'usr-oliver-grant'`, `status: 'approved' \| 'changes_requested' \| 'unreviewed'`, `sourceCommitId: string = 'cmt-atlas-api-retry'`, creation and update stamps. | One decision per PR and reviewer. For a required approval count, count approved decisions from non-authors matching the current source head. Clear sets unreviewed and updates the stamp. |
| `pullRequestActivity[]` | `id: string = 'pra-pr-atlas-47-latest'`, `pullRequestId: string = 'pr-atlas-47'`, `type: string = 'comment_added'`, `targetId: string = 'prc-pr-atlas-47-1'`, `changes?: object = { body: 'Could we include the expected output here?' }`, `createdAt`, `createdBy`. | The target is the PR, comment, task, review or merge commit identified by the action. `changes` contains the affected fields and their new JSON values. |

Activity types are `created`, `edited`, `comment_added`, `comment_replied`, `thread_resolved`, `thread_reopened`, `task_created`, `task_completed`, `task_reopened`, `review_changed`, `merged` and `declined`. Assign consistent type and target pairs. For create, edit and decline use the PR ID. For merge use the result commit ID. Use the child record IDs for comment, task and decision actions. Derive counts, reviewer pills, checks and Activity display copy from structured records.

## Pipelines

| Record | Fields and example values | Relationships and defaults |
| --- | --- | --- |
| `pipelineDefinitions[]` | `id: string = 'pd-atlas-api-release'`, `repositoryId: string = 'repo-atlas-api'`, `name: string = 'Release check'`, `type: 'default' \| 'branch' \| 'custom'`, `branchNames?: string[] = ['main', 'release/2026-11']`, `variables?: VariableDefinition[]`, `steps: StepDefinition[]`, `configPath: string = 'bitbucket-pipelines.yml'`, `configCommitId?: string = 'cmt-atlas-api-main-2'`, `createdAt`, `createdBy`. | An omitted or empty branch list means any active branch. Definitions are fixture data or generated by starter setup. Source displays YAML as text. |
| `VariableDefinition` | `name: string = 'REGION'`, `required: boolean = true`, `defaultValue?: string = 'eu-west'`, `allowedValues?: string[] = ['eu-west', 'us-east']`, `secret?: boolean`, `secured?: boolean`. | Only collect named non-secret inputs declared by the definition. |
| `StepDefinition` | `key: string = 'unit-tests'`, `name: string = 'Unit tests'`, `fixtureStatus: 'successful' \| 'failed' \| 'in_progress' \| 'pending'`, `fixtureDurationSeconds: integer = 14`, `fixtureLogSections?: LogSection[]`, `retryFixtureStatus?: 'successful' \| 'failed'`, `retryFixtureLogSections?: LogSection[]`. | The template defines deterministic outputs, statuses and durations for each step. Default a missing retry outcome to the original failure. |
| `pipelineRuns[]` | `id: string = 'run-atlas-api-302'`, `repositoryId: string = 'repo-atlas-api'`, `buildNumber: integer = 302`, `definitionId: string = 'pd-atlas-api-build'`, `definitionSnapshot: object = { name: 'Build and test', type: 'default', steps: [/* StepDefinition */] }`, `branchId: string = 'br-atlas-api-retry'`, `branchName: string = 'feature/retry-budget'`, `commitId: string = 'cmt-atlas-api-retry'`, `commitHash: string = '115068aab8f36c02f1e4a51a09f0414731d109aa'`, `trigger: 'manual' \| 'push' \| 'pull_request' \| 'rerun'`, `rerunOfRunId?: string \| null`, `variables?: object = { REGION: 'eu-west' }`, `status: 'pending' \| 'in_progress' \| 'successful' \| 'failed' \| 'stopped'`, `startedAt: timestamp`, `finishedAt: timestamp \| null`, `durationSeconds: integer \| null = 19`, `stoppedAt?: timestamp`, `stoppedBy?: userId`, `steps: PipelineStep[]`, `retries?: StepRetry[]`, creation and update stamps. | Build number is repository-local, allocated as existing maximum plus one. A whole rerun takes target, definition snapshot and variables from the original run and links the original ID. Seeded push/PR triggers show historical results. |
| `PipelineStep` | `id: string = 'step-atlas-api-302-unit-tests'`, `definitionStepKey: string = 'unit-tests'`, `name: string = 'Unit tests'`, `attempts: StepAttempt[]`. | Display status from the latest attempt. A skipped or pending step can show a message when it has no logs. |
| `StepAttempt` | `id: string = 'att-atlas-api-302-unit-tests-1'`, `number: integer = 1`, `retryId?: string \| null`, `status: 'pending' \| 'in_progress' \| 'successful' \| 'failed' \| 'stopped' \| 'skipped'`, `startedAt: timestamp \| null`, `finishedAt: timestamp \| null`, `durationSeconds: integer \| null = 14`, `logSections?: LogSection[]`, creation and update stamps, `stoppedAt?: timestamp`, `stoppedBy?: userId`. | Attempt numbers start at 1 per step. Stop updates the most recent pending/in-progress attempts. Finished attempts and their logs stay readable. |
| `LogSection` | `id: string = 'test'`, `label: string = 'Unit test results'`, `status: 'successful' \| 'failed' \| 'in_progress'`, `durationSeconds?: integer = 7`, `lines: string[] = ['124 passed, 0 failed']`. | Order is display order. An omitted `lines` list displays as no output. |
| `StepRetry` | `id: string = 'retry-atlas-302-1'`, `number: integer = 1`, `stepIds: string[] = ['step-atlas-api-302-unit-tests']`, `status: 'successful' \| 'failed'`, `finishedAt: timestamp`, `durationSeconds: integer = 14`, `createdAt`, `createdBy`. | One group per failed-step retry click. Use `StepAttempt.retryId` to locate the group's new attempts. |

Choose the branch head for a branch run and the selected reachable commit for a commit run. For a commit in more than one branch, prefill an active containing branch and let the user select another containing branch. Refuse submission with a stale or missing target. Starter setup can be the first commit on an uninitialized default branch. If an existing injected config has no definition or its target head is missing, show the setup or unavailable state for that situation. Preserve an existing config file instead of silently replacing it. Only show a starter write if it can be applied with an explicit confirmation and valid head.

For a new run, create attempts in definition order. After a failed step mark later steps skipped. After an active step mark later steps pending. A run with a failed step is failed, with any active step is in progress, with all executable steps successful is successful, and otherwise is pending. For an active run, use a null finish time and duration. For fixture completion or an explicit retry sample `now` for the action and use fixture duration for the displayed build time. Calculate total duration as the sum of completed attempt durations. On Stop use the elapsed duration from the frozen clock for interrupted attempts, clamped to zero minimum, and record the stopping actor and time on the run and affected attempts. An active fixture remains active until stopped. Buttons that depend on pipelines being enabled validate that setting at submission.

Failed-step retry appends attempts for each currently failed step, uses that step's retry fixture, and recalculates run status from the latest attempts. Prior attempts retain all fields. The run can finish successfully after failed steps pass even if it contains skipped steps. Its log view keeps the prior output. Whole rerun uses the original definition snapshot and builds a fresh run with fresh attempts, leaving the original build untouched. A run can outlive a renamed/closed branch or a deleted definition because it retains its original target and definition display values. When an injected run lacks a required snapshot for rerun, render results with available values and explain that rerun is unavailable.

## Minimal Inject Example

This state creates a workspace with no repositories and an actor who can create one. Send it as the `state` value in the injection request, then visit `/audit-workspace/workspace/repositories?sid=<sid>` in a fresh browser context.

```json
{
  "currentUserId": "injected-user",
  "workspaces": [{"id": "injected-ws", "slug": "audit-workspace", "name": "Audit Workspace"}],
  "projects": [{"id": "injected-project", "workspaceId": "injected-ws", "key": "AUD", "name": "Audit"}],
  "users": [{"id": "injected-user", "name": "Casey Morgan", "workspaceIds": ["injected-ws"]}],
  "repositories": [],
  "repositoryStars": [],
  "branches": [],
  "commits": [],
  "pullRequests": [],
  "pullRequestComments": [],
  "pullRequestTasks": [],
  "pullRequestReviews": [],
  "pullRequestActivity": [],
  "pipelineDefinitions": [],
  "pipelineRuns": []
}
```

## Observable State Changes (for LLM evaluation)

Each row represents one full-state save for an action that changes a record. Navigation, filters, previews, expand/collapse, drafts, loading, invalid actions, cancellation and idle time are read-only.

| UI action | State paths and effects |
| --- | --- |
| Create repository | Append `repositories[]` and `branches[]`. Set `defaultBranchId` and branch `headCommitId`. If README is enabled, append `commits[]` with `changes[].path = README.md`. |
| Edit repository details | Update the selected `repositories[].{name,description,projectId,visibility,defaultBranchId,updatedAt,updatedBy}`. |
| Star or unstar | Upsert `repositoryStars[]`. Set `starredAt` on star and clear or set `removedAt` accordingly. Apply modification stamps. |
| Delete repository | Set `repositories[].{deletedAt,deletedBy,updatedAt,updatedBy}`. |
| Create branch | Append `branches[]` with source branch and commit IDs. Touch repository. |
| Commit a file | Append `commits[]` with parent IDs and path/content delta. Advance branch head and its modification fields. Touch repository. |
| Create or edit PR | Append `pullRequests[]` on create. On edit update title, description, reviewer IDs and close-source choice as changed. Append the corresponding activity and apply modification stamps. |
| Add comment/reply or resolve/reopen | Append `pullRequestComments[]` on add/reply. Resolve/reopen updates thread-root status, resolution fields and modification stamps. Append activity and touch PR. |
| Add, complete or reopen task | Append `pullRequestTasks[]` on add. Complete/reopen updates status, completion fields and modification stamps. Append activity and touch PR. |
| Approve, request changes or clear review | Upsert `pullRequestReviews[]` with current status, source head and actor/timestamps. Append activity and touch PR. |
| Merge PR | Append merge `commits[]` record. Update destination head and modification stamps, optionally close and stamp the source, and touch repository. Set final PR status, captured heads, merge fields and modification stamps. Append activity. |
| Decline PR | Set final PR status, captured heads, decline fields and modification stamps. Append activity. |
| Set up Pipelines | Append `pipelineDefinitions[]` and the config `commits[]` record. Advance the default head, then set `repositories[].{pipelinesEnabled,pipelineConfiguredAt,pipelineConfiguredBy,pipelineSettingsUpdatedAt,pipelineSettingsUpdatedBy,updatedAt,updatedBy}`. |
| Enable or disable Pipelines | Update `repositories[].{pipelinesEnabled,pipelineSettingsUpdatedAt,pipelineSettingsUpdatedBy,updatedAt,updatedBy}`. |
| Run pipeline | Append `pipelineRuns[]`, including its target, definition snapshot, inputs, steps, attempt logs, trigger and stamps. |
| Stop pipeline | Update `pipelineRuns[].{status,finishedAt,durationSeconds,stoppedAt,stoppedBy,updatedAt,updatedBy}` and the active/pending attempts' status, finish/stop fields, duration and modification stamps. |
| Retry failed steps | Append `pipelineRuns[].retries[]` and new attempts on failed steps. Update the run's status, finish fields, duration and modification stamps. |
| Rerun entire pipeline | Append a whole `pipelineRuns[]` record with a fresh number and `rerunOfRunId` referencing its source. |
