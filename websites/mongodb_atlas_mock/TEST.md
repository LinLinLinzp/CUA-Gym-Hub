# MongoDB Atlas Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5487  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Route patterns tested, including the fallback | 8 |
| Confirmed workflow mutations verified through /go per full run | 19 |
| Additional injected-world mutations verified through /go per full run | 3 |
| Failed final checks | 0 |

`npm run build`, `node test_atlas.mjs`, `node test_atlas.mjs --dist`, and `node test_atlas_controls.mjs` passed on Windows PowerShell using the installed Chromium. The built-asset run served the generated HTML and JavaScript through Playwright and used the localhost Harbor state API. The client data manager matched the repository template byte for byte. Test scripts and screenshots were saved under the repository's ignore rules.

## ✅ Passing Tests

### SEED workflows and fields observed through /go

Every confirmed action below appended one `activityLog[]` event. Each event contains `id`, `projectId`, `actorId`, `entityType`, `entityId`, `action`, `status`, `createdAt`, and `changes`. The main run verified a single `set_current` per action, exact before and after values in the event, and an unchanged initial baseline and unrelated records.

Each newly added entity included `id`, `projectId`, `createdAt`, `createdBy`, `updatedAt`, and `updatedBy` in addition to the fields listed below. For existing rows, `updatedAt` changed on each confirmed edit, status change, or removal. The synthetic actor stayed the same, so `updatedBy` retained its value.

| Route and action | Exact entity fields added or changed | Event action |
| --- | --- | --- |
| `/clusters` Deploy Dedicated, Free and Flex clusters | Appended `clusters[]` records with `name`, `provider`, `region`, `mongoVersion`, `tier`, `diskSizeGB`, `backupEnabled`, `terminationProtection`, and `status`. Verified Dedicated M20, Free M0, and Flex. | `cluster.created` |
| `/clusters/:clusterId` Edit configuration | `tier` M20 → M30, `diskSizeGB` 60 → 88, `backupEnabled` and `terminationProtection` true → false, and `updatedAt`. | `cluster.updated` |
| `/clusters/:clusterId` Pause and resume | `status` active → paused → active and `updatedAt` for each action. Paused clusters disabled edit, and Free and Flex disabled pause. | `cluster.paused`, `cluster.resumed` |
| `/clusters/:clusterId` Terminate | `status` active → terminated, `terminatedAt`, and `updatedAt`. The same ID remained in state and disappeared from inventory. Protection and a wrong confirmation name blocked termination. | `cluster.terminated` |
| `/database-access` Add and re-add a database user | Appended `databaseUsers[]` records with `username`, `authMethod`, `authDatabase`, `status`, `roles`, `clusterIds`, and `expiresAt`. The initial add verified a collection-scoped role, a specific cluster, and a 6-hour expiry. The credential was absent from the full snapshot. Re-adding the deleted username generated a new ID. | `database_user.created` |
| `/database-access` Edit a database user | `roles`, `clusterIds` restricted → null, `expiresAt` 6-hour → 1-day grant, and `updatedAt`. | `database_user.updated` |
| `/database-access` Delete a database user | `status` active → deleted, `deletedAt`, and `updatedAt`. | `database_user.deleted` |
| `/project-access` Grant an organization member access | Appended a `projectUsers[]` record with lowercase `email`, `name`, two entries in `roles`, and active `status`. | `project_user.granted` |
| `/project-access` Change project roles | `roles` and `updatedAt` on the original ID. | `project_user.roles_updated` |
| `/project-access` Remove member access | `status` active → removed, `removedAt`, and `updatedAt`. | `project_user.removed` |
| `/project-access` Invite an external user | Appended a `projectUsers[]` record with lowercase `email`, `roles`, pending `status`, `invitedAt`, and `expiresAt` 30 days after invitation. | `project_user.invited` |
| `/project-access` Cancel an invitation | `status` pending → removed, `removedAt`, and `updatedAt`. | `project_user.invite_cancelled` |
| `/network-access` Add an IP entry | Appended an `ipAccessList[]` record with normalized `address` 192.0.2.212/30, `comment`, active `status`, and `expiresAt` one week after creation. Invalid IPv4 and equivalent duplicate ranges failed validation. | `ip_access.created` |
| `/network-access` Edit an IP entry | `address` changed from CIDR to a single host, `comment` changed, `expiresAt` became null, and `updatedAt` changed. | `ip_access.updated` |
| `/network-access` Delete an IP entry | `status` active → deleted, `deletedAt`, and `updatedAt`. | `ip_access.deleted` |

### Navigation, controls, and Harbor

- **Overview and shell.** The four resource cards, activity link, brand link, skip link, project switcher, active navigation, and fallback-route link responded. Deep reloads preserved project and session.
- **Inventory and forms.** Search, status and role filters, sorting, pagination in both directions, clearing filters, adding and removing role rows, dialog close and cancel, and keyboard focus behavior passed. The mobile network row menu remained usable after horizontal table scrolling.
- **Harbor no-op behavior.** Initial load issued one baseline `set`. Validation failures, cancellation, no-op edits, navigation, filters, pagination, reloads, and 2.5 seconds idle issued zero additional mutation POSTs.
- **Injected state.** Empty and single-record collections, 302 clusters, optional-field fallbacks, and unavailable project and cluster IDs rendered. A sparse network edit updated `comment` and edit metadata in the correct project and preserved custom metadata and unrelated clusters.
- **Historical cluster scopes.** A database role edit changed `roles` while preserving the historical cluster ID. A no-op and an invalid scope change sent zero mutation POSTs. A valid reassignment changed `clusterIds` from `["old"]` to `["live"]` and recorded both values in `activityLog[].changes.clusterIds`.
- **Reset and isolation.** `POST /post` with `action: "reset"` restored the stored baseline and cleared the `/go` diff. `GET /state` returned the restored records. The primary session retained its own changes.
- **Activity.** Entity filtering and search displayed the actor and historical target without writing state. Chromium reported zero browser exceptions and no requests outside localhost.

## ❌ Bugs for Dev Agent

No open defects from this round.

## Visual Alignment Feedback

Desktop screenshots covered all seven main routes. A desktop form and a mobile form were inspected against the site's original design. The Network Access search placeholder was clipped at 1440 px. The search field was widened and the full placeholder was verified after rebuilding and rerunning the suites.

## Round History

### Round 1 → Round 2

- Earlier fixes for consecutive saves, dialog focus, mobile row menus, and historical cluster scopes passed again.
- Network Access search placeholder clipping was fixed and verified.

TEST COMPLETE: mongodb_atlas_mock — PASS ✅

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `141524`. The local evidence is `factory/build/dyn_certify/141524/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `organizationMembers → 0 → organizationId`.
