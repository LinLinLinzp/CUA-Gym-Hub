# PagerDuty Mock — Test Report

> Round 2 · 2026-11-18  
> Server http://localhost:5490  
> Tested by the Playwright agent with the installed Node Playwright and Chromium

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Route patterns exercised, including redirect and fallback | 15 |
| Interactive check groups in the workflow table | 17 |
| Workflow check groups passed | 17 |
| Workflow check groups failed | 0 |
| Open audit regressions | 0 |

`npm run build` passed. The full workflow suite passed against the running Vite dev server and against `dist/` served to Chromium by Playwright, with only `/state`, `/post` and `/go` forwarded to the same localhost server. The main scenario asserted one baseline `set` and 19 successful `set_current` writes per run. For each business write it compared the complete posted state against `/go.current_state` and checked which collections changed. The principal events were verified by entity ID, type, details, actor and timestamp using a fixed clock of `2026-11-18T16:00:00.000Z`.

## ✅ Passing Tests

| Seed workflow and UI action | State fields verified through `/go?sid=…` |
| --- | --- |
| Incidents · Root redirect, queue and activity navigation, status tabs, incident-number search, service and urgency filters, Assigned to me, sorting, reset, pagination and detail reload | Zero business writes. The filtered activity view displayed a link to the incident. |
| Incidents · Validate and create a Checkout API incident while a schedule override is active | Appended `incidents[]` with ID, number 1043, title, description, `serviceId`, `escalationPolicyId`, `policySnapshot`, `assignmentTarget`, `assigneeIds`, status, urgency, priority, null acknowledgement and resolution fields, and creation audit fields. Appended `activity[]` event `incident.created` with routing IDs. |
| Incidents · Acknowledge individually and in bulk | Updated `status`, `assigneeIds`, `acknowledgedAt`, `acknowledgedBy` and update audit fields. Appended `incident.acknowledged` with before/after status. A bulk click made one write with two events and excluded the selected resolved record. |
| Incidents · Raise urgency on an acknowledged incident | Updated `urgency`, returned `status` to `triggered`, cleared `acknowledgedAt` and `acknowledgedBy`, and updated audit fields. Appended `incident.updated` with those four before/after pairs. |
| Incidents · Reassign to a responder and to a policy | Updated `assignmentTarget`, `assigneeIds`, status, acknowledgement fields and audit fields. Reassignment to the policy persisted its ID and snapshot. Appended `incident.reassigned` with previous and new assignee IDs and the selected target. |
| Incidents · Cancel confirmation, resolve individually and resolve in bulk | Cancel produced zero writes. Confirmation updated `status`, `resolvedAt`, `resolvedBy` and update audit fields. Appended one `incident.resolved` per changed record and saved the two-record bulk action in one request. |
| Incidents · Add a trimmed note and reload, including on a resolved incident | Appended `incidentNotes[]` with `id`, `incidentId`, `body`, `createdBy` and `createdAt`. Appended `incident.note_added` with `noteId`. |
| Schedules · Search, filter by team, reset, navigate weeks, compare schedules and inspect coverage | Zero business writes. Comparison rendered both timelines. The active override was displayed as the effective responder. |
| Schedules · Validate and create a rotation with reordered members, custom cadence and a recurring window | Appended `schedules[]` with metadata, timezone, team and audit fields. Verified `layers[].id`, `name`, ordered `userIds`, `rotationType`, numeric `rotationDays`, UTC `startAt`, `handoffTime` and `restrictions`. Appended `schedule.created` with `layerIds`. |
| Schedules · Edit a description and retain rotation details | Updated `description`, `updatedAt` and `updatedBy`. Preserved ordered layer records and IDs. Appended `schedule.updated` with the description before and after. |
| Schedules · Open an override from a shift and from the header, validate and save | Appended `scheduleOverrides[]` with ID, `scheduleId`, `userId`, UTC `startAt` and `endAt`, active `status`, null cancellation fields and audit fields. Appended `schedule.override_added` with override ID, responder ID and UTC range. |
| Schedules · Confirm override cancellation | Updated `status`, `canceledAt`, `canceledBy`, `updatedAt` and `updatedBy`. Appended `schedule.override_canceled` with the original override ID, responder ID and range. |
| Schedules · Attempt linked deletion and delete an unreferenced schedule | Linked policy and open incident snapshots blocked deletion with zero writes. Confirmed deletion removed the schedule, retained earlier canceled overrides and canceled remaining active overrides with cancellation and update audit fields. Appended `schedule.deleted` with name and `canceledOverrideIds`. |
| Escalation policies · Search, filter by team, reset and inspect a linked schedule | Zero business writes. The schedule target link opened the matching schedule with the same session ID. |
| Escalation policies · Validate timeouts, create a policy and transfer a service after confirmation | Appended `escalationPolicies[]` with metadata and audit fields, `repeatCount`, and ordered `rules[]` containing stable IDs, numeric `delayMinutes` and user/schedule `targets`. Updated `services[].escalationPolicyId` only after confirmation. Appended `policy.created` with `ruleIds` and `affectedServiceIds`. |
| Escalation policies · Reorder levels, edit a timeout and change service assignments | Verified saved order, stable rule IDs, updated `delayMinutes` and audit fields. Verified `services[].escalationPolicyId` when selecting a replacement and when explicitly unassigning. Appended `policy.updated` with rule and affected service IDs. Existing incident snapshots stayed intact. |
| Escalation policies · Block deletion with linked services, then delete | Blocked deletion displayed the linked service and produced zero writes. Removing the attachment allowed confirmed deletion from `escalationPolicies[]`. Appended `policy.deleted` with the policy ID and name. Existing incident snapshots remained readable. |

`state_diff` is relative to the session baseline. For actions that returned a collection to baseline, the suite verified membership and routing in `current_state` and checked the associated activity separately.

## Harbor checks

- The site copies of `state-api.js` and `src/utils/dataManager.js` matched the template SHA-256 hashes.
- Exercised query preservation, direct navigation, hard reloads, missing records, empty injected arrays, a sparse singleton at mobile width, and searches over 350 injected records each for incidents, schedules and policies.
- Verified object merging, array replacement, preservation of an unknown injected key after a write, and isolation between seeded and injected sessions.
- Exercised `/post` with repeated `set`, `set_current` and `reset`. Verified `/go.initial_state`, `current_state`, and `state_diff` entries for added and modified data.
- Observed zero unsolicited saves during idle, navigation, invalid input and canceled confirmation. The acceptance suites captured no external requests or browser console errors.

## ❌ Bugs for Dev Agent

No open bugs from this round.

## Visual Alignment Feedback

Reviewed localhost captures of the incident queue, schedule timeline and policy detail against the site's original design. The desktop sidebar uses the specified 20 px gutters and eucalyptus profile avatar. The compact menu and mobile shift list were exercised in Chromium. Screenshots and test scripts are in the gitignored `node_modules/` directory.

## Round History

### Round 1 to Round 2

- **AUDIT-001 fixed.** A pointer clicked a 90-minute coverage band under 14 px wide followed by a gap. The full-size shift list controls also opened the override form at desktop and mobile widths.
- **AUDIT-002 fixed.** Both occurrences of 1:30 a.m. in New York saved to their original UTC instants, including seconds in a prefilled shift. Choosing the second occurrence for an edited start or end saved the selected UTC time. Editing a schedule description preserved its repeated-hour rotation anchor and did not log an absent optional team as a change.
- **AUDIT-003 fixed.** Verified the desktop sidebar and avatar against the local design.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `172488`. The local evidence is `factory/build/dyn_certify/172488/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `users → 0 → name`.
