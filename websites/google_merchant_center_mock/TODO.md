# Google Merchant Center implementation plan

> READY FOR DEV · Plan agent · 2026-11-18  
> [Workflow research](assets/README.md) · [Data model](assets/data_model.md) · [Original design](DESIGN.md)

Use `[ ]` for pending work and `[x]` for verified completion. Products, feeds, and issues are each required P1 workflows from [SEED.md](SEED.md).

## P0 — Application shell and Harbor integration

- [x] **Vite and routing.** Build React routes `/`, `/products`, `/products/new`, `/products/:id`, `/products/:id/edit`, `/data-sources`, `/data-sources/new`, `/data-sources/:id`, `/issues`, and `/issues/:id`. Render the account frame, active section, breadcrumbs for details, and an in-app recovery link for an unknown route or record. Keep `?sid=` across React Router navigation, including redirects, and use the template `withSid()` for links leaving the router. Place every route and fallback inside the providers it consumes. Configure strict port `5470` and local-only development. Build and preview the offline bundle with the lockfile.
- [x] **One state-writing boundary.** Import the unchanged `templates/state-api.js` into Vite and copy `templates/dataManager.js` unchanged to `src/utils/dataManager.js`. Define `createInitialData()` in `src/data/seed.js`. Resolve a single `loadState(APP, createInitialData)` before route rendering and show a neutral loading state meanwhile. Each successful user business action computes a whole next state from the latest in-memory snapshot and calls `saveState(APP, nextState)` once at the store boundary. Keep the baseline and `set_current` protocol as provided. Obtain `/go` from the state API with `initial_state`, `current_state`, and `state_diff` for the same sid.
- [x] **Injected state and idle behavior.** Use safe read defaults for arrays and optional fields, tolerate unresolved related IDs, and handle zero, one, and hundreds of rows. Retain injected unknown fields during edits. Keep searches, filters, tabs, selection, draft edits, and notices transient. Render dates defensively with `new Date()` for any relative calculations. A saved feed schedule is configuration. Boot, timer, reload, and passive-tab checks follow the Harbor contract, with no periodic writes.
- [x] **Seed and dashboard.** Present Northline Supply Co. and the synthetic signed-in operator in the shell. Derive catalog counts and attention and feed summaries from the current records. Dashboard actions link to filtered lists or specific records. Seed fixed English data with at least 48 products, 24 data sources, and 30 issues, plus representative activity records and dependable cross-links. Cover multiple markets, products with multiple issues, healthy and failed feeds, hidden and out-of-stock products, and all documented statuses. See the seed matrix in the data model.
- [x] **Verification and handoff.** Implement keyboard-operable controls, visible focus, labelled forms, inline errors, empty and no-results states, and confirmation for removal. Write `SCHEMA.md` with all top-level keys, record shapes and exact action-to-field mapping. Playwright on `localhost:5470` using Node from `PILOT_PLAYWRIGHT` must exercise all three P1 groups, assert `/go` records, verify state after reload, and check injection, sid isolation, and passive tabs. Capture evidence in `TEST.md`; the parent runner handles Docker certification and commits. Put runner scratch files in an ignored location or remove them.

## P1 — Required workflows

### Products

- [x] **Browse the catalog.** List thumbnail, title and offer ID, approval status, visibility, availability, price, market, and source. Search title/SKU/offer ID, combine status, visibility, availability, market and source filters, sort on title/price/last updated, clear filters, and paginate at 20 rows. Title opens details with linked issues and source. Read operations leave business state untouched.
- [x] **Add and edit products.** Offer Add product and Edit product with title, offer ID at creation, description, brand, condition, price and currency, availability, country, language, landing-page URL, image URL and optional GTIN/MPN. Show field errors for duplicate active offer identity, invalid price or format, or missing required fields. New manual items start Pending and Visible. Save appends or patches `products[]` and appends a `productChanges[]` row (`created` or `updated`) with `productId`, exact `changes`, `actor`, and `createdAt`. For issue-linked edits, apply the issue rules below in the same save.
- [x] **Change visibility and remove.** Row/detail actions and bulk selection can Hide or Show, with a count and confirmation for bulk changes. Apply only to selected active records whose values change. Persist `products[].visibility`, `updatedAt`, and one `productChanges[]` row per affected ID. Confirm Remove on editable manual products, setting `deletedAt`/`updatedAt`, recording `removed`, and closing associated active issues as `product_removed` in the same save. Show a removed or missing state on the detail link. Feed-owned products can be hidden or shown and direct operators to the source for removal.

