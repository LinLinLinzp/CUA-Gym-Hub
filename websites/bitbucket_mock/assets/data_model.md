# Bitbucket Cloud state model

This is the implementation contract for `src/data/seed.js` and the store. Atlassian's REST resources inform the relationships between repositories, refs, PR participants, pipeline targets and steps. The mock uses its own flat, JSON-serializable arrays. Derive list summaries from the records below. [Repository API](https://developer.atlassian.com/cloud/bitbucket/rest/api-group-repositories/) · [Pull request API](https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pullrequests/) · [Pipelines API](https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pipelines/)

## Initial data

```js
export function createInitialData() {
  return {
    currentUserId: 'usr-riley-chen',
    workspaces: [/* 2 workspace records */],
    projects: [/* 6 project records */],
    users: [/* 24 user records */],
    repositories: [/* 36 repository records */],
    repositoryStars: [/* 24 star records */],
    branches: [/* 90 branch records */],
    commits: [/* 180 commit records */],
    pullRequests: [/* 60 PR records */],
    pullRequestComments: [/* 80 comment records */],
    pullRequestTasks: [/* 36 task records */],
    pullRequestReviews: [/* 50 review records */],
    pullRequestActivity: [/* 120 activity records */],
    pipelineDefinitions: [/* 36 pipeline definition records */],
    pipelineRuns: [/* 96 pipeline run records */],
  }
}
```

Return a fresh object each time. Use fixed literal IDs and dates, or generate them deterministically from fixture input. New records can use `crypto.randomUUID()`. On a user action capture `new Date().toISOString()` once, use it for all fields updated by that action, and store the signed-in user's ID. IDs are strings. PR and build numbers, durations and line numbers are integers. All timestamps are ISO 8601 strings. `?` marks fields optional in injected fixtures and `| null` marks fields explicitly empty when applicable. Missing lists render as empty. Preserve unrelated injected keys when saving. Commit content, descriptions and logs are inert text.

Creation and update stamps use `createdAt` (for example, `2026-10-12T14:10:00.000Z`), `createdBy` (for example, `usr-riley-chen`), `updatedAt?` and `updatedBy?` of the same types. Creator and modifier fields refer to `users[].id`. When an action both creates and updates a record, initialize its update fields from the same actor and timestamp. **Touch repository** means update `repositories[].updatedAt` and `updatedBy`.

## Workspace and directory

| Record | Fields and example values | Relationships and defaults |
| --- | --- | --- |
| `workspaces[]` | `id: string = 'ws-northstar'`, `slug: string = 'northstar-engineering'`, `name: string = 'Northstar Engineering'` | Workspace slug is unique. Use Northstar as default when present, otherwise use the first available workspace. |
| `projects[]` | `id: string = 'prj-platform'`, `workspaceId: string = 'ws-northstar'`, `key: string = 'PLAT'`, `name: string = 'Platform'`, `description?: string = 'Shared platform tooling and services'` | Project key is unique within its workspace. |
| `users[]` | `id: string = 'usr-riley-chen'`, `name: string = 'Riley Chen'`, `username: string = 'rileychen'`, `workspaceIds?: string[] = ['ws-northstar']`, `avatarColor?: string = '#245A81'` | Filter the reviewer picker by workspace where membership is present. Use initials and a neutral swatch if avatar fields are absent. If the injected world lacks the current user, allow browsing and require an available identity for changes. |
| `repositories[]` | `id: string = 'repo-atlas-api'`, `workspaceId: string = 'ws-northstar'`, `projectId: string = 'prj-platform'`, `name: string = 'atlas-api'`, `slug: string = 'atlas-api'`, `description?: string = 'Public transit routing API'`, `visibility: 'private' \| 'public'`, `defaultBranchId: string = 'br-atlas-main'`, `language?: string = 'TypeScript'`, creation and update stamps, `deletedAt?: timestamp \| null`, `deletedBy?: userId \| null`, `pipelinesEnabled?: boolean = true`, `pipelineConfiguredAt?: timestamp`, `pipelineConfiguredBy?: userId`, `pipelineSettingsUpdatedAt?: timestamp`, `pipelineSettingsUpdatedBy?: userId`, `mergeChecks?: { minApprovals?: number, requireResolvedTasks?: boolean }` (example `{ minApprovals: 1, requireResolvedTasks: true }`). | Project and default branch belong to this workspace/repository. New repositories start with Pipelines disabled and both merge checks off. Exclude deleted repos and descendants from ordinary lists/routes, and keep their records in state. |
| `repositoryStars[]` | `id: string = 'star-riley-atlas'`, `repositoryId: string = 'repo-atlas-api'`, `userId: string = 'usr-riley-chen'`, creation and update stamps, `starredAt: timestamp`, `removedAt: timestamp \| null` | One record per user/repository. Set `removedAt` on unstar. Restarring clears it and refreshes `starredAt`. The modification fields record the actor. Hide stars for deleted repositories. |

