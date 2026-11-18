# PandaDoc Mock — Audit Report

> Round 1  
> 2026-11-18  
> Audited by the audit agent

## Summary

| Category | Open issues |
| --- | ---: |
| Dead or misleading controls | 1 |
| Missing state tracking | 1 |
| Data pipeline gaps | 2 |
| Pricing preview discrepancies | 1 |
| Schema documentation gaps | 0 |
| **Total** | **5** |

The built app passed the standard proposal, pricing, and sequential-signing suite. Targeted checks found two P0 blockers and three P1 defects.

## P0 — Dead or Broken Code

### AUDIT-001 · A delayed baseline erases a confirmed proposal

- **Files** `src/store.jsx:20`, `src/store.jsx:58`, `src/utils/dataManager.js:40`
- **Repro** Open one browser context on a new sid. Open that sid in a second context with its startup `set` request held after the UI renders. Create a proposal in the first context and wait for the editor to open. Release the held request.
- **Observed** `/go` showed 37 documents after creation and 36 after the second baseline reached the server. Both the new document and its activity event disappeared, and `state_diff` returned to empty. The initial snapshot was preserved. The provider's commit lock covers user mutations. The shared helper posts a snapshot asynchronously on the first load in each browser storage profile, and the API accepts it as current state.
- **Fix** Coordinate the site's baseline initialization with writes for the same sid. Ensure an older boot snapshot cannot replace an acknowledged mutation, including across browser storage profiles. Preserve the shared helper and state API templates as required by the seed. Keep the delayed-baseline case as a regression check.

### AUDIT-002 · Finish drops a previously saved signature from its completion

- **Files** `src/sign.jsx:104`, `src/model.js:191`, `src/model.js:220`
- **Repro** Inject a sent proposal with a pending signer and a saved typed signature for the signer's required field, with the historical completion link absent. Open the signer link and select Finish. Enter a signature and select Finish again.
- **Observed** The panel showed zero required fields remaining, but Finish rejected the saved value. Re-entering it produced a successful submission and a new `signingCompletions[]` record with empty `signatureIds`. The existing `signatures[]` row remained unlinked. The validation recognizes only new entries, while insertion excludes already-signed field IDs.
- **Fix** Use the same saved-field eligibility in the UI and transaction. Reuse and link the saved signature ID in the new completion when its completion link is absent. Revalidate any existing completion link and preserve one signature per document, recipient and field.

## P1 — Incomplete Features

### AUDIT-003 · Pricing preview and saved total diverge at rounding boundaries

- **Files** `src/pricing-ui.jsx:98`, `src/pricing.js:41`
- **Observed** A custom item at unit price `1.005` and quantity `2` previews `2.01`. Save accepts the input, rounds the unit price to `1.01`, and persists a line and table total of `2.02`. The form uses `noValidate`, so the unit input's `0.01` step does not reject the precision.
- **Fix** Calculate the preview from the same normalized units used during Save, or enforce the supported precision with explicit validation.

### AUDIT-004 · Pricing can persist a null document amount

- **Files** `src/pricing.js:21`, `src/model.js:40`, `src/model.js:134`
- **Observed** A table with one item priced at `9e305` and quantity `1` passes table validation. Summing two such tables yields `Infinity` after cents rounding. JSON serialization converts that document value to `null`. Table save, creation from a template and duplication apply the aggregate without checking it.
- **Fix** Validate the calculated document amount before writing the transaction. Reject invalid totals with a pricing error and keep persisted records intact.

### AUDIT-005 · Moving a signer earlier can leave their signing position unchanged

- **Files** `src/editor.jsx:68`, `src/editor.jsx:110`, `src/model.js:104`
- **Repro** Place the recipients in the order signer A, CC, signer B. Enable signing order. Select Move earlier on signer B and save recipients.
- **Observed** The row moves across the CC, and `recipients.updated` is written. The persisted signer positions remain A at 1 and B at 2. The first signer can also receive a Move earlier control if a CC precedes them.
- **Fix** Use the previous signer as the move target and show the control only when another signer precedes the selected signer.

## P2 — Minor Issues

None.

## Data Pipeline Status

| Component | Status | Evidence |
| --- | --- | --- |
| Shared `dataManager.js` | Pass | SHA-256 matches the shared template. Standard suite observed one startup baseline and no reload or idle writes in the same profile. |
| Workspace state sync | Fail | User mutations use one confirmed commit path. A delayed baseline in another profile can still overwrite a confirmed commit. |
| `POST /post` and `GET /state` | Pass | Shared API wired through Vite in dev and preview. Exercised injection, current-state write, reset and stored-state reads. |
| `GET /go` | Pass | Returns `initial_state`, `current_state` and `state_diff`. Proposal, pricing, delivery and signing writes are observable. |
| Session isolation | Pass | The workflow suite exercised different sids in one browser context and followed sid-preserving links. |
| Initial snapshot | Pass | `set_current` preserves the initial snapshot. Reset restores it and clears its diff, per the shared middleware. |
| Timer-driven writes | Pass | The only timer in site source delays acknowledgment reads after a user commits. No idle current-state POST was observed. |
| Injected worlds | Pass for rendering | Empty and sparse records, deep links, reloads and 425-record registers rendered. The preexisting-signature mutation defect is AUDIT-002. |
| Offline assets and design | Pass | Built Chromium requests stayed on localhost. The text wordmark, CSS template motifs, system typography, palette, paper and modal shadows match the local design direction. |
| Schema documentation | Updated | Documents default IDs, a single-record injection payload, observed API behavior and exact action write paths. |

## SCHEMA.md Updates

Added fixed fixture IDs, a minimal injection example, API endpoint details, and the scope of browser-profile baseline and commit behavior. Retained the document record shapes and verifier mapping. See [SCHEMA.md](SCHEMA.md) and [TEST.md](TEST.md).
