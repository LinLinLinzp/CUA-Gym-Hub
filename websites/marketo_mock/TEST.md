# Marketo Mock — Test Report

> Round 3  
> Date 2026-11-18  
> Server `http://localhost:5468`  
> Tested by playwright agent using installed Chromium via `PILOT_PLAYWRIGHT`

WORKFLOWS: PASS

## Summary

| Metric | Count or result |
| --- | --- |
| Client route patterns tested | 7 plus 4 fallback URLs |
| Confirmed workflow actions | 23 of 23 passed |
| Failed checks after rerun | 0 |
| Production build | PASS · `npm run build` |

## ✅ Passing Tests

All state evidence below comes from `/go` in the browser workflow session. `state_diff` contained exactly `programs`, `programMembers`, `lists`, `listMembers`, `smartCampaigns`, `campaignRuns`, and `activityLog`.

| SEED workflow | Browser sequence | State fields verified through `/go` |
| --- | --- | --- |
| Programs | Created an Event with Webinar program, renamed it, added Tessa Morris and Omar Khan, marked only Tessa Attended, archived and restored the program, and reloaded Members. | `programs` gained a record with `id`, `folderId: folder-field`, `type: Event with Webinar`, `channel: Webinar`, and creation and update metadata. `name` changed to Harbor Webinar Series and `status` moved through `archived` back to `active`. `programMembers` gained two links with `programId`, `personId`, `id`, `status`, and creation and update metadata. The IDs were stable and statuses were Attended and Invited after restore. `activityLog` gained six entries with the program `entityId`, `action`, `actorId`, and `createdAt`. The membership entries recorded `personIds` and `quantity` of 2 and 1. |
| Lists — static | Created a program-scoped list from Assets, added both people, canceled one removal, confirmed Omar's removal, and edited the description. | `lists` gained a record with `id`, `name`, `kind: static`, `programId`, `description`, and creation and update metadata. The edit changed `description`, and membership changes updated `updatedAt` and `updatedBy`. `listMembers` gained two links, then removed the link for `person-002`, leaving the link for `person-001`. Both records remained in `people`. `activityLog` recorded creation, addition, removal and edit, including `personIds` and `quantity` for membership actions. |
| Lists — smart | Created another program-scoped list, previewed and canceled a Member of static list rule, saved the rule, and reloaded People. The preview and saved table each showed one match, Tessa. | `lists` gained a `kind: smart` record with the same `programId`. Saving changed `matchMode` from null to `all`, stored `rules[]` with the rule `id`, `field: memberOfList`, `operator: in`, and `value` equal to the new static list ID, and updated metadata. `activityLog` gained the creation and rule-save entries. |
| Smart campaigns — Batch | Created a scoped campaign, saved the static-list audience, and reordered Flow with the keyboard. Rejected a missing schedule date, scheduled a future run, verified configuration lock, canceled, ran immediately, and opened step outcomes. | `smartCampaigns` gained a campaign with `id`, `programId`, `mode: batch`, `matchMode: all`, a `rules[]` reference to the static list, ordered `flow[]`, and creation and update metadata. `status` progressed through `draft`, `scheduled`, `draft`, and `completed`. `campaignRuns` gained two records linked by `campaignId` and `programId`. The scheduled run retained `scheduledAt` and ended with `status: canceled` and `canceledAt`. The immediate run stored `status: completed`, `startedAt`, `completedAt`, `processedCount: 1`, `processedPersonIds: ["person-001"]`, and three `stepResults[]` with `stepId`, `type`, `targetId`, `personIds`, and `changedCount: 1`. The Add to List and Remove from List steps canceled out in `listMembers`, and the target static list's update metadata changed. Only Tessa's `programMembers.status` became Registered, with update metadata. `activityLog` linked the schedule, cancel and completion to their run IDs. |
| Smart campaigns — Trigger | Created a scoped campaign, saved Added to list and All people, saved Flow, activated, verified editing was locked, deactivated, and reloaded Schedule. | `smartCampaigns` gained a record with `id`, `programId`, `mode: trigger`, `matchMode: everyone`, `triggers[]` with `type: addedToList` and the static `listId`, a valid `flow[]`, and creation and update metadata. `status` changed from `draft` to `active` to `inactive`. Both `activatedAt` and `deactivatedAt` persisted. `activityLog` linked both lifecycle events to the campaign. The campaign had zero `campaignRuns` rows. |

## Harbor and UI checks

- Direct loads and hard reloads passed on all seven route patterns, three missing-record URLs, and an unknown URL. Brand, workspace navigation, breadcrumbs, detail tabs, filters and reloads retained `sid`. Search, filter clearing, sorting, pagination, the dialog close control, and focus restoration passed with an unchanged `/go.state_diff`.
- The workflow session sent one baseline `set` and one `set_current` for each of the 23 confirmed actions. Invalid input, dismissals, previews, unchanged status and duplicate membership attempts produced zero writes. Reloads and a second tab with the same `sid` produced zero writes over 3.2 seconds of idle time. The `/go` snapshot stayed identical.
- Isolated sessions verified empty injected arrays, partial actor merging, sparse records, missing references, unknown-key preservation on save, `/state` agreement with `/go.current_state`, and reset to the initial state with an empty diff.
- The 360-record injected inventory paginated in groups of 15 and supported case-insensitive search and reloadable detail links. At 390px, horizontal overflow stayed inside the table card.
- Scoped-creation regression checks confirmed that the Database list and the reassigned program list returned via breadcrumbs to inventories containing those lists. Sparse campaigns with omitted `mode` supported Batch execution and Trigger activation while retaining the omission in state.
- Reviewed local Programs and Campaign Results captures against `DESIGN.md`. The desktop views showed the text wordmark, active navigation, readable tables, and campaign outcomes. Chromium reported zero console errors in the route rerun and zero page exceptions or off-localhost requests in the workflow rerun.
- The site's `src/utils/dataManager.js` SHA-256 matched the Harbor template. The production build included the local favicon.

## ❌ Bugs for Dev Agent

No open issues from this run.

## Round History

- Round 2 → Round 3. Previously reported scoped-creation and omitted campaign mode regressions passed. The route check exposed a 404 for Chromium's automatic `/favicon.ico` request. An original local favicon resolved it, and the route check, full workflow suite, and production build passed afterward.
- Chromium sessions `dev-workflows-1795009824428`, `playwright-navigation-1795009813132`, and `audit-regressions-1795009824943` ran on localhost port 5468. The audit session was reset after verification. Runner files and captures are under the site's ignored `.runner/` directory. The parent runner handles Docker dynamic certification and commits.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `128664`. The local evidence is `factory/build/dyn_certify/128664/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `folders → 0 → name`.
