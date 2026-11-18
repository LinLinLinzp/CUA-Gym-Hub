# SurveyMonkey Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5390  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Route variants tested in the direct-navigation matrix | 13 |
| Test cases (grouped by workflow or behavior) | 20 |
| ✅ Passed | 16 |
| ❌ Failed | 4 |
| ⚠️ Skipped (out of scope) | 0 |

The primary Playwright run used the installed Node package from `PILOT_PLAYWRIGHT` and local Chromium. `npm run build` passed. The compiled check served `dist` files under the same localhost origin and used the running Harbor API for state. The workflow, route, and compiled runs reported zero browser errors and zero external HTTP requests. Scratch scripts and screenshots are under the gitignored `.vite/` directory.

---

## ✅ Passing Tests

### SEED workflow evidence

The primary browser used `sm-main-1794997164717`. Checks read `current_state` and `state_diff` from `GET /go?sid=sm-main-1794997164717`. The seed contained 30 surveys, 38 collectors and 64 responses. The primary session issued one baseline `set` and 25 `set_current` requests, each from a successful business action.

| Item | Browser checks | Fields verified in `current_state` |
| --- | --- | --- |
| P1.1 Survey library | Workspace counts, case-insensitive title search, combined status and owner filters, response-count sorting, clearing filters and pagination | `surveys`, `collectors`, and `responses` remained unchanged during browsing. The baseline `state_diff` was empty. |
| P1.2 Design and preview | Created Service Pilot Review, edited its description, saved all four question types, rejected duplicate choices, edited a choice, moved and removed questions, and validated required preview answers | New `surveys[].id,title,description,ownerId,questions,createdAt,createdBy,updatedAt,updatedBy`. Detail and question edits changed `description` and the ordered `questions[]` while preserving existing question and option IDs. Valid and invalid preview actions produced zero writes. |
| P1.3 Copy and delete | Copied Customer Onboarding Pulse as a new draft, then confirmed removal of the source with three collectors and 14 responses | Copy appended `surveys[]` with `copiedFromId`, fresh `id`, fresh `questions[].id` and `questions[].options[].id`, and fresh actor and timestamp fields. Source deletion removed the source and linked entries and appended `deletions[]` with `action,entityId,surveyId,removedSurveyIds,removedCollectorIds,removedResponseIds,createdAt,createdBy`. |
| P1.4 Collector management | Created Web link and Manual data entry collectors, copied the web URL to the clipboard, renamed it, saved identified single-response settings, and closed and reopened it | New `collectors[].id,surveyId,name,type,status,settings,closedAt,createdAt,createdBy,updatedAt,updatedBy`. Updates changed `name`, `settings.anonymous,allowMultipleResponses,closedMessage`, and `status,closedAt` with updated actor and timestamp fields. The link stayed identical across changes. Clipboard copying wrote no state. |
| P1.5 Collector maintenance | Verified deletion stayed disabled while a response existed. Confirmed Clear responses and then Delete collector | Clearing removed one linked `responses[]` record and appended a `clearCollectorResponses` deletion with `entityId,removedResponseIds`. The collector remained open. Deleting it removed `collectors[id]` and appended a `deleteCollector` deletion with `removedCollectorIds`. |
| P1.6 Respondent submission | Closed-message screen, invalid required email, valid identified web submission, rejected equivalent email on resubmission, and anonymous manual submission | New `responses[].id,surveyId,collectorId,status,answers,submittedAt,createdAt,createdBy,updatedAt,updatedBy` for each valid submission. Web used `respondent` as the actor and stored normalized `respondent.name,email`. Manual used `usr-maya` and omitted `respondent`. Closed, invalid, and duplicate forms added no records. |
| P1.7 Analysis and CSV | Shared filters across both result views, checked open-text summaries, browsed the individual table, and downloaded the filtered CSV | `exports[].id,surveyId,format,filters.collectorId,filters.status,filters.query,responseIds,createdAt,createdBy`. The CSV contained the exported response ID and its answer cells, and excluded the manual response outside the filter. |
| P1.8 Response edits and deletion | Reloaded response detail, saved a new rating and text answer, observed the summary update, and confirmed deletion | Edit changed `responses[id].answers,updatedAt,updatedBy` and preserved `id,surveyId,collectorId,status,submittedAt,createdAt,createdBy,respondent`. Delete removed that one response and added a `deleteResponse` entry with `entityId,surveyId,removedResponseIds`. |

The compiled build test used `sm-dist-1794997183309`. It checked seeded choice counts, paging through 14 individual responses, CSV coverage of all 14 rows while the second page was selected, and partial-response editing with an unanswered required question. The edited record kept its `status: partial`, original `createdAt` and `submittedAt: null`. A manual submission appeared in an already-open analysis tab in the same session and survived reload.

### Runtime and interaction checks

