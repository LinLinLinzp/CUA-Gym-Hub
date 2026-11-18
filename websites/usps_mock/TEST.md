# USPS Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5532  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
|---|---:|
| Routes tested in the navigation sweep | 19 |
| Interaction and runtime check groups | 23 |
| ✅ Passed | 19 |
| ❌ Failed | 4 |
| ⚠️ Skipped (out of scope) | 0 |

Installed Node Playwright from `PILOT_PLAYWRIGHT` drove Chromium against the production build. `npm run build` passed. The existing Vite preview served the updated build and Harbor middleware on port 5532. A new source-mode server could not bind because preview already held the port. The previous run also recorded a Windows dependency optimizer access denial in source mode. Browser traffic for the workflow suite stayed on localhost. The parent runner owns Docker dynamic certification.

## ✅ Passing Tests

### SEED workflows and persisted state

These results came from `/go?sid=usps-dev-mwm45hob` after the corresponding browser actions. Action timestamps are `2026-11-18T17:00:00.000Z` and actor fields on new writes are `account-001`.

| Workflow | Browser route | Fields observed via `/go` |
|---|---|---|
| Submit change of address | `/change-of-address/new` | Appended `changeOfAddressRequests[coa-8b35bece53fab1e005]` with `id`, `createdAt`, `createdBy`, `status: scheduled`, `confirmationCode: 6117915979238603`, `moveType: family`, `forwardingType: temporary`, `moverName`, `contactEmail`, `oldAddress`, `newAddress`, `startDate: 2026-12-01`, and `endDate: 2026-12-16`. The destination was 28 Birch Loop. Double activation produced one write and one record. |
| Edit change of address | `/change-of-address/coa-8b35bece53fab1e005/edit` | Updated the same record's `newAddress.line1` to 90 Juniper Place and `endDate` to `2026-12-22`. Added `updatedAt` and `updatedBy`. |
| Cancel change of address | `/change-of-address/coa-8b35bece53fab1e005` | Keep request made zero writes. Confirming changed `status` to `cancelled` and set `cancelledAt`, `cancelledBy`, `updatedAt`, and `updatedBy`. Reload retained the reference and SID. |
| Schedule Hold Mail | `/hold-mail/new` | Appended `holdMailRequests[hold-acca749ef23ca76f11]` with `id`, `createdAt`, `createdBy`, `status: scheduled`, `confirmationCode: HM-A9C5A993A098`, prefilled `address` at 214 Alder Loop, Unit 4B, `startDate: 2026-11-20`, `endDate: 2026-11-23`, `durationDays: 4`, and `deliveryMethod: post_office_pickup`. Pickup appeared in review and confirmation. |
| Edit Hold Mail | `/hold-mail/hold-acca749ef23ca76f11/edit` | Updated `startDate` to `2026-11-21`, `endDate` to `2026-11-25`, `durationDays` to 5, and `deliveryMethod` to `carrier_delivery`. Added `updatedAt` and `updatedBy`. The original dates could overlap the edited dates on the same record. |
| Cancel Hold Mail | `/hold-mail/hold-acca749ef23ca76f11` | Changed `status` to `cancelled` and set `cancelledAt`, `cancelledBy`, `updatedAt`, and `updatedBy`. The detail still displayed the confirmation. |
| File a new package claim | `/claims/new` | Appended `packageClaims[claim-9051703950a40b8a9a]` with creation metadata, `status: submitted`, `confirmationCode: CL-76BE68EAA296`, `trackingNumber: 94001111222233334444`, `mailingDate: 2026-11-12`, `mailService: priority_mail`, `claimantRole: recipient`, `reason: damaged`, `senderAddress`, `recipientAddress`, and `submittedAt`. The two `items` totaled `claimAmount: 58` in `currency: USD`. The `evidence` entries contained IDs, kinds, names, MIME types, and 19-byte sizes for invoice.pdf, insurance.pdf, and photos.png. |
| Save, resume, and file a draft | `/claims/new`, `/claims/claim-db01a6c75562dc3f20` | Appended a draft to `packageClaims` with creation metadata, `trackingNumber: XX441100001122`, `status: draft`, and `claimAmount: 0`. Two saves updated the same ID with `mailingDate`, `mailService`, `reason`, addresses, `items`, `evidence`, `claimAmount`, `updatedAt`, and `updatedBy`. The form restored the value.pdf metadata on resume. Filing preserved its ID and creation timestamp and set `status: submitted`, `confirmationCode: CL-23840E93B117`, `claimAmount: 24.99`, `submittedAt`, and update metadata. |
| Reserve a PO Box | `/po-boxes/new` | One write appended `poBoxes[box-925928d8b666d0b257]` with creation metadata, `status: reserved`, `confirmationCode: PB-BA9DEAD25B91`, `officeId: office-001`, `size: s`, `termMonths: 3`, `autoRenew: true`, `applicantName`, `applicantEmail`, `mailingAddress`, and `termsAccepted: true`. It lowered `postOffices[office-001].inventory.s.available` from 3 to 2 and appended `poBoxTransactions[pobox-txn-882f93036e241a56c1]` with creation metadata, linked box and office IDs, `type: reservation`, `status: paid`, `amount: 40`, `currency: USD`, `quantity: 1`, `termMonths: 3`, and `paymentMethod: account_payment`. Confirmation showed pickup instructions. |
| Renew an active PO Box | `/po-boxes/box-001/renew` | Updated `poBoxes[box-001]` with `expiresOn: 2028-02-01`, `termMonths: 12`, `autoRenew: false`, `updatedAt`, and `updatedBy`. Appended `poBoxTransactions[pobox-txn-35ec2c37ab10649246]` with creation metadata, linked box and office IDs, `type: renewal`, `status: paid`, `amount: 148`, `currency: USD`, `quantity: 1`, `termMonths: 12`, `paymentMethod: account_payment`, `previousExpiresOn: 2027-02-01`, and `nextExpiresOn: 2028-02-01`. The catalog matched its pre-renewal state. |

