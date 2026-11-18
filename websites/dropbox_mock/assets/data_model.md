# Dropbox Workspace Data Model

Use normalized JSON records with stable string IDs. The documented seed is an implementation target. The dev phase writes `SCHEMA.md` from the shipped code and confirms the fields in Playwright. Dates are ISO 8601 UTC strings, byte sizes are nonnegative integers, and absent relationships use JSON `null` when written by the app.

## Top-level shape

```js
export function createInitialData() {
  return {
    account: { userId: 'usr_morgan', teamName: 'Harborline Studio' },
    users: [/* contact records */],
    files: [/* folders and files */],
    versions: [/* immutable file revisions */],
    shareMembers: [/* direct grants */],
    shareLinks: [/* link grants */],
    fileRequests: [/* collection forms */],
    requestSubmissions: [/* one per uploaded file */],
    activity: [/* chronological, structured events */],
  }
}
```

## Record shapes and examples

| Collection | Fields and types | Linked example |
| --- | --- | --- |
| `account` | `userId: string`, `teamName: string` | `usr_morgan`, `Harborline Studio` |
| `users[]` | `id: string`, `name: string`, `email: string`, `isTeamMember: boolean` | `usr_morgan`, Morgan Ellis, `morgan.ellis@harborline.example`, true |
| `files[]` | `id, name, ownerId, createdBy, updatedBy: string`, `kind: file\|folder`, `parentId: string\|null`, `status: active\|deleted`, `createdAt, updatedAt: ISO`, `deletedAt: ISO\|null`, `deletedBy, deletionRootId, currentVersionId, mimeType: string\|null`, `sizeBytes: integer\|null` | `file_launch_brief`, `Launch Brief.txt`, `usr_morgan`, file, parent `fld_atlas`, active, current `ver_launch_03`, `text/plain`, 74 bytes. Folder size, MIME and version fields are null. |
| `versions[]` | `id, fileId, createdBy, mimeType: string`, `createdAt: ISO`, `sizeBytes: integer`, `sourceVersionId: string\|null`, `content: { kind: text\|localAsset\|upload, value: string }` | `ver_launch_03` links to `file_launch_brief`, by `usr_morgan`, `2026-10-06T14:15:00.000Z`, content `{ "kind": "text", "value": "Atlas launch review: proofs and vendor estimates are due Friday by 3 p.m." }`. A restored revision references its historical source. |
| `shareMembers[]` | `id, fileId, email, createdBy, updatedBy: string`, `userId: string\|null`, `role: viewer\|editor`, `status: active\|removed`, `createdAt, updatedAt: ISO`, `removedAt: ISO\|null` | `mem_atlas_jules`, `fld_atlas`, `jules.cho@harborline.example`, `usr_jules`, editor, active. |
| `shareLinks[]` | `id, fileId, token, createdBy, updatedBy: string`, `audience: anyone\|team\|invited`, `role: viewer\|editor`, `status: active\|revoked`, `createdAt, updatedAt: ISO`, `revokedAt: ISO\|null` | `lnk_atlas`, `fld_atlas`, token `atlas-review`, team, viewer, active. |
| `fileRequests[]` | `id, title, description, destinationFolderId, token, createdBy, updatedBy: string`, `status: open\|closed`, `createdAt, updatedAt: ISO`, `closedAt: ISO\|null` | `req_atlas_proofs`, Atlas print proofs, “Upload the print-ready proofs for the Atlas review.”, `fld_atlas_incoming`, token `atlas-proofs`, open. |
| `requestSubmissions[]` | `id, requestId, fileId, destinationFolderId, originalName, uploaderName, uploaderEmail: string`, `createdAt: ISO`, `status: received` | `sub_atlas_01`, `req_atlas_proofs`, `file_atlas_proof_01`, `fld_atlas_incoming`, `Cover proof.pdf`, Rina Patel, `rina@printpartner.example`, received. |
| `activity[]` | `id, action, actorId, targetId: string`, `targetType: file\|shareMember\|shareLink\|fileRequest\|requestSubmission`, `createdAt: ISO`, `status: completed`, `details: object` | `evt_launch_rename`, `file.rename`, `usr_morgan`, `file_launch_brief`, file, completed, `{ "previousName": "Atlas Brief.txt", "name": "Launch Brief.txt" }`. |

