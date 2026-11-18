# Typeform — implementation plan

> **READY FOR DEV**  
> Updated November 18, 2026 by the plan agent.  
> [Design](DESIGN.md) · [Research](assets/README.md) · [Data model](assets/data_model.md)

- [ ] Pending
- [~] In progress
- [x] Done

## P0 — Shell and Harbor runtime

- [x] Scaffold a Vite React app in place. Use port 5391 with strict port binding. Include build and dev scripts and a lockfile. Render an already signed-in account with the Typeform name in text, a workspace rail, main content, and form navigation. Use the dimensions and tokens in [DESIGN.md](DESIGN.md). Keep runtime resources local.
- [x] Support `/`, `/workspaces/:workspaceId`, `/forms/:formId/build`, `/forms/:formId/logic`, `/forms/:formId/responses`, `/forms/:formId/preview`, and `/to/:formId`. Keep `?sid=` on navigation and use `withSid()` for links outside SPA routing. Provide a return link on missing records and empty workspaces.
- [x] Import `stateApi(createInitialData)` from the unchanged repository template in Vite. Copy the unchanged client template to `src/utils/dataManager.js`. Await `loadState` before rendering routes and route successful mutations through one whole-state `saveState` call. The middleware owns `/go`, `/state`, and `/post`. Keep navigation, input drafts, and preview progress transient. Preserve unrelated and unknown injected records or keys on writes. Handle empty, sparse, and large injected collections without boot-time repairs.
- [x] Document the implemented schema in `SCHEMA.md`, including an **Observable State Changes** table with exact written fields. During QA, verify the workflows below through localhost on port 5391 using Chromium from the installed Playwright package at `PILOT_PLAYWRIGHT`. Use the absolute Vite entry point and hidden window for a persistent PowerShell server. Document actual tests and `/go` evidence in `TEST.md` for the parent runner.

## P1 — Forms

- [x] List forms by workspace with title, status, last edited date, response count, and row actions. Search title, filter status, and sort by title or last edit. Open a form by title or its response count. These controls read `workspaces`, `forms`, and `responses` and write no records.
- [x] Create a named blank form in the selected workspace and open its builder. Provide Rename, Duplicate, Move, and Delete via the row menu. Create and duplicate append a new draft to `forms`. Duplicate remaps nested question, choice, ending, and logic references and starts with zero responses. Rename writes `forms[].title`. Move writes `forms[].workspaceId` and keeps linked responses. Confirmed deletion removes the form and its linked responses in one save. Stamp successful actions as specified in the [data model](assets/data_model.md#business-actions).
- [x] In Build, provide question list, editor, and preview. Add, edit, duplicate, reorder, and remove short text, long text, email, number, single-select multiple choice, and yes/no questions. Support required validation, choice editing, and custom endings. A committed edit writes `forms[].questions` or `forms[].endings` and edit metadata. Use stable IDs and confirm edits that remove branch references. Clean up affected `forms[].logic` in the same save and preserve historical answers.
- [x] Publish a valid form, show when unpublished edits are pending, and offer a local respondent link. Publish updates `forms[].status`, `publishedAt`, `publishedVersion`, `publishedSnapshot`, and edit metadata. Close or reopen accepting responses through the builder, writing status and edit metadata while retaining the snapshot. Preview uses the draft. The respondent route uses the published version and handles draft, closed, or deleted forms.

## P1 — Logic

- [x] List branch rules by source question. Add, edit, delete, and reorder rules. Support a matching answer and an optional fallback per source, with a subsequent question or ending as destination. Show a plain-language summary of each path. Saving writes the ordered `forms[].logic` array and edit metadata. Omitted fallback advances in question order. First match wins. Validate missing references, operand types, and backward/self targets.
- [x] Exercise both branches in preview using a seeded form, then edit, save, and reload the rule to confirm persistence. Preview evaluates the same rules as the respondent route. Preview runs write no records.

## P1 — Responses

- [x] Collect a valid response from the local published link. Render one question at a time and validate required and typed answers. Skip according to the published logic and submit at an ending. One successful Submit appends one `responses[]` row with form and version references, typed answers, ending, actor, and ISO timestamp. Block repeat submit for the completed attempt.
- [x] List submissions per form with newest first, searchable answer text, date range and choice filters, row selection, and a response detail panel. Render historical labels after question edits. Confirm single or selected response deletion. Confirmed deletion removes exactly those `responses[]` rows and logs their IDs. Derived totals update on the list and in the workspace.
- [x] Export selected matching rows, all matching rows when selection is empty, or all rows when no filters apply. Download a local CSV and write one `responseExports[]` record with the actual exported response IDs, form ID, format, actor, and timestamp. Give an empty state when there are no matching rows.

## P2 — Optional depth

- [x] Add a branch diagram backed by the saved rule order, with the existing editor reachable from a node.
- [x] Add a response summary with computed per-choice distributions and a link back to filtered responses.

## Data seed

- [x] Implement `src/data/seed.js` with the counts and fixed fixtures in the [data model](assets/data_model.md#seed). Include draft, published, and closed forms, real-looking English prompts and answers, empty workspaces and empty response sets, and multiple forms with matching and fallback paths.

## Acceptance for the dev and QA phases

- [x] Demonstrate form create, edit, duplicate or move, publish, and reload. Inspect form IDs, question IDs, workspace link, status, snapshot, and action metadata in `/go`.
- [x] Demonstrate logic add, reorder or edit, both preview paths, and rule removal. Inspect ordered rules and confirm preview leaves responses unchanged.
- [x] Submit a published form, inspect it in Results, filter and export it, then delete a response. Verify the response row, export contents, recorded IDs, and deletion in `/go`.
- [x] Check isolated sids, injected empty/sparse/large worlds, fresh deep links, hard reload, idle traffic after baseline, and `npm run build`. The parent runner handles Docker dynamic certification and commits.
