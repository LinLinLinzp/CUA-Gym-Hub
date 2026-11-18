# Google Merchant Center Mock — Audit Report

> Round 1  
> Date 2026-11-18  
> Audited by the audit agent

## Summary

The build and existing localhost Playwright suite passed. A separate source lifecycle check exposed a release blocker. A source can be reclassified and removed while it still owns active offers, leaving operators unable to remove those offers through the workspace.

| Category | Issues |
| --- | ---: |
| Dead handlers and stubs | 0 |
| Missing state tracking | 1 |
| Data pipeline gaps | 0 |
| Schema mismatches at intake | 1, corrected |
| Workflow display, seed and design | 3 |
| Total open | 4 |

## P0 — Dead/Broken Code

### AUDIT-001 · Reclassifying and removing a source leaves active offers without a removal path · Resolved on 2026-11-18

- **Location** `src/data/feeds.js:33`, `src/data/feeds.js:78`, `src/pages/Feeds.jsx:197`, `src/pages/Products.jsx:169`.
- **Reproduction** Open `feed-001` and run its configured sample. In Edit setup, change Type from Primary to Supplemental and save. Remove the source. The confirmation claims that zero products are affected.
- **Observed** In `/go`, the source has `deletedAt`, while the imported offer `NL-LOCAL-001` is still active with `feedId = "feed-001"`. Product detail directs the operator to the unavailable source for removal and offers no Remove product action. No product removal row is recorded.
- **Fix** Preserve the ownership invariant at setup save. Reject a change to Supplemental while active products still reference the source and explain the restriction on the Type field. Also handle injected or previously saved sources already in this condition by deriving removal targets from actual ownership links. A supplemental update to an offer owned elsewhere must still preserve that offer.
- **Regression check** Run the fixture, attempt conversion, and assert the rejected save generates no state write. Inject a reclassified source with an owned offer and a product owned elsewhere that it only updated. Confirm that removal reports the right count and records the expected product and issue changes in one snapshot.

## P1 — Incomplete Features

### AUDIT-002 · Source setup mislabels prior runs after a method change

- **Location** `src/pages/Feeds.jsx:175`.
- **Reproduction** Run the sample on the scheduled `feed-001`, change its input method to File upload and save. Setup displays the saved URL under **Last filename**. The reverse transition puts a filename under **Last file link**.
- **Fix** Derive the latest input label from the stored run trigger or input. Update history already uses the run trigger.

### AUDIT-003 · Tablet breakpoint stacks the workspace before the design specifies

- **Location** `src/styles.css:193`, `DESIGN.md` spacing and layout.
- **Observed** The CSS stacks the 2:1 grid and reduces frame padding at 1050px. The guide specifies stacking and reduced margins below 960px, so a 1000px viewport loses the side-by-side cards and wider margins.
- **Fix** Apply the workspace grid and frame padding changes at the specified breakpoint. Brand treatment, palette roles, system fonts, desktop shell, panel radius and panel/dialog elevation match the guide.

## P2 — Minor Issues

### AUDIT-004 · Seeded GTIN issue contains a review request its options disallow

- **Location** `src/data/seed.js:79`, `src/data/seed.js:110`.
- **Observed** `iss-019` is a locally fixable `missing_gtin` issue with empty `reviewOptions`, yet it starts under review and links to `rev-019` with reason `fixed`. The seed produces a review history the workflow cannot submit.
- **Fix** Seed the review on a reviewable issue or use an open or resolved state consistent with the local correction path.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `src/utils/dataManager.js` | Pass | SHA-256 matches the shared template. |
| Store boot and writes | Pass | Loads before routes render. Successful user actions save once at the store boundary. The CSV timeout only revokes a download URL. |
| `/post`, `/state`, `/go` | Pass | Uses the shared Vite plugin. Direct checks verified `set`, `set_current`, baseline preservation, diff and reset-to-baseline behavior. |
| Structured action records | Finding | Ordinary product, feed and issue changes produce linked action rows with actors and ISO timestamps. See AUDIT-001 for the source lifecycle gap. |
| Injection, isolation and idle | Pass | Empty arrays, sparse records, 265 products, deep links, reload, two sids and a passive tab passed the existing suite. |
| Offline assets | Pass | CSS artwork and system fonts. Product and feed URLs render as text. Browser capture showed no external HTTP requests. |
| Build | Pass | `npm run build` succeeded. Docker dynamic certification remains with the parent runner. |
| `SCHEMA.md` | Updated | Added the endpoint and reset behavior, verified default IDs, a minimal injection example, and the setup behavior relevant to AUDIT-001. |

## Local Evidence

- Existing Playwright suite passed on `localhost:5470` in sessions `mc-check-1795012759018` and `mc-check-1795012898423`. [TEST.md](TEST.md) records the prior dev and built-bundle runs.
- Source lifecycle and latest-input findings reproduced in session `mc-audit-1795012813978`.
- Direct state API checks passed in session `mc-audit-api-1795012837301`.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Previously fixed, retested.** The revised browser fixture switched a source from Primary to Supplemental, verified its previously owned active offer stayed visible, then retired the source and checked removal and unrelated offers.

Docker dynamic certification run `182740` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
