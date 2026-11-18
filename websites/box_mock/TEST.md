# Box Mock — Test Report

> Round: 2
> Date: 2026-11-18
> Server: http://localhost:5393
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Result |
| --- | --- |
| Seed workflows passed | 4 of 4 |
| App routes exercised | 8, including the localhost file alias |
| Audit regressions passed | 4 of 4 |
| Browser errors and outbound requests | 0 during the acceptance run |
| Build and local browser runs | Passed on Vite dev and built Vite preview |

## ✅ Passing Tests

| Workflow | Chromium checks | Fields verified through `/go?sid=` |
| --- | --- | --- |
| Folders | Browsed folders and files, changed filters and sort, searched by mixed-case name, checked paths and history, and used direct links and reloads. Validated creation with an optional invite, renamed, moved, trashed, restored, and restored to an alternate destination when the original parent was trashed. Confirmed trashed descendants were unavailable. | `folders[]` creation metadata, `parentId`, `name`, `description`, `ownerId`, `status`, `trashedById`, `trashedAt`, and update metadata. Optional invite appended to `collaborations[]`. Move and relocated restore appended `retentionAssignments[]` with `kind=carried`, the new covered `folderId`, `policyId`, and `sourceAssignmentId`. |
| Collaborators | Saw owner and inherited access with its source. Selected a directory suggestion, normalized typed email, rejected a duplicate without partial writes, saved active and pending invitations together, changed a direct role, removed the grant, and reloaded. | `collaborations[]` creation metadata, `folderId`, `userId`, `inviteeEmail`, `role`, `message`, and `status`. Role change wrote `role` and update metadata. Removal wrote `status=removed`, `removedById`, `removedAt`, and update metadata. |
| Tasks | Created general and approval tasks in Activity, edited assignees and the rule, verified due date and preview navigation in Task Center, recorded all three decision types across Activity and Task Center, and deleted an undecided task. Any-assignee approval and completion closed their tasks. Any-assignee rejection and All-assignees completion left the task open with another pending assignee. All-assignees rejection closed the task. | `tasks[]` creation metadata, `fileId`, `type`, `message`, `dueDate`, `completionRule`, `status`, `resolvedById`, `resolvedAt`, `deletedById`, `deletedAt`, and update metadata. `taskAssignments[]` creation metadata, `taskId`, `assigneeId`, `status`, `decidedById`, `decidedAt`, `removedById`, `removedAt`, and update metadata. Continuing assignees kept their assignment IDs. |
| Retention | Searched and filtered policies, validated custom duration, went back from review, canceled, started a policy, inspected inherited coverage, blocked duplicate direct selection, added a folder, edited duration and disposition, removed direct and linked carried coverage, and retired a policy. Reloaded the history. A non-modifiable policy rejected shortening and accepted extension. An indefinite policy displayed Keep. | `retentionPolicies[]` creation metadata, `name`, `description`, `type`, `scope`, `duration.value`, `duration.unit`, `startBasis`, `disposition`, `status`, `activatedById`, `activatedAt`, `retiredById`, `retiredAt`, and update metadata. `retentionAssignments[]` creation metadata, `policyId`, `folderId`, `kind`, `sourceAssignmentId`, `status`, `removedById`, `removedAt`, and update metadata. |

Creation metadata is `id`, `createdById`, `createdAt`, `updatedById`, and `updatedAt`. Update metadata is `updatedById` and `updatedAt`. [SCHEMA.md](SCHEMA.md) lists the initial null fields and the exact writes for each action.

### Harbor and build checks

- The six changed arrays matched the full `modified` values in `state_diff`. Each successful mutation sent one whole-state `set_current`. Validation, review, cancellation, navigation, filtering, and idle time sent no business writes.
- Independent sessions retained distinct state. Empty and sparse worlds rendered, a sparse update preserved injected extension fields, and a 520-folder world remained searchable. The documented minimal injection supported creation through Chromium with the injected actor and reset to its original baseline.
- `/preview/:fileId` and the localhost `/files/:fileId` alias loaded directly. `npm run build` passed. The data manager matched the repository template by SHA-256.

## ❌ Bugs for Dev Agent

No open P0 or P1 issues in the tested cases.

## Visual Alignment Feedback

Reviewed local screenshots of the workspace. At 320px the seeded views fit, with table metadata visible in the rows. At 390px an injected 184-character filename wrapped in the breadcrumb and document without horizontal scrolling. The screenshots use synthetic workspace data and local assets.

## Round History

### Round 1 → Round 2

- AUDIT-001 fixed. A finite disposition selection survived a switch to Indefinite and back. Indefinite displayed Keep.
- AUDIT-002 fixed. Owner, last modified, trash date, folder count, disposition, and coverage remained visible in mobile row details.
- AUDIT-003 fixed. Long filenames wrapped throughout the preview and its breadcrumb.
- AUDIT-004 fixed. Folder-name validation appeared directly beneath its field with an accessible association. Correcting the input cleared the error. Escape returned focus to the trigger.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `136696`. The local evidence is `factory/build/dyn_certify/136696/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `users → 0 → name`.
