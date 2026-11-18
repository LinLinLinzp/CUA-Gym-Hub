# firebase_mock Schema

**Base URL**: `http://localhost:5485/`  
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}`

IDs are strings. Timestamps are ISO 8601 UTC strings. Fields marked `?` are optional in complete records. `state_diff` records changes by top-level key. Reset restores the session baseline for the local state API.

## State Schema

| Key | Shape |
| --- | --- |
| `project` | `{ id, name, environment?, databaseId?, region? }` |
| `operator` | `{ id, displayName, email }` |
| `authUsers[]` | `{ uid, projectId, email?, phoneNumber?, displayName?, providerIds: string[], disabled: boolean, emailVerified: boolean, lastSignInAt: string \| null, createdAt, createdBy, updatedAt, updatedBy }` |
| `firestoreCollections[]` | `{ id, path, parentDocumentPath: string \| null, projectId, databaseId, createdAt, createdBy }` |
| `firestoreDocuments[]` | `{ id, path, collectionPath, projectId, databaseId, fields: Field[], createdAt, createdBy, updatedAt, updatedBy }` |
| `firestoreRules` | `{ projectId, databaseId, activeVersionId: string \| null, updatedAt, updatedBy }` |
| `ruleVersions[]` | `{ id, projectId, databaseId, source, createdAt, createdBy, restoredFromVersionId? }` |
| `hostingSites[]` | `{ id, projectId, name, currentReleaseId: string \| null, createdAt, createdBy, updatedAt, updatedBy }` |
| `hostingReleases[]` | `{ id, siteId, versionId, kind, fileCount: number, note?, rolledBackFromReleaseId?: string \| null, rollbackTargetReleaseId?, createdAt, createdBy }` |
| `hostingDomains[]` | `{ id, siteId, hostname, type, status, dnsRecords: DnsRecord[], createdAt, createdBy }` |
| `activity[]` | `{ id, projectId, actorId, createdAt, action, targetId, details: object }` |

A `Field` is `{ name, type, value }`. The seven field types are `string`, `number` (finite), `boolean`, `null`, `timestamp` (ISO string), `map` (JSON object) and `array` (JSON array). Firestore paths are slash-delimited and relative to the database. The collection and document IDs are their final path segments.

A `DnsRecord` is `{ type, host, value }`. Domain types are `default` and `custom`. Status values are `connected`, `needs_setup`, `pending` and `minting_certificate`. Release kinds are `deploy` and `rollback`. The live release is the one referenced by `hostingSites.currentReleaseId` on the same site.

### Default IDs

| Entity | IDs and paths |
| --- | --- |
| Project, database and operator | `northstar-notes`, `(default)`, `operator_mira` |
| Authentication | `auth_001` through `auth_048` |
| Firestore | `trailReports/report_001` through `trailReports/report_026`, `trailReportsArchive/report_001` through `trailReportsArchive/report_004`, and nested `observations/note_001` through `observations/note_004` under each of `trailReports/report_001` and `trailReports/report_002`. The 20 other root collections each have `record_001` through `record_004`. |
| Rules | `rules_001` through `rules_024`, with `rules_024` active |
| Hosting sites | `northstar-public` and `northstar-preview` |
| Hosting releases and versions | `release_public_001` through `release_public_024` and `release_preview_001` through `release_preview_024`, with corresponding `version_public_*` and `version_preview_*` IDs. Both `_024` releases are live. |
| Hosting domains | `domain_public_001` through `domain_public_012` and `domain_preview_001` through `domain_preview_012` |
| Activity | `activity_001` through `activity_007` |

## Minimal Inject Example

The example opens an empty workspace with the default project and operator. Use a fresh session ID when injecting.

```json
{
  "authUsers": [],
  "firestoreCollections": [],
  "firestoreDocuments": [],
  "ruleVersions": [],
  "hostingSites": [],
  "hostingReleases": [],
  "hostingDomains": [],
  "activity": []
}
```

## Observable State Changes (for LLM evaluation)

Each successful action below appends exactly one activity record. `action` is the value in the first column. The record uses a generated `id`, the current `project.id` and `operator.id`, and the same action timestamp as its entity changes. A change's `createdBy` or `updatedBy` is the operator ID.

| Action | Entity writes | Activity target and details |
| --- | --- | --- |
| `auth.user.create` | Append `authUsers` record with `uid, projectId, email, providerIds, disabled, emailVerified, lastSignInAt, createdAt, createdBy, updatedAt, updatedBy`. Email is trimmed and lowercase. Starts with `["password"]`, `false`, `false` and `null` for providers, disabled, verified and last sign-in. | New UID, `{ email }`. |
| `auth.user.disable`, `auth.user.enable` | Set `disabled` to true or false, plus `updatedAt, updatedBy` on the selected user. | Selected UID, `{ disabled }`. |
| `auth.user.delete` | Remove the selected Auth record. | Removed UID, `{ email }` using null when absent. |
| `firestore.collection.create` | Append collection with `id, path, parentDocumentPath, projectId, databaseId, createdAt, createdBy` and the first document with `id, path, collectionPath, projectId, databaseId, fields, createdAt, createdBy, updatedAt, updatedBy`. | New collection path, `{ databaseId, firstDocumentPath }`. |
| `firestore.document.create` | Append document with `id, path, collectionPath, projectId, databaseId, fields, createdAt, createdBy, updatedAt, updatedBy`. | New document path, `{ databaseId, collectionPath }`. |
| `firestore.field.add`, `firestore.field.update`, `firestore.field.delete` | Append, replace or remove the affected element in the document's `fields` array and set `updatedAt, updatedBy`. | Document path, `{ databaseId, fieldName, fieldType }`. For edits these are the saved name and type. |
| `firestore.collection.delete`, `firestore.document.delete` | Remove matching records from both Firestore arrays within the same project and database. Match the exact path or descendants starting with that path followed by `/`. | Selected path, `{ databaseId, removedCollectionPaths, removedDocumentPaths }`. |
| `rules.publish` | Append `ruleVersions` record with `id, projectId, databaseId, source, createdAt, createdBy`. Copy draft source verbatim. Update `firestoreRules.activeVersionId, updatedAt, updatedBy`. | New version ID, `{ databaseId, previousVersionId }`. |
| `rules.restore` | Append a new version with the chosen historical `source` and `restoredFromVersionId` in addition to all publication fields. Update the same active pointer and metadata as publish. | New version ID, `{ databaseId, previousVersionId, restoredFromVersionId }`. |
| `hosting.release.rollback` | Append a release with `id, siteId, versionId, kind, fileCount, rolledBackFromReleaseId, rollbackTargetReleaseId, createdAt, createdBy`. Copy version ID and file count from the target and set kind to `rollback`. Update the selected site's `currentReleaseId, updatedAt, updatedBy`. | New release ID, `{ siteId, rolledBackFromReleaseId, rollbackTargetReleaseId, versionId }`. |
| `hosting.domain.add` | Append domain with `id, siteId, hostname, type, status, dnsRecords, createdAt, createdBy`. Hostname is trimmed and lowercase. Starts with `custom`, `needs_setup` and synthetic TXT and A records. | New domain ID, `{ siteId, hostname }`. |
| `hosting.domain.remove` | Remove the selected custom domain. | Removed domain ID, `{ siteId, hostname }`. |

The seeded history also has a `hosting.release.deploy` activity record targeting a release with `{ siteId, versionId }`.

Passwords are held in the Add user form only. Drafts, filters, selections, pagination, simulations and DNS record views are local UI state. Invalid submissions and canceled actions leave business records and activity unchanged.

See [AUDIT.md](AUDIT.md) for reproduced exceptions affecting invalid Rules drafts and sparse injected records.