## Source and history

| Record | Fields and example values | Relationships and defaults |
| --- | --- | --- |
| `branches[]` | `id: string = 'br-atlas-retry'`, `repositoryId: string = 'repo-atlas-api'`, `name: string = 'feature/retry-budget'`, `sourceBranchId: string \| null = 'br-atlas-main'`, `headCommitId: string \| null = 'cmt-atlas-retry'`, creation and update stamps, `closedAt?: timestamp \| null`, `closedBy?: userId \| null` | Branch names are unique among active branches of a repository. An uninitialized main branch has a null head. Keep closed branches for historical links, and omit them from creation and run pickers. |
| `commits[]` | `id: string = 'cmt-atlas-retry'`, `repositoryId: string = 'repo-atlas-api'`, `branchId: string = 'br-atlas-retry'`, `hash: string = 'b491cec301bd64bd70f619ce6cee21b1c0f14870'`, `message: string = 'Document retry budget defaults'`, `parentIds: string[] = ['cmt-atlas-base']`, `changes: FileChange[]`, `createdAt`, `createdBy`. | Each parent belongs to the same repository. The branch is where the commit was created. Reachability, using parent links, determines which branch histories include the commit. |
| `FileChange` | `path: string = 'docs/retries.md'`, `operation: 'add' \| 'modify' \| 'delete' = 'modify'`, `content: string \| null = '# Retry budget\\nDefault: 3 attempts.\\n'`. | Store the full resulting text for that path. A delete uses null. Keep deltas relative to the first parent. Only the merge result and fixture commits need delete changes. |

For Source, apply first-parent deltas in order. For branch history and PR ancestry, traverse all parents. For an open PR, read live branch heads, then use their nearest common ancestor and the source head for the diff. The Commits tab lists commits reachable from the source and absent from the destination. A source commit with no effective file changes does not make a new PR eligible.

On merge, compare each source change to the common ancestor and destination. Apply source-only changes and preserve destination-only changes. Treat differing edits to the same path as a conflict and show the paths in the UI. This file-level conflict rule is a sandbox simplification. A merge commit uses parent IDs in destination-then-source order, with resulting deltas relative to the original destination. A squash commit uses only the destination parent. Recompute at submit and require the two reviewed heads to still match the preview. Close the source only if it is active, is not the default branch and is not referenced by another open PR as source or destination. When closure is unavailable, explain why in the confirmation before submission.

## Pull requests and review

