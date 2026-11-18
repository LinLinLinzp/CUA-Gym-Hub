# Hootsuite Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5472  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested | 4 |
| Elements tested | 6 groups |
| ✅ Passed | 6 groups |
| ❌ Failed | 0 |
| ⚠️ Skipped (out of scope) | 0 planned groups |

Playwright used the installed Chromium and `PILOT_PLAYWRIGHT`. The four routes were `/`, `/planner`, `/approvals`, and `/streams`. The fallback redirect was also exercised. All business actions were performed through the browser with a fixed clock and isolated session IDs. Before and after each successful action, the runner fetched `/go?sid=…` and verified one whole-state write, a matching `state_diff`, the original baseline, and unchanged unrelated collections.

## ✅ Passing Tests

- **`/` and `/planner` Planner** — Week and List navigation, Today, date prefilling, filtering, details, scheduling with two profiles, draft creation, edit, reschedule, move to Drafts, cancellation, and persisted results after reload. Invalid caption, missing profiles, and a past date produced zero writes.
- **`/approvals` and `/planner` Approvals** — Assigned to me, Requested by me, History, and filters. Requested approval for a new post and an existing draft. Approved and rejected separate assigned requests, checked invalid decisions, and revised and resubmitted as the post author. Verified pending posts were read-only, kept rejection history, and reopened saved details after reload.
- **`/streams` Boards and feeds** — Board selection, feed matching and filtering, create and rename, duplicate-name validation, stream add and edit, compatible profile and stream types, keyword validation, left and right reorder, move to board, removal, board removal cascade, and reload.
- **All routes and Harbor API** — Verified baseline, fixture counts, direct navigation, fallback redirect, `sid` preservation and isolation, empty and partial records, missing references, and a 320-post injected state. Rejected a nonexistent New York daylight-saving time and stored the valid adjacent time as UTC. Observed zero post-boot writes during 5.5 seconds of idle time and zero browser requests outside localhost.
- **Workspace controls** — Verified live preview, profile checkbox uncheck, review form return with caption retained, modal close and focus return, button hover, decision form Back, clearing approval filters, board dialog Cancel, keyboard menu opening and Escape, the disabled left action at the column edge, and keeping a board from its removal dialog. These interactions produced zero writes.
- **`/streams` Refresh** — Advance of the browser clock followed by filtering updated feed timestamps and preserved the last refresh notice, with zero state writes.

### State fields observed via `/go`

| Workflow | Action | Persisted fields and effects |
| --- | --- | --- |
| Scheduled posts | Schedule or save draft | Appended `posts[]` with `id`, `body`, `profileIds`, `scheduledAt`, `status`, `createdBy`, `createdAt`, `updatedBy`, and `updatedAt`. The scheduled fixture used `2026-12-02T16:30:00.000Z`. The untimed draft had an empty `profileIds` array and null `scheduledAt`. |
| Scheduled posts | Edit or reschedule | Kept the post ID. The edit updated submitted copy. The reschedule updated `scheduledAt` to December 3. Both recorded `updatedBy` and `updatedAt`. |
| Scheduled posts | Move to Drafts or cancel | Moving to Drafts set `status: draft` and `scheduledAt: null`. Cancellation set `status: canceled` and retained its scheduled time. Both updated `updatedBy` and `updatedAt`. |
| Approvals | Request approval | Added or updated `posts[]` with `body`, `profileIds`, `scheduledAt`, `status: pending_approval`, and actor/time metadata. Appended `approvals[]` with `id`, `postId`, `reviewerId`, `requestedBy`, `requestNote`, `createdAt`, `status: pending`, and null `previousRequestId`, `decisionNote`, `decidedBy`, and `decidedAt`. |
| Approvals | Approve or reject | Updated `approvals[].status`, `decisionNote`, `decidedBy`, and `decidedAt`. The same save updated the linked post's `status` to `scheduled` or `rejected` and recorded `updatedBy` and `updatedAt`. |
| Approvals | Revise and resubmit | Kept the post ID, saved revised copy and schedule with `status: pending_approval` and updated actor/time metadata, appended a pending request with `previousRequestId` set to the rejected request's ID, and preserved that rejected record. |
| Streams | Create or rename board | Added `streamBoards[]` with `id`, trimmed `name`, `position`, `status: active`, null removal metadata, and creation/update actor and time. Rename kept the ID and updated `name`, `updatedBy`, and `updatedAt`. |
| Streams | Add or edit stream | Added `streams[]` with `id`, `boardId`, `name`, `profileId`, `type`, `query`, `position`, `status: active`, null removal metadata, and creation/update actor and time. Editing kept the ID, changed the title and query, and updated actor/time metadata. |
| Streams | Reorder, move, or remove stream | Updated affected `position` values and actor/time metadata. Moving boards also changed `boardId` and appended the stream to its destination. Removal retained the stream with `status: removed`, `removedBy`, `removedAt`, `updatedBy`, and `updatedAt`, and renumbered the surviving sibling. |
| Streams | Remove board | Updated the board and both active child streams to `status: removed` with `removedBy`, `removedAt`, `updatedBy`, and `updatedAt` in a single write. Preserved the moved stream and the previously removed stream. |

## ❌ Bugs for Dev Agent

No open issues were found in the exercised workflows and controls.

## Visual Alignment Feedback

Reviewed current desktop screenshots of Planner, Approvals, and Streams against the site's original design brief. The sage palette, text wordmark, cream panels, seven-column Planner, split approval queue, and board index with feed columns were present. Screenshots are in the ignored `.vite/` directory.

## Round History

### Round 1 → Round 2

- Reused the existing implementation and extended the ignored Playwright runners with explicit `state_diff` assertions and supplemental control checks.
- `npm run build` and all three workflows passed. The build emitted nonblocking React Router module-directive warnings.
- The existing development server occupied port 5472, so the built-bundle rerun used Playwright to serve the rebuilt `dist/` HTML and hashed assets while sending API traffic to the live localhost listener. The previous round recorded a direct Vite preview pass.
-

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `165320`. The local evidence is `factory/build/dyn_certify/165320/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `users → 0 → name`.
