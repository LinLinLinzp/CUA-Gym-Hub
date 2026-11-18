# Twilio Console — Data model

## State root

Implement `createInitialData()` in `src/data/seed.js`. Every call returns a fresh JSON-serializable world with fixed IDs, dates, and relationships.

| Key | Shape | Initial count |
| --- | --- | --- |
| `account` | Account object with nested operator | 1 |
| `phoneNumbers` | Owned number array | 36 |
| `availableNumbers` | Available inventory array | 48 |
| `messagingServices` | Messaging Service array | 24 |
| `messages` | Message array used for Messaging Logs | 84 |
| `logExports` | Export event array | 0 |

Use UTC ISO strings for persisted timestamps. Capture one `new Date().toISOString()` per successful user action. Use fresh collision-resistant IDs for newly created records and deterministic IDs for all seed records. Examples use abbreviated identifiers for readability. For displayed Account, Phone Number, Service, and Message SIDs use the `AC`, `PN`, `MG`, and `SM` prefixes with 32 hex characters in the seed. Treat injected IDs as opaque strings. Use the loaded `account.operator.id` for actor fields.

Fields with no applicable value may be null or absent in injected worlds. Use a dash or an appropriate empty state for display. For mutation defaults use an empty string for blank form URLs, a null for absent relationships or errors, and an empty array for missing collections such as senders or delivery steps.

## Account

| Fields | Type and examples |
| --- | --- |
| `id`, `name` | Strings, e.g. `AC000…001`, `Northline Dispatch` |
| `operator` | Object containing string `id`, `name`, `email`, e.g. `user-01`, `Morgan Ellis`, `morgan@northline.example` |

## Numbers

Inventory and owned number records share the following fields.

| Fields | Type and examples |
| --- | --- |
| `phoneNumber` | E.164 string, e.g. `+12025550134` |
| `country`, `locality` | Strings, e.g. `US`, `Washington, DC` |
| `type` | Enum string, `local` or `toll_free` |
| `capabilities` | Array of `voice`, `sms`, and/or `mms`, e.g. `["voice","sms"]` |
| `monthlyPrice`, `currency` | Number and ISO currency string, e.g. `1.25`, `USD` |

### Owned number

| Fields | Type and examples |
| --- | --- |
| `id`, `inventoryId`, `friendlyName` | Strings, with nullable `inventoryId`, e.g. `PN000…001`, `inventory-001`, `Dispatch East` |
| `status` | `active` or `released` |
| `voiceUrl`, `smsUrl` | Strings, e.g. `https://hooks.northline.example/inbound/voice`, `""` |
| `voiceMethod`, `smsMethod` | `GET` or `POST`. Default to `POST`. |
| `actorId`, `createdAt` | String actor ID and ISO timestamp, e.g. `user-01`, `2026-11-03T14:25:00.000Z` |
| `updatedAt`, `updatedBy` | ISO timestamp and string actor ID |
| `releasedAt`, `releasedBy` | Optional ISO timestamp and string actor ID, populated on release |

### Available inventory

| Fields | Type and examples |
| --- | --- |
| `id`, `status` | String ID such as `inventory-001` and status `available` or `purchased` |
| `purchasedNumberId`, `purchasedAt` | Optional ID of acquired number and ISO timestamp, populated on purchase |

Active numbers can belong to a single sender pool. Derive this relationship from services. Number release keeps the owned record and removes its ID from current sender pools. The purchased inventory entry stays reserved. Historical messages retain their original number and service references.

## Messaging Services

| Fields | Type and examples |
| --- | --- |
| `id`, `friendlyName` | Strings, e.g. `MG000…001`, `Delivery Updates` |
| `useCase` | `notifications`, `customer_care`, `verification`, or `marketing` |
| `senderNumberIds` | Ordered array of owned number IDs, e.g. `["PN000…001"]` |
| `inboundMode` | `defer_to_sender` or `webhook`. Default to `defer_to_sender`. |
| `inboundUrl`, `statusCallbackUrl` | Strings, e.g. `https://hooks.northline.example/sms/inbound`, `https://hooks.northline.example/sms/status`. Default to empty. |
| `actorId`, `createdAt`, `updatedAt`, `updatedBy` | String actor IDs and ISO timestamps |

