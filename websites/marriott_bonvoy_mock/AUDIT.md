# Marriott Bonvoy Mock — Audit Report

> Round: 1  
> Date: 2026-11-18  
> Audited by: audit agent

## Summary

| Category | Found | Open |
| --- | ---: | ---: |
| Dead handlers / stubs | 1 | 0 |
| Missing state tracking | 0 | 0 |
| Data pipeline gaps | 1 | 0 |
| Schema mismatches | 1 | 0 |
| Total | 3 | 0 |

## P0 — Dead/Broken Code (must fix before testing)

### AUDIT-001 · Actions could fail on an HTTP origin · Resolved on 2026-11-18

- **File**: `src/model.js`
- **Issue**: The shared action ID generator called `crypto.randomUUID()`, which requires a secure browser context. With that method removed in Chromium, confirming a reservation edit threw and produced no `set_current` request.
- **Resolution**: Generate v4 UUIDs from `crypto.getRandomValues()` and keep the existing ID format. Re-ran the four workflows from `dist/` with `randomUUID()` disabled.

### AUDIT-002 · Whole-state save could silently miss the server · Resolved on 2026-11-18

- **File**: `src/utils/stateTransport.js`
- **Issue**: The template's keepalive threshold uses JavaScript string length, while Chromium enforces a byte limit. An injected field with 28,000 CJK characters reproduced a reservation change that reached the UI and local storage but failed to reach `/go`.
- **Resolution**: Check UTF-8 byte length in the site transport and disable keepalive for oversized bodies. The template remains unchanged. The same injected fixture now persists the edit, the action record and the complete metadata.

## P1 — Incomplete Features

None found. Stays, Points, Folios and Requests all have wired entry points, validation, confirmations where required and visible outcomes.

## P2 — Minor Issues

### AUDIT-003 · Schema omitted the API setup and fixture reference

- **File**: `SCHEMA.md`
- **Resolution**: Added endpoint commands, collection types, fixed ID ranges and a minimal injection example. Updated the snapshot and reset descriptions to match the Harbor template.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| dataManager.js | Pass | SHA-256 matches the repository template. |
| AccountContext state sync | Pass | Store writes whole-state snapshots from accepted business actions. Eight accepted actions posted eight updates. |
| vite.config.js /post | Pass | Template handles set, set_current and reset. Confirmed both action updates and restoration. |
| vite.config.js /go and /state | Pass | Checked structured diffs, original snapshots and injected collection replacement. |
| Session isolation (?sid=) | Pass | Separate sessions retained their own data. Links, redirects and reloads kept the session. |
| .initial.json handling | Pass | Action writes preserved the initial snapshot. Reset restored current state and cleared the diff. |
| Render with injected state | Pass | Checked empty arrays, isolated records with missing optional fields or relations, and 300 sparse records per primary list. |
| Offline assets and idle behavior | Pass | Account art is original CSS. Chromium recorded only localhost traffic. The PDF cleanup timer revokes an object URL and makes no state write. |
| SCHEMA.md accuracy | Pass | The seven keys, record fields and seven observable mutations match the implementation. |

## SCHEMA.md Updates

Documented the endpoint contract, typed collection inventory, default IDs and empty-world injection. Kept the workflow mutation table aligned with observed server state. See [TEST.md](TEST.md) for functional evidence. The parent runner owns Docker certification.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Previously fixed, retested.** A browser fixture with crypto.randomUUID disabled still generated and persisted the expected stay action ID.
- **AUDIT-002 · Previously fixed, retested.** A reservation edit in the 28,000-CJK-character fixture persisted both the edit and all metadata. Baseline reset restored the original snapshot.

Docker dynamic certification run `154644` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
