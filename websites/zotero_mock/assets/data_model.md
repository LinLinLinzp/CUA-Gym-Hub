# Zotero — State Model

`src/data/seed.js` exports `createInitialData()` returning the five keys below as plain JSON values. All runtime IDs are stable strings such as a `crypto.randomUUID()` result with an entity prefix. Seed IDs and timestamps are fixed. Actor IDs refer to the account, and action timestamps use `new Date().toISOString()`. The create and first update timestamps on a record can share the same value.

## Account

One `account` object for the signed-in identity.

| Field | Type | Example |
| --- | --- | --- |
| `id` | string | `usr_maya_chen` |
| `name` | string | `Maya Chen` |
| `email` | string | `maya.chen@example.test` |

## Libraries

`libraries` is an array. A personal or group library scopes lists, searches, collections, and citation selection. Owners can edit group details. Owners and editors can edit content. Readers can browse and generate citations.

| Field | Type | Example |
| --- | --- | --- |
| `id` | string | `lib_urban_methods` |
| `name` | string | `Urban Methods Lab` |
| `kind` | `personal\|group` | `group` |
| `description` | string | `References for the neighborhood fieldwork seminar.` |
| `visibility` | `private\|public` | `private` |
| `role` | `owner\|editor\|reader` | `owner` |
| `status` | `active` | `active` |
| `actorId` | string | `usr_maya_chen` |
| `createdAt`, `updatedAt` | ISO timestamp strings | `2025-08-04T10:00:00.000Z` |

## Collections

`collections` is an array. Every parent must belong to the same library. A deleted collection remains available to a verifier as a historical record. Its affected memberships are removed at deletion.

| Field | Type | Example |
| --- | --- | --- |
| `id` | string | `col_field_methods` |
| `libraryId` | string | `lib_urban_methods` |
| `parentId` | string or null | `col_public_space` |
| `name` | string | `Field Methods` |
| `status` | `active\|deleted` | `active` |
| `actorId` | string | `usr_maya_chen` |
| `createdAt`, `updatedAt` | ISO timestamp strings | `2025-08-05T11:20:00.000Z` |
| `deletedAt` | ISO timestamp string or null | `null` |

## Items

`items` is an array of references. Empty optional strings or arrays are valid in the default seed, and injected records may omit them. Preserve type-independent metadata across collection actions.

| Field | Type | Example |
| --- | --- | --- |
| `id` | string | `item_corner_stores` |
| `libraryId` | string | `lib_urban_methods` |
| `collectionIds` | string[] | `["col_field_methods","col_public_space"]` |
| `itemType` | `journalArticle\|book\|report\|webpage` | `journalArticle` |
| `title` | string | `Corner Stores and Informal Gathering in Ternwick` |
| `creators` | object[] with `creatorType` and either `firstName` and `lastName`, or organization `name` | `[{creatorType:"author",firstName:"Noor",lastName:"Hale"}]` |
| `date` | string containing YYYY, YYYY-MM, YYYY-MM-DD, or empty | `2024-10` |
| `publicationTitle`, `publisher`, `place` | optional strings | `Journal of Everyday Urbanism`, `Juniper Press`, `Ternwick` |
| `volume`, `issue`, `pages` | optional strings | `12`, `2`, `38–56` |
| `DOI`, `ISBN`, `url` | optional strings | `10.5555/ternwick.2024.002`, empty string, `https://archive.example.test/ternwick` |
| `abstractNote` | optional string | `Field observations across three neighborhood corridors.` |
| `tags` | string[] | `["fieldwork","public space"]` |
| `status` | `active\|trashed` | `active` |
| `actorId` | string | `usr_maya_chen` |
| `createdAt`, `updatedAt` | ISO timestamp strings | `2025-08-06T14:35:00.000Z` |
| `trashedAt` | ISO timestamp string or null | `null` |

On create, record the complete item with trimmed title, valid type, applicable type-specific fields, and library and collection links. Store creators in entered order. Derive year from `date`. Move to Trash updates status and timestamp while preserving the metadata and memberships. Restore sets status to `active` and clears `trashedAt`.

## Citations

`citations` is an append-only history array. Every entry snapshots the plain-text output. A later edit or trash action on an item leaves the saved text reproducible. Item references, selection order, and locators remain available to a verifier.

| Field | Type | Example |
| --- | --- | --- |
| `id` | string | `cite_field_notes_apr` |
| `libraryId` | string | `lib_urban_methods` |
| `itemIds` | string[] in selection order | `["item_corner_stores"]` |
| `locators` | array of `{itemId, label, value}`, with `label` one of `page\|chapter\|section` and string `value` | `[{itemId:"item_corner_stores",label:"page",value:"42"}]` |
| `style` | `apa-7\|mla-9\|chicago-author-date` | `apa-7` |
| `mode` | `citation\|bibliography` | `citation` |
| `output` | nonempty string | `(Hale, 2024, p. 42)` |
| `action` | `saved\|copied\|downloaded` | `saved` |
| `sourceCitationId` | string or null | `null` for composer actions, source history ID for repeated output |
| `status` | `completed` | `completed` |
| `actorId` | string | `usr_maya_chen` |
| `createdAt` | ISO timestamp string | `2025-08-07T16:10:00.000Z` |

Use locally bundled styles and an English locale. Convert creators and bibliographic metadata to formatter input, including locator labels where supported. Render and persist the same whitespace-preserving plain text. Handle missing creators or dates and multiple creators. Bibliographies have empty locators and use style-defined sort order. Repeating output from history copies the source record's output and inputs into a new record with a fresh ID, action, source link, actor, and timestamp.

## Seed and injection

- Seed five libraries with 48 references and 16 collections in My Library, and 60 references and 20 collections across the four groups. Use a mix of top-level and nested collections, unfiled references, multi-collection memberships, authors and organizational creators, and a few trashed records. Vary dates, formats, research subjects, and tags. Seed 30 history entries tied to valid item and library IDs with varied styles and modes.
- The store reads arrays defensively. Missing optional values get display fallbacks. Missing or deleted relationships are skipped in menus and counts. Guard tree traversal against orphaned nodes and cycles. Do not fill or rewrite injected data as a side effect of rendering.
- All updates to related records happen together in one store action, using one timestamp and one `saveState` call. `SCHEMA.md` records the final schema and observable fields when implementation is complete.
