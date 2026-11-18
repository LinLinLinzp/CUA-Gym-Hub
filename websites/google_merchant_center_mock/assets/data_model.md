# State model

`createInitialData()` returns the object below. Record IDs are opaque strings. Unless specified, fields on seeded rows are present, but readers tolerate missing optional fields in injected rows. Omitted or nullable references display a neutral fallback. Use `new Date().toISOString()` for action times and take actor IDs from `account.actorId` for mutations. Generate unique IDs for user-created records. Preserve unknown injected fields when patching records.

```js
{
  account: { id: 'mc-northline-01', name: 'Northline Supply Co.', actorId: 'usr-maya', actorName: 'Maya Chen', defaultCountry: 'US', defaultCurrency: 'USD' },
  products: [],
  feeds: [],
  feedRuns: [],
  issues: [],
  issueReviews: [],
  productChanges: [],
  feedChanges: [],
  issueActions: []
}
```

| Record | Shape and examples |
| --- | --- |
| `account` | String fields shown above. Use the synthetic operator and account defaults when a display field is missing. |
| `products[]` | `id` (`prd-001`), `offerId` (`NL-TRAIL-028`), optional `sku` (`TRAIL-028`), `title` (`Cedar Ridge 28 L Daypack`), `description`, `brand` (`Northline`), `condition` (`new`, `refurbished`, `used`), numeric `price` (`84.95`), `currency` (`USD`), `availability` (`in_stock`, `out_of_stock`, `preorder`, `backorder`), `status` (`approved`, `limited`, `disapproved`, `pending`), `visibility` (`visible`, `hidden`), `country` (`US`), `language` (`en`), `link` (`https://northline.example/products/cedar-ridge`), optional `imageLink`, `thumbnailKey`, `gtin`, `mpn`, nullable `feedId` (`null` for manual), `actor`, `createdAt`, `updatedAt`, nullable `deletedAt`. The UI resolves `thumbnailKey` to local artwork. Display stored URL attributes as text and avoid loading them. |
| `feeds[]` | `id` (`feed-001`), `name` (`North America storefront`), `type` (`primary`, `supplemental`), `method` (`file_upload`, `scheduled_fetch`), `country` (`US`), `language` (`en`), optional `sourceUrl` (`https://feeds.northline.example/catalog.tsv`), nullable `schedule` (`{ frequency: 'daily', time: '06:30', timezone: 'America/New_York' }`), optional `fixtureKey` (`north-america-catalog`), `status` (`never_run`, `success`, `partial`, `failed`), nullable `lastRunId` and `lastRunAt`, `actor`, `createdAt`, `updatedAt`, nullable `deletedAt`. |
| `feedRuns[]` | `id` (`run-001`), `feedId`, `trigger` (`upload`, `manual_update`), `status` (`success`, `partial`, `failed`), `input` (`{ fileName: 'catalog.tsv', sizeBytes: 4810 }` or `{ sourceUrl, fixtureKey }`), numeric `receivedCount`, `acceptedCount`, `rejectedCount`, `errors[]` (`{ row: 4, offerId: 'NL-TRAIL-028', code: 'invalid_price', message: 'Enter a valid price' }`; `row` and `offerId` may be null for file-level errors), `actor`, `createdAt`. |
| `issues[]` | `id` (`iss-001`), `code` (`missing_gtin`, `missing_image`, `price_mismatch`, `availability_mismatch`, `feed_validation`, `setup_policy`), `title`, `description`, `remediation`, optional `field` (`gtin`), optional string or number `observedValue`, `severity` (`error`, `warning`), `scope` (`product`, `feed`, `account`), `status` (`open`, `under_review`, `resolved`), `country`, nullable `productId` and `feedId`, optional `reviewOptions[]` of `website_check`, `fixed`, `disagree`, nullable `latestReviewId`, `resolution` and `resolvedAt`, `actor`, `createdAt`, `updatedAt`. |
| `issueReviews[]` | `id` (`rev-001`), `issueId`, nullable `productId` and `feedId`, `country`, `reason` (`website_check`, `fixed`, `disagree`), `acknowledged` (boolean), optional `explanation` (string), `status` (`submitted`), `actor`, `createdAt`. |
| `productChanges[]` | `id`, `productId`, optional `feedRunId`, `action` (`created`, `updated`, `visibility_changed`, `removed`), `changes`, `actor`, `createdAt`. |
| `feedChanges[]` | `id`, `feedId`, `action` (`created`, `updated`, `removed`), `changes`, `actor`, `createdAt`. |
| `issueActions[]` | `id`, `issueId`, nullable `productId` and `feedId`, optional `reviewId`, `action` (`resolved`, `review_requested`), `status` (resulting issue status), optional `resolution` (`data_corrected`, `product_removed`, `feed_removed`), `actor`, `createdAt`. |

