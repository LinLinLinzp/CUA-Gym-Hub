# Microsoft Word for the web data model

This is the planned Harbor state shape. Implement `createInitialData()` in `src/data/seed.js` and keep the eventual `SCHEMA.md` aligned with the actual code. A business mutation updates the relevant records together and saves the resulting full state through the provided data manager.

## Root state and conventions

| Key | Type | Seed example or count |
| --- | --- | --- |
| `currentUserId` | string | `usr_avery` |
| `users` | `User[]` | 32 |
| `templates` | `Template[]` | 6 |
| `documents` | `Document[]` | 48 |
| `documentActivity` | `DocumentActivity[]` | 44 or more |
| `commentThreads` | `CommentThread[]` | 56 |
| `trackedChanges` | `TrackedChange[]` | 48 |
| `shareInvitations` | `ShareInvitation[]` | 40 |
| `shareGrants` | `ShareGrant[]` | 48 |
| `shareLinks` | `ShareLink[]` | 36 |

- IDs are opaque strings with readable, fixed values in fixtures and collision-resistant IDs for user-created records. IDs, foreign keys, enums and timestamps are JSON values. Seed timestamps are fixed ISO strings, for example `2026-09-14T15:30:00.000Z`. Action timestamps come from `new Date().toISOString()`.
- Every mutable top-level entity below includes `id: string`, `createdAt: ISO string`, `createdByUserId: string`, `updatedAt: ISO string` and `updatedByUserId: string`. On creation the update fields equal the creation fields. `Message` uses its author and explicit edit/deletion fields. Seed-only `User` and `Template` have their own full shapes below.
- `ID?` or `ISO?` in a table permits missing or `null`. Nullable fields cleared by an action should be written as `null`. Filter relations by document ID and tolerate references to missing users/documents in injected worlds. Missing collections render as empty, and optional presentation text has neutral fallbacks. Avoid auto-repair writes on load. When `currentUserId` is missing from `users`, keep the library browsable and present safe empty or unavailable states for actor-dependent actions.

`createInitialData()` returns one object with the ten keys above. Define people and original templates first, then documents and related records. Validate seed IDs, parent references and revision ranges before shipping. Template IDs include `tpl_project_brief`, `tpl_meeting_notes` and `tpl_policy_draft`.

## Users and templates

| Record | Field | Type and example |
| --- | --- | --- |
| `User` | `id` | string, `usr_avery` |
| | `name`, `email` | strings, `Avery Morgan`, `avery.morgan@northwind.example.com` |
| | `initials`, `avatarColor` | optional strings, `AM`, `#285D78` |
| | `organizationId` | ID?, `org_northwind` or `null` for an external contact |
| `Template` | `id` | string, `tpl_project_brief` |
| | `name`, `description` | strings, `Project Brief`, `Scope, milestones and ownership for a new initiative` |
| | `body` | `Body`, original starter text and styles |

An invitation can target a valid normalized address without a corresponding `User`. If an injected user has that email later, their active direct grant is matched by email.

## Documents and document activity

| Record | Field | Type and example |
| --- | --- | --- |
| `Document` | `title` | string, `Northwind Launch Brief` |
| | `ownerId` | ID, `usr_avery` |
| | `locationLabel` | optional string, `OneDrive · Documents` |
| | `originTemplateId`, `copiedFromDocumentId` | ID?, active creation sets at most one, such as `tpl_project_brief` |
| | `status` | `active` or `deleted` |
| | `deletedAt`, `deletedByUserId` | ISO?, ID? |
| | `body` | `Body`, the accepted content |
| | `revision` | non-negative integer, `3`; starts at `0` and increments on each accepted-content mutation |
| | `tracking` | `{mode, createdAt, createdByUserId, updatedAt, updatedByUserId}`, where `mode` is `off`, `mine`, or `everyone` and new documents start `off` |
| `DocumentActivity` | `documentId`, `userId` | IDs, `doc_launch_brief`, `usr_avery`; one row per pair |
| | `openedAt` | ISO?, `2026-10-22T09:15:00.000Z` |
| | `isFavorite` | boolean, `true` |

For library order, use the last explicit `openedAt` for Recent and `updatedAt` for Last modified, with a deterministic ID tie-break. Recent can fall back to accessible documents sorted by modification time if there is no open history. Treat an absent `tracking` as Off. A blank document starts with one empty normal paragraph. A duplicate copies accepted content but starts at revision zero with its own body block IDs. A library click updates the activity row even when opened from search. Initial loads, editor links, link redemption and reloads leave activity unchanged. For an inactive/deleted document, hide the editor and links without stripping its history from state.

## Editor body, ranges and patches

