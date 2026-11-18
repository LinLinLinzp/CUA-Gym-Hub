# npm Mock — Audit Report

> Round: 1
> Date: 2026-11-18
> Audited by: audit agent

## Summary

| Category | Open issues |
| --- | ---: |
| Dead handlers / stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 0 |
| Schema mismatches | 0 |
| Total | 0 |

## P0 — Dead/Broken Code

No findings. The package, token, and organization controls reach their handlers, and each successful mutation reaches the store's shared persistence path. The Playwright suites verified 22 mutations against `/go` across all three workflows.

## P1 — Incomplete Features

No findings. Reviewed validation, confirmation and cancellation, ownership and plan checks, last-owner and default-team protections, duplicate handling, and organization cleanup. Desktop and mobile captures matched the original account-workspace design and the mobile package table stayed within its labeled scroll region.

## P2 — Minor Issues

No open findings. The missing schema reference sections were added in this round.

## Data Pipeline Status

| Component | Status | Evidence |
| --- | --- | --- |
| `dataManager.js` | Pass | Byte-for-byte SHA-256 match with `templates/dataManager.js`. |
| Store state sync | Pass | Boot renders a neutral loading view before mounting routes. The store calls `saveState` once per successful user mutation. No app timer writes state. An idle second tab sent zero POSTs for three seconds after the active tab saved under the same SID. |
| Vite `/state` and `/post` | Pass | The unchanged shared plugin serves both endpoints. Direct requests exercised `set`, `set_current`, and `reset`. |
| Vite `/go` | Pass | Direct requests verified the response keys and modified package collection. Browser tests checked changed records, related IDs, and actor and timestamp fields. |
| Session isolation | Pass | Browser navigation and deep links retained `sid`. A separate SID in the same browser context retained its seed and empty diff. |
| Baseline handling | Pass | The first `set` establishes the baseline. Subsequent `set` and `set_current` requests preserved it. `reset` restored the baseline and cleared the diff, as implemented by the Harbor template. |
| Injected state | Pass | Browser runs covered empty collections, sparse records and missing references, fixed-clock expiry, and a 317-record package inventory. |
| Offline build | Pass | `npm run build` passed. Playwright ran against locally served `dist` on port 5495 with localhost requests only. Source and CSS use system fonts and local glyphs. |
| `SCHEMA.md` | Pass | Verified all nine top-level keys, nested shapes, enum values, and mutation mappings against the seed and the store callers. |

## SCHEMA.md Updates

Added endpoint examples, top-level types, default IDs, a sparse injection example, and `state_diff` semantics. Documented the optional injected member email used by duplicate invitation checks. The mutation table matches the fields verified in [TEST.md](TEST.md).
