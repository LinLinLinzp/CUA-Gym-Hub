# Hugging Face — Audit Report

> Round 1  
> Date 2026-11-18  
> Audited by the audit agent

## Summary

| Category | Open issues |
| --- | --- |
| Dead handlers or stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 0 |
| Schema mismatches | 0 |
| Total | 0 |

## P0 — Dead or broken code

No open findings. Catalog, repository, review, and token controls are wired to navigation, local view state, or the shared mutation dispatcher as appropriate.

## P1 — Incomplete features

### AUDIT-001 · Modal cancellation lost keyboard focus (fixed)

Canceling token revocation left focus on the document body. The dialog in `src/ui.jsx` now closes during layout-effect cleanup, while it is still attached, so Chromium restores focus to the button that opened it. Confirmed that cancellation writes no state and returns focus to the Revoke button.

## P2 — Minor issues

No open findings.

## Data pipeline status

| Component | Status | Evidence |
| --- | --- | --- |
| Client state helper and Vite state API | Pass | Client helper matches the Harbor template byte for byte. Vite imports the shared API directly. |
| Bootstrap and dispatcher | Pass | Initial state loads before routing. One baseline POST for a fresh client. Each accepted action writes one complete snapshot and one structured activity record. |
| `/state`, `/post`, and `/go` | Pass | Tested injection, current state, preserved baseline, named session isolation, and reset to the initial state as defined by the Harbor template. |
| State on reload, idle, and navigation | Pass | Named session links and deep-link reloads work. No POSTs from search, filters, canceled actions, no-op saves, or idle time. |
| Injected data and offline runtime | Pass | Empty arrays, sparse records, unknown references, and 300 records per repository kind render. Browser requests stayed on localhost. |
| `SCHEMA.md` | Pass | Documents all top-level keys, nested records, and observed changes for each business action. |

## SCHEMA.md updates

Added the localhost endpoint examples, template reset behavior, deterministic ID conventions, and a minimal empty injection. Kept the observable action mappings aligned with the reducer.
