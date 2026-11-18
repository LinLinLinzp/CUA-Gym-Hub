# Heroku Mock — Test Report

> Round: 3  
> Date: 2026-11-18  
> Server: http://localhost:5482  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
|--------|-------|
| Routes tested | 7 |
| Seed workflow groups tested | 4 |
| ✅ Passed committed actions | 13 |
| ❌ Failed committed actions | 0 |
| Open P0/P1/P2 bugs | 0 |

## ✅ Passing Tests

- **Applications** — Checked case-insensitive search, combined region and status filters, alphabetical and recently updated sorting, filter clearing, and both empty states. Rejected an invalid name and a duplicate, created an EU app, and renamed it on the same app ID. Required the exact name to delete a populated synthetic app, removed it from the inventory, and opened its old URL to verify the unavailable view and return link.
- **Dynos** — Rejected a quantity of two for Eco, scaled web from one to three, resized Standard-1X to Standard-2X, stopped web at zero, restarted the two other running processes, and resumed web. Confirmed the restart control was disabled for an app with no formations.
- **Add-ons** — Checked empty catalog search results, searched for Postgres, reviewed the monthly price, provisioned Essential-0, changed to Essential-1, and removed the instance with exact-name confirmation. The removed instance disappeared from the active table.
- **Releases** — Checked newest-first ordering, opened release details, rejected an empty revision, deployed a synthetic revision with a description, and confirmed a rollback to v3. Active, expired, and failed releases had disabled rollback actions. Rollback preserved existing releases, formations, and add-ons.
- **Navigation and keyboard** — Verified workspace, breadcrumb return from the unavailable app, app tabs, and Overview links to Resources, Add-ons, and Releases. Quick Jump opened from the button and the slash key and supported filtering, Down, Enter, and Escape. Escape returned focus to its opener.
- **Harbor** — Fresh load seeded 32 apps, 65 formations, 48 add-ons, and 112 releases, with an empty initial diff. Injected empty arrays, a single sparse app with an orphan reference, and a 360-app inventory rendered. Filtering the imported inventory produced one match and then zero matches. Hard reloads on every app tab preserved the SID and state. Sessions stayed independent, and reset restored the baseline.
- **State traffic and offline** — One baseline POST for the fresh primary session, then exactly one full-snapshot set_current POST per successful mutation. Reloads in that context, invalid inputs, cancellations, unchanged edits, browsing, and a three-second idle window added zero POSTs. The run detected zero external requests, browser errors, or HTTP error responses.
- **Build** — npm run build passed on Windows. The copied dataManager.js matched the Harbor template byte for byte.

### Fields verified via /go

After each action, the current snapshot matched the browser POST, the original baseline remained intact, and the modified collections in the cumulative state_diff matched the current records. The table lists the fields that changed from the preceding snapshot. New event records also included id, appId, type, status, actorId, and createdAt. New release records also included id, appId, version, type, status, description, actorId, and createdAt. New event and release timestamps passed ISO round-trip checks.

| Action | Fields changed in /go |
|---|---|
| Create app | Added apps row with id, name, region, stack, status, activeReleaseId, actorId, createdAt, and updatedAt. Added initial succeeded releases v1 and appEvents create with name and initialReleaseId. |
| Rename app | Changed apps.name and updatedAt. Added appEvents rename with previousName and name. |
| Delete app | Changed apps.status, deletedAt, and updatedAt, formations.status and updatedAt, and addOns.status, removedAt, and updatedAt. Added appEvents delete with name, formationIds, and addOnIds. Release history stayed intact. |
| Scale dynos | Changed formations.quantity and updatedAt. Added dynoEvents scale with formationIds, previousQuantity, quantity, previousSize, and size. |
| Resize dynos | Changed formations.size and updatedAt. Added dynoEvents resize with formationIds and before and after size and quantity. |
| Stop dynos | Changed formations.quantity, status, and updatedAt. Added dynoEvents scale with quantity 0, formationIds, and before and after size and quantity. |
| Restart dynos | Changed lastRestartedAt and updatedAt for the two running formations. Added dynoEvents restart with formationIds and quantity 2. The stopped web formation received no restart timestamp. |
| Resume dynos | Changed formations.quantity, status, and updatedAt. Added dynoEvents scale with formationIds and before and after size and quantity. |
| Provision add-on | Added addOns row with id, appId, name, serviceKey, serviceName, planKey, monthlyPrice, status, actorId, createdAt, and updatedAt. Added addOnEvents provision with addOnId, planKey, monthlyPrice 5, and releaseId. Added releases v5 of type add_on with addOnId, addOnEventId, and inherited revision. Changed apps.activeReleaseId and updatedAt. |
| Change add-on plan | Changed addOns.planKey, monthlyPrice, and updatedAt. Added addOnEvents change_plan with addOnId, releaseId, previousPlanKey, planKey, previousMonthlyPrice 5, and monthlyPrice 9. Added linked add_on releases v6 and changed apps.activeReleaseId and updatedAt. |
| Remove add-on | Changed addOns.status, removedAt, and updatedAt. Added addOnEvents remove with addOnId, releaseId, previousPlanKey, planKey, previousMonthlyPrice 9, and monthlyPrice 0. Added linked add_on releases v7 and changed apps.activeReleaseId and updatedAt. The removed instance retained its final plan and price. |
| Deploy revision | Added releases v8 with submitted revision and description. Changed apps.activeReleaseId and updatedAt. |
| Roll back release | Added releases v9 with rollbackToReleaseId and the revision from v3. Changed apps.activeReleaseId and updatedAt. |

## ❌ Bugs for Dev Agent

No open findings.

## Visual Alignment Feedback

Reviewed screenshots of Applications, Overview, Resources, Releases, and Settings at 1440×900 and 390×900 against the original layout in DESIGN.md. The narrow app tabs and forms fit the viewport, and both Resources tables scrolled within their panels. Verified a formation action after horizontal scrolling and inspected the narrow add-on dialog. The app used its local CSS texture and text wordmark.

## Round History

### Round 2 → Round 3

- **BUG-001 · P1 · Escape left searchable dialogs open.** In Chromium, pressing Escape with text in Quick Jump cleared the search field but left the dialog open. The shared modal now handles Escape and restores focus to the opener. Retested with nonempty Quick Jump and add-on catalog searches.
- Earlier checks resolved select label accessibility, a notice that blocked row actions, narrow Resources overflow, the Quick Jump accessible name, and narrow Overview overflow with a long release description.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `149520`. The local evidence is `factory/build/dyn_certify/149520/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `apps → 0 → name`.
