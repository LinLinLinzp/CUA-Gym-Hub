# Redfin account state model

`src/data/seed.js` exports `createInitialData()` returning fresh JSON-compatible state for each call. Start with the shape below. Use synthetic people, addresses, facts, and conversations. Arrays from Harbor replace defaults, so link records by ID and tolerate missing links. The final `SCHEMA.md` must reflect the implemented shapes and writes.

```js
return {
  account,
  agents,
  homes,
  savedHomes,
  tours,
  offers,
  messageThreads,
  messages,
}
```

`?` marks optional fields. Dates ending in `At` are ISO 8601 timestamps. On each successful mutation, capture `new Date().toISOString()` once and reuse it across fields written by that action. `closingDate` stays a local `YYYY-MM-DD` date with no time component. IDs are strings. New IDs are unique per record type. Optional missing values may be omitted.

| Top-level key | Type | Fields and example values |
| --- | --- | --- |
| `account` | Object | `id: 'buyer-001'`, `displayName: 'Avery Morgan'`, `email: 'avery.morgan@example.test'`, `timeZone: 'America/Los_Angeles'` |
| `agents` | Array | `id: 'agent-001'`, `displayName: 'Maya Chen'`, `title?: 'Redfin Agent'`, `market?: 'Seattle'`, `initials?: 'MC'` |
| `homes` | Array | `id: 'home-001'`, `address: '4217 Alder Lantern Way'`, `city: 'Seattle'`, `region: 'WA'`, `zip: '98107'`, `neighborhood?: 'Ballard'`, `price: 875000`, `beds: 3`, `baths: 2.5`, `sqft: 1840`, `propertyType: 'townhouse'`, `status: 'active'`, `photo?: '/homes/craftsman-01.webp'`, `description?: 'Corner townhouse with a fenced patio and a bright top-floor office.'`, `agentId?: 'agent-001'`, `listedAt?: '2026-11-02T17:00:00.000Z'` |
| `savedHomes` | Array | `id: 'saved-001'`, `homeId: 'home-001'`, `actorId: 'buyer-001'`, `status: 'saved'`, `createdAt: '2026-11-07T19:05:00.000Z'`, `updatedAt: '2026-11-07T19:05:00.000Z'`, `removedAt?` |
| `tours` | Array | `id: 'tour-001'`, `homeId: 'home-001'`, `agentId?: 'agent-001'`, `actorId: 'buyer-001'`, `scheduledAt: '2026-11-21T18:30:00.000Z'`, `timeZone: 'America/Los_Angeles'`, `mode: 'in_person'`, `notes?: 'Please allow time to see the shared garage.'`, `status: 'requested'`, `createdAt: '2026-11-16T18:05:00.000Z'`, `updatedAt: '2026-11-16T18:05:00.000Z'`, `rescheduledAt?`, `canceledAt?` |
| `offers` | Array | `id: 'offer-001'`, `homeId: 'home-001'`, `agentId?: 'agent-001'`, `actorId: 'buyer-001'`, `amount: 860000`, `currency: 'USD'`, `financing: 'conventional'`, `closingDate?: '2026-12-18'`, `notes?: 'Include a standard inspection contingency.'`, `status: 'draft'`, `createdAt: '2026-11-15T22:00:00.000Z'`, `updatedAt: '2026-11-15T22:00:00.000Z'`, `submittedAt?`, `withdrawnAt?` |
| `messageThreads` | Array | `id: 'thread-001'`, `homeId?: 'home-001'`, `agentId: 'agent-001'`, `actorId: 'buyer-001'`, `subject: 'Parking access on Alder Lantern Way'`, `createdAt: '2026-11-13T18:15:00.000Z'`, `lastMessageAt: '2026-11-14T20:16:00.000Z'`, `lastReadAt?: '2026-11-13T18:15:00.000Z'`, `readById?: 'buyer-001'` |
| `messages` | Array | `id: 'message-001'`, `threadId: 'thread-001'`, `senderId: 'buyer-001'`, `recipientId: 'agent-001'`, `body: 'Hi Maya, which entrance leads to the shared garage?'`, `status: 'sent'`, `createdAt: '2026-11-13T18:15:00.000Z'` |

Price, amount, beds, baths, and square footage are numbers. Store amount with at most two decimal places. Use these enum values and present readable labels in the UI.

| Field | Values |
| --- | --- |
| `homes.propertyType` | `house`, `townhouse`, `condo` |
| `homes.status` | `active`, `pending`, `sold` |
| `savedHomes.status` | `saved`, `removed` |
| `tours.mode` | `in_person`, `video` |
| `tours.status` | `requested`, `confirmed`, `completed`, `canceled` |
| `offers.financing` | `conventional`, `cash`, `fha`, `va`, `other` |
| `offers.status` | `draft`, `submitted`, `accepted`, `declined`, `withdrawn` |
| `messages.status` | `sent` |

