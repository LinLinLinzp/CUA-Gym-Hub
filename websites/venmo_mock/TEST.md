# Venmo Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5331  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested | 8 app routes plus fallback |
| SEED workflows passed | 4 of 4 |
| Passing browser scenario groups | 11 |
| Open findings | 5 (1 P0, 2 P1, 2 P2) |

The existing localhost Vite listener served the browser runs. Installed Node Playwright from `PILOT_PLAYWRIGHT` drove Chromium with isolated synthetic sessions. `npm run build` passed, and the site's `dataManager.js` matched the shared template byte for byte. The parent runner handles Docker certification.

## ✅ Passing Tests

### Workflow state verified via `GET /go?sid=…`

| SEED workflow | Browser action and outcome | Fields observed in `current_state` |
| --- | --- | --- |
| Payments | Reviewed and confirmed a $12.35 balance payment. Double-clicking confirmation appended one record. A separate $400.00 payment used the selected debit card. | Appended `payments[]` with `id`, `type`, `status`, `actorId`, `senderId`, `recipientId`, `amount`, `currency`, `note`, `fundingSourceId`, `createdAt`, `completedAt`. `account.balance` changed from 286.75 to 274.40 on balance funding. The debit payment recorded `funding_debit` and left that balance intact. |
| Requests | Sent a $18.20 request, reminded the recipient, backed out of cancellation, then confirmed cancellation. Also declined one incoming request and paid another for $12.75. | Creation appended `requests[]` with `id`, `status`, `actorId`, `requesterId`, `payerId`, `amount`, `currency`, `note`, `createdAt`. Remind appended `reminders[]` with `id`, `actorId`, `createdAt`. Confirmed cancel and decline set `status`, `updatedAt`, `updatedById`. Paying also set `paymentId`, appended a completed payment with `requestId`, and reduced `account.balance` to 261.65. |
| Splits | Divided $50.00 into $16.67, $16.67 and $16.66 with the owner included. Split an existing payment into custom shares of $5.11 and $7.24 with the owner excluded. Cancelled linked child requests and paid the last pending child of an injected split. | Appended `splits[]` with `id`, `actorId`, `ownerId`, `amount`, `currency`, `note`, `method`, `status`, `createdAt`, `shares[]` and `sourcePaymentId` for the payment-based split. Shares stored `userId`, `amount` and each non-owner's `requestId`. Matching `requests[]` records included `splitId`. Terminal child actions updated the parent's `status`, `updatedAt`, `updatedById`, reaching `partial`, `closed` or `settled` as applicable. |
| Statements | Exported a header-only CSV for May and compared the October export byte for byte with expected mixed activity. Checked timezone boundaries, ordering ties, timestamp fallback, totals, CSV escaping and formula protection. | Appended `statementExports[]` with `id`, `actorId`, `createdAt`, `status`, `periodStart`, `periodEndExclusive`, `format`, `filename`, `currency`, `transactionIds`, `transactionCount`, `totalIncoming`, `totalOutgoing`. October recorded three ordered IDs, 32.00 incoming and 20.22 outgoing. The supplemental run confirmed `statementExports` as the only changed top-level key after an export. |

### Route and runtime coverage

- **Overview and Activity.** Verified the Venmo home link, overview panel links, activity row hover and detail links, All/Sent/Received filters, note search, and hard reload on a newly created payment's detail.
- **Requests and Splits.** Verified incoming and outgoing tabs, request status selection, split search and empty results, detail links, back links, and navigation between a split and its child requests.
- **Composer and review controls.** Verified name, handle, email and phone search, recipient removal, mode switches, funding selection, owner toggle, equal and custom share controls, validation, review edits, Cancel, Close, Escape and focus restoration. Multi-recipient payment and request submissions wrote one snapshot per confirmation with a record for each recipient. Invalid and dismissed drafts left `/go.state_diff` empty in a fresh session.
- **Statements.** Verified month and year changes, preview payment links, browser download, and notification dismissal. Period selection alone left `/go.state_diff` empty.
- **Harbor and session handling.** Verified the default snapshot of 32 contacts, 72 payments, 48 requests, 24 splits and zero exports. All routes rendered with empty arrays. Additional cases covered sparse details and a 330-record activity list. Direct links, unavailable records and unknown route recovery preserved `sid`. A separate session's export left the main session unchanged. An idle same-session tab posted nothing after boot and left newer state on the server.
- **Browser runtime.** Requests stayed on localhost. Chromium reported no JavaScript exceptions. The console reported the favicon request in BUG-004.

