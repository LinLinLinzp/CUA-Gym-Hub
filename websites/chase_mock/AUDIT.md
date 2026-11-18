# Chase Mock — Audit Report

> Round 1  
> November 18, 2026  
> Audited by the audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers or stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 0 |
| Schema mismatches remaining | 0 |
| Keyboard interaction | 1 |
| Design alignment | 1 |
| Total open | 2 |

## P0 — Dead or broken code

None found. The five required workflows passed the existing Chromium suite on localhost port 5332.

## P1 — Incomplete features

### AUDIT-001 · Confirming a cancellation drops keyboard focus

- **Files** — `src/ui.jsx:125`, `src/pages/Transfers.jsx:82`, `src/pages/BillPay.jsx:155`.
- **Reproduction** — On Transfers or Bill pay, focus the cancellation trigger for a scheduled item. Press Enter, focus **Confirm cancellation**, and press Enter again. The cancellation succeeds and Chromium reports `document.body` as the focused element. Escape restores focus to the trigger while the item remains scheduled.
- **Cause** — The dialog's close handler targets the trigger, which disappears when the scheduled record becomes cancelled.
- **Fix** — On confirmation, move focus to a stable element in the affected activity panel or its confirmation. Keep trigger restoration for Escape and **Go back**. Verify both outcomes with the keyboard.

### AUDIT-002 · Desktop dispute controls sit beside case tracking

- **Files** — `src/pages/Disputes.jsx:144` and `src/styles.css:50`.
- **Issue** — `DESIGN.md` specifies a narrow selector above the details for Disputes and Alerts. Alerts follows that arrangement. At widths of 900 px and above, Disputes inherits the equal-width layout used by Transfers and Bill pay, with the picker beside case tracking.
- **Fix** — Stack the dispute picker above tracking on desktop and constrain the selector width. Preserve case search, review, and direct entry from a transaction.

## P2 — Minor issues

None found.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| State manager | Pass | The site copy matches `templates/dataManager.js` byte for byte. It loads injection by SID, merges objects, replaces arrays, and saves complete snapshots to local storage and the server. |
| Provider and state sync | Pass | A loading screen precedes route rendering. All mutations use the provider's commit function. The workflow run recorded one boot `set` and 13 user-driven `set_current` requests in the primary session. |
| `/state`, `/post`, and `/go` | Pass | The shared Vite plugin handled local testing. Direct requests verified session isolation, initial and current snapshots, top-level diff, and reset to the original baseline. Reset follows the required shared template's behavior. |
| Structured workflow records | Pass | Nickname edits changed only the selected account. Same-day transfers recorded the transfer, balance updates, and two linked ledger entries. Scheduled transfers, payees, payments, disputes, and alerts wrote their expected records and audit fields. Cancellation changed only the selected record's status and cancellation metadata. |
| Injected worlds and routing | Pass | Empty arrays, a partial profile, one account with missing optional fields, unresolved relations, and a 480-row injected ledger rendered. Session links retained `sid`, and unavailable records showed recovery links. |
| Idle writes and offline assets | Pass | The suite observed no business writes during idle time, reload, navigation, filtering, validation failures, or abandoned reviews. The title and text brand are Chase. The app uses system fonts, local icon paths, and CSS decoration. Chromium requested only the local origin. |
| Build | Pass | `npm run build` passed with React Router module-directive advisories. Existing `TEST.md` also records a passing run against the built preview. Docker dynamic certification belongs to the parent runner. |

## SCHEMA.md Updates

Added endpoint instructions, verified default IDs, a minimal injection example, and the local template's reset and baseline behavior. The existing record shapes and user-action field mappings match the current implementation.
