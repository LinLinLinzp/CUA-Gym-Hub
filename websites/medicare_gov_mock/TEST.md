# Medicare.gov Mock — Test Report

> Round: 2  
> Date: November 18, 2026  
> Server: http://localhost:5513  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | --- |
| Routes tested | 11, including the unknown-route fallback |
| Elements tested | Navigation, forms, filters, buttons, links, selection controls and result lists |
| ✅ Passed | 3 required workflows |
| ❌ Failed | 2 usability findings and 2 visual findings |
| ⚠️ Skipped (out of scope) | Real sign-in and production services |

The installed Node Playwright and Chromium passed the same workflow suite on Vite dev and Vite preview of the production build. Both ran sequentially on localhost port 5513 with synthetic state and isolated session IDs.

---

## ✅ Passing Tests

### SEED workflows and state changes verified through GET /go


| Workflow | Browser actions verified | Observable addition in GET /go |
| --- | --- | --- |
| Plan compare | Started at member ZIP 53703 and year 2027. Tested invalid and unserved ZIPs, ZIP 53704, type, drug coverage, star rating, carrier search and both sorts. Selected from cards and details, kept selections on browser Back, hit the three-plan limit, removed and re-added a plan, previewed all seven comparison rows and reopened the save from its direct URL and workspace. | Exactly one planComparisons record with id, actorId, createdAt, ordered planIds [plan-2027-53703-ma-01, plan-2027-53703-ma-03, plan-2027-53703-ma-02], zipCode 53703, planYear 2027 and status saved. |
| Claims | Checked newest-first order, Part A and status filters, an invalid date range, a one-day range, service and claim-reference search and a two-line claim. Double-clicked Mark as reviewed, checked the trimmed note after reload and verified list status. Reviewed a partially populated claim with a blank note. | Exactly one claimReviews record for the main session with id, actorId, createdAt, claimId claim-001, status reviewed and note “Matched the clinic statement.” The blank-note case omitted note. All original claims remained intact. |
| Enrollment | Started from Find a plan and Enroll. Checked required fields and focus, canceled a draft, re-entered through a direct link, edited from review and submitted. Checked confirmation after reload and in filtered history. Verified duplicate prevention, an out-of-area plan, a closed enrollment window and the Advantage versus prescription drug Part A/B rules. | Exactly one enrollments record with id, planId plan-2027-53703-ma-01, memberId and actorId member-001, planName Cedar Valley Choice HMO, planYear 2027, zipCode 53703, enrollmentPeriodCode open_enrollment, reason change_coverage, effectiveDate 2027-01-01, contact.email and contact.phone, attestationAccepted true, status submitted, confirmationNumber and createdAt. Account coverage and existing requests remained intact. |

- Checked UUID-shaped record IDs, matching actor IDs, ISO UTC timestamps and the confirmation number format. Compared all six state collections and verified that the main session sent one baseline set followed by exactly three set_current requests.
- Checked fresh-session isolation, direct links, reload, browser Back, sid preservation and fallbacks for unknown routes and missing records. Verified a saved comparison stayed readable with an unavailable linked plan.
- Injected empty collections, single partially populated records and worlds with 240 plans, 240 claims and 240 enrollment requests. Checked table scrolling without page overflow at a 360 px viewport and reviewed desktop and mobile overview captures.
- Observed only localhost requests and no browser page errors. Default and large-world tabs each produced zero idle POSTs during a two-second observation after baseline. Browsing, validation, filters, form edits, comparison preview and cancel produced no business writes.
- Confirmed the data manager has the same SHA-256 hash as the root template. Confirmed deterministic seeds with 36 available plans, 24 archival plans, 42 claims and 24 historical requests.
- npm run build passed. Vite emitted non-fatal React Router module-directive warnings.

Additional browser checks confirmed that the keyboard skip link focused the main content, the wordmark showed hover feedback and returned home, and the recent claim and coverage links opened their expected pages. Provider search and the enrollment coverage-year filter worked. An isolated reset returned the injected state to its baseline. The supplemental suite reported no console errors.

---

## ❌ Bugs for Dev Agent

### BUG-001 · P1 · Mobile comparison controls sit below the full catalog

| Field | Value |
| --- | --- |
| Route | /plans |
| Element | Comparison tray and Compare 2 plans link |
| Action | Select the first two plans at a 360 × 780 viewport. |
| Expected | Reach the comparison action, selected names and removal controls near the current list position. |
| Actual | Chromium measured the link about 5,696 px below the viewport top in the 18-plan catalog and 76,169 px below it in a 240-plan injection. Scrolling to the tray and activating the link still opened the comparison. |
| Console errors | None |
| Fix hint | Keep the selected-plan controls reachable while browsing on a narrow screen. |

### BUG-002 · P1 · Keyboard focus drops when enrollment changes steps

| Field | Value |
| --- | --- |
| Route | /enrollment/apply/:planId |
| Element | Review enrollment request and Back to edit |
| Action | Complete the required fields and activate each button with Enter. |
| Expected | Move focus to the new step heading or first relevant control. |
| Actual | Both transitions showed the correct content. Chromium reported document.body as the active element each time. Invalid submission still focused the first invalid field. |
| Console errors | None |
| Fix hint | Focus the destination step after each successful transition. |

---

## Visual Alignment Feedback

Reviewed locally captured desktop and mobile layouts against DESIGN.md. The text wordmark, local illustration, navy rail, warm canvas and mint surfaces match the site's design direction.

### VISUAL-001 · P2 · Wordmark, secondary text and tray elevation

| Field | Value |
| --- | --- |
| View | Shared shell and /plans |
| Reference | DESIGN.md, Typography and Elevation |
| Mock | test-results/overview.png and computed styles for the comparison tray |
| Issue | The wordmark and secondary text use line heights of 34.5 px and 21 px. The design calls for 27.6 px and 20.3 px. The tray shadow uses alpha 0.17, while the design uses approximately 0.09. |
| Suggestion | Apply the specified type and elevation values. |

### VISUAL-002 · P2 · Claim search placeholder clips on desktop

| Field | Value |
| --- | --- |
| View | /claims at 1440 × 900 |
| Mock | test-results/claims.png |
| Issue | The search field cuts off “Provider, service or claim reference” before the last search option is visible. The field still matches all three values. |
| Suggestion | Give the hint enough room or use shorter wording. |

---

## Round History

### Round 1 → Round 2

- All three required workflows passed again on both localhost servers.
- AUDIT-001 and AUDIT-002 reproduced as BUG-001 and BUG-002.
- AUDIT-003 reproduced as VISUAL-001. The clipped claims placeholder is new as VISUAL-002.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `166540`. The local evidence is `factory/build/dyn_certify/166540/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `plans → 0 → name`.