### Validation and runtime

- **Home and service navigation** — Verified desktop wordmark, home anchor, keyboard skip link, recent requests, service navigation, status filters, ID search, create links, detail links, breadcrumbs, missing links, and hard reloads. The mobile menu worked by pointer and retained the SID. Print clicks invoked the browser print handler. Print emulation kept the confirmation reference visible and hid the action controls.
- **Move and hold forms** — Rejected identical normalized move addresses, temporary forwarding under 15 days, same-day hold start, a two-day hold, and an insufficient gap between holds. Rejected submissions produced zero mutation posts.
- **Claim forms** — Rejected invalid tracking, a lost claim below the waiting period for each tested service class, and missing evidence. Verified adding and removing item rows and the exact cents-based total.
- **PO Box forms** — Verified ZIP, city/state and name search, no matches, pagination from 6 to 12 locations, unavailable size disabling, selection persistence through Back, required terms acceptance, and required automatic renewal for a 3-month term. A longer term allowed the preference to be toggled.
- **Harbor persistence** — Each of the six seed collections contained 24 records. The workflow writer sent one baseline `set` and 13 accepted-action `set_current` requests. The idle tab in another browser context sent only its baseline `set` and issued zero mutation posts, including after reload. The baseline stayed intact. The final diff contained exactly the six collection keys touched by the workflows. Navigation, searches, filters, term selection, and print produced an empty diff in the route sweep.
- **SID and injected data** — A separate SID retained defaults and an empty diff. Reset restored the original baseline and cleared the diff. Injected empty collections, single partial move and claim records, 380 holds, and missing office relationships rendered. Renewal from January 31 reached April 30. Renewal from an elapsed expiration used the frozen current date. Unrelated injected keys survived both renewal writes.
- **Build and static assets** — The production build passed, local routes rendered without console errors or page exceptions, and the workflow run made zero off-origin requests. The SHA-256 of `src/utils/dataManager.js` matched the template. Vite imports the shared state middleware directly.

## ❌ Bugs for Dev Agent

### BUG-001 · P0 · A stale tab overwrites an accepted cancellation

| Field | Value |
|---|---|
| Route | `/hold-mail/hold-001` and `/hold-mail/hold-002` |
| Element | Cancel mail hold and Confirm cancellation |
| Action | Hydrate both tabs in separate Chromium contexts with the same SID. Confirm cancellation in the first, wait for its successful POST, then confirm in the second. |
| Expected | Both hold records remain cancelled. |
| Actual | Both tabs report success. `/go` returns `hold-001.status: scheduled` and `hold-002.status: cancelled`. |
| Console errors | None |
| Fix hint | Reconcile each user action against the latest authoritative state before saving, and account for overlapping writes in the shared commit path. |

### BUG-002 · P0 · Competing claim actions create two records

| Field | Value |
|---|---|
| Route | `/claims/new` |
| Element | Save draft and File claim |
| Action | Complete the claim review, then activate both buttons in the same browser turn. |
| Expected | A single action writes one claim. |
| Actual | Two `set_current` requests succeeded. `/go` contains one draft and one submitted record with the same tracking number. |
| Console errors | None |
| Fix hint | Give draft saving and final filing a shared submission guard through navigation. |

### BUG-003 · P1 · Forward Tab skips the expanded mobile menu

| Field | Value |
|---|---|
| Route | `/` at 390 px |
| Element | Menu |
| Action | Focus Menu, press Enter, then press Tab. |
| Expected | The first visible account navigation link receives focus. |
| Actual | Focus jumps to Explore mail services. |
| Console errors | None |
| Fix hint | Align the mobile navigation's focus order with the trigger and restore focus to the trigger when the menu closes. |

### BUG-004 · P2 · Focus on route load scrolls the account bar offscreen

| Field | Value |
|---|---|
| Route | `/hold-mail` and `/claims/new` at 390 px and 1440 px, plus `/` at 390 px |
| Element | Account bar, including the mobile Menu button |
| Action | Open the route directly in Chromium and wait for hydration. |
| Expected | The route opens at the top with the account bar in view. |
| Actual | The page starts at `scrollY: 66` with the account bar entirely above the viewport. Mobile users must scroll up to reach Menu. |
| Console errors | None |
| Fix hint | Focus the route landmark with `preventScroll` so focusing it respects the explicit scroll reset. |

## Visual Alignment Feedback

Compared the local desktop and mobile screenshots with the site's original `DESIGN.md`. The text masthead, local line artwork, desktop rail, card layout, history, and form styles matched the design direction. At 390 px, home, history, and the PO Box catalog fit without horizontal scrolling. BUG-004 affects initial account bar visibility.

## Round History

### Round 1 → Round 2

- All four SEED workflows passed again, including their edits, cancellations, draft resume, and renewal.
- AUDIT-001 through AUDIT-003 reproduced as BUG-001 through BUG-003.
- BUG-004 was added after desktop and mobile viewport checks.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `150476`. The local evidence is `factory/build/dyn_certify/150476/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `changeOfAddressRequests → 0 → createdAt`.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Fixed and retested.** The original two-context browser case retained both Hold Mail cancellations and cancellation metadata after the second preloaded context wrote.
- **AUDIT-002 · Fixed and retested.** The two same-turn activation orders each produced exactly one write and one claim. The first action determined whether the claim stayed draft or was filed. Both entry points use the same submission guard.

Docker dynamic certification run `168412` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
