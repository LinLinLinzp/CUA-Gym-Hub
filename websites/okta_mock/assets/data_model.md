# Harbor state model

`createInitialData()` returns the seven top-level keys below. All IDs and timestamps are strings. Seed IDs and dates are fixed. New records receive stable IDs at submit time and an ISO timestamp from `new Date().toISOString()`. The actor is the workspace administrator ID, with a safe default when injected state omits administrator details. Array defaults can be replaced completely by an injected world.

| Key | Type and fields | Example |
| --- | --- | --- |
| `workspace` | Object with `name` and `admin` (`id`, `name`, `email`, `role`), all strings | `Acme Workspace`, `admin-001`, `Morgan Ellis`, `morgan.ellis@acme.example`, `Organization Administrator` |
| `users` | Array of `id`, `firstName`, `lastName`, `username`, `email`, optional `secondaryEmail`, `department`, `title`, `status`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`. Status is `ACTIVE`, `STAGED`, `SUSPENDED` or `DEACTIVATED` | `usr-001`, `Avery`, `Chen`, `avery.chen@acme.example`, `avery.chen@acme.example`, `avery.backup@example.org`, `Engineering`, `Platform Engineer`, `ACTIVE`, `2026-07-15T13:00:00.000Z`, `admin-001` |
| `groups` | Array of `id`, `name`, optional `description`, `source`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`. Source is `OKTA` or `DIRECTORY` | `grp-001`, `Platform Engineering`, `Platform infrastructure team`, `OKTA`, `2026-07-15T13:00:00.000Z`, `admin-001` |
| `applications` | Array of `id`, `name`, `category`, optional `description`, `status`, `createdAt`, `createdBy`. Status is `ACTIVE` or `INACTIVE` | `app-001`, `Engineering Wiki`, `Productivity`, `Engineering documentation`, `ACTIVE`, `2026-07-15T13:00:00.000Z`, `admin-001` |
| `groupMemberships` | Array of `id`, `groupId`, `userId`, `status` (`ACTIVE`), `createdAt`, `createdBy` | `mem-001`, `grp-001`, `usr-001`, `ACTIVE`, `2026-07-15T13:00:00.000Z`, `admin-001` |
| `appAssignments` | Array of `id`, `appId`, `principalType` (`USER` or `GROUP`), `principalId`, optional `appUsername`, `status` (`ACTIVE`), `createdAt`, `createdBy` | `asg-001`, `app-001`, `GROUP`, `grp-001`, `ACTIVE`, `2026-07-15T13:00:00.000Z`, `admin-001` |
| `activityEvents` | Array of `id`, `action`, `targetType`, `targetId`, `actorId`, `createdAt`, and `details` object. `details` carries relationship IDs, status changes, edited fields or removed IDs where relevant | `evt-001`, `APP_ASSIGNED`, `APP_ASSIGNMENT`, `asg-001`, `admin-001`, `2026-08-03T14:20:00.000Z`, `{ "appId": "app-001", "principalType": "GROUP", "principalId": "grp-001" }` |

## Relationships and write rules

- A membership joins one user to one group by `userId` and `groupId`. Its pair is unique. Add and remove append `GROUP_MEMBER_ADDED` and `GROUP_MEMBER_REMOVED` events targeting the membership ID, with `groupId` and `userId` in `details`.
- A grant joins an app to a principal by `appId`, `principalType` and `principalId`. The triple is unique. An `appUsername` may be recorded for a `USER` assignment and defaults to the selected user's username. Assign and unassign append `APP_ASSIGNED` and `APP_UNASSIGNED` events with target type `APP_ASSIGNMENT` and the app/principal tuple in `details`.
- Recompute displayed access sources from active grants and membership records. A single person can have a direct grant and multiple group sources. Show one row per person per app with all source labels. Lifecycle status gates usable access in this sandbox. Preserve links on status changes so admins can review them. An inactive app and a non-active user cannot receive new direct grants. Application details may still display recorded assignments and associated statuses.
- Person and group saves record `USER_CREATED`, `USER_UPDATED`, `USER_STATUS_CHANGED`, `USER_DELETED`, `GROUP_CREATED`, `GROUP_UPDATED` and `GROUP_DELETED` as applicable. Events target `USER` or `GROUP`. Include `changedFields` (array of field names) for edits and `previousStatus` and `status` for state transitions. Activation moves `STAGED` or `DEACTIVATED` to `ACTIVE`. Suspend moves `ACTIVE` to `SUSPENDED`. Unsuspend moves `SUSPENDED` to `ACTIVE`. Deactivate moves `ACTIVE`, `STAGED` or `SUSPENDED` to `DEACTIVATED`.
- User deletion removes that person's memberships and direct grants. Group deletion removes that group's memberships and grants. Put the arrays `removedMembershipIds` and `removedAssignmentIds` on the relevant deletion event's `details`. Keep historical events. Perform the cascade and write the deletion event in one snapshot with the target ID, actor, time and `previousStatus` for a user deletion.
- Treat `DIRECTORY` groups as view-only for group attributes and membership, while allowing them as app assignment targets. New groups are `OKTA` groups. Render missing optional metadata or unavailable related records safely without writing fallback values into state. Preserve fields outside the mutation's scope.

## Seed fixtures

- 48 people with varied departments and titles and examples in all four statuses. Include `usr-001` Avery Chen (Active), `usr-002` Jordan Rivera (Staged), `usr-003` Samira Patel (Suspended) and `usr-004` Riley Morgan (Deactivated). Use reserved `.example` addresses.
- 30 groups consisting of teams and project cohorts, a mix of sources and a few empty groups. Use `grp-001` Platform Engineering and `grp-002` Release Coordinators as two groups Avery belongs to.
- 32 apps spanning Productivity, Engineering, Finance, HR and IT, with active and inactive records and some apps without grants. Use synthetic integration names such as Engineering Wiki, Expense Desk and Service Queue.
- Roughly 110 memberships and 90 grants with deterministic ID sequences and valid links. Give `app-001` to both groups above and directly to Avery so removing a single source can be inspected in the UI and `/go`. Start `activityEvents` empty.

```js
export function createInitialData() {
  return {
    workspace: { name: 'Acme Workspace', admin: { id: 'admin-001', name: 'Morgan Ellis', email: 'morgan.ellis@acme.example', role: 'Organization Administrator' } },
    users: buildSeedUsers(),
    groups: buildSeedGroups(),
    applications: buildSeedApplications(),
    groupMemberships: buildSeedMemberships(),
    appAssignments: buildSeedAssignments(),
    activityEvents: [],
  }
}
```
