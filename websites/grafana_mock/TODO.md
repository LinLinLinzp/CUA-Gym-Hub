# Grafana Mock — TODO

> Status: IMPLEMENTED AND VERIFIED  
> Last updated by: dev agent, 2026-11-18  
> Research: `assets/README.md` | State model: `assets/data_model.md` | Design: `DESIGN.md`

## Status legend

- [ ] Not started
- [~] In progress
- [x] Done

## P0 — Shell and runtime

- [x] **Project and state API.** Scaffold React + Vite in this directory with `dev`, `build`, and `preview` scripts and a package lock. Use port `5491` with strict port binding. Import `stateApi(createInitialData)` from `../../templates/state-api.js` in `vite.config.js`. Copy `templates/dataManager.js` unchanged into `src/utils/dataManager.js` and export `createInitialData()` from `src/data/seed.js`. `/state`, `/post`, and `/go` are HTTP endpoints owned by the template and Harbor. `/go?sid=…` returns `initial_state`, `current_state`, and `state_diff` directly as JSON.
- [x] **Hydration and mutations.** Await `loadState('grafana_mock', createInitialData)` behind a neutral loading screen before mounting the routed UI. In one store mutation path, compute the next whole state from the latest local state and call `saveState` once per successful explicit mutation. Preserve unknown injected fields when editing. Treat drafts, search, filters, sorting, selected time range, previews, navigation, and cancel as local UI state. Handle absent nested arrays and broken references defensively on read. Use one baseline push via the template and zero idle writes. Keep `sid` on links, redirects, and imperative navigation, and use `withSid()` for links leaving the SPA router.
- [x] **Workspace shell and routing.** Build the original header, workspace navigation, content, and responsive layouts in `DESIGN.md`. `/` opens the dashboard library. Support `/dashboards`, `/dashboards/f/:id`, `/dashboards/new`, `/d/:id` with optional slug, `/d/:id/edit`, `/alerting/list`, `/alerting/new`, `/alerting/rules/:id`, `/alerting/rules/:id/edit`, and `/alerting/notifications`. Use accessible in-page create/edit forms or dialogs for contact points. Provide useful empty states and a safe missing-record view with a link back to the appropriate list. Every direct route and hard reload uses the same providers and session. The workspace starts as Maya Chen in Acme Operations.
- [x] **State documentation and runtime checks.** Create `SCHEMA.md` from the implemented shape and include the Harbor **Observable State Changes** table with field paths for every mutation below. Run `npm run build`. Verify a clean session, distinct `sid` values, injected empty/single/large arrays, missing optional fields, and direct routes. After the initial push is settled, leave a loaded tab idle across another tab's action and verify that it sends no posts and does not overwrite the action. Verify the built app has no remote runtime dependencies.

## P1 — Dashboards

- [x] **Find and open dashboards.** Build a library with folder links, case-insensitive title search, tag filters that intersect, starred filter, and name/updated-time sorting. Show title, folder, tags, updated time, and accessible star buttons. Compose the controls and show clear-filter and empty-folder states. Opening a dashboard shows deterministic local time-series, stat, and table panels. Initialize the view's time range from the dashboard's saved default, then apply later range selections locally. Browsing and previewing write no records.
- [x] **Create a folder and manage dashboard metadata.** Offer `New folder` from the library and folder picker. On save append `folders[]` with `id`, `title`, `createdBy`, and `createdAt`. Offer `New dashboard` and an edit flow for title, description, folder, and tags. Reject blank names and duplicate titles in the same folder. On save, append or update `dashboards[]` with `id`, metadata, `panels`, `timeRange`, and the creation/update actor and timestamps. Move a dashboard by changing `folderId` in the same edit flow. Persist only on save.
- [x] **Configure and save panels.** Add, edit, and remove visualizations inside the dashboard draft. Collect panel title, visualization type, data source, query, and unit. Render a deterministic preview, and show actionable validation for an empty title, query, or required source. Explicit dashboard save writes `dashboards[].panels[]` with the panel fields in the data model and the dashboard update metadata. Discarding the dashboard draft leaves the saved record unchanged. Keep panel IDs stable on edit and reference them in the dashboard's deletion dependency checks.
- [x] **Star and delete dashboards.** Star controls add or remove the dashboard ID in `starredDashboardIds[]`. Deletion needs confirmation and is blocked when an alert links to the dashboard. On success remove the dashboard from `dashboards[]`, remove its ID from `starredDashboardIds[]`, and append a timestamped `activity[]` deletion record, all in the same save. Similarly block removal of a panel referenced by an alert and identify the rule so it can be edited first.

## P1 — Alerts

