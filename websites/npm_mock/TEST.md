# npm Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5495  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Routes and view cases tested | 16 |
| Elements tested, grouped by the workflow and runtime checks below | 15 |
| ✅ Passed | 15 |
| ❌ Failed | 0 |
| ⚠️ Skipped (out of scope) | 0 |

The production build passed. All three workflow suites passed on localhost using the installed Node Playwright and headless Chromium. The suites recorded 22 successful browser mutations from the Packages, Access Tokens, and Organizations workflows against the built `dist` via Vite preview on port 5495.

---

## ✅ Passing Tests

| TODO | Browser exercise | Mutations |
| --- | --- | ---: |
| P1.1 | Searched package names and descriptions, filtered scope, visibility and status, sorted downloads, paginated, opened package overview and versions, copied the install command, and browsed organization packages. | 0 |
| P1.2 | Canceled a public visibility change, confirmed it, checked both inventories, and changed the package back to private. Verified restrictions for unscoped packages, a public plan, and a non-owner. | 2 |
| P1.3 | Rejected incomplete deprecation, confirmed with a reason and exact package name, reloaded the advisory, and restored the package. | 2 |
| P1.4 | Searched and filtered active, expired, and revoked tokens. Opened masked details and checked CIDRs, resource names, and expiry against a fixed clock. | 0 |
| P1.5 | Validated name, permissions, CIDRs, date, and required resource selections. Canceled review, then generated a token with a selected package, scope, and organization, two CIDRs, custom expiration, and publishing 2FA bypass. Copied the synthetic value and checked that only the masked value persisted. | 1 |
| P1.6 | Canceled and confirmed a single revocation. Bulk-revoked one active and one expired token and checked that revoked records could no longer be selected. | 2 |
| P1.7 | Searched by scope, filtered by role, checked invalid and duplicate names, created a private-plan organization, and followed its invitation link. | 1 |
| P1.8 | Rejected duplicate invitations. Invited an email address to a team, revoked the invite, changed a member role, canceled and confirmed a member removal, and verified last-owner protection. | 4 |
| P1.9 | Checked default-team protection and duplicate names. Created a team, added, removed, and re-added a member, granted, edited, removed, and regranted package access, then removed the team with a pending invitation attached. | 10 |

### Fields observed via `/go`

For each successful workflow action, compared the preceding and resulting `current_state` by record ID and checked for a nonempty `state_diff`. Each mutation sent one `set_current` request, including bulk and cascading actions.

| Workflow action | Changed or appended record fields |
| --- | --- |
| Make package public | `packages[]`: `visibility`, `updatedAt`, `updatedBy`. |
| Make package private | `packages[]`: `visibility`, `updatedAt`. The same actor ID remained in `updatedBy` through the subsequent package settings actions. |
| Deprecate and restore package | `packages[]`: `status`, `deprecationMessage`, `deprecatedAt`, `deprecatedBy`, `updatedAt` on each action. Restore cleared the three deprecation fields. |
| Generate token | Appended `tokens[]` with `id`, `name`, `description`, `allowedCidrs`, `bypass2fa`, `packages` (`permission`, `selection`, `packageIds`, `scopes`), `organizations` (`permission`, `organizationIds`), `expiresAt`, `maskedValue`, `status`, `lastUsedAt`, `revokedAt`, `revokedBy`, `createdAt`, and `createdBy`. |
| Revoke single and bulk tokens | `tokens[]`: `status`, `revokedAt`, `revokedBy`. Both bulk targets recorded the same revocation timestamp. |
| Create organization | Appended `organizations[]` with `id`, `name`, `scope`, `plan`, `createdAt`, and `createdBy`. Also appended a linked active owner in `organizationMembers[]`, the default `developers` record in `teams[]`, and the owner assignment in `teamMembers[]`. The membership fields were `id`, `organizationId`, `userId`, `username`, `displayName`, `role`, `status`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `removedAt`, and `removedBy`. |
| Send and revoke invitations | Send appended `organizationInvitations[]` with `id`, `organizationId`, `invitee`, `teamId`, `status`, `createdAt`, `createdBy`, `revokedAt`, and `revokedBy`. Revoke changed `status`, `revokedAt`, and `revokedBy`. |
| Change role and remove member | Role changed `organizationMembers[].role`, `updatedAt`, and `updatedBy`. Removal changed `status`, `removedAt`, and `removedBy` on the member and their active `teamMembers[]` assignment. |
| Create team | Appended `teams[]` with `id`, `organizationId`, `name`, `description`, `isDefault`, `status`, `createdAt`, `createdBy`, `removedAt`, and `removedBy`. The system-created default team uses the same shape. |
| Assign, remove, and reassign team member | Assign appended `teamMembers[]` with `id`, `teamId`, `organizationMemberId`, `status`, `createdAt`, `createdBy`, `removedAt`, and `removedBy`. The initial owner assignment uses the same shape. Remove changed `status`, `removedAt`, and `removedBy`. Reassign appended a new record. |
| Grant, edit, remove, and regrant package access | Grant appended `teamPackageGrants[]` with `id`, `teamId`, `packageId`, `permission`, `status`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `removedAt`, and `removedBy`. Edit changed `permission`, `updatedAt`, and `updatedBy`. Remove changed `status`, `removedAt`, and `removedBy`. Regrant appended a new record. |
| Remove custom team | `teams[]`, `teamMembers[]`, and `teamPackageGrants[]`: `status`, `removedAt`, `removedBy`. `organizationInvitations[]`: cleared the attached pending invitation's `teamId`. |

### Harbor and route checks

- **Direct links and navigation.** Loaded and reloaded all 16 cases at desktop and mobile widths, including the root redirect, package versions, and the fallback view. Verified the `npm` title, session retention, active navigation, organization breadcrumbs, and the home link. No browser console errors or uncaught exceptions were observed in the route sweep.
- **Session isolation and persistence.** Reloaded changed records and switched between fresh and changed SIDs in the same browser context. The fresh SID retained the baseline and an empty diff.
- **Idle and canceled actions.** Idle waits, navigation, failed validation, filtering, selection, and canceled confirmations produced zero mutation requests. A same-SID peer tab produced zero POSTs during another tab's save and the following three seconds.
- **Injected data.** Loaded empty arrays, single sparse records and missing references, and a 317-record inventory. Checked missing-record return links and effective expiry on both sides of a fixed timestamp.
- **API and template.** Direct localhost requests verified first-baseline preservation, current-state diffs, and reset to an empty diff. The local state helper matched the repository template byte for byte.
- **Dialog and notification controls.** Verified focus entered the dialog, Escape restored focus to the trigger, and dismissing the success notification closed it without a state write.

---

## ❌ Bugs for Dev Agent

No open findings from this round.

## Visual Alignment Feedback

Reviewed local captures of the 16 cases at 1440 px and 390 px against [DESIGN.md](DESIGN.md). The desktop workspace uses the graphite rail, text wordmark, and aligned lists from the design. The mobile header kept the three account areas available and tables scrolled inside their regions. The route sweep found no page-level horizontal overflow.

## Round History

### Round 1 → Round 2

Reverified every workflow against the production build and recorded per-action field changes from `/go`. The expanded route, layout, and Harbor checks passed.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `109344`. The local evidence is `factory/build/dyn_certify/109344/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `packages → 0 → name`.
