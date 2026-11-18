# Yelp Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5319  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested | 11 |
| Workflow scenarios passed | 12 |
| Seed workflows passed | 4 |
| Failed scenarios | 0 |
| Open audit findings | 0 |

`npm run build` passed on Windows. The final Chromium run used the installed Playwright from `PILOT_PLAYWRIGHT` on the localhost dev server. An earlier round also passed against built `dist/` served by Vite preview. The dev server remains available on port 5319.

## Workflow evidence

The table uses the final dev run session IDs. Tests asserted the visible outcome and polled the JSON `/go?sid=…` endpoint after each successful action. They compared the changed fields, checked the complete world sent in the POST, and confirmed that unrelated keys retained their values.

| Session | Action and visible result | Exact fields changed |
| --- | --- | --- |
| `yelp_review_1795009592822` | Posted a five-star Juniper Hearth review from My reviews. It appeared on the account list and business page after reload. | Appended `reviews[]` with `id, userId, businessId, rating, text, status, createdAt`. Status was `published`. |
| Same review session | Write a review on Juniper Hearth opened the published review. Updating it to four stars changed the text on the business page after reload. | Same review ID. Changed `rating, text, updatedAt`. |
| Same review session | Confirmed removal with a reason. The text disappeared from both published views after reload and back navigation. | Same review ID. Changed `status, removalReason, removedAt, updatedAt`. Status was `removed`. |
| `yelp_bookmarks_1795009592822` | Created Weekend walks from Bookmarks. The collection link remained after reload. | Appended `collections[]` with `id, userId, name, status, createdAt`. Status was `active`. |
| Same bookmark session | Discovered Juniper Hearth by description, location, category, and eligibility. Saved it in Weekend walks and saw the Saved button after reload. Selecting the same collection again disabled Save place. | Appended `bookmarks[]` with `id, userId, businessId, collectionId, status, createdAt`. Status was `saved`. |
| Same bookmark session | Searched the collection and confirmed removal. The list stayed empty after reload. | Same bookmark ID. Changed `status, removedAt, updatedAt`. Status was `removed`. |
| Same bookmark session | Saved the business again. The new membership had a distinct ID and the previous membership retained its removal status. | Appended `bookmarks[]` with `id, userId, businessId, collectionId, status, createdAt`. Status was `saved`. |
| `yelp_quote_1795009592822` | Used Find a service, reviewed the Deep cleaning request for Riverbend Home Care, and submitted. The request appeared in Active and its detail survived reload. | Appended `quoteRequests[]` with `id, userId, businessId, serviceType, details, zipCode, preferredDate, status, createdAt`. The blank preferred date persisted as null and status was `submitted`. |
| Same quote session | Confirmed archive. Archived status remained after reload and the request appeared under Archived. | Same request ID. Changed `status, archivedAt, updatedAt`. Status was `archived`. |
| `yelp_reservation_1795009592822` | Used Find a table, selected a 6:30 PM Juniper Hearth slot for three guests, and confirmed. The confirmation code and detail survived reload. | Appended `reservations[]` with `id, userId, businessId, date, time, partySize, guestName, email, phone, notes, confirmationCode, status, createdAt`. Status was `confirmed`. |
| Same reservation session | Rescheduled to 7:00 PM the next day for four guests. The detail retained the original confirmation code after reload. | Same reservation ID. Changed `date, time, partySize, updatedAt`. |
| Same reservation session | Confirmed cancellation. The detail remained cancelled after reload, appeared in History, and the slot was available again. | Same reservation ID. Changed `status, cancelledAt, updatedAt`. Status was `cancelled`. |
| `yelp_atomic_1795009592822` | In a sparse world with zero collections, explicitly saved to Want to go. Reload showed the listing as saved. | One POST appended `collections[]` with `id, userId, name, status, createdAt` and `bookmarks[]` with `id, userId, businessId, collectionId, status, createdAt`. The foreign key matched the new collection ID and the injected extra key survived. |

## Additional checks

- Invalid review ratings and short text, blank removal reasons and collection names, invalid quote ZIPs and past preferred dates, and invalid reservation dates, party sizes, and emails produced inline errors without state writes.
- Rapid duplicate submissions produced one record or update per successful action. Each tested browser context sent exactly one boot baseline. Drafts, searches, sort changes, back and forward navigation, reload, and idle waiting triggered zero additional writes. Separate sessions retained independent state.
- Empty arrays, sparse and singleton records with missing references, and 350 injected listings rendered successfully. Unknown paths and missing IDs showed recovery links.
- All three sort controls reordered their lists without writes. Related businesses were limited to same-category listings, and the section was omitted when there were no matches.
- With a fixed clock and a browser in a different timezone from the restaurant, a past slot and an occupied slot were excluded. A cancelled slot was available and a closed weekday offered no slots. The stored status of a past reservation stayed `confirmed`.
- All 11 route views, including the unknown-path fallback, rendered at 390px and 1440px without horizontal overflow, console errors, or external requests. Local artwork decoded, the skip link focused the main region while preserving `sid`, and the overview, business page, and reservation detail were visually inspected against the original site design brief.
- Seed checks confirmed record counts, unique IDs, 26 owned reviews, 16 quote-capable businesses, 16 bookable businesses, and zero overlapping confirmed seed slots.

## Bugs for Dev Agent

No open findings from this round.

## Round History

- **AUDIT-001 fixed.** A valid bookmark and an orphaned bookmark were injected together. Only the valid bookmark appeared in the saved count, recent activity, and saved business control. The `/go` response retained both records.
- **AUDIT-002 fixed.** Keyboard dismissal restored focus to the opener. Confirming a review removal, bookmark removal, quote archive, or reservation cancellation focused the main region after the opener disappeared.
- **AUDIT-003 fixed.** All 28 seeded reservations had creation dates before their table dates. Cancellation timestamps fell between creation and the table date and matched `updatedAt`.
- `set_current` and a later `set` preserved the first `/go` baseline, `reset` restored it, and `/state` was isolated by session.

Docker dynamic certification and commits remain with the parent runner.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `113912`. The local evidence is `factory/build/dyn_certify/113912/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `users → 0 → displayName`.