| Structure | Fields and example |
| --- | --- |
| `Body` | `{blocks: Block[]}` |
| `Block` | `{id: string, style: "normal" \| "title" \| "heading1" \| "heading2", list: null \| "bullet" \| "number", alignment: "left" \| "center" \| "right", runs: Run[]}` |
| `Run` | `{text: string, marks: ("bold" \| "italic" \| "underline")[]}`, e.g. `{ "text": "October launch", "marks": ["bold"] }` |
| `Range` | `{start: integer, end: integer}`; half-open offsets into accepted text using JavaScript UTF-16 code units, with one newline separator between blocks. A caret or insertion has `start === end`. |
| `Fragment` | `{blocks: FragmentBlock[]}`, with the block shape minus `id`. A plain empty fragment is `{ "blocks": [] }`. An empty paragraph carrying a style is a fragment block with empty `runs`. |

Example accepted body for a one-paragraph document:

```json
{
  "blocks": [
    {
      "id": "blk_launch_001",
      "style": "normal",
      "list": null,
      "alignment": "left",
      "runs": [{ "text": "Target: 12 October.", "marks": [] }]
    }
  ]
}
```

- Keep offsets at valid character boundaries. Use the same coordinate mapping for typing, selection, markup, keyboard editing and verifier expectations. Preserve unaffected runs and block attributes when applying changes. Split or join blocks for newlines and cross-paragraph selections. Allocate block IDs for genuinely new accepted paragraphs. Empty paragraphs and styles remain representable.
- A revision stores the accepted fragment at its range and a replacement fragment. A partial-block text/inline formatting edit replaces only that fragment, preserving existing paragraph attributes. A paragraph-format edit covers the affected paragraph(s) and replaces paragraph attributes as well. This includes empty paragraphs, for which the containing block is identified by the caret and stored range. `format` revisions carry `formatScope: "inline"` or `"paragraph"`. Reject ignores the proposal. Accept applies the replacement. A bulk accept applies all disjoint pending replacements right to left against original offsets, then remaps outstanding anchors and ranges in one transaction.
- Project pending changes in document order from the accepted body. Inline additions display as inserted content and removed text is still available for All Markup. Keyboard input in the actor’s pending insertion or replacement updates that proposal in place. If the entire proposal returns to its original accepted fragment, write `status: "withdrawn"` with decision/update metadata and remove its markup. If an edit would cross an existing pending range or overlap another author’s change, show feedback and let the user decide that change before making the overlapping edit. Permit disjoint edits. Treat coincident zero-width ranges as overlapping and use a consistent boundary affinity for adjacent ranges.
- On accepted edits, translate later anchors and pending ranges by the edit delta. Preserve an anchor through partially surviving text. If its entire selected text is removed, or if its stored position is invalid in an injected world, treat it as detached and retain its original quote for context. An invalid pending revision may be rejected or shown as unavailable to accept. For selection in pending-only text, anchor the comment to the corresponding accepted caret and retain the selected quote. Anchor/range remaps are structural writes and preserve the thread/decision audit fields.

## Comment threads

| Record | Field | Type and example |
| --- | --- | --- |
| `CommentThread` | `documentId` | ID, `doc_launch_brief` |
| | `anchor` | `{start: integer, end: integer, quote: string, detached: boolean}`, e.g. `{ "start": 0, "end": 6, "quote": "Target", "detached": false }` |
| | `status` | `active`, `resolved`, `deleted` |
| | `resolvedAt`, `resolvedByUserId`, `deletedAt`, `deletedByUserId` | ISO? / ID? pairs |
| | `messages` | `Message[]`, first entry is the thread starter, replies follow creation order |
| `Message` | `id`, `authorId` | IDs, `msg_launch_01`, `usr_riley` |
| | `body`, `mentionUserIds` | string, `@Avery Morgan Could we confirm this date?`; `ID[]`, `["usr_avery"]` |
| | `createdAt` | ISO string |
| | `editedAt`, `editedByUserId`, `deletedAt`, `deletedByUserId` | ISO? / ID? pairs |

Post/reply and explicit edits stamp thread update metadata. Replies on resolved threads require reopening. Deleting the starter marks the thread deleted and stamps deletion on the starter; deleting a reply stamps only that reply plus thread update metadata. On reopen, clear `resolvedAt` and `resolvedByUserId`. Keep deleted text out of rendered views. List view can show detached threads and their quote.

## Tracked changes

| Field | Type and example |
| --- | --- |
| `documentId`, `authorId` | IDs, `doc_launch_brief`, `usr_riley` |
| `kind` | `insert`, `delete`, `replace`, `format` |
| `range` | `Range`, `{ "start": 8, "end": 18 }` |
| `before`, `after` | `Fragment`; e.g. `12 October` before and `15 October` after with the same block attributes |
| `formatScope` | optional `inline` or `paragraph` for `kind: "format"` |
| `status` | `pending`, `accepted`, `rejected`, `withdrawn` |
| `decidedAt`, `decidedByUserId` | ISO?, ID? |

