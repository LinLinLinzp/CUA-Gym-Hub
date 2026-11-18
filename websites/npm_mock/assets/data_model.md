# npm account state model

Use this as the implementation blueprint for `src/data/seed.js`. The audit phase documents the shipped shapes and exact writes in `SCHEMA.md`.

## JSON shape

```js
export function createInitialData() {
  return {
    account,
    packages,
    tokens,
    organizations,
    organizationMembers,
    organizationInvitations,
    teams,
    teamMembers,
    teamPackageGrants,
  }
}
```

IDs, ISO timestamps, names, and enum members are strings. Use unique fixed IDs such as `pkg_001` for defaults and generate unique IDs for new records on user submission. Use `null` for absent scalar fields, `[]` for absent collection fields, and normal integer counts. The app should also render injected records that omit optional fields. Common creation fields are `createdAt` and `createdBy`. Common edit fields are `updatedAt` and `updatedBy`. Removal records use `status = "removed"`, `removedAt` and `removedBy`. Actor fields hold the signed-in account's ID. Mutations use one clock reading across all records written by a single action. Date-only input must be converted to an ISO expiration timestamp with consistent interpretation in review, detail, and list views.

| Key | Fields and examples |
| --- | --- |
| `account` | `id: "usr_avery"`, `username: "avery-chen"`, `displayName: "Avery Chen"`, `plan: "private"` (`"public"` or `"private"`) |
| `packages[]` | `id: "pkg_001"`, `name: "@northstar-labs/trace-buffer"`, `scope: "@northstar-labs"` or `null`, `organizationId: "org_001"` or `null`, `ownerUserId: "usr_avery"` for user-owned packages or `null`, `description: "Bounded event buffers for background workers."`, `version: "2.4.1"`, `versions: [{version: "2.4.1", tag: "latest", publishedAt: "2026-09-18T14:00:00.000Z"}]`, `weeklyDownloads: 21400`, `lastPublishedAt` (ISO), `visibility: "public"` or `"private"`, `status: "active"` or `"deprecated"`, `deprecationMessage`, `deprecatedAt`, `deprecatedBy`, plus creation and edit fields |
| `tokens[]` | `id: "tok_001"`, `name: "CI read cache"`, `description: "Installs internal build dependencies."`, `maskedValue: "sim_b8f2••••7c21"`, `status: "active"` or `"revoked"`, `allowedCidrs: ["192.0.2.0/24"]`, `bypass2fa: false` (boolean), `packages: { permission: "read-only", selection: "selected", packageIds: ["pkg_001"], scopes: ["@northstar-labs"] }`, `organizations: { permission: "none", organizationIds: [] }`, `expiresAt`, `lastUsedAt`, `revokedAt`, `revokedBy`, plus creation fields |
| `organizations[]` | `id: "org_001"`, `name: "northstar-labs"`, `scope: "@northstar-labs"`, `plan: "public"` or `"private"`, plus creation fields |
| `organizationMembers[]` | `id: "mem_001"`, `organizationId: "org_001"`, `userId: "usr_avery"`, `username: "avery-chen"`, `displayName: "Avery Chen"`, `role: "owner"`, `"admin"`, or `"member"`, `status: "active"` or `"removed"`, plus creation, edit, and removal fields |
| `organizationInvitations[]` | `id: "inv_001"`, `organizationId: "org_001"`, `invitee: "morgan-wu"` or `"morgan@example.test"`, `teamId: "team_002"` or `null`, `status: "pending"` or `"revoked"`, `revokedAt`, `revokedBy`, plus creation fields |
| `teams[]` | `id: "team_002"`, `organizationId: "org_001"`, `name: "platform"`, `description: "Runtime tooling and release infrastructure."`, `isDefault: false` (boolean), `status: "active"` or `"removed"`, plus creation and removal fields |
| `teamMembers[]` | `id: "tm_001"`, `teamId: "team_002"`, `organizationMemberId: "mem_001"`, `status: "active"` or `"removed"`, plus creation and removal fields |
| `teamPackageGrants[]` | `id: "grant_001"`, `teamId: "team_002"`, `packageId: "pkg_001"`, `permission: "read-only"` or `"read-write"`, `status: "active"` or `"removed"`, plus creation, edit, and removal fields |

## Permissions and relationships

- Private package visibility requires a scope and a `private` owner plan. For an organization package, resolve the current user's role from their active `organizationMembers[]` record. For a personal or unscoped package, use `ownerUserId`. Visibility and package deprecation controls require ownership in this sandbox.
- Package access on a token uses `none`, `read-only`, `read-write`, or `stage-only`. Use `selection: "none"` with `none`, `"all"` for all packages, or `"selected"` for explicit package IDs and canonical `@scope` strings. Clear unused selectors when committing. Limit selected packages and scopes to 50 combined. Organization access uses `none`, `read-only`, or `read-write`, with a maximum of 50 organization IDs. Bypass 2FA defaults to false and stays false when package access is `none` or `read-only`. CIDRs must be valid IPv4 or IPv6 network/prefix strings. Token display status is `expired` when a stored active token is past `expiresAt`. Revocation takes precedence over expiry. Generate a clearly synthetic `sim_…` value and persist only `maskedValue`.
- Organization scopes are unique and equal to `@` plus the lowercase organization name. New organizations get an active owner membership, an active `developers` team marked `isDefault: true`, and an active default-team assignment for the owner. Use independent IDs joined by `organizationId`. When an organization owns a package, that package's `organizationId` and `scope` point to the same organization. Its default team may have a `read-write` grant in the seed.
- Members and grants point to active records in the same organization when created. Only owners manage member invitations and roles or removals. Owners and admins manage teams and package grants. Filter soft-removed records out of default organization and team views and counts, keeping them in persisted arrays for verification. When a custom team is removed, clear that team's `teamId` from pending invitations in the same mutation so the invitations remain usable without the team. Missing links render as unavailable or omitted metadata.

## Seed distribution

| Entity | Coverage |
| --- | --- |
| Packages | 40, with 16 personal or unscoped and 24 organization-scoped. Include public and private packages under a private-plan owner, a public-only scope, and at least four deprecated packages. Give each at least two versions, a plausible download count, and variable publish dates. Use names such as `@northstar-labs/trace-buffer`, `@avery-chen/release-digest`, and `fixture-sprout`. |
| Tokens | 28 with active, expired, and revoked examples spread across personal builds, automation, and organization tooling. Vary settings across all packages, specific scopes, organization-only access, and CIDRs. Use fixed timestamp offsets expressed as literal dates in the seed, with clearly past dates for expired examples and future dates for active examples. |
| Organizations | 24 with mixed public/private plans, varied actor roles, and a mix of occupied and empty package lists. Include `northstar-labs` as a private-plan organization that Avery owns and `papertrail-tools` as a public-plan organization where Avery is a member. |
| Organization membership and invitations | One active Avery membership per seed organization, plus enough synthetic colleagues for multiple membership rows in key organizations. Include at least two pending invitations and one revoked invitation. Every organization retains an active owner. |
| Teams and grants | One default developers team per organization. Give primary organizations a mix of custom teams with and without membership or package access. Include both grant permissions and a package available to grant in the leading organization. |

Derive summary counts, filter state, view state, and effective expiry from these records. They do not require top-level keys. A session's persisted JSON contains domain data and no raw token value.
