# microsoft_word_for_the_web_mock Schema

**Base URL**: `http://localhost:5306/`  
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}`

The Harbor app key is `microsoft_word_for_the_web_mock`. `GET /state?sid=<sid>` returns `{stored_state, has_custom_state, sid}`. On a fresh browser session, injected arrays replace the default arrays and injected objects merge with defaults. Use a fresh `sid` for a new baseline. Once established, the initial snapshot survives later `set` and `set_current` requests. Reset restores the initial snapshot as current. Read exact field values from `current_state` and changed top-level keys from `state_diff` in the `/go` response.

## State Schema

IDs are opaque strings. Timestamps are ISO 8601 strings. A mutable top-level record includes `id`, `createdAt`, `createdByUserId`, `updatedAt` and `updatedByUserId`. In the table below, a question mark marks a nullable or optional value.

| Key | Type | Description |
| --- | --- | --- |
| `currentUserId` | string | ID of the signed-in actor |
| `users` | array | `{id, name, email, initials?, avatarColor?, organizationId?}` |
| `templates` | array | `{id, name, description, body}` |
| `documents` | array | Mutable records with `{title, ownerId, locationLabel?, originTemplateId?, copiedFromDocumentId?, status, deletedAt?, deletedByUserId?, body, revision, tracking}`. Status is `active` or `deleted`. Revision starts at 0. Tracking contains `{mode, createdAt, createdByUserId, updatedAt, updatedByUserId}`, with mode `off`, `mine` or `everyone`. |
| `documentActivity` | array | Mutable records with `{documentId, userId, openedAt?, isFavorite}`, one per document and actor |
| `commentThreads` | array | Mutable records with `{documentId, anchor, status, messages, resolvedAt?, resolvedByUserId?, deletedAt?, deletedByUserId?}`. Status is `active`, `resolved` or `deleted`. Anchor is `{start, end, quote, detached}`. The first message starts the thread. |
| `trackedChanges` | array | Mutable records with `{documentId, authorId, kind, range, before, after, formatScope?, status, decidedAt?, decidedByUserId?}`. Range is `{start, end}`. Kind is `insert`, `delete`, `replace` or `format`. Format scope is `inline` or `paragraph`. Status is `pending`, `accepted`, `rejected` or `withdrawn`. |
| `shareInvitations` | array | Mutable records with `{documentId, recipients, permission, message?, status}`. Recipients are `{email, userId?}`. Status is `sent`. |
| `shareGrants` | array | Mutable records with `{documentId, email, userId?, permission, invitationId?, status, revokedAt?, revokedByUserId?}`, keyed by document and normalized email. Status is `active` or `revoked`. |
| `shareLinks` | array | Mutable records with `{documentId, scope, permission?, organizationId?, recipientEmails, path, status, lastCopiedAt?, lastCopiedByUserId?, revokedAt?, revokedByUserId?}`. Scope is `anyone`, `organization`, `existingAccess` or `specificPeople`. Status is `active` or `revoked`. Path is `/share/<linkId>`. |

- **Body** is `{blocks}`. Each block is `{id, style, list, alignment, runs}`. Style is `normal`, `title`, `heading1` or `heading2`. List is `null`, `bullet` or `number`. Alignment is `left`, `center` or `right`. A run is `{text, marks}` with marks from `bold`, `italic` and `underline`.
- **Fragment** is `{blocks}` with the block shape and no block IDs. An empty fragment has an empty `blocks` array. A range or comment anchor uses half-open UTF-16 offsets with one newline between accepted blocks.
- **Message** is `{id, authorId, body, mentionUserIds, createdAt, editedAt?, editedByUserId?, deletedAt?, deletedByUserId?}`.
- **Permission** is `edit`, `review`, `view` or `viewNoDownload`. An `existingAccess` link has a null permission and resolves the current direct role.

### Default IDs

| Collection | Count | Fixed IDs and fixtures |
| --- | --- | --- |
| `users` | 32 | `usr_avery` (default actor), `usr_riley`, `usr_mina`, `usr_jordan` |
| `templates` | 6 | `tpl_project_brief`, `tpl_meeting_notes`, `tpl_policy_draft`, `tpl_weekly_update`, `tpl_research_memo`, `tpl_handover_notes` |
| `documents` | 48 | `doc_launch_brief`, `doc_policy_revision`, `doc_vendor_review`, `doc_private_notes`, `doc_expense_reference` |
| `documentActivity` | 56 | `activity_avery_doc_launch_brief`, `activity_avery_doc_policy_revision`, `activity_avery_doc_vendor_review` |
| `commentThreads` | 56 | `thread_launch_target`, `thread_launch_rollout`, `thread_seed_02` through `thread_seed_55` |
| `trackedChanges` | 48 | `change_policy_insert`, `change_policy_delete`, `change_policy_accepted`, `change_policy_rejected`, `change_seed_00` through `change_seed_43` |
| `shareInvitations` | 40 | `invite_seed_0` through `invite_seed_39` |
| `shareGrants` | 48 | `grant_vendor_avery`, `grant_expense_avery`, and `grant_seed_` IDs for the other grants |
| `shareLinks` | 36 | `link_launch_review`, `link_expense_reference`, `link_seed_2` through `link_seed_35` |

## Minimal Inject Example

Send this as the `state` value in a `set` request. The editor route is `/documents/doc_example?sid=<sid>`.

```json
{
  "currentUserId": "usr_example",
  "users": [{"id": "usr_example", "name": "Sam Rivera", "email": "sam@example.com"}],
  "templates": [],
  "documents": [{"id": "doc_example", "ownerId": "usr_example", "title": "Draft agenda", "status": "active"}],
  "documentActivity": [],
  "commentThreads": [],
  "trackedChanges": [],
  "shareInvitations": [],
  "shareGrants": [],
  "shareLinks": []
}
```

## Observable State Changes (for LLM evaluation)

“Update metadata” means `updatedAt` and `updatedByUserId`. All new top-level records have creation and update metadata. Soft-deleted and decided records remain queryable by ID.

| User Action | State Field Changed |
| --- | --- |
| Open a library row | Upserts `documentActivity` for the actor/document. Writes `openedAt` and update metadata. |
| Favorite or unfavorite | Upserts the same `documentActivity` row. Writes `isFavorite` and update metadata. |
| Create blank, create from template, or create a copy | Appends an active `documents` record with actor as `ownerId`, independent `body.blocks[].id`, `revision: 0`, `tracking.mode: off`, and appropriate `originTemplateId` or `copiedFromDocumentId`. Appends `documentActivity` with `openedAt` and `isFavorite: false`. |
| Rename | Writes `documents[].title` and update metadata. |
| Delete a document | Writes `documents[].status: deleted`, `deletedAt`, `deletedByUserId` and update metadata. |
| Type, paste, cut, delete, or format accepted text | Writes `documents[].body`, increments `revision` once and writes update metadata. Text edits remap affected `commentThreads[].anchor` and pending `trackedChanges[].range` while preserving their audit metadata. |
| Post a comment | Appends a `commentThreads` record with `documentId`, `anchor`, `status: active` and a first `messages[]` record with its own `id`, `authorId`, `createdAt`, `body` and `mentionUserIds`. |
| Reply | Appends a message to `commentThreads[].messages` with its own ID, body, author, time and `mentionUserIds`. Updates thread metadata. |
| Edit comment or reply | Writes the message’s `body`, `mentionUserIds`, `editedAt` and `editedByUserId`. Updates thread metadata. |
| Delete a reply | Writes the message’s `deletedAt` and `deletedByUserId`. Updates thread metadata. |
| Delete a thread | Writes starter message deletion metadata and thread `status: deleted`, `deletedAt`, `deletedByUserId` and update metadata. |
| Resolve or reopen | Writes thread `status`, `resolvedAt`, `resolvedByUserId` and update metadata. Reopen clears both resolution fields. |
| Set Track Changes | Writes `documents[].tracking.mode`, tracking update metadata and document update metadata. Fills in missing tracking creation metadata for an injected document. |
| Propose a text or format edit | Appends a pending `trackedChanges` record with `documentId`, `authorId`, `range`, `kind`, `before`, `after` and `formatScope` for formatting. |
| Edit an existing own proposal | Writes `trackedChanges[].after`, `kind` and update metadata. Restoring the accepted fragment writes `status: withdrawn`, `decidedAt` and `decidedByUserId` along with `after` and update metadata, preserving `kind`. |
| Accept one or all | Writes `trackedChanges[].status: accepted`, `decidedAt`, `decidedByUserId` and update metadata. Applies selected `after` fragments to `documents[].body`, increments `revision` once per action, stamps document update metadata, and remaps affected comment anchors and remaining pending ranges. |
| Reject one or all | Writes `trackedChanges[].status: rejected`, `decidedAt`, `decidedByUserId`, change update metadata and document update metadata. |
| Send invitations | Appends one `shareInvitations` record with `documentId`, `recipients`, `permission`, `message` and `status: sent`. Upserts `shareGrants` by `documentId` and normalized `email` with `userId`, `permission`, `invitationId`, `status: active`, cleared revocation fields and update metadata. |
| Copy link | Creates or reuses an active `shareLinks` record for the same `documentId`, `scope`, `permission`, `organizationId` and `recipientEmails` set. Writes the canonical `path`, `lastCopiedAt`, `lastCopiedByUserId` and update metadata, and sets `status: active`. |
| Change a person’s permission | Writes `shareGrants[].permission` and update metadata. |
| Remove a person or link | Writes the selected `shareGrants[]` or `shareLinks[]` record’s `status: revoked`, `revokedAt`, `revokedByUserId` and update metadata. |

Search, sort, filter, direct-link hydration, sharing-link redemption, mode selection, outline, zoom, print preview, markup display, review navigation and unsubmitted drafts are read-only.