- The main run hard-reloaded survey Design, collector detail, response detail, and the participant URL. It verified `sid` in navigation and the stable collector link.
- The fresh empty session `sm-empty-1794997164717` rendered its empty state and a missing-survey recovery path. The primary session retained its own modified records.
- The sparse session `sm-sparse-1794997164717` rendered survey, collector, and response views with missing optional fields, an absent collector reference, and unavailable-ID recovery pages.
- The large session `sm-large-1794997164717` rendered and searched 320 injected surveys across 32 pages. The 390px viewport kept the table scroll inside the content area.
- There was one initial baseline write and zero writes during a 2.2-second idle window following library interactions. The total mutation count also excluded canceled dialogs, invalid submissions, reloads and browsing.
- The route matrix in `sm-qa-routes-1794997267625` covered direct visits and reloads on the library aliases, survey index, Design, collector list and detail, Analyze and response detail, Preview, Manual entry, respondent link, and two fallback pages. All 13 fit a 390px viewport without page-wide horizontal scroll.
- Keyboard checks verified Skip to content, wordmark and recovery links, row menu activation and Escape dismissal, and restored focus when the dialog close button was used. The row action showed hover feedback.
- Additional controls verified adding and removing a choice, switching question type, canceling a question draft, opening the same-session collector link in a new tab, and clearing analysis filters. The route session kept the seed unchanged and `/go` returned an empty diff.
- Reset via `/post` restored the original baseline and cleared the diff. The reset session's `/state` matched `/go`, and the separately injected session retained its state.
- `src/utils/dataManager.js` matched the Harbor template byte for byte.

---

## ❌ Bugs for Dev Agent

### BUG-001 · P0 · Cross-tab response edits lose an unrelated answer

| Field | Value |
| --- | --- |
| Route | `/surveys/sv-onboarding/analyze/rsp-onboarding-001` |
| Element | Save response |
| Action | Open Edit response in two tabs sharing a session. Save a new comment in the first tab. Set the rating to 5 in the second tab and save. |
| Expected | `/go` retains the new comment and rating. |
| Actual | The rating persists and `responses[id].answers.q-onboarding-comment` reverts to the original text. |
| Console errors | None observed. |
| Fix hint | Merge only changed or explicitly cleared answer keys into the latest record and validate the merged answers. |

### BUG-002 · P0 · Cross-tab collector edits overwrite respondent identity

| Field | Value |
| --- | --- |
| Route | `/surveys/sv-renewal/collect/col-renewal-web` |
| Element | Save settings |
| Action | Open the collector in two tabs sharing a session. Save Anonymous in the first tab. Edit only Closed message in the second tab and save. |
| Expected | `/go` shows the new closed message and `settings.anonymous: true`. |
| Actual | The message persists and `settings.anonymous` reverts to `false`. |
| Console errors | None observed. |
| Fix hint | Build the save patch from the fields edited in the form and merge it into current settings. |

### BUG-003 · P0 · Saving an injected choice with a missing label throws

| Field | Value |
| --- | --- |
| Route | `/surveys/audit-survey/design` |
| Element | Save question |
| Action | Inject a multiple-choice question with one option whose `label` is absent and a second labeled option. Open Edit question and save. |
| Expected | Show a choice validation error and keep the diff empty. |
| Actual | The save handler throws. The dialog shows no validation error and `/go` has an empty diff. |
| Console errors | `Cannot read properties of undefined (reading 'trim')` |
| Fix hint | Initialize omitted labels to empty strings and use the existing choice validation. |

---

## Visual Alignment Feedback

Reviewed the original local interface against `DESIGN.md` using nine desktop views and the mobile library capture. The workspace rail, typography, teal action states, result bars, and participant forms were consistent across views.

### VISUAL-001 · P2 · Desktop library spacing differs from the design spec

| Field | Value |
| --- | --- |
| View | `/surveys` |
| Reference | `DESIGN.md` |
| Capture | `.vite/qa-library.png` |
| Issue | Desktop work-area top padding is 30px and the gap between major library sections is 16px. The spec calls for 32px and 24px, respectively. |
| Suggestion | Adjust desktop spacing while retaining the mobile layout and contained table scroll. |

## Round History

### Round 1 → Round 2

- All eight workflow cases passed again, covering all three SEED workflows.
- Reproduced AUDIT-001, AUDIT-002, and AUDIT-003 as BUG-001 through BUG-003. Confirmed AUDIT-004 as VISUAL-001.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `144048`. The local evidence is `factory/build/dyn_certify/144048/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `users → 0 → name`.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Fixed and retested.** Independent rating and comment edits from two tabs both remained in Harbor.
- **AUDIT-002 · Fixed and retested.** Saving a stale closed-message draft preserved the identity setting changed by the other tab.
- **AUDIT-003 · Fixed and retested.** An injected choice with no label displayed validation and sent no write. Survey creation, collector settings and response workflows passed.

Docker dynamic certification run `125084` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
