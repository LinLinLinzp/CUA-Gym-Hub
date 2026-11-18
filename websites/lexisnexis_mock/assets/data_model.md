# Workspace data model

## Storage

createInitialData() returns an object with the keys below. Seed IDs and timestamps are fixed across sessions and calls. Use ISO 8601 UTC strings for event timestamps, YYYY-MM-DD for whole-day dates, and new Date().toISOString() for confirmed user changes. Use ID strings for relationships. A dash in the Optional column means all listed fields are required for newly created records. Render injected records defensively.

| Top-level key | Type | Seed target |
| --- | --- | --- |
| profile | Profile object | 1 synthetic account |
| documents | Document[] | 48 original synthetic documents |
| folders | Folder[] | 24 folders, including roots, children and archived examples |
| folderItems | FolderItem[] | 48 mixed items, including removed rows and empty folders |
| citingReferences | CitingReference[] | 36 links with mixed treatments |
| citationActions | CitationAction[] | 24 explicit historical checked, copied and saved actions |
| alerts | Alert[] | 24 search and Shepard’s alerts |
| alertResults | AlertResult[] | 48 results, across read, unread and zero-result monitors |

## Record shapes

| Type | Fields and types | Optional |
| --- | --- | --- |
| Profile | id, name, organization, email, timeZone: string. citationFormat: standard or alwd. | organization, email, timeZone, citationFormat |
| Document | id, title, citation, court, jurisdiction, source, date, excerpt: string. type: case, statute or secondary. topics, body, citationAliases: string arrays, with body holding original paragraphs. citationFormats: object mapping standard and optional alwd to complete citation strings. signal: positive, caution, negative or neutral. | citation, court, source, date, excerpt, topics, body, citationAliases, citationFormats, signal |
| Folder | id, name: string. parentId: folder ID or null. status: active or archived. Create and update metadata. | Update metadata |
| FolderItem | id, folderId, title: string. kind: document, search or citation. status: active or removed. note: string. Kind-specific fields below. Create and update metadata. | note, update metadata |
| CitingReference | id, documentId, citingDocumentId: string. treatment: followed, distinguished, criticized or cited. excerpt: string. | excerpt |
| CitationAction | id, documentId: string. type: checked, copied or saved. query: string for checked lookups. format: standard, alwd or header. includeLink: boolean. citationText: complete copied or saved text. folderId and folderItemId: string. Create metadata. | query for checked; format, includeLink and citationText apply only to copied or saved; folderId and folderItemId apply only to saved |
| Alert | id, title, description, client, expiresOn: string. type: search or shepards. status: active, paused or deleted. source, monitor, delivery: objects below. Create and update metadata. | description, client, expiresOn, update metadata |
| AlertResult | id, alertId, documentId, summary, matchedAt: string. status: unread or read. readAt: ISO timestamp or null. Update metadata. | summary, readAt, update metadata |

Create metadata is createdAt and createdBy, both strings. Update metadata is updatedAt and updatedBy, both strings. Actor fields contain profile.id, with the default account ID available as a fallback. On an alert result, matchedAt is the fixture timestamp. Unreading a result sets readAt to null, and reading sets it to the commit timestamp.

| Variant | Required fields on new records |
| --- | --- |
| FolderItem document | documentId: string |
| FolderItem search | query: string. filters: object, with optional contentType and jurisdiction strings. |
| FolderItem citation | documentId and citationText: string. format: standard, alwd or header. includeLink: boolean. |
| Alert search | source.query: string. source.filters: same object as FolderItem search. monitor.contentTypes: nonempty array of case, statute or secondary. |
| Alert shepards | source.documentId: string. monitor.treatments: nonempty array from followed, distinguished, criticized and cited. An “All changes” choice stores every supported treatment. |
| Alert delivery | delivery.channel: online or online_and_email. delivery.frequency when email is selected: daily, business_daily, weekly, monthly or as_available. Clear frequency on a switch to online. |

## Relationships and write rules

- A folder may have one parent. Resolve visibility through its ancestry, guarding against missing links and cycles. Only an active folder with active ancestors can accept items. Recycle bin distinguishes explicitly archived folders and explicitly removed items.
- Treat duplicates as active items with the same document ID for kind document, normalized query plus filter snapshot for kind search, or document ID plus format and link preference for kind citation. Check duplicates when saving, moving, copying and restoring. Copy generates a new item ID, copies its note and uses fresh create metadata. Move preserves existing item ID and create metadata.
- A report looks up citingReferences by documentId and joins citingDocumentId to documents. Use the overall signal from the authority. A cited case with a signal and zero links remains reportable. When an injected reference has no document, label it unavailable and omit the broken link.
- Saving a citation creates a folder item and action atomically. Copying records the exact clipboard text, including any chosen sid-aware local path. Save a portable citation with an app-relative path when including a link in folder content and resolve that path with the current sid when opened. Format preferences change on successful copy with an available style.
- Alert results join by alertId and documentId. Preserve results when pausing or deleting a monitor, hide deleted monitors from the normal list and derive unread counts from visible alerts. Derive expiry using the runtime clock and keep it separate from stored status. New alerts start with no results. Reading, searching and rendering never generate results.
- Use stable fallback labels for sparse fixtures and preserve unrelated keys when saving. Persist business actions and keep view state transient unless encoded in the route. Update SCHEMA.md to match the final implementation.

## Example fixtures

| Record | Example values |
| --- | --- |
| Profile | id user-001, Madeline Foster, Harrow & Finch LLP, madeline.foster@example.test, America/New_York, standard |
| Document | id doc-001, Barton v. Alder Logistics, 214 F.4th 731, U.S. Court of Appeals for the Ninth Circuit, federal-9th, Alder Appellate Digest, 2025-04-17, case, topics arbitration and class waiver, citation alias 2025 U.S. App. LEXIS 8401, caution. Seed distinct Standard and ALWD strings grounded in the fixture. |
| Folder | id folder-001, Arbitration and Class Waivers, active root, createdAt 2025-05-12T13:00:00.000Z, createdBy user-001. Child folder-002 can be Ninth Circuit Decisions. |
| Folder items | item-001 stores doc-001 in folder-002 with note “Compare the delegation clause.” item-002 is “Delegation clause research” with query delegation clause and filters case and federal-9th. item-003 stores a formatted citation to doc-001 with includeLink false. |
| Citing reference | ref-001 joins doc-001 to doc-008 with distinguished treatment and an original excerpt about the absence of a separate arbitration agreement. |
| Citation action | cite-action-001 checked doc-001 with query 214 F.4th 731, timestamp 2025-05-13T14:30:00.000Z and actor user-001. cite-action-002 saved doc-001 in folder-002 as item-003, format standard, includeLink false, with the formatted text. |
| Alerts | alert-001 “Delegation clauses in the Ninth Circuit” is a weekly search alert with the saved query and filter snapshot. alert-002 “Barton treatment updates” is an online Shepard’s alert for doc-001 monitoring distinguished and criticized treatments. |
| Alert result | result-001 links alert-002 to doc-008, matchedAt 2025-05-18T14:00:00.000Z, unread with readAt null. |

Fill the corpus with varied original names, jurisdictions, legal topics and English summaries. Use at least one case whose title, alias and reporter citation all resolve to the same report. Seed one alert with multiple read states and linked results, one with no results, and one paused alert. Put document, search and citation items in reachable folder examples. Use coherent IDs in every seed relation and choose fixture dates that let the default workspace display active and expired examples when dates are evaluated against the task clock.
