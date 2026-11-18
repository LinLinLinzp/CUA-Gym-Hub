# SurveyMonkey Mock — TODO

> Status: IMPLEMENTED AND VERIFIED  
> Last updated by: dev agent, 2026-11-18  
> Research: [assets/README.md](assets/README.md) · Data model: [assets/data_model.md](assets/data_model.md) · Design: [DESIGN.md](DESIGN.md)

## Status legend

- [ ] Not started
- [~] In progress
- [x] Done

## P0 — Core shell and Harbor runtime

- [x] **P0.1 · Scaffold and shell.** Build the Vite + React SPA on exclusive port **5390**, with strict port selection and a lockfile. Use the SurveyMonkey text wordmark, a compact workspace rail, a main header with the current page and working Create survey action, and the design tokens in DESIGN.md. Keep the built app offline with original local assets. Use accessible native controls, labeled actions, visible focus and keyboard-operable dialogs.
- [x] **P0.2 · Routes.** Provide `/` and `/surveys` for the survey library, `/surveys/:surveyId/design`, `/surveys/:surveyId/collect`, `/surveys/:surveyId/collect/:collectorId`, `/surveys/:surveyId/analyze`, and `/r/:collectorId` for respondent-facing links. Provide a preview entry from Design and an explicit return path. All account views share providers and work on direct navigation and reload. Preserve `sid` in router navigation, and use `withSid()` for links that leave the router. Missing or mismatched IDs show a recovery link. Route navigation writes no state.
- [x] **P0.3 · Harbor state.** Copy `templates/dataManager.js` unchanged to `src/utils/dataManager.js`. Import the unchanged `stateApi` from `../../templates/state-api.js` and register it with `createInitialData` from `src/data/seed.js`. Await `loadState(APP, createInitialData)` before mounting routes. Use one mutation entry point that computes a full next state from the latest committed state and calls `saveState(APP, nextState)` once per successful change. Honor the baseline write, top-level diff and session isolation from the templates. The API serves `/go`, `/state` and `/post` in dev and preview. Injected empty, sparse and large arrays must render. Resolve optional references defensively and use the runtime clock for relative dates. Idle, render, preview, canceled and invalid actions produce no business writes.
- [x] **P0.4 · Seed and verifier docs.** Create the deterministic seed below. Write `SCHEMA.md` from the implementation with every key, field, enum, relationship and the exact property paths added, updated or removed by each action. Keep it synchronized with code. Run `npm run build`. QA uses installed Node Playwright from `PILOT_PLAYWRIGHT` and local Chromium at `http://localhost:5390`. Launch any persistent server with PowerShell `Start-Process -WindowStyle Hidden`, the site working directory and an absolute Vite entry point. Keep runner scratch gitignored or remove it.

## P1 — Surveys

- [x] **P1.1 · Find a survey.** Show counts for all surveys, collecting surveys and responses, computed from the full state. In the library show title, owner, derived status, response total, modified date and row actions. Support case-insensitive title search, status and owner filters, sort by modified date/title/response count, clear filters, and pagination. Keep counts consistent after changes. Search, sorting, filtering and paging write no records.
- [x] **P1.2 · Create, edit and preview.** The Create survey dialog accepts a nonblank title and optional description, creates a draft, and opens Design. Show ordered question cards. Add or edit multiple choice, checkboxes, rating and open text questions with a required toggle and an explicit save. Support reorder and confirmed removal. Require a prompt and two distinct, nonempty choices for choice questions. Preview the respondent form with matching validation and an exit action. **Writes:** create appends `surveys[]`. Saved metadata changes update `surveys[].title/description`. Question saves, moves and removal update `surveys[].questions` in display order. Updates set `updatedAt/updatedBy`. Keep stable question and option IDs, and lock structural changes to answered questions so historical results remain readable. Preview writes no records.
- [x] **P1.3 · Copy and delete.** Offer Make a copy in each survey row menu, prefill a distinct title and open the copy in Design. Confirm deletion with affected collector/response counts. **Writes:** copy appends a survey with a new ID, regenerated question and option IDs, `copiedFromId` and fresh actor/timestamps. Collectors and responses stay attached to the source. Delete removes the survey and its linked collectors and responses in one mutation, and appends `deletions[]` with the removed IDs.

