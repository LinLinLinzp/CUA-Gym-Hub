# Login.gov Mock — Test Report

> Round: 2
> Date: 2026-11-18
> Server: http://localhost:5544
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
|--------|-------|
| Routes tested | 8, including the fallback route |
| Elements tested | Covered by route and workflow groups below |
| ✅ Passed | 8 acceptance groups, plus route and API smoke checks |
| ❌ Failed | 3 targeted regressions |
| ⚠️ Skipped (out of scope) | Production sign-in, account settings, and external services |

Both SEED workflows passed in Chromium using Node Playwright from `PILOT_PLAYWRIGHT`. The `npm run build` command passed. The browser runs used the existing Vite development listener on port 5544. The preceding round reported a passing built-preview run.

---

## ✅ Passing Tests

- **Account and navigation.** Tested the overview, identity, verification, connected services, catalog, consent, connection details, and the unmatched-route fallback. Verified deep links, reloads, heading focus on navigation, SID preservation, and representative hover feedback on all eight views.
- **Identity.** Tested starting and resuming a draft, method changes, document and contact confirmations, validation, Back, online completion, in-person submission and sample visit completion, cancellation, expired visits, and history search and filters.
- **Connected accounts.** Tested status filters, search, sorting, catalog search, service consent, verified-identity gating, email selection and change, disconnect, reconnect, and consent history.
- **Runtime.** Verified deterministic seed data with 24 attempts, 36 services, 24 connections, and 42 consent events. Tested isolated SIDs, reset, empty and sparse injected worlds, cross-account records, and a 320-record fixture. Five rapid actions reached Harbor in order while another tab stayed idle in the normal timing run. The shared `dataManager.js` matched the template hash.
- **UI.** Checked desktop, 390 px mobile, and 640 CSS-pixel reflow. Dialogs focus the safe action on open and restore focus after Escape. The route smoke run recorded no console errors or requests outside localhost. Screenshots were checked against the site's original design in [DESIGN.md](DESIGN.md).

### Observable state changes in `/go?sid=…`

| SEED workflow and action | Verified changes |
| --- | --- |
| Identity · Start verification | Appends one `verificationAttempts[]` record with `id`, `accountId`, `actorId`, `status: in_progress`, `step: method`, `sampleIdentityConfirmed: false`, `sampleContactConfirmed: false`, `createdAt` and `updatedAt`. Starting from consent also sets `serviceId`. Reload after acknowledgement resumes the stored step. |
| Identity · Select or change method | Updates the same attempt's `method`, `step: sample_identity` and `updatedAt`. Changing the method removes the prior `documentType` and resets both confirmation fields. |
| Identity · Confirm sample identity | Updates `documentType`, `sampleIdentityConfirmed`, `step: sample_contact` and `updatedAt`. A changed document clears prior contact confirmation. |
| Identity · Confirm sample contact | Updates `sampleContactConfirmed`, `step: review` and `updatedAt`. |
| Identity · Submit online | Sets attempt `status: verified`, `step: complete`, `submittedAt`, `completedAt` and `updatedAt`. The same write sets `identity.accountId`, `status`, `verifiedAt`, `verificationAttemptId` and `updatedAt`. |
| Identity · Submit in person | Sets attempt `status: pending_in_person`, `step: visit`, `submittedAt`, `visitReference`, `visitDeadlineAt` and `updatedAt`. The deadline is seven days after submission. |
| Identity · Complete sample visit | Sets attempt `status: verified`, `step: complete`, `completedAt` and `updatedAt`, preserving the submission and visit fields. The same write sets the verified identity fields as for online submission. |
| Identity · Cancel attempt | Updates only the active attempt's `status: canceled`, `canceledAt` and `updatedAt`, retaining the last step and prior fields. |
| Connected accounts · Agree and connect | Appends one `connections[]` record with `id`, `accountId`, `serviceId`, `status: connected`, `sharedEmailId`, `sharedAttributes`, `createdAt`, `connectedAt` and `updatedAt`. Appends a `connected` event with null `before` and a matching `after` snapshot. For gated services, identity verification returns to consent and the connection is created on agreement. |
| Connected accounts · Change shared email | Updates the connection's `sharedEmailId` and `updatedAt`. Appends a `shared_email_changed` event with previous and new email IDs and resolved addresses in its snapshots. The account email list is preserved. |
| Connected accounts · Disconnect | Updates the connection's `status: disconnected`, `disconnectedAt` and `updatedAt`. Appends a `disconnected` event with matching snapshots. The record and activity remain visible after reload. |
| Connected accounts · Reconnect | Reuses the connection ID and `createdAt`, sets `status: connected`, `sharedEmailId`, `sharedAttributes`, `connectedAt` and `updatedAt`, and removes `disconnectedAt`. Appends a `reconnected` event with matching snapshots. |

