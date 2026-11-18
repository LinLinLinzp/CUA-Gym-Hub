# Firebase state model

`createInitialData()` returns fresh JSON data with these keys.

```js
{
  project, operator, authUsers, firestoreCollections, firestoreDocuments,
  firestoreRules, ruleVersions, hostingSites, hostingReleases, hostingDomains,
  activity
}
```

Types below use `? ` for fields that may be missing and `| null` for fields that may be intentionally empty. IDs and ISO 8601 UTC timestamps are strings. User-initiated creations use unique IDs and `new Date().toISOString()`. Take one timestamp and actor per action. Use the project's ID and the operator's ID on new records. All examples are synthetic.

## Project and operator

| Key | Shape | Example |
| --- | --- | --- |
| `project` | `{ id: string, name: string, environment?: string, databaseId?: string, region?: string }` | `{ id: "northstar-notes", name: "Northstar Field Notes", environment: "Workspace", databaseId: "(default)", region: "us-central1" }` |
| `operator` | `{ id: string, displayName: string, email: string }` | `{ id: "operator_mira", displayName: "Mira Chen", email: "mira@example.test" }` |

## Authentication users

`authUsers[]` includes the fields below. `uid` is the user key. Store unique normalized email for new email/password records. Present email, then phone, then UID as the row identifier and search across all three. Provider IDs include `password`, `google.com`, `phone` and `anonymous`. Enable and Disable are separate explicit actions. Deleting an Auth user touches only the Auth record and activity.

| Fields | Type | Example |
| --- | --- | --- |
| `uid, projectId` | string | `auth_001`, `northstar-notes` |
| `email?, phoneNumber?, displayName?` | string | `ada.brooks@example.test`, `+12025550123`, `Ada Brooks` |
| `providerIds` | string[] | `["password", "google.com"]` |
| `disabled, emailVerified` | boolean | `false`, `true` |
| `lastSignInAt` | ISO string or null | `2026-10-02T10:12:00.000Z` |
| `createdAt, updatedAt` | ISO string | `2026-07-17T09:00:00.000Z` |
| `createdBy, updatedBy` | actor ID | `operator_mira` |

New users start enabled with `emailVerified: false`, `lastSignInAt: null` and `providerIds: ["password"]`.

## Firestore

`firestoreCollections[]` records use `{ id, path, parentDocumentPath, projectId, databaseId, createdAt, createdBy }`. Here `id` is a path segment, `path` is a relative slash-delimited path, and `parentDocumentPath` is a string for a nested collection or null for a top-level collection. Example paths are `trailReports` and `trailReports/report_001/observations`.

`firestoreDocuments[]` records use `{ id, path, collectionPath, projectId, databaseId, fields, createdAt, createdBy, updatedAt, updatedBy }`. Use `path` as the stable key and include `projectId` and `databaseId` when comparing keys. For `trailReports/report_001`, the ID is `report_001` and the collection path is `trailReports`. Each element in `fields` has `{ name: string, type: string, value: JSON value }`.

| Type | Stored value | Example |
| --- | --- | --- |
| `string` | string | `"North Ridge"` |
| `number` | finite JSON number | `3.5` |
| `boolean` | boolean | `true` |
| `null` | null | `null` |
| `timestamp` | ISO UTC string | `"2026-09-12T15:20:00.000Z"` |
| `map` | JSON object | `{"published":true,"windKph":14}` |
| `array` | JSON array | `["ridge","survey"]` |

Reject empty IDs, slash characters in any ID and duplicate sibling IDs. Resolve Auto ID before commit. Trim field names, reject empty and duplicate field names, and preserve JSON types. When deleting a collection or document, remove the exact selected path and descendants prefixed by that path plus a slash from the corresponding arrays. Keep similarly prefixed siblings. Deleting a field updates only its document.

## Rules

