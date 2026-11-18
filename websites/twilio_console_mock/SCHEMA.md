# twilio_console_mock Schema

**Base URL**: `http://localhost:5500/`  
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}`

A first `set` captures the session baseline. Subsequent `set` and `set_current` calls update current state while preserving that baseline. Reset restores current state to the stored baseline, or to defaults when no baseline exists. Use a fresh session ID and browser cache for a new injected world. The state diff reports changed top-level values under `modified` or `added`.

## State Schema

| Key | Type | Description |
| --- | --- | --- |
| `account` | Object | `id`, `name`, `operator { id, name, email }` |
| `phoneNumbers` | Array | 36 seeded owned numbers |
| `availableNumbers` | Array | 48 seeded inventory entries |
| `messagingServices` | Array | 24 seeded Messaging Services |
| `messages` | Array | 84 seeded Messaging Log records |
| `logExports` | Array | CSV export records, initially empty |

Dates and times are UTC ISO strings. IDs are opaque strings. Actor fields use the loaded account operator ID. Injected worlds can omit optional values, including relationships, timestamps, and settings.

### Numbers

- Shared fields are string `id`, `phoneNumber`, and `currency`, nullable string `country` and `locality`, nullable `type` of `local` or `toll_free`, a `capabilities` array containing `voice`, `sms`, or `mms`, and nullable numeric `monthlyPrice`. A purchased record uses null when optional inventory metadata is absent.
- `phoneNumbers` also has nullable `inventoryId`, string `friendlyName`, `status` of `active` or `released`, string `voiceUrl` and `smsUrl`, `voiceMethod` and `smsMethod` of `GET` or `POST`, and `actorId`, `createdAt`, `updatedAt`, and `updatedBy`. Released records also have `releasedAt` and `releasedBy`.
- `availableNumbers` also has `status` of `available` or `purchased`, with `purchasedNumberId` and `purchasedAt` on purchased entries.

### Messaging

- `messagingServices` records contain `id`, `friendlyName`, `useCase` (`notifications`, `customer_care`, `verification`, or `marketing`), ordered `senderNumberIds`, `inboundMode` (`defer_to_sender` or `webhook`), `inboundUrl`, `statusCallbackUrl`, `actorId`, `createdAt`, `updatedAt`, and `updatedBy`. Blank optional URLs are empty strings.
- `messages` records contain `id`, `direction` (`inbound` or `outbound`), `from`, `to`, `body`, nullable `phoneNumberId` and `serviceId`, `status` (`accepted`, `queued`, `sent`, `delivered`, `received`, `undelivered`, or `failed`), integer `segments`, nullable numeric `errorCode` and nullable string `errorMessage`, `deliverySteps` array of `{ status, occurredAt, detail? }`, `actorId`, and `createdAt`.
- `logExports` records contain `id`, `kind` (`messaging_csv`), `status` (`generated`), `filters` as string fields `messageSid`, `from`, `to`, `startDate`, `endDate`, `direction`, and `status`, `sort` (`newest` or `oldest`), ordered `messageIds`, integer `rowCount`, `fileName`, `actorId`, and `createdAt`. Unset filters are empty strings. Date filters are inclusive UTC calendar dates.

### Default IDs

- Account `AC00000000000000000000000000000001` and operator `user-01`.
- Owned numbers, services, and messages use `PN`, `MG`, and `SM` followed by a lowercase hexadecimal index padded to 32 digits. The inclusive index ranges are `01`–`24`, `01`–`18`, and `01`–`54`, respectively.
- Inventory IDs run from `inventory-001` to `inventory-048`.

## Minimal Inject Example

```json
{
  "action": "set",
  "state": {
    "account": { "name": "Harbor Dispatch" },
    "phoneNumbers": [],
    "availableNumbers": [],
    "messagingServices": [],
    "messages": [{ "id": "harbor-message", "status": "received" }],
    "logExports": []
  }
}
```

## Observable State Changes (for LLM evaluation)

| User action | Exact writes |
| --- | --- |
| Confirm number purchase | Append an owned record with `id, inventoryId, phoneNumber, friendlyName, country, locality, type, capabilities, monthlyPrice, currency, status, voiceUrl, voiceMethod, smsUrl, smsMethod, actorId, createdAt, updatedAt, updatedBy` to `phoneNumbers`. Set the selected `availableNumbers` record's `status=purchased`, `purchasedNumberId`, and `purchasedAt`. |
| Save number configuration | Update `friendlyName, voiceUrl, voiceMethod, smsUrl, smsMethod, updatedAt, updatedBy` on the selected `phoneNumbers` record. |
| Confirm number release | Set `status=released, releasedAt, releasedBy, updatedAt, updatedBy` on the selected `phoneNumbers` record. Remove its ID from `senderNumberIds` and set `updatedAt, updatedBy` on each affected service. |
| Create Messaging Service | Append `id, friendlyName, useCase, senderNumberIds, inboundMode, inboundUrl, statusCallbackUrl, actorId, createdAt, updatedAt, updatedBy` to `messagingServices`. |
| Save service settings | Update `friendlyName, useCase, inboundMode, inboundUrl, statusCallbackUrl, updatedAt, updatedBy` on the selected service. |
| Add or remove service sender | Update `senderNumberIds, updatedAt, updatedBy` on the selected service. |
| Send SMS | Append `id, direction, from, to, body, phoneNumberId, serviceId, status, segments, errorCode, errorMessage, deliverySteps, actorId, createdAt` to `messages`. Direct sends start queued. Service sends start accepted and use the first eligible SMS sender in the stored pool order. |
| Export filtered Messaging Logs | Append `id, kind, status, filters, sort, messageIds, rowCount, fileName, actorId, createdAt` to `logExports` after initiating the CSV download. |

Each accepted action saves one whole state. Reads, draft edits, canceled confirmations, and rejected submissions generate zero mutation posts.
