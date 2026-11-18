# okta_mock Schema

**Base URL** `http://localhost:5410/`  
**Go endpoint** `GET /go?sid=<sid>` returns `{initial_state, current_state, state_diff}`.  
**Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`.  
**Reset** `POST /post?sid=<sid>` with `{"action":"reset"}` restores the current state to its baseline.

## State Schema

The diff maps changed top-level keys to `{ modified: value }` or `{ added: value }`. `GET /state?sid=<sid>` returns `stored_state`, `has_custom_state` and `sid`. Object fields in injected state merge over defaults and arrays replace defaults. Use a fresh session ID to load an injected world.

| Key | Type | Record shape |
| --- | --- | --- |
| `workspace` | object | `{ name, admin: { id, name, email, role } }`. The fallback write actor ID is `admin-001`. |
| `users` | array | `{ id, firstName, lastName, username, email, secondaryEmail?, department?, title?, status, createdAt, createdBy, updatedAt, updatedBy }`. Status is `ACTIVE`, `STAGED`, `SUSPENDED` or `DEACTIVATED`. |
| `groups` | array | `{ id, name, description?, source, createdAt, createdBy, updatedAt, updatedBy }`. Source is `OKTA` or `DIRECTORY`. |
| `applications` | array | `{ id, name, category, description?, status, createdAt, createdBy }`. Status is `ACTIVE` or `INACTIVE`. |
| `groupMemberships` | array | `{ id, groupId, userId, status, createdAt, createdBy }`. New rows have status `ACTIVE`. The add action enforces uniqueness by group and user ID. |
| `appAssignments` | array | `{ id, appId, principalType, principalId, appUsername?, status, createdAt, createdBy }`. New rows have status `ACTIVE`. Principal type is `USER` or `GROUP`. The assign action enforces uniqueness by app, type and principal ID. |
| `activityEvents` | array | `{ id, action, targetType, targetId, actorId, createdAt, details }`. Target type is `USER`, `GROUP`, `GROUP_MEMBERSHIP` or `APP_ASSIGNMENT`. Empty in the default workspace. |

IDs, actor IDs and other scalar record fields are strings. Timestamps are ISO strings and `details` is an object. Fields marked with `?` may be omitted.

### Default IDs

| Entity | Seed IDs |
| --- | --- |
| Administrator | `admin-001` (Morgan Ellis) |
| Users | `usr-001` to `usr-048`. `usr-001` is Avery Chen. |
| Groups | `grp-001` to `grp-030`. `grp-001` is Platform Engineering and `grp-002` is Release Coordinators. |
| Applications | `app-001` to `app-032`. `app-001` is Engineering Wiki and `app-002` is Expense Desk. |
| Group memberships | `mem-001` to `mem-110` |
| Application assignments | `asg-001` to `asg-090` |

## Minimal Inject Example

```json
{
  "users": [],
  "groups": [],
  "applications": [],
  "groupMemberships": [],
  "appAssignments": [],
  "activityEvents": []
}
```

## Observable State Changes (for LLM evaluation)

Each successful submit sends one complete snapshot. The event uses the submitter's administrator ID and the same timestamp as the affected records. Batch adds append one event for each created relationship.

| User action | State change | Activity event action and details |
| --- | --- | --- |
| Add Person | Append the profile, initial `ACTIVE` or `STAGED` status, ID and create/update metadata to `users[]`. | `USER_CREATED` targets user ID with `status`. |
| Edit Profile | Update changed fields among `firstName`, `lastName`, `username`, `email`, `secondaryEmail`, `department`, `title` and set `updatedAt`, `updatedBy`. | `USER_UPDATED` targets user ID with `changedFields[]`. |
| Activate, Suspend, Unsuspend, Deactivate | Update `users[].status`, `updatedAt` and `updatedBy`. Activate takes staged or deactivated to active. Suspend takes active to suspended. Unsuspend takes suspended to active. Deactivate takes active, staged or suspended to deactivated. | `USER_STATUS_CHANGED` targets user ID with `previousStatus`, `status`. |
| Delete Person | Remove the deactivated user, their memberships and their direct app grants. | `USER_DELETED` targets user ID with `previousStatus`, `removedMembershipIds[]`, `removedAssignmentIds[]`. |
| Add Group | Append ID, `name`, `description`, `source: OKTA` and create/update metadata to `groups[]`. | `GROUP_CREATED` targets group ID with an empty `details` object. |
| Edit Group | Update changed `name` and/or `description` and set `updatedAt`, `updatedBy`. | `GROUP_UPDATED` targets group ID with `changedFields[]`. |
| Assign People or Assign to Groups | Append active membership rows with `id`, `groupId`, `userId`, `status`, `createdAt`, `createdBy`. | `GROUP_MEMBER_ADDED` targets membership ID with `groupId`, `userId`. |
| Remove Member | Remove the exact `groupMemberships[]` row. | `GROUP_MEMBER_REMOVED` targets membership ID with `groupId`, `userId`. |
| Delete Group | Remove the group, its memberships and its group app grants. | `GROUP_DELETED` targets group ID with `removedMembershipIds[]`, `removedAssignmentIds[]`. |
| Assign Application | Append active grant rows with `id`, `appId`, `principalType`, `principalId`, `status`, `createdAt`, `createdBy` and `appUsername` when a directly assigned user has a directory username. | `APP_ASSIGNED` targets assignment ID with `appId`, `principalType`, `principalId`, `assignmentId`. |
| Unassign Application | Remove the exact `appAssignments[]` row. | `APP_UNASSIGNED` targets assignment ID with `appId`, `principalType`, `principalId`, `assignmentId`. |
| Save and Add Another | Applies the same Add Person or Add Group write and reopens a blank form. | Same event as Add Person or Add Group. |

Directory-sourced group profiles and memberships are read-only. Directory groups can receive application grants. New direct user grants require an active person and active application. New group grants require an active application. Person status changes preserve relationship records. The UI derives access from active memberships and active grants, displays all direct and group sources, and marks access unavailable when the person or app is inactive. Removing one path preserves other paths. Deletion preserves historical activity events. Search, filters, paging, routing, form input and notices are UI state.

