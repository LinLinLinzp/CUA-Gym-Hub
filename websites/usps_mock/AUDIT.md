# USPS Mock — Audit Report

> Round: 1  
> Date: 2026-11-18  
> Audited by: audit agent

## Summary

| Category | Open issues |
|---|---:|
| Dead handlers / stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 2 |
| Schema mismatches | 0 |
| UI accessibility | 1 |
| Total | 3 |

## P0 — Dead or broken code

### AUDIT-001 · A stale tab erases an accepted write · Resolved on 2026-11-18

- **Files** — `src/store.jsx:22`, `src/store.jsx:39`
- **Workflow** — Scheduled Hold Mail cancellation. The shared commit path also serves claims, forwarding and PO Boxes.
- **Reproduction** — Open `/hold-mail/hold-001` and `/hold-mail/hold-002` with the same SID in two separate Chromium contexts. Wait for both to hydrate. Cancel the first hold and wait for its successful `set_current` response. Then cancel the second hold from the other context.
- **Observed** — Both pages report success. `/go` ends with `hold-001.status: scheduled` and `hold-002.status: cancelled`. The second context has no shared storage event and posts its older full snapshot. The existing idle-tab test passes because it performs writes from only one context.
- **Fix** — Reconcile each user-initiated mutation with the latest authoritative snapshot and apply the existing business checks to that snapshot before saving. Handle overlap between active writers so a stale full snapshot cannot silently undo an accepted operation. Keep both Harbor templates unchanged and preserve the zero-write idle behavior. Verify that both cancellation records survive with their cancellation metadata.

### AUDIT-002 · Claim review can save a draft and file the same input · Resolved on 2026-11-18

- **Files** — `src/claims.jsx:192`, `src/ui.jsx:72`
- **Reproduction** — Complete a new claim up to its review. Activate Save draft and then File claim in the same browser turn, before navigation replaces the form.
- **Observed** — The same tracking number appears in two new records in `/go`, one `draft` and one `submitted`. Both actions issue a `set_current` POST because draft saving and final filing use separate submission guards.
- **Fix** — Share one synchronous guard across both actions and keep it held through successful navigation. Release it after a rejected action so the user can correct and retry. Verify exactly one POST and one record for either activation order.

## P1 — Incomplete features

### AUDIT-003 · Mobile keyboard focus skips the expanded menu

- **Files** — `src/navigation.jsx:47`, `src/navigation.jsx:60`
- **Reproduction** — At 390 px, focus Menu, press Enter, then press Tab.
- **Observed** — Focus goes to Explore mail services in the main content. The expanded navigation precedes the Menu trigger in DOM order, so forward Tab skips its links.
- **Fix** — Place the expanded mobile navigation after the trigger in the focus order or explicitly focus its first link on opening. Verify keyboard access to all service links and return focus to Menu when the disclosure closes.

## P2 — Minor issues

No additional findings.

## Data Pipeline Status

| Component | Status | Notes |
|---|---|---|
| `dataManager.js` | ✅ | SHA-256 matches the repository template. Fresh load performs its baseline set. The client saves the full state locally and sends `set_current`. |
| Store sync | ❌ | Normal single-writer flows persist through one commit path. Active contexts can overwrite one another, and claim review can issue two writes from competing controls. |
| Vite `/state` and `/post` | ✅ | The app imports the shared middleware. Local injection, baseline set, current-state writes and reset were verified. |
| Vite `/go` | ✅ | The normal workflows returned the expected changed collections and structured records. It also exposed both P0 issues. |
| SID isolation and initial state | ✅ | Independent SIDs remained isolated. Router navigation and hard reload retained SID. User writes preserved the initial snapshot. Reset restored the baseline and cleared the diff. |
| Idle state and injected worlds | ✅ | The idle tab issued zero mutation posts. Empty, partial and 380-record worlds rendered. Injected keys survived a user write. |
| Offline production build | ✅ | `npm run build` passed. Chromium reported no off-origin requests. The app uses system fonts, a text USPS masthead and locally drawn SVG graphics. |
| `SCHEMA.md` accuracy | ✅ | Documents every seed key, record shape and observable mutation. |

The existing 15-check Playwright suite passed against the built app served on localhost port 5532. It covered creation, edit and cancellation for forwarding and Hold Mail, new and resumed claim filing, and PO Box reservation and renewal. The additional audit checks reproduced the three findings above. Source-mode Vite previously failed in the Windows dependency optimizer with an access denial documented in `TEST.md`. Docker dynamic certification belongs to the parent runner.

## SCHEMA.md Updates

Added the localhost API contract, fixed seed ID ranges and a minimal injection example. Expanded the action table to distinguish edits from cancellations and to identify the written fields. Documented the shared template's reset behavior, which restores current state from the baseline.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Fixed and retested.** The original two-context browser case retained both Hold Mail cancellations and cancellation metadata after the second preloaded context wrote.
- **AUDIT-002 · Fixed and retested.** The two same-turn activation orders each produced exactly one write and one claim. The first action determined whether the claim stayed draft or was filed. Both entry points use the same submission guard.

Docker dynamic certification run `168412` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