| Record | Fields and example values | Relationships and defaults |
| --- | --- | --- |
| `pullRequests[]` | `id: string = 'pr-atlas-47'`, `repositoryId: string = 'repo-atlas-api'`, `number: integer = 47`, `sourceBranchId: string = 'br-atlas-retry'`, `destinationBranchId: string = 'br-atlas-main'`, `sourceCommitId: string = 'cmt-atlas-retry'`, `destinationCommitId: string = 'cmt-atlas-base'`, `title: string = 'Document the retry budget'`, `description?: string = 'Clarify defaults for transient failures.'`, `authorId: string = 'usr-maya-patel'`, `reviewerIds?: string[] = ['usr-riley-chen']`, `closeSourceOnMerge?: boolean = true`, `status: 'open' \| 'merged' \| 'declined'`, creation and update stamps. | The branch IDs belong to the same repository. Store head IDs on creation and overwrite with pre-transition heads on merge/decline for closed PR detail. Open PRs use live heads when available and stored heads for fallback display. Allocate `number` from the repository's existing maximum plus one, including closed PRs. |
| Merged fields on `pullRequests[]` | `mergedAt?: timestamp`, `mergedBy?: userId = 'usr-riley-chen'`, `mergeCommitId?: string = 'cmt-atlas-merge-47'`, `mergeStrategy?: 'merge_commit' \| 'squash'`, `sourceBranchClosed?: boolean`. | Set together on merge, and link to the new destination commit. |
| Declined fields on `pullRequests[]` | `declinedAt?: timestamp`, `declinedBy?: userId = 'usr-riley-chen'`, `declineReason?: string = 'Superseded by the consolidated retry change.'`. | Set on decline. The reason may be an empty string. |
| `pullRequestComments[]` | `id: string = 'prc-atlas-47-1'`, `pullRequestId: string = 'pr-atlas-47'`, `parentCommentId: string \| null`, `body: string = 'Can we link to the examples from the README?'`, `anchor: InlineAnchor \| null`, creation and update stamps, `status: 'open' \| 'resolved'` (on thread root), `resolvedAt?: timestamp \| null`, `resolvedBy?: userId \| null`. | Root comments use null parent. Replies point to their thread root and inherit its anchor, if any, at render time. Reopening clears resolution fields and records the modifier. |
| `InlineAnchor` | `path: string = 'docs/retries.md'`, `side: 'source' \| 'destination'`, `line: integer = 12`, `commitId: string = 'cmt-atlas-retry'`. | Associate an anchor with the commit matching its side at submission. If the anchored line no longer appears, retain the comment in Overview with its original location. |
| `pullRequestTasks[]` | `id: string = 'prt-atlas-47-1'`, `pullRequestId: string = 'pr-atlas-47'`, `commentId: string \| null = 'prc-atlas-47-1'`, `assigneeId: userId \| null = 'usr-maya-patel'`, `body: string = 'Add a README cross-reference'`, `status: 'open' \| 'completed'`, creation and update stamps, `completedAt?: timestamp \| null`, `completedBy?: userId \| null`. | If the task is linked to a comment, it belongs to the same PR. Assign to a reviewer or the PR author. Reopening clears completion fields. |
| `pullRequestReviews[]` | `id: string = 'rev-atlas-47-riley'`, `pullRequestId: string = 'pr-atlas-47'`, `reviewerId: userId = 'usr-riley-chen'`, `status: 'approved' \| 'changes_requested' \| 'unreviewed'`, `sourceCommitId: string = 'cmt-atlas-retry'`, creation and update stamps. | One decision per PR and reviewer. For a required approval count, count approved decisions from non-authors matching the current source head. Clear sets unreviewed and updates the stamp. |
| `pullRequestActivity[]` | `id: string = 'pra-atlas-47-1'`, `pullRequestId: string = 'pr-atlas-47'`, `type: string = 'comment_added'`, `targetId: string = 'prc-atlas-47-1'`, `changes?: object = { status: 'resolved' }`, `createdAt`, `createdBy`. | The target is the PR, comment, task, review or merge commit identified by the action. `changes` contains the affected fields and their new JSON values. |

Activity types are `created`, `edited`, `comment_added`, `comment_replied`, `thread_resolved`, `thread_reopened`, `task_created`, `task_completed`, `task_reopened`, `review_changed`, `merged` and `declined`. Assign consistent type and target pairs. For create, edit and decline use the PR ID. For merge use the result commit ID. Use the child record IDs for comment, task and decision actions. Derive counts, reviewer pills, checks and Activity display copy from structured records.

