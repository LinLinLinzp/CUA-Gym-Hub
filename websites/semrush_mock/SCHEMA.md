# semrush_mock Schema

**Base URL**: `http://localhost:5469/`  
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}`

The `semrush` store loads defaults from `src/data/seed.js`. A fresh browser context reads injected state through `GET /state?sid=<sid>`, which returns `{stored_state, has_custom_state, sid}`. Injected arrays replace defaults and objects merge recursively. The shared API restores the stored baseline on reset. Inspect the result through `/go` and use a fresh browser context when loading a reset or newly injected session.

## State Schema

All IDs are strings. Every project, campaign, keyword, competitor, audit configuration, run, issue and page has `id`, `createdAt` (ISO timestamp) and `createdBy` (account ID). Editable rows receive `updatedAt` and `updatedBy` when edited. Seed dates and IDs are fixed. New IDs are UUIDs with a collection prefix.

| Key | Type | Shape and joins |
| --- | --- | --- |
| `account` | Object | `id`, `name`, `workspaceName`. The default actor is Maya Chen (`user-maya`). |
| `projects` | Array | `name`, normalized hostname `domain`, `ownerId`, `ownerName`, `tags: string[]`, `pinned: boolean`. Owner IDs can identify synthetic colleagues. |
| `trackingCampaigns` | Array | `projectId` → project, `targetType` (`root_domain`, `subdomain`, `subfolder`, `url`), `target`, `searchEngine` (`google`, `bing`), `device` (`desktop`, `mobile`, `tablet`), `location`, `language`, `status: "active"`, `startedAt` (ISO), and `history`. A history observation has `date` (YYYY-MM-DD), numeric `visibility` (0–100), `estimatedTraffic`, `averagePosition`. |
| `trackedKeywords` | Array | `campaignId` → campaign, `term`, `tags: string[]`, `position`, `previousPosition`, `volume` (number or null), and `landingUrl` (string or null). Ranks range from 1 to 100. New records have unknown metrics. |
| `trackingCompetitors` | Array | `campaignId` → campaign, normalized `domain`, `visibility`, `estimatedTraffic`, `top10` (number or null). |
| `auditConfigs` | Array | `projectId` → project and crawl settings. The UI uses the most recent configuration for the project and supplies display and run defaults for omitted settings. |
| `auditRuns` | Array | `projectId` → project, `auditConfigId` → configuration, `runNumber: number`, `status: "completed"`, `startedAt`, `completedAt` (ISO), `healthScore` (number or null), `pagesCrawled: number`, `settingsSnapshot` (crawl settings at execution). |
| `auditIssues` | Array | `runId` → run, `checkKey`, `title`, `severity` (`error`, `warning`, `notice`), `affectedPageIds: string[]` → pages from the same run, `description`, `remediation`. |
| `auditPages` | Array | `runId` → run, `url`, `httpStatus: number`, `depth: number`, `title`. |
| `activity` | Append-only array | `id`, `type`, `actorId`, `createdAt`, `projectId`, and `details`. Tracking events include `campaignId`. Audit events include `auditConfigId` and `runId` when tied to a run. Links to deleted records remain in activity. |

Crawl settings contain `scope` (hostname with optional path), `pageLimit` (integer 1–1,000), `crawlSource` (`website`, `robots_sitemap`, `sitemap_url`), `sitemapUrl` (HTTP(S) URL or null), `crawlerDevice` (`desktop`, `mobile`), `allowPaths` and `disallowPaths` (string arrays), `schedule: { frequency, weekday }` and `excludedCheckKeys: string[]`. Frequency is `once`, `daily` or `weekly`. Weekday is a day name for weekly schedules and null otherwise. Runs crawl a bounded local fixture. Scope and path rules filter candidate paths, with disallow taking precedence. Schedule preferences are stored for inspection. Each new run is initiated by the user.

### Default IDs

The Northstar Supply fixture includes these linked records.

| Record | IDs |
| --- | --- |
| Account | `user-maya` |
| Project | `prj-northstar` |
| Tracking campaigns | `trk-northstar-mobile`, `trk-northstar-desktop` |
| First mobile keyword and competitor | `kw-northstar-mobile-01`, `cmp-northstar-mobile-1` |
| Audit configuration and runs | `adc-northstar`, `adr-northstar-01`, `adr-northstar-02` |
| Latest run's broken internal links issue and home page | `adi-northstar-02-001`, `adp-northstar-02-001` |

## Minimal Inject Example

```json
{
  "projects": [{"id":"prj-example","name":"Example Supply","domain":"example-supply.example"}],
  "trackingCampaigns": [],
  "trackedKeywords": [],
  "trackingCompetitors": [],
  "auditConfigs": [],
  "auditRuns": [],
  "auditIssues": [],
  "auditPages": [],
  "activity": []
}
```

## Observable State Changes (for LLM evaluation)

Each successful action below posts the whole state once with the app's state helper. All timestamps use the browser's current clock.

| User action | Business state written | Activity type and details |
| --- | --- | --- |
| Create project | Append to `projects`. | `project.created` with `name`, `domain`. |
| Save changed project settings | Update changed `projects.name` and/or `projects.tags` plus edit metadata. | `project.updated` with `changes` containing new values. |
| Pin or unpin | Update `projects.pinned` and edit metadata. | `project.pin_changed` with `pinned`. |
| Confirm project deletion | Remove the project and linked rows from `trackingCampaigns`, `trackedKeywords`, `trackingCompetitors`, `auditConfigs`, `auditRuns`, `auditIssues`, `auditPages`. | `project.deleted` with `name`, `domain`, `removedIds` keyed by all eight collections, including `projects`. |
| Start tracking | Append campaign and associated `trackedKeywords`. | `tracking.started` with `keywordIds`. |
| Add keywords | Append new `trackedKeywords` under the selected campaign. | `tracking.keywords_added` with `keywordIds`. |
| Apply keyword tags | Update `trackedKeywords.tags` and edit metadata on changed rows. | `tracking.tags_changed` with changed `keywordIds`, submitted `tags`, `mode` (`add` or `remove`). |
| Confirm keyword removal | Remove selected rows from `trackedKeywords`. | `tracking.keywords_removed` with `keywordIds`. |
| Add or remove a competitor | Append or remove one row from `trackingCompetitors`. | `tracking.competitor_added` or `tracking.competitor_removed` with `competitorId`, `domain`. |
| Start audit | Save all validated crawl settings to `auditConfigs`, including defaults accepted in the form. For an existing configuration, keep its ID and excluded checks and write edit metadata. Append one `auditRuns` row with the effective settings in `settingsSnapshot`, its `auditPages` and its `auditIssues`. | `audit.completed` with `runNumber`, `pagesCrawled`, `healthScore`, and the new run ID on the event. |
| Exclude or restore a check | Update `auditConfigs.excludedCheckKeys` and edit metadata. Existing run snapshots, issues and pages retain their stored values. | `audit.check_excluded` or `audit.check_restored` with `checkKey` and `issueId` when the action originates from a specific issue. |
| Save changed audit settings | Update changed crawl settings on `auditConfigs` plus edit metadata. | `audit.settings_updated` with `changes` containing new values. |
| Confirm audit rerun | Append `auditRuns`, `auditIssues`, `auditPages` with a new run ID and increasing run number. Use the saved settings and skip excluded checks. | `audit.completed` with `runNumber`, `pagesCrawled`, `healthScore`, and the new run ID on the event. |

Search, filters, sorting, pagination, route and report selections, cancellations, validation errors, unchanged submissions, downloads, and comparisons are read-only with respect to Harbor state.

