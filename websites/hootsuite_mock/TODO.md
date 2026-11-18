# Hootsuite Mock — TODO

> Status: VERIFIED  
> Last updated by: dev agent, 2026-11-18  
> [Research](assets/README.md) · [Data model](assets/data_model.md) · [Design](DESIGN.md)

## Status legend

- [ ] Not started
- [~] In progress
- [x] Done

## P0 — Shell and Harbor runtime

- [x] Set up React and Vite in this directory with `npm run dev`, `npm run build`, `npm run preview`, and a package lock. Use localhost port `5472` with strict port selection. Set the document title and visible wordmark to `Hootsuite`. Start pre-signed-in as Maya Chen in the synthetic Juniper Works workspace.
- [x] Implement `/` and `/planner` for Planner, `/approvals` for Approvals, and `/streams` for Streams. Use the persistent header from [DESIGN.md](DESIGN.md), with three named links and a visible New post button. Put all routes under the providers they consume. Keep `?sid=` through links, editor navigation, and redirects. Support direct entry and reload of all routes and show the appropriate active tab. Route and dialog navigation write no Harbor records.
- [x] Import `stateApi` directly from `../../templates/state-api.js` in `vite.config.js`, including the plugin for preview. Copy `templates/dataManager.js` unchanged to `src/utils/dataManager.js`. Export `createInitialData()` from `src/data/seed.js`. Await `loadState('hootsuite', createInitialData)` behind a neutral loading state before mounting routes. `/state`, `/post`, and `/go` are supplied by the template. `/go` serves JSON with `initial_state`, `current_state`, and `state_diff`.
- [x] Commit each successful business action as one whole-state `saveState` call through the shared store. Use the latest in-memory state and a single update for linked records. Boot follows the template baseline behavior. Navigation, field edits before submission, filtering, dismissals, manual stream refresh, and idle time perform no business writes. Render empty, singleton, and large injected arrays, partial records, and missing references safely without replacing or repairing injected data on read. Use the browser clock for relative labels and time-based validation. Package every runtime asset locally.
- [x] Write `SCHEMA.md` from the implemented model. Document every top-level key and record shape and include the Observable State Changes table from the [data model](assets/data_model.md), reconciled to the implementation. Keep all stored values JSON-serializable.

## P1 — Scheduled posts

- [x] **Browse Planner.** Ship Week and List views of the same posts. Week uses Monday–Sunday with a Today control, previous/next buttons, a date range in the workspace time zone, labeled dates, and clickable empty day areas that prefill a date. List defaults to all dates and sorts by scheduled time, with unscheduled drafts grouped after timed posts. Both support account, status, and text filters, with clear filters and working empty states. Open a post from either view to read its copy, selected profiles, planned time, status, and available actions. Record writes: none.
- [x] **Create and schedule a post or save a draft.** Open the composer from New post or a calendar day. Provide profile multi-select, caption, live preview, and labeled date/time fields in the workspace time zone, which defaults to UTC. Schedule requires a nonblank caption, at least one connected profile, and a future valid date/time. Draft requires a caption and can omit profiles and time. Keep inputs intact on validation failure. After save, show the record in Planner and bring its date into view if scheduled. Record writes: append one `posts[]` record with `status: "scheduled"` or `"draft"`, `body`, `profileIds`, `scheduledAt`, `createdBy`, `createdAt`, `updatedBy`, and `updatedAt`.
- [x] **Edit, reschedule, or cancel a post.** Give scheduled posts and drafts a prefilled Edit action. Reschedule presents the existing time and changes it without recreating the post. Moving to Drafts clears the time and sets `draft`. Cancel scheduled post requires confirmation and records `canceled`. Canceled records remain discoverable via the status filter. Record writes: update the existing `posts[]` record in place with changed `body`, `profileIds`, `scheduledAt`, or `status`, plus `updatedBy` and `updatedAt`. Already published and canceled posts display read-only detail.

## P1 — Approvals

