# box_mock Schema

**Base URL** `http://localhost:5393/`  
**Go Endpoint** `GET /go?sid=<sid>` returns `{initial_state, current_state, state_diff}`.  
**Inject** `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`.  
**Reset** `POST /post?sid=<sid>` with body `{"action":"reset"}` restores the session baseline.

The Harbor endpoints are session-scoped. Read the stored workspace at `GET /state?sid=<sid>`. A `state_diff` entry for a changed array contains its full current value under `modified`.

## State Schema

All domain arrays except `users` use the common fields `id`, `createdById`, `createdAt`, `updatedById`, and `updatedAt`. IDs and timestamps are strings. Actor IDs reference `users[].id`, and runtime timestamps are UTC ISO strings. New records use the same actor and time for creation and update. Optional values are nullable unless specified otherwise.

| Top-level key | Shape and additional fields |
| --- | --- |
| `account` | Object with `currentUserId`, `workspaceName`, and boolean `canManageRetention`. |
| `users` | Array with `id`, `name`, `email`, and optional `department`. |
| `folders` | Array with `parentId` (null at root), `name`, `description`, `ownerId`, `status` (`active`, `trashed`), `trashedAt`, and `trashedById`. |
| `files` | Array with `folderId` (null at root), `name`, `mimeType`, `previewText`, optional `previewRows` (a two-column string array), `ownerId`, and integer `sizeBytes`. |
| `collaborations` | Array with `folderId`, `userId` (null for external recipients), normalized `inviteeEmail`, `role` (`co_owner`, `editor`, `viewer_uploader`, `previewer_uploader`, `viewer`, `previewer`, `uploader`), `message`, `status` (`active`, `pending`, `removed`), `removedAt`, and `removedById`. |
| `tasks` | Array with `fileId`, `type` (`general`, `approval`), `message`, `dueDate` (date-only YYYY-MM-DD or null), `completionRule` (`all`, `any`), `status` (`open`, `completed`, `approved`, `rejected`, `deleted`), `resolvedAt`, `resolvedById`, `deletedAt`, and `deletedById`. |
| `taskAssignments` | Array with `taskId`, `assigneeId`, `status` (`pending`, `completed`, `approved`, `rejected`, `removed`), `decidedAt`, `decidedById`, `removedAt`, and `removedById`. |
| `retentionPolicies` | Array with `name`, `description`, `type` (`modifiable`, `non_modifiable`), `scope` (`folders`), `duration` ({integer or null `value`, `unit` of `days`, `years`, or `indefinite`}), `startBasis` (`content_created_at`), `disposition` (`keep`, `permanently_delete`), `status` (`active`, `retired`), `activatedAt`, `activatedById`, `retiredAt`, and `retiredById`. |
| `retentionAssignments` | Array with `policyId`, `folderId`, `kind` (`direct`, `carried`), `sourceAssignmentId` (null for direct), `status` (`active`, `removed`), `removedAt`, and `removedById`. |

Unknown injected top-level and record fields survive business updates. Access and coverage inheritance follow the current folder ancestry. Effective folder and file visibility is derived from the folder path. Trashing one folder leaves descendant records intact. Overdue presentation is derived from the runtime date and open task status.

### Default IDs

| Record | Seed IDs |
| --- | --- |
| Users | `user-morgan` (current account), `user-leah`, `user-daniel` |
| Folders | `folder-client-operations`, `folder-vendor-onboarding`, `folder-due-diligence`, `folder-finance`, `folder-legacy-archives` (trashed) |
| File | `file-vendor-intake-checklist` |
| Collaborations | `collab-vendor-leah`, `collab-client-daniel`, `collab-vendor-pending` |
| Tasks | `task-vendor-checklist`, `task-vendor-approval`, `task-vendor-review` |
| Task assignments | `task-assignment-1-1`, `task-assignment-1-2` |
| Retention policies | `policy-vendor-records`, `policy-client-operations-archive`, `policy-corporate-charter` |
| Retention assignments | `retention-assignment-1-1`, `retention-assignment-2-1` |

## Minimal Inject Example

Use this object as the `state` in a `set` request for a fresh session. The session starts with an empty file view and an account that can create a folder.

