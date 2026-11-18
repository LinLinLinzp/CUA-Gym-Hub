# google_search_console_mock Schema

**Base URL** `http://localhost:5471/`  
**Go endpoint** `GET /go?sid=<sid>` returns `initial_state`, `current_state` and `state_diff`.  
**Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`. Load the app in a fresh browser context for the injected session. Arrays replace defaults and objects merge.  
**Reset** `POST /post?sid=<sid>` with `{"action":"reset"}`. The shared Vite API restores the session's original baseline, or the default seed if no baseline exists. Start a fresh browser context to read the restored state.

The diff reports changes by top-level key. For an injected session, `current_state` contains the world after the client merges defaults and writes its boot baseline. The shared API retains the session's existing `initial_state`.

Collections are arrays. IDs are strings. Creation, submission, verification and removal timestamps use ISO 8601 UTC strings. User-created IDs are unique and user-action timestamps use the browser clock. Actor references use `account.id`. A dash in the interface represents a missing optional value.

## State Schema

| Key | Shape |
| --- | --- |
| `account` | Account object |
| `properties` | Property records |
| `propertyEvents` | Property lifecycle events |
| `pages` | Synthetic Google Index and live-test source records |
| `inspections` | Saved URL inspection snapshots |
| `liveTests` | User-triggered live test snapshots |
| `indexingRequests` | Queued indexing request records |
| `sitemaps` | Sitemap submissions, including soft-removed rows |
| `sitemapEvents` | Sitemap submission and removal events |

## Record fields

| Record | Fields |
| --- | --- |
| Account | `id`, `name`, `email`, `activePropertyId` (property ID or null) |
| Property | `id`, `type` (`domain`, `url_prefix`), `siteUrl`, `status` (`verified`, `pending`, `removed`), `permissionLevel` (`siteOwner`, `siteUnverifiedUser`), `verificationMethod` (`dns_txt`, `html_file`, `html_tag`), `createdAt`, `createdBy`, `verifiedAt`, `verifiedBy`, `removedAt`, `removedBy`. Verification and removal metadata are nullable. |
| Property event | `id`, `propertyId`, `type` (`added`, `verified`, `selected`, `removed`, `restored`), `status` at the event, `actorId`, `createdAt` |
| Page fixture | `id`, `propertyId`, `url`, `index` (index snapshot), `live` (live snapshot) |
| Index snapshot | `verdict` (`indexed`, `indexed_with_issues`, `not_indexed`, `unknown`), `reason`, `lastCrawlAt`, `crawlAllowed` (boolean), `pageFetch` (string), `indexingAllowed` (boolean), `userCanonical`, `googleCanonical`, `sitemapIds` (array of sitemap IDs), `referringUrls` (array of strings). Crawl and canonical fields may be null. |
| Live snapshot | `status` (`indexable`, `blocked`, `fetch_failed`), `reason` (string or null), `crawlAllowed` (boolean), `pageFetch` (string), `indexingAllowed` (boolean or null) |
| Inspection | `id`, `propertyId`, `pageId` (fixture ID or null), `url`, `index` (index snapshot), `actorId`, `createdAt` |
| Live test | `id`, `propertyId`, `inspectionId`, `url`, `result` (live snapshot), `actorId`, `createdAt` |
| Indexing request | `id`, `propertyId`, `inspectionId`, `liveTestId` (live test ID or null), `url`, `status` (`queued`), `actorId`, `createdAt` |
| Sitemap | `id`, `propertyId`, `url`, `type` (`sitemap`, `sitemap_index`, `unknown`), `status` (`success`, `pending`, `could_not_fetch`, `has_errors`, `removed`), `createdAt`, `createdBy`, `lastSubmittedAt`, `lastSubmittedBy`, `submissionCount` (integer), `lastReadAt`, `discoveredPages` and `discoveredVideos` (integers or null), `issues` (array), `removedAt`, `removedBy`. Read and removal metadata are nullable. |
| Sitemap issue | `code`, `message`, `row` (integer or null) |
| Sitemap event | `id`, `sitemapId`, `propertyId`, `url`, `type` (`submitted`, `resubmitted`, `removed`), `status` at the event, `actorId`, `createdAt` |

Domain scopes use `sc-domain:<hostname>`. URL prefixes use an absolute HTTP(S) URL and end in a slash. Inspected URLs are absolute HTTP(S) URLs with fragments removed. Sitemap URLs are stored after resolution against the active property base and validation. The same URL can have separate records in different properties.

### Default IDs

| ID or URL | Scenario |
| --- | --- |
| `acct_maya`, `prop_northwind` | Default account and selected busy Domain property |
| `prop_harbor`, `prop_docs`, `prop_cedar` | Second populated Domain, nested URL prefix, and empty verified Domain |
| `prop_atlas`, `prop_fieldnotes`, `prop_oldport` | Pending Domain, pending URL prefix, and removed Domain |
| `page_northwind_001` / `https://northwind.example/guides/spring-care` | Historic crawl without indexing, eligible live, no prior indexing request |
| `page_northwind_002` / `https://northwind.example/private/preview` | Live and index snapshots report noindex |
| `page_guide_start` / `https://docs.northwind.example/guides/start` | Nested prefix fixture |
| `sm_northwind_root`, `sm_northwind_products`, `sm_northwind_guides` | Successful sitemap submissions |
| `sm_northwind_legacy`, `sm_northwind_videos`, `sm_northwind_retired` | Fetch failure, parse error, and removed sitemap |
| `insp_001`, `live_001`, `req_001` | Linked saved inspection, live result and queued indexing request |

