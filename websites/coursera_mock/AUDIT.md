# Coursera Mock — Audit Report

> Round: 1  
> Date: 2026-11-18  
> Audited by: audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers / stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 1 |
| Schema mismatches | 0 |
| Design alignment | 1 |
| Navigation accessibility | 1 |
| Total | 3 |

## P0 — Dead/Broken Code (must fix before testing)

### AUDIT-001 · Stale confirmation replaces an issued certificate · Resolved on 2026-11-18

- **Files**: `src/context/Workspace.jsx:31`, `src/data/learning.js:134`
- **Feature**: Finish course and verify the credential.
- **Reproduction**: Open `/learn/course-museum-meaning?sid=<same-id>` in two Chromium tabs. Open **Finish course** in both. Confirm in the first tab and read its issued certificate ID and verification code from `/go`. Confirm in the second tab. The second `set_current` replaces the original certificate and verification code. Open the first code in a new tab with the same session. The app displays **Credential unavailable**.
- **Cause**: The store applies actions against a snapshot held in a tab-local ref. Both tabs see the original in-progress enrollment. The second tab generates a fresh certificate and saves its entire stale snapshot. The final array still contains one credential, but the first issued record and its link are lost.
- **Fix**: In the app store, serialize same-session commits and reconcile against the latest session state before applying a mutation. Reapply the existing finish guard against that state. Keep the Harbor templates intact and preserve one whole-state save per accepted action. The regression should assert that the second confirmation sends zero business writes and the first ID and verification code remain valid.

## P1 — Incomplete Features

### AUDIT-002 · Record titles and rail wordmark drift from design tokens

- **File**: `src/styles.css:35`, `src/styles.css:116`
- **Issue**: Chromium computes white for the Coursera wordmark where DESIGN.md specifies `#E8EDF8`. List-card titles use 16 px at weight 680 with an inherited line height, while the card title token specifies 17/24 px at weight 650.
- **Fix**: Apply the named rail text and card title tokens to these elements.

## P2 — Minor Issues

### AUDIT-003 · Deep-linked sections have no accessible current navigation item

- **File**: `src/App.jsx:37`
- **Issue**: On a quiz deep link, the Assignments item receives the visual `selected` class but has no `aria-current` because its destination is `/assignments`. The same mismatch occurs on course, reading and verification routes.
- **Fix**: Use the resolved workspace section for both the visual and accessible current state.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| dataManager.js | ✅ | Byte-for-byte match with the Harbor template. |
| Workspace state sync | ⚠️ | Accepted single-tab actions each save once. A stale confirmation in a second tab can overwrite an issued credential. |
| vite.config.js /post | ✅ | Injection, baseline, current updates and reset worked through the standard plugin. |
| vite.config.js /state and /go | ✅ | JSON inspection exposed the expected current records and top-level diffs. |
| Session isolation (?sid=) | ✅ | Navigation and verification preserved the session ID. A separate session retained its baseline. |
| .initial.json handling | ✅ | The first baseline remained intact across updates. Reset restored it under the Harbor template semantics. |
| Injected rendering | ✅ | Empty, sparse and 300-course worlds rendered. Unavailable actions had guards, and sparse metadata survived a save. |
| Idle and offline behavior | ✅ | No timer-driven business writes in source. The observed idle tab sent no writes and retained an externally updated server marker. Chromium recorded zero external HTTP requests across the exercised routes. |
| SCHEMA.md accuracy | ✅ | All top-level record shapes and action fields match the verified single-tab behavior. |

## Checks performed

- `npm run build` passed. The dependency manifest and lockfile are present in the site directory.
- Chromium on localhost port 5370 exercised catalog search, topic and level filters, sorting, enroll, reading completion, failed quiz submission, withdraw, re-enroll, passing retake, course completion, certificate search and sorting, PDF download, clipboard copy and verification.
- The main session sent one baseline `set` and nine business `set_current` writes. The audit checked affected collections, identity links, timestamps, statuses, scores, progress, certificate fields and action types against `/go`. Cancel, invalid quiz submission, reload and verification were read-only after boot.
- The PDF download included the learner, course, issuer, issue date and verification code. Clipboard contents matched the same-origin verification URL with the session ID.
- Reviewed handlers and feature wiring in all four page modules and shared controls. Browser checks covered direct routes, missing routes, modal Escape and focus return, unavailable actions and workspace widths from 320 to 1440 px.
- Docker certification and the dedicated Playwright report belong to subsequent pipeline phases.

## SCHEMA.md Updates

Added localhost API details, first-baseline, cache and reset semantics, the default workflow IDs and a minimal injection. Preserved the record-shape and observable-change tables.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Previously fixed, retested.** Two stale and simultaneous finish attempts in same-session tabs both preserved the original credential with one business write.

Docker dynamic certification run `154644` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
