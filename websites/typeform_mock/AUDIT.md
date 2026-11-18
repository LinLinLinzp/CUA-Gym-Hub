# Typeform Mock Audit Report

> Round 1  
> November 18, 2026  
> Audited by the audit agent

## Summary

| Category | Issues |
| --- | --- |
| Dead handlers or stubs | 0 |
| Missing or incorrect state tracking | 1 |
| Data pipeline gaps | 0 |
| Incomplete features | 1 |
| Schema mismatches | 0 |
| Total | 2 |

## P0 — State loss

### AUDIT-001 · Confirming a draft edit can erase a newer edit · Resolved on 2026-11-18

- **File** `src/pages/Build.jsx:85`, especially the confirmation callback at line 98.
- **Issue** The callback captures a replacement questions or endings array when the dialog opens. The store receives other tabs’ writes, but the callback still replaces the latest collection with the captured array and filters branch rules by captured object identity. The success message and activity identify the requested edit while omitting the unrelated lost edit.
- **Reproduction** Open `form_onboarding` in Build in two tabs with the same sid. Open the confirmation to delete its first question in tab A. Add a question in tab B and wait for it to appear in tab A’s question list behind the dialog. Confirm deletion in tab A. In audit sid `tf-audit-draft-mwlyqdbq`, `/go` showed four questions after the add and two after the delete. The new question was missing even though its `questions_updated` record remained. A targeted delete would have left three questions.
- **Fix** Apply the requested operation by stable ID to the latest draft inside `editForm`. Recompute affected rules against that draft and resolve rules by ID. If a concurrent change invalidates the operation or changes what the dialog says will be removed, ask the author to review the updated confirmation before writing.

## P1 — Incomplete response filtering

### AUDIT-002 · Historical Yes/No answers disappear from the Choice filter and summary

- **File** `src/pages/Responses.jsx:7`.
- **Issue** An existing column gets its choices from the latest question definition. The historical answer pass adds missing multiple-choice options to that column but skips historical boolean values. Once the same question ID is republished as text, prior Yes/No responses remain in the table and drawer but can no longer be reached through the Choice filter or Summary.
- **Reproduction** In audit sid `tf-audit-historic-mwlyqdbq`, open Results for the injected version 2 form. It has a current short-text question and a version 1 response with `type: "yes_no"` and `value: true` for the same question ID. The detail drawer displays the historical prompt and answer. Choice offers only “All choices” and Summary shows an empty distribution.
- **Fix** Build filter options from both current definitions and historical typed answers. Preserve booleans through filter values, keep option keys distinct from string choice IDs, and cover both filter selection and Summary drill-down after republishing.

## P2 — Minor issues

None found.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| Client data manager | Pass | SHA-256 matched the repository template. |
| Store and mutation observability | Finding | Verified normal writes and cross-tab notification. AUDIT-001 covers the stale Build confirmation. |
| `/post`, `/state`, and `/go` | Pass | Verified first `set`, `set_current`, a second `set`, and reset to the saved baseline using the Harbor template’s actual semantics. |
| Session isolation and route rendering | Pass | Fresh deep links, hard reloads, empty and sparse injected worlds, and a world with 350 forms and 600 responses passed. |
| Structured state | Pass | Verified relationships, typed answers, ordered logic, publish snapshots, export row IDs, deleted IDs, actors, and timestamps in `/go`. |
| Idle state writes | Pass | Zero idle posts. The CSV cleanup timer only revokes a browser object URL. |
| Offline resources and design | Pass | No non-local HTTP requests in Chromium. The UI uses the Typeform wordmark as text, a system font stack, original CSS artwork and local icon components. CSS spot checks matched the specified palette, rail and header dimensions, and dialog and drawer styling. |
| Production build | Pass | `npm run build` succeeded. Docker certification remains with the parent runner. |

## SCHEMA.md Updates

Added the localhost API and reset details, fixed fixture IDs, and a minimal injected world. Verified the recorded shapes and action-to-field mappings against the seed, store, and workflow results.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Fixed and retested.** A confirmation opened before the other tab edited the draft was rejected, preserving the other edit. Builder, branching and response workflows passed.

Docker dynamic certification run `125084` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