- [x] **Find and inspect alert rules.** List rules grouped by folder and evaluation group with an optional flat view. Show name, evaluation state, health, interval, and paused status. Support search by name or label and filters by folder and state. Detail exposes query, threshold, pending period, labels, annotations, and resolved dashboard/panel and contact point links. A missing relationship renders a readable fallback. Views and filters write no records.
- [x] **Create and edit Grafana-managed rules.** Single form with named sections for query and condition, folder and evaluation group, evaluation behavior, notifications, and optional labels, annotations, and panel link. A user can add an evaluation group inline under the selected folder. Validate required entries, finite thresholds, nonnegative pending durations, positive group interval, and compatible folder/group and dashboard/panel pairs. Preview condition from local sample data. Save appends or updates `alertRules[]` with the rule fields, links, and actor/timestamp fields in the model. When saved with a new evaluation group, append `evaluationGroups[]` with `id`, `name`, `folderId`, `intervalSeconds`, `createdBy`, and `createdAt` in the same mutation. Saving a new rule sets `evaluationState: 'normal'`, `health: 'ok'`, and `isPaused: false`. Editing preserves its stored evaluation snapshot and pause flag.
- [x] **Pause, resume, and delete rules.** Confirm deletion and remove from `alertRules[]`, adding an `activity[]` deletion record. Pause or resume updates `alertRules[].isPaused`, `updatedAt`, and `updatedBy`. Display Paused when the flag is set, then show the stored evaluation state after resuming. Evaluation never schedules state writes.

## P1 — Contact points

- [x] **Find and inspect contact points.** Show searchable rows/cards with name, integration types and destinations, usage count, and menu actions. Include type filtering and a link from usage to the relevant rules. Derive usage from `alertRules[].contactPointId`; listing, filtering, and opening the usage view write no records.
- [x] **Create and edit contact points.** Require a trimmed unique name and at least one valid integration. Support Email (one or more addresses), Slack (channel and webhook URL), and Webhook (URL and HTTP method) with type-specific validation and a Disable resolved message switch. Add/remove multiple integrations in the draft, retaining existing integration IDs for unchanged rows. Save appends or updates `contactPoints[]` with `integrations[]`, name, and creation/update actor and timestamps. Alert rules retain their references across renames because they store contact point IDs.
- [x] **Test and delete contact points.** An explicit `Send test notification` on a saved integration opens a default/custom message dialog. Confirm to produce a local result and append `notificationTests[]` with `id`, `contactPointId`, `integrationId`, `integrationType`, `message`, `status: 'simulated_success'`, `createdBy`, and `createdAt`. Deleting an unused contact point needs confirmation, removes it from `contactPoints[]`, and appends an `activity[]` deletion record in the same save. A referenced contact point remains available and the UI identifies its rules. Existing test history is retained after deletion.

## P2 — Optional workflow depth

- [x] **Dashboard duplication.** Use the existing dashboard draft and save flow to create an independent dashboard with fresh dashboard and panel IDs, selected folder, and new creation/update metadata. The source dashboard and its alert links retain their IDs.

## Data seed

- [x] Seed 36 dashboards across six folders, 36 alert rules across twelve evaluation groups, and 30 contact points across three integration types. Include a useful mix of titles, tags, populated/multi-integration and empty-panel cases, paused and unpaused rules, and referenced and unused contact points. Use fixed IDs and timestamps, realistic English titles, reserved destinations, and deterministic local metric series. See `assets/data_model.md` for required relationships and examples.

## Local workflow acceptance

Use Chromium via the installed Node Playwright module at `PILOT_PLAYWRIGHT`. Start Vite from this site's directory with `Start-Process -WindowStyle Hidden`, passing the absolute `node_modules/vite/bin/vite.js` path. Use `http://localhost:5491`, isolated fresh `sid` values, and an ignored scratch path or clean up the runner. Inspect `/go?sid=…` after each workflow and hard reload the UI. Record actual results and exact changed fields in `TEST.md` in the Playwright phase.

| Workflow | Required evidence |
| --- | --- |
| Dashboards | Create a folder, create a tagged dashboard with a queried panel, edit panel and metadata, move folders, star/unstar, filter to the saved record, and delete a disposable dashboard. Verify `folders`, `dashboards`, nested `panels`, `starredDashboardIds`, and the deletion entry in `activity`. |
| Alerts | Create a Grafana-managed rule with a new group, dashboard/panel and contact point, verify preview has no write, edit threshold and pending period, pause/resume, and delete it. Verify `evaluationGroups`, `alertRules` fields and links, and the deletion entry in `activity`. |
| Contact points | Create a point with two integrations, edit it and send a simulated test, link it from a rule, verify delete is blocked, remove the rule reference, and delete the point. Verify nested `contactPoints[].integrations`, `notificationTests`, the rule link, and the deletion entry in `activity`. |
| Shared runtime | Compare empty/missing-field renders and large lists, route reloads with `sid`, isolated sessions, canceled and invalid forms, inert idle state, and `npm run build`. Use the parent runner for Docker certification. |

## Out of scope

- Authentication, organization administration, live data source queries, real notifications, arbitrary policy tree editing, and production accounts.