`changes` is an object keyed by written business fields with `{ before, after }` values. Use `null` for an absent value. Include relationship and initial status fields on creation and the affected fields on edits. Keep price numerical and counts integral. Omit activity rows for unchanged values and cancelled actions. Use fallback actor `usr-maya` if an injected account has an empty actor ID.

## Relationships and mutation rules

- A primary run sets product ownership through `products[].feedId`. The association remains when the source setup type changes. A supplemental run can patch an existing active product and links via `productChanges[].feedRunId`. It preserves product ownership. Manual products have no source ID.
- Use `(country, language, offerId)` for active offer identity, normalizing whitespace and market/language casing. For a primary upload, upsert valid rows by that identity. Updating an existing row transfers ownership to the uploading primary source and preserves visibility; a new product starts Visible and Pending. Omitted rows are retained by this local import. A supplemental row must identify an existing product and contain a supported patch field.
- Upload uses a `File` in the browser, with UTF-8 CSV or TSV headers and quoted cells. Recognize `id` or `offer_id`, `title`, `description`, `brand`, `condition`, `price`, `availability`, `link`, `image_link`, `gtin`, and `mpn`. Country and language come from source setup. Accept a numeric price with the source market currency or an explicit supported currency code. Reject a missing identity, duplicate identities within an upload, incomplete primary inserts, and unparseable or invalid supplied fields. Limit uploads to 1 MB with an actionable error. No binary content belongs in state.
- An Update now run uses a fixed local fixture mapped by `fixtureKey`. On a saved source URL change, derive the key from an exact match in the local fixture registry or clear it. Provide `https://feeds.northline.example/catalog.tsv` as a sample link that resolves to `north-america-catalog`. If no fixture can be resolved, produce a `missing_fixture` error. An eligible direct-upload source shows Upload file instead of Update now. An explicitly submitted malformed file produces a failed run. On parsed rows, `receivedCount = acceptedCount + rejectedCount`; zero accepted rows means Failed, mixed results mean Partial, and all accepted rows mean Success. Use zero counts with a file-level error when rows could not be parsed. No periodic processing or remote requests.
- A product or feed can have multiple issue rows. A valid local GTIN (8, 12, 13 or 14 digits with a valid check digit) or a valid explicit image URL can resolve its matching open issue after that field changes. Remote reachability and policy issues use the review path. For a supported approval recomputation, remaining open errors imply Disapproved, remaining open warnings imply Limited, and remaining reviews imply Pending. With no remaining linked active issue after a local correction, use Approved. Preserve an unrelated injected status when no issue transition applies.
- Removing a product sets a tombstone and closes its active issues. Removing a feed also removes products whose feedId matches that source and closes associated active issues. Preserve an active product issue if the product has moved to another source, even if that issue retains the old source ID. Removing a supplemental feed closes its feed-scoped issues and retains products it only updated. Keep reviews and historical runs addressable. Filter tombstones from active collections and count metrics.

## Seed matrix

| Collection | Fixed seed coverage |
| --- | --- |
| Products | At least 48 in outdoor gear, home goods and accessories, with similar names for useful search. Include manually added and feed-owned items, hidden and visible listings, all statuses and availability values, and US/CA/GB markets with USD/CAD/GBP. Use local thumbnails or intentional placeholders. |
| Feeds and runs | At least 24 feeds across both types and methods. Include pending first use, a healthy source, partial acceptance and a failed source, plus a configured scheduled fixture and examples with multiple historical runs. |
| Issues and reviews | At least 30 issues spanning product, feed and account scope, multiple issue codes and markets, and the full range of statuses and severities. Include an open fixable item, an independently reviewable item, a resolved item, and a product with two unrelated open issues. Link seeded submitted reviews back to their issue. |
| Activity | Use explicit fixed IDs and past ISO timestamps across several days for seeded changes, runs, reviews and resolutions. Seed coherent `lastRunId` and `latestReviewId` references. |