## Pipelines

| Record | Fields and example values | Relationships and defaults |
| --- | --- | --- |
| `pipelineDefinitions[]` | `id: string = 'pd-atlas-release'`, `repositoryId: string = 'repo-atlas-api'`, `name: string = 'Release check'`, `type: 'default' \| 'branch' \| 'custom'`, `branchNames?: string[] = ['main', 'release/2026-11']`, `variables?: VariableDefinition[]`, `steps: StepDefinition[]`, `configPath: string = 'bitbucket-pipelines.yml'`, `configCommitId?: string = 'cmt-atlas-config'`, `createdAt`, `createdBy`. | An omitted or empty branch list means any active branch. Definitions are fixture data or generated by starter setup. Source displays YAML as text. |
| `VariableDefinition` | `name: string = 'REGION'`, `required: boolean = true`, `defaultValue?: string = 'eu-west'`, `allowedValues?: string[] = ['eu-west', 'us-east']`. | Only collect named non-secret inputs declared by the definition. |
| `StepDefinition` | `key: string = 'unit-tests'`, `name: string = 'Unit tests'`, `fixtureStatus: 'successful' \| 'failed' \| 'in_progress' \| 'pending'`, `fixtureDurationSeconds: integer = 14`, `fixtureLogSections?: LogSection[]`, `retryFixtureStatus?: 'successful' \| 'failed'`, `retryFixtureLogSections?: LogSection[]`. | The template defines deterministic outputs, statuses and durations for each step. Default a missing retry outcome to the original failure. |
| `pipelineRuns[]` | `id: string = 'run-atlas-302'`, `repositoryId: string = 'repo-atlas-api'`, `buildNumber: integer = 302`, `definitionId: string = 'pd-atlas-release'`, `definitionSnapshot: object = { name: 'Release check', type: 'custom', steps: [/* StepDefinition */] }`, `branchId: string = 'br-atlas-main'`, `branchName: string = 'main'`, `commitId: string = 'cmt-atlas-config'`, `commitHash: string = 'b491cec301bd64bd70f619ce6cee21b1c0f14870'`, `trigger: 'manual' \| 'push' \| 'pull_request' \| 'rerun'`, `pullRequestId?: string \| null`, `rerunOfRunId?: string \| null`, `variables?: object = { REGION: 'eu-west' }`, `status: 'pending' \| 'in_progress' \| 'successful' \| 'failed' \| 'stopped'`, `startedAt: timestamp`, `finishedAt: timestamp \| null`, `durationSeconds: integer \| null = 19`, `stoppedAt?: timestamp`, `stoppedBy?: userId`, `steps: PipelineStep[]`, `retries?: StepRetry[]`, creation and update stamps. | Build number is repository-local, allocated as existing maximum plus one. A whole rerun takes target, definition snapshot and variables from the original run and links the original ID. Seeded push/PR triggers show historical results. |
| `PipelineStep` | `id: string = 'step-atlas-302-test'`, `definitionStepKey: string = 'unit-tests'`, `name: string = 'Unit tests'`, `attempts: StepAttempt[]`. | Display status from the latest attempt. A skipped or pending step can show a message when it has no logs. |
| `StepAttempt` | `id: string = 'att-atlas-302-test-1'`, `number: integer = 1`, `retryId?: string \| null`, `status: 'pending' \| 'in_progress' \| 'successful' \| 'failed' \| 'stopped' \| 'skipped'`, `startedAt: timestamp \| null`, `finishedAt: timestamp \| null`, `durationSeconds: integer \| null = 14`, `logSections?: LogSection[]`, creation and update stamps, `stoppedAt?: timestamp`, `stoppedBy?: userId`. | Attempt numbers start at 1 per step. Stop updates the most recent pending/in-progress attempts. Finished attempts and their logs stay readable. |
| `LogSection` | `id: string = 'log-unit-results'`, `label: string = 'Unit test results'`, `status: 'successful' \| 'failed' \| 'in_progress'`, `durationSeconds?: integer = 7`, `lines: string[] = ['124 passed, 0 failed']`. | Order is display order. Allow empty log bodies. |
| `StepRetry` | `id: string = 'retry-atlas-302-1'`, `number: integer = 1`, `stepIds: string[] = ['step-atlas-302-test']`, `status: 'successful' \| 'failed'`, `finishedAt: timestamp`, `durationSeconds: integer = 14`, `createdAt`, `createdBy`. | One group per failed-step retry click. Use `StepAttempt.retryId` to locate the group's new attempts. |

