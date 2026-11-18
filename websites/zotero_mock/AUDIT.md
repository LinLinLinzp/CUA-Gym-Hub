# Zotero Mock — Audit Report

> Round 1  
> Date 2026-11-18  
> Audited by the audit agent

## Summary

| Category | Issues |
| --- | --- |
| Dead handlers or stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 0 |
| Schema mismatches after documentation update | 0 |
| Injected-state usability | 1 |
| Design alignment | 1 |
| Total | 2 |

## P0 — Dead or Broken Code

No P0 findings. The build and Playwright suites passed on port 5427 with Vite development assets and compiled assets. The suites exercised library, reference, collection, membership, and citation workflows, including the optional cross-library copy. Every tested mutation was observable in `/go`.

## P1 — Incomplete Features

### AUDIT-001 · Deep collection trees overflow their panel

- **File** — `src/components/Collections.jsx:25` and `src/styles.css:130`.
- **Issue** — Each nesting level adds horizontal indentation inside the fixed-width collection panel. A 40-record acyclic chain rendered without a JavaScript exception, but the last label shrank to 9 px. The deepest row began at x=669 on desktop, while the panel ended at x=264. At a 390 px mobile viewport, the document widened to 718 px.
- **Reproduce** — Inject one writable library and 40 collections in a chain, each with the preceding collection as its parent. Open that library at 1280 px, then at 390 px with the collection disclosure expanded. See `node .vite/audit_edges.cjs` for the local probe.
- **Fix** — Cap visual indentation while retaining the actual hierarchy, collapse controls, ordering, and links. Verify the deepest label and menu stay usable inside the sidebar without page-level horizontal scrolling.

### AUDIT-002 · Navigation spacing and mobile library grid diverge from the design

- **File** — `src/styles.css:55` and `src/styles.css:287`.
- **Issue** — The desktop brand-to-navigation gap is 34 px, while `DESIGN.md` specifies 24 px. The layout drops to one library card column at 600 px. The design specifies a two- or three-column directory.
- **Fix** — Use the 24 px desktop gap. Confirm the intended narrow breakpoint for the directory and align the implementation and design. At phone widths, the current single-column layout gives each card's title and management action more space.

## P2 — Minor Issues

No P2 findings.

## Data Pipeline Status

| Component | Status | Evidence |
| --- | --- | --- |
| `src/utils/dataManager.js` | Pass | SHA-256 matched `templates/dataManager.js`. The helper loads session-scoped state and saves whole-state snapshots locally and through the server. |
| Boot and store sync | Pass | Route rendering follows the awaited load. The central commit calls the shared writer once per action. Each full browser run observed one main baseline and 24 user-driven writes. Four additional sessions posted only baselines. |
| `/state` and `/post` | Pass | The shared Vite plugin served both endpoints. Checked initial injection, recursive object merge, `set_current`, and `reset`. |
| `/go` and baseline handling | Pass | Checked response shape, top-level diff, preserved initial snapshot after mutation, and cleared diff after reset. The shared reset restores the current snapshot from the initial snapshot. |
| Session isolation and routes | Pass | Verified a second sid, sid-preserving navigation, deep links and reloads, missing and mismatched path IDs, and empty and sparse worlds. A 420-item injection rendered and filtered. See AUDIT-001 for collection-depth layout. |
| Timer and offline checks | Pass | No timer-driven state writes. The citation download timeout only revokes a local Blob URL. Both browser runs reported zero external requests and zero page or console errors. The wordmark is text, with local CSS and an SVG favicon. Citation styles and locale are bundled locally. |
| Production build | Pass | `npm run build` passed. Playwright used compiled assets with the localhost state middleware. Docker certification remains with the parent runner. |
| `SCHEMA.md` | Updated | Documented verified endpoint behavior, injection, fixed IDs, sparse record behavior, and exact mutation paths. |

## SCHEMA.md Updates

Added the localhost endpoint details, default ID references, and a minimal injected world. Clarified that `/go` compares top-level fields and that sparse citation history entries may produce null foreign keys or settings when reused. Checked the existing observable mutation table against every store commit.
