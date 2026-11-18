# Proposed Harbor state model

All state is JSON. IDs are opaque strings. New business records use collision-safe local IDs. Dates on new records use `new Date().toISOString()`. The app uses fixed seed IDs and dates, and the signed-in account is the default actor. Display layers can fall back for absent optional values and skip unresolvable joins. Preserve unknown injected fields when updating existing records.

| Root key | Type | Relationship |
| --- | --- | --- |
| `account` | Account object | Actor for user mutations |
| `projects` | Project array | Parent site records |
| `trackingCampaigns` | Campaign array | `projectId` → project |
| `trackedKeywords` | Keyword array | `campaignId` → campaign |
| `trackingCompetitors` | Competitor array | `campaignId` → campaign |
| `auditConfigs` | Audit configuration array | `projectId` → project, one active configuration per project |
| `auditRuns` | Audit run array | `auditConfigId` → configuration and `projectId` → project |
| `auditIssues` | Audit issue array | `runId` → run and `affectedPageIds[]` → pages from that run |
| `auditPages` | Audit page array | `runId` → run |
| `activity` | Activity array | Actor and linked IDs, including links to removed records |

## Shared fields

- User-created projects, campaigns, keywords, competitors, configs, runs, issues and pages have `id`, `createdAt` and `createdBy` strings. Example values are `kw-001`, `2026-10-08T15:00:00.000Z` and `user-maya`.
- Editable records support `updatedAt` and `updatedBy`, optional strings populated at creation if convenient and set on subsequent edits.
- For injected data, guard collection reads at the selector layer. Missing display fields render a useful fallback. A null metric means unavailable. Zero stays zero. Missing nested collections have empty read-time defaults.

## Account and projects

| Entity | Fields and example values |
| --- | --- |
| Account | `id: string = "user-maya"`, `name: string = "Maya Chen"`, `workspaceName: string = "Search Operations"` |
| Project | `name: string = "Northstar Supply"`, `domain: string = "northstar-supply.example"`, `ownerId: string = "user-maya"`, `ownerName: string = "Maya Chen"`, `tags: string[] = ["Retail", "Priority"]`, `pinned: boolean = true` |

Normalize project domains to lowercase hostnames. Accept a domain or valid HTTP(S) URL in the form and extract the hostname, with an error for inputs that lack a valid domain. Derive tool badges from joined records. Use `createdAt` as a default sort key within pin groups and a stable ID tie-breaker.

## Position Tracking

| Entity | Fields and example values |
| --- | --- |
| Campaign | `projectId: string = "prj-northstar"`, `targetType: enum = "root_domain"` (`root_domain`, `subdomain`, `url`, `subfolder`), `target: string = "northstar-supply.example"`, `searchEngine: enum = "google"` (`google`, `bing`), `device: enum = "mobile"` (`desktop`, `mobile`, `tablet`), `location: string = "Seattle, Washington, United States"`, `language: string = "English"`, `status: enum = "active"`, `startedAt: ISO string`, `history: Observation[]` |
| Observation | `date: YYYY-MM-DD string = "2026-10-08"`, `visibility: number = 27.6`, `estimatedTraffic: number = 740`, `averagePosition: number = 18.2`. Sort by date. A visibility percentage uses a 0–100 scale. |
| Keyword | `campaignId: string = "trk-northstar-mobile"`, `term: string = "insulated shipping boxes"`, `tags: string[] = ["Packaging"]`, `position: number|null = 8`, `previousPosition: number|null = 11`, `volume: number|null = 590`, `landingUrl: string|null = "https://northstar-supply.example/insulated-boxes"` |
| Competitor | `campaignId: string = "trk-northstar-mobile"`, `domain: string = "parcelworks.example"`, `visibility: number|null = 24.1`, `estimatedTraffic: number|null = 610`, `top10: number|null = 13` |

Keyword comparisons trim and case-fold terms while retaining the display spelling. Normalize and deduplicate tags case-insensitively. Per-campaign ranks are integers 1–100 or null. Movement equals `previousPosition - position` when both are available. Top-N counts include a ranked term when its current position is at most N. Initialize newly tracked terms with null metrics and campaigns with an empty history. Additional campaigns for a project can use a distinct target, device, engine or location. UI selection comes from the route, with a stable fallback to the most recent campaign.

