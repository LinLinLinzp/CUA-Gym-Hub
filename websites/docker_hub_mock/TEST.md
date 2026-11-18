# Docker Hub Mock — Test Report

> Round: 2
> Date: 2026-11-18
> Server: http://localhost:5494
> Tested by: playwright agent using Chromium via `PILOT_PLAYWRIGHT`

WORKFLOWS: PASS

## Summary

| Check | Result |
| --- | --- |
| Repository, tag and team browser scenarios | Pass |
| Distinct business mutations verified through `/go` | 14 |
| Empty, sparse, isolated, 260-record and 288-record injected sessions | Pass |
| Dist bundle smoke test | Pass |
| Production build and shared template integrity | Pass |
| Desktop views visually reviewed | 10 |
| Open test failures | 0 |

## ✅ Passing Tests

| Workflow | Browser and `/go` assertions |
| --- | --- |
| Browse repositories | The index shows 12 of 36 rows per page and defaults to latest update. Verified pagination, name and pull sorting, description and qualified-name search, namespace and visibility filtering, no-result recovery, and General navigation. Browser Back restored filters, the home link returned to the index, and navigation kept `sid`. |
| Create repository | The form inherited the personal namespace and defaulted to Private. Invalid names, duplicate names and an overlong description caused zero writes. Valid input was trimmed and opened General. `/go` exposed a new `repositories[]` record and `repository.created`. |
| Edit repository | Copied the qualified pull command, discarded a draft, and saved a short description and multiline overview. Reload displayed the saved values. `/go` showed `repositories[].description`, `overview`, update metadata, and `repository.updated` with before/after values. |
| Change visibility | The confirmation displayed the public visibility consequence. Escape canceled and restored focus. Confirming wrote `repositories[].visibility`, update metadata, and `repository.visibility_changed`. |
| Delete repository | The confirmation displayed 24 tags and two grants and required the qualified name. `/go` showed deletion metadata on the repository, its active tags and grants, and `repository.deleted` with their IDs. Unrelated tags, grants and teams were preserved. The former route displayed an unavailable state. |
| Find and inspect tags | Verified tag search, platform filtering, name sorting, no-result recovery, the digest detail link and tag-qualified clipboard command. The immutable tag could not be selected. |
| Add tag from image | Rejected duplicate and invalid names with zero writes. A valid tag opened its own detail and retained the source link after reload. `/go` showed a new `tags[]` record with copied digest, platforms and size, linked source ID, push time, creation metadata, parent repository metadata and `tag.created`. |
| Delete selected tags | Dismissing the dialog preserved two selected tags. Confirmation marked only those two tags deleted, stamped the repository, and wrote `tag.deleted` with both IDs. Two other tags with the same digest stayed active. The deleted tag route showed a recovery link. |
| Find, create and edit teams | The directory defaulted to Northstar Platform and showed 24 teams. Searched by description and cleared an empty result. Invalid names and duplicates caused zero writes. Create and edit wrote `teams[]`, update metadata, and `team.created` and `team.updated`. |
| Manage team members | Searched existing members by Docker ID, display name and email. Verified no-match feedback and disabled duplicate selection. Add and remove wrote `teamMemberships[]`, `teams[]` update metadata, and member events with team, membership and user IDs. Other teams and organization membership were preserved. |
| Manage repository access | The personal namespace displayed an unavailable state. The organization picker omitted teams with an existing grant. Grant, edit and revoke wrote `repositoryPermissions[]`, repository update metadata, and the matching activity events. The team's detail showed the same permission after reload. Regranting issued a new ID. |
| Delete team | Required the team name and displayed one affected membership and grant. `/go` showed deletion metadata on the team, active membership and active grant, and `team.deleted` with all three IDs. Users, organization memberships, repositories, tags and unrelated grants remained. The prior team route displayed an unavailable state. |

