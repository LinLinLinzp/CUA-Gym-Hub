# mongodb_atlas_mock Schema

**Base URL** `http://localhost:5487/`  
**Go Endpoint** `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject** `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset** `POST /post?sid=<sid>` with body `{"action":"reset"}` restores the stored baseline.

`GET /state?sid=<sid>` returns `{stored_state, has_custom_state, sid}`. Injected collections replace the seeded collections wholesale. Mutations preserve unrelated collections, keys, and record fields.

## State Schema

| Key | Type | Record shape |
| --- | --- | --- |
| `organization` | Object | `{id, name}` |
| `account` | Object | `{id, name, email, organizationId, defaultProjectId}` |
| `organizationMembers` | Array | `{id, organizationId, name, email}` |
| `projects` | Array | `{id, organizationId, name}` |
| `clusters` | Array | Common fields, plus `name`, `provider` (`AWS`, `GCP`, `AZURE`), `region`, `tier` (`M0`, `FLEX`, or dedicated M tier), `mongoVersion`, `diskSizeGB` (number or null), `backupEnabled`, `terminationProtection`, optional `terminatedAt`. Status is `active`, `paused` or `terminated`. |
| `databaseUsers` | Array | Common fields, plus `username`, `authMethod: "SCRAM"`, `authDatabase: "admin"`, `roles: [{roleName, databaseName, collectionName?}]`, `clusterIds` (array of cluster IDs or null for all project clusters), `expiresAt` (ISO UTC string or null), optional `deletedAt`. Status is `active` or `deleted`. |
| `projectUsers` | Array | Common fields, plus lowercase `email`, optional `name`, `roles` (array of role IDs), optional `invitedAt`, `expiresAt`, and `removedAt`. Status is `active`, `pending` or `removed`. Project role IDs are `GROUP_READ_ONLY`, `GROUP_CLUSTER_MANAGER`, `GROUP_DATA_ACCESS_READ_ONLY`, and `GROUP_OWNER`. |
| `ipAccessList` | Array | Common fields, plus `address` (IPv4 host or CIDR), `comment`, `expiresAt` (ISO UTC string or null), optional `deletedAt`. Status is `active` or `deleted`. |
| `activityLog` | Array | `{id, projectId, actorId, entityType, entityId, action, status: "completed", createdAt, changes}`. Entity types are `cluster`, `database_user`, `project_user`, and `ip_access`. `changes` maps each changed field to `{before, after}` with null for an absent previous value. Creation events include the whole new record. |

Common fields are `id`, `projectId`, `status`, `createdAt`, `createdBy`, `updatedAt`, and `updatedBy`. Timestamps are ISO UTC strings and actor fields reference `account.id`. Business records retain their IDs and original creation metadata on updates. An event omits unchanged fields such as `updatedBy` if the actor remains the same.

### Default IDs

- Organization `org_signal` and signed-in account `acct_avery`.
- Projects `proj_commerce` (default), `proj_lab`, and `proj_reliability`.
- Entity IDs use a two-digit sequence within each project. Default Commerce ranges are `cl_commerce_01`–`cl_commerce_24`, `dbu_commerce_01`–`dbu_commerce_30`, `pu_commerce_01`–`pu_commerce_26`, and `ip_commerce_01`–`ip_commerce_30`. Lab and Reliability IDs use their project suffixes.
- Baseline event IDs are `evt_commerce_01`, `evt_lab_01`, and `evt_reliability_01`. Sample organization member IDs are `orgmem_avery` and `orgmem_taylor`.

## Minimal Inject Example

```json
{
  "action": "set",
  "state": {
    "projects": [{ "id": "proj_commerce", "name": "Commerce Platform" }],
    "organizationMembers": [],
    "clusters": [],
    "databaseUsers": [],
    "projectUsers": [],
    "ipAccessList": [],
    "activityLog": []
  }
}
```

## Observable State Changes (for LLM evaluation)

Each confirmed mutation changes its entity and appends exactly one event in the same whole-state save. Every insertion writes the common fields. Every update refreshes `updatedAt` and `updatedBy` and keeps the original row. Deletion and termination retain a historical row and remove it from the applicable inventory.

| UI action | Entity writes beyond common metadata | Activity action |
| --- | --- | --- |
| Deploy cluster | Append `clusters[]` with `name, provider, region, tier, mongoVersion, diskSizeGB, backupEnabled, terminationProtection, status: "active"` | `cluster.created` |
| Apply configuration | Change the submitted `tier, diskSizeGB, backupEnabled, terminationProtection` fields where supported | `cluster.updated` |
| Pause cluster | `status: "paused"` | `cluster.paused` |
| Resume cluster | `status: "active"` | `cluster.resumed` |
| Terminate cluster | `status: "terminated", terminatedAt` | `cluster.terminated` |
| Add database user | Append `databaseUsers[]` with `username, authMethod, authDatabase, roles, clusterIds, expiresAt, status: "active"` | `database_user.created` |
| Edit database user | Change submitted `roles, clusterIds, expiresAt` | `database_user.updated` |
| Delete database user | `status: "deleted", deletedAt` | `database_user.deleted` |
| Grant internal project access | Append `projectUsers[]` with `email, roles, status: "active"` and the roster `name` when present | `project_user.granted` |
| Invite external address | Append `projectUsers[]` with `email, roles, status: "pending", invitedAt, expiresAt` | `project_user.invited` |
| Save project roles | `roles` | `project_user.roles_updated` |
| Remove a project member | `status: "removed", removedAt` | `project_user.removed` |
| Cancel a project invitation | `status: "removed", removedAt` | `project_user.invite_cancelled` |
| Add IP address | Append `ipAccessList[]` with `address, comment, expiresAt, status: "active"` | `ip_access.created` |
| Edit IP access | Change submitted `address, comment, expiresAt` | `ip_access.updated` |
| Delete IP entry | `status: "deleted", deletedAt` | `ip_access.deleted` |

Network CIDRs are canonicalized for new or changed addresses. The duplicate check treats a host and its `/32` as the same address. Temporary grants use the save timestamp plus 6 hours, 1 day, or 1 week. External invitations expire after 30 days. Database and network status labels derive expiry from the browser clock. Database credential text lives only in the open form and is absent from both entity and activity records.

An existing database user can keep historical cluster references when editing other fields. Changing the cluster restriction requires at least one available cluster, or the user can switch to all project clusters.

Project selection, sorting, search, pagination, navigation, validation, cancellation, no-op edits, and idle pages issue no mutation. A fresh browser session loads and merges its baseline through the Harbor template.
