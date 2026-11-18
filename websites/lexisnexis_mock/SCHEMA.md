# lexisnexis_mock Schema

**Base URL**: `http://localhost:5418/`  
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}`

The first `set` establishes the baseline for a SID. Reset copies that baseline to current state, or uses the defaults when no baseline exists. With partial injection, the first browser load merges defaults into current state while preserving the original injected baseline. `/go` reports changes by top-level key using `modified` and `added` entries. Business actions send one full-state `set_current`. Unknown injected top-level keys carry forward. User-created IDs use the entity prefix and a UUID.

## State Schema

| Key | Shape | Seed records |
| --- | --- | ---: |
| `profile` | Profile | 1 |
| `documents` | Document[] | 48 |
| `folders` | Folder[] | 24 |
| `folderItems` | FolderItem[] | 48 |
| `citingReferences` | CitingReference[] | 36 |
| `citationActions` | CitationAction[] | 24 |
| `alerts` | Alert[] | 24 |
| `alertResults` | AlertResult[] | 48 |

## Records

All identifiers, text fields, and date values are strings unless specified. Creation metadata is `createdAt` and `createdBy`. Update metadata is `updatedAt` and `updatedBy`. Timestamps use ISO 8601 UTC. Actor IDs come from `profile.id` and fall back to `user-001`. Whole-day dates use `YYYY-MM-DD`.

| Record | Fields |
| --- | --- |
| Profile | `id`, `name`, optional `organization`, `email`, `timeZone` and `citationFormat` (`standard` or `alwd`). |
| Document | `id`, `title`, `type` (`case`, `statute`, `secondary`), `jurisdiction`. Optional `citation`, `court`, `source`, `date`, `excerpt`, `topics` (string array), `body` (paragraph array), `citationAliases` (string array), `citationFormats` (object with a `standard` and/or `alwd` string), and `signal` (`positive`, `caution`, `negative`, `neutral`). |
| Folder | `id`, `name`, `parentId` (folder ID or null), `status` (`active`, `archived`), creation metadata and optional update metadata. |
| FolderItem | `id`, `folderId`, `title`, `kind` (`document`, `search`, `citation`), `status` (`active`, `removed`), `note` (empty string when cleared), creation metadata and optional update metadata. A document item adds `documentId`. A search adds `query` and `filters`. A citation adds `documentId`, `format`, `includeLink` (boolean) and `citationText`. |
| CitingReference | `id`, `documentId`, `citingDocumentId`, `treatment` (`followed`, `distinguished`, `criticized`, `cited`) and optional `excerpt`. |
| CitationAction | `id`, `documentId`, `type` (`checked`, `copied`, `saved`) and creation metadata. A check may add `query`. Copy and save add `format` (`standard`, `alwd`, `header`), `includeLink` (boolean) and `citationText`. A save also adds `folderId` and `folderItemId`. |
| Alert | `id`, `title`, `type` (`search`, `shepards`), `status` (`active`, `paused`, `deleted`), `description`, `client`, `expiresOn`, `source`, `monitor`, `delivery`, creation metadata and optional update metadata. Empty optional text and expiration values are stored as empty strings for user-created alerts. |
| AlertResult | `id`, `alertId`, `documentId`, `matchedAt`, `status` (`unread`, `read`), optional `summary`, optional `readAt` (timestamp or null) and optional update metadata. |

| Nested value | Fields |
| --- | --- |
| Search filters | Optional `contentType` and `jurisdiction`. An unfiltered search stores `{}`. |
| Search alert source | `query` and `filters`. |
| Search alert monitor | `contentTypes` (nonempty array of document types). |
| Shepard’s alert source | `documentId`. |
| Shepard’s alert monitor | `treatments` (nonempty array of citing reference treatments). Selecting **All changes** stores all four treatments. |
| Alert delivery | `channel` (`online`, `online_and_email`). Email delivery includes `frequency` (`daily`, `business_daily`, `weekly`, `monthly`, `as_available`). |

A copied local citation includes an absolute workspace URL with the current SID. A saved citation includes a portable app-relative document path when requested. The folder resolves that path using the SID on the currently open workspace. Folder availability derives from the entire parent chain. Displayed alert expiration derives from the runtime UTC date.

### Default IDs

| Collection | IDs |
| --- | --- |
| `profile` | `user-001` |
| `documents` | `doc-001`–`doc-048` |
| `folders` | `folder-001`–`folder-024` |
| `folderItems` | `item-001`–`item-048` |
| `citingReferences` | `ref-001`–`ref-036` |
| `citationActions` | `cite-action-001`–`cite-action-024` |
| `alerts` | `alert-001`–`alert-024` |
| `alertResults` | `result-001`–`result-048` |

### Minimal Inject Example

In the `set` request, this `state` produces one document, one available destination folder and empty citation and alert histories. The injected name merges into the default profile.

```json
{
  "profile": { "name": "Morgan Hale" },
  "documents": [{ "id": "doc-test", "title": "Hale v. Oak Transit", "type": "case", "jurisdiction": "federal-9th", "citation": "214 F.4th 900", "signal": "neutral" }],
  "folders": [{ "id": "folder-test", "name": "Oak Transit Research", "parentId": null, "status": "active", "createdAt": "2025-05-01T12:00:00.000Z", "createdBy": "user-001" }],
  "folderItems": [],
  "citingReferences": [],
  "citationActions": [],
  "alerts": [],
  "alertResults": []
}
```

## Observable State Changes (for LLM evaluation)

| User action | Exact state change |
| --- | --- |
| Create folder | Append `folders[]` with `id`, trimmed `name`, `parentId`, `status: active` and creation metadata. |
| Rename folder | Update `folders[].name` and update metadata. |
| Archive or restore folder | Update `folders[].status` to `archived` or `active` and update metadata on the selected folder. |
| Save document | Append `folderItems[]` with document variant fields, empty `note`, `status: active` and creation metadata. |
| Save search | Append `folderItems[]` with the search variant, user-entered `title`, empty `note`, `status: active` and creation metadata. |
| Save any item with inline folder creation | Append the linked folder and item in the same transaction. Citation saves also include the action below. |
| Rename saved search | Update the selected `folderItems[].title` and update metadata. |
| Add, edit or clear note | Update `folderItems[].note` and update metadata. |
| Move one or more items | Update each eligible `folderItems[].folderId` and update metadata. Choosing an inline folder also appends that folder in the same transaction. |
| Copy one or more items | Append eligible copies to `folderItems[]` with new IDs, the destination `folderId`, fresh creation metadata, and the original item contents including `note`. Choosing an inline folder also appends that folder. |
| Remove or restore items | Update each eligible `folderItems[].status` to `removed` or `active` and set update metadata. |
| Explicitly open a citation report | Append `citationActions[]` with `type: checked`, `id`, `documentId`, optional lookup `query` and creation metadata. |
| Successfully copy citation | Append `citationActions[]` with `type: copied`, `id`, `documentId`, `format`, `includeLink`, exact clipboard `citationText`, and creation metadata. Copying a supported case format also sets `profile.citationFormat`. |
| Save citation | Append a citation variant to `folderItems[]` and a `citationActions[]` row with `type: saved`, `id`, `documentId`, `format`, `includeLink`, `citationText`, `folderId`, `folderItemId` and creation metadata in the same transaction. |
| Create alert | Append `alerts[]` with `id`, `type`, `status: active`, `title`, `description`, `client`, `expiresOn`, variant `source`, `monitor`, `delivery` and creation metadata. |
| Edit alert | Update the same record’s `title`, `description`, `client`, `expiresOn`, `monitor`, `delivery` and update metadata. The original `source` stays fixed. Selecting online-only clears `delivery.frequency`. |
| Pause, resume or delete alert | Update `alerts[].status` to `paused`, `active` or `deleted` and set update metadata. |
| Mark alert result read or unread | Set `alertResults[].status` to `read` or `unread`, set `readAt` to the update timestamp or null, and set update metadata. |

Navigation, direct report visits, filtering, opening results, drafts, cancellations, validation failures and idle tabs produce zero mutation posts after boot. Opening a fresh session performs the shared state manager’s baseline load.
