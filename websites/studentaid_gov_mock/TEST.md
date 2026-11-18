# StudentAid.gov Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5518  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested | 14 |
| Seed workflows tested | 3 |
| ✅ Seed workflows passed | 3 |
| ❌ Seed workflows failed | 0 |
| ⚠️ Seed workflows skipped | 0 |

The route count includes aliases and the unknown-route recovery view. The tests ran in Chromium on Windows PowerShell with Node 24.

## Commands

- `npm run build` rebuilt the production bundle.
- Both browser runs reused the existing site Vite listener at `http://localhost:5518`.
- `node test_acceptance.mjs` passed the workflow suite with the installed Playwright from `PILOT_PLAYWRIGHT`.
- `node test_acceptance.mjs --built` also passed. Chromium loaded the built HTML and assets from `dist/` with SPA fallback and used the same localhost state middleware for `/state`, `/post` and `/go`. Docker runtime certification is assigned to the parent runner.
- `node .vite/ui-review.mjs` verified additional interactions, took local screenshots and checked state API isolation and reset.
- The runners, Vite logs, screenshots and local state fixtures are under gitignored site paths.

## ✅ Passing Tests

### Workflow results and Harbor assertions

The default session verified 18 action POSTs. Each action emitted a single
`set_current`, kept its `initial_state` unchanged, modified only the expected
top-level collection and exposed the resulting collection at
`state_diff.<collection>.modified`. Fresh boot submitted one baseline `set`.

| Workflow | Browser result | Verified persisted fields |
| --- | --- | --- |
| FAFSA start, resume and submit | Grouped eight years, filtered by status and searched by year. Opened a seeded draft with edition history. Started 2026–27, checked validation and first-error focus, saved and exited, reopened the draft and reloaded. Searched by federal school code, added and removed a school, recorded student and parent consent and signatures, and reopened the receipt through My Activity. | `fafsaForms[]` gained one draft with its own ID and group, award year, revision, actor, timestamps and initial step. Subsequent saves updated the same ID’s `answers`, `schoolIds`, `contributors`, `lastSavedStep` and `updatedAt`. Submission set `status: in_review`, `submittedAt`, `answers.signedAt` and the signed parent record. |
| FAFSA correction | Opened the processed 2025–26 form and its eligibility estimate. Started and reopened a correction from the original edition, changed income and submitted. | `fafsaForms[]` gained a draft with the original `groupId`, incremented `revision`, `previousFormId`, copied answers and schools, and cleared signature and summary. Submission updated the same revision and preserved every previous record. |
| Loans and acknowledgment | Combined status, servicer and ID filters and changed sort order. Opened loan terms and current plan after reload, reviewed positive balances, signed 2026–27, reloaded and reopened the existing receipt for that year. | `loanAcknowledgments[]` gained one receipt with `awardYear`, `status: completed`, actor, exact `loanIds`, `loanCount` and the summed `principalBalance`, `accruedInterest`, `totalBalance`, `signedAt` and `createdAt`. |
| Repayment comparison | Selected two loans at different servicers, entered income and family size, sorted estimates and saved a named estimate. Reloaded the snapshot. | `repaymentScenarios[]` gained one saved record with name, actor, timestamp, two loan IDs, count, numeric `inputs` and `estimates[]` keyed by plan. Expected fixed-rate amortization and income-share results matched. |
| Income-driven repayment request | Started from the saved comparison, chose one servicer cohort, used prefilled inputs, saved and exited, reopened from My Activity, reloaded, signed and submitted. | `repaymentRequests[]` gained one draft with plan, servicer, cohort loan IDs, scenario ID, actor, timestamps and initial step. Save and submit updated `requestType`, `inputs`, `lastSavedStep` and `updatedAt` on the same ID. Submission set `status: in_review`, `signedAt` and `submittedAt`. The loan collection kept its original enrolled plans. |

### Navigation and controls

- **`/`, `/dashboard`, `/my-activity`** — Opened the overview card destinations and recent activity, verified keyboard skip-to-content and page-heading focus, returned home through the wordmark, and cleared the activity filter.
- **`/fafsa`, `/fafsa/:id`** — Verified hover feedback, opened and closed the year picker, opened an existing year from the picker, navigated to a historical edition and moved backward by button and progress step. The wizard focused the destination headings.
- **`/my-loans`, `/my-loans/:id`, `/loan-acknowledgment`** — Cleared a no-result loan search, followed the detail link to repayment, verified signing required both checkboxes, switched to a previously acknowledged year, and reopened its receipt. Returning to the default award year displayed unchecked consent and signature controls.
- **`/repayment`, `/repayment/scenarios/:id`, `/idr/:id`** — Validated an empty loan selection, selected all loans, calculated a comparison, changed an input to clear the estimate, opened a saved comparison from the list and navigated backward on a draft request.
- **Unknown path** — Followed the recovery link to the account overview. The supplemental browser session ended with zero `set_current` requests and an empty `/go` diff.

### Injected state and runtime

| Check | Result |
| --- | --- |
| Empty arrays, aliases, unknown paths and missing IDs | PASS. Opened and hard-reloaded all route families with usable empty or recovery views. Injected arrays stayed empty. |
| Minimal records and unresolved joins | PASS. Missing school, plan, loans and servicer references rendered. A stored estimate reopened by its snapshot label. An unresolved draft request disabled progression. A $1,200 zero-rate loan over 120 months produced $10 per month and $1,200 total. A custom injected top-level key survived saving. |
| Large injected arrays | PASS. Displayed and searched 350 loans. Grouped 350 same-year FAFSA editions into one current entry while retaining all editions in My Activity. |
| Isolation and read-only behavior | PASS. Five fresh session IDs per run. SPA links and reloads kept the session ID. Filters, sorts, calculations, direct loads and idle viewing emitted no `set_current`. An injected boot can show default fields added to the baseline. |
| Console, network and mobile | PASS. No page errors, browser console errors, or external requests or WebSockets. Dashboard, loans, FAFSA detail and repayment had no horizontal overflow at 390 px. Inspected the original CSS dashboard art at 1440 px. |

### Audit rerun

Both Playwright runs passed after the audit fixes. All record-creation paths
ran with `crypto.randomUUID` disabled to exercise compatibility with HTTP
mock domains. On an injected FAFSA draft, an unavailable school blocked
progression with zero writes. Replacing the school persisted `schoolIds` and
preserved `answers.annualIncome: null` through two saves. Editing the parent
name set `contributors[0].status` to `pending` and removed its `signedAt`.
An archived repayment estimate with no eligible servicer cohort disabled Apply
and emitted no write.

A separate localhost API run passed `/post` with `set`, `set_current`, and
`reset`, and verified `/state`, `/go`, session isolation and preservation of
the first baseline. The reset restored that baseline and cleared the diff.
The site copy of `dataManager.js` matched the template byte for byte.

## ❌ Bugs for Dev Agent

No open functional or visual bugs were observed in the tested flows.

## Visual Alignment Feedback

Reviewed ten local Chromium captures against the site's original design in [DESIGN.md](DESIGN.md). Verified the text wordmark, account rail, cobalt overview panel and original CSS artwork, workflow cards, table layout and wizard progress. The acceptance suite also checked responsive overflow at 390 px.

## Round History

### Round 1 → Round 2

- Dev and built-bundle acceptance passed again after the audit fixes. The additional controls, focus, API and visual checks passed.
- Docker dynamic certification is pending with the parent runner.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `136900`. The local evidence is `factory/build/dyn_certify/136900/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `schools → 0 → name`.
