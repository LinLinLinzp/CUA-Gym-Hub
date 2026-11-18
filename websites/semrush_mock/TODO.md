# Semrush — TODO

> Status: DEV VERIFIED  
> Last updated by: dev agent, 2026-11-18  
> Design: `DESIGN.md` | Research: `assets/README.md` | Data model: `assets/data_model.md`

## Status legend

- [ ] Planned
- [~] In progress
- [x] Verified

## P0 — Application and Harbor integration

- [x] Scaffold Vite and React with React Router, commit-ready `package-lock.json`, build script, and strict dev port 5469. Use the root `templates/state-api.js` from `vite.config.js` and copy `templates/dataManager.js` unchanged to `src/utils/dataManager.js`. The state API serves `/go` as JSON.
- [x] Set up the router and shared layout. `/` opens Projects. Support `/projects`, `/projects/:projectId`, `/position-tracking`, `/projects/:projectId/position-tracking`, `/site-audit`, `/projects/:projectId/site-audit` and `/projects/:projectId/site-audit/issues/:issueId`. Tool index routes list projects and link to each tool's setup or report. Keep report tabs and campaign/run selections in query parameters where useful. Preserve `sid` on all links, form-driven navigation and tab changes. Keep the store and toast provider available on each route, including deep links and an unknown-project recovery view.
- [x] Load `loadState('semrush', createInitialData)` once before rendering routes. Use a single mutation entry point that updates the whole state and calls `saveState('semrush', nextState)` once per successful business action. Keep drafts, filters, sorting, pagination, dialogs and toast state in the UI. Keep timers, custom state normalization, route entry and selection changes free of business-state writes. Handle empty, partial and large injected collections. Render an initial loading view and clear empty states.
- [x] Implement the original workspace from `DESIGN.md` with text branding, responsive navigation, accessible inputs and tables, and original local CSS-drawn charts and markers. Build and operate offline. Finish `SCHEMA.md` against implementation, including all keys, joins and an Observable State Changes table.

## P1 — Projects

- [x] **Find and open projects.** Show project name, domain, owner, tags, pin status, Position Tracking visibility and Site Audit health or a setup link where data is absent. Search case-insensitively across name and domain, filter by owner/tag, sort with pinned rows first, and paginate at 15 rows. Show an action-oriented empty state for zero projects and a clear-filters action for zero matches. Row names open a project overview with direct tool links. Navigation and view controls write no records.
- [x] **Create and edit a project.** Open a form from Create project with domain and optional project name, defaulting the name to the normalized hostname. Trim and validate inputs, reject duplicate active domains, and leave the dialog open with an inline error on failure. New projects open on their overview with both setup actions. Project settings supports renaming and editing tags. Create appends `projects` and a `project.created` entry to `activity`; save edits update `projects.name`, `projects.tags`, `projects.updatedAt` and `projects.updatedBy` and append `project.updated` when a value changed.
- [x] **Pin or delete a project.** Pin and unpin from the row menu and reflect the change in list order. Update `projects.pinned`, `updatedAt`, `updatedBy` and append `project.pin_changed`. Delete uses a confirmation that names the project and describes the associated tool data removal. Remove the project and linked rows from `trackingCampaigns`, `trackedKeywords`, `trackingCompetitors`, `auditConfigs`, `auditRuns`, `auditIssues` and `auditPages` in one save. Append `project.deleted` with removed IDs grouped by collection and return to Projects. Cancel leaves state unchanged.

## P1 — Position Tracking

