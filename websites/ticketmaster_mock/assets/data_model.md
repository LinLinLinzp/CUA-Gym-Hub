# Ticketmaster account data model

`createInitialData()` returns a JSON-serializable object with the collections below. Field names here are the implementation target for `SCHEMA.md`. Optional fields can be absent in injected data. ISO timestamps use UTC. Money is stored as integer USD cents and formatted as currency for display. Build deterministic seed ids, dates and prices. Use unique ids for new activity records and one `new Date().toISOString()` value across all rows written by one action.

## Records

Each field lists its type and an example. Strings shown in backticks are literal values where the field is an enum.

| Key and type | Fields and examples |
| --- | --- |
| `account` object | `id` string `acct-001`, `name` string `Morgan Ellis`, `email` string `morgan.ellis@example.com` |
| `events[]` | `id` string `evt-001`, `name` string `Beacon Coast Live`, `category` string `music` (also `sports`, `arts`), `venue` string `Harborline Hall`, `city` string `Port Alder, WA`, `startsAt` ISO string `2027-03-13T03:30:00Z`, optional `timeZone` string `America/Los_Angeles`, `status` enum `scheduled`, `rescheduled`, `postponed`, `canceled`, optional `artKey` string `music-blue` and `notice` string `The start time has changed.` |
| `orders[]` | `id` string `ord-001`, `orderNumber` string `24-31752/HBR`, `eventId` string `evt-001`, `actorId` string `acct-001`, `createdAt` ISO string `2026-10-06T15:30:00Z`, `status` enum `confirmed`, `canceled`, `refund_requested`, `refunded`, `source` enum `purchase` or `transfer`, `currency` string `USD`, `subtotalCents` integer `16000`, `feeCents` integer `2200`, `taxCents` integer `800`, `totalCents` integer `19000`, `quantity` positive integer `2`, optional `paymentMethodId` string `pay-001`, `transferEligible` boolean, `resaleEligible` boolean, `refundPolicy` enum `requestable`, `automatic`, `unavailable`, optional `refundDeadline` ISO string `2027-02-15T08:00:00Z`, and optional `updatedAt` ISO string and `updatedBy` account id |
| `tickets[]` | `id` string `tkt-001`, `orderId` string `ord-001`, `section` string `102`, `row` string `D`, `seat` string `12`, `faceValueCents` integer `8000`, `feeCents` integer `1100`, `taxCents` integer `400`, `status` enum `available`, `transfer_pending`, `transferred`, `listed`, `sold`, `refund_requested`, `refunded`, optional `holdId` linked record id, `updatedAt` ISO string and `updatedBy` account id |
| `orderSaves[]` | `id` string `save-001`, `orderId` string `ord-001`, `actorId` string `acct-001`, `status` enum `saved` or `removed`, `quantity` integer `2` (order seat count), `createdAt` ISO string, optional `updatedAt` ISO string and `updatedBy` account id |
| `transfers[]` | `id` string `xfer-001`, `orderId` string `ord-001`, `ticketIds` string array `["tkt-001"]`, `quantity` integer `1`, `actorId` string `acct-001` for outgoing or synthetic sender id for incoming, `direction` enum `outgoing` or `incoming`, `recipientName` string `Sam Rivera`, `recipientEmail` string `sam.rivera@example.com`, optional `senderName` string `Taylor Chen`, `status` enum `pending`, `accepted`, `canceled`, `createdAt` ISO string, optional `updatedAt` ISO string and `updatedBy` account id |
| `listings[]` | `id` string `lst-001`, `orderId` string `ord-001`, `ticketIds` string array `["tkt-001"]`, `quantity` integer `1`, `actorId` string `acct-001`, `payoutMethodId` string `out-001`, `pricePerTicketCents` integer `9250`, `totalCents` integer `9250`, `currency` string `USD`, `status` enum `active`, `sold`, `removed`, `createdAt` ISO string, optional `updatedAt` ISO string and `updatedBy` account id |
| `refunds[]` | `id` string `ref-001`, `orderId` string `ord-001`, `ticketIds` string array `["tkt-001"]`, `quantity` integer `1`, `actorId` string `acct-001` (or `system` for automatic seed history), `reason` enum `event_changed`, `cant_attend`, `other` or seeded `event_canceled`, `paymentMethodId` string `pay-001`, `currency` string `USD`, `lineItems` array of refund items below, `subtotalCents` integer `8000`, `feeCents` integer `1100`, `taxCents` integer `400`, `totalCents` integer `9500`, `status` enum `requested`, `processing`, `completed`, `createdAt` ISO string, optional `updatedAt` ISO string and `updatedBy` account id |
| `paymentMethods[]` | `id` string `pay-001`, `label` string `Visa`, `last4` string `1842` |
| `payoutMethods[]` | `id` string `out-001`, `label` string `Debit card`, `last4` string `7319` |

