# The Home Depot Mock — Audit Report

> Round 1 · November 18, 2026  
> Audited by audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers or stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 1 |
| Incomplete workflow behavior | 2 |
| Remaining schema mismatches | 0 |
| Total | 3 |

The production build and the existing localhost Chromium acceptance suite passed. All four required workflows produced structured records in `/go`. The main run recorded one boot baseline and 11 user writes. Idle, invalid and dismissed actions generated zero writes. Direct routes, reloads, separate SIDs, empty collections, sparse records and a 300-order injection passed. The browser made zero external requests. The desktop and mobile overview rendered the text brand and local CSS artwork.

## P0 — Dead or broken code

### AUDIT-001 · A stale browser context silently replaces an already saved return

- **Location** [src/main.jsx](src/main.jsx#L36), [src/pages/Returns.jsx](src/pages/Returns.jsx#L102)
- Open the same return and SID in two Playwright browser contexts with separate localStorage. Review the last eligible unit in both. Submit in the first context and record its ID from `/go`. Submit the stale review in the second context.
- Both POSTs returned 200. The second confirmation produced a new return ID and replaced the first request in `/go.current_state.returns`. Confirmation validates against the browser-local snapshot, and the whole-state write replaces the saved state.
- Reconcile the latest persisted SID state at user confirmation before validation and saving. Keep the shared templates intact and keep idle views read-only. Add a regression that confirms the stale request is rejected and the original return ID remains observable.

## P1 — Incomplete features

### AUDIT-002 · Editing a stale return can leave a hidden selection that blocks progress

- **Location** [src/pages/Returns.jsx](src/pages/Returns.jsx#L61), [draft validation](src/pages/Returns.jsx#L75), [Edit return](src/pages/Returns.jsx#L172)
- In two tabs in one browser context, review the same one-unit line on an order with a second eligible line. Submit in the first tab. The second tab correctly rejects its stale confirmation. Click **Edit return**, select the remaining line and click **Review return**.
- The exhausted line is absent from the form, but its selection remains in the draft. Validation rejects the hidden line again. Reloading clears the draft.
- When returning to editing, remove selections for lines that are no longer eligible and keep the drafts for remaining lines. Verify that the second tab can review and submit the remaining item without reloading.

### AUDIT-003 · Order search misses the name and SKU shown on sparse receipts

- **Location** [src/pages/Orders.jsx](src/pages/Orders.jsx#L22), [receipt lookup](src/pages/Orders.jsx#L90)
- Inject an order line with a `productId` and omit its `name` and `sku`. Provide both values on the linked product. The receipt displays the linked product name and SKU. Searching Orders by either displayed value returns no results.
- Use the same linked-product fallback in order search that the receipt uses. Verify searches by both fields on an injected sparse order.

## P2 — Minor issues

None identified.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| Shared data manager | Pass | Byte-for-byte match with the repository template. |
| Central state sync | P0 | Stores and posts whole state on successful action. Stale confirmations in independent contexts can replace saved records. |
| `/post` and `/state` | Pass | The required shared plugin is configured for dev and preview. Verified injection and current state reads through browser boot. |
| `/go` | Pass | Verified initial snapshot, current state, diff and exact records written by the four workflows. |
| SID isolation and navigation | Pass | Separate SIDs stayed isolated. Internal workflow navigation preserved the SID. |
| Initial snapshot and reset | Pass | With an existing baseline, `set_current` changed only current state and `reset` restored the saved baseline, as implemented by the required shared template. |
| Timer-driven state writes and offline assets | Pass | No timer-driven writers in the app. The browser suite observed no idle POSTs and no external traffic. |
| Schema | Pass | Eight top-level keys and nine mutation paths are documented. |

## SCHEMA.md Updates

Added endpoint and reset behavior, typed top-level keys, default identifiers and a minimal injection example. Verified the mutation table against the action handlers and the acceptance suite.