```json
{
  "account": {
    "currentUserId": "user-audit",
    "workspaceName": "Northline Studio",
    "canManageRetention": true
  },
  "users": [{"id": "user-audit", "name": "Avery Reed", "email": "avery.reed@example.test"}],
  "folders": [],
  "files": [],
  "collaborations": [],
  "tasks": [],
  "taskAssignments": [],
  "retentionPolicies": [],
  "retentionAssignments": []
}
```

## Observable State Changes (for LLM evaluation)

“Creation metadata” refers to the five common fields above. “Update metadata” refers to `updatedById` and `updatedAt`.

| Successful action | Exact writes |
| --- | --- |
| Create folder | Appends a `folders` record with creation metadata, `parentId`, `name`, `description`, `ownerId`, `status=active`, and null `trashedAt` and `trashedById`. Optional collaborators use the invitation writes below in the same transaction. |
| Rename folder | Updates `folders[].name` and update metadata on the selected folder. |
| Move folder | Updates `folders[].parentId` and update metadata on the selected folder. Appends carried assignments when the folder would lose policy coverage, using the fields in the carry coverage row below. |
| Trash folder | Updates `folders[].status=trashed`, `trashedAt`, `trashedById`, and update metadata on the selected folder. |
| Restore folder | Updates `folders[].status=active`, clears `trashedAt` and `trashedById` to null, and updates metadata. With a new destination, also updates `parentId` and appends applicable carried assignments using the fields below. |
| Invite people | Appends one `collaborations` record per distinct recipient with creation metadata, `folderId`, `userId`, `inviteeEmail`, `role`, `message`, `status` (active for directory users, pending otherwise), and null `removedAt` and `removedById`. |
| Change collaborator role | Updates `collaborations[].role` and update metadata on the direct grant. |
| Remove collaborator | Updates `collaborations[].status=removed`, `removedAt`, `removedById`, and update metadata. |
| Create task | Appends a `tasks` record with creation metadata, `fileId`, `type`, `message`, `completionRule`, `dueDate`, `status=open`, and null `resolvedAt`, `resolvedById`, `deletedAt`, `deletedById`. Appends one `taskAssignments` record per assignee with creation metadata, `taskId`, `assigneeId`, `status=pending`, and null `decidedAt`, `decidedById`, `removedAt`, `removedById`. |
| Edit task | Writes `tasks[].fileId`, `type`, `message`, `completionRule`, `dueDate`, and update metadata. Appends pending records for new assignees. For omitted pending assignees, sets `taskAssignments[].status=removed`, `removedAt`, `removedById`, and update metadata. Preserves continuing assignment IDs. |
| Delete task | Sets `tasks[].status=deleted`, `deletedAt`, `deletedById`, and update metadata. Marks pending assignments removed with the same fields as removal during edit. |
| Mark complete, approve, or reject | Sets the actor’s `taskAssignments[].status` to `completed`, `approved`, or `rejected`, and writes `decidedAt`, `decidedById`, and update metadata. Writes `tasks[].status` and update metadata, adding `resolvedAt` and `resolvedById` when the task closes. |
| Start policy | Appends a `retentionPolicies` record with creation metadata, `name`, `description`, `type`, `scope`, `duration`, `startBasis`, `disposition`, `status=active`, `activatedAt`, `activatedById`, and null `retiredAt` and `retiredById`. Appends direct assignment records for the selected folders with the same fields as Add folders to policy. |
| Add folders to policy | Appends one `retentionAssignments` record per new direct pair with creation metadata, `policyId`, `folderId`, `kind=direct`, `sourceAssignmentId=null`, `status=active`, and null `removedAt` and `removedById`. |
| Carry coverage on move or relocated restore | Appends one `retentionAssignments` record per otherwise lost policy with the same fields as a direct assignment, `kind=carried`, and `sourceAssignmentId` linking to its original assignment. `folderId` identifies the relocated folder. |
| Remove folder coverage | Sets the selected direct `retentionAssignments[].status=removed`, `removedAt`, `removedById`, and update metadata. Applies the same patch to active carried records linked through that source. |
| Edit policy | Updates `retentionPolicies[].description`, `duration`, `disposition`, and update metadata. |
| Retire policy | Updates `retentionPolicies[].status=retired`, `retiredAt`, `retiredById`, and update metadata. Assignment history remains visible. |

Navigation, filtering, previewing, validation failures, policy review, and cancellation make no business writes.

