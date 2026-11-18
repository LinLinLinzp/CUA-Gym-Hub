# Freshdesk Mock — Audit Report

> Round 1  
> Date 2026-11-18  
> Audited by the audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers / stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 1 |
| Injected state and responsive behavior | 2 |
| Design alignment | 1 |
| Schema mismatches remaining | 0 |
| Total | 4 |

`npm run build` passed. The existing Playwright suite passed on the localhost dev server across seed, empty, sparse and large accounts. It verified 29 successful ticket, SLA and canned-response transactions with 104 reads of `/go`, zero uncaught page errors, zero off-origin requests and zero writes during the two-second idle check. The targeted checks below reproduced failures outside those test cases.

## P0 — Dead/Broken Code (must fix before testing)

### AUDIT-001 · A delayed boot snapshot can erase a successful first edit

- **Files** `src/main.jsx:9`, `src/utils/dataManager.js:55`, `src/store.jsx:13`. The shared Vite template applies writes on receipt in `templates/state-api.js:66`.
- **Issue** `loadState` dispatches the baseline `set` and returns before it completes. The account then enables edits immediately. The baseline and the first `set_current` can reach the server in reverse order.
- **Reproduction** In a fresh SID, hold only the first browser `set` using Playwright routing. Create a canned-response folder and confirm the `set_current` response and the folder in `/go.current_state`. Release the baseline. The UI still shows the saved folder, but `/go.current_state` loses it and `/go.initial_state` includes it. The successful edit is lost from the verifier's current state.
- **Fix** Ensure the baseline completes before accepting the first mutation in a fresh session. Preserve the required shared templates and the one-baseline, one-write-per-transaction contract. Repeat the delayed-request check and assert that the initial snapshot excludes the new folder and the current snapshot retains it.

## P1 — Incomplete Features

### AUDIT-002 · Add policy opens an existing policy with ID `new`

- **File** `src/pages/Policies.jsx:117` and `src/pages/Policies.jsx:154`.
- **Issue** The add button uses `new` as its editor state, and the dialog always looks up that value as a record ID. With an injected policy whose ID is `new`, Add policy opens Edit SLA policy with the injected name prefilled. A successful submission would update that row.
- **Fix** Store the create and edit modes independently of the policy ID. Add a test that injects this ID, completes the Add policy form and verifies that `/go` contains both policies.

### AUDIT-003 · Queue filter controls fall below a short mobile viewport

- **File** `src/styles.css:270` and `src/pages/Queue.jsx:134`.
- **Issue** At 390 × 450 CSS pixels, the fixed queue filter popover places the bottom of Done at 530 pixels. Page scrolling leaves it in the same position. The popover has no internal scrolling, so users cannot reach the footer through the viewport.
- **Fix** Constrain the mobile popover height to available viewport space and make its contents scrollable, or use a panel in normal page flow. Check all filter controls and both footer actions in a short touch viewport.

### AUDIT-004 · Typography and pill spacing drift from DESIGN.md

- **File** `src/styles.css:56`, `src/styles.css:155`, and `src/styles.css:158`.
- **Issue** The wordmark inherits 31.5 px leading where the design calls for 26 px. Ticket subjects use weight 650 and inherit 21 px leading where the design calls for 600 and 20 px. Pills use weight 650 and 8 px horizontal padding where the design calls for 500 and 6 px.
- **Fix** Apply the documented type and padding values to those selectors.

## P2 — Minor Issues

None found in the audited workflows.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | Pass | SHA-256 matches the shared template. The helper keys browser state by SID and syncs whole-state writes to `/post`. |
| App store sync | Blocked | State changes share one commit path and produce structured records. AUDIT-001 can overwrite the first write. No timer-driven state writes were found or observed. |
| Vite `/state` and `/post` | Pass | Vite imports the shared state API. Verified injection and reset. The shared reset action restores the initial snapshot. |
| Vite `/go` | Pass | Verified `initial_state`, `current_state`, and top-level `state_diff` against ticket and admin changes. AUDIT-001 affects the contents if writes arrive out of order. |
| SID isolation and routes | Pass | Four independent sessions, SID-preserving navigation, and hard reloads passed. |
| Initial snapshot | Blocked | Sequential `set` and `set_current` preserve the baseline. Reverse arrival can initialize the snapshot with the mutation. |
| Injected state | Partial | Empty, sparse and large accounts rendered. The injected policy ID in AUDIT-002 exposes a form-mode collision. |
| Offline assets | Pass | System fonts, bundled generic icons, and CSS supply the interface. Browser checks observed zero off-origin requests. |
| `SCHEMA.md` | Pass | Checked all seed collections and action fields against the factory and mutation code. |

Docker dynamic certification remains with the parent runner. The targeted Playwright checks are in the ignored `.scratch/audit_edges.cjs` runner.

## SCHEMA.md Updates

Added the endpoint and reset behavior, the default ID ranges, a minimal injection example, and the `/go.state_diff` envelope. The observable state change table retains the exact fields and event types used by ticket, SLA and canned-response actions.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Previously fixed, retested.** Chromium held the initial POST and verified that edit controls waited for acknowledgement. The core agent workflows also passed.

Docker dynamic certification run `125084` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
