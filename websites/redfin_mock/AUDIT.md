# Redfin Mock — Audit Report

> Round 1 · 2026-11-18 · Audit agent

## Summary

| Category | Found | Open |
| --- | ---: | ---: |
| Dead handlers or stubs | 0 | 0 |
| Missing state tracking | 0 | 0 |
| Data pipeline and runtime | 1 | 0 |
| Workflow and presentation edge cases | 4 | 0 |
| Schema documentation | 1 | 0 |
| Total | 6 | 0 |

## P0 — Resolved

| Finding | Correction | Verification |
| --- | --- | --- |
| AUDIT-001 · Record creation called `crypto.randomUUID()` directly in `src/store.jsx`. Plain HTTP on a non-local hostname can omit that API. | Retain UUIDs where available and use 128 bits from `crypto.getRandomValues()` otherwise. Apply the same generator to success notices. | Playwright disabled `randomUUID` and successfully created an offer, a tour, and a conversation with persisted IDs. |

## P1 — Resolved

| Finding | Correction | Verification |
| --- | --- | --- |
| AUDIT-002 · The gallery duplicated the image when an injected listing started with an approved `-02.webp` path. | Select the other image in the pair from the local allowlist. | Opened an injected `-02.webp` image and advanced to the matching `-01.webp`. |
| AUDIT-003 · Sorting timestamp strings could misorder tours and messages with ISO offsets and flag a previously read message as unread. | Compare parsed instants for chronology and unread status. | Mixed UTC and offset timestamps selected the right next tour and newest thread, rendered messages in order, and preserved read status for equal instants. |
| AUDIT-004 · An injected offer with a two-decimal string amount displayed an unavailable price. | Format valid decimal strings and keep numeric writes. | An injected string displayed as currency and prefilled the edit form. A directly submitted offer stored a number. |
| AUDIT-005 · Closing a draft editor or withdrawal confirmation opened from offer details could leave focus on the main landmark. | Retain the listing row's details button as the return target across dialog transitions. | Escape from draft editing and Keep offer from withdrawal both restored focus to View details. |

## P2 — Resolved

AUDIT-006 added fixed seed IDs, a minimal injection payload, and the shared reset behavior to `SCHEMA.md`.

## Data Pipeline Status

| Component | Status | Evidence |
| --- | --- | --- |
| Shared `dataManager.js` | Pass | Byte-identical to the template. The client awaits the initial load before mounting routes. |
| Store and structured records | Pass | Business mutations pass through one `saveState` call. Browser checks inspected the four workflow diffs and the linked message records. |
| `/post`, `/state`, and `/go` | Pass | Injection loads in the browser. A second set and a current-state write preserve the original baseline. Reset restores current from that baseline. |
| Session isolation | Pass | Separate session IDs retained independent records. Navigation preserved the ID in the URL. |
| Idle behavior | Pass | No timer drives persisted state. A second tab sharing a session emitted zero writes while the first tab saved changes. |
| Injected state and offline assets | Pass | Empty, partial, orphaned, and 300-listing worlds rendered. Local WebP assets and the fallback worked without external requests. |
| Schema accuracy | Pass | The documented collections and write paths match the seed, store, and observed diffs. |

The browser audit exercised the original account design on localhost. Vite emits a compatibility warning for the unchanged shared middleware import under its future native config loader. The installed Vite build succeeds.
