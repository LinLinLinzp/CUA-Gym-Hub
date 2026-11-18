# HealthCare.gov Mock — Audit Report

> Round 1  
> Date 2026-11-18  
> Audited by audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers / stubs | 1 |
| Missing state tracking | 0 |
| Data pipeline gaps | 1 |
| Schema mismatches | 0 |
| Design alignment | 1 |
| Total | 3 |

Applications, plan selection and income reporting passed the existing Chromium acceptance suite on localhost port 5514. The production build passed. The focused audit reproduced two edge cases with incomplete injected records. [Workflow evidence](TEST.md)

## P0 — Dead/Broken Code (must fix before testing)

None found in the required workflows.

## P1 — Incomplete Features

### AUDIT-001 · Missing selection pointer produces a dead receipt link

- **File** `src/model.js:24`
- **Reproduction** Inject a submitted application without `selectedPlanSelectionId` and a selection for that application without `id`. Open Overview and click **View plan selection**.
- **Observed** The dashboard treats the selection as current because both IDs are `undefined`. Its link goes to `/selections/undefined` and displays **Plan selection unavailable**. The shared lookup can also match an ID-less eligibility result when the latest-result pointer is omitted.
- **Fix** Require a usable ID in the shared lookup before matching any linked record. Verify that incomplete records leave the no-selection and no-result views available.

### AUDIT-002 · Draft submission misclassifies an injected household member

- **Files** `src/application-form.jsx:192,209`, `src/model.js:39`
- **Reproduction** Inject a review-ready draft with valid contact, market and income fields. Include a household member with a valid name, relationship and birth date, and `requestsCoverage: true`, with `id` omitted. Attest and submit.
- **Observed** Review validation passes, but `/go` shows an `ineligible` result with an empty `eligibleMemberIds` array. Saving the household section assigns missing IDs. Submitting from review skips that step.
- **Fix** Assign missing member IDs in the same user-triggered transaction that submits the draft, or require the household section to be saved before confirmation. Verify that coverage requests correspond to IDs in the submitted application and the eligibility result. Apply the same validation to income updates if members lack usable IDs.

### AUDIT-003 · Primary action padding differs from the site design

- **Files** `src/styles.css:40`, `DESIGN.md` §5
- **Observed** Primary actions use 10 px vertical padding. The design specifies 12 px. The core palette, type stacks, card radius and overview shadow match the design.
- **Fix** Align primary button and button-link padding with the design.

## P2 — Minor Issues

None found.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | Pass | Byte-identical to the template. Loads before routing and supplies the boot baseline. |
| Store state sync | Pass | Five mutation paths use the shared commit function. The acceptance suite observed one baseline and eight action writes. No further writes occurred during idle, browsing, comparison, cancellation or failed validation. |
| Structured workflow records | Gap | Default workflows produced linked, JSON-serializable records. Incomplete injected member IDs can yield an incorrect result in AUDIT-002. |
| `/post`, `/state`, `/go` | Pass | Direct calls verified `set`, `set_current`, `reset`, current state and diff shape. |
| Session isolation and baseline | Pass | Independent SIDs stayed isolated. The first write established the baseline, later writes preserved it, and reset restored current state to it. |
| Injected rendering and deep links | Gap | Empty, sparse and 300-record worlds passed the existing suite. AUDIT-001 reproduced a dead receipt link using an incomplete linked record. |
| Offline assets | Pass | CSS artwork and system fonts. Chromium observed no outbound HTTP(S) requests. |
| `SCHEMA.md` accuracy | Pass | The six seed keys, record shapes and write mapping match the implementation. |

The parent runner owns Docker dynamic certification.

## SCHEMA.md Updates

Added the localhost endpoint reference, verified reset behavior, representative seed IDs and counts, and a minimal injection example. The existing record definitions and observable action mapping remain accurate for the documented shapes.
