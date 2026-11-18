# Semrush Mock — Test Report

> Round 2  
> Date 2026-11-18  
> Server http://localhost:5469  
> Tested by playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Route patterns tested, including fallback | 8 |
| Passing Playwright check groups | 11 |
| Failed Playwright check groups | 0 |
| Business actions verified in the primary session | 17 |

`npm run build` passed. The Playwright checks ran against the Vite development server on port 5469 using the installed Chromium and `PILOT_PLAYWRIGHT`. Chromium reported zero page errors, console errors, or external requests. The shared `dataManager.js` matched the repository template byte for byte.

## ✅ Passing Tests

Each primary-session business action sent one `set_current` POST. The test compared consecutive `/go?sid=…` snapshots and checked exactly which top-level fields changed. Every write included an `activity` event with an actor, a timestamp and the relevant IDs.

### Projects

| Exercise | Verified through the UI and `/go` |
| --- | --- |
| Directory and navigation | Search matched domain case-insensitively. Owner and tag filters, sorting, clearing filters, forward and back pagination, tool indexes and the Semrush link worked. Directory controls left state unchanged. |
| Create project | Invalid and duplicate domains kept the form open. Close and Cancel dismissed it. Successful creation appended `projects` with a new ID, normalized domain, default name and owner, plus `activity` with `project.created`. The overview offered both tools. |
| Edit project | Updated `projects.name`, `tags`, `updatedAt` and `updatedBy`. Added `project.updated` to `activity` with the changed values. Saving identical settings sent zero mutation posts. |
| Pin and unpin | Each action changed `projects.pinned` and edit metadata, and added `project.pin_changed` to `activity`. A pin moved the project to the top group. |
| Delete project | Cancelling left state unchanged. Confirming removed linked records from `projects`, `trackingCampaigns`, `trackedKeywords`, `trackingCompetitors`, `auditConfigs`, `auditRuns`, `auditIssues` and `auditPages` in a single save. `activity` retained earlier events and added `project.deleted` with removed IDs grouped by collection. The deleted-project deep link showed recovery. |

### Position Tracking

| Exercise | Verified through the UI and `/go` |
| --- | --- |
| Set up tracking | The Targeting and Keywords steps supported Back, cancellation and validation. Start appended `trackingCampaigns` with the target, scope, engine, device, location, language and active status. It appended deduplicated `trackedKeywords` with null metrics and added `tracking.started` to `activity` with matching campaign and keyword IDs. |
| Read Overview and Rankings | Seeded charts, target switching, Top 10 drilldown, search, tag and position filters, volume sorting, pagination and filtered CSV worked with unchanged state. A campaign deep link survived reload. Variants with the same target, engine, device and location were distinguishable by scope and language. |
| Add keywords | Appended `trackedKeywords` and `activity` with `tracking.keywords_added` and the new IDs. Duplicate-only input sent zero mutation posts. |
| Tag keywords | Updated `trackedKeywords.tags`, `updatedAt` and `updatedBy`. Added `tracking.tags_changed` to `activity` with affected IDs. Repeating an unchanged tag action sent zero mutation posts. |
| Remove keywords | Confirmation removed selected `trackedKeywords` and added `tracking.keywords_removed` to `activity` with the removed IDs. Cancellation left state unchanged. |
| Manage competitors | The tracked domain and duplicate competitors were rejected. Adding and removing a normalized domain changed `trackingCompetitors` and appended `tracking.competitor_added` or `tracking.competitor_removed` to `activity` with matching competitor IDs. |

### Site Audit

| Exercise | Verified through the UI and `/go` |
| --- | --- |
| Configure and start | Invalid page limits and sitemap URLs kept the form open. Submit saved `auditConfigs` with scope, page limit, source, sitemap URL, crawler device, schedule, path rules and exclusions. It appended `auditRuns` with a settings snapshot, `auditPages`, `auditIssues` and `activity` with `audit.completed`. Paths and page limit bounded the crawl. Issue page IDs joined to pages from the same run. |
| Read reports | Severity and keyword filters, HTTP status and URL filters, filtered CSV, run history links, the run selector, comparison and a reloaded link to a prior issue worked with unchanged state. |
| Exclude a check | Updated `auditConfigs.excludedCheckKeys` and edit metadata. Added `audit.check_excluded` to `activity` with the check key and issue ID. The current report hid the finding and historical reports retained their stored results. |
| Save settings | Updated `auditConfigs.pageLimit`, `schedule`, `updatedAt` and `updatedBy`. Added `audit.settings_updated` to `activity` with the changed values. |
| Run again | Appended `auditRuns`, `auditPages` and `auditIssues` plus `audit.completed` in `activity`. The new run had a new ID, run number 2 and 18 pages. Its settings snapshot used the saved exclusions, and the findings omitted the excluded check. |
| Restore a check | Removed the check from `auditConfigs.excludedCheckKeys`, updated edit metadata and added `audit.check_restored` to `activity`. Both stored run snapshots retained their original values. |
| Start with a sparse injected configuration | The existing `auditConfigs` record kept its ID, existing exclusion and custom field. All confirmed defaults and edit metadata persisted on the configuration. The matching `auditRuns.settingsSnapshot`, linked `auditPages` and `auditIssues`, and `activity` were observable through `/go`. |

### Harbor and layout

- The default world had 32 projects, 26 tracking campaigns, 38 keywords on the featured campaign, 28 competitors, 26 audit configs and 32 runs. The featured audit had 36 pages and findings at all three severities.
- Fresh browser contexts loaded a world with empty collections and a world with 241 projects and sparse tracking and audit records. Partial issue and ranking deep links rendered, and the issue route survived reload. Editing an injected project preserved its custom field. The unknown-route recovery link retained `sid`.
- Sessions were isolated. An already loaded tab sent zero POSTs while a second tab in the same session made a change and during the subsequent idle observation. A session reset restored the injected baseline through `/state` and `/go` and cleared `state_diff`.
- Projects, Position Tracking and Site Audit were visually inspected against the original design. Related controls had the specified 12px gap. The primary button reacted on hover. Projects, Position Tracking and audit issues fit 375px wide, and wide tables could scroll within their containers.
- Both test runners and their screenshots are gitignored.

## ❌ Bugs for Dev Agent

No open bugs from this round.

## Round History

### Round 1 → Round 2

- AUDIT-001 fixed and verified. The first audit persists confirmed values to a sparse injected configuration.
- AUDIT-002 fixed and verified. Tracking target labels distinguish language and target scope.
- AUDIT-003 fixed and verified. Toolbars and action groups use 12px gaps, with the mobile layout checked at 375px.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `172164`. The local evidence is `factory/build/dyn_certify/172164/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `projects → 0 → createdAt`.