Each refund item contains `ticketId` string, `quantity` integer `1`, and nonnegative integer `subtotalCents`, `feeCents`, `taxCents`, and `totalCents`. For example `{ ticketId: "tkt-001", quantity: 1, subtotalCents: 8000, feeCents: 1100, taxCents: 400, totalCents: 9500 }`. Sum items into the parent record.

## Relationships and eligibility

- Derive order seats via `tickets[].orderId`. Activity records refer to one order and retain the exact seat ids. Active holds set the seat's `holdId` to the associated transfer, listing or refund id. Treat missing details as unavailable and retain the rest of the record in read views. Incoming pending transfers reserve seats on an order with source `transfer`. Hide the reserved seats from the usable ticket count until accepted.
- Transfer and sale require a confirmed order, explicit action eligibility, a valid future event in scheduled or rescheduled status, and a selected available seat without a hold. For resale, offer only existing masked payout destinations. Parse prices to cents, reject zero, negatives, values with more than two decimal places and values outside safe integer totals.
- A user refund requires a confirmed purchased order, a requestable policy, an open deadline if present, an original payment reference, complete itemized data, and all included tickets available. A requestable policy without a deadline has no configured cutoff. An order with an existing refund record is ineligible for another. Display canceled automatic refunds from pre-existing records. Compare fixed timestamps with the runtime clock for labels and time-sensitive eligibility.
- A valid confirmation checks current eligibility and association of every selected seat. Canceling a transfer or removing a listing releases only seats with a matching `holdId` and matching status. Clear the hold on release. For acceptance check that the incoming recipient matches the account and that all listed seats still belong to the transfer.

## Observable state changes

Use the account id for `actorId` on new user activity. Every update preserves the original creator and creation time and sets `updatedAt` and `updatedBy` on each changed existing record.

| Confirmed action | Writes |
| --- | --- |
| Save order | Append a saved `orderSaves` record, or set the matching account/order record's `status` to `saved` and refresh `quantity` |
| Remove saved order | Set matching `orderSaves.status` to `removed` |
| Send transfer | Append `transfers` row with `outgoing` direction and `pending` status. Set selected `tickets.status` to `transfer_pending` and write the transfer id to `holdId` |
| Cancel transfer | Set `transfers.status` to `canceled`. Set its still-held `tickets.status` to `available` and clear `holdId` |
| Accept transfer | Set incoming `transfers.status` to `accepted`. Set its reserved `tickets.status` to `available` and clear `holdId` |
| List seats | Append `listings` row with `active` status, selected seat ids, per-seat price and total. Set selected `tickets.status` to `listed` and write the listing id to `holdId` |
| Edit listing price | Update active `listings.pricePerTicketCents` and `totalCents` using existing quantity |
| Remove listing | Set `listings.status` to `removed`. Restore its still-held `tickets.status` to `available` and clear `holdId` |
| Request refund | Append `refunds` row with `requested` status and itemized amounts. Set `orders.status` and included `tickets.status` to `refund_requested` and write the refund id to each included ticket's `holdId` |

## Seed targets

- Seed roughly 84 orders and 84 related events, with 1–4 seats per order and coherent totals. Include scheduled, rescheduled, postponed, canceled and past events, spread across genres, venues and cities. Use fixed event dates on both sides of November 2026, with actionable fixtures in 2027.
- Seed about 24 records each for transfers, listings and refunds. Allocate coherent historical orders by activity, and include several active or pending records for real UI actions. Incoming pending, outgoing pending, an editable active listing, a requestable future order with fully available seats, and a future order with multiple free seats eligible for transfer and resale each need an easily located fixture.
- Include several saved and removed order records and at least two masked payment and payout methods. Keep paid and received orders distinct. Pending holds, sold seats, completed transfers and refund history should agree with ticket state. Seed order totals must equal the sum of their itemized seats.
