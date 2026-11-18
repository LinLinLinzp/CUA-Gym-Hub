# IKEA Mock — Audit Report

> Round: 1  
> Date: 2026-11-18  
> Audited by: audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers / stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 0 |
| Schema mismatches | 0 after update |
| UI completeness and design | 3 |
| Total open | 3 |

## P0 — Dead/Broken Code

None found.

## P1 — Incomplete Features

### AUDIT-001 · Two return choices can have identical labels

- **File** `src/pages/Returns.jsx:91`
- **Reproduction** Open `/returns/new?order=ord-2026-012` with the seed clock set to November 18, 2026. The form exposes two checkboxes named “Inga $24.99 each · 2 returnable.” Their quantity, reason and condition controls also have identical accessible names.
- **Impact** Each choice writes a different `orderLineId`. A customer cannot tell which purchase line a choice will affect. Injected orders with same-name variants can also produce this ambiguity.
- **Fix** Show the variant or article number when it distinguishes a line. When lines still look identical, include a stable line number in the visible label and the accessible field names. Keep the original order-line IDs in the return record.

### AUDIT-002 · Some injected categories resolve to a broken image

- **File** `src/components.jsx:44`
- **Reproduction** Inject a product with `category: "constructor"` and omit `imageKey`. The catalog renders an image with no decoded pixels. Its source is built from an inherited property of the category lookup object. An ordinary unknown category such as `Miscellaneous` displays `/art/fallback.png`.
- **Fix** Check that the category exists as an own key or use a map for the lookup. Verify that unrecognized categories use the local fallback asset.

### AUDIT-003 · Desktop layout and secondary controls deviate from DESIGN.md

- **Files** `src/styles.css:96`, `src/styles.css:184`
- **Issue** The 961–1120 px desktop layout shrinks the account rail from 224 to 194 px and the rail gap from 32 to 22 px. Secondary buttons use blue text where the design specifies ink.
- **Fix** Match the specified desktop rail and secondary text tokens. Verify that content still fits immediately above the 960 px navigation breakpoint.

## P2 — Minor Issues

None found.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | ✅ | File hash matches the Harbor template. Reads SID and initial server state, merges defaults and caches the result. |
| Account store state sync | ✅ | Accepted actions pass through `commit` and send one full-state save each. Invalid and unchanged submissions send no business writes. An idle tab sharing the active SID sent no posts while the other tab wrote and reloaded. |
| `vite.config.js` `/post` | ✅ | Imports the unchanged state API template. Verified `set`, `set_current` and `reset` on localhost port 5314. |
| `vite.config.js` `/state` and `/go` | ✅ | Verified stored state, initial/current state and top-level diff. |
| Session isolation | ✅ | Seeded writes stayed in the seed test SID while empty, sparse and large injected sessions held their own state. SPA links and return order selection preserved `sid`. |
| Baseline and reset | ✅ | Subsequent writes preserved `initial_state`. Reset restored the original injected baseline and cleared the diff, as the Harbor template defines. |
| Offline assets | ⚠️ | No external requests during workflow tests. Local artwork decoded across seeded pages. One injected category breaks the fallback, as documented in AUDIT-002. |
| `SCHEMA.md` | ✅ | All seven top-level keys, record shapes and committed write paths match the reviewed implementation. |

## Local Verification

`npm run build` passed. Chromium ran with the installed Playwright against `http://localhost:5314/` with a fixed seed clock. Local checks covered 320 and 375 px layouts.

| Workflow | Result and observed fields |
| --- | --- |
| Cart | Searched by article number and filtered by category. Created, merged, updated and removed cart lines. Verified `cart.lines[]` and the `add`, `set_quantity` and `remove` entries in `cartEvents[]`, including before/after quantities and amounts. Reload preserved quantity. Invalid and unchanged quantities issued no writes. |
| Delivery checkout with assembly | Rejected invalid ZIP, missing window and missing consent without writes. Confirmation sent one save with `orders[]`, two linked `bookings[]` entries, cleared `cart.lines[]` and the checkout event in `cartEvents[]`. Verified order-line links, amounts, consent and the assembly window after delivery. Reload preserved the confirmation. |
| Existing-order assembly | Filtered purchase history and booked assembly from `ord-2026-036`. Only `bookings[]` changed. The new appointment remained visible after reload. |
| Appointment management | A scheduled dependent assembly blocked delivery cancellation and was directly linked. Rescheduling the assembly updated its `slot` and wrote `slotBefore` and `slotAfter` in `history[]`. Cancelling it updated `status` and wrote the previous status. Delivery cancellation then became available. |
| Returns | A prior partial return blocked an over-return without a write. A valid two-line parcel return appended one `returns[]` request with item quantities, actor, status, fee and net refund. The purchase stayed intact. Reload preserved return details and history, and the return form reflected the reduced quantity. |
| Injected routes | Empty, single sparse and 250-record collections rendered on direct navigation and reload. Missing records used recovery states. No `set_current` was emitted on the render-only checks. |

## SCHEMA.md Updates

Added the endpoint and reset behavior, default ID ranges and fixtures, a minimal injection example, and guidance on reading action diffs after a partial injection. Retained the full record shapes and action-to-field table.
