# google_merchant_center_mock Schema

- **Base URL** `http://localhost:5470/`
- **Go Endpoint** `GET /go?sid=<sid>` returns `{initial_state, current_state, state_diff}`.
- **Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`.
- **Reset** `POST /post?sid=<sid>` with `{"action":"reset"}` restores the stored baseline as current. Use a fresh sid for each injected browser scenario, or clear the browser's cached state for that sid before reloading.

The runtime stores whole JSON snapshots. List operations and draft input stay in browser memory.

## State Schema

| Key | Record shape |
| --- | --- |
| account | id, name, actorId, actorName, defaultCountry, defaultCurrency |
| products[] | id, offerId, optional sku, title, description, brand, condition, price (number), currency, availability, status, visibility, country, language, link, optional imageLink, thumbnailKey, gtin, mpn, feedId (null for manual), actor, createdAt, updatedAt, deletedAt (null while active) |
| feeds[] | id, name, type, method, country, language, sourceUrl, schedule (null or { frequency, time, timezone }), fixtureKey, status, lastRunId, lastRunAt, actor, createdAt, updatedAt, deletedAt |
| feedRuns[] | id, feedId, trigger, status, input, receivedCount, acceptedCount, rejectedCount, errors[], actor, createdAt. Input is { fileName, sizeBytes } for upload or { sourceUrl, fixtureKey } for Update now. Errors carry { row, offerId, code, message }. File-level errors have null row and offerId. |
| issues[] | id, code, title, description, remediation, field, observedValue, severity, scope, status, country, productId, feedId, reviewOptions[], latestReviewId, resolution, resolvedAt, actor, createdAt, updatedAt |
| issueReviews[] | id, issueId, productId, feedId, country, reason, acknowledged (boolean), explanation (disagreements), status, actor, createdAt |
| productChanges[] | id, productId, feedRunId (for source writes), action, changes, actor, createdAt |
| feedChanges[] | id, feedId, action, changes, actor, createdAt |
| issueActions[] | id, issueId, productId, feedId, reviewId (for reviews), action, status, resolution (for closures), actor, createdAt |

IDs are strings. User-created IDs have an entity prefix and UUID. Timestamps are ISO strings. Each action uses account.actorId with usr-maya as the fallback. An existing record keeps its original actor and createdAt. Fields absent from injected records are optional for reading. Patches preserve unknown fields. Activity changes map business field names to { before, after }, with null for absent values. Record timestamps are stored on the record and activity timestamps on the activity row.

| Field | Values |
| --- | --- |
| Product condition | new, refurbished, used |
| Product availability | in_stock, out_of_stock, preorder, backorder |
| Product status | approved, limited, disapproved, pending |
| Product visibility | visible, hidden |
| Source type and method | primary or supplemental; file_upload or scheduled_fetch |
| Source status | never_run, success, partial, failed |
| Run status | success, partial, failed |
| Source schedule | daily, weekly, monthly, with time in HH:mm and an IANA timezone |
| Run trigger | upload, manual_update |
| Issue code | missing_gtin, missing_image, price_mismatch, availability_mismatch, feed_validation, setup_policy |
| Issue severity, scope and status | error or warning for severity, product, feed or account for scope, and open, under_review or resolved |
| Issue resolution | data_corrected, product_removed, feed_removed |
| Review reason and status | website_check, fixed, disagree for reason and submitted for status |

### Default IDs

| Record | Seeded IDs |
| --- | --- |
| Account and operator | `mc-northline-01`, `usr-maya` |
| Products | `prd-001` through `prd-060` |
| Sources | `feed-001` through `feed-024` |
| Runs | `run-001` through `run-024`, excluding `run-004`, `run-010`, `run-016` and `run-022`. Earlier runs are `run-history-001` through `run-history-003`. |
| Issues | `iss-001` through `iss-036` |
| Reviews | `rev-010`, `rev-019`, `rev-028` |
| Product and source changes | `pchg-001` through `pchg-006`, `fchg-001` through `fchg-005` |
| Issue actions | `iac-010`, `iac-011`, `iac-016`, `iac-019`, `iac-021`, `iac-026`, `iac-028`, `iac-031`, `iac-036` |

### Minimal Inject Example

Send this body to `POST /post?sid=<sid>`, then open `/?sid=<sid>` with the same sid. Arrays replace the defaults. Omitted account fields inherit their seeded values.

```json
{
  "action": "set",
  "state": {
    "account": { "name": "Harbor Test Supply" },
    "products": [{ "id": "prd-test", "offerId": "TEST-001", "title": "Trail Repair Kit" }],
    "feeds": [],
    "feedRuns": [],
    "issues": [],
    "issueReviews": [],
    "productChanges": [],
    "feedChanges": [],
    "issueActions": []
  }
}
```

## Observable State Changes (for LLM evaluation)

Each successful action posts a single set_current snapshot, including any dependent updates listed here. Field and association names below refer to paths inside current_state.

| User action | Business records and fields written | Associated activity |
| --- | --- | --- |
| Add product | Append products row with id, title, offerId, description, brand, condition, price, currency, availability, country, language, link, imageLink, gtin, mpn, status=pending, visibility=visible, feedId=null, actor, createdAt, updatedAt, deletedAt=null. | Append productChanges with action=created and productId. The changes include initialized product attributes, status, visibility and the null manual association. |
| Edit product | Patch changed editable fields from title, description, brand, condition, price, currency, availability, country, language, link, imageLink, gtin and mpn. Set updatedAt. On matching local corrections, also apply the issue resolution described below. | Append productChanges with action=updated, productId and exact changed values, including a status change if applicable. |
| Hide or show product, including bulk selection | Set visibility and updatedAt for selected active products that change. | Append one productChanges row per affected product with action=visibility_changed, productId and changes.visibility. |
| Remove manual product | Set deletedAt and updatedAt. Close active issues referencing the product, changing status to resolved and setting resolution=product_removed, resolvedAt and updatedAt. | Append productChanges with action=removed, productId and changes.deletedAt. Append issueActions per closed issue with action=resolved, resulting status, resolution and its related IDs. |
| Add data source | Append feeds row with id, name, type, method, country, language, sourceUrl, schedule, fixtureKey, status=never_run, lastRunId=null, lastRunAt=null, deletedAt=null, actor, createdAt and updatedAt. | Append feedChanges with action=created, feedId and initialized setup/status values. |
| Edit setup | Patch changed fields among name, type, method, country, language, sourceUrl, schedule and fixtureKey. Set updatedAt. Schedule edits retain existing unknown schedule keys while scheduled. Changing type preserves existing product ownership through products[].feedId. The new type controls future runs. | Append feedChanges with action=updated, feedId and exact setup changes. |
| Confirm a file upload or Update now | Append feedRuns row containing trigger, input metadata, results, counts and errors. Patch feeds.status, lastRunId, lastRunAt and updatedAt. A valid primary row inserts an offer or patches an existing active offer based on normalized country, language and offerId. Inserts begin pending and visible. Older active offers retain visibility and transfer to the importing primary source if needed. Supplemental accepted rows patch an existing product while preserving a product's feedId. Product modifications set updatedAt. Valid GTIN and image corrections also apply the issue resolution below. | Append productChanges for each product created or changed, linked to feedRunId. An unchanged accepted offer has no change row. File-level failures have zero row counts and one file error. Rejected rows leave product state untouched. |
| Remove data source | Set feeds.deletedAt and updatedAt. Set products.deletedAt and updatedAt for active offers whose feedId matches the removed source, including offers owned before a Primary to Supplemental setup change. Set related active issues to resolved with resolvedAt and updatedAt. Removed-product closures use product_removed. Direct source closures use feed_removed. Product issues on offers transferred to another source remain active. Supplemental source removal closes its source-scoped issues and retains products it only updated. | Append feedChanges with action=removed, feedId and changes.deletedAt. Append productChanges with action=removed for removed owned offers. Append a resolved issueActions row per closure. Existing feedRuns remain accessible by source detail. |
| Correct a local issue through product edit or file processing | On a changed, valid gtin or imageLink, set matching open issues to resolved with resolution=data_corrected, resolvedAt and updatedAt. Recompute the corrected product status from remaining linked open errors (disapproved), open warnings (limited), or pending reviews (pending). If no linked issue remains active, set approved. | Append issueActions with action=resolved, resulting status, resolution and related IDs, in the same snapshot as the productChanges row. |
| Request website check, request review or disagree | For an open issue that allows the selected reason, set status=under_review, latestReviewId and updatedAt. Append an issueReviews row with issueId, related productId/feedId, country, reason, acknowledged, status=submitted and an explanation for disagreement. | Append issueActions with action=review_requested, resulting status, reviewId and related IDs. Other status transitions require a subsequent applicable user action. |

Search, filters, sorting, pagination, selection, setup/history navigation, review drafts, cancelled dialogs, rejected form validation, downloads, reloads and idle tabs leave business state unchanged. File processing failures after confirmation deliberately record a feedRuns result. Source schedules store configuration. They do not initiate processing.
