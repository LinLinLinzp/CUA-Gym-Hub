# State model

`createInitialData()` returns the single JSON object described below. All collections are arrays and all references are string IDs. Fixed fixture dates and IDs make the initial state reproducible. New action records use a unique ID and `new Date().toISOString()`. Each action uses the current account ID as actor. Store integer counts as numbers. Use `null` for inapplicable fields. A missing optional value should render a dash or an appropriate unknown state. Display dates relative to the browser clock only when useful.

## Top-level keys

| Key | Type | Purpose |
|---|---|---|
| `account` | Object | Signed-in user and last explicit property selection |
| `properties` | Array | Property scopes, verification and membership lifecycle |
| `propertyEvents` | Array | Property additions, verification, selection, removal and restoration |
| `pages` | Array | Synthetic source data for index snapshots and live eligibility |
| `inspections` | Array | User-submitted index reports by property and URL |
| `liveTests` | Array | User-triggered test results linked to an inspection |
| `indexingRequests` | Array | Queued indexing requests linked to inspection and optional test |
| `sitemaps` | Array | Current or removed sitemap submissions |
| `sitemapEvents` | Array | Submission, retry and removal history |

## Account and properties

| Record | Fields and examples |
|---|---|
| Account | `id` string `acct_maya`, `name` string `Maya Chen`, `email` string `maya.chen@northwind.example`, `activePropertyId` nullable string `prop_northwind` |
| Property | `id` string `prop_northwind`, `type` enum `domain\|url_prefix`, `siteUrl` string `sc-domain:northwind.example` or `https://docs.northwind.example/guides/`, `status` enum `verified\|pending\|removed`, `permissionLevel` enum `siteOwner\|siteUnverifiedUser`, `verificationMethod` enum `dns_txt\|html_file\|html_tag`, `createdAt` ISO date, `createdBy` account ID, `verifiedAt` nullable ISO date, `verifiedBy` nullable account ID, `removedAt` nullable ISO date, `removedBy` nullable account ID |
| Property event | `id` string `pe_001`, `propertyId` property ID, `type` enum `added\|verified\|selected\|removed\|restored`, `status` resulting property status, `actorId` account ID, `createdAt` ISO date |

Derive the display label from `siteUrl` by removing the `sc-domain:` prefix for domain properties. Lowercase DNS names, normalize internationalized hostnames via URL parsing, strip a leading `www.` from Domain input, and reject protocols, paths, invalid labels and wildcard syntax for Domain input. Match Domain membership by equal hostname or a subdomain suffix preceded by a dot. For URL prefix, require an explicit HTTP(S) origin, reject credentials, query and fragment in the property identifier, and normalize a directory scope with a trailing slash. Match membership by exact normalized origin plus a pathname prefix, so `/guides/` includes `/guides/start` and excludes `/guides-old/start`. Accept inspectable query strings and canonicalize away fragments in inspected URLs. Reject credentials in all URL inputs. Normalize with one shared utility before list lookup, comparisons and record writes.

Pending properties open the verification flow. The context picker only activates verified properties. The initial active ID can be absent from an injected list, so derive the first verified property or a property-free shell without a write. Re-adding a removed property restores the original ID, uses the selected verification path and clears removal metadata. Use the original creation time and record the restoration time in the event. Verified add/restore and completion of verification activate the property as part of the same commit. Explicitly selecting another verified property is the only interaction that creates a `selected` event. Re-selecting the current property is a no-op.

## Page fixtures and URL Inspection

| Record | Fields and examples |
|---|---|
| Page fixture | `id` string `page_guide_start`, `propertyId` property ID, `url` string `https://docs.northwind.example/guides/start`, `index` index snapshot object, `live` live snapshot object |
| Index snapshot | `verdict` enum `indexed\|indexed_with_issues\|not_indexed\|unknown`, `reason` string such as `Discovered – currently not indexed`, `lastCrawlAt` nullable ISO date, `crawlAllowed` nullable boolean, `pageFetch` nullable string such as `Successful`, `indexingAllowed` nullable boolean, `userCanonical` and `googleCanonical` nullable absolute URL strings, `sitemapIds` array of sitemap ID strings, `referringUrls` array of URL strings |
| Live snapshot | `status` enum `indexable\|blocked\|fetch_failed`, `reason` nullable string, `crawlAllowed` boolean, `pageFetch` string such as `Successful` or `Not found (404)`, `indexingAllowed` nullable boolean |
| Inspection | `id` string `insp_001`, `propertyId` property ID, `pageId` nullable fixture ID, `url` absolute URL string, `index` index snapshot object, `actorId` account ID, `createdAt` ISO date |
| Live test | `id` string `live_001`, `propertyId` property ID, `inspectionId` inspection ID, `url` absolute URL string, `result` live snapshot object, `actorId` account ID, `createdAt` ISO date |
| Indexing request | `id` string `req_001`, `propertyId` property ID, `inspectionId` inspection ID, `liveTestId` nullable live test ID, `url` absolute URL string, `status` enum `queued`, `actorId` account ID, `createdAt` ISO date |

