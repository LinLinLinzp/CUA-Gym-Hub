# ticketmaster_mock Schema

**Base URL** · `http://127.0.0.1:5337/`  
**Go Endpoint** · `GET /go?sid=<sid>` returns `{initial_state, current_state, state_diff}`  
**Inject** · `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`  
**Reset** · `POST /post?sid=<sid>` with `{"action":"reset"}` restores the SID's baseline on the server through the shared API.

## State Schema

Records use string `id` values for joins. Amounts are integer USD cents. Dates are ISO UTC strings. Optional data may be absent in an injected world. On a fresh browser session, injected arrays replace defaults and injected objects merge with defaults. Use a fresh SID for independent scenarios.

| Key | Type | Record shape and relationships |
| --- | --- | --- |
| `account` | Object | `id`, `name` and `email`. Confirmed actions use the account id for the actor. |
| `events` | Array | `id`, `name`, `category` (`music`, `sports`, `arts`), `venue`, `city`, `startsAt`, optional `timeZone`, `artKey`, `notice`. The `status` is `scheduled`, `rescheduled`, `postponed` or `canceled`. |
| `orders` | Array | `id`, `orderNumber`, `eventId`, `actorId`, `createdAt`, `status` (`confirmed`, `canceled`, `refund_requested`, `refunded`), `source` (`purchase` or `transfer`), `currency`, `subtotalCents`, `feeCents`, `taxCents`, `totalCents`, `quantity`, optional `paymentMethodId`, `transferEligible`, `resaleEligible`, `refundPolicy` (`requestable`, `automatic`, `unavailable`), optional `refundDeadline`, `updatedAt`, `updatedBy`. |
| `tickets` | Array | `id`, `orderId`, `section`, `row`, `seat`, `faceValueCents`, `feeCents`, `taxCents`, `status` (`available`, `transfer_pending`, `transferred`, `listed`, `sold`, `refund_requested`, `refunded`), optional `holdId`, `updatedAt`, `updatedBy`. A hold links to its activity record. |
| `orderSaves` | Array | `id`, `orderId`, `actorId`, `status` (`saved` or `removed`), `quantity`, `createdAt`, optional `updatedAt`, `updatedBy`. |
| `transfers` | Array | `id`, `orderId`, `ticketIds` (string array), `quantity`, `actorId`, `direction` (`outgoing` or `incoming`), `recipientName`, `recipientEmail`, optional `senderName`, `status` (`pending`, `accepted`, `canceled`), `createdAt`, optional `updatedAt`, `updatedBy`. Incoming records retain the original sender actor. Pending incoming records hold seats on the received order. |
| `listings` | Array | `id`, `orderId`, `ticketIds` (string array), `quantity`, `actorId`, `payoutMethodId`, `pricePerTicketCents`, `totalCents`, `currency`, `status` (`active`, `sold`, `removed`), `createdAt`, optional `updatedAt`, `updatedBy`. |
| `refunds` | Array | `id`, `orderId`, `ticketIds` (string array), `quantity`, `actorId`, `reason` (`event_changed`, `cant_attend`, `other`, or seeded `event_canceled`), `paymentMethodId`, `currency`, `lineItems`, `subtotalCents`, `feeCents`, `taxCents`, `totalCents`, `status` (`requested`, `processing`, `completed`), `createdAt`, optional `updatedAt`, `updatedBy`. Each `lineItems[]` item contains `ticketId`, `quantity` (1), `subtotalCents`, `feeCents`, `taxCents`, and `totalCents`. |
| `paymentMethods` | Array | Masked source with `id`, `label`, `last4`. |
| `payoutMethods` | Array | Masked destination with `id`, `label`, `last4`. |

Each new activity record includes a unique `id`, the current `actorId` and `createdAt`. Every updated record receives `updatedAt` and `updatedBy` while preserving its original creation data. All writes within a confirmed action share one timestamp.

### Default IDs

