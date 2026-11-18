# Ticketmaster Mock — Audit Report

> Round 1  
> November 18, 2026  
> Audited by the audit agent

## Summary

| Category | Issues |
| --- | --- |
| Dead handlers / stubs | 1 |
| Missing state tracking | 0 |
| Data pipeline gaps | 2 |
| Design alignment | 1 |
| Schema mismatches | 0 after documentation update |
| Total open | 4 |

## P0 — Dead/Broken Code (must fix before testing)

### AUDIT-001 · A stale browser context erases a confirmed action on the same SID

- **Files** `src/store.jsx:28–44`, `src/utils/dataManager.js:63–73`.
- Open `ord-001` and `ord-002` under the same fresh SID in two independent Chromium contexts. Let both baseline writes finish. Save `ord-001` in the first context and verify its `saved` row through `/go`. Remove `ord-002` from saved in the second context. Both writes return HTTP 200. `/go` then shows `ord-002` removed and the new `ord-001` row absent.
- Confirmation applies the action to the origin-local cached snapshot and posts the whole world. Storage events cover contexts with shared local storage. Separate contexts can still hold older copies of the same server session.
- Revalidate confirmed actions against the current server snapshot and preserve unrelated records. Keep writes centralized, leave both shared templates unchanged and perform reconciliation only in response to user actions. Add a two-context regression with sequential confirmations on one SID and verify both changes through `/go`.

## P1 — Incomplete Features

### AUDIT-002 · Refunds can be submitted without a resolvable original payment method

- **Files** `src/data/model.js:30`, `src/OrderAction.jsx:19–44`, `src/data/actions.js:87–94`.
- Inject `{"paymentMethods":[]}` on a fresh SID, open `ord-003`, select a reason and review. The review shows “Payment details unavailable.” Confirming still appends a `requested` refund that points to the absent `pay-001`, and it changes the order and all four seats to `refund_requested`.
- Check the linked payment record in the shared refund eligibility function so the page and final confirmation agree. Preserve historical refund rendering when payment details are unavailable. Verify a dangling reference shows an unavailable explanation and produces zero business writes.

### AUDIT-003 · A partial listing offers a price edit the user cannot complete

- **Files** `src/Activity.jsx:93–111`, `src/Activity.jsx:129–151`, `src/data/model.js:71–77`.
- Inject an owned active listing with an id and price and omit `quantity`. My Listings displays “Edit price.” Enter `25.00` and click Review. The dialog reports that the USD price is invalid because the quantity cannot produce a total.
- Gate the edit action on a valid positive integer quantity or display an explanation about the missing quantity. Keep the listing readable and preserve removal eligibility. Verify a valid price can be reviewed when the required listing data is present.

### AUDIT-004 · Activity action buttons fall short of the 44 px design target

- **Files** `DESIGN.md`, `src/Activity.jsx:108–111`, `src/styles.css:148`.
- Playwright measured the “Edit price” button at 32 px. The same `.text-link` styling applies to Cancel transfer, Accept transfer and Remove listing. The design specifies a 44 px minimum height for buttons.
- Apply the minimum to activity buttons and verify the row still fits narrow layouts.

## P2 — Minor Issues

None found.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | Pass | SHA-256 matches the shared template. |
| Store state sync | Gap | One structured snapshot per normal confirmation and no idle writes in the tested routes. Same-SID independent browser contexts can lose a confirmed change. |
| `vite.config.js` `/post` and `/state` | Pass | Uses the shared Harbor plugin. Local injection and browser load both worked. |
| `/go` | Pass | Confirmed all normal action snapshots and the `initial_state`, `current_state`, `state_diff` response. |
| SID isolation and navigation | Pass | Fresh SIDs stayed isolated. The query parameter survived navigation and deep reloads. |
| Initial snapshot and reset | Pass | A `set_current` preserved the initial snapshot. Shared Harbor `reset` restored that baseline and cleared the diff. |
| SCHEMA.md accuracy | Pass | Reconciled the record shapes and action table with the seed, reducer and shared API. |

## Verification

- `npm run build` and the existing Chromium Playwright suite passed on `127.0.0.1:5337`. Verified order save, removal and reactivation; transfer send, cancel and accept; listing creation, editing and removal; and itemized refund requests. Each normal confirmation posted its structured state and appeared in `/go`.
- The browser suite covered empty and partial injected worlds, 424 orders, all account routes on reload, foreign seat holds, same-context duplicate refund rejection, no idle or read-only writes, and zero off-origin requests or uncaught page errors. Additional localhost probes reproduced the four findings above.
- The site uses CSS event artwork, the system font stack and the Ticketmaster name as text. `package-lock.json` is present. The parent runner owns Docker dynamic certification.

## SCHEMA.md Updates

Added localhost API examples, verified reset behavior, record types, default identifiers and an empty-world injection example. Retained the observable action table and clarified that pending incoming transfers hold seats on the received order.
