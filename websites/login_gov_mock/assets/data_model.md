# Login.gov workspace data

Use plain JSON values. A fresh `createInitialData()` returns a new object with these seven top-level keys. Strings like `2026-06-04T15:30:00.000Z` represent UTC timestamps. References use stable string IDs. Optional fields may be omitted or null.

| Key | Shape and example |
| --- | --- |
| `account` | Object with `id` (`acct_jordan`), `displayName` (Jordan Avery), and `primaryEmailId` (`email_personal`), all strings |
| `emails` | Array of records with `id` (`email_personal`), `address` (`jordan.avery@example.com`), `label` (Personal), and `status` (`confirmed` or `unconfirmed`), all strings |
| `identity` | Object with `accountId` (`acct_jordan`), `status` (`unverified` or `verified`), optional `verifiedAt` and `verificationAttemptId`, and `updatedAt` (UTC timestamp) |
| `verificationAttempts` | Array of attempts described below |
| `services` | Array of records with `id` (`svc_025`), `name` (Federal Careers Workspace), `agency` (Federal Workforce Services), `category` (Employment), optional `description` (Manage a sample federal career profile), `requiresVerifiedIdentity` (boolean), and `requestedAttributes` (string array such as `['email', 'given_name', 'family_name']`) |
| `connections` | Array of current and historic service relationships described below |
| `connectionEvents` | Array of timestamped consent history records described below |

## Verification attempts

| Field | Type and example |
| --- | --- |
| `id`, `accountId`, `actorId` | Strings such as `va_024`, `acct_jordan`, `acct_jordan` |
| `serviceId` | Optional string such as `svc_025`, set when the attempt begins from a service consent flow |
| `status` | `in_progress`, `pending_in_person`, `verified`, or `canceled` |
| `step` | `method`, `sample_identity`, `sample_contact`, `review`, `visit`, or `complete` |
| `method` | Optional `online` or `in_person` |
| `documentType` | Optional `state_id`, `drivers_license`, or `passport`. In person accepts state ID and driver's license |
| `sampleIdentityConfirmed` and `sampleContactConfirmed` | Booleans, initially false |
| `visitReference` and `visitDeadlineAt` | Optional string and UTC timestamp, for example `VISIT-1024` and `2026-06-11T15:30:00.000Z` |
| `createdAt`, `updatedAt` | UTC timestamps |
| `submittedAt`, `completedAt`, `canceledAt` | Optional UTC timestamps |

Render the sample identity as a fixed illustrative card for Jordan Avery, with type-specific text and a masked sample identifier. Use a fixed masked sample contact (for example, ending in 0142). Store selections and confirmations only. An in-person pending record is created by submitting the review and has a deadline calculated from the submission time plus seven days. Compare against `new Date()` when rendering and when completing. After expiration, offer cancellation and a new attempt. The expired display leaves the saved record unchanged.

Maintain one resumable attempt per account. Start only when the current identity is unverified and no attempt is in progress or pending. A direct link without an active attempt shows the start screen and awaits a click. When changing a confirmed choice on an earlier screen, clear any later confirmations that depend on it in the same save. Cancel changes `status`, `canceledAt` and `updatedAt`, retaining the last reached step and prior review fields. When a submission or visit succeeds, write the attempt and identity together. For a pending visit, preserve its original `submittedAt` on completion. Carry the selected service ID in the verification URL when entering from consent and validate it against the local catalog. Use it for the return link, with the saved attempt's service as a fallback after reload. This lets an existing attempt satisfy the verification requirement for a different service without changing the attempt's original service link. If neither service resolves, return to identity.

## Connections and events

| Connection field | Type and example |
| --- | --- |
| `id`, `accountId`, `serviceId` | Strings such as `conn_012`, `acct_jordan`, `svc_012` |
| `status` | `connected` or `disconnected` |
| `sharedEmailId` | String such as `email_personal` |
| `sharedAttributes` | String array such as `['email']`, captured at consent time |
| `createdAt`, `updatedAt`, `connectedAt` | UTC timestamps |
| `disconnectedAt` | Optional UTC timestamp, cleared on reconnection |

At most one connection per account and service. A reconnect retains the existing ID and `createdAt`, and updates the status, selected email, requested attribute snapshot and `connectedAt`. The record may retain historical sharing choices while disconnected. Present those fields as historical. Eligible emails are the account's confirmed choices.

| Event field | Type and example |
| --- | --- |
| `id`, `connectionId`, `accountId`, `serviceId`, `actorId` | Strings such as `evt_012_connected`, `conn_012`, `acct_jordan`, `svc_012`, `acct_jordan` |
| `type` | `connected`, `reconnected`, `shared_email_changed`, or `disconnected` |
| `createdAt` | UTC timestamp, the same action time used on the connection |
| `before`, `after` | Snapshot object or null. Use null for `before` on first connect. Snapshot fields are `status`, `sharedEmailId`, `sharedEmailAddress` (string such as `jordan.avery@example.com`, or null for a missing reference), and `sharedAttributes` (string array) |

Generate unique IDs for user-created records and use one ISO timestamp per mutation. The latest event and its connection must agree. On injection, allow rendering missing relationships with plain fallback labels and disable actions that need the missing reference. Scope visible/mutable account-owned records to the current account. Keep unrelated and unknown injected keys in the full-state write.

## Deterministic defaults

- One account, initially unverified, with three confirmed emails at `example.com`: personal, work, and alternate. Use fixed IDs `email_personal`, `email_work` and `email_alternate`.
- 36 fictional services with meaningful names, using IDs `svc_001` through `svc_036`. Spread them across employment, education, travel, records, housing, and benefits. Include service names such as Federal Careers Workspace, National Archive Requests, Community Housing Applications, and Travel Enrollment Portal. Make `svc_025` a verified-identity service with no connection and `svc_026` an email-only service with no connection so both pathways have predictable starting points.
- 24 unique service connections `conn_001` through `conn_024` linked to `svc_001` through `svc_024`. Seed 12 connected and 12 disconnected. Use email-only services for these prior connections, rotate shared emails, and use distinct fixed timestamps and both single- and multiple-word service names. Keep at least one initial connect event per connection plus a disconnect event for each disconnected record. Add several email-change events across active and historical records.
- 24 previous canceled verification attempts across a multi-year synthetic history, alternating selected methods and early/late exit steps. Include service-linked attempts for search. All start/exit dates are fixed. The default account has no current verification or resumable attempt, so a fresh browser can exercise the whole workflow. For verified and pending worlds, inject representative attempts with matching identity links or corresponding visit fields.
- Use dates fixed before the initial build brief, in deterministic per-record order. Source literals or deterministic fixture builders both work. Repeated `createInitialData()` calls produce equal values and independent arrays.
