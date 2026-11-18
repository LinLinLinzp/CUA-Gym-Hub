# SurveyMonkey Mock — Audit Report

> Round: 1  
> Date: 2026-11-18  
> Audited by: audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers / stubs | 1 |
| Missing state tracking | 0 |
| Data pipeline gaps | 2 |
| Schema mismatches | 0 |
| Design alignment | 1 |
| Total | 4 |

The build and the existing localhost Playwright suites passed. Those suites exercised all three SEED workflows, 25 observable business writes, idle behavior, deep links, clipboard and CSV actions, empty and sparse sessions, and a 320-survey injection. The compiled build suite also passed with local assets. The issues below come from additional source review and targeted browser probes against `http://localhost:5390`.

## P0 — Dead/Broken Code (must fix before testing)

### AUDIT-001 · Saving one answer can undo a different answer in another tab

- **File** `src/analysis.jsx:176–201`
- **Reproduction** Open Edit response for `rsp-onboarding-001` in two tabs sharing a browser session. Change the open-text answer in the first tab and save. Verify the new text in `/go`. Change only the rating to 5 in the second tab and save. The rating persists and `/go` shows the original text again.
- **Cause** The editor starts with a full answer snapshot. Save overlays all draft answers onto the current record and removes unanswered draft keys, including keys the user never touched. Workspace storage synchronization delivers the latest record to the tab, but it does not rebase the draft.
- **Fix** Apply only edited answer keys to the current record, including explicit clears. Validate the merged answers against the current survey and response status. Add a regression check that both independent edits survive in `/go`.

### AUDIT-002 · Saving a closed message can silently reverse the collector’s identity setting

- **File** `src/collectors.jsx:95–116`
- **Reproduction** Open `col-renewal-web` in two tabs sharing a session. In the first tab switch from Identified to Anonymous and save. Verify `settings.anonymous: true` in `/go`. In the second tab edit only Closed message and save. The message persists and `settings.anonymous` returns to `false`.
- **Cause** The settings form derives its draft from the initial collector and writes every field from that draft over the current collector. Its dirty check also compares untouched stale fields against the newly delivered collector settings.
- **Fix** Keep the latest values for untouched fields and merge only the settings changed in this form. Verify in `/go` that the new closed message and the other tab's anonymity change both survive.

### AUDIT-003 · Saving a sparse injected choice throws before validation

- **File** `src/surveys.jsx:218–237`
- **Reproduction** Inject a survey with one multiple-choice question, one option `{ "id": "missing-label" }`, a second labeled option, and no responses. Open Design, click Edit question, then Save question. Chromium reports `Cannot read properties of undefined (reading 'trim')`, the dialog shows no validation feedback, and `/go` has an empty diff.
- **Cause** The question card supports a missing label at render time. The editor carries that missing value into its form and calls `.trim()` directly on save.
- **Fix** Initialize missing labels as empty strings so the fields stay controlled and existing choice validation handles the blank value. Verify that the invalid save produces a field error and zero writes, then supply a label and verify a successful save with the same option ID.

## P1 — Incomplete Features

### AUDIT-004 · Desktop work-area spacing diverges from DESIGN.md

- **Files** `src/styles.css:69`, `src/workflows.css:18`
- **Issue** DESIGN.md specifies 32px work-area padding and 24px between major sections. Desktop `.content` starts at 30px and the library's heading, filters and table use the shared 16px grid gap.
- **Fix** Match the desktop top inset and major library gaps to the documented spacing. Preserve the mobile wrapping and scroll behavior.

## P2 — Minor Issues

None identified.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | ✅ | Hash matches `templates/dataManager.js`. Boot awaits `loadState`, with a neutral loading view. |
| Workspace state sync | ⚠️ | One `saveState` call per successful change. Same-session tabs receive additions, but the response and settings editors can overwrite unrelated changes from another tab. See AUDIT-001 and AUDIT-002. |
| Vite `/post` and `/state` | ✅ | Uses the repository template. Injection, baseline `set`, `set_current`, reset and readback verified. |
| Vite `/go` | ✅ | Verified structured entity records, actor and timestamp fields, linked IDs, changes under `state_diff`, and stable seeded records in `initial_state`. |
| Session isolation (`sid`) | ✅ | Browser deep links, reloads and participant links retain `sid`. Writes and reset in one session left the separately injected session intact. |
| `.initial.json` handling | ✅ | The first baseline survives later mutations. Reset restores that baseline and clears the diff, matching the Harbor template. |
| Timer-driven state writes | ✅ | The browser observed no idle mutation after boot. The CSV timeout only revokes an in-memory download URL. |
| Injected worlds | ⚠️ | Empty, sparse and large lists render. Saving an injected option with a missing label fails as described in AUDIT-003. |
| Offline and built output | ✅ | Build and compiled browser suite passed. The shell uses a text wordmark, system fonts, local favicon and authored icons and CSS art. Browser tests observed zero external HTTP requests. |
| `SCHEMA.md` accuracy | ✅ | Every state key and business-write path is documented. |

## SCHEMA.md Updates

Added the localhost API contract, reset and cache behavior, fixed-ID patterns, and a minimal injected world. Clarified the scope of the identified single-response setting and CSV filter values. The existing action-to-state mappings remain accurate for successful saves.
