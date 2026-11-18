# Grafana Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5491  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Direct paths tested, including root redirect, slug variant, and fallback | 14 |
| Seed workflows passed | 3 |
| Successful workflow mutations checked against `/go` | 18 |
| Open interaction bugs | 3 |
| Open visual issues | 1 |
| Browser exceptions and external HTTP requests | 0 |

Installed Node Playwright Chromium exercised the existing app against the Grafana Vite dev listener on port 5491 using fresh session IDs. The production build passed. The parent runner handles Docker dynamic certification.

## ✅ Passing Tests

### Dashboards

| Action exercised in Chromium | Fields verified in `/go` |
| --- | --- |
| Create Delivery Lab from the library and open the new dashboard editor from that folder | Added `folders[].{id,title,createdAt,createdBy}`. |
| Create and reload Delivery error overview with two tags, a 24-hour default range, and a queried time-series panel | Added `dashboards[].{id,title,description,folderId,tags,timeRange,panels,createdAt,createdBy,updatedAt,updatedBy}`. Verified `timeRange.{from,to}` and `panels[].{id,title,type,dataSourceId,query,unit}`. |
| Rename the dashboard, edit its description, move it to Platform, and change the panel to a stat | Changed `dashboards[].{title,description,folderId,updatedAt,updatedBy}` on save and verified the edited `panels[].{title,type,query,unit}`. Dashboard and panel IDs, panel data source, and creation metadata were preserved. The viewer used the saved time range after reload. |
| Star and unstar. Find the record with case-insensitive search, intersecting tags, starred-only, and recently updated sorting | Added and removed the dashboard ID in `starredDashboardIds[]`. Filtering and sorting produced no writes. |
| Duplicate into Delivery Lab, star the duplicate, then confirm its deletion | Added a dashboard with fresh dashboard and panel IDs and revision metadata. Deletion removed the dashboard and its star and added an `activity[]` record with `entityType: 'dashboard'`. |
| Try to delete the dashboard and remove its panel after linking both to an alert | Both actions displayed the dependent rule and produced no writes. |

Panel preview, time-range selection in the viewer, validation failures, canceled edits, and library filters produced no writes. Folder links, folder breadcrumbs, the brand link, and the library empty states navigated as expected.

### Alerts

| Action exercised in Chromium | Fields verified in `/go` |
| --- | --- |
| Preview a condition, then create Delivery API latency with an inline group and dashboard, panel, and contact point links | Preview produced no writes. Save added `evaluationGroups[].{id,name,folderId,intervalSeconds,createdAt,createdBy}` and `alertRules[].{id,name,folderId,evaluationGroupId,dataSourceId,query,condition,pendingSeconds,noDataState,errorState,labels,annotations,contactPointId,dashboardId,panelId,isPaused,evaluationState,health,createdAt,createdBy,updatedAt,updatedBy}` in one write. Verified the operator and numeric threshold in `condition`. |
| Reload, open the linked panel, filter the flat view, then edit threshold from 12.5 to 20 and pending period from 180 to 75 seconds | Changed `alertRules[].condition.threshold`, `pendingSeconds`, and revision metadata. The original relationship IDs were preserved. |
| Pause and resume | Changed `alertRules[].isPaused` and updated revision metadata. The stored `evaluationState` and `health` were preserved. |
| Clear the contact point and confirm deletion | Set `alertRules[].contactPointId` to `null`, then removed the rule and added an `activity[]` record with `entityType: 'alert_rule'`. |

Grouped and flat views, folder and state filters, reset, invalid group interval, editor cancellation, and deletion cancellation responded without changing business state.

### Contact points

| Action exercised in Chromium | Fields verified in `/go` |
| --- | --- |
| Create Delivery on-call with Email and Slack integrations | Added `contactPoints[].{id,name,integrations,createdAt,createdBy,updatedAt,updatedBy}`. Verified `integrations[].{id,type,disableResolveMessage,settings}` with two email addresses and Slack channel and URL. |
| Rename to Delivery escalation and change Slack to a PUT Webhook, then reload and find it through the filters and usage link | Changed `contactPoints[].{name,integrations,updatedAt,updatedBy}`. Verified the existing integration now stores `type: 'webhook'` and `settings.{url,method}`. Contact and integration IDs remained stable. The rule kept its `contactPointId` through the rename. |
| Send a custom simulated test through the saved Webhook | Added `notificationTests[].{id,contactPointId,integrationId,integrationType,message,status,createdAt,createdBy}` with `status: 'simulated_success'`. |
| Attempt to delete while referenced, then remove the rule link and delete the point | The blocked attempt identified the rule and produced no writes. Clearing the rule wrote `alertRules[].contactPointId: null`. Confirming contact deletion removed the record from `contactPoints[]` and added an `activity[]` record with `entityType: 'contact_point'`. The test history retained the deleted contact ID. |

