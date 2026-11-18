# npm_mock Schema

**Base URL** `http://localhost:5495/`  
**Go Endpoint** `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject** `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset** `POST /post?sid=<sid>` with body `{"action":"reset"}` restores the server baseline.

## State Schema

Look up records by ID. The signed-in account supplies the actor ID for mutations. All timestamps are ISO UTC strings. A multi-record action uses one timestamp. In `state_diff`, `modified` holds the current value of a key that was in the baseline. `added` holds the value of a key omitted from the baseline. Compare collections with `initial_state` by record ID to identify the affected rows.

| Key | Type | Record fields |
| --- | --- | --- |
| `account` | Object | `id`, `username`, `displayName`, `plan` (`public` or `private`) |
| `packages` | Array | `id`, `name`, `description`, `scope`, `organizationId`, `ownerUserId`, `version`, `versions[]` (`version`, `tag`, `publishedAt`), `weeklyDownloads` (integer), `lastPublishedAt`, `visibility` (`public` or `private`), `status` (`active` or `deprecated`), `deprecationMessage`, `deprecatedAt`, `deprecatedBy`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy` |
| `tokens` | Array | `id`, `name`, `description`, `maskedValue`, `status` (`active` or `revoked`), `allowedCidrs[]`, `bypass2fa` (boolean), `packages` (`permission`, `selection`, `packageIds[]`, `scopes[]`), `organizations` (`permission`, `organizationIds[]`), `expiresAt`, `lastUsedAt`, `createdAt`, `createdBy`, `revokedAt`, `revokedBy` |
| `organizations` | Array | `id`, `name`, `scope` (canonical `@name`), `plan` (`public` or `private`), `createdAt`, `createdBy` |
| `organizationMembers` | Array | `id`, `organizationId`, `userId`, `username`, `displayName`, `role` (`owner`, `admin`, or `member`), `status` (`active` or `removed`), `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `removedAt`, `removedBy`. An injected `email` is also checked for duplicate invitations. |
| `organizationInvitations` | Array | `id`, `organizationId`, `invitee` (normalized username or email), `teamId`, `status` (`pending` or `revoked`), `createdAt`, `createdBy`, `revokedAt`, `revokedBy` |
| `teams` | Array | `id`, `organizationId`, `name`, `description`, `isDefault` (boolean), `status` (`active` or `removed`), `createdAt`, `createdBy`, `removedAt`, `removedBy` |
| `teamMembers` | Array | `id`, `teamId`, `organizationMemberId`, `status` (`active` or `removed`), `createdAt`, `createdBy`, `removedAt`, `removedBy` |
| `teamPackageGrants` | Array | `id`, `teamId`, `packageId`, `permission` (`read-only` or `read-write`), `status` (`active` or `removed`), `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `removedAt`, `removedBy` |

Absent scalar fields are `null` on full records. Injected data can omit optional fields. Token package permission supports `none`, `read-only`, `read-write`, and `stage-only`; its selection is `none`, `all`, or `selected`. Organization token permission supports `none`, `read-only`, and `read-write`. Unused token selectors are empty arrays. The synthetic token value is held in memory on the generation result screen. Only `maskedValue` persists. Effective expiry derives from the runtime clock and `expiresAt`.

### Default IDs

- Account `usr_avery`. Packages `pkg_001`–`pkg_040`. Tokens `tok_001`–`tok_028`. Organizations `org_001`–`org_024`.
- Organization memberships `mem_001`–`mem_024` for the account and `mem_<organization number>_<member number>` for colleagues. Invitations `inv_001`–`inv_003`.
- Teams `team_001`–`team_024`, `team_platform`, `team_docs`, and `team_qa`. Team assignments `tm_001`–`tm_024` and `tm_platform`. Grants `grant_001`–`grant_003`.

## Minimal Inject Example

Send this as `state` in the `set` request for a fresh SID. The account object merges with the seed. Each supplied array replaces its seeded collection.

```json
{
  "packages": [{ "id": "pkg_example", "name": "example-fixture", "visibility": "public" }],
  "tokens": [],
  "organizations": [],
  "organizationMembers": [],
  "organizationInvitations": [],
  "teams": [],
  "teamMembers": [],
  "teamPackageGrants": []
}
```

## Observable State Changes (for LLM evaluation)

| User action | Fields in `current_state` |
| --- | --- |
| Save package visibility | Selected `packages[]`: `visibility`, `updatedAt`, `updatedBy` |
| Confirm package deprecation | Selected `packages[]`: `status = deprecated`, `deprecationMessage`, `deprecatedAt`, `deprecatedBy`, `updatedAt`, `updatedBy` |
| Restore package | Selected `packages[]`: `status = active`, `deprecationMessage = null`, `deprecatedAt = null`, `deprecatedBy = null`, `updatedAt`, `updatedBy` |
| Generate token | Append `tokens[]` with the full shape above, including the selected permissions, restrictions, `status = active`, `maskedValue`, `createdAt`, `createdBy`, and null last-use and revocation fields |
| Revoke one or several tokens | Selected `tokens[]`: `status = revoked`, `revokedAt`, `revokedBy` |
| Create organization | Append `organizations[]`, one active actor membership with `role = owner` in `organizationMembers[]`, one active `developers` team with `isDefault = true` in `teams[]`, and one active owner assignment in `teamMembers[]`, with linked IDs and creation metadata |
| Send invitation | Append `organizationInvitations[]` with `id`, `organizationId`, `invitee`, `teamId` or null, `status = pending`, `createdAt`, `createdBy`, `revokedAt = null`, `revokedBy = null` |
| Revoke invitation | Selected `organizationInvitations[]`: `status = revoked`, `revokedAt`, `revokedBy` |
| Save member role | Selected `organizationMembers[]`: `role`, `updatedAt`, `updatedBy` |
| Remove organization member | Selected `organizationMembers[]` and their active `teamMembers[]`: `status = removed`, `removedAt`, `removedBy` |
| Create custom team | Append `teams[]` with the full shape above, `isDefault = false`, `status = active`, and null removal fields |
| Assign team member | Append `teamMembers[]` with a linked active organization member and team, `status = active`, creation metadata, and null removal fields |
| Remove team member assignment | Selected `teamMembers[]`: `status = removed`, `removedAt`, `removedBy` |
| Grant package access | Append `teamPackageGrants[]` with the selected `permission`, same-organization package ID, team ID, `status = active`, creation metadata, and null update and removal fields |
| Save grant permission | Selected `teamPackageGrants[]`: `permission`, `updatedAt`, `updatedBy` |
| Remove package grant | Selected `teamPackageGrants[]`: `status = removed`, `removedAt`, `removedBy` |
| Remove custom team | Selected `teams[]` plus its active `teamMembers[]` and `teamPackageGrants[]`: `status = removed`, `removedAt`, `removedBy`. Its pending `organizationInvitations[]`: `teamId = null` |

Filtering, search, pagination, clipboard actions, draft edits, opening or canceling dialogs, and navigating are view operations. The first load writes the Harbor baseline. A successful mutation sends one `set_current` request.
