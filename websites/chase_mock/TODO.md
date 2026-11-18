# Chase — TODO

> Status: READY FOR HARBOR CERTIFICATION  
> Last updated by: dev agent, 2026-11-18  
> Research: `assets/README.md` | Data model: `assets/data_model.md` | Design: `DESIGN.md`

## Status legend

- `[ ]` Not started
- `[~]` In progress
- `[x]` Done

## P0 — Core shell and runtime

- [x] **React/Vite scaffold.** Use the target directory as the project root, include `package-lock.json`, and configure the dev listener on port `5332` with `strictPort`. Set the document title to `Chase`. Use system fonts and original local visuals per `DESIGN.md`. Ensure `npm run build` succeeds and the built `dist/` uses the same state endpoints as dev.
- [x] **Navigation and routes.** Build the shell in `DESIGN.md` with a persistent Accounts, Transfers, Bill pay, Disputes, and Alerts navigation. Route `/` and `/accounts` to the overview, `/accounts/:accountId` and `/accounts/:accountId/transactions/:transactionId` to account and transaction detail, `/transfers` to transfer entry/activity, `/bill-pay` to payees/payment activity, `/disputes` and `/disputes/:disputeId` to case list/detail, and `/alerts` to preferences. Put every route inside the providers it uses. Preserve `?sid=` on navigation, including back links and programmatic redirects, and use `withSid()` for links outside the router. Supply a recovery link for missing IDs and unknown pages. Navigation and form drafts write no business records.
- [x] **Harbor state wiring.** Copy `templates/dataManager.js` unchanged to `src/utils/dataManager.js`. Import `stateApi(createInitialData)` from `../../templates/state-api.js` into `vite.config.js`; the API owns `/state`, `/post`, and `/go`. In a neutral loading view, await `loadState('chase_mock', createInitialData)` before rendering routes. Send a complete state snapshot once per committed user action via a single store commit path using `saveState`. Keep derived values and presentation state out of that path. Accept array replacement and object merging, missing optional fields, empty collections, unresolved references, and hundreds of rows. Render long histories with pagination and stable sort. Boot, navigation, canceled drafts, validation failures, and idle time produce no `set_current` writes.

## P1 — Required workflows

- [x] **Accounts.** Show active accounts first with product, nickname (when present), masked last four, balance label, and amount. Offer an archived account filter. Account detail shows available balance or available credit as applicable, recent activity, and a searchable list with merchant/description search, status/category and date range filters, newest-first order, and a transaction detail link. On account detail, open an **Edit nickname** form with the current value, trim input, allow clearing, and save explicitly. Write `accounts[].nickname`, `updatedAt`, and `updatedBy` for that account only. Reading/searching/filtering writes no records. From transaction detail expose **Report a problem** for eligible charges and link to the existing case when applicable.
- [x] **Transfers.** Provide **From account**, **To account**, **Amount**, **Transfer date**, and optional **Memo**, followed by review and explicit confirmation. Offer open checking/savings accounts, exclude the selected source from destinations, and reject invalid amounts, insufficient available funds, and dates before today under the runtime clock. Confirm today’s transfer as `completed`, append `transfers[]`, update both deposit accounts’ `currentBalance`/`availableBalance` and audit fields, and append two signed, linked `transactions[]` in one save. Confirm a future transfer as `scheduled` and append `transfers[]` alone. Show confirmation ID and searchable/filterable history. Confirm cancellation of a scheduled transfer by updating that `transfers[]` record’s `status`, `cancelledAt`, and `cancelledBy`. Scheduled rows do not execute as time passes.
- [x] **Bill pay.** Provide searchable payees, **Add payee**, **Schedule payment**, and payment activity. Save the add form with trimmed name, category, optional nickname, and synthetic account reference, appending an active `payees[]` record with masked reference, actor and timestamp. Schedule from an open checking account with positive amount and send date today or later. Show payee, source, amount, and send date on review, then write a `billPayments[]` record with `status: 'scheduled'` and linked IDs on confirm. Show confirmation ID and status in payment activity. Confirm cancellation of a scheduled bill payment by updating `billPayments[].status`, `cancelledAt`, and `cancelledBy`. Payee lookup and payment scheduling leave balances unchanged.
- [x] **Disputes.** Start from **Report a problem** in transaction detail or the disputes page’s eligible-transaction picker. For a posted card or checking purchase, show transaction context and collect reason, disputed amount (default to the charge magnitude), and a description. Validate positive amount up to the charge magnitude and prevent a second case for the same transaction while a case remains open. Review, submit, and show the case ID. Append `disputes[]` with `status: 'submitted'`, account/transaction IDs, reason, amount, description, actor and timestamp. Show searchable open/closed cases and case details. Pending charges and transfers have no dispute submit path. Tracking does not change case status.
- [x] **Alerts.** Start with an account picker and show applicable alert types with enabled state, email/text/push checkboxes, and dollar threshold when relevant. Support low balance and deposit posted for deposit accounts, payment due for cards, and large purchase for either. Validate at least one selected channel when enabled and a positive threshold for enabled threshold alerts. Explicitly save a rule by inserting or updating one `alertRules[]` record for that account and type. Write `enabled`, `channels`, `thresholdAmount`, `updatedAt`, and `updatedBy`, setting identity, `createdAt`, and `createdBy` on insert. Turning a rule off preserves its identity and creation fields. Show a save confirmation and restore persisted settings after reload.

## P2 — Secondary features

No P2 features are needed for this seed.

## Data seed

- [x] Implement `src/data/seed.js` with fixed IDs, English synthetic names and descriptions, and deterministic balances, dates and relationships. Follow the counts, representative records, and eligibility examples in `assets/data_model.md`. Ensure frequent merchants, multiple status values, and distinct amounts make search and filter tests meaningful. Derive labels for relative dates from `new Date()` at render time.

## Acceptance and handoff

- [x] Maintain `SCHEMA.md` in the site root with every top-level key and record shape plus an **Observable State Changes** table mapping each mutation to exact fields. Keep it synchronized with code.
- [x] Confirm `npm run build` and use the Chromium/Node Playwright installation at `PILOT_PLAYWRIGHT` against localhost port `5332`. On Windows, start the persistent server with `Start-Process -WindowStyle Hidden`, working directory set to the site, and the absolute Vite entry point passed to Node. Keep test runners gitignored or remove them when done.
- [x] In `TEST.md`, show a fresh-session baseline, then verify nickname save and clear, immediate and scheduled transfer plus cancellation, payee creation and bill payment scheduling plus cancellation, dispute submission and tracking, and alert enable/edit/disable. Compare `/go?sid=…` before and after each action against the fields above. Reload the affected deep links, verify separate sessions, exercise empty/single/large injected worlds, and check that invalid inputs, canceled reviews, and an idle browser issue no `set_current`. The parent runner owns Docker dynamic certification and commits.

## Out of scope

Authentication, real account access, external money movement, recurring payments/transfers, automated settlement, real notifications, and production service integrations. The site opens as a signed-in synthetic customer.
