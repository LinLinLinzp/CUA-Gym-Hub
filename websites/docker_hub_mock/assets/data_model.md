# Docker Hub data model

`src/data/seed.js` exports a pure `createInitialData()` that returns fresh JSON-serializable objects with fixed IDs and timestamps. The account is signed in as a synthetic owner. Use separate records for namespaces, repositories, image tags, teams, membership, grants, and activity so Harbor can verify a mutation by ID.

## State structure and examples

Every object shown below is an example record or top-level object. The example joins resolve within this object. Strings are plain text and counters are numbers.

```json
{
  "account": { "userId": "usr-avery", "defaultNamespaceId": "ns-northstar" },
  "namespaces": [
    { "id": "ns-northstar", "slug": "northstar-platform", "name": "Northstar Platform", "type": "organization" },
    { "id": "ns-avery", "slug": "averychen", "name": "Avery Chen", "type": "personal" }
  ],
  "users": [
    { "id": "usr-avery", "username": "averychen", "displayName": "Avery Chen", "email": "avery@northstar.example" }
  ],
  "organizationMembers": [
    { "id": "om-northstar-avery", "namespaceId": "ns-northstar", "userId": "usr-avery", "role": "owner" }
  ],
  "repositories": [
    {
      "id": "repo-edge-router",
      "namespaceId": "ns-northstar",
      "name": "edge-router",
      "description": "Ingress routing for the Northstar services.",
      "overview": "Gateway image for staging and production ingress.",
      "visibility": "private",
      "pullCount": 12540,
      "status": "active",
      "createdAt": "2025-09-04T13:25:00.000Z",
      "createdBy": "usr-avery",
      "updatedAt": "2025-11-02T14:00:00.000Z",
      "updatedBy": "usr-avery"
    }
  ],
  "tags": [
    {
      "id": "tag-edge-stable",
      "repositoryId": "repo-edge-router",
      "name": "stable",
      "digest": "sha256:445db155aa3253181793b0ad91cb0816445db155aa3253181793b0ad91cb0816",
      "platforms": [
        { "os": "linux", "architecture": "amd64", "sizeBytes": 27422720 },
        { "os": "linux", "architecture": "arm64", "sizeBytes": 26605312 }
      ],
      "sizeBytes": 54028032,
      "pushedAt": "2025-11-02T14:00:00.000Z",
      "immutable": false,
      "status": "active",
      "createdAt": "2025-11-02T14:00:00.000Z",
      "createdBy": "usr-avery",
      "updatedAt": "2025-11-02T14:00:00.000Z",
      "updatedBy": "usr-avery"
    }
  ],
  "teams": [
    {
      "id": "team-release-engineering",
      "namespaceId": "ns-northstar",
      "name": "release-engineering",
      "description": "Publishes release images and maintains deployment channels.",
      "status": "active",
      "createdAt": "2025-09-12T10:30:00.000Z",
      "createdBy": "usr-avery",
      "updatedAt": "2025-11-02T14:15:00.000Z",
      "updatedBy": "usr-avery"
    }
  ],
  "teamMemberships": [
    {
      "id": "tm-release-avery",
      "teamId": "team-release-engineering",
      "userId": "usr-avery",
      "status": "active",
      "createdAt": "2025-09-12T10:35:00.000Z",
      "createdBy": "usr-avery",
      "updatedAt": "2025-09-12T10:35:00.000Z",
      "updatedBy": "usr-avery"
    }
  ],
  "repositoryPermissions": [
    {
      "id": "rp-edge-release",
      "repositoryId": "repo-edge-router",
      "teamId": "team-release-engineering",
      "permission": "read_write",
      "status": "active",
      "createdAt": "2025-09-12T10:45:00.000Z",
      "createdBy": "usr-avery",
      "updatedAt": "2025-09-12T10:45:00.000Z",
      "updatedBy": "usr-avery"
    }
  ],
  "activity": []
}
```

## Types, identities and relationships

| Record | Fields and constraints |
| --- | --- |
| Account | `userId` and `defaultNamespaceId` are string references to user and namespace. |
| Namespace | `id`, `slug`, and `name` are strings. `type` is `organization` or `personal`. Route repositories by unique namespace slug and name. |
| User | `id`, `username`, `displayName` and `email` are strings. Use synthetic English names and reserved `.example` email domains. |
| Organization member | `id`, `namespaceId`, `userId` are strings. `role` is `owner`, `editor`, or `member`. Unique per organization and user. The signed-in owner operates the baseline organization. |
| Repository | `id`, `namespaceId`, `name`, `description`, and `overview` are strings. `visibility` is `public` or `private`. `pullCount` is a non-negative integer. Unique active name in a namespace. |
| Tag | `id`, `repositoryId`, `name`, and `digest` are strings. `pushedAt` is an ISO timestamp. `sizeBytes` is a non-negative integer. `platforms` is an array of objects with string `os` and `architecture`, optional string `variant`, and optional integer `sizeBytes`. `immutable` is boolean. Optional `sourceTagId` is a string referencing the locally retagged image's source. Names are case-sensitive and unique among active tags per repository. Digests can be shared. |
| Team | `id`, `namespaceId`, `name`, and `description` are strings. Belongs to an organization namespace. Unique active name per organization. |
| Team membership | `id`, `teamId`, and `userId` are strings. The user must belong to the team's organization. At most one active record per team and user. |
| Repository permission | `id`, `repositoryId` and `teamId` are strings. The team and repository belong to the same organization. `permission` is `read_only` (Read-only), `read_write` (Read & Write), or `admin` (Admin). At most one active record per repository and team. |
| Activity | `id`, `type`, `actorId`, and `createdAt` are strings. `targets` maps top-level collection names to affected ID arrays. Optional `changes` maps changed business fields to objects with `before` and `after` JSON values. |

