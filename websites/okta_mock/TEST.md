# Okta Mock — Test Report

> Round: 3  
> Date: 2026-11-18  
> Server: http://localhost:5410  
> Tested by: playwright agent

## Summary

All three SEED workflows passed in Chromium on Windows. The final seeded suite persisted 19 successful submits and 20 activity records in each of the dev and built-asset runs. The local server handled the Harbor API in both runs. Playwright served the final `dist/` HTML and assets from disk at the same localhost origin for the built-asset run. The main suite made zero off-origin HTTP requests and reported zero page errors.

| Latest session | Scope |
| --- | --- |
| `okta-qa-1795016309949-{flow,empty,sparse}` | Final Vite dev workflow, empty world, and sparse world |
| `okta-qa-1795016359477-{flow,empty,sparse}` | Final built-asset workflow, empty world, and sparse world |
| `okta-controls-1795016308970` | Navigation, filter, pagination, modal and picker checks with zero console errors and zero business writes |
| `okta-repeat-1795016310446` | Repeated entry and mobile dialog focus |
| `okta-large-1795016311711` | 500-person injected directory with a custom actor and extra metadata |

## Passing tests and observed state changes

The assertions checked the changed collections and their records through `/go`, and compared `/state.stored_state` to the final snapshot. Each successful submit made one `set_current` POST. Every event had a generated ID, a target ID, an ISO timestamp and actor `admin-001` in the seeded workflow.

| Browser step | Changes observed in `/go` |
| --- | --- |
| Add Person → save Harper Quinn as Staged | `users` appended a generated user with `firstName: Harper`, `lastName: Quinn`, `username` and `email: harper.quinn@acme.example`, `secondaryEmail: h.quinn@example.org`, trimmed `department: Operations`, `title: Coordinator`, `status: STAGED` and create/update metadata. `activityEvents` appended `USER_CREATED` with `details.status: STAGED`. Blank input, invalid email and the duplicate username `AVERY.CHEN@acme.example` produced inline validation and zero business writes. |
| Search the username → open Harper Quinn → Edit Profile → change Job title | `users[].title` changed to `Operations Lead` with update metadata. `USER_UPDATED.details.changedFields` was `["title"]`. |
| Actions → Activate, Suspend, Unsuspend, then later Deactivate | `users[].status` changed `STAGED → ACTIVE → SUSPENDED → ACTIVE → DEACTIVATED`. Each submit changed update metadata and appended `USER_STATUS_CHANGED` with `previousStatus` and `status`. Recorded links remained in place during the transitions. |
| Add Group → save Field Readiness → Edit Group → change Description | `groups` appended a generated group with `name: Field Readiness`, `source: OKTA`, description and create/update metadata. The edit set `description: Field launch and rollout coordination` and updated metadata. Events were `GROUP_CREATED` and `GROUP_UPDATED`; the latter recorded `changedFields: ["description"]`. Case-insensitive duplicate name validation blocked a second Platform Engineering. |
| Field Readiness → Assign People → select Harper Quinn and Avery Chen across searches → Assign | `groupMemberships` appended two `ACTIVE` rows with distinct IDs, the Field Readiness `groupId`, each selected `userId`, and creation metadata in one submit. Both `GROUP_MEMBER_ADDED` events recorded the corresponding pair. Harper's Groups tab showed Field Readiness. |
| Engineering Wiki → Assign to Groups → Field Readiness | `appAssignments` appended an `ACTIVE` row for `app-001` and `principalType: GROUP`, with the new group ID and creation metadata. `APP_ASSIGNED.details` included `appId`, `principalType`, `principalId` and `assignmentId`. Harper gained `Via Field Readiness`. |
| Engineering Wiki → Assign to People → Harper Quinn | A second `ACTIVE` assignment for `app-001` had `principalType: USER`, Harper's ID and `appUsername: harper.quinn@acme.example`. `APP_ASSIGNED` targeted the new grant ID. Avery was excluded from this picker because of an existing direct grant. Avery's app row displayed Direct, Via Platform Engineering and Via Release Coordinators. Harper's row displayed Direct and Via Field Readiness before and after reload. |
| Unassign Harper's direct grant → switch to Groups → Unassign Field Readiness | Each action removed exactly one `appAssignments` row and appended `APP_UNASSIGNED` with that grant's ID and principal tuple. After the first removal Harper retained Via Field Readiness. After the second, Harper left the app's People list and Avery retained seeded access. |
| Field Readiness → Remove Harper Quinn → confirm | `groupMemberships` lost the exact membership row. `GROUP_MEMBER_REMOVED` targeted its ID and recorded `groupId` and `userId`. |
| Harper's Applications → Assign Applications → Expense Desk. Repeat from Field Readiness's Applications. Then use Harper's Groups → Assign to Groups. | Two `APP_ASSIGNED` events recorded separate direct and group grants on `app-002`. The group picker restored exactly one Harper-to-Field Readiness membership with `GROUP_MEMBER_ADDED`. |
| Deactivate Harper → Applications → Actions → Delete → confirm | The app row was marked Access unavailable before deletion. Deletion removed Harper from `users`, the restored membership from `groupMemberships`, and the direct Expense Desk grant from `appAssignments`. `USER_DELETED.details` recorded `previousStatus: DEACTIVATED` and the exact `removedMembershipIds` and `removedAssignmentIds`. The group grant remained. |
| Field Readiness → Delete Group → confirm | The group, Avery's remaining membership and the group's Expense Desk grant were removed from `groups`, `groupMemberships` and `appAssignments`. `GROUP_DELETED.details` recorded both cascade ID arrays. Prior activity remained readable. |