Require a nonblank name, a use case, and a valid HTTP(S) URL when inbound mode is webhook. Accept blank callback URLs or valid HTTP(S) URLs. For local SMS submission, resolve the first current active SMS-capable number in stored sender order. Reject a stale service or a service with no eligible sender. Recheck eligibility before each sender-pool save.

## Messages

| Fields | Type and examples |
| --- | --- |
| `id`, `direction` | String SID and `inbound` or `outbound`, e.g. `SM000…001`, `outbound` |
| `from`, `to`, `body` | Strings, e.g. `+12025550134`, `+12025550178`, `Your delivery is scheduled for 2–4 PM.` |
| `phoneNumberId`, `serviceId` | Nullable owned-number and service ID strings. An outbound direct send has a null `serviceId`. |
| `status` | `accepted`, `queued`, `sent`, `delivered`, `received`, `undelivered`, or `failed` |
| `segments` | Positive integer, e.g. `1`. Use GSM-7 or Unicode SMS segmentation for submitted bodies. |
| `errorCode`, `errorMessage` | Nullable error code number and description string, e.g. `30007`, `Message filtered` |
| `deliverySteps` | Array of objects with string `status`, ISO `occurredAt`, and optional string `detail`, e.g. `{status:"queued", occurredAt:"2026-11-04T17:03:02.000Z", detail:"Message queued"}` |
| `actorId`, `createdAt` | String actor ID and ISO timestamp. Seed may use `system` for historical inbound records. |

Use message records directly as the log source. Message details fall back to stored `from` and `to` and any available status and timestamps when linked records or steps are absent. A send writes an initial delivery step with the same status and timestamp as the message.

## Log exports

| Fields | Type and examples |
| --- | --- |
| `id`, `kind`, `status` | Unique string ID, `messaging_csv`, `generated` |
| `filters` | Object with normalized string fields `messageSid`, `from`, `to`, `startDate`, `endDate`, `direction`, `status`. Use `""` for unset and `YYYY-MM-DD` for calendar dates. Interpret date windows as inclusive UTC dates and label the inputs. |
| `sort` | `newest` or `oldest` |
| `messageIds`, `rowCount` | Ordered string ID array and its integer length |
| `fileName`, `actorId`, `createdAt` | CSV filename such as `messaging-logs-2026-11-18.csv`, actor ID string and ISO timestamp |

For CSV text cells, quote special characters, double internal quotes, and prefix formula-like cells with a single quote before escaping. Handle From and To as text, including numbers starting with a plus. The state record snapshots filters, sorted row IDs and count. A rerun creates its own export event.

## Starter data coverage

- Use fixed November 2026 timestamps across multiple dates, varied UTC hours, and a filterable cluster on November 12. The default log view shows all dates, so the records remain discoverable under a frozen clock.
- Use US and CA locations with fictional numbers from reserved NANP 555-0100–0199 ranges. Use those same reserved subscriber ranges with fictional toll-free listings. Avoid reused numbers across owned and available inventory. Seed meaningful names such as Dispatch East, Pickup Desk, Delivery Updates, Appointment Reminders, and Support Escalations.
- Include local and toll-free candidates, voice-only numbers and SMS-capable numbers, available inventory in 202, 415 and 647 area codes, a zero-result filter case, and service pools with zero, one, and multiple senders. Keep service assignments unique across pools.
- Include success and failure logs across directions, direct and service sends, a failure with error code 30007, and details with multiple timestamped delivery steps. Preserve valid cross-record references wherever relationships are present.
