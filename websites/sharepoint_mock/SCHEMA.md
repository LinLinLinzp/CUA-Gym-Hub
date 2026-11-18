# sharepoint_mock Schema

**Base URL**: `http://localhost:5394/`  
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}`

`GET /state?sid=<sid>` returns `{stored_state, has_custom_state, sid}`. The first `set` establishes the initial snapshot. Later `set` and `set_current` calls update the current snapshot, and `reset` restores the initial snapshot. Each changed top-level key in `state_diff` contains its current value under `modified` or `added`. Use a fresh session ID when injecting a new browser fixture so the state client loads it from the server.

## State Schema

| Key | Record shape |
| --- | --- |
| `account` | Object with `userId` and `organization` strings. The default actor is `user-morgan-ellis` in Acme. |
| `users` | Array of `{ id, displayName, email, role }` strings. |
| `sites` | Array of `{ id, name, description, type, ownerId, ...audit }` records. `type` is `team` or `communication`. |
| `siteFollows` | Array of `{ id, siteId, userId, createdAt }` records. The account can follow each site once. |
| `lists` | Array of `{ id, siteId, name, description, columns, ...audit }` records. `columns` contains column definitions. |
| `listItems` | Array of `{ id, listId, title, values, ...audit }` records. `values` maps column IDs to typed values. |
| `libraries` | Array of `{ id, siteId, name, description, isDefault, ...audit }` records. `isDefault` is boolean. |
| `libraryEntries` | Array of `{ id, libraryId, parentId, kind, name, ...audit }` records. `kind` is `file` or `folder`. `parentId` is null at the root and a folder ID within the same library otherwise. Files also contain `sizeBytes` (nonnegative number), `mimeType` (string), and `contentUrl` (same-origin path or null). |
| `removals` | Array of `{ id, kind, scopeId, recordIds, createdBy, createdAt }` records. `recordIds` is an array of removed IDs. |

IDs are strings. Audit fields are `createdBy`, `createdAt`, `updatedBy`, and `updatedAt`. Actor fields contain user IDs. Timestamp fields use ISO 8601 UTC. User actions use the session clock and keep creation fields intact on edits.

Each column is `{ id, name, type, required, options }`. `type` is `text`, `number`, `date`, or `choice`. `options` contains the allowed strings for choice columns and is empty for other types. The built-in column is `{ id: "title", name: "Title", type: "text", required: true, options: [] }`, and its value lives in `listItems[].title`. Other values live in `listItems[].values`. Numbers are finite JSON numbers, dates are `YYYY-MM-DD` strings, and text and choices are strings. Optional blank fields are omitted on save.

### Default IDs

| Entity | Default IDs for the Workplace Operations fixture |
| --- | --- |
| Signed-in user | `user-morgan-ellis` |
| Site | `site-workplace-operations` |
| Follow | `follow-morgan-workplace-operations` |
| Lists | `list-facilities-requests`, `list-maintenance-schedule` |
| Facilities Requests columns | `title`, `col-status`, `col-due`, `col-estimate` |
| Facilities Requests item | `item-facilities-001` |
| Libraries | `lib-workplace-documents`, `lib-workplace-resources` |
| Folder | `entry-workplace-documents-guides` |
| File with local preview | `entry-workplace-documents-visitor-guide` |

### Optional fields in injected records

Sparse fixtures can omit descriptions, ownership and audit display metadata, list columns, item values, and file preview metadata. The library treats an omitted `parentId` as the root. Keep the IDs and relationship keys for the routes under test, plus the visible names or titles and the entry `kind`. A file can use `contentUrl: null` when the fixture has only metadata. Uploaded paths come from `POST /upload?sid=<sid>` and are served under `/files/`.

## Minimal Inject Example

```json
{
  "account": { "organization": "Acme Field Office" },
  "users": [],
  "sites": [{ "id": "site-field", "name": "Field Office", "type": "team" }],
  "siteFollows": [],
  "lists": [{ "id": "list-handoffs", "siteId": "site-field", "name": "Handoffs" }],
  "listItems": [{ "id": "item-briefing", "listId": "list-handoffs", "title": "Morning briefing" }],
  "libraries": [{ "id": "lib-guides", "siteId": "site-field", "name": "Guides" }],
  "libraryEntries": [{ "id": "entry-checklist", "libraryId": "lib-guides", "kind": "file", "name": "Checklist.txt" }],
  "removals": []
}
```

## Observable State Changes (for LLM evaluation)

Each successful business action sends one whole-state `set_current` through the standard Harbor client.

| User action | Fields written |
| --- | --- |
| Create site | Append one `sites[]` record with name, description, type, owner and audit fields. Append its linked `libraries[]` record with `name: "Documents"`, `isDefault: true`, and audit fields in the same save. |
| Save site details | Update the target site's `name`, `description`, `updatedBy`, and `updatedAt`. |
| Follow site | Append a `siteFollows[]` relationship with `id`, `siteId`, `userId`, and `createdAt`. |
| Unfollow site | Remove the actor's relationship and append a `removals[]` record with `kind: "unfollowSite"`, the site ID as `scopeId`, and the removed follow ID in `recordIds`. |
| Create list | Append one `lists[]` record with `siteId`, name, description, the built-in Title definition, and audit fields. |
| Add column | Append one definition to the target `lists[].columns` and stamp `updatedBy` and `updatedAt` on that list. |
| Create or edit item | Append a `listItems[]` record with `listId`, title, typed values, and audit fields, or update `title`, `values`, `updatedBy`, and `updatedAt` on the existing item. |
| Confirm item deletion | Remove the selected `listItems[]` records and append one removal with `kind: "deleteListItems"`, the list ID as `scopeId`, and all selected item IDs in `recordIds`. |
| Create library | Append one `libraries[]` record with `siteId`, name, description, `isDefault: false`, and audit fields. |
| Create folder | Append one `libraryEntries[]` record with `kind: "folder"`, `libraryId`, `parentId`, name, and audit fields. |
| Upload files | Append one `libraryEntries[]` record per successful file in a single save. Each record includes `kind: "file"`, `libraryId`, `parentId`, name, audit fields, and `contentUrl`, `sizeBytes`, and `mimeType` from Harbor's upload response. |
| Rename entry | Update the target entry's `name`, `updatedAt`, and `updatedBy`. |
| Move entry | Update the target entry's `parentId`, `updatedAt`, and `updatedBy`. |
| Copy file | Append a file entry with a new `id`, destination `parentId`, and fresh audit fields. The new entry references the same uploaded or seeded content. |
| Confirm entry deletion | Remove the selected entries and every descendant of each selected folder. Append one removal with `kind: "deleteLibraryEntries"`, the library ID as `scopeId`, and all affected IDs in `recordIds`. |

Sorting, filtering, search, navigation, previews, downloads, cancellation, and rejected submissions leave business records unchanged. Boot synchronizes the merged baseline on first load. Each session has independent browser storage and Harbor state.