Repositories, tags, teams, team memberships and repository permissions have `status` (`active` or `deleted`), ISO string timestamps `createdAt` and `updatedAt`, and user ID strings `createdBy` and `updatedBy`. Deleted records also include `deletedAt` and `deletedBy`. Creation sets both timestamps and actors from the same action. Update and delete stamp the affected rows once per action with `new Date().toISOString()` and the signed-in user. A reused name or restored membership receives a new active record and ID. The old record stays available to verifiers.

For injected worlds, treat missing `status` as active, missing platforms as an empty array, and missing counters, descriptions, dates, and joined metadata as absent values. Use stable row IDs as keys. Resolve routes from active records and show a recoverable empty or unavailable state if the target cannot be resolved. Derive team, tag and grant counts from the active joined rows. Do this at read time so an injected world's records stay intact on boot.

## Observable action records

Each successful mutation adds one activity record. For example, changing a repository's visibility records the new field on the repository and this event.

```json
{
  "id": "evt-c98f02",
  "type": "repository.visibility_changed",
  "actorId": "usr-avery",
  "createdAt": "2026-11-18T14:00:00.000Z",
  "targets": { "repositories": ["repo-edge-router"] },
  "changes": { "visibility": { "before": "private", "after": "public" } }
}
```

| Action | State change | Activity and targets |
| --- | --- | --- |
| Create repository | Append active repository with form values, zero pulls, empty overview and creation metadata. | `repository.created` → repository |
| Edit repository | Update description and/or overview and repository update metadata. | `repository.updated` → repository, with each changed value |
| Switch visibility | Update visibility and repository update metadata. | `repository.visibility_changed` → repository, with old and new visibility |
| Delete repository | Mark repository, active tags and active permission grants deleted, with deletion and update metadata. | `repository.deleted` → repository, tags, grants |
| Add tag from image | Append active tag with new name/ID, `sourceTagId`, copied digest/platforms/size when present, `immutable: false`, pushed time and creation metadata. Update repository metadata. | `tag.created` → repository, new tag |
| Delete selected tags | Mark selected active mutable tags deleted and stamp the parent repository update metadata. | `tag.deleted` → repository, selected tags |
| Create or edit team | Append active team with creation metadata or update its description and update metadata. | `team.created` or `team.updated` → team, with edited values on update |
| Add or remove team member | Append an active membership or mark the active membership deleted with deletion metadata. Stamp team metadata. | `team.member_added` or `team.member_removed` → team, membership, user |
| Grant, edit or revoke permission | Append a new active grant, edit its permission, or mark it deleted with deletion metadata. Stamp repository metadata. | `repository.permission_granted`, `repository.permission_updated`, or `repository.permission_revoked` → repository, grant, team, with changed permission on edit |
| Delete team | Mark team, active memberships and active grants deleted with deletion and update metadata. | `team.deleted` → team, memberships, grants |

`targets` uses `repositories`, `tags`, `teams`, `teamMemberships`, `repositoryPermissions`, and `users` when applicable. Handle related changes in one state update. Canceled or invalid actions and no-op edits leave the store untouched.

## Seed inventory

- Two namespaces. The organization owns 30 repositories and the personal namespace owns six. Include mixed visibility, duplicate short names across namespaces, and names such as `edge-router`, `build-runner`, and `artifact-mirror`. Keep at least four repositories tagless, vary timestamps and pull counts, and include both blank and populated overviews.
- 132 tags across populated repositories. Give at least one repository 24 tags, including `latest`, `stable`, semantic versions, prereleases, digest aliases, and an immutable release. Include single- and multi-platform images and byte sizes. Include release channels with names that differ across repositories.
- 24 organization teams including `release-engineering`, `security-review`, `observability`, and an empty team. Seed 40 users including the owner, 36 organization memberships, at least 60 team memberships, and at least 38 repository grants across all three levels. Include overlapping team memberships, organization members with no team, and an organization repository with no team grants.
- Start with empty activity. Use fixed timestamps and readable stable IDs. When generating rows from fixture arrays, derive IDs deterministically from their fixture keys. The seed should fit comfortably under the shared state client's keepalive threshold if practical. Use the runtime clock for relative date presentation.