Choose the branch head for a branch run and the selected reachable commit for a commit run. For a commit in more than one branch, prefill an active containing branch and let the user select another containing branch. Refuse submission with a stale or missing target. Starter setup can be the first commit on an uninitialized default branch. If an existing injected config has no definition or its target head is missing, show the setup or unavailable state for that situation. Preserve an existing config file instead of silently replacing it. Only show a starter write if it can be applied with an explicit confirmation and valid head.

For a new run, create attempts in definition order. After a failed step mark later steps skipped. After an active step mark later steps pending. A run with a failed step is failed, with any active step is in progress, with all executable steps successful is successful, and otherwise is pending. For an active run, use a null finish time and duration. For fixture completion or an explicit retry sample `now` for the action and use fixture duration for the displayed build time. Calculate total duration as the sum of completed attempt durations. On Stop use the elapsed duration from the frozen clock for interrupted attempts, clamped to zero minimum, and record the stopping actor and time on the run and affected attempts. An active fixture remains active until stopped. Buttons that depend on pipelines being enabled validate that setting at submission.

Failed-step retry appends attempts for each currently failed step, uses that step's retry fixture, and recalculates run status from the latest attempts. Prior attempts retain all fields. The run can finish successfully after failed steps pass even if it contains skipped steps. Its log view keeps the prior output. Whole rerun uses the original definition snapshot and builds a fresh run with fresh attempts, leaving the original build untouched. A run can outlive a renamed/closed branch or a deleted definition because it retains its original target and definition display values. When an injected run lacks a required snapshot for rerun, render results with available values and explain that rerun is unavailable.

## Observable state changes

Use these field names in `SCHEMA.md` and validate them at `/go?sid=…`. Each row represents one full-state save after a successful action. Navigation, filters, previews, expand/collapse, drafts, loading, invalid actions, cancellation and idle time are read-only.

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

## Fixture coverage

- Northstar Engineering contains Platform, Customer Experience, Data and Developer Tools. A second workspace, Pinecone Labs, contains Research and Infrastructure. Include mostly private repositories and a handful of public utilities. Use names such as `atlas-api`, `dockyard-web`, `ledger-reconciliation` and `event-ingest` with readable English descriptions.
- In `atlas-api`, seed at least 8 branches, 20 commits, 16 PRs and 24 pipelines drawn from the totals above. Use realistic work such as CSV export formatting, cache behavior and documenting retry limits. Include `main`, `develop`, `feature/retry-budget` and `release/2026-11`, a nested text path with a reviewable change, a known good merge and a file-level conflict.
- Seed Riley Chen as the active user and reviewer alongside Maya Patel, Oliver Grant and Zoe Fernández. Include Riley-authored open PRs and open PRs assigned to Riley that permit requesting changes and approving. Include both configured merge checks and repos with no required checks. Seed separate eligible, blocked and declined scenarios. Each closed PR has captured head IDs.
- Provide a failed `Build and test` with a retryable Unit tests step, a successful pipeline, an active stoppable `Release check`, an unconfigured repo and a configured but disabled repo. Give active, failed and completed builds distinct log text. One custom definition accepts `REGION` with the allowed values above. Add compact log bodies for dozens of runs to exercise both filters and run detail.
- Use fixed timestamps across several weeks and English text throughout. Keep comments, logs and source deltas compact so session writes stay manageable. Render zero, one and hundreds of injected rows in each main list and tolerate absent optional fields and broken references before implementation sign-off.