Look up fixtures by property ID plus canonicalized URL. Result deep links display the latest matching `inspections` record, or a read-only fixture preview with an Inspect action when no record exists. For an unknown URL within the property, display an unknown index snapshot with nullable crawl fields and a deterministic indexable live result. Each explicit new inspection keeps its own index snapshot and references its fixture if present. Opening an existing recent result shows the saved URL for resubmission. Each explicit Inspect writes one new inspection. Live tests use fixture live data, or the unknown-URL fallback. Live tests and indexing requests require a matching inspection. Queue at most one request per property and URL. Eligibility comes from the current inspection's latest test when present, otherwise from the same deterministic live fixture or fallback used by Test live URL. Queueing leaves index and page fixture records intact.

## Sitemaps

| Record | Fields and examples |
|---|---|
| Sitemap | `id` string `sm_northwind_products`, `propertyId` property ID, `url` string `https://northwind.example/sitemaps/products.xml`, `type` enum `sitemap\|sitemap_index\|unknown`, `status` enum `success\|pending\|could_not_fetch\|has_errors\|removed`, `createdAt` ISO date, `createdBy` account ID, `lastSubmittedAt` ISO date, `lastSubmittedBy` account ID, `submissionCount` integer `2`, `lastReadAt` nullable ISO date, `discoveredPages` and `discoveredVideos` nullable integers `248` and `0`, `issues` array of issue objects, `removedAt` nullable ISO date, `removedBy` nullable account ID |
| Sitemap issue | `code` string `invalid_date`, `message` string `Invalid last modified date`, `row` nullable integer `18` |
| Sitemap event | `id` string `se_001`, `sitemapId` sitemap ID, `propertyId` property ID, `url` absolute URL string, `type` enum `submitted\|resubmitted\|removed`, `status` resulting sitemap status, `actorId` account ID, `createdAt` ISO date |

The visible list is scoped by property and excludes removed rows. For relative paths, show the base used for URL resolution in or beside the input. Use `https://<domain>/` for a Domain property and the configured prefix for a URL-prefix property. Apply property membership to the final resolved URL. Treat identical canonicalized URLs in different properties as different rows. For a new sitemap use type `unknown`, status `pending`, count 1, and blank last-read and discovery fields. Retrying, submitting a duplicate URL, or reactivating a removed sitemap reuses its ID, increments `submissionCount`, sets `status: pending`, updates last-submitted fields and clears removal fields. Preserve existing metadata as the last completed read and label it accordingly while pending. With no fetch in the local workflow, pending submissions stay pending. Removal keeps the row and its historical references.

## Observable writes

| Action | Changed state paths |
|---|---|
| Select another verified property | `account.activePropertyId`, appended `propertyEvents[]` |
| Add or restore as pending | Added or restored `properties[]` record, appended `propertyEvents[]` |
| Add or restore and verify | Added or restored `properties[]` record with verification fields, `account.activePropertyId`, two appended `propertyEvents[]` |
| Verify pending property | `properties[].status`, `permissionLevel`, `verificationMethod`, `verifiedAt`, `verifiedBy`, `account.activePropertyId`, appended `propertyEvents[]` |
| Remove property | `properties[].status`, `removedAt`, `removedBy`, `account.activePropertyId` if applicable, appended `propertyEvents[]` |
| Inspect URL | Appended `inspections[]` |
| Test live URL or rerun | Appended `liveTests[]` |
| Request eligible indexing | Appended `indexingRequests[]` |
| Submit or resubmit sitemap | Added or updated `sitemaps[]` record with submission fields, appended `sitemapEvents[]` |
| Remove sitemap | `sitemaps[].status`, `removedAt`, `removedBy`, appended `sitemapEvents[]` |

## Seed coverage

Use fixed timestamps across several weeks. Generate repeatable rows by mapping fixed names and numeric sequences. Use ordinary report vocabulary and paths that make meaningful task targets. Fixture domains use the reserved `.example` suffix.

- **24 properties.** The default `prop_northwind` is `northwind.example`. Include `prop_docs` scoped to `https://docs.northwind.example/guides/`, a second populated domain `prop_harbor` for `harbor-supply.example`, one verified property with no reports, at least two pending properties and a removed one. Include varied names and types for filtering and searching.
- **60 page fixtures.** Keep at least 32 on Northwind and spread the rest across Harbor Supply and the docs prefix. Use articles, product collections, support pages and duplicates. Include indexed, indexed-with-issues, canonical duplicate, crawled and unindexed, discovered and unindexed, noindex, robots blocked and 404 examples. Include one historic failure whose live snapshot succeeds, such as `https://northwind.example/guides/spring-care`, and one active noindex or fetch failure, such as `https://northwind.example/private/preview`.
- **32 inspections, 12 live tests and 8 requests.** Include repeat inspections for a few URLs and link each downstream row to a seeded parent. Reserve the recovery fixture above for a first-time request. Keep recent history scoped by property and order by newest first.
- **36 sitemaps.** Use at least 22 on Northwind. Include `/sitemap.xml`, `/sitemaps/products.xml`, `/sitemaps/guides.xml`, `/sitemaps/videos.xml`, and `/sitemaps/legacy.xml` as a failed retry target. Cover success, couldn't fetch, has errors and pending, with numeric counts and parsing details where applicable. Include at least one removed row for restoration and ensure some properties share common paths to verify isolation.
- **Property and sitemap events.** Include consistent fixture event history for the associated records, using deterministic IDs and timestamps. Default reports can combine fixture aggregates and exact counts from the active property.
