# Dropbox_mock Schema

**Base URL**: `http://127.0.0.1:5392/`  
**Go endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Stored state**: `GET /state?sid=<sid>` → `{stored_state, has_custom_state, sid}`  
**Inject**: `POST /post?sid=<sid>` with `{"action":"set","state":{...}}` before opening a fresh browser session for that SID.  
**Reset**: `POST /post?sid=<sid>` with `{"action":"reset"}` restores server current state from the stored baseline.

The diff reports whole changed top-level collections as `{"modified": value}` or `{"added": value}`. On boot, injected arrays replace defaults and objects merge recursively. In the tables below, timestamps are ISO 8601 UTC strings, sizes are bytes, and IDs and tokens are opaque strings. Missing optional values can be absent in injected state. Writes use `null` for absent relationships and cleared markers.

## State Schema

| Key | Record fields |
| --- | --- |
| `account` | `userId` references the signed-in user. `teamName` is display text. |
| `users[]` | `id`, `name`, `email`, `isTeamMember` (boolean). |
| `files[]` | `id`, `name`, `kind` (`file` or `folder`), `parentId` (folder ID or null for root), `ownerId`, `status` (`active` or `deleted`), `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `deletedAt`, `deletedBy`, `deletionRootId`, `currentVersionId`, `mimeType`, `sizeBytes` (integer or null). The version, MIME, and size fields are null for folders. |
| `versions[]` | `id`, `fileId`, `createdAt`, `createdBy`, `mimeType`, `sizeBytes` (integer), `sourceVersionId` (historical source or null), `content`. Content is `{ kind, value }`, where `kind` is `text`, `localAsset`, or `upload`. The value is literal text, a site-relative asset path, or a Harbor upload URL. Content can be null when copying a file with missing content. |
| `shareMembers[]` | `id`, `fileId`, `email` (trimmed and lowercase), `userId` (contact ID or null), `role` (`viewer` or `editor`), `status` (`active` or `removed`), `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `removedAt`. |
| `shareLinks[]` | `id`, `fileId`, `token`, `audience` (`anyone`, `team`, or `invited`), `role` (`viewer` or `editor`), `status` (`active` or `revoked`), `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `revokedAt`. |
| `fileRequests[]` | `id`, `title`, `description` (empty string allowed), `destinationFolderId`, `token`, `status` (`open` or `closed`), `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `closedAt`. |
| `requestSubmissions[]` | `id`, `requestId`, `fileId`, `destinationFolderId` (at submission time), `originalName`, `uploaderName`, `uploaderEmail` (trimmed and lowercase), `createdAt`, `status` (`received`). |
| `activity[]` | `id`, `action`, `actorId`, `targetType` (`file`, `shareMember`, `shareLink`, `fileRequest`, or `requestSubmission`), `targetId`, `createdAt`, `status` (`completed`), `details` (object). |

Account actions use `account.userId` as actor. Recipient uploads use `external:<normalized email>` for the actor and file and version creation stamps. Each action uses one timestamp for its related records. Request counts and inherited share access are derived from records.

### Default IDs

| Record | Stable example |
| --- | --- |
| Signed-in user | `usr_morgan` (Morgan Ellis) |
| Folder | `fld_atlas` (Atlas Brand Launch) |
| File and current version | `file_launch_brief`, `ver_launch_03` |
| Direct membership | `mem_atlas_jules` |
| Link | `lnk_atlas`, token `atlas-review` |
| File request | `req_atlas_proofs`, token `atlas-proofs` |
| Request submission | `sub_atlas_01`, linked to `file_atlas_proof_01` |
| Activity | `evt_001` (delete Superseded layouts) |

## Minimal Inject Example

This `state` value opens a workspace with one empty folder.

```json
{
  "account": { "userId": "owner", "teamName": "Fixture Studio" },
  "users": [{ "id": "owner", "name": "Alex Taylor", "email": "alex@fixture.example", "isTeamMember": true }],
  "files": [{ "id": "fixture_folder", "name": "Deliveries", "kind": "folder", "parentId": null, "ownerId": "owner", "status": "active" }],
  "versions": [],
  "shareMembers": [],
  "shareLinks": [],
  "fileRequests": [],
  "requestSubmissions": [],
  "activity": []
}
```

## Observable State Changes

Each accepted mutation appends an `activity[]` record with the fields above. The last column gives its exact `details` keys for actions performed in the app. “Stamps” means `updatedAt` and `updatedBy`. New records carry all fields listed in their schema. No-op edits, validation failures, cancellation, failed uploads and unavailable recipients leave account records unchanged. The seeded delete, request edit and invite events have the same envelope and may omit some detail keys.