## Supplemental checks

- People status summaries, case-insensitive identifier search, the Directory group source filter, and read-only group attributes and membership worked. All three lists paginated. Applications filtered by inactive status and searched by name. Clear filters restored results after an empty search.
- The keyboard skip link focused the workspace. The brand link returned to People with `sid` intact. The primary action changed appearance on hover. Closing the drawer, cancelling deletion or assignment, and checking and unchecking a picker item produced the expected UI responses without state writes. Assign was enabled only with a selection.
- Direct visits to profile, group and application URLs and a reload resolved in the same workspace. Tab changes retained the session ID. Browser back and forward restored the assignment tab. Deleted-record and unknown URLs showed working return links.
- The seeded baseline had 48 users, 30 groups, 32 applications, 110 memberships and 90 grants. The fresh seeded and empty sessions each made one baseline POST and zero idle POSTs in the subsequent observation windows. Browser reloads of the seeded session added zero baseline POSTs.
- Empty arrays showed empty lists on all three destinations. The sparse world rendered its singleton profile and missing relationship targets without errors. It retained its own data, and `/go` showed the seeded session still held its final state.
- At 390px, the page fit the viewport and wide tables scrolled inside their panels. Opening the Add Person drawer focused First name, and Escape restored focus to Add Person. Save and Add Another cleared each draft and restored the initial person status. Two people and two groups persisted with their fields and creation metadata as two new `users[]` records, two new `groups[]` records and four `activityEvents[]` records (`USER_CREATED` twice and `GROUP_CREATED` twice).
- The 500-person world paged and searched to its final record. Editing that record preserved all users and the injected `verifierMetadata` key, and wrote `updatedBy` and `activityEvents[].actorId` as `actor-42`.
- `npm run build` passed. The copied client template had the same SHA-256 as the repository template. Docker dynamic certification is delegated to the parent runner.

## Bugs for Dev Agent

### AUDIT-001 · P0 · Rapid second save can be absent from Harbor state

| Field | Value |
| --- | --- |
| Route | `/directory/groups` |
| Element | Save and Add Another |
| Action | Inject empty collections and 58,000 ASCII characters of custom metadata, then save two groups in quick succession. |
| Expected | `/go.current_state.groups` and `activityEvents` contain both creates. |
| Actual | The browser cache contained both groups after two submits of 58,782 and 59,237 bytes. `/go` contained only the first group. Reproduced with ordinary localhost timing and 2,200 ms simulated latency in `okta-audit-1795016161912`. |
| Browser request failures | None reported by Playwright's `requestfailed` listener. |
| Fix hint | Investigate concurrent keepalive requests in the canonical Harbor helper. The site requires the repository template unchanged. |

API session `okta-audit-1795016161912-api` also verified `set` baseline retention, `set_current` merge, `reset`, and an unused session with no stored state.

## Visual review and round history

- Reviewed the People, Groups and Applications lists, profile, assignment table and picker in Chromium against the site's original design. The layouts, active navigation, status pills and local monograms were consistent with the design. The mobile test confirmed viewport fit and drawer focus restoration.
- The final rerun confirmed that the local favicon resolved the load-time 404. Picker captions now show a shared username and email once and display both values when they differ.
- The rapid-save audit issue remains open. The normal workflows and the 500-person edit passed.

WORKFLOWS: PASS

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `94188`. The local evidence is `factory/build/dyn_certify/94188/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `users → 0 → firstName`.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Fixed and retested.** Two near-quota snapshots of 58,782 and 59,237 bytes both reached Harbor, with ordinary timing and at 2,200 ms emulated latency. No request failed.

Docker dynamic certification run `175552` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
