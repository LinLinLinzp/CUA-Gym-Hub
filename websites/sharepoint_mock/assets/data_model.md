# SharePoint state design

The session owns a JSON object with nine top-level keys. All IDs are opaque strings. Use fixed IDs and fixed ISO timestamps for seed records, collision-safe IDs on user creation and `new Date().toISOString()` on successful mutations. Read the actor from `account.userId`. For injected data, tolerate missing descriptions, timestamps, actor references, column definitions, option arrays and values by using rendering fallbacks without persisting them.

## Top-level keys and record shapes

| Key | Type | Shape and sample values |
|---|---|---|
| `account` | object | `userId` string `"user-morgan-ellis"`, `organization` string `"Acme"` |
| `users` | array | `id` string `"user-morgan-ellis"`, `displayName` string `"Morgan Ellis"`, `email` string `"morgan.ellis@acme.example"`, `role` string `"Workplace operations lead"` |
| `sites` | array | `id` string `"site-workplace-operations"`, `name` string `"Workplace Operations"`, `description` string `"Facilities requests and workplace procedures."`, `type` enum `"team"` or `"communication"`, `ownerId` user ID, plus the audit fields below |
| `siteFollows` | array | `id` string `"follow-morgan-workplace"`, `siteId` site ID, `userId` user ID, `createdAt` ISO date-time string `"2026-08-11T13:00:00.000Z"` |
| `lists` | array | `id` string `"list-facilities-requests"`, `siteId` site ID, `name` string `"Facilities Requests"`, `description` string `"Track requests from submission through resolution."`, `columns` array of column definitions, plus audit fields |
| `listItems` | array | `id` string `"item-facilities-001"`, `listId` list ID, `title` string `"Replace meeting room display"`, `values` object such as `{"col-status":"In progress","col-estimate":325,"col-due":"2026-09-15"}`, plus audit fields |
| `libraries` | array | `id` string `"lib-workplace-documents"`, `siteId` site ID, `name` string `"Documents"`, `description` string `"Shared operating documents."`, `isDefault` boolean `true`, plus audit fields |
| `libraryEntries` | array | `id` string `"entry-workplace-guide"`, `libraryId` library ID, `parentId` folder ID or `null` for root, `kind` enum `"file"` or `"folder"`, `name` string `"Office visitor guide.txt"`, plus audit fields. File-only fields are `sizeBytes` nonnegative integer e.g. `384`, `mimeType` string e.g. `"text/plain"` and `contentUrl` string or `null`, e.g. `"/seed-files/office-visitor-guide.txt"`. |
| `removals` | array | `id` string, `kind` enum `"unfollowSite"`, `"deleteListItems"` or `"deleteLibraryEntries"`, `scopeId` string containing the site, list or library ID respectively, `recordIds` array of affected follow, item or entry ID strings, `createdBy` user ID string and `createdAt` ISO date-time string. |

Audit fields are `createdBy` and `updatedBy` (user ID strings), and `createdAt` and `updatedAt` (ISO date-time strings). Use the same actor and timestamp for create/update fields on insertion. Preserve the creation fields on edits. Follow records use `userId` as actor. Remove records on confirmed delete or unfollow.

A column definition is `{ id, name, type, required, options }`. Its `id` and `name` are strings such as `"col-status"` and `"Status"`. Types are `text`, `number`, `date` and `choice`. `required` is a boolean and `options` is an array of unique strings such as `["New","In progress","Resolved"]` for choice types and an empty array otherwise. The built-in Title column is always `{ "id":"title", "name":"Title", "type":"text", "required":true, "options":[] }`; its value is stored on the item as `title`. Other values are keyed by column ID. Store finite JSON numbers for numeric input, `YYYY-MM-DD` strings for date-only input, strings for text and choice, and omit optional blank values. Adding a required column leaves legacy rows readable and enforces the rule on their next edit.

## Relationships and naming

- One account actor can follow many sites. Keep at most one follow per `siteId` and `userId`. Resolve author display names through `users`; use an initials or generic fallback when absent.
- One site owns lists and libraries via `siteId`. Use stable IDs in URLs so renames do not affect links. Site names are unique across the directory; list and library names are unique within their corresponding kind and site.
- A list owns list items via `listId`. Column IDs and names must be unique within a list. Keep unedited injected field values intact when saving an existing item.
- A library owns entries via `libraryId`. A non-null `parentId` references a folder in the same library. Scope sibling name uniqueness to `libraryId` and `parentId`. Prevent cycles when moving folders. Delete descendants by ID in a single update. A move preserves the source ID and only changes the parent and modification metadata.
- Trim names before validation, compare duplicates case-insensitively and reject empty names. For entries reject slash, backslash and names consisting solely of `.` or `..`.

## Upload, preview and fixture resilience

Stage file inputs and validate names before sending accepted bytes to the same-origin Harbor `POST /upload?sid=…` multipart endpoint. Append successfully returned entries in one save and store returned `url`, `size` and `content_type` as `contentUrl`, `sizeBytes` and `mimeType`. Surface failures without adding phantom entries. Use same-origin local seed assets or Harbor files for preview and download. Preview safe formats such as plain text and raster images, with a metadata view for other formats or absent URLs.

Scope all lookups to their route parents. Empty arrays display empty collections. Stale parents, missing route targets and cyclic injected folder ancestry must produce bounded fallbacks. State remains unchanged when navigating, searching, sorting, filtering, previewing, cancelling or failing validation.

## Initial data

`createInitialData()` in `src/data/seed.js` returns `{ account, users, sites, siteFollows, lists, listItems, libraries, libraryEntries, removals }` with fresh JSON-compatible collections each call. Seed 12 synthetic users, 24 sites (both types), 8 current-account follows, 30 lists, 30 libraries, at least 120 list items and at least 144 library entries. Initialize `removals` to an empty array. Give each site a Documents library. Populate Workplace Operations with a dense Facilities Requests list and two full library levels so filters and folder navigation can be tested on the initial account. Populate other sites with coherent departmental content and include empty collections inside the catalog. Use varied labels, owners, dates, statuses, file formats and file sizes. Keep fixture dates invariant. Generate stable IDs from fixed data, with no runtime randomness or network dependencies in the seed.