| Action | State written | Activity action and details |
| --- | --- | --- |
| New folder | Append a folder to `files` with an active status and selected `parentId`. | `file.createFolder` on folder ID. `name`, `parentId`. |
| Upload or Keep both | Append a file to `files` and its initial revision to `versions`. Set file `currentVersionId`, `sizeBytes`, `mimeType` and stamps. | `file.upload` on new file ID. `name`, `parentId`, `versionId`. |
| Replace upload | Append to `versions`. Patch existing `files` record's `currentVersionId`, `sizeBytes`, `mimeType` and stamps. | `file.replace` on existing file ID. `previousVersionId`, `versionId`. |
| Rename | Patch `files.name` and stamps. | `file.rename` on file or folder ID. `previousName`, `name`. |
| Move one or several items | Patch each moved root's `files.parentId` and stamps. Descendants' immediate parent references stay intact. | `file.move` on each moved root ID. `previousParentId`, `parentId`. |
| Copy | Append new `files` records for the selected item and its active descendants. Append an initial `versions` record for each copied file and set each new file's `currentVersionId`, `sizeBytes`, `mimeType` and stamps. | `file.copy` on copied root ID. `sourceFileId`, `destinationFolderId`, `affectedIds` of the copies. |
| Delete one or several items | Patch each selected root and its active descendants in `files` with `status=deleted`, `deletedAt`, `deletedBy`, `deletionRootId` and stamps. | `file.delete` on each deletion root ID. `parentId`, `affectedIds`. |
| Restore deleted item | Patch the deletion batch in `files` with `status=active`, `deletedAt=null`, `deletedBy=null`, `deletionRootId=null`, `parentId` and stamps. The selected destination applies to the root. | `file.restore` on restored root ID. `previousParentId`, `parentId`, `affectedIds`. |
| Invite or reactivate member | Append to `shareMembers`, or patch the existing same-item/email record's `email`, `userId`, `role`, `status=active`, `removedAt=null` and stamps. | `share.invite` on membership ID. `fileId`, `email`, `role`, `reactivated` (boolean). |
| Change member role | Patch `shareMembers.role` and stamps. | `share.changeRole` on membership ID. `fileId`, `email`, `previousRole`, `role`. |
| Remove member | Patch `shareMembers.status=removed`, `removedAt` and stamps. | `share.remove` on membership ID. `fileId`, `email`, `previousRole`. |
| Create link | Append to `shareLinks` with chosen role and audience, `status=active` and a new token. | `link.create` on link ID. `fileId`, `audience`, `role`. |
| Edit link | Patch `shareLinks.audience`, `role` and stamps with the same token. | `link.update` on link ID. `fileId`, `previousAudience`, `previousRole`, `audience`, `role`. |
| Revoke link | Patch `shareLinks.status=revoked`, `revokedAt` and stamps. | `link.revoke` on link ID. `fileId`, `audience`, `role`. |
| Create file request | Append to `fileRequests` with `status=open`, the selected destination, a token and `closedAt=null`. | `request.create` on request ID. `title`, `destinationFolderId`. |
| Edit request | Patch `fileRequests.title`, `description`, `destinationFolderId` and stamps. | `request.edit` on request ID. `title`, `description`, `destinationFolderId`, `previousTitle`, `previousDescription`, `previousDestinationFolderId`. |
| Close or reopen request | Patch `fileRequests.status`, `closedAt` (timestamp when closed, null when reopened), and stamps. | `request.close` or `request.reopen` on request ID. `previousStatus`, `status`. |
| Submit request files | Append one `requestSubmissions`, `files`, and `versions` record per upload in one transaction. Each file has the current folder as `parentId`, a unique name, `currentVersionId`, `sizeBytes`, `mimeType` and stamps. | `request.submit` on each submission ID. `requestId`, `fileId`, `destinationFolderId`, `versionId`. |
| Restore historical revision | Append to `versions` with `sourceVersionId` set and source content and metadata. Patch `files.currentVersionId`, `sizeBytes`, `mimeType` and stamps. | `version.restore` on the same file ID. `previousVersionId`, `sourceVersionId`, `versionId`. |

Uploads use `POST /upload?sid=<sid>` to store bytes and only record metadata after successful upload. New tabs in the same browser context observe changes through session-scoped browser storage. Browsing, sorting, searching, selecting items, previewing versions, copying URLs and opening links do not write account state.
