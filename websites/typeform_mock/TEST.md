# Typeform Mock — Test Report

> Round: 1  
> Date: 2026-11-18  
> Server: http://localhost:5391  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Route patterns tested, including the fallback | 8 |
| UI mutations checked against `/go` | 34 |
| ✅ Passing check groups | 6 |
| ❌ Failing check groups | 0 |
| ⚠️ Skipped check groups | 0 |

## ✅ Passing Tests

- **Forms** — Opened the home redirect and workspace rail, sorted and filtered forms, cleared an empty search, and followed a response-count link. Created and renamed a form. Added, edited, duplicated, reordered, and deleted questions. Changed question type, entered choices, and checked required and invalid-input errors. Added, edited, reordered, and deleted endings. Published and republished, checked the version after hard reload, copied and opened the local respondent link, closed and reopened collection, duplicated a seeded form with branching references, moved it with its responses, and confirmed cascade deletion. Canceling a dialog produced no write.
- **Logic** — Used the branch diagram to open a rule editor and select a question. Ran both seeded preview paths. The matching choice opened the blocker question and the fallback skipped it. Both reached the ending without changing `/go`. Added an overlapping condition, moved it ahead of the original, and confirmed the first match led directly to the ending. Tested missing answer and destination validation, edited and hard-reloaded the rule, then removed it. Deleting a referenced question also removed its two draft rules while retaining published content and historical submissions.
- **Responses** — Submitted from the published local route and verified one record after two immediate submit clicks. Checked newest-first ordering, answer search, date and choice filters, no-match feedback, summary navigation, selection, and detail. Verified the historical question title after a draft edit. Downloaded filtered, selected, and unfiltered CSV files and compared the ID order and escaped answer text with the download records. Canceled a deletion, then removed a single response and a selected pair. The workspace total reflected the remaining 24 of the original 26 seeded responses.
- **Harbor** — Checked fresh deep links, hard reloads, missing records, empty arrays, sparse optional fields, and a session with 260 forms and 300 responses. A sparse update preserved an unrelated response and an unknown injected key. Verified session isolation and the `/post` reset flow. The large session posted its boot baseline once and produced no further POSTs during reload, navigation, or a 1.8-second idle observation. Confirmed the client state manager matches the repository template and `npm run build` succeeds.
- **Seeded question types** — Used a seeded Yes/No preview to reach the interview email question. Invalid email triggered validation, and a valid address reached the ending. Preview left the Harbor diff empty.
- **Browser diagnostics** — Chromium reported no page errors or console errors. Browser requests stayed on localhost. The app served the text wordmark and original local visuals.

### State observed through `/go`

Each mutation was checked against the immediately preceding `current_state` and the session's `state_diff`. Edit timestamps changed on form updates. The edit actor remained the signed-in account, `user_morgan`, in the seeded sessions.

| SEED workflow | UI action | Observed state fields |
| --- | --- | --- |
| Forms | Create and duplicate | Appended `forms[]` records with ID, title, workspace, draft status, creator and editor IDs and timestamps, questions, endings, logic, version zero, and null publish date and snapshot. Duplicate also recorded `duplicatedFromId` and remapped nested IDs. `activity[]` appended `form_created` or `form_duplicated`. |
| Forms | Rename and move | Changed `forms[].title` or `forms[].workspaceId` and `forms[].updatedAt`. `activity[]` appended `form_renamed` or `form_moved`. Move retained all responses. |
| Forms | Edit structure | Changed `forms[].questions` or `forms[].endings` and `forms[].updatedAt`. `activity[]` appended `questions_updated` or `endings_updated` with the affected entity IDs. |
| Forms | Publish, republish, close, and reopen | Publish changed `forms[].status`, `publishedAt`, `publishedVersion`, `publishedSnapshot`, and `updatedAt`. Republish advanced the version from 1 to 2 and updated the snapshot title, publish time, and edit timestamp. Close and reopen changed status and edit time while preserving the snapshot. `activity[]` recorded `form_published`, `form_closed`, and `form_reopened`. |
| Forms | Delete | Removed the form from `forms[]` and its linked rows from `responses[]`. `activity[]` appended `form_deleted` with the form ID and the removed response IDs. |
| Logic | Add, reorder, edit, and remove branches | Changed the ordered `forms[].logic` array and `forms[].updatedAt`. Verified rule IDs, source question ID, typed comparison value, operator, and destination. `activity[]` appended `logic_updated` with the affected rule ID. Removing a referenced question changed `forms[].questions` and `forms[].logic` together and logged the question and both rule IDs. Branch playback left state unchanged. |
| Responses | Submit | Appended one `responses[]` row with ID, form ID, version, ending ID, respondent actor ID, completed status, ISO timestamp, and typed answers. The tested answer values were a choice ID with its display label, text, and the number `7.5`. |
| Responses | Export | Appended one `responseExports[]` row per download with ID, form ID, the ordered IDs actually present in the CSV, `csv` format, actor ID, and ISO timestamp. No response rows changed. |
| Responses | Delete | Removed only the confirmed IDs from `responses[]`. `activity[]` appended `responses_deleted` with the form ID, removed response IDs, actor ID, and ISO timestamp. |

## ❌ Bugs for Dev Agent

None observed in the final run.

## Visual Alignment Feedback

Reviewed the workspace, builder, logic, preview, and results against the site's [original design](DESIGN.md). At 390 px, the workspace menu opened and closed on navigation, filters stacked, and the response table scrolled within its panel.

## Round History

### Round 1

- Fixed a seed pattern containing literal backspace characters that caused prompts such as “What email should we use to follow up?” to be classified as short text. A fresh Chromium session confirmed the seeded prompt now validates email addresses.
- The parent runner owns Docker dynamic certification.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `153384`. The local evidence is `factory/build/dyn_certify/153384/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `workspaces → 0 → name`.
