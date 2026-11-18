# figma_mock Schema

**Base URL** `http://localhost:5507/`  
**Go Endpoint** `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject** `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset** `POST /post?sid=<sid>` with body `{"action":"reset"}`

## State Schema

The state is JSON. IDs are opaque strings and timestamps are UTC ISO 8601 strings. The signed-in actor is `account.currentUserId`. The template computes `state_diff` by top-level key and resets the session's current state to the initial snapshot.

**Audit** means `createdAt`, `createdById`, `updatedAt`, and `updatedById`. A creation sets all four. An edit stamps only the two update fields. Related writes in one transaction share the same actor and timestamp.

| Key | Shape |
| --- | --- |
| `account` | Object with `currentUserId` and `workspaceName`. |
| `users[]` | `id`, `name`, `email`, `avatarColor`. |
| `folders[]` | `id`, `name`, `description`, `status` (`active` or `archived`), Audit. |
| `files[]` | `id`, `name`, `ownerId`, nullable `folderId` and `sourceFileId`, `status` (`active` or `trashed`), `preview`, `linkAccess`, nullable `trashedAt`, `trashedById`, `restoredAt`, `restoredById`, Audit. |
| `pages[]` | `id`, `fileId`, `name`, numeric `position`, Audit. |
| `layers[]` | `id`, `fileId`, `pageId`, nullable `parentLayerId`, `name`, `kind` (`frame`, `shape`, `text`, `component`, or `instance`), nullable `componentId`, numeric `position`, `geometry`, nullable `fill` and `text`, Audit. Geometry contains numeric `x`, `y`, `width`, and `height` in a 960 × 600 coordinate space. |
| `components[]` | `id`, `fileId`, `pageId`, `mainLayerId`, `name`, `description`, `status` (`local` or `published`), nullable `publishedAt` and `publishedById`, Audit. |
| `commentThreads[]` | `id`, `fileId`, `pageId`, nullable `layerId`, numeric `x` and `y` normalized to [0, 1], `body`, `status` (`open` or `resolved`), nullable `resolvedAt`, `resolvedById`, `reopenedAt`, `reopenedById`, Audit. |
| `commentReplies[]` | `id`, `threadId`, `body`, Audit. |
| `fileAccess[]` | `id`, `fileId`, nullable `userId`, normalized `email`, `role` (`view` or `edit`), `status` (`active`, `pending`, or `removed`), nullable `removedAt` and `removedById`, Audit. |
| `fileStars[]` | `id`, `fileId`, `userId`, `status` (`starred` or `unstarred`), Audit. |

A file in Drafts has `folderId=null`. File preview values are `checkout`, `dashboard`, `component-board`, `onboarding`, `travel-map`, `type-specimen`, and `blank`. `files[].linkAccess` contains `audience` (`invited` or `anyone`), `role` (null for `invited`, otherwise `view` or `edit`), and `updatedAt` and `updatedById`.

Effective access uses the highest applicable role from ownership, an active direct grant, and the stored link policy. Readable files support feedback, starring, duplication and copying links. Editors can change the document or move and rename it. Owners manage invitations, link policy, and Trash.

### Default IDs

| Entity | Seed IDs |
| --- | --- |
| Users | `user-maya`, `user-jules`, `user-serena` |
| Folders | `folder-commerce`, `folder-design-system`, `folder-explorations`, `folder-studio-archive` |
| Files | `file-checkout`, `file-field-kit`, `file-onboarding`, `file-help-center`, `file-restricted`, `file-old-map` |
| Pages | `page-checkout-mobile`, `page-checkout-2`, `page-field-kit-core`, `page-notes-1` |
| Layers | `layer-checkout-pay`, `layer-field-kit-primary` |
| Components | `component-primary-button` |
| Comments and replies | `thread-checkout-001`, `reply-checkout-001` |
| Access and stars | `access-checkout-001`, `star-001` |

## Minimal Inject Example

Pass this object as `state` in a fresh session. Arrays replace their seeded counterparts and the account object merges with defaults.