- Account `acct-001`.
- Events `evt-001` through `evt-084` and orders `ord-001` through `ord-084`.
- 211 tickets use `tkt-001` through `tkt-333` with gaps. `ord-001` contains `tkt-001`, `tkt-002` and `tkt-003`.
- Order saves `save-002`, `save-005`, `save-008`, `save-013`, `save-016`, `save-036`, `save-059` and `save-070`.
- Transfers `xfer-001` through `xfer-024`, listings `lst-001` through `lst-024`, and refunds `ref-001` through `ref-025`.
- Payment methods `pay-001` and `pay-002`, and payout methods `out-001` and `out-002`.
- `ord-003` is the seeded refund-request fixture. `xfer-001` is the first incoming pending transfer, and `lst-001` is an active listing.

## Minimal Inject Example

Send this example as the `state` in a `set` request under a fresh SID to exercise the empty account views.

```json
{
  "events": [],
  "orders": [],
  "tickets": [],
  "orderSaves": [],
  "transfers": [],
  "listings": [],
  "refunds": [],
  "paymentMethods": [],
  "payoutMethods": []
}
```

## Observable State Changes (for LLM evaluation)

| User action | Fields written |
| --- | --- |
| Save order | Append `orderSaves` with `id`, `orderId`, `actorId`, `createdAt`, `status: saved`, `quantity`. If the order had been saved previously, update that same row's `status`, `quantity`, `updatedAt` and `updatedBy`. |
| Remove from saved | Set the account/order save row’s `status: removed`, `updatedAt`, `updatedBy`. |
| Send transfer | Append `transfers` with `id`, `actorId`, `createdAt`, `orderId`, `ticketIds`, `quantity`, `recipientName`, `recipientEmail`, `direction: outgoing`, `status: pending`. Set only selected tickets to `status: transfer_pending` with `holdId` of the new transfer and update audit fields. |
| Cancel transfer | Update the outgoing pending record’s `status: canceled` and audit fields. Of the listed ticket ids belonging to the order, set only seats with the matching hold and `transfer_pending` status to `available`, remove `holdId`, and update audit fields. |
| Accept transfer | Update the incoming pending record’s `status: accepted` and audit fields. Verify that the recipient matches the account and all seats are still reserved on the linked received order. Set those tickets to `status: available`, remove `holdId`, and update audit fields. |
| Create listing | Append `listings` with `id`, `actorId`, `createdAt`, `orderId`, `ticketIds`, `quantity`, `payoutMethodId`, `pricePerTicketCents`, `totalCents` (price × quantity), `currency: USD`, `status: active`. Set selected tickets to `status: listed` with the listing’s `holdId` and audit fields. |
| Save listing price | Update active listing’s `pricePerTicketCents`, `totalCents` (new price × existing quantity), `updatedAt`, `updatedBy`. |
| Remove listing | Set the active listing’s `status: removed` and audit fields. Of its listed ticket ids belonging to the order, set only seats with the matching hold and `listed` status to `available`, remove `holdId`, and update audit fields. |
| Submit refund request | Append `refunds` with `id`, `actorId`, `createdAt`, `orderId`, all `ticketIds`, `quantity`, `reason`, `paymentMethodId`, `currency: USD`, `lineItems`, `subtotalCents`, `feeCents`, `taxCents`, `totalCents`, `status: requested`. Set the order and included tickets to `status: refund_requested` and update audit fields. Give each included ticket the refund’s `holdId`. Original receipt amounts stay on the order. |

A successful action sends one `set_current` snapshot. Opening a route, scrolling, searching, filtering, viewing receipts, correcting fields, canceling a dialog and rejected confirmations leave business state unchanged. The initial load can send one `set` baseline for that browser session.

At confirmation, the store reads the current SID through `/state` and validates the action against that snapshot. Where browser locks are available, tabs sharing browser storage serialize confirmations for that SID until the server exposes the saved snapshot. A refund requires a linked original payment method, and price editing requires a positive integer listing quantity.