## P1 — Collectors

- [x] **P1.4 · Create and manage collectors.** From Collect responses, show a survey-scoped list with name, type, status, response count and modified date. Create a named Web link or Manual data entry collector once the survey has a question. Show collector detail with rename, settings, close and reopen actions. Support anonymous or identified entry, an optional single-response rule for identified email addresses, and a closed message. Display a copyable same-origin URL for Web link collectors; offer Enter response for Manual data entry. Keep the link stable across rename and status changes. **Writes:** create appends `collectors[]`; rename and settings update `name/settings`; close and reopen set `status` and `closedAt`; updates set `updatedAt/updatedBy`. Opening detail and copying the link write no records.
- [x] **P1.5 · Clear and delete collectors.** Confirm Clear responses with the affected response count. After clearing, the collector stays available in its current status. Enable confirmed deletion once its response count reaches zero. **Writes:** clear removes matching `responses[]` and appends a `deletions[]` entry with the collector and removed response IDs. Delete removes that `collectors[]` record and appends its deletion entry.

## P1 — Responses

- [x] **P1.6 · Submit responses.** Accept answers through a Web link and through the Manual data entry action, using the same field types and required validation as Preview. Require a valid email for identified web submissions and enforce the collector's single-response setting by normalized email within that collector. Show a closed, unavailable or completed screen as appropriate. **Writes:** a valid submit appends one `responses[]` record with survey and collector IDs, answer values, respondent fields allowed by the collector, completion status, actor and timestamps. Prevent duplicate submits from the same completed form. Preview, closed collectors and failed validation write no response.
- [x] **P1.7 · Analyze and inspect responses.** Show a Question summaries view with per-option counts or rating distribution and open-text answers. Show an Individual responses view with respondent, collector, status and date, plus a single-response detail. Support filters by collector and completion, search of available respondent metadata, pagination, and a local CSV download of the filtered rows. Compute summaries from the same filtered response set. **Writes:** CSV export appends `exports[]` with survey ID, filters, exported response IDs and actor/timestamp. Browsing, filtering and inspecting write no records.
- [x] **P1.8 · Edit and delete responses.** From response detail, allow editing answers and confirming deletion. Validate required answers for completed records, preserve existing status and retain the original response's IDs and submission time. Reflect saved changes immediately in summaries and counts. **Writes:** edit updates `responses[].answers/updatedAt/updatedBy`; delete removes only that `responses[]` record and appends its linked `deletions[]` record.

## P2 — Secondary features

No P2 items are scheduled for this handoff.

## Data seed

- [x] Seed 30 surveys, 38 collectors and 64 responses, linked by fixed IDs with realistic English names and fixed UTC dates. Include draft, collecting and closed surveys, one collecting survey with multiple collectors and at least 12 responses, a zero-response collector, anonymous and identified responses, and completed and partial responses.
- [x] Seed the signed-in workspace and four synthetic owners. Include related topics that make partial search meaningful and span surveys across multiple owners and statuses. Initialize `deletions` and `exports` as empty arrays.

## Acceptance evidence

- [x] In TEST.md, exercise each P1 workflow and record the exact fields observed in `GET /go?sid=...`. Cover create → design → collect → submit → analyze end to end, along with copy, clear, close/reopen, edit and delete. Verify CSV content and export metadata.
- [x] Record deep-link reloads, two isolated sessions, a fresh injected empty world, a sparse world with missing optional fields, an injected large list, and no idle writes after boot. Verify production build success. The parent runner handles Docker dynamic certification and commits.

## Out of scope

Authentication, billing, remote survey sending, external integrations, advanced survey logic and production account access.