`createdBy`, `updatedBy`, `deletedBy` and `actorId` reference a user ID or the normalized contributor identity `external:<email>` for recipient uploads. Use one timestamp and consistent actor for records in a single transaction. Use collision-resistant IDs for new records and tokens, with deterministic IDs only in the seed. Reactivating a removed membership preserves its ID and original creation fields, clears `removedAt` and logs the new activation.

## Relationships and write rules

- `files.parentId` points to a folder, with root represented as null. A file's `currentVersionId` points to a revision whose `fileId` matches the file. Moving/renaming changes metadata only. Restore a revision by copying historical content and metadata into a new revision and setting the current pointer. Seeded or uploaded content is referenced, so historical bytes stay available.
- Keep original parent references on soft deletion. Use `deletionRootId` to group one selected root and its newly deleted descendants, preserving separately deleted batches. Restore clears deletion fields on the restored batch. A destination override changes only the root's parent.
- Memberships and links attach to files or folders. Normalize member emails to lowercase and trim whitespace. Inherited access traverses valid ancestors. A simulated audience check uses the account contact's team flag or active access for Team members and Only people invited respectively. Link and recipient routes use same-origin URLs and keep the session ID. A share link's role is displayed in the local preview.
- A request's destination points to an active folder at create/edit/submit time. Submission is an atomic metadata transaction after successful same-origin upload. Read the current request and destination again before committing. Store one submission per file with the resolved destination at submission time and retain the original supplied filename even when the stored name needs a suffix.
- Files hold content metadata. Revision content uses literal synthetic text, a site-relative public asset path, or a same-origin URL returned by Harbor upload. Do not serialize browser File objects, blob URLs or bytes into account state.
- Activity includes one event per affected top-level action target and links to related records. Use `file.createFolder`, `file.upload`, `file.replace`, `file.rename`, `file.move`, `file.copy`, `file.delete`, `file.restore`, `share.invite`, `share.changeRole`, `share.remove`, `link.create`, `link.update`, `link.revoke`, `request.create`, `request.edit`, `request.close`, `request.reopen`, `request.submit`, and `version.restore`. Put related IDs and changed values in `details`, including `previousVersionId`, `sourceVersionId` and `versionId` for restore. For subtree events include affected IDs. For submission include request, file and destination IDs.

## Seed targets

| Entity | Count target | Coverage |
| --- | --- | --- |
| Users | 28 | Morgan Ellis plus internal leads, editors and external vendors. Use reserved `.example` domains. |
| Files and folders | 72 | 54 files and 18 folders. Atlas Brand Launch, Cedar Research, Vendor Intake, Finance and Studio Operations supply realistic nested paths. Include root files, a deeply nested folder, incoming shares and six soft-deleted items across at least three batches. |
| Versions | 90+ | Current revisions for files and 2–4 revisions for at least 12 files. Keep named revisions visibly distinct, including three Atlas Launch Brief revisions. |
| Share members and links | 32 members, 24 links | Editor and viewer grants, team, invited and anyone links, active and inactive records, incoming and outgoing content, inherited and direct folder access. |
| File requests | 24 | Mix open and closed, with titles for vendor proofs, invoices, creative briefs and signed forms. Include empty requests and requests with multiple submissions. |
| Request submissions | 28 | Linked files already in destination folders, with repeat contributors and a request whose destination changed after its first submission. |
| Activity | 48+ | Representative file, share, request and revision events with stable IDs and dates. |

Create defaults as fresh records with fixed IDs and timestamps. Keep root and filtered views useful in the default state. Render absent optional fields with neutral fallbacks, skip dangling relations where a target cannot be shown and guard ancestor traversal against cycles. Derive paths, access summaries and submission counts from the live collections.
