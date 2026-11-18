# HealthCare.gov Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5514  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
|---|---:|
| Routes tested | 14, including the fallback and both eligibility URLs |
| Elements tested | 27 grouped interaction and state checks |
| ✅ Passed | 27 |
| ❌ Failed | 0 |
| ⚠️ Skipped (out of scope) | 0 in local QA |

Node Playwright and Chromium ran against localhost with synthetic accounts. The main run used SID `qa-health-1795000107734`. Desktop and 390 px mobile checks passed with no browser console errors, page errors or external requests in the main workflow. `npm run build` passed with two React Router bundle warnings about the `use client` directive. The parent runner handles Docker certification.

---

## ✅ Passing Tests

- **`/` and `/applications`**: Account shell, brand link, keyboard skip link, primary-action hover, latest application, coverage receipt link and next-step links worked. The applications list showed 30 records in newest-updated order. Reference and household-name search, year and status filters, and no-match rendering worked.
- **`/applications/new`, `/applications/:applicationId` and `/applications/:applicationId/edit`**: Rejected invalid coverage, ZIP, contact, household, income and attestation values. Created a draft, saved contact details, reopened the draft at the correct step after reload, and verified saved contact values using Back. Added and removed household members, selected one of two members for coverage, saved zero income, and exercised each review edit link. Saving a ZIP edit returned to review. Submitting twice produced one result.
- **`/applications/:applicationId/eligibility[/:resultId]`**: Submission confirmation showed the application reference, eligible member and sample monthly credit. The current result, historical result and plan shopping links worked across direct loads and reloads.
- **`/plans` and `/applications/:applicationId/plans`**: Read-only catalog and application entry links worked. Shopping showed year, application context, and after-credit prices. Plan and insurer search, metal and network filters, both sort modes, two- and three-plan comparison, the three-plan cap, hide, remove and clear worked.
- **Plan detail, review and receipt**: Detail and review showed plan costs, covered member and effective date. Back and Cancel returned to the expected views. Confirming saved one receipt with `pending_first_premium`. Reconfirmation for the same eligibility returned that receipt. A separate zero-premium fixture capped the applied credit at gross cost and saved status `confirmed`.
- **`/applications/:applicationId/report-income`**: Rejected invalid amounts, unchanged amounts, a future date and a missing source. Review displayed both sets of amounts, and Back and Cancel preserved saved state. Submission produced updated eligibility and preserved the prior plan and its captured prices. A repeat of the same revision was rejected. An old review became unavailable, and confirming a plan against the new result recorded the replacement. Application history linked both the earlier eligibility and the prior receipt.
- **Harbor and fallbacks**: Confirmed `/state` and `/post` boot behavior through Chromium, `/go` baseline stability, a single whole-state `set_current` per successful business action, session isolation, reset, SID propagation, unknown and missing-record routes, empty states, a sparse single application with broken references, and injected lists of 350 applications and 250 plans. A write in the sparse fixture retained an unrelated injected key and the pre-existing records.

### SEED workflow state changes verified through `/go`

Each row compares `current_state` immediately before and after the action. The corresponding collections appeared under `state_diff`, and `initial_state` stayed identical to the baseline. Updates also set `applications[].updatedBy` to `acct-avery`, the same value already present, so it was verified in the whole-state payload and snapshot without appearing as a value difference.

| SEED workflow and action | Exact observed state changes |
|---|---|
| Applications · Start draft | Appended `applications[]` with `id`, `accountId`, `coverageYear`, `stateCode`, `zipCode`, `status: draft`, `householdMembers: []`, `lastCompletedStep: coverage`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`. |
| Applications · Save contact | Changed `applications[].contact.{fullName,email,phone}`, `lastCompletedStep` to `contact`, and `updatedAt`. |
| Applications · Save household | Changed `applications[].householdMembers` with `id`, `fullName`, `relationship`, `birthDate` and `requestsCoverage` for each member, `lastCompletedStep` to `household`, and `updatedAt`. |
| Applications · Save income | Changed `applications[].income.{monthlyAmount,annualEstimate}` to numeric zero, `lastCompletedStep` to `income`, and `updatedAt`. |
| Applications · Edit coverage from review | Changed `applications[].zipCode` and `updatedAt`. The furthest completed step stayed `income`. |
| Applications · Submit | Changed `applications[].status` to `submitted`, set `submittedAt`, `latestEligibilityResultId`, `lastCompletedStep: review` and `updatedAt`. Appended `eligibilityResults[]` with `id`, `applicationId`, `trigger: initial_application`, `coverageYear`, `status`, `eligibleMemberIds`, `annualIncomeEstimate`, `monthlyTaxCredit`, `createdAt`, `createdBy`. The credit was $220 and only the member requesting coverage was eligible. |
| Plan selection · Confirm | Set `applications[].selectedPlanSelectionId` and `updatedAt`. Appended `planSelections[]` with `id`, `applicationId`, `planId`, `eligibilityResultId`, `coveredMemberIds`, `status`, `effectiveDate`, `grossMonthlyPremium`, `appliedMonthlyTaxCredit`, `netMonthlyPremium`, `createdAt`, `createdBy`. |
| Income updates · Submit | Changed `applications[].income.{monthlyAmount,annualEstimate}` from $0/$0 to $5,000.25/$60,003 and updated `latestEligibilityResultId`, `lastResubmittedAt` and `updatedAt`. Appended `incomeUpdates[]` with `id`, `applicationId`, `previousEligibilityResultId`, `eligibilityResultId`, `status: submitted`, `previousIncome`, `newIncome`, `effectiveDate`, `source`, `createdAt`, `createdBy`. Appended the same eligibility fields as initial submission with `trigger: income_update` and an additional `incomeUpdateId`. The new credit was $150. The prior result and all plan selections retained their existing values. |
| Plan selection · Confirm replacement | Changed `applications[].selectedPlanSelectionId` and `updatedAt`, appended a selection with the same record fields and new eligibility ID, and changed only `status: replaced`, `replacedAt` and `replacedBySelectionId` on the prior selection. |
| All three workflows · Read-only actions | No state changes or POSTs for idle, navigation, reload in the same context, typing, filters, comparisons, validation failures, Back, Cancel, stale review or receipt reuse. |

---

## ❌ Bugs for Dev Agent

No open bugs in the tested flows.

## Visual Alignment Feedback

Reviewed local screenshots of the original account interface against `DESIGN.md`. The warm canvas, dark text-branded masthead, coverage panel, form progress rail, comparison and receipt layouts rendered at desktop size. At 390 px the navigation stayed usable, the sort label fit, and plan comparison scrolled inside its own region with no horizontal page overflow. Screenshots and the runner are in the site's gitignored `.scratch/` directory.

---

## Round History

### Round 1 → Round 2

- BUG-001 · P0 · Chromium requested the missing `favicon.ico` and logged a 404. Added a local empty icon declaration and verified clean console output on rerun.
- BUG-002 · P2 · The 390 px plan sort control clipped the selected option. Spanned both mobile columns and verified the full label was visible.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `140112`. The local evidence is `factory/build/dyn_certify/140112/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `applications → 0 → accountId`.