Capture author and original accepted fragment at proposal creation. Same-author updates within that proposal retain its ID and creation fields. Pending changes survive turning tracking off. For Everyone tracks all eligible edits; Just Mine applies to the user recorded in `tracking.updatedByUserId`. Review-mode suggestions are always tracked. Editing access can decide. Store the decision and document mutation together. Retain a decided record and its decision-time coordinates for evidence. Order pending changes by range start, creation time, then ID. Proposals update `trackedChanges`; accepting or rejecting also updates document metadata, and accepting increments the accepted revision. When tracking is Off, direct edits still remap pending ranges.

## Invitations and direct grants

Use permission values `edit`, `review`, `view`, `viewNoDownload`, corresponding to the UI labels Can edit, Can review, Can view and Can’t download. Normalize addresses by trimming and lowercasing, and use email as the deduplication key within a document.

| Record | Field | Type and example |
| --- | --- | --- |
| `ShareInvitation` | `documentId` | ID, `doc_launch_brief` |
| | `recipients` | array of `{email: string, userId: ID?}`, e.g. `[{ "email": "riley.chen@northwind.example.com", "userId": "usr_riley" }]` |
| | `permission`, `message`, `status` | permission enum, string or null, `sent`; message example `Please review the proposed date.` |
| `ShareGrant` | `documentId`, `email`, `userId` | ID, normalized string, ID? |
| | `permission`, `status` | permission enum; `active` or `revoked` |
| | `invitationId` | ID? of latest invitation for this grant, optional for imported fixtures |
| | `revokedAt`, `revokedByUserId` | ISO?, ID? |

Invites and grants share a transaction. Upsert one grant per `(documentId, email)` and clear revocation fields on re-invite. Keep previous invitations available as history. The owner has implicit access and is excluded from recipient chips and editable grants. Editing users can invite and create links. Owner actions in Manage access edit or revoke individual grants and revoke links. Badge counts and the Shared with me filter derive from active relationships.

## Sharing links and access

| Field | Type and example |
| --- | --- |
| `documentId` | ID, `doc_launch_brief` |
| `scope` | `anyone`, `organization`, `existingAccess`, `specificPeople` |
| `permission` | permission enum or `null` for `existingAccess` |
| `organizationId` | ID?, required with `organization` |
| `recipientEmails` | normalized `string[]`, required nonempty with `specificPeople` |
| `path` | string derived from ID, e.g. `/share/link_launch_review` |
| `status` | `active` or `revoked` |
| `lastCopiedAt`, `lastCopiedByUserId` | ISO?, ID? |
| `revokedAt`, `revokedByUserId` | ISO?, ID? |

- Reuse a matching active link for identical document, scope, permission, organization and sorted recipient set; update last-copy and update metadata on every explicit copy. Copy/paste URL uses the current origin plus the canonical path with `?sid=` when present. Render a copyable URL even when clipboard permissions are unavailable. Revoked links get a new ID if recreated. Saving settings alone leaves no record. An organization scope requires the link creator’s organization. An existing-access link has `permission: null` and follows the current direct role. Opening a link creates no share or activity records.
- Direct editor routes admit the owner or an active matching direct grant. Share routes first require an active link, then evaluate its audience using the current user’s organization or normalized email. Within an eligible share route, take the stronger role between direct and link access (`owner` > `edit` > `review` > `view` > `viewNoDownload`). Viewers read, reviewers suggest and comment, editors can change accepted content and decide suggestions, and owners can also manage access and delete. Preserve the link context when rendering the editor through `/share/:linkId`. Evaluate state on reload, so a revoked link is unavailable even for the owner while the owner’s canonical editor route still works.

## Seed plan and fixtures

Use original, English work documents across operations, finance, proposals, meeting notes and policies. Provide topic overlaps for search (such as six files with `Launch` in the title) and orderable titles and times. Most documents can have 2–5 blocks. Include a few with longer content, an empty document, older records, and deleted records. Create active/resolved/deleted threads, seeded cross-author replies and mentions, insert/delete/replace/format revisions in each decision state, and active/revoked grants and links with internally consistent history.

| Fixed document ID | Purpose |
| --- | --- |
| `doc_launch_brief` | Avery owns **Northwind Launch Brief** and has favorited it. Contains `Target: 12 October.` in its first block and both an active anchored thread and a resolved thread. Seed a valid review link `link_launch_review` and at least two direct roles on this document. |
| `doc_policy_revision` | Avery owns **Remote Work Policy Draft** with pending insertion and deletion at disjoint in-bounds ranges, plus a prior accepted and rejected revision. The verifier can accept one, reject the other and inspect accepted text and revision count. |
| `doc_vendor_review` | Riley owns **Vendor Onboarding Checklist** and has a direct `review` grant for Avery. Verify that comments and proposals are writable and decisions are disabled. |
| `doc_private_notes` | **Workshop Planning Notes** is an active document Avery owns with zero active grants/links. Use for invitation and permission tasks. |
| `doc_expense_reference` | **Expense Policy Reference** is a document accessible to Avery via a `viewNoDownload` direct grant. Use it for read-only and print-control checks. |
