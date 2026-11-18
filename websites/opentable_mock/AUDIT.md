# OpenTable Mock — Audit Report

> Round: 1  
> Date: 2026-11-18  
> Audited by: audit agent

## Summary

| Category | Found | Resolved | Open |
| --- | ---: | ---: | ---: |
| Dead handlers / stubs | 1 | 1 | 0 |
| Missing state tracking | 0 | 0 | 0 |
| Data pipeline gaps | 0 | 0 | 0 |
| Schema mismatches | 1 | 1 | 0 |
| Workflow and accessibility gaps | 3 | 3 | 0 |
| Total | 5 | 5 | 0 |

The account UI uses text branding, a plum and ivory dining-journal layout, and eight original local WebP images. The design tokens, navigation, layouts and controls align with `DESIGN.md`. The runtime loads local assets and uses same-origin state endpoints.

## P0 — Dead/Broken Code

### AUDIT-001 · Edit action depended on a missing restaurant (resolved)

- **File** `src/Reservations.jsx`
- A future confirmed reservation with an unresolved restaurant showed Modify reservation, but the form could never offer a valid slot or save.
- The detail omits Modify when restaurant availability is missing. Cancellation and calendar export remain available for a valid future booking. Verified the action state on an injected reservation.

## P1 — Incomplete Features

### AUDIT-002 · Review eligibility omitted the visit time (resolved)

- **File** `src/data/model.js`
- An injected future reservation marked `completed` could be reviewed from either entry point. A record without the IDs needed to link a review could also appear eligible.
- The shared eligibility check now rejects future visit times and requires reservation and restaurant IDs. Sparse completed records with both IDs and an unknown date still render and remain eligible. Verified the review list and direct detail against injected records.

### AUDIT-003 · Discovery capped the party selector at ten (resolved)

- **Files** `src/Discover.jsx`, `src/BookingForm.jsx`
- The booking form supported valid injected slots for larger parties, but discovery could not select them through its default party control.
- Discovery and the booking form now derive party capacity from the supplied slots, within the existing 20-guest limit. Verified discovery, time selection and transfer of a 12-guest party to the booking form.

## P2 — Minor Issues

### AUDIT-004 · Featured date was hidden from assistive technology (resolved)

- **Files** `src/Reservations.jsx`, `src/styles.css`
- The date tile was decorative and its date had no accessible equivalent in the featured reservation.
- The full date is now present in the accessible text. Verified using Chromium’s accessibility snapshot.

### AUDIT-005 · Verifier schema omitted setup and seed references (resolved)

- **File** `SCHEMA.md`
- The schema now includes the local endpoint examples, every top-level key and type, default IDs and a minimal injection example. The action table lists each mutation’s observable fields.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | Pass | Byte-identical to the Harbor template. |
| Store state sync | Pass | One boot load and one whole-state save per successful action. Feedback expiry and calendar URL cleanup are transient UI operations. |
| Vite `/post` and `/state` | Pass | Template middleware accepted injected records and reported the saved whole state. Verified `set`, `set_current` and reset on an isolated session. |
| Vite `/go` | Pass | Initial state stayed fixed. The final diff contained reservations, reservation events, reviews, redemptions and transactions. |
| Session isolation | Pass | Workflow and injection sessions stayed independent. SPA navigation retained `sid`. |
| Initial snapshots | Pass | `set_current` preserved the baseline and reset restored it, as implemented by the Harbor template. |
| Idle tabs | Pass | The workflow and idle tabs produced one baseline `set` total. All five `set_current` requests corresponded to successful actions. |
| Injected state and offline assets | Pass | Empty routes and reloads, sparse records, a 300-record list and a disallowed remote image rendered without runtime errors or external requests. |
| Verifier schema | Pass | Describes all eight top-level keys and the five business mutations. |

## SCHEMA.md Updates

Added endpoint commands, record types, default IDs, a minimal injection world and the required observable changes heading. Existing record shapes and mutation fields matched the implementation.

## Verification

`npm run build` passed. Installed Node Playwright Chromium passed the audit regression suite on localhost port 5318. See `TEST.md` for workflow evidence and the session ID. The parent runner handles Docker dynamic certification.
