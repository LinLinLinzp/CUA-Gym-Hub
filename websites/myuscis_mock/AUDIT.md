# myUSCIS Mock — Audit Report

> Round: 1  
> Date: 2026-11-18  
> Audited by: audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers / stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 1 |
| Schema mismatches | 0 open |
| Workflow validation | 1 |
| Total | 2 |

## P0 — Dead/Broken Code

### AUDIT-001 · A delayed startup write can erase the first user action

- **Location** `src/account.jsx:14`, `src/utils/dataManager.js:57`, and the shared `../../templates/state-api.js:64`.
- **Reproduction** In a fresh Chromium session, hold the browser's initial `POST /post` with `action: set`. Check `IOE9700000033`, let `set_current` finish, and inspect `/go`. The case check appears as record 25 and also lands in `initial_state`. Release the held startup write. `/go` reverts to 24 checks in `current_state`, keeps 25 in `initial_state`, and reports a reversed diff. The UI had already shown the successful lookup. Confirmed on dev and built preview.
- **Fix** Require the startup baseline to be acknowledged before business mutations can post. The shared client currently fires the baseline request without awaiting it. Coordinate the ordering fix with the Harbor template owner so the site can continue using the required unchanged template. Add a regression that delays the first POST and checks that the baseline has 24 checks, current state has 25, and the lookup is present in `state_diff`.

## P1 — Incomplete Features

### AUDIT-002 · An injected draft can submit a reference-only form

- **Location** `src/forms.jsx:207` and `src/forms.jsx:270`.
- **Reproduction** Inject a review-step draft with `formId: "form-i485"` and valid applicant details. Open it from **Your filings**, sign, and submit. The app accepts the filing and `/go` records a submission and linked case for I-485. The same catalog entry appears as **Reference only**. Confirmed on dev and built preview.
- **Fix** Use `canFileOnline === true` for both the review action and the final commit guard. Preserve the injected draft and provide a clear explanation on review. Verify that a reference-only draft can render and that attempted submission leaves all business collections unchanged.

## P2 — Minor Issues

None recorded.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | ⚠️ | Byte-for-byte match with the required template. Its asynchronous baseline can overtake `set_current`. |
| Account provider state sync | ⚠️ | One commit entry point saves whole snapshots for user actions. Routes become interactive before the baseline POST completes. |
| Vite configuration and `/post` | ✅ | Imports the shared API. `set`, `set_current`, and reset behaved as implemented on port 5511. |
| `/state` and `/go` | ✅ | Injection, current and baseline inspection, and top-level diffs passed. |
| Session isolation | ✅ | Different session IDs stayed isolated. Internal links and reloads preserved the active session. |
| `.initial.json` handling | ⚠️ | Normal startup preserved the first `set` snapshot. Reordered startup captured the first mutation as the baseline. Reset restores the stored baseline. |
| Idle and read-only actions | ✅ | An idle tab posted no additional snapshots while another tab mutated state. Filters, reloads, cancellation, and invalid standard actions produced no business writes. |
| Structured records | ✅ | Case checks, tracking, filings, and address changes persisted structured records and linked IDs through `/go`. |
| Injected worlds | ⚠️ | Empty, sparse, and 320-case fixtures rendered. The reference-only draft exposed the filing guard gap. |
| Offline assets and built routes | ✅ | Local CSS artwork, system fonts, and a text wordmark. Built bundle and deep links loaded with localhost-only traffic. Core CSS tokens matched `DESIGN.md`. |
| `SCHEMA.md` accuracy | ✅ | Record shapes, route and API details, fixture IDs, and observable changes were checked against the source and test results. |

## SCHEMA.md Updates

Added API examples, explicit top-level types, default ID ranges, a minimal injected fixture, and the shared reset and diff semantics. Retained the field-level mapping of the three SEED workflows.

## Verification

- `npm run build` passed.
- `node .scratch/acceptance.cjs` passed the case status, forms, and address change workflows plus session isolation, idle behavior, and injected-state rendering.
- `node .scratch/acceptance.cjs --preview` passed the built-bundle smoke check on port 5511.
- `node .scratch/audit.cjs` verified the API lifecycle and reproduced both findings against dev and preview. The scratch runner uses the installed Node Playwright and blocks non-local browser traffic.
- Docker dynamic certification remains with the parent runner. Application source and Harbor templates were left unchanged in this audit.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Fixed and retested.** Chromium held the startup POST and verified action controls waited for acknowledgement. Case lookup, signed submission and address updates passed against the production build.

Docker dynamic certification run `188924` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