The default fixture has 24 properties, 47 property events, 60 pages, 32 inspections, 12 live tests, 8 requests, 36 sitemaps and 73 sitemap events.

## Minimal Inject Example

This state starts with one verified property and empty reports.

```json
{
  "account": { "id": "acct_sam", "name": "Sam Vale", "email": "sam@solo.example", "activePropertyId": "prop_solo" },
  "properties": [{ "id": "prop_solo", "type": "domain", "siteUrl": "sc-domain:solo.example", "status": "verified" }],
  "propertyEvents": [],
  "pages": [],
  "inspections": [],
  "liveTests": [],
  "indexingRequests": [],
  "sitemaps": [],
  "sitemapEvents": []
}
```

## Observable State Changes (for LLM evaluation)

| User action | Exact fields written |
| --- | --- |
| Select a different verified property | Sets `account.activePropertyId` and appends a `propertyEvents[]` entry with `type: selected`. |
| Add property and choose Verify later | Appends `properties[]` with all property fields, `status: pending`, `permissionLevel: siteUnverifiedUser`, and null verification and removal metadata. Appends an `added` property event. |
| Add property and verify immediately | Appends `properties[]` with `status: verified`, `permissionLevel: siteOwner`, `verificationMethod`, `verifiedAt` and `verifiedBy`. Sets `account.activePropertyId` and appends an `added` event with `status: pending` followed by a `verified` event with `status: verified`. |
| Re-add a removed scope | Reuses `properties[].id` and preserves existing `createdAt` and `createdBy`. Sets the status, permission, method and verification fields for the selected action and clears `removedAt` and `removedBy`. Appends a `restored` event with `status: pending`. Immediate verification also appends a `verified` event and sets `account.activePropertyId`. |
| Verify a pending property | Sets `properties[].status`, `permissionLevel`, `verificationMethod`, `verifiedAt` and `verifiedBy`. Sets `account.activePropertyId` and appends a `verified` property event. |
| Remove a property | Sets `properties[].status: removed`, `removedAt` and `removedBy`. Appends a `removed` property event. If the property was active, sets `account.activePropertyId` to the first remaining verified property or null. |
| Inspect a URL | Appends `inspections[]` with property/fixture references, URL, index snapshot, actor and timestamp. |
| Test live URL or rerun | Appends `liveTests[]` with inspection and property references, URL, live snapshot, actor and timestamp. |
| Request eligible indexing | Appends `indexingRequests[]` with `status: queued`, inspection and property references, the latest associated `liveTestId` or null, URL, actor and timestamp. |
| Submit a new sitemap | Appends `sitemaps[]` with `status: pending`, `type: unknown`, `submissionCount: 1`, submission/creation data and null read and removal metadata. Appends a `submitted` sitemap event. |
| Resubmit or restore sitemap | Reuses `sitemaps[].id`, sets `status: pending`, updates `lastSubmittedAt` and `lastSubmittedBy`, increments `submissionCount`, clears removal metadata and retains the last read details. Appends a `resubmitted` sitemap event. |
| Remove sitemap | Sets `sitemaps[].status: removed`, `removedAt` and `removedBy`. Appends a `removed` sitemap event. |

Navigation, filters, pagination, cancellations, invalid actions, repeat indexing requests and inspection tab changes produce no business-state writes. Removing a property or sitemap retains its linked records. The Google Index snapshot remains unchanged when a live test runs or an indexing request is queued.