## ❌ Bugs for Dev Agent

### BUG-001 · P0 · Reload can drop a confirmed export write

| Field | Value |
| --- | --- |
| Route | `/statements` |
| Element | Download CSV |
| Action | Forward the first export write to localhost, hold its successful response in Playwright, download another CSV, then reload before releasing the response. |
| Expected | The two completed downloads have two export records in `/go`. |
| Actual | Two downloads complete and two records persist in browser storage. After reload, `current_state.statementExports` and `state_diff.statementExports.modified` each contain one record. |
| Console errors | No application exception observed. |
| Fix hint | Acknowledgement gates the queued send, but download success and local caching happen immediately. Wait for acknowledgement before confirming success and retain a retry path. Keep the shared template unchanged. |

### BUG-002 · P1 · Seeded paid request opens an unrelated payment

| Field | Value |
| --- | --- |
| Route | `/requests/request_013` |
| Element | View payment |
| Action | Open the related payment and then click View request. |
| Expected | The linked payment matches the request and its return link opens `request_013`. |
| Actual | `request_013` and `request_014` both link to `payment_072`. That payment records `request_014`, which is where the return link leads. |
| Console errors | No application exception observed. |
| Fix hint | Assign a distinct payment fixture to each paid request and check reciprocal IDs, parties, amounts and timestamps. |

### BUG-003 · P1 · Split list omits individual request statuses

| Field | Value |
| --- | --- |
| Route | `/splits` |
| Element | Partially settled split row |
| Action | Inspect the row, then open the split. |
| Expected | The list and detail both show each linked participant's request status per TODO P1.3. |
| Actual | The list shows only Partially settled. The Pending and Cancelled child statuses appear on the detail page. |
| Console errors | No application exception observed. |
| Fix hint | Reuse the detail view's request lookup and fallback when rendering participant status in the list. |

### BUG-004 · P2 · Browser requests a missing favicon

| Field | Value |
| --- | --- |
| Route | `/` |
| Element | Browser tab icon |
| Action | Load the site in a fresh Chromium context. |
| Expected | A local favicon loads without a missing-resource error. |
| Actual | `GET /favicon.ico` returns 404. |
| Console errors | Failed to load resource: the server responded with a status of 404 (Not Found). |
| Fix hint | Link a local, original favicon from `index.html`. |

## Visual Alignment Feedback

Reviewed local Chromium captures of all eight routes at 1440 px and of the overview and composer at 390 px against `DESIGN.md`. The captures show the horizontal account navigation, two-column overview, local initials avatars and CSS balance art. The mobile overview fit the viewport and the sheet filled the viewport width.

### VISUAL-001 · P2 · Text weight and balance art opacity differ from the brief

| Field | Value |
| --- | --- |
| Views | Ledger views, workflow forms and Overview balance card |
| Reference | `DESIGN.md`, sections 3 and 5 |
| Captures | `.local-tests/activity.png`, `.local-tests/mobile-sheet.png`, `.local-tests/overview.png` |
| Issue | Row titles and form labels use font weight 650 instead of 600. Balance outlines use alpha .28 instead of .22. |
| Fix hint | Apply the documented values in `src/styles.css`. |

## Round History

### Round 1 → Round 2

- AUDIT-001 through AUDIT-003 reproduced in Chromium as BUG-001 through BUG-003.
- AUDIT-004 remained in the stylesheet and is tracked as VISUAL-001.
- BUG-004 was found during the browser console check.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `161436`. The local evidence is `factory/build/dyn_certify/161436/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `contacts → 0 → name`.