## Relationships and list behavior

- The account ID scopes the buyer’s saves, tours, offers, and conversation lists. `actorId` identifies the buyer on those records. Agent IDs refer to `agents`. Activity `homeId` fields refer to `homes`. `threadId` on a message refers to `messageThreads`. Messages can run buyer-to-agent or agent-to-buyer based on their participant IDs.
- Use a single saved record per buyer and home. Show saved records in the account and retain removed records for verification. Put canceled and completed tours in history and move expired requests there at render time based on the current clock. Treat draft or submitted offers as active for duplicate checks.
- Sort conversations by `lastMessageAt` and thread messages by `createdAt`, with the ID as a stable tie-breaker. A conversation is unread when its latest inbound message is later than the buyer’s `lastReadAt`, or when it has an inbound message and no read timestamp. An explicit thread open can mark it read. Booting or reloading a thread route may display unread data without writing.
- When an activity record has a missing home, retain the record on its account list with a fallback label and keep actions available where the referenced home is unnecessary, such as canceling an existing tour. Use a fallback agent label for missing optional agent data. Hide unsupported entry actions in an injected world without eligible homes or agents.

## Seed coverage

| Entity | Count and distribution |
| --- | --- |
| Account and agents | One buyer and six fictional agents covering Seattle, Shoreline, and the Eastside. |
| Homes | 48 across six or more neighborhoods, including Ballard, Fremont, Columbia City, and West Seattle. Use at least 32 active listings and a variety of prices, sizes, home types, and statuses. Include active listings with no saved record, active tour, or active offer. |
| Saved homes | 32 records, including 28 saved and four removed, covering multiple neighborhoods and dates. |
| Tours | 24 covering requested, confirmed, completed, and canceled statuses. Use fixed ISO dates with upcoming and historical examples for the planning baseline, and exercise future-date creation under the runtime clock. |
| Offers | 24 covering all five statuses, including several drafts and several submitted requests. Spread across both saved and unsaved homes. |
| Conversations and messages | 24 threads, at least six unread and at least four general inquiries with no listing. Use 72 total messages of varying length across both directions, with timestamps in chronological order and appropriate subject lines. |

## Planned observable state changes

| Explicit UI action | Write to verify via `/go?sid=…` |
| --- | --- |
| Save home | Append a `savedHomes` record with `id`, `actorId`, `homeId`, `status: 'saved'`, `createdAt`, `updatedAt`. Re-save updates `status` and `updatedAt` on the same ID and clears `removedAt`. |
| Remove saved home | Update `savedHomes.status` to `removed` and set `removedAt` and `updatedAt` on the matching record. |
| Request tour | Append a `tours` record with selected home, buyer, optional agent, time, time zone, mode, optional notes, `status: 'requested'`, and timestamps. |
| Reschedule tour | Update the same `tours` record’s `scheduledAt`, `timeZone`, `status: 'requested'`, `rescheduledAt`, and `updatedAt`. |
| Cancel tour | Update `tours.status` to `canceled` and set `canceledAt` and `updatedAt` on the matching record. |
| Save or edit offer draft | Append or update an `offers` record with the proposed terms, `status: 'draft'`, and timestamps. Preserve `id` and `createdAt` when editing. |
| Submit offer request | Insert or update the `offers` record with the proposed terms, `status: 'submitted'`, `submittedAt`, and `updatedAt`. Preserve the draft ID and creation time if present. |
| Withdraw offer | Update `offers.status` to `withdrawn` and set `withdrawnAt` and `updatedAt` on the matching record. |
| Open unread thread | Set `messageThreads.lastReadAt` and `readById` on the thread. |
| Send first message | Append a `messageThreads` record with agent, buyer, subject, optional home, and timestamps. Append the first `messages` record with the new `threadId`, buyer as sender, agent as recipient, body, `status: 'sent'`, and `createdAt` in that same save. |
| Reply | Append a `messages` record with the existing `threadId`; update `messageThreads.lastMessageAt`, `lastReadAt`, and `readById` in that same save. |

In the local Playwright phase, use a unique sid for each test world. Compare `initial_state`, `current_state`, and `state_diff` before and after a workflow. Cover empty injected collections and a small partial world, then verify deep-link reloads, isolation across two sids, and zero additional posts after the baseline while the tab is idle. Record the tested actions and exact changed fields in `TEST.md`.