- [x] **Configure and start tracking.** Use a Targeting → Keywords form with back navigation, reachable from project setup or Add target on an existing report. Capture target domain/scope, search engine, device, location and language. Offer Google and Bing, desktop/mobile/tablet, and a local list of country and city choices. Require at least one nonempty keyword, entered on separate lines or with commas, with optional common tags and a preview count. Deduplicate terms case-insensitively within the campaign. Start Tracking appends one active `trackingCampaigns` record, its `trackedKeywords` records and `tracking.started` with campaign and keyword IDs in one save. Open the new campaign and offer a target selector when multiple campaigns exist. Cancel and validation failures leave state unchanged.
- [x] **Read the rankings.** Show visibility, estimated traffic, average position and counts for top 3, 10, 20 and 100. Display a locally drawn visibility chart where history exists and a Rankings table with keyword, tags, current and previous positions, movement, volume and landing URL. Provide keyword search, tag and position-band filters, sorting and pagination. Filter chips and summary counts can take users to the matching Rankings view. Present null ranks and empty history as unavailable. These interactions write no records.
- [x] **Manage tracked keywords.** Add terms from the report and select rows for tagging or removal. Preview the affected count and confirm bulk removals. Add appends `trackedKeywords` and `tracking.keywords_added`; tag updates `trackedKeywords.tags`, `updatedAt` and `updatedBy` and appends `tracking.tags_changed`; removal deletes keyword rows and appends `tracking.keywords_removed` with removed IDs. A duplicate-only submission or unchanged tag set leaves state unchanged.
- [x] **Manage competitors.** In a Competitors tab, add, list and remove normalized competitor domains for the current campaign. Reject the tracked domain and duplicates. Add appends `trackingCompetitors` and `tracking.competitor_added`; remove deletes that row and appends `tracking.competitor_removed`. Display synthetic comparison metrics when available and leave missing fields blank with an accessible unavailable label.

## P1 — Site Audit

- [x] **Configure and start an audit.** Capture scope, page limit, crawl source (Website, Robots.txt sitemap, or Sitemap URL), crawler device, allow/disallow paths, and optional schedule preference. Require a valid sitemap URL for that source and a positive bounded page limit. Start Audit creates `auditConfigs`, a completed `auditRuns` row, corresponding `auditIssues` and `auditPages`, and an `audit.completed` event sharing the new run ID. Generate results locally and deterministically on submit. A schedule preference records the selected cadence in `auditConfigs.schedule` and does not trigger later jobs.
- [x] **Review results and drill into affected pages.** Show Site Health, crawled-page count, run date and Errors, Warnings and Notices with access to Issues and Crawled pages. Search and filter issues by severity, select an issue to inspect affected URLs and remediation guidance, and filter crawled pages by URL or status. Show run history and retain stable deep links to previous run issues. Navigation and view controls write no records.
- [x] **Exclude and restore a check.** Offer Exclude check from an issue row/detail and restore it from Settings → Excluded checks. Update `auditConfigs.excludedCheckKeys`, `updatedAt` and `updatedBy` and append `audit.check_excluded` or `audit.check_restored` with the check key and relevant IDs. Filter excluded checks from the current active report view. Keep stored run snapshots intact and skip excluded checks when generating a new run.
- [x] **Save settings and run again.** Open Audit settings from the report. Saving a changed form updates the corresponding `auditConfigs` fields, `updatedAt` and `updatedBy` and appends `audit.settings_updated`. Run again uses the saved settings to append `auditRuns`, `auditIssues`, `auditPages` and `audit.completed` with a new run ID and increasing run number. Open the new report after saving and keep earlier reports available.

## P2 — Report depth

- [x] Export the currently filtered Rankings or Issues table as a locally generated CSV. Keep downloads read-only with respect to Harbor state.
- [x] Add a comparison view for issues added or resolved between two runs, derived from check keys and affected URL paths.

## Seed and acceptance

- [x] Seed all ten root keys from `assets/data_model.md` in `src/data/seed.js`. Use fixed IDs, fixed dates, fictional English names and `.example` hostnames. Include 32 projects, 26 tracking campaigns, at least 36 keywords on the featured campaign, at least 26 competitor records across campaigns, 26 audit configs and at least 32 runs. The featured audit has 36 crawled pages and a mix of checks across all severities. Seed mixed setup states, measurable trends, a prior run, and a complete set of linked records.
- [x] Run `npm run build` and use installed Playwright Chromium via `PILOT_PLAYWRIGHT` against localhost port 5469. In `TEST.md`, record Projects creation, edits and deletion, Position Tracking setup and keyword/competitor changes, Site Audit setup, exclusion, settings changes and rerun. Inspect session-scoped `/go` fields for each action. Check injection with empty arrays and partial records, deep-link reloads, isolation across two `sid` values and an idle tab with zero mutation posts. Use a fresh session and browser context for each injected world. Keep scratch files ignored or remove them.

## Out of scope

- Authentication, billing, real crawls, real search data, external integrations, invitations and automatic scheduled jobs. The signed-in persona is Maya Chen.
- Repository commits, pushes and Docker certification belong to the parent runner.
