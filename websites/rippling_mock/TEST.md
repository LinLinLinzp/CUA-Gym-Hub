# Rippling Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5395  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested | 10 |
| Elements tested | 63 |
| ✅ Passed | 63 |
| ❌ Failed | 0 |
| ⚠️ Skipped (out of scope) | 0 |

The element count covers 15 business actions, 15 filters, six sorts, eight pagination controls, four dialog close controls, four breadcrumbs, four dashboard cards, four queue links, the keyboard skip link, mobile Payroll navigation, and the fallback return link. The route count covers the overview, four list views, four detail routes, and the catch-all route. Runtime checks below are additional.

## ✅ Passing Tests

`node test-results/test_workflows.mjs` and `node test-results/test_navigation.mjs` passed against Vite dev with installed Chromium from `PILOT_PLAYWRIGHT`. The suites used fresh session IDs and checked `/go?sid=…`. All browser traffic stayed on localhost. `npm run build` passed on the final source. Round 1 also verified the built preview.

## Business actions observed in /go

Each of the 15 actions below emitted one successful `set_current` POST. The suite checked stored records, relationship IDs, status, actor, timestamps, and the relevant before-and-after values. It also verified a profile edit and a payroll repair in injected worlds.

| Action | Verified state changes |
| --- | --- |
| Add employee | Appended `employees[]` with `id`, `name`, `workEmail`, `jobTitle`, `department`, `location`, `employmentType`, `startDate`, `managerId`, `status=active`, `actorId`, and `createdAt`, plus null `endDate`, `endReason`, and `updatedAt`. Appended `employeeChanges[]` with `action=created` and the initial field values in `changes`. |
| Edit employee | Changed the employee's `jobTitle` and `updatedAt`. Appended an `edited` event with the previous and next titles. |
| End employment | Set `status=terminated`, `endDate`, `endReason`, and `updatedAt`. Appended the corresponding termination event. |
| Add device | Appended `devices[]` with `id`, `assetTag`, `serial`, `model`, `category`, `condition`, `location`, `status=available`, null `assignedEmployeeId`, `actorId`, and `createdAt`. |
| Assign device | Set `devices[].assignedEmployeeId`, `status=assigned`, and `updatedAt`. Appended `deviceAssignments[]` with `action=assigned`, a null `previousEmployeeId`, and the selected `nextEmployeeId`. |
| Reassign device | Changed `devices[].assignedEmployeeId` and `updatedAt`; `status` stayed assigned. Appended `deviceAssignments[]` with `action=reassigned` and both employee IDs. |
| Unassign device | Cleared `devices[].assignedEmployeeId`, set `status=available`, and updated `updatedAt`. Appended `deviceAssignments[]` with `action=unassigned` and null `nextEmployeeId`. |
| Request time off | Appended `ptoRequests[]` with `id`, `employeeId`, `type`, `startDate`, `endDate`, `hours=16`, `note`, `status=pending`, `actorId`, and `createdAt`. Friday through Monday counted as two weekdays. |
| Approve time off | Set `ptoRequests[].status=approved` and `updatedAt`, increased matching `ptoBalances[].usedHours` by 16, and appended `ptoActions[]` with `action=approved` and `balanceDeltaHours=16`. |
| Cancel approved time off | Set `ptoRequests[].status=cancelled` and `updatedAt`, reduced `ptoBalances[].usedHours` by 16, and appended `ptoActions[]` with `action=cancelled` and `balanceDeltaHours=-16`. The final balance matched the baseline in `/go`. |
| Cancel pending time off | Set `ptoRequests[].status=cancelled` and `updatedAt` and appended `ptoActions[]` with `action=cancelled` and `balanceDeltaHours=0`. |
| Decline time off | Set `ptoRequests[].status=declined` and `updatedAt` and appended `ptoActions[]` with `action=declined`, the reason in `note`, and `balanceDeltaHours=0`. |
| Create payroll draft | Appended an off-cycle `payrollRuns[]` draft with two unique employees and exact line amounts. Stored gross 250.50, taxes 50.06, deductions 5.03, and net 195.41. Appended a creation event with both participants and those totals. |
| Edit payroll draft | Changed the second participant's `lineItems[].bonus`, `gross`, and `net`, plus `payrollRuns[].totals` and `updatedAt`. Appended `payrollActions[]` with `action=edited`, that employee in `employeeIds`, and updated `totals`. |
| Approve payroll | Checked all four reviewed totals, confirmed approval, and verified `payrollRuns[].status=approved`, `approvedBy`, `approvedAt`, and `updatedAt`. Appended `payrollActions[]` with `action=approved`, both `employeeIds`, and final `totals`. The reloaded record was read-only. |

## Runtime and interaction checks

- Checked one baseline `set` on first load and no state writes while idle. Cleared filters, sorted, paginated, switched tabs, and reviewed payroll with no writes.
- Checked case-insensitive email, asset tag, and serial collisions, management-cycle rejection, current-holder reassignment, retired inventory, weekend-only and overlapping leave, required decline reason, missing balances, invalid payroll dates, duplicate payroll participants, negative net, and unchanged employee and payroll edits.
- Opened deep links, reloaded changed records, followed missing-record return links, and confirmed router navigation retained the session ID. A separate session retained the untouched defaults.
- Exercised `/state`, `/post`, and `/go` directly. `set_current` and repeated `set` preserved the stored initial snapshot, `reset` restored the baseline with an empty diff, and a separate session had empty storage.
- Loaded empty collections, a single request, partial records and unresolved IDs, and 245 records in each main collection. An injected profile edit retained its custom record field and extra top-level data. Partial PTO and payroll actions displayed reasons where required data was absent.
- Removed an injected payroll line without an employee ID from a draft whose totals matched the remaining valid line. `/go` showed the updated `payrollRuns[].lineItems` and `updatedAt`, the original totals, and a `payrollActions[]` edit event with the run ID, actor, timestamp, and an empty `employeeIds` array. Review became available and the repaired line list survived reload.
- Verified keyboard tab switching, dialog dismissal with focus restoration, links from the approved-leave calendar, and bounded table overflow at 390 px. Reviewed local desktop and mobile screenshots.
- Verified dashboard cards, queue links, the Rippling wordmark, detail breadcrumbs, the keyboard skip link, all 15 list and tab filters, six accessible table sorts, and pagination in both directions on all four main lists. The fallback page linked back to Overview. Mobile Payroll navigation worked at 390 px. The navigation-only session reported an empty `/go` diff and no browser console errors.
- Confirmed the client state template was byte-for-byte identical to the root template. Confirmed default counts of 48 employees, 56 devices, 48 requests, 144 balances, and 26 payroll runs.

## ❌ Bugs for Dev Agent

No open issues found in this round.

## Visual Alignment Feedback

Reviewed Playwright captures of the overview, all four workspace lists and details at 1440 px, and the employee list at 390 px against the site's original `DESIGN.md`. The wordmark, CSS artwork, local icons, controls, and table containment rendered as designed.

## Round History

### Round 1 → Round 2

- Retested the audit fix for removing an injected payroll line with no employee ID. The repaired line list persisted and payroll review became available.
- Reran the workflow and Harbor checks, added navigation coverage, and recorded the SEED completion marker.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `152036`. The local evidence is `factory/build/dyn_certify/152036/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `employees → 0 → name`.
