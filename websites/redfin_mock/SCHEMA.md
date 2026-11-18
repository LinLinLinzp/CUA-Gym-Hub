# redfin_mock Schema

| API | Request |
| --- | --- |
| Base URL | `http://localhost:5335/` |
| Inspect | `GET /go?sid=<sid>` returns `initial_state`, `current_state`, and `state_diff` grouped by top-level key. |
| Load | `GET /state?sid=<sid>` returns `stored_state`, `has_custom_state`, and `sid`. |
| Inject | `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`. Use a fresh sid for a new baseline. |
| Reset | `POST /post?sid=<sid>` with `{"action":"reset"}` restores current state to the stored initial state or seed defaults. |

`src/data/seed.js` exports `createInitialData()`. The client loads before rendering routes and persists the entire state once for each successful business action.

## State Schema

IDs and relationships are strings. Each `*At` field is an ISO 8601 timestamp. `closingDate` is a local calendar date in `YYYY-MM-DD` form. A question mark indicates an optional field. Activity belongs to the account identified by `actorId`. Listing, agent, and conversation references use IDs in their corresponding collections.

| Top-level key | Shape |
| --- | --- |
| `account` | Object with `id`, `displayName`, `email`, and IANA `timeZone`. |
| `agents` | Array of `{id, displayName, title?, market?, initials?}`. |
| `homes` | Array of `{id, address, city, region, zip, neighborhood?, price, beds, baths, sqft, propertyType, status, photo?, description?, agentId?, listedAt?}`. Price and property facts are numbers. Types are `house`, `townhouse`, and `condo`. Statuses are `active`, `pending`, and `sold`. `photo` is a local path. |
| `savedHomes` | Array of `{id, homeId, actorId, status, createdAt, updatedAt, removedAt?}`. Statuses are `saved` and `removed`. |
| `tours` | Array of `{id, homeId, agentId?, actorId, scheduledAt, timeZone, mode, notes?, status, createdAt, updatedAt, rescheduledAt?, canceledAt?}`. Modes are `in_person` and `video`. Statuses are `requested`, `confirmed`, `completed`, and `canceled`. |
| `offers` | Array of `{id, homeId, agentId?, actorId, amount, currency, financing, closingDate?, notes?, status, createdAt, updatedAt, submittedAt?, withdrawnAt?}`. The app writes positive numbers with up to two decimal places and accepts injected two-decimal strings. Currency is `USD`. Financing values are `conventional`, `cash`, `fha`, `va`, and `other`. Statuses are `draft`, `submitted`, `accepted`, `declined`, and `withdrawn`. |
| `messageThreads` | Array of `{id, homeId?, agentId, actorId, subject, createdAt, lastMessageAt, lastReadAt?, readById?}`. |
| `messages` | Array of `{id, threadId, senderId, recipientId, body, status, createdAt}`. Status is `sent`. The sender and recipient are the buyer and the thread's agent, in either direction. |

### Default IDs

| Collection | IDs |
| --- | --- |
| `account` | `buyer-001` |
| `agents` | `agent-001` through `agent-006` |
| `homes` | `home-001` through `home-048` |
| `savedHomes` | `saved-001` through `saved-032` |
| `tours` | `tour-001` through `tour-024` |
| `offers` | `offer-001` through `offer-024` |
| `messageThreads` | `thread-001` through `thread-024` |
| `messages` | `message-001` through `message-072` |

## Minimal Inject Example

```json
{
  "action": "set",
  "state": {
    "account": { "id": "buyer-example", "displayName": "Taylor Reed" },
    "agents": [],
    "homes": [],
    "savedHomes": [],
    "tours": [],
    "offers": [],
    "messageThreads": [],
    "messages": []
  }
}
```

The client merges account fields over default values and replaces default arrays with the injected arrays.

## Observable State Changes

Timestamps written by an action share a single value captured at the time of that action.

| User action | Collection | Exact writes |
| --- | --- | --- |
| Save a listing for the first time | `savedHomes` | Append `id`, `homeId`, `actorId`, `status: saved`, `createdAt`, `updatedAt`. |
| Remove a saved listing | `savedHomes` | Set `status: removed`, `removedAt`, `updatedAt` on its record. |
| Re-save a removed listing | `savedHomes` | Set `status: saved` and `updatedAt` on its record and remove `removedAt`. Preserve `id` and `createdAt`. |
| Confirm a new tour request | `tours` | Append `id`, `homeId`, optional `agentId`, `actorId`, `scheduledAt`, `timeZone`, `mode`, optional `notes`, `status: requested`, `createdAt`, `updatedAt`. |
| Confirm a reschedule | `tours` | Set `scheduledAt`, `timeZone`, `status: requested`, `rescheduledAt`, and `updatedAt` on the same active tour. |
| Confirm a cancellation | `tours` | Set `status: canceled`, `canceledAt`, and `updatedAt` on the same active tour. |
| Save an offer draft | `offers` | Insert `id`, `homeId`, optional `agentId`, `actorId`, `amount`, `currency: USD`, `financing`, optional `closingDate` and `notes`, `status: draft`, `createdAt`, and `updatedAt`. On edit, preserve `id` and `createdAt`, retain an existing `agentId` or fill it from the listing, update the terms and `updatedAt`, and remove either optional term when cleared. |
| Submit an offer request | `offers` | Insert or update the same fields as a draft with `status: submitted` and `submittedAt`. Preserve the draft's `id` and `createdAt` when submitting a draft. |
| Confirm withdrawal | `offers` | Set `status: withdrawn`, `withdrawnAt`, and `updatedAt` on the submitted offer. |
| Open an unread conversation or mark it read | `messageThreads` | Set `lastReadAt` and `readById` on the selected thread. |
| Send a first message | `messageThreads`, `messages` | In one write, append a thread with `id`, optional `homeId`, `agentId`, `actorId`, `subject`, `createdAt`, `lastMessageAt`, `lastReadAt`, and `readById`. Append a message with `id`, `threadId`, `senderId` (buyer), `recipientId` (agent), `body`, `status: sent`, and `createdAt`. |
| Send a reply | `messageThreads`, `messages` | In one write, append a message with the same shape and the existing `threadId`, and set that thread's `lastMessageAt`, `lastReadAt`, and `readById`. |

An upcoming tour has a future `scheduledAt` and a `requested` or `confirmed` status. These tours count toward the one-active-tour-per-listing limit. Draft and submitted offers count toward the one-active-offer-per-listing limit. Unread status comes from the newest inbound message and the thread's `lastReadAt`. These derived views do not persist changes. Filters, sorting, gallery controls, route loading, idle time, dismissals, invalid forms, and opening already-read threads produce no mutations.