Each tested mutation issued one `set_current` request and appended one `activity[]` record with `id`, `type`, `actorId`, ISO `createdAt` and `targets`. Field edits also recorded before and after values in `changes`. The following paths were verified in `/go` current state and checked against its diff. In the table, update metadata means `updatedAt` and `updatedBy`. New records have `id`, active `status`, `createdAt`, `createdBy` and update metadata. Deleted records have deleted `status`, `deletedAt`, `deletedBy` and update metadata.

| Confirmed action | Changed state fields |
| --- | --- |
| Create repository | New `repositories[]` with `namespaceId`, `name`, `description`, `visibility`, empty `overview`, zero `pullCount` and creation fields. |
| Edit repository | `repositories[].description`, `overview` and update metadata. |
| Change repository visibility | `repositories[].visibility` and update metadata. |
| Delete repository | Deletion fields on the repository, its active `tags[]` and its active `repositoryPermissions[]`. |
| Add tag from image | New `tags[]` with `repositoryId`, `name`, `digest`, `platforms`, `sizeBytes`, `sourceTagId`, `pushedAt`, false `immutable` and creation fields. Parent repository update metadata. |
| Delete selected tags | Deletion fields on the selected mutable `tags[]` and update metadata on the parent repository. |
| Create team | New `teams[]` with `namespaceId`, `name`, `description` and creation fields. |
| Edit team | `teams[].description` and update metadata. |
| Add team member | New `teamMemberships[]` with `teamId`, `userId` and creation fields. Parent team update metadata. |
| Remove team member | Deletion fields on the active `teamMemberships[]` record and update metadata on its team. |
| Grant access | New `repositoryPermissions[]` with `repositoryId`, `teamId`, `permission` and creation fields. Parent repository update metadata. |
| Edit permission | `repositoryPermissions[].permission` and update metadata on the grant and parent repository. |
| Revoke access | Deletion fields on the active `repositoryPermissions[]` record and update metadata on the parent repository. |
| Delete team | Deletion fields on the team and its active `teamMemberships[]` and `repositoryPermissions[]`. |
| Browse, search, filter, sort, paginate, copy, cancel, dismiss and select rows | Zero writes after boot. |

## Harbor Checks

- **Injection and reload** exercised direct routes, empty arrays, sparse records with missing optional fields and unresolved joins, a namespace with no repositories, and 260 injected repositories. An edit to a sparse team preserved an unrecognized injected data key. The large result set still showed 12 rows per page.
- **Isolation and reset** confirmed fresh session defaults, preservation of `initial_state` across current writes, and reset to the injected baseline.
- **Idle behavior** observed only one browser baseline `set` across the idle test. A newer write sent to the same session remained in `/go` after 4.5 seconds.
- **Built bundle** loaded the compiled HTML, CSS, JS and favicon from `dist` through Playwright route fulfillment, with `/state`, `/post` and `/go` served by the localhost listener. A retag succeeded and persisted through hard reload. No requests went to an external origin, and no console or page errors were observed.
- **Keyboard and selection** confirmed the skip link preserved `sid`, the primary action responded to hover, and the bulk checkbox selected only visible mutable tags. Cancel preserved the selection and unchecking cleared it. These checks left `state_diff` empty.

## ❌ Bugs for Dev Agent

No open failures. Harbor dynamic certification remains with the parent runner.

## Visual Alignment Feedback

Reviewed the repository index, create forms, General, Tags, tag detail, Permissions, Settings, team index and team detail at 1280×860 against the site's original `DESIGN.md`. The charcoal navigation rail, warm canvas and vermilion actions are consistent across the views. The mobile repository index at 390×844 kept the table inside its scroll container without horizontal document overflow.

## Round History

### Round 1 → Round 2

- Re-ran both workflow suites and the compiled-bundle smoke test. No regressions found.
- Added desktop route captures and verified keyboard, hover and bulk selection behavior.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `155440`. The local evidence is `factory/build/dyn_certify/155440/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `namespaces → 0 → slug`.