| Key | Shape | Example |
| --- | --- | --- |
| `firestoreRules` | `{ projectId, databaseId, activeVersionId: string \| null, updatedAt, updatedBy }` | Active version `rules_024` in `(default)` |
| `ruleVersions[]` | `{ id, projectId, databaseId, source: string, createdAt, createdBy, restoredFromVersionId?: string }` | `rules_024`, source below, timestamp `2026-10-09T13:15:00.000Z` |

Seed a document-scoped policy such as the following.

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /trailReports/{reportId} {
      allow get, list: if true;
      allow create, update, delete: if request.auth != null;
    }
  }
}
```

Publish stores the source verbatim after local syntax checks. Restore appends a version with the chosen source and a `restoredFromVersionId` link. Show a fallback when an injected active pointer is null or absent from its version list. For the Playground, support literal segments, single-segment wildcards, `get/list/create/update/delete`, `read/write` aliases and predicates `true`, `false`, `request.auth != null` and `request.auth == null`. Evaluate matching allows for the selected operation and default to deny when no statement matches. Report unsupported syntax explicitly if the draft exceeds that subset. Treat results as local simulations without enforcement against the data editor.

## Hosting

| Key | Shape | Example |
| --- | --- | --- |
| `hostingSites[]` | `{ id, projectId, name, currentReleaseId: string \| null, createdAt, createdBy, updatedAt, updatedBy }` | `northstar-public`, `Northstar Public`, `release_public_024` |
| `hostingReleases[]` | `{ id, siteId, versionId, kind: "deploy" \| "rollback", fileCount: number, note?: string, rolledBackFromReleaseId?: string, rollbackTargetReleaseId?: string, createdAt, createdBy }` | `release_public_024`, `version_public_018`, `deploy`, 47 files |
| `hostingDomains[]` | `{ id, siteId, hostname, type: "default" \| "custom", status: "connected" \| "needs_setup" \| "pending" \| "minting_certificate", dnsRecords: { type: string, host: string, value: string }[], createdAt, createdBy }` | `domain_public_005`, `field-notes.example.test`, `custom`, `needs_setup`, TXT and A setup records |

Scope release lists, current pointers and domains by site. Derive the Live label from the current release pointer. A rollback copies `versionId` and `fileCount` from the target and keeps the previous current release ID and target release ID in the new record. Disallow rollback to the version already live. Lowercase and validate custom hostnames, reject duplicates across sites, and start new entries at `needs_setup`. Show synthetic TXT and A values, using a documentation-range address such as `192.0.2.42`. Render domains as text. Remove only custom domains.

## Activity

`activity[]` contains `{ id: string, projectId: string, actorId: string, createdAt: ISO string, action: string, targetId: string, details: object }`. Use paths as Firestore targets and entity IDs elsewhere. The list drives the recent activity view. Sort by time, and preserve actor IDs when an optional actor label is unavailable.

| Action | Details |
| --- | --- |
| `auth.user.create`, `auth.user.delete` | `{ email }` using null if email is absent |
| `auth.user.disable`, `auth.user.enable` | `{ disabled }` |
| `firestore.collection.create` | `{ databaseId, firstDocumentPath }` |
| `firestore.document.create` | `{ databaseId, collectionPath }` |
| `firestore.field.add`, `firestore.field.update`, `firestore.field.delete` | `{ databaseId, fieldName, fieldType }` |
| `firestore.collection.delete`, `firestore.document.delete` | `{ databaseId, removedCollectionPaths, removedDocumentPaths }` |
| `rules.publish` | `{ databaseId, previousVersionId }` using null if no prior version exists |
| `rules.restore` | `{ databaseId, previousVersionId, restoredFromVersionId }` |
| `hosting.release.rollback` | `{ siteId, rolledBackFromReleaseId, rollbackTargetReleaseId, versionId }` |
| `hosting.domain.add`, `hosting.domain.remove` | `{ siteId, hostname }` |

## Injected state

An injected array replaces its defaults. Render blank grids and intact navigation for empty lists. Use empty selections and readable fallbacks for missing references and optional dates. Use valid records from the current session for counts, selections and actions. Keep bootstrap fallback logic read-only.
