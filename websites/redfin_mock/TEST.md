# Redfin Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5335  
> Tested by: playwright agent

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested | 9 |
| Interaction and runtime check groups | 11 |
| ✅ Passing groups | 11 |
| ❌ Failed groups | 0 |
| ⚠️ Skipped (out of scope) | 0 |
| Open visual findings | 1 P2 |

Chromium ran using the installed Playwright from `PILOT_PLAYWRIGHT`. The workflow suite passed with Vite serving the app and with the browser loading `dist/` while using the same localhost state API. `npm run build` passed. Vite reported a future config-loader compatibility warning for the shared middleware import.

---

## ✅ Passing Tests

- **Overview and shell** — Verified keyboard skip navigation, masthead and footer links, activity links, and the Saved homes shortcut.
- **Browse homes** — Searched by address and neighborhood, applied status, price, bed count, and property-type filters, and cleared the filters. Verified hover feedback and navigation from a card to its listing.
- **Saved homes** — Saved from a card, reloaded the listing, removed and re-saved it, then found it with shortlist search and sorting. Verified selected heart state, notification dismissal, and stable record identity.
- **Listing detail** — Checked previous and next photos, keyboard navigation, and the paired image for an injected listing. Verified missing-listing recovery and local fallback for an injected remote image URL.
- **Tours** — Requested from a listing and from Tours. Checked incomplete and duplicate request validation, review and Back, a time-zone change during rescheduling, Keep tour, confirmed cancellation, and History.
- **Offers** — Validated the amount, saved and edited a draft, rejected a duplicate, submitted the draft, submitted separately from listing detail, and withdrew a request. Checked status filtering, terms, history, and restored focus after dismissal.
- **Agent messages** — Searched and filtered unread threads. Tested opening an unread thread, opening an already-read thread, explicitly marking a deep-linked thread read, rejecting a blank reply, sending a reply, dismissing a composer, and sending from both a listing and the inbox. Checked immediate rendering and mobile back navigation.
- **Direct routes and injected worlds** — Rendered all eight account views and the unknown-route recovery view. Verified empty and partial data, orphaned references, and a searchable 300-listing injection.
- **State transport and isolation** — Verified fixed seed counts, one baseline write, one `set_current` request per mutation, `sid` preservation, independent sessions, and API reset to the original baseline. Reloading a cached page and leaving a second tab idle while the active tab mutated state produced zero writes.
- **Browser runtime** — Confirmed zero uncaught page errors, console errors, and external requests in the workflow suite. Checked chronological ordering across ISO offsets, injected decimal currency, and record creation without `crypto.randomUUID`.
- **Responsive layout** — Reviewed the eight account views at 1360 × 940 and 390 × 844 against the site's original design. Neither viewport had document-level horizontal overflow.

### SEED workflow state verified through `/go`

| Workflow | Action | Observable fields |
| --- | --- | --- |
| Saved homes | Save a listing | A new `savedHomes` record contains `id`, `homeId`, `actorId`, `status`, `createdAt`, and `updatedAt`. |
| Saved homes | Remove and re-save | Removal changes `status`, `removedAt`, and `updatedAt`. Re-saving restores `status: saved`, clears `removedAt`, and changes `updatedAt` on the same record. |
| Tours | Request | A new `tours` record contains `id`, `homeId`, `agentId`, `actorId`, `scheduledAt`, `timeZone`, `mode`, `notes`, `status: requested`, `createdAt`, and `updatedAt`. |
| Tours | Reschedule and cancel | Rescheduling changed `scheduledAt`, `timeZone`, `rescheduledAt`, and `updatedAt` on the requested tour. Cancellation changed `status` to `canceled` and set `canceledAt` and `updatedAt` on the same ID. |
| Offers | Create and edit a draft | A new `offers` record contains `id`, `homeId`, `agentId`, `actorId`, numeric `amount`, `currency: USD`, `financing`, `closingDate`, `notes`, `status: draft`, `createdAt`, and `updatedAt`. The draft edit changed `notes` and `updatedAt` on the same ID. |
| Offers | Submit and withdraw | Draft submission changed `status`, `submittedAt`, and `updatedAt`. Direct submission created a submitted record. Withdrawal changed `status`, `withdrawnAt`, and `updatedAt` on the submitted ID. |
| Agent messages | Read and reply | Opening or marking an unread thread changed `messageThreads.lastReadAt`. The seeded `readById` already matched the buyer. A reply changed the thread's `lastMessageAt` and `lastReadAt` and appended a `messages` record with `id`, `threadId`, `senderId`, `recipientId`, `body`, `status: sent`, and `createdAt`. |
| Agent messages | Send a first message | A single write appended the message and a linked `messageThreads` record with `id`, `actorId`, `agentId`, `subject`, `createdAt`, `lastMessageAt`, `lastReadAt`, and `readById`. The listing composer also recorded `homeId`. |

Filters, sorting, gallery controls, dismissed dialogs, invalid submissions, and opening already-read conversations produced zero writes.

---

## ❌ Bugs for Dev Agent

No P0 or P1 bugs were reproduced.

## Visual Alignment Feedback

### VISUAL-001 · [P2] · Active tab can start outside the mobile navigation viewport

| Field | Value |
| --- | --- |
| View | `/homes`, `/offers`, and `/messages` at 390px wide |
| Mock | `tests/layout-browse-390.png`, `tests/layout-offers-390.png`, `tests/layout-inbox-390.png` |
| Action | Load the route directly. |
| Actual | The horizontally scrollable navigation starts at its left edge. The active Offers link is clipped, and Messages and Browse homes start outside the visible area. |
| Suggestion | Scroll the active link into view within the navigation strip on narrow screens. |

---

## Round History

### Round 1 → Round 2

- Re-ran the workflow and runtime suites. Added per-action record field assertions and reviewed all account views at desktop and mobile widths.
- Docker dynamic certification is pending in the parent runner.

WORKFLOWS: PASS

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `85416`. The local evidence is `factory/build/dyn_certify/85416/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `agents → 0 → displayName`.
