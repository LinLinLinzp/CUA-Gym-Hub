# Zapier Mock — Audit Report

> Round 1  
> Date 2026-11-18  
> Audited by the audit agent

## Summary

| Category | Found | Open |
| --- | ---: | ---: |
| Dead or broken controls | 2 | 0 |
| Missing state tracking | 0 | 0 |
| Data pipeline gaps | 0 | 0 |
| Schema mismatches | 0 | 0 |
| Layout | 2 | 0 |
| Total | 4 | 0 |

## P0 — Dead or broken controls

### AUDIT-001 · An injected field without a label could crash the Zap editor

- **Files** · `src/ZapEditor.jsx`, `src/utils/workflow.js`
- **Resolution** · Render the field key when its display label is absent and use the same fallback in validation messages.
- **Verification** · Opened an injected Slack action and located its editable field by key.

### AUDIT-002 · Injected steps without IDs could select the wrong action and duplicate with shared IDs

- **Files** · `src/ZapEditor.jsx`, `src/Zaps.jsx`
- **Resolution** · Give each ID-less editor step a distinct local ID. Assign a fresh ID to every copied step and remap existing references. Persist editor-generated IDs on a user-driven save.
- **Verification** · Selected the second ID-less action, checked that viewing left the stored step untouched, saved the draft, and verified unique IDs. Duplicated the original and verified unique IDs and the remapped trigger reference.

## P1 — Layout

### AUDIT-003 · Row menus were offset from their action buttons

- **Files** · `src/ui.jsx`, `src/styles.css`
- **Resolution** · Anchor the menu to the measured button position within the viewport.
- **Verification** · Opened a row menu in a horizontally scrollable table at 390 px, checked its bounds and alignment, and used it to duplicate a Zap.

### AUDIT-004 · Long task usage ranges could force the page to scroll horizontally

- **File** · `src/styles.css`
- **Resolution** · Size chart columns to the available width.
- **Verification** · Rendered 350 distinct UTC days at a 390 px viewport and checked document width.

## P2 — Minor issues

None open. Panel and status badge padding were aligned with `DESIGN.md` during the layout fixes.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| Client state manager | Pass | SHA-256 matches the shared template. Boot awaits state before rendering routes. |
| Store state sync | Pass | The central dispatcher saves one complete world per successful mutation. Read-only operations leave persisted state unchanged. |
| `/post`, `/state`, `/go` | Pass | The standard Vite plugin serves session-scoped state and top-level diffs. The first baseline is preserved and reset restores it. |
| Structured records | Pass | Zaps, draft tests, publications, replay runs, and connections carry structured references, status, and applicable actor and timestamp metadata. |
| Injected worlds and session isolation | Pass | Empty, partial, single-record, and large injected collections rendered. Deep links kept their session IDs and separate sessions retained separate state. |
| Idle behavior | Pass | No timer-based business writes in source. The browser suite observed no writes from an idle tab after another tab saved. |
| Offline build | Pass | Production build succeeded. Chromium loaded the built assets with only the localhost state API and saved and reloaded a Zap. |
| SCHEMA.md | Pass | Current record shapes, endpoint examples, and observable state changes are documented. |

## SCHEMA.md Updates

Added endpoint examples, default entity IDs, a minimal injected world, and the persisted effect of saving an injected draft whose steps lacked IDs.

See [TEST.md](TEST.md) for the workflow and contract checks. Docker dynamic certification is handled by the parent runner.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Previously fixed, retested.** The audit suite opened the injected editor with a missing field label and verified it remained operable.
- **AUDIT-002 · Previously fixed, retested.** The audit suite verified selection and duplication of injected steps without IDs and checked that duplicate step IDs were distinct.

Docker dynamic certification run `154644` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
