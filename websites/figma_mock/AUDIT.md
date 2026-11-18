# Figma Mock — Audit Report

> Round 1  
> Date 2026-11-18  
> Audited by audit agent

## Summary

| Category | Issues found | Open |
| --- | ---: | ---: |
| Dead handlers and broken links | 2 | 0 |
| Incorrect state tracking | 1 | 0 |
| Data pipeline gaps | 0 | 0 |
| Schema documentation gaps | 1 | 0 |
| Total | 4 | 0 |

## P0 — Dead or broken code

### AUDIT-001 · Comment draft crossed pages — fixed

- **File** `src/Editor.jsx`
- **Issue** Browser Back changed the active page while retaining the draft pin and composer. A later submit could attach the feedback to the newly active page.
- **Fix** Clear comment placement and its draft when the active page changes, including history navigation. Chromium confirmed the pin and composer disappear, with zero business writes.

### AUDIT-002 · Missing source page left unusable components in Assets — fixed

- **Files** `src/data/model.js` and `src/components.jsx`
- **Issue** An injected published main could have a valid layer record for a missing page. The asset appeared available and its source link led to a page that could not show the main.
- **Fix** Require the source page and layer to resolve to the source file. Existing instances with missing sources keep their generic artwork, and the Layers panel reports the unavailable source. Chromium confirmed the broken source link and asset were absent.

### AUDIT-003 · Grant controls had no record to update — fixed

- **File** `src/Share.jsx`
- **Issue** A sparse injected grant without an ID showed role and removal controls whose actions could never find the grant.
- **Fix** Show the recipient and role as read-only. Chromium confirmed both mutation controls were absent.

## P1 — Documentation

### AUDIT-004 · Verifier setup details were missing — fixed

- **File** `SCHEMA.md`
- **Issue** The existing schema covered change fields but lacked the base URL, reset and injection request formats, seed ID references, and a minimal injected world.
- **Fix** Add those details and retain the complete observable action table.

## P2 — Minor issues

No open findings.

## Data Pipeline Status

| Component | Status | Evidence |
| --- | --- | --- |
| `src/utils/dataManager.js` | Pass | SHA-256 matches the required template. It loads the session world over the defaults and sends a full-state save for each accepted transaction. |
| Workspace store | Pass | Routes render after loading. The store owns persistence. The notification timeout clears transient text only. A stale idle tab produced zero state POSTs while another tab edited. |
| Vite `/post`, `/state`, and `/go` | Pass | Uses the required state API. Local tests verified reads after injection, the initial and current snapshots, top-level diffs, and reset to the session baseline. |
| Session isolation and navigation | Pass | Independent sessions retained independent state. Route links, browser Back, hard reload, and a copied design link preserved `sid`. |
| `.initial.json` handling | Pass | A repeated `set` and then `set_current` preserved the first baseline. The shared template implements reset by restoring current state from that baseline. This takes precedence over the generic audit checklist's delete-on-reset behavior. |
| Injected state | Pass | Empty arrays, a sparse file, a 360-file workspace, a missing source page, and a grant without an ID rendered without page errors. |
| Offline assets and build | Pass | Vite built successfully. Original illustrations use local CSS with synthetic text. The localhost browser checks recorded zero external HTTP requests. |
| Design alignment | Pass | The cream library, aubergine rail, serif headings, file previews, and design editor match the site's documented layout and original visual direction. |
| `SCHEMA.md` | Pass | Eleven top-level keys, linked records, and each observed business action are documented. |

## SCHEMA.md Updates

Added setup commands, stable seed IDs, an injection example, and the template's reset behavior. The three application fixes preserve the state schema. See [TEST.md](TEST.md) for browser and `/go` evidence across all four workflows.
