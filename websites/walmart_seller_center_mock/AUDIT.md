# Walmart Seller Center Mock — Audit Report

> Round 1  
> November 18, 2026  
> Audited by the audit agent

| Category | Issues found | Open |
|---|---:|---:|
| Dead handlers or stubs | 0 | 0 |
| Missing state tracking | 0 | 0 |
| Data pipeline gaps | 0 | 0 |
| Workflow and design gaps | 3 | 0 |
| Schema documentation gaps | 1 | 0 |
| Total | 4 | 0 |

## P0 — Dead or broken code

No findings. Each enabled business action reaches the shared commit function and saves the full state once after validation. The browser suite confirmed the exact changed records for every SEED workflow.

## P1 — Incomplete features

### AUDIT-001 · Refund controls were ambiguous for repeated SKUs

`src/pages/Returns.jsx` labeled refund controls by SKU alone, so users could not distinguish matching SKUs on separate lines. Line IDs such as `constructor` could also inherit a value from the draft quantity or error object. Repeated SKUs now show the return line ID in the review and control labels. Draft quantity and error reads use own properties. The injected regression verified the default quantity and confirmed that the transaction recorded only the selected return and order line IDs, quantity and amount.

### AUDIT-002 · Omitted fulfillment appeared as Walmart fulfillment

`src/pages/Items.jsx` displayed the Walmart inventory location for any injected item without a seller fulfillment value. The detail now shows the empty-value marker when fulfillment is missing. Chromium verified the location display and the absence of a seller inventory action for that fixture.

### AUDIT-003 · Narrow bulk toolbar and undersized icon buttons

`src/styles.css` kept bulk acknowledgment actions in a single row and sized square buttons at 36px against the design's 40px minimum. The bulk toolbar now wraps and square buttons measure 40px. The focused Chromium suite verified that selecting eligible orders at 320px keeps the page within the viewport.

## P2 — Documentation

### AUDIT-004 · Schema lacked endpoint and injection reference

`SCHEMA.md` now lists the base URL, API calls, fixed IDs and a minimal inject example. The field and mutation tables were checked against the seed and the `/go` snapshots. Reset restores the server's original snapshot under the shared Harbor template. A fresh browser context reads the restored state.

## Data Pipeline Status

| Component | Status | Verification |
|---|---|---|
| `src/utils/dataManager.js` | Pass | Byte-identical to the repository template. The browser emitted one baseline `set` per fresh SID. |
| Store state sync | Pass | The main suite observed 15 `set_current` requests, one per accepted confirmation. Bulk acknowledgment used one POST for two structured actions. |
| `/post` and `/state` | Pass | Injection, full-state persistence, restore to initial, and subsequent fresh-browser load all passed on localhost. |
| `/go` | Pass | Kept `initial_state` fixed and reported the seven mutated business arrays in `state_diff`. Reset cleared the diff. |
| Session isolation | Pass | Separate SIDs preserved independent state across navigation and reload. Idle tabs emitted zero additional writes after boot. |
| Injected renders | Pass | Empty, singleton and 240-record worlds rendered across all queues. Missing metadata, deep reloads and unavailable IDs were verified. |
| Build and offline assets | Pass | The production build and both browser suites passed with local assets. The production test served `dist/` files through Playwright request routing and used the live localhost state API. |
| `SCHEMA.md` | Updated | Describes the observable fields and the shared endpoints. |

Parent runner owns Docker dynamic certification. See `TEST.md` for the browser steps and exact state changes.