```json
{
  "account": { "currentUserId": "user-maya" },
  "users": [{ "id": "user-maya", "name": "Maya Chen", "email": "maya.chen@example.test" }],
  "folders": [],
  "files": [{ "id": "file-review", "name": "Design review", "ownerId": "user-maya" }],
  "pages": [{ "id": "page-review", "fileId": "file-review", "name": "Page 1" }],
  "layers": [],
  "components": [],
  "commentThreads": [],
  "commentReplies": [],
  "fileAccess": [],
  "fileStars": []
}
```

## Observable State Changes (for LLM evaluation)

Each successful row below has one `set_current` POST. An edit stamp refers to `updatedAt` and `updatedById`.

| User action | Records and fields written |
| --- | --- |
| Create file | Append an active, actor-owned `files[]` record with the destination `folderId`, `sourceFileId=null`, `preview=blank`, invited policy and null lifecycle fields. Append a linked `pages[]` record named Page 1 at position 0. Both get Audit. |
| Rename / move | Update `files[].name` or `files[].folderId`, respectively, and the file edit stamp. |
| Duplicate | Append `files[]` with `sourceFileId`, fresh owner, policy, lifecycle and Audit. Append copied `pages[]`, `layers[]` and `components[]` with fresh IDs and Audit, remapping `fileId`, `pageId`, `parentLayerId`, `mainLayerId` and local `componentId` as applicable. External component IDs remain linked. Copied mains are local with null publication fields. |
| Star / unstar | Upsert `fileStars[]` for the file and actor. Set `status` and the edit stamp. New records also get a fresh `id` and creation metadata. |
| Trash | Set `files[].status=trashed`, `trashedAt`, `trashedById`, and file edit stamp. |
| Restore | Set `files[].status=active`, clear `trashedAt` and `trashedById`, set `restoredAt` and `restoredById`, and stamp the file. Set `folderId=null` if the original folder is unavailable. |
| Post comment | Append an open `commentThreads[]` record with file, page, optional layer, normalized coordinates, trimmed body, null resolution/reopening fields, and Audit. |
| Post reply | Append `commentReplies[]` with parent `threadId`, trimmed body, and Audit. Stamp that thread in the same transaction. |
| Resolve | Set `commentThreads[].status=resolved`, `resolvedAt`, `resolvedById`, and thread edit stamp. |
| Reopen | Set `commentThreads[].status=open`, clear `resolvedAt` and `resolvedById`, set `reopenedAt` and `reopenedById`, and stamp the thread. |
| Add shape | Append a `layers[]` shape with file/page, position, geometry, fill, null parent/component/text, and Audit. Stamp the file. |
| Create component | Append `components[]` with file/page, `mainLayerId`, name, description, local status, null publication fields, and Audit. Set the existing layer’s `kind=component`, `componentId`, `name` and its edit stamp. Stamp the file. |
| Edit component | Update `components[].name` and `description` and stamp the component and file. When renamed, update `layers[].name` and the source layer edit stamp. |
| Publish library | Set `components[].status=published`, `publishedAt`, `publishedById`, and edit stamp for each selected main. Stamp the file. |
| Insert instance | Append `layers[]` with `kind=instance`, source `componentId`, destination file/page, position, geometry, and Audit. Stamp the destination file. |
| Invite | Append `fileAccess[]` with normalized email, role, file ID, null removal fields, and Audit. Directory recipients receive `status=active` and their `userId`. Other addresses get `status=pending` and `userId=null`. |
| Change role | Update `fileAccess[].role` and grant edit stamp. |
| Remove access | Set `fileAccess[].status=removed`, `removedAt`, `removedById`, and grant edit stamp. |
| Save link access | Update the file’s `linkAccess.audience`, `role`, `updatedAt`, and `updatedById`. |
| Copy link | No persisted changes. The clipboard gets a current-origin design URL with the session parameter. |

Navigation, search, filters, tool selection, opening a dialog, canceled edits, rejected submissions, and idle time do not write business state.

