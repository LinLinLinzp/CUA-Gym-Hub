# docker_hub_mock Schema

- **Base URL** `http://localhost:5494/`
- **Go Endpoint** `GET /go?sid=<sid>` returns `initial_state`, `current_state`, and `state_diff`.
- **Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`. Open the app with the same `sid` in a fresh browser context to load the injected state. `GET /state?sid=<sid>` returns `stored_state`, `has_custom_state`, and `sid`.
- **Reset** `POST /post?sid=<sid>` with `{"action":"reset"}` restores the server’s current state from its initial snapshot, or from the default seed when no initial snapshot exists.

The paths below refer to `current_state`. Link records by ID. Names can be reused after deletion and each new record gets a new ID.

## State Schema

| Top-level key | Shape |
| --- | --- |
| `account` | Object with `userId` referencing the signed-in user and `defaultNamespaceId` referencing the default namespace. |
| `namespaces[]` | `id`, `slug`, `name`, `type` (`organization` or `personal`). Repository URLs use the namespace slug. |
| `users[]` | `id`, `username` (Docker ID), `displayName`, `email`. |
| `organizationMembers[]` | `id`, `namespaceId`, `userId`, `role` (`owner`, `editor`, or `member`). |
| `repositories[]` | `id`, `namespaceId`, `name`, `description`, `overview`, `visibility` (`public` or `private`), numeric `pullCount`, lifecycle fields. |
| `tags[]` | `id`, `repositoryId`, `name`, optional `digest`, `platforms[]`, and numeric `sizeBytes`, ISO `pushedAt`, boolean `immutable`, optional `sourceTagId`, lifecycle fields. Each platform has `os`, `architecture`, optional `variant`, and optional numeric `sizeBytes`. |
| `teams[]` | `id`, `namespaceId`, `name`, `description`, lifecycle fields. |
| `teamMemberships[]` | `id`, `teamId`, `userId`, lifecycle fields. |
| `repositoryPermissions[]` | `id`, `repositoryId`, `teamId`, `permission` (`read_only`, `read_write`, or `admin`), lifecycle fields. |
| `activity[]` | `id`, `type`, `actorId`, ISO `createdAt`, `targets` mapping collection names to arrays of affected IDs, and optional `changes` mapping edited fields to `{ before, after }`. |

Lifecycle fields are `status` (`active` or `deleted`), ISO `createdAt` and `updatedAt`, and actor IDs `createdBy` and `updatedBy`. Deletion adds `deletedAt` and `deletedBy`. Within an action, actor IDs come from `account.userId` and all timestamps share one clock reading. Missing status in an injected record is read as active. Unrecognized fields in injected state survive user actions.

### Default IDs

| Record | ID | Related records |
| --- | --- | --- |
| Signed-in user | `usr-avery` | `om-northstar-avery` is the owner's organization membership. |
| Organization namespace | `ns-northstar` | Slug `northstar-platform`, the account default. |
| Personal namespace | `ns-avery` | Slug `averychen`. |
| Repository | `repo-edge-router` | `northstar-platform/edge-router` |
| Tags | `tag-edge-latest`, `tag-edge-stable`, `tag-edge-2.8.0` | Same image digest. `2.8.0` is immutable. |
| Team | `team-release-engineering` | `tm-release-avery` links the owner to the team. `rp-edge-release` grants that team `read_write` on `repo-edge-router`. |

## Minimal Inject Example

Use this object as `state` in a `set` request. Arrays supplied here replace the seed arrays.

```json
{
  "account": { "userId": "usr-example", "defaultNamespaceId": "ns-example" },
  "namespaces": [{ "id": "ns-example", "slug": "example-labs", "name": "Example Labs", "type": "organization" }],
  "users": [{ "id": "usr-example", "username": "samcooper", "displayName": "Sam Cooper" }],
  "organizationMembers": [],
  "repositories": [{ "id": "repo-example", "namespaceId": "ns-example", "name": "release-tools" }],
  "tags": [],
  "teams": [],
  "teamMemberships": [],
  "repositoryPermissions": [],
  "activity": []
}
```

Open `/repositories/example-labs/release-tools/general?sid=<sid>` to view the injected repository.

## Observable State Changes

Each successful action appends one `activity[]` record and sends one whole-state write. Update metadata means `updatedAt` and `updatedBy`. Deletion metadata means `status: "deleted"`, `deletedAt`, `deletedBy`, and update metadata. Created records receive their ID and all active lifecycle fields.

| User action | Written fields | Activity type and target collections |
| --- | --- | --- |
| Create repository | Append `repositories[]` with `namespaceId`, `name`, `description`, `visibility`, `overview: ""`, `pullCount: 0`, and active lifecycle fields. | `repository.created` · `repositories` |
| Edit repository information | `repositories[].description`, `overview`, update metadata. | `repository.updated` · `repositories`, with changed fields |
| Change visibility | `repositories[].visibility` and update metadata. | `repository.visibility_changed` · `repositories`, with visibility before and after |
| Delete repository | Deletion metadata on the repository and all its active `tags[]` and `repositoryPermissions[]`. | `repository.deleted` · `repositories`, `tags`, `repositoryPermissions` |
| Add tag from image | Append `tags[]` with `repositoryId`, `name`, `sourceTagId`, copied available `digest`, `platforms`, `sizeBytes`, `pushedAt`, `immutable: false`, and active lifecycle fields. Stamp repository update metadata. | `tag.created` · `repositories`, `tags` |
| Delete selected tags | Deletion metadata on selected mutable `tags[]`. Stamp repository update metadata. | `tag.deleted` · `repositories`, `tags` |
| Create team | Append `teams[]` with `namespaceId`, `name`, `description`, and active lifecycle fields. | `team.created` · `teams` |
| Edit team | `teams[].description` and update metadata. | `team.updated` · `teams`, with description before and after |
| Add team member | Append `teamMemberships[]` with `teamId`, `userId`, and active lifecycle fields. Stamp team update metadata. | `team.member_added` · `teams`, `teamMemberships`, `users` |
| Remove team member | Deletion metadata on the active `teamMemberships[]` record. Stamp team update metadata. | `team.member_removed` · `teams`, `teamMemberships`, `users` |
| Grant access | Append `repositoryPermissions[]` with `repositoryId`, `teamId`, `permission`, and active lifecycle fields. Stamp repository update metadata. | `repository.permission_granted` · `repositories`, `repositoryPermissions`, `teams` |
| Edit permission | `repositoryPermissions[].permission` and update metadata. Stamp repository update metadata. | `repository.permission_updated` · `repositories`, `repositoryPermissions`, `teams`, with permission before and after |
| Revoke access | Deletion metadata on the active `repositoryPermissions[]` record. Stamp repository update metadata. | `repository.permission_revoked` · `repositories`, `repositoryPermissions`, `teams` |
| Delete team | Deletion metadata on the team and all its active `teamMemberships[]` and `repositoryPermissions[]`. | `team.deleted` · `teams`, `teamMemberships`, `repositoryPermissions` |

Reads, copy actions, validation failures, canceled confirmations and unchanged saves produce zero writes after the baseline. The UI derives tag, member, and access counts from active records.