- [x] **Request approval.** Offer Request approval in the composer or from a draft or scheduled post. Require complete post fields, a future schedule, and one teammate as reviewer. Show the optional request note in the review detail. Save the post and request as one action, open its detail, and show it in the Requested by me queue. Record writes: add or update `posts[]` with `pending_approval` and append an `approvals[]` record with `postId`, `reviewerId`, `requestedBy`, `requestNote`, `createdAt`, `status: "pending"`, and null decision fields. Prevent duplicate open requests for the same post.
- [x] **Review the queue and decide.** Show Assigned to me, Requested by me, and History views with account, status, and text filters. Open a request to see the associated post preview, author, reviewer, schedule, request note, and decision when available. The assigned reviewer can Approve or Reject a pending request. Reject requires a nonblank reason. Approve requires a future schedule and can include an optional note. Update queue membership and Planner status immediately. Record writes: update `approvals[].status`, `decisionNote`, `decidedBy`, `decidedAt` and the linked `posts[].status`, `updatedBy`, `updatedAt` in one save. Approve maps the post to `scheduled`. Reject maps it to `rejected`.
- [x] **Revise and resubmit.** The author opens a rejected request from Requested by me or History and uses Revise and resubmit. Prefill current content and reviewer, show the rejection reason, and validate the resulting future schedule. Pending posts are read-only while a request is open. Record writes: update that `posts[]` record to `pending_approval` with the revised fields and update metadata, and append a new pending `approvals[]` record with `previousRequestId` set to the rejected request ID.

## P1 — Streams

- [x] **Browse boards and feeds.** Show a board list and the selected board's horizontally arranged feed columns. Select a board and show its active streams in saved order. Print each stream's title, social profile, type or query, and reverse-chronological matching cards. Allow filtering visible cards by text and manually reapplying the local feed. Render stable empty states for no boards, no streams, or no matching posts. Record writes: none.
- [x] **Create, rename, and remove a board.** New board asks for a trimmed name, rejects a case-insensitive active duplicate, and selects the new board. Rename preserves the ID. Confirm removal with the number of streams affected, mark the board and all active child streams removed in one save, and select the next active board or the empty state. Record writes: append or update `streamBoards[]` with `name`, `position`, `status`, and actor/time metadata. Removal updates `status`, `removedBy`, `removedAt`, `updatedBy`, and `updatedAt` on the board and affected `streams[]` records.
- [x] **Add, configure, move, reorder, and remove streams.** Add stream asks for title, connected profile, compatible type, and a query for Keyword search. Open a stream menu for Edit stream, Move to board, Move left, Move right, and Remove. Recompute the display from `feedItems` on save. Put a moved stream at the end of the destination board and preserve the relative order of the other streams. Confirm removal and retain the record as removed. Record writes: append or update `streams[]` with `boardId`, `profileId`, `type`, `query`, `name`, `position`, `status`, and actor/time metadata. Reordering and moving update every affected `position` in the same save. Removal also sets `removedBy` and `removedAt`.

## P2 — Secondary features

No P2 work is required for this phase.

## Seed data

- [x] Use the fixture counts and examples in the [data model](assets/data_model.md). Seed fixed IDs and dates, 48 posts, 30 approval requests, 24 streams across six boards, and 72 feed items. Cover scheduled, draft, published, pending, rejected, and canceled states. Ensure the signed-in account can review two pending requests, resubmit one rejected post, and find multiple entries for each major filter type. The fixed seed campaign week has enough posts for a populated first Planner view when the clock falls outside the seed campaign period.

## Verification handoff

- [x] Exercise each P1 write through browser controls on localhost using the installed `PILOT_PLAYWRIGHT` package and Chromium. Use a fresh browser context and a named `sid` per independent scenario. Capture `/go` before and after, assert IDs, actor/time metadata, exact linked changes, and unchanged baseline, then reload and verify the saved state and UI. Include a rejected request followed by resubmission and test approval separately on a request assigned to Maya. For Streams, assert move/reorder and the board-removal cascade. Cover validation failures, empty and partial injected worlds, route reloads, session isolation, and an idle tab with zero post-boot state writes.
- [x] Record the actual results, route, and observed state fields for all three SEED workflows in `TEST.md`. Verify `npm run build` and the built app. If starting a persistent Vite process, use PowerShell `Start-Process -WindowStyle Hidden` with the absolute Vite JS entry point and the target directory as the working directory. Keep runner scratch files gitignored or remove them. Parent runner handles Docker certification and commits.

## Scope

Local scheduling, review, and monitoring for a pre-signed-in workspace. Authentication, live publishing, account connection, remote media, analytics, notifications, and approval policy administration are outside this phase.
