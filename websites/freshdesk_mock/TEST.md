# Freshdesk Mock — Test Report

> Round 2  
> Date 2026-11-18  
> Server http://localhost:5452  
> Tested by the playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Routes and recovery cases exercised | 9 |
| Seed workflows passed | 3 of 3 |
| Successful workflow transactions checked against `/go` | 29 |
| `/go` reads in the workflow suite | 104 |
| Targeted audit regressions resolved | 4 |
| Failed checks in the final dev server runs | 0 |

Windows PowerShell, Node, and the installed Playwright Chromium from `PILOT_PLAYWRIGHT` were used for this round. `npm run build` passed. The dev server was already serving this site on the assigned port and was reused. The process policy blocked the command to replace that listener with built preview for this round. The initial round previously ran the preview. The parent runner handles Docker dynamic certification.

## ✅ Passing Tests

| Seed workflow and route | Browser actions | Fields observed changing in `/go.current_state` |
| --- | --- | --- |
| **Tickets** · `/`, `/tickets`, `/tickets/new`, `/tickets/:ticketId` | Searched by subject, number and requester, combined filters, sorted, paginated and opened records by mouse and keyboard. Validated the form and created tickets with new and existing contacts. | Creation appended `tickets` records with `id`, `number`, `subject`, `description`, `requesterId`, `status`, `priority`, `type`, `source`, `groupId`, `assigneeId`, `tags`, `createdBy`, `createdAt`, `updatedAt`, `resolvedAt`, `closedAt`, `firstRespondedAt`, `lastCustomerReplyAt`, `lastRespondedAt`, `firstResponseDueOverrideAt`, `resolutionDueOverrideAt`, `slaPolicyId`, `firstResponseDueAt`, `nextResponseDueAt` and `resolutionDueAt`. A new requester appended `contacts` with `id`, `name`, `email`, `createdAt` and `createdBy`. Each creation appended a linked `ticketEvents` record of type `created`. Queue navigation and validation produced zero writes. |
| **Tickets** · triage and conversation | Saved properties and normalized tags, resolved, closed and reopened, bulk-assigned and bulk-closed, rejected an empty note, and saved private notes, public notes and replies. | Changed `tickets.priority`, `groupId`, `assigneeId`, `tags`, `status`, `resolvedAt`, `closedAt`, `updatedAt`, and applicable SLA fields. Each conversation appended `ticketConversations` with `id`, `ticketId`, `authorId`, `kind`, `visibility`, `body`, `cannedResponseIds` and `createdAt`. Added `ticketEvents` of type `updated`, `note_added` or `reply_sent`, with field deltas and linked conversation ID when applicable. An unchanged property save produced zero writes. |
| **SLAs** · `/admin/sla-policies` | Validated conditions and positive targets. Created an any-condition business-hours policy, edited and reordered it, changed its activation, canceled and confirmed deletion, and edited the default. | Appended a `slaPolicies` record with `id`, `name`, `description`, `enabled`, `matchMode`, `conditions`, `hoursMode`, `scheduleId`, `targets`, `isDefault`, `rank`, `createdBy`, `createdAt`, `updatedAt` and `deletedAt`. Edits changed `description`, `enabled`, `rank`, `updatedAt` or `deletedAt` as applicable. Created, updated, activated, deactivated, reordered and deleted actions appended linked `adminEvents`. Existing ticket deadlines stayed intact after the admin actions. |
| **SLAs** · `/tickets/new` and `/tickets/:ticketId` | Exercised matching policy precedence and default fallback, calendar deadlines, and Friday-to-Monday business deadlines. Saved and retained both overrides after a priority edit. Verified public response fulfillment, private-note behavior, and a pending follow-up cleared by reply. | Ticket creation or matching property edits populated or changed `tickets.slaPolicyId`, `firstResponseDueAt` and `resolutionDueAt`. Manual edits also changed `firstResponseDueOverrideAt` and `resolutionDueOverrideAt` and appended a `sla_due_dates_updated` event. Public responses set `firstRespondedAt` or `lastRespondedAt` as applicable, and the follow-up reply cleared `nextResponseDueAt`. Invalid dates produced zero writes. |
| **Canned responses** · `/admin/canned-responses` | Created and renamed a folder, searched by body and short code, inserted an editor placeholder, created, edited, moved and soft-deleted a response, and validated duplicate codes and group scope. | Appended `cannedResponseFolders` with `id`, `name`, `createdBy`, `createdAt` and `updatedAt`. Rename changed `name`. Appended `cannedResponses` with `id`, `title`, `body`, `shortCode`, `folderId`, `visibility`, `groupIds`, `ownerId`, `createdAt`, `updatedAt` and `deletedAt`. Follow-up actions changed `title`, `visibility`, `groupIds`, `folderId` or `deletedAt`. Each mutation appended a linked `adminEvents` record. Rejected and canceled actions produced zero writes. |
| **Canned responses** · `/tickets/:ticketId` | Filtered the picker, verified eligible group and personal entries and exclusion of deleted entries, previewed requester, ticket number and subject substitutions, and inserted text into an existing draft before sending. | Preview, cancel and insertion produced zero writes. Send appended `ticketConversations.body` and deduplicated `cannedResponseIds`, linked by `ticketId`, and a corresponding `ticketEvents` record with `type: reply_sent` and `conversationId`. |

Each observed ticket event included `id`, `ticketId`, `type`, `actorId`, `createdAt`, `changes` and `conversationId`. Each observed admin event included `id`, `entityType`, `entityId`, `action`, `actorId`, `createdAt` and `changes`. The workflow clock was frozen, so successive updates could retain the same timestamp value. Exact record schemas are in `SCHEMA.md`.

### Harbor and route coverage

- Verified `/state`, `/post` and all three `/go` keys. Four independent seed, empty, sparse and large sessions each emitted one browser baseline `set`. Each successful workflow transaction emitted one `set_current`. A two-second idle check produced zero writes. Reset restored the initial state.
- Loaded and reloaded every route, including missing ticket and unknown route recovery. Verified SID-preserving navigation, safe empty and sparse rendering, retention of injected fields, a 360-ticket queue, 180 policies, and a 240-response library.
- Checked the wordmark and skip links, pagination in both directions, selection clearing, dialog close and condition removal, cancellation, mobile queue and folder disclosure, and the search reset. The supplemental browser run had an empty `state_diff` and no console errors. The workflow suite observed zero uncaught exceptions and zero off-origin requests.

## ❌ Bugs for Dev Agent

No open issues in the tested flows.

## Visual Alignment Feedback

Verified the local design against `DESIGN.md` using Playwright captures of the queue, ticket form, ticket detail, Admin, policy list, canned library and short mobile filters. Computed wordmark and row line heights, row weight, and pill weight and padding matched the design. The filters scroll within their panel at 390 × 450, where all five selectors and both footer actions were reachable.

## Round History

### Round 1 → Round 2

- **AUDIT-001 fixed.** With the initial `set` held by Playwright, the loading view blocked edits. After release, the first folder appeared in `current_state` and `state_diff`, and the initial snapshot excluded it.
- **AUDIT-002 fixed.** An injected policy with ID `new` retained its name and record after an independent policy was created through Add policy.
- **AUDIT-003 fixed.** The short mobile filter panel stayed inside the viewport, and its content could scroll to Clear filters and Done.
- **AUDIT-004 fixed.** Computed typography and pill spacing matched the local design.

TEST COMPLETE: freshdesk_mock — PASS ✅

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `151728`. The local evidence is `factory/build/dyn_certify/151728/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `agents → 0 → name`.