### Feeds (Data sources)

- [x] **Find and inspect sources.** List source name, input method, primary/supplemental type, market and language, last update, reporting status, and link to details. Search by name and filter by type/status/method. Detail shows Setup and Update history with last result, row counts, errors, filename or feed link and saved schedule. Link related catalog products and issue records. Reads leave business state untouched.
- [x] **Create and configure a feed.** Offer a File upload or Scheduled fetch flow with name, type, market, language and a source URL for scheduled fetch. Validate names, link format and schedule fields, and offer Daily/Weekly/Monthly frequency and local time with a timezone. Provide a “Use sample file link” control for a runnable local fixture. Allow later configuration edits. Save appends or patches `feeds[]` and appends `feedChanges[]` (`created` or `updated`) with `feedId`, exact `changes`, `actor`, and `createdAt`. Creating or editing configuration does not run the feed.
- [x] **Upload a file or run Update now.** Read a small local CSV/TSV file in the browser or evaluate the saved synthetic fixture via Update now. Present the filename, processing result, counts, and row errors in history. Use deterministic validation and result rules from the data model, no remote fetch. Each confirmed run appends `feedRuns[]` with status, trigger, input metadata, counts and errors, then updates `feeds[].status`, `lastRunId`, `lastRunAt` and `updatedAt`. Accepted primary rows upsert linked `products[]` and `productChanges[]`. Report stale source associations safely. The run commits its writes together, even for a user-triggered processing failure that produces only a result record and feed metadata.
- [x] **Remove a source.** From detail, show a confirmation with the affected product count. Set the source's `deletedAt` and `updatedAt`, record `feedChanges[].action = 'removed'`, and keep historical run rows. The same save records removals on active products owned by that primary source and closes their active issues. Retain products belonging to other sources and any whose data a supplemental source updated.

### Issues (Needs attention)

- [x] **Triage issues.** Link Needs attention from the product list and dashboard. Show counts and a searchable list with issue title, severity or impact, status, country and affected product/source. Support impact, status, market and issue-type filters. Open issue details with explanation, affected field/value where provided, concrete remediation and links to affected records. Keep resolved items available via the status filter. Reads leave business state untouched.
- [x] **Fix a product issue.** For locally verifiable issue codes (for example `missing_gtin` or `missing_image`), open Edit product at the relevant field. In the same save as the valid product correction, set matching open `issues[]` records to `resolved`, set `resolution = 'data_corrected'`, `resolvedAt` and `updatedAt`, and append `issueActions[]` with `action = 'resolved'`, actor, time and related IDs. Keep unrelated sibling issues active and recompute product approval status from the supported issue impacts when appropriate.
- [x] **Request a check or review.** Offer Request website check, Request review, or I disagree where allowed by `reviewOptions`. Collect acknowledgement for a reported fix and a nonempty explanation for disagreement. Confirm to set `issues[].status = 'under_review'`, `latestReviewId`, and `updatedAt`, and append an `issueReviews[]` record (`submitted`) and an `issueActions[]` record (`review_requested`). Show the request in issue detail, prevent duplicates while under review, and keep that state across reload. Requests remain under review until an explicit applicable user action changes the world.

## P2 — Secondary depth

- [x] **Export the filtered issue rows.** Create a local CSV containing issue code, impact, status, market and related offer/source identifiers. Respect current filters, escape spreadsheet-interpreted values, and leave business state untouched.

## Release scenarios

| Workflow | Required proof from `/go` |
| --- | --- |
| Products | Create a manual product, edit it, then hide it. Verify its identity, edited fields, visibility, and action rows. |
| Feeds | Create and edit a source configuration, upload a local fixture or run a configured source, and inspect history. Verify configuration fields, run input/counts/status and resulting product linkage for a successful primary upload. Exercise a rejected row or failed run. |
| Issues | Resolve a fixable seeded issue through a product edit and submit a review for a different issue. Verify resolution fields, the related product edit, review ID and reason, and both audit records. |

Test confirmation cancellation and validation, deep links and reloads, an empty injected catalog, a sparse linked record, large lists, an idle tab and isolation between two sids. Document extra implemented mutating actions in `SCHEMA.md` and exercise their observable state changes in `TEST.md`.

## Scope

The account starts signed in as Maya Chen. Keep catalog operations local. Authentication, account creation, real store integrations, ingestion from external servers, external notifications and real policy decisions are outside this phase.

