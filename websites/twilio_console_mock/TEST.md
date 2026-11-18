# Twilio Console Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5500  
> Tested by: playwright agent using installed Node Playwright and Chromium

WORKFLOWS: PASS

## Summary

| Metric | Result |
| --- | --- |
| Routes tested | 9 functional routes and the fallback |
| Seed workflows passed | 3 of 3 |
| Browser mutations verified against `/go` | 11 of 11 |
| Unexpected browser writes, errors, or external requests | 0 |
| Open bugs | 0 |
| Out of scope | Authentication, billing, live carriers, and other Twilio products |
| Production build | Passed |

## ✅ Passing Tests

- **Overview and navigation** — Verified the Twilio text wordmark, seeded totals, delivery chart, metric navigation, recent-message links, skip-to-content keyboard action, active navigation, breadcrumbs, fallback recovery, and SID preservation. A primary action visibly changed color on hover.
- **Numbers** — Searched by friendly name, changed type and capability filters and sorting, paginated in both directions, and reloaded a number detail. Searched inventory by country, type, area code, and capabilities. Escape canceled purchase and restored focus. Confirmed purchase, edited the number's name and both webhook URLs and methods, checked validation, and canceled then confirmed release. The released number disappeared from active inventory.
- **Messaging** — Searched services by SID, filtered by use case, paginated, canceled service creation, and checked required fields. Created a service, changed its name, use case, and webhook settings, then added, removed, and re-added its sender. Confirmed an assigned sender disappeared from the available options. Rejected an invalid recipient, sent an accepted service SMS and a queued two-segment direct SMS, and navigated from the message log to the linked service and number.
- **Logs** — Combined SID, From, To, direction, status, and inclusive UTC date filters. Opened a failed message, verified the delivery error, and reloaded and returned to the same filter context. Rejected a reversed date range, cleared filters, sorted oldest first, and paginated. Exported all filtered outbound records from page two and checked the actual CSV filename, row count, and phone number escaping. Historical messages remained after number release.
- **Injected state** — Rendered all nine functional routes with empty arrays, a single partial record per main collection, and 400 records per main collection. Checked object merge, array replacement, missing optional fields, broken relationships, an unknown top-level key, and log page 30. Verified deep links with literal percent escapes, slashes, dot segments, a reserved route name, and leading tildes.
- **Mobile** — Opened the navigation drawer at 390 px, dismissed it with Escape, and verified the table could scroll horizontally inside its panel.

## Harbor State Verification

For each mutation, Playwright waited for one successful `set_current` POST, fetched the session's `/go`, compared `current_state` with the preceding snapshot, and checked the affected keys in `state_diff`. The initial snapshot remained intact.

| SEED workflow | Action | Fields verified in `/go` |
| --- | --- | --- |
| Numbers | Purchase | Appended `phoneNumbers[]` with `id, inventoryId, phoneNumber, friendlyName, country, locality, type, capabilities, monthlyPrice, currency, status, voiceUrl, voiceMethod, smsUrl, smsMethod, actorId, createdAt, updatedAt, updatedBy`. Matched the inventory link, price, active status, and actor. The selected `availableNumbers[]` entry changed `status, purchasedNumberId, purchasedAt`. |
| Numbers | Configure | The same `phoneNumbers[]` record changed `friendlyName, voiceUrl, voiceMethod, smsUrl, smsMethod, updatedAt`. The saved `updatedBy` matched the operator. |
| Numbers | Release | The same `phoneNumbers[]` record changed `status, releasedAt, releasedBy, updatedAt`. The linked `messagingServices[]` record changed `senderNumberIds, updatedAt`. Both `updatedBy` values matched the operator. `messages` stayed intact. |
| Messaging | Create service | Appended `messagingServices[]` with `id, friendlyName, useCase, senderNumberIds, inboundMode, inboundUrl, statusCallbackUrl, actorId, createdAt, updatedAt, updatedBy`. Verified the empty sender pool and default settings. |
| Messaging | Save service settings | The new `messagingServices[]` record changed `friendlyName, useCase, inboundMode, inboundUrl, statusCallbackUrl, updatedAt`. The saved `updatedBy` matched the operator. |
| Messaging | Add, remove, and re-add sender | Each action updated `messagingServices[].senderNumberIds, updatedAt` and saved `updatedBy`. The pool contained the selected number, then became empty, then contained the same number again. |
| Messaging | Send via service and via number | Each send appended `messages[]` with `id, direction, from, to, body, phoneNumberId, serviceId, status, segments, errorCode, errorMessage, deliverySteps, actorId, createdAt`. The service send was accepted with one segment and both linked IDs. The direct send was queued with two segments and a null service ID. Both had an initial step at `createdAt`. |
| Logs | Filter, inspect, and export | Filtering and detail inspection made zero writes. Export appended `logExports[]` with `id, kind, status, filters, sort, messageIds, rowCount, fileName, actorId, createdAt`. Verified all seven filter fields, ordered IDs across pages, and the downloaded filename and row count. |

A fresh default session posted one `set` baseline. Navigation, reloads, draft edits, invalid forms, canceled dialogs, filters, and the idle period after export produced zero extra writes. The four injected sessions left the default session intact. Reset restored the baseline and emptied the diff.

## ❌ Bugs for Dev Agent

No open bugs from this round.

## Visual Alignment Feedback

Reviewed screenshots of all nine desktop views at 1440 px and the mobile logs view at 390 px against the site's original `DESIGN.md`. The shared account header, rail, plum actions, table and form cards, and contained mobile scrolling followed the design. Chromium recorded zero requests outside localhost.

## Round History

### Round 1 → Round 2

- Reverified the opaque record routing fix from AUDIT-001.
- Fixed singular result-count copy and confirmed both singular and plural counts in Chromium.
- Rebuilt successfully with `npm run build`. Docker certification and commit are handled by the parent runner.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `74396`. The local evidence is `factory/build/dyn_certify/74396/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `phoneNumbers → 0 → phoneNumber`.
