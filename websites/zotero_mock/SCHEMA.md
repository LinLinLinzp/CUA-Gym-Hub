# zotero_mock Schema

**Base URL** — `http://localhost:5427/`  
**Go Endpoint** — `GET /go?sid=<sid>` returns `{initial_state, current_state, state_diff}`. The diff lists changed top-level keys as `{modified: value}` or `{added: value}`.  
**Inject** — `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`. Use a fresh sid for a new browser test world.  
**Reset** — `POST /post?sid=<sid>` with `{"action":"reset"}` restores the server's initial state, or the seed if the sid has no initial state.

The app key is `zotero`. Read stored state with `GET /state?sid=<sid>`. On first load for a sid in a browser, provided arrays replace the seeded arrays and provided objects merge with defaults. Arrays and records below summarize the default contract. Record IDs are strings. Action times are ISO 8601 UTC strings taken from the task clock, and actor IDs refer to `account.id`.

## State Schema

| Top-level key | Shape |
| --- | --- |
| `account` | Object with string `id`, `name`, and `email`. |
| `libraries` | Array of objects with `id`, `name`, `kind` (`personal` or `group`), `description`, `visibility` (`private` or `public`), `role` (`owner`, `editor`, or `reader`), `status` (`active`), `actorId`, `createdAt`, and `updatedAt`. |
| `collections` | Array of objects with `id`, `libraryId`, nullable `parentId`, `name`, `status` (`active` or `deleted`), `actorId`, `createdAt`, `updatedAt`, and nullable `deletedAt`. Parent and child belong to the same library. |
| `items` | Array of objects with `id`, `libraryId`, string array `collectionIds`, `itemType` (`journalArticle`, `book`, `report`, or `webpage`), `title`, `creators`, `date` (YYYY, YYYY-MM, YYYY-MM-DD, or empty), `publicationTitle`, `publisher`, `place`, `volume`, `issue`, `pages`, `DOI`, `ISBN`, `url`, `abstractNote`, string array `tags`, `status` (`active` or `trashed`), `actorId`, `createdAt`, `updatedAt`, and nullable `trashedAt`. Copies include optional string `sourceItemId`. Optional metadata fields are strings and may be empty. A creator has `creatorType` and `firstName` plus `lastName`, or `creatorType` and organization `name`. |
| `citations` | Append-only array of objects with `id`, `libraryId`, string array `itemIds` in selection order, `locators` (array of `{ itemId, label, value }` with `label` equal to `page`, `chapter`, or `section`), `style` (`apa-7`, `mla-9`, or `chicago-author-date`), `mode` (`citation` or `bibliography`), plain-text `output`, `action` (`saved`, `copied`, or `downloaded`), nullable `sourceCitationId`, `status` (`completed`), `actorId`, and `createdAt`. Locator values are strings. Bibliographies have no locators. |

### Default IDs

| Key | Seed IDs |
| --- | --- |
| `account` | `usr_maya_chen` |
| `libraries` | `lib_my_library`, `lib_urban_methods`, `lib_coastal_atlas`, `lib_public_archive`, `lib_design_studio` |
| `collections` | 36 named `col_*` IDs, including `col_article_drafts`, its child `col_spatial_evidence`, and `col_reading`. The fixed keys are listed in `src/data/seed.js` under `collectionSets`. |
| `items` | `item_corner_stores`, then `item_002` through `item_108` |
| `citations` | `cite_001` through `cite_030` |

## Minimal Inject Example

Submit the following value as the `state` property of a `set` request.

```json
{
  "account": { "id": "usr_example", "name": "Jamie Rivera", "email": "jamie@example.test" },
  "libraries": [{ "id": "lib_example", "name": "Research Library", "kind": "personal", "role": "owner" }],
  "collections": [],
  "items": [{ "id": "item_example", "libraryId": "lib_example", "title": "Field Notes", "itemType": "book" }],
  "citations": []
}
```

The site's record predicates treat absent status as active. The history view can display a sparse snapshot with only an ID and output. A repeat action on such a snapshot writes null for absent library, style, and mode, and empty arrays for absent items and locators.

## Observable State Changes (for LLM evaluation)

| User action | Exact persisted fields |
| --- | --- |
| Create a group | Append `libraries[]` with `id, name, kind, description, visibility, role, status, actorId, createdAt, updatedAt`. It is private, active, and owner-managed. |
| Edit group details | Update `libraries[].name, description, actorId, updatedAt` for the owned group. |
| Add a reference | Append `items[]` with all item fields above. In a collection route, `collectionIds` includes the active collection. |
| Edit a reference | Update `items[].title, itemType, creators, date, publicationTitle, publisher, place, volume, issue, pages, DOI, ISBN, url, abstractNote, tags, actorId, updatedAt`. |
| Move a reference to Trash or restore it | Update `items[].status, trashedAt, actorId, updatedAt`. Restore clears `trashedAt`. Collection associations survive both actions. |
| Create a collection or subcollection | Append `collections[]` with `id, libraryId, parentId, name, status, actorId, createdAt, updatedAt, deletedAt`. |
| Rename a collection | Update `collections[].name, actorId, updatedAt`. |
| Move a collection | Update `collections[].parentId, actorId, updatedAt`. |
| Delete a collection | Update `collections[].status, deletedAt, actorId, updatedAt` on the selected collection and its active descendants, and `items[].collectionIds, actorId, updatedAt` on each affected reference, including trashed ones. |
| Add or remove collection memberships | Update `items[].collectionIds, actorId, updatedAt` for references with changed membership, once per batch. |
| Copy references to a group | Append `items[]` records retaining the source metadata and tags, with new `id, sourceItemId, libraryId, collectionIds, status, trashedAt, actorId, createdAt, updatedAt` values. Each copy starts active and unfiled. |
| Save, copy, or download citation text | Append `citations[]` with `id, libraryId, itemIds, locators, style, mode, output, action, sourceCitationId, status, actorId, createdAt`. Composer actions use a null source ID. History actions set it to the source entry ID and reuse its snapshot. |

Search, filtering, selection, sort, route changes, form drafts, citation preview, failed clipboard writes, and duplicate membership additions are transient. The store calls the shared state writer once per committed action. Mutations preserve supplemental fields on the record being updated. Item edits rebuild the creator objects from the submitted form.