The integration switch, remove-integration control, required-integration validation, filter reset, context menu dismissal with Escape, default message preview, and canceled test dialog responded. Canceling the test returned focus to the row menu opener.

All three deletion records had `id`, `entityId`, `entityName`, `action: 'delete'`, `status: 'completed'`, `createdAt`, and `createdBy`.

### Shared runtime

- Default data rendered 36 dashboards, 36 rules, 30 contact points, six folders, and 12 groups. Empty, sparse, and 320-record worlds rendered. Missing relationships showed readable fallbacks, and a dashboard edit preserved injected record and workspace metadata.
- Direct navigation and hard reload worked across every route pattern, including the duplicate editor, optional dashboard slug, missing records, and the unknown-route fallback. Navigation retained `sid`. Keyboard skip navigation focused the main content.
- Confirmed session isolation, JSON responses from `/go`, injected state via `/post`, and reset to the baseline with an empty diff. The workflow session sent one baseline `set`, followed by one `set_current` per successful mutation. Invalid forms, previews, blocked deletions, and cancellations did not persist changes.
- A second tab starred a dashboard while the first tab idled. The idle tab issued zero additional writes, and after a reload it showed the second tab’s change.
- `npm run build` passed. No Chromium page exceptions or external HTTP requests were observed. An additional navigation and controls pass observed zero browser console errors.

## ❌ Bugs for Dev Agent

### BUG-001 · P1 · Injected evaluation group ID collides with the create control

| Field | Value |
| --- | --- |
| Route | `/alerting/new` |
| Element | Evaluation group selector |
| Action | Inject an existing group with ID `new-group`, select it in its folder, fill the required rule fields, and save. |
| Expected | Rule saves with `evaluationGroupId: 'new-group'` and the group list stays unchanged. |
| Actual | Inline group creation opens and Save reports “Enter an evaluation group name.” `/go` confirms the rule was not added. |
| Console errors | None observed. |
| Fix hint | Track inline group creation separately from the selected record ID. |

### BUG-002 · P1 · A scoped contact list hides a newly saved contact point

| Field | Value |
| --- | --- |
| Route | `/alerting/notifications?point=<existing-id>` |
| Element | New contact point |
| Action | Open a scoped contact list and create a different contact point. |
| Expected | The newly saved point is visible after returning from the editor. |
| Actual | The success message appears and `/go` shows the record in `contactPoints[]`, but the list stays scoped to the previous point. The new record appears after selecting Show all contact points. |
| Console errors | None observed. |
| Fix hint | Clear the previous scope or open the new record’s scope after creation, preserving `sid`. |

### BUG-003 · P1 · Changing a draft range removes the saved custom range option

| Field | Value |
| --- | --- |
| Route | `/d/:id/edit` |
| Element | Default time range |
| Action | Open a dashboard with an injected absolute time range and choose Last 24 hours. |
| Expected | The original custom option remains available to reselect before saving. |
| Actual | The custom option disappears. Reopening the editor restores it at the cost of discarding the current draft. |
| Console errors | None observed. |
| Fix hint | Derive the custom option from the saved source range and restore that pair when selected. |

## Visual Alignment Feedback

Reviewed original desktop captures of the dashboard library, panels, alert rules, and contact points, plus the mobile contact list, against [DESIGN.md](DESIGN.md). The warm canvas, aubergine header, text wordmark, and local illustrations and charts rendered. At 390px, lists fit the viewport and wide dashboard tables stayed within their scroll regions.

### VISUAL-001 · P2 · Library type and breakpoint differ from the design spec

| Field | Value |
| --- | --- |
| View | `/dashboards` |
| Reference | [DESIGN.md](DESIGN.md) |
| Capture | `.scratch/playwright-dashboard.png` |
| Issue | At desktop width the heading is 42px, while the spec calls for 36px. Count chips omit tabular numerals. The folder column stacks at 950px, while the spec calls for 900px. |
| Suggestion | Align the CSS with the design spec or document the intended deviations. |

## Round History

### Round 1 → Round 2

- Escape-to-close focus restoration still passes.
- Reproduced audit findings AUDIT-001 through AUDIT-003 in Chromium and recorded the visual differences from AUDIT-004.
- All three seeded workflows passed again.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `172064`. The local evidence is `factory/build/dyn_certify/172064/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `folders → 0 → title`.
