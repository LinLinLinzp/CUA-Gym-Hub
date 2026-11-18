# MongoDB Atlas — proposed Harbor state

`createInitialData()` returns a fresh JSON-compatible object on each call. Generate seeds deterministically from fixed literal arrays and dates. Use ISO UTC strings for timestamps, numbers for disk sizes and explicit string ids for relationships.

## Top-level keys

| Key | Type | Example and relationship |
| --- | --- | --- |
| `organization` | object | `{id:"org_signal", name:"Signal Harbor"}` |
| `account` | object | `{id:"acct_avery", name:"Avery Chen", email:"avery@signalharbor.example", organizationId:"org_signal", defaultProjectId:"proj_commerce"}` |
| `organizationMembers` | object array | `{id:"orgmem_taylor", organizationId:"org_signal", email:"taylor@signalharbor.example", name:"Taylor Quinn"}`. Read-only seed roster for resolving direct grants. |
| `projects` | object array | `{id:"proj_commerce", organizationId:"org_signal", name:"Commerce Platform"}`. Also seed Data Lab and Reliability Sandbox. |
| `clusters` | object array | Deployments by project |
| `databaseUsers` | object array | Database principals by project |
| `projectUsers` | object array | Project grants and invitation records |
| `ipAccessList` | object array | Network allow-list rules by project |
| `activityLog` | object array | Structured project operation records, initially empty or fixed historical rows |

Each core entity record has string `id`, `projectId`, `status`, `createdAt`, `createdBy`, `updatedAt` and `updatedBy`. The actor fields use the signed-in account id. On creation use the same timestamp for both dates. Preserve original creation metadata on later changes. Historical rows stay addressable by id for the verifier. Use a stable project scope for all mutations, with the project resolved before the form can submit.

## Core entity fields

| Entity | Fields beyond the common metadata |
| --- | --- |
| Cluster | `name` string, e.g. `commerce-east`; `provider` string `AWS\|GCP\|AZURE`; `region` string, e.g. `US_EAST_1`; `tier` string `M0\|FLEX\|M10\|M20\|M30`; `mongoVersion` string, e.g. `8.0`; `diskSizeGB` number or null; `backupEnabled` and `terminationProtection` booleans; optional `terminatedAt` ISO string. Status is `active\|paused\|terminated`. Use tier to derive the Free/Flex/Dedicated label. |
| Database user | `username` string, e.g. `catalog_reader`; `authMethod:"SCRAM"`; `authDatabase:"admin"`; `roles` array of `{roleName, databaseName, collectionName?}` objects, e.g. `{roleName:"read",databaseName:"catalog"}` or `{roleName:"readAnyDatabase",databaseName:"admin"}`; `clusterIds` array of strings or null, where null grants all project clusters and an array scopes to the named ids; `expiresAt` ISO string or null; optional `deletedAt`. Status is `active\|deleted`. Require at least one live cluster selection when applying restricted scope. Existing references remain historical when a cluster terminates. Never persist credential text. |
| Project user | `email` lowercased string, e.g. `taylor@signalharbor.example`; optional `name` string; `roles` array of strings, e.g. `["GROUP_READ_ONLY","GROUP_CLUSTER_MANAGER"]`; optional `invitedAt`, `expiresAt`, `removedAt` ISO strings. Status is `active\|pending\|removed`. Roles offered include Project Read Only, Project Cluster Manager, Project Data Access Read Only and Project Owner (corresponding `GROUP_READ_ONLY`, `GROUP_CLUSTER_MANAGER`, `GROUP_DATA_ACCESS_READ_ONLY`, `GROUP_OWNER`). |
| IP access rule | `address` IPv4 or CIDR string, e.g. `198.51.100.24` or `203.0.113.0/27`; `comment` string, e.g. `Warehouse CI runner`; `expiresAt` ISO string or null; optional `deletedAt` ISO string. Status is `active\|deleted`. Deduplicate equivalent IPv4 hosts and /32 blocks and canonicalize CIDR for duplicate matching per project. |
| Activity event | `{id, projectId, actorId, entityType, entityId, action, status:"completed", createdAt, changes}`. Identifiers, enum values and timestamps are strings. `changes` is an object mapping saved field names to `{before, after}` JSON values. Use null for absent values and omit untouched fields. Include creation/deletion stamps or updated fields as applicable. Example for a pause: `action:"cluster.paused", entityType:"cluster", entityId:"cl_commerce_01", changes:{status:{before:"active",after:"paused"}}` plus update metadata. |

For temporary access use save time plus the selected duration. For a pending invitation use save time plus 30 days. Calculate any expired display label and remaining time from `new Date()`. Expiration and routine rendering write no state.

## Observable state changes

Append one `activityLog[]` record with the listed action for each successful row below. Apply the entity mutation and event together. Each row update also writes `updatedAt` and `updatedBy`.

| User action | Entity operation | Event action |
| --- | --- | --- |
| Deploy cluster | Append cluster with name, provider, region, tier, version, sizing and backup/protection settings, `active` status and metadata | `cluster.created` |
| Apply configuration | Change submitted `tier`, `diskSizeGB`, `backupEnabled` or `terminationProtection` fields | `cluster.updated` |
| Pause / resume | Set `status` to `paused` / `active` | `cluster.paused` / `cluster.resumed` |
| Terminate | Set `status:"terminated"` and `terminatedAt` | `cluster.terminated` |
| Add database user | Append database user with role, scope, auth and expiry fields, `active` status and metadata | `database_user.created` |
| Edit database user | Change submitted `roles`, `clusterIds`, `expiresAt` | `database_user.updated` |
| Delete database user | Set `status:"deleted"` and `deletedAt` | `database_user.deleted` |
| Grant access or invite | Append project user with email, roles and metadata. For an existing organization member set active and copy their display name. For a new email set pending and include `invitedAt`, `expiresAt`. | `project_user.granted` / `project_user.invited` |
| Change project roles | Replace `roles` with the confirmed assignments | `project_user.roles_updated` |
| Remove / cancel invitation | Set `status:"removed"`, `removedAt` | `project_user.removed` / `project_user.invite_cancelled` |
| Add IP entry | Append rule with address, comment, expiry, `active` status and metadata | `ip_access.created` |
| Edit IP entry | Change submitted `address`, `comment`, `expiresAt` (null converts a temporary entry to permanent) | `ip_access.updated` |
| Delete IP entry | Set `status:"deleted"` and `deletedAt` | `ip_access.deleted` |

Use target ids in Playwright state assertions and assert related fields and the corresponding event on `/go`. For deletion assert both the tombstone and disappearance from active lists. Failed validation and cancellation leave the row and the event log untouched. `SCHEMA.md` should reflect the shipped implementation.