Every connection event includes `id`, `connectionId`, `accountId`, `serviceId`, `actorId`, `type`, `createdAt`, `before` and `after`. Snapshots contain `status`, `sharedEmailId`, `sharedEmailAddress` and `sharedAttributes`. Each confirmed workflow action produced one full-world `set_current` request. Search, filters, sorting, read-only views, Back, validation errors, Escape, consent cancellation, unchanged email selection and revisits of applied actions produced zero writes.

---

## ❌ Bugs for Dev Agent

### BUG-001 · P0 · Delayed bootstrap erases the first verification action

| Field | Value |
|-------|-------|
| Route | `/identity` |
| Element | Verify identity |
| Action | On a fresh SID, hold the baseline POST before it reaches the server. Start verification, wait for `set_current` to succeed, then release the baseline. |
| Expected | `/go` keeps the seed as the initial state and the new draft in current state. |
| Actual | The late baseline replaces current state with the seed. Initial state contains the draft, and current state loses it. |
| Console errors | None observed in the acceptance run. |
| Fix hint | Keep mutation controls unavailable until the baseline write settles. Preserve the cached load path and keep the shared helper unchanged. |

### BUG-002 · P0 · Reload can discard a queued verification step

| Field | Value |
|-------|-------|
| Route | `/identity/verify` |
| Element | Continue on the Method step |
| Action | Let the first mutation reach Harbor while holding its response. Select Online, continue to Review sample identity, then hard reload before releasing the response. |
| Expected | A displayed saved step survives reload in Harbor, or the UI indicates that the step is pending. |
| Actual | On reload the UI shows Review sample identity from cache. `/go` still shows `step: method` with no selected method. The second request never starts. |
| Console errors | None observed in the acceptance run. |
| Fix hint | Present queued changes as pending until acknowledged and make the reload view consistent with acknowledged state. |

### BUG-003 · P1 · Confirmed disconnect drops keyboard focus

| Field | Value |
|-------|-------|
| Route | `/connected-services/conn_001` |
| Element | Disconnect service confirmation |
| Action | Focus Disconnect service, open the dialog with Enter, and confirm the disconnect. |
| Expected | Focus moves to a stable visible target such as Reconnect or the connection heading. |
| Actual | The disconnect persists, Reconnect appears, and focus falls to the document body. |
| Console errors | None observed in the acceptance run. |
| Fix hint | Provide a stable post-confirmation focus target when the original trigger is removed. |

---

## Round History

### Round 1 → Round 2

- BUG-001 through BUG-003 remain reproducible. See [AUDIT.md](AUDIT.md) for additional timing and implementation details.
- `node test-results/acceptance.mjs` passed all eight acceptance groups. `node test-results/playwright-routes.mjs` passed route, hover, and API smoke checks. `node test-results/audit-edge.mjs` reproduced all three open issues.
-

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `80608`. The local evidence is `factory/build/dyn_certify/80608/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `emails → 0 → address`.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Fixed and retested.** The initial state POST was held until acknowledgement, with no action controls exposed in the meantime. Verification, consent and connected services passed.
- **AUDIT-002 · Fixed and retested.** The browser withheld the first saved response, verified there was no optimistic second step, reloaded, resumed from Harbor, and verified that the next confirmed verification step survived a second reload.

Docker dynamic certification run `154644` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
