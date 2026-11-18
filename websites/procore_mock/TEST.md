# Procore Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5436  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Route patterns tested | 11 |
| State-changing interactions tested | 31 |
| ✅ Passed state-changing interactions | 31 |
| ❌ Failed state-changing interactions | 0 |
| Open P0 / P1 findings | 0 |
| Open P2 findings | 1 |

Node Playwright from `PILOT_PLAYWRIGHT` ran in Chromium against the existing localhost listener with fresh session IDs and synthetic fixtures. `npm run build` passed.

## ✅ Passing Tests

Each successful action sent one `set_current` request and appended one actor-attributed `activity[]` record. The suite compared every request with `/go.current_state` and inspected the before-and-after fields of each affected record. `updatedById` was present and retained its value when consecutive changes came from the same actor.

| Workflow | Verified behavior and observed changes |
| --- | --- |
| RFI draft and edit | Appended `rfis[]` with `id, projectId, number, status, officialResponseId, subject, question, location, assigneeIds, dueDate, createdAt, createdById`. Editing changed `subject, question, location, assigneeIds, dueDate, updatedAt, updatedById`. Opening changed `status` from Draft to Open and refreshed `updatedAt`. Opening an unassigned draft and removing the sole assignee from an open RFI produced zero writes. |
| RFI responses | Appended two `rfiResponses[]` records with `id, rfiId, text, createdAt, createdById` and refreshed `rfis[].updatedAt` each time. Selecting and replacing the official response changed `officialResponseId, updatedAt`. Closing and reopening changed `status, updatedAt` and retained the official response across both transitions and a reload. |
| Submittal draft, edit, and attachment | Appended `submittals[]` with `id, projectId, number, status, revision, ballInCourtId, title, type, specSection, description, responsibleCompanyId, reviewerId, dueDate, attachments, createdAt, createdById`. An intercepted upload failure kept the entered values and made zero business writes. After retry, the download matched the original file. Editing changed `description, updatedAt, updatedById` and retained the attachment. |
| Submittal review and revision | Submission changed `status, ballInCourtId, updatedAt`. Each review appended `submittalReviews[]` with `id, submittalId, revision, decision, comments, createdAt, createdById` and changed `submittals[].status, ballInCourtId, updatedAt`, plus `updatedById` where first populated. All four decisions passed. Resubmission changed `revision` from 0 to 1, set `status` back to In Review, restored `ballInCourtId` to the reviewer, and refreshed `updatedAt`. Prior revisions stayed visible after reload. Missing required comments and cancellation produced zero writes. |
| Daily log entries | First entry on a blank date appended `dailyLogs[]` with `id, projectId, date, status, completedAt, completedById, createdAt, createdById, updatedAt, updatedById`. Weather, Manpower, Note and Delivery each appended `dailyLogEntries[]` with `id, dailyLogId, type, details, createdAt, createdById`. Editing changed `details.workerCount, updatedAt, updatedById` and the displayed crew-hours from 30 to 37.5. Removal deleted the delivery record, leaving its ID, type and parent log ID in activity. Subsequent entry operations refreshed `dailyLogs[].updatedAt`. Negative temperature saved and zero hours failed validation. Previous, Next, Today, recorded days and manual date selection produced zero writes. |
| Daily log completion | Completion and reopening changed `dailyLogs[].status, completedAt, completedById, updatedAt`. Completion locked entry controls. Reopening cleared both completion fields and retained the three remaining entries. Crew-hours remained visible after reload. |
| Change order draft and pricing | Appended `changeOrders[]` with `id, projectId, number, status, contractId, title, reason, description, reviewerId, scheduleImpactDays, totalAmount, createdAt, createdById`. The draft kept a signed impact of −2 days. Pricing changed `reviewerId, totalAmount, updatedAt, updatedById` and appended two `changeOrderLineItems[]` records with `id, changeOrderId, costCode, description, quantity, unitCost, amount, createdAt, createdById`. Extensions of $10.81 and −$1.01 totaled $9.80. The second edit removed the credit line, changed the retained line's `quantity, amount, updatedAt, updatedById`, and changed the order's `totalAmount` to $12.97 and refreshed `updatedAt`. |
| Change order submission and decision | The unpriced draft failed submission with zero writes. Valid submission changed `status, submittedAt, submittedById, updatedAt`. Approval and rejection changed `status, decisionComment, decidedAt, decidedById, updatedAt`, plus `updatedById` where first populated. Blank rejection comments produced zero writes. |

## Runtime and UI results

- Cold boot made one baseline `set`. The template client copy matched the repository template byte for byte.
- The default project was Harborview Medical Pavilion with Maya Chen as the actor. Project switching scoped records and selectors, preserved `sid`, and made zero writes. Cross-project detail IDs showed a return link to the tool.
- The four overview cards opened their tools and marked the matching rail link active. The wordmark and Project Overview link returned to the overview. The recent activity link opened the corresponding record. The drawer close button and Escape dismissed the form with zero writes.
- Direct navigation and reloads worked for record routes. An isolated session opened with the original seed while the workflow session retained its changes. `/go` showed 30 baseline RFIs and 31 current RFIs in the workflow session, with differences limited to the expected business and activity collections.
- One injected workspace rendered with 210 sparse RFIs, one sparse submittal, one sparse change order, and empty lookup lists. Default pagination showed 25 records, changing to 50 and paging worked, and a search reset to page one. The app preserved an injected top-level key after saving a note. An empty project array yielded an empty workspace on both root and deep links.
- Search, filters, sorting, pagination, date changes, cancelled forms, and validation failures made zero business-state writes. A second tab in the workflow session remained idle throughout the mutations and made zero writes after boot.
- The seed contained 30 RFIs, 28 submittals, 25 logged dates, 65 daily log entries, and 24 change orders across the two projects. Browser verification observed no unexpected console errors or external network requests.
- API checks confirmed that `set_current` and a subsequent `set` leave the stored initial snapshot intact. `reset` restored that snapshot and emptied `state_diff`. A separate session had no stored state.
- Chromium loaded `dist/index.html` and the built CSS and JavaScript on localhost with only the Harbor state endpoints forwarded to the listener. All other requests were blocked. An injected Daily Log deep link rendered, a note persisted with a linked activity event, and reloading retained both the note and the injected fixture. The unknown-route return link worked and retained the SID. Across the production-bundle check the browser issued exactly one baseline `set` and one user-driven `set_current`.

## ❌ Bugs for Dev Agent

### BUG-001 · P2 · Change order submission history uses review wording

| Field | Value |
| --- | --- |
| Route | `/projects/proj-harborview` and change order detail |
| Element | Activity for a change order submission |
| Action | View recent activity or submit a priced draft and open its history |
| Expected | Activity reads “Submitted for approval” and shows Pending Approval. |
| Actual | Activity reads “Submitted for review” and shows Pending Approval. The link and persisted transition work. |
| Console errors | None |
| Fix hint | Use `entityType` to choose the wording for a `submit` activity. |

## Visual Alignment Feedback

Checked the overview and four tool views at 1440 × 900 against the site's original design and verified mobile navigation and table containment at 390 × 844. The desktop views showed the text wordmark, original plan linework, tool rail, and status labels as designed.

## Round History

### Round 1 → Round 2

- The full seed suite, Harbor checks and build passed again. This round added the exact `/go` field comparisons, navigation and dialog checks, and BUG-001.
-

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `65240`. The local evidence is `factory/build/dyn_certify/65240/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `projects → 0 → number`.