## Site Audit

| Entity | Fields and example values |
| --- | --- |
| Audit configuration | `projectId: string = "prj-northstar"`, `scope: string = "northstar-supply.example"`, `pageLimit: number = 100`, `crawlSource: enum = "website"` (`website`, `robots_sitemap`, `sitemap_url`), `sitemapUrl: string|null = null`, `crawlerDevice: enum = "mobile"` (`desktop`, `mobile`), `allowPaths: string[] = ["/products"]`, `disallowPaths: string[] = ["/cart"]`, `schedule: object = { frequency: "once", weekday: null }` (frequency `once`, `daily`, or `weekly`, with weekday required for `weekly`), `excludedCheckKeys: string[] = ["internal_nofollow"]` |
| Audit run | `projectId: string = "prj-northstar"`, `auditConfigId: string = "adc-northstar"`, `runNumber: number = 2`, `status: enum = "completed"`, `startedAt: ISO string`, `completedAt: ISO string`, `healthScore: number = 82`, `pagesCrawled: number = 36`, `settingsSnapshot: object` (copy of all crawl fields from `scope` through `excludedCheckKeys`) |
| Audit issue | `runId: string = "adr-northstar-02"`, `checkKey: string = "broken_internal_links"`, `title: string = "Broken internal links"`, `severity: enum = "error"` (`error`, `warning`, `notice`), `affectedPageIds: string[] = ["adp-northstar-02-003"]`, `description: string`, `remediation: string` |
| Audit page | `runId: string = "adr-northstar-02"`, `url: string = "https://northstar-supply.example/products/folding-cartons"`, `httpStatus: number = 404`, `depth: number = 2`, `title: string = "Folding Cartons"` |

Create page paths and affected page links from fixed local fixtures. Scope and allow/disallow rules control which fixture paths are eligible. Disallow takes precedence and the generated page count is capped by `pageLimit`. Use check keys such as `broken_internal_links`, `duplicate_title`, `missing_meta_description` and `temporary_redirect`. Group findings by individual check key and severity. Derive severity totals from visible check rows. Store the completed run score alongside its settings snapshot. Excluded keys suppress active-view issues and generation on future runs. Past reports use their original issue and page records. Restoring a check makes it eligible on the next run and can reveal existing findings in the active run when available.

## Activity

Each entry stores `id: string`, `type: string`, `actorId: string`, `createdAt: ISO string`, `projectId: string`, and `details: object`. Tool events also carry `campaignId`, `auditConfigId` or `runId` where relevant. Append an event in the same state save as the corresponding mutation. Preserve historical events after deletions. `details` fields by event type follow.

| Type | Details |
| --- | --- |
| `project.created` | `name`, `domain` |
| `project.updated` | `changes` with changed fields and their new values |
| `project.pin_changed` | `pinned` |
| `project.deleted` | `name`, `domain`, `removedIds` mapping collection keys to arrays of removed IDs |
| `tracking.started`, `tracking.keywords_added`, `tracking.keywords_removed` | `keywordIds: string[]` |
| `tracking.tags_changed` | `keywordIds: string[]`, `tags: string[]` for the submitted operation, `mode: "add"\|"remove"` |
| `tracking.competitor_added`, `tracking.competitor_removed` | `competitorId`, `domain` |
| `audit.completed` | `runNumber`, `pagesCrawled`, `healthScore` |
| `audit.settings_updated` | `changes` with changed settings and their new values |
| `audit.check_excluded`, `audit.check_restored` | `checkKey`, optional `issueId` |

## Seed construction

Have `createInitialData()` return fresh plain data with all root keys above. Use fixtures and deterministic counters for stable identifiers, English project labels and sector-specific keyword and URL pools. Feature Northstar Supply and include sample projects such as Alder Trail Outfitters, Harborlight Finance and Lumen Desk. Use only `.example` domain names. Spread the 32 projects across several synthetic owners and tags, with mixed tool setup states and several pinned projects. Seed at least 36 keywords on the featured campaign with positive, negative, unchanged and unranked examples. Other campaigns have their own keywords and competitors. Include 14 visibility observations on the featured campaign, and distribute at least 32 audit runs across configs with representative issue and page results and at least two runs on the featured project. Start `activity` as `[]` so verifier diffs show user actions clearly.
