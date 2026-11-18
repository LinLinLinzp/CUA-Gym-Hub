# TikTok Studio Mock — Audit Report

> Round: 1  
> Date: 2026-11-18  
> Audited by: audit agent

## Summary

| Category | Issues found | Open |
| --- | ---: | ---: |
| Dead handlers / stubs | 0 | 0 |
| Missing state tracking | 0 | 0 |
| Data pipeline gaps | 1 | 0 |
| Schema mismatches | 1 | 0 |
| Incomplete features | 1 | 0 |
| **Total** | **3** | **0** |

## P0 — Dead/Broken Code

Zero findings. The posts, drafts, comments, and analytics controls call their intended handlers. Explicit business mutations leave structured records through the shared store.

## P1 — Incomplete Features

### AUDIT-001 · Injected asset URLs could cause external requests

- **File** `src/utils/view.js`
- **Issue** The same-origin URL check accepted an absolute same-origin URL with a double-slash pathname. Returning that pathname made the browser interpret it as a network-path URL when used as a media source, cover, or avatar.
- **Resolution** Reject ambiguous pathnames and require the page protocol. An injected fixture verified that all three asset slots use fallbacks, the browser makes zero external requests, and the composer rejects the URL as a video source.

### AUDIT-002 · An upload could overwrite a later sample choice

- **Files** `src/pages/Composer.jsx` and `src/components/ui.jsx`
- **Issue** The Sample clip selector stayed active during an upload. A creator could select a sample and have it silently replaced when the earlier upload completed.
- **Resolution** Disable sample selection while the upload is pending, consistent with the other media and save controls. A delayed localhost upload verified the selector becomes available after completion and can then replace the uploaded clip.

## P2 — Minor Issues

### AUDIT-003 · Verifier schema was missing setup details

- **File** `SCHEMA.md`
- **Resolution** Added the base URL, injection and reset requests, fixed ID ranges, and a minimal injected state. Kept the field mappings synchronized with the mutation code.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | Pass | SHA-256 matched the repository template. The Harbor template caches in local storage and sends `set_current` through the state API on each accepted action. |
| Store and state sync | Pass | Routes wait for `loadState`. All business edits use the central commit function. Draft conversion and bulk moderation each use one write. No timer writes business state. |
| `/post`, `/state`, and `/go` | Pass | Vite imports the repository state API directly. Live requests verified injection, current state, and the three `/go` fields with a top-level diff. |
| Session isolation | Pass | Tests verified `sid` on navigation, scoped state and uploads, and isolation across test sessions. |
| Initial snapshot and reset | Pass | Repeated `set` and later `set_current` preserved the original baseline. `reset` restored current state from the baseline, as implemented by the required template. |
| Injected state | Pass | Empty arrays, incomplete single-record fixtures, dangling references, and 250 records per list rendered. The isolated write preserved an extra injected field. |
| Offline assets and design | Pass | Plain text branding, original bundled SVG covers and WebM clips, and system fonts. The forest and ivory palette, serif headings, spacing, and dialog shadows align with `DESIGN.md`. Browser suites observed zero external requests. |
| Production build and schema | Pass | `npm run build` passed. Playwright loaded the compiled UI with the localhost state API. `SCHEMA.md` describes every top-level key and the exact action fields. |

## SCHEMA.md Updates

Documented the template's restore-on-reset behavior and added a minimal example that preserves empty array replacements. No fields were added to the app's persisted state.
