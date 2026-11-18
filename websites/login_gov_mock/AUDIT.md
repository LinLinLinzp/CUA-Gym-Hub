# Login.gov Mock — Audit Report

> Round 1  
> November 18, 2026  
> Audited by the audit agent

## Summary

| Category | Open issues |
| --- | ---: |
| Dead handlers / stubs | 0 |
| Missing state tracking | 1 |
| Data pipeline gaps | 1 |
| Schema mismatches | 0 |
| Other UI issues | 1 |
| Total | 3 |

The existing localhost acceptance suite passed both SEED workflows, including exact structured deltas, stable idle tabs, isolated SIDs, and empty, sparse, and large injected worlds. The build passed. Three additional checks reproduced the issues below.

## P0 — Dead/Broken Code

### AUDIT-001 · A late bootstrap POST can erase the first verification action

- **Files** `src/main.jsx:10`, `src/utils/dataManager.js:59`
- **Reproduction** On a fresh SID, hold the browser's baseline `set` before it reaches the server. Click **Verify identity** and wait for `set_current` to succeed. Release the baseline.
- **Observed** `/go` initially shows the draft in current state. The late baseline then replaces current state with the seed, while initial state retains the first draft. This loses the action and corrupts the verifier's baseline.
- **Fix** Coordinate bootstrap at the entry point so state-changing routes become interactive after the baseline POST settles. Keep the shared data helper byte-for-byte unchanged and retain the cached-load path, which sends no baseline. Add a delayed-bootstrap regression that checks both initial and current state.

### AUDIT-002 · Hard reload can discard a queued business mutation

- **Files** `src/utils/stateWrites.js:10`, `src/context/AccountContext.jsx:12`
- **Reproduction** Start verification and let the first action reach the server while holding its response. Select **Online** and click **Continue**. When **Review sample identity** appears, hard reload before releasing the first response.
- **Observed** The reloaded UI displays the locally cached **Review sample identity** step. The second POST never starts. `/go` still shows `step: method` and no selected method.
- **Fix** Keep full-world writes ordered and await server acknowledgement before presenting a queued action as successful. Surface pending or failed saves with a user-triggered retry, and keep the reload view consistent with the acknowledged state. Cover reload while a prior response is pending. Keep the shared helper unchanged and avoid background recovery writes.

## P1 — Incomplete Features

### AUDIT-003 · Disconnect confirmation drops keyboard focus

- **Files** `src/components/ui.jsx:80`, `src/pages/Connection.jsx:44`
- **Reproduction** Focus **Disconnect service**, open with Enter, and confirm the disconnect.
- **Observed** The action persists and **Reconnect** appears. Focus falls to `document.body` because the disconnect trigger was removed. Dismissing the dialog restores trigger focus through the existing path.
- **Fix** Give successful confirmations a stable focus target when they remove the trigger. Use the **Reconnect** link or the connection heading after disconnection. Verify the equivalent transitions after verification submission, cancellation, and visit completion.

## P2 — Minor Issues

None found.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| Shared `dataManager.js` | ✅ | SHA-256 matches the template. Local storage, SID resolution, and array replacement are intact. |
| Account state sync | ❌ | Delayed bootstrap and reload during queued saves can leave server state behind the UI. |
| Vite `/state`, `/post`, and `/go` | ✅ | Shared middleware passed direct checks for injection, update, reset, and baseline/diff shape. |
| Session isolation | ✅ | Browser tests verified independent SIDs and SID preservation on navigation and reload. |
| Initial-state handling | ⚠️ | Sequential API calls preserve the first baseline. A cold UI boot sends its baseline independently of subsequent actions. |
| Structured business records | ✅ | Both workflows generated related IDs, timestamps, typed statuses, and consent snapshots in acknowledged writes. |
| Idle and offline runtime | ✅ | Source uses user-initiated business writes only. Chromium observed localhost requests only. The UI uses a local CSS illustration and system fonts. |
| Injected state | ✅ | Chromium rendered empty, sparse, missing-reference and 320-record worlds. A large-world write retained unrelated injected data. |
| `SCHEMA.md` accuracy | ✅ | The seven keys, record shapes, defaults and action mappings match the implementation. |

## SCHEMA.md Updates

Added API usage, reset and cache behavior, fixed ID ranges, and a minimal injected fixture. Kept the per-action field mappings.

## Verification

- `npm run build` passed.
- `node test-results/acceptance.mjs` passed on the existing Vite development listener at `http://localhost:5544`.
- `node test-results/audit-edge.mjs` reproduced all three findings with installed Chromium. The runner lives in the gitignored `test-results/` directory.
- Docker dynamic certification is handled by the parent runner.
