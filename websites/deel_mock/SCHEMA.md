# deel_mock Schema

**Base URL** `http://localhost:5396/`  
**Go Endpoint** `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`  
**Reset** `POST /post?sid=<sid>` with `{"action":"reset"}`

The application stores a single JSON object per Harbor session. Read `/go?sid=<session>` for `initial_state`, `current_state`, and `state_diff`. Use `current_state` for record assertions. The records below describe the default world and fields written by the app. Injected records may omit optional fields and references. Arrays supplied by a task replace default arrays.

## State Schema

| Key | Shape |
| --- | --- |
| `organization` | Object with `id`, `name`, `defaultCurrency`. |
| `currentUser` | Object with `id`, `name`, `role`, `email`. Default actor ID is `usr-jordan`. |
| `legalEntities[]` | `id`, `name`, `country`, `currency`. |
| `workers[]` | `id`, `name`, `email`, `type` (`contractor` or `employee`), `country`, `role`, `team`, `legalEntityId`, `annualVacationDays` (number or null), `createdBy`, `createdAt`. |
| `contracts[]` | `id`, `number`, `workerId`, `legalEntityId`, `title`, `scope`, `type` (`fixed_rate`, `pay_as_you_go`, `milestone`), `status` (`draft`, `pending_signature`, `active`, `cancelled`), `currency`, `rate` (number or null), `rateUnit` (`month`, `week`, `hour`, `day`, `task` or null), `milestones[]` (`id`, `title`, numeric `amount`, nullable `dueDate`), `startDate`, nullable `endDate`, numeric `noticeDays`, `createdBy`, `createdAt`, `updatedAt`, nullable `clientSignedAt`, `contractorSignedAt`, `sentAt`, `cancelledAt`. |
| `invoices[]` | `id`, `number`, `workerId`, `contractId`, `legalEntityId`, `currency`, `status` (`open`, `overdue`, `processing`, `paid`), `issueDate`, `dueDate`, `lineItems[]` (`id`, `description`, numeric `quantity`, `unitPrice`, `amount`), numeric `total`, nullable `paymentId`, `createdBy`, `createdAt`, `updatedAt`. |
| `payments[]` | `id`, `invoiceIds[]`, `allocations[]` (`invoiceId`, nullable `workerId`, numeric `amount`), numeric `amount`, `currency`, `method` (`studio_balance`), `status` (`processing`, `paid`), `createdBy`, `createdAt`. |
| `timeOffRequests[]` | `id`, `workerId`, `type` (`vacation`, `sick`, `unpaid`), `status` (`pending`, `approved`, `denied`, `cancelled`), `startDate`, `endDate`, `duration` (`full_day` or `half_day`), numeric `days`, `note`, `createdBy`, `createdAt`, `updatedAt`, nullable `reviewedBy`, `reviewedAt`, `decisionNote`, `cancelledAt`. |
| `activity[]` | `id`, `action`, `entityType` (`contract`, `payment`, `time_off_request`), `entityId`, `actorId`, `createdAt`, `relatedIds[]`. Agreement and time off events reference the worker ID when available. Payment events reference invoice IDs. |

IDs and currency codes are strings. Day-only fields use `YYYY-MM-DD`. Event timestamps are UTC ISO strings. The invoice list derives Overdue from the clock for stored Open rows whose due date has passed. The vacation balance derives approved weekdays in the runtime year, using half a day for an approved single-weekday half-day request. Both calculations are read-only.

### Default IDs

| Entity | Seed IDs |
| --- | --- |
| Organization and actor | `org-northstar`, `usr-jordan` |
| Legal entities | `ent-us`, `ent-gb` |
| Workers | `wrk-001`–`wrk-030` (contractors), `wrk-031`–`wrk-048` (employees) |
| Contracts | `ctr-001`–`ctr-036` (`CTR-1001`–`CTR-1036`) |
| Invoices | `inv-001`–`inv-048` (`INV-2401`–`INV-2448`) |
| Payments | `pay-001`–`pay-012` |
| Time off requests | `tor-001`–`tor-032` |
| Activity | `evt-001`–`evt-030` |

### Minimal Inject Example

This payload empties the three workflow lists, payment history and activity while retaining seeded workers and legal entities. Use a fresh `sid` and browser context when injecting.

```json
{
  "action": "set",
  "state": {
    "contracts": [],
    "invoices": [],
    "payments": [],
    "timeOffRequests": [],
    "activity": []
  }
}
```

## Observable State Changes (for LLM evaluation)

Each successful action writes the complete state once and appends one activity event. The event uses the signed-in actor ID, its own ID, and the same timestamp as the business mutation. Worker creation in the agreement workflow is part of its single write.

| UI action | Fields written | `activity[].action` |
| --- | --- | --- |
| Save new draft | Append the complete contract with `status: draft`, `createdBy`, `createdAt`, `updatedAt`, and null signature and cancellation timestamps. Append a complete contractor to `workers` if its email has no case-insensitive contractor match. | `contract.created` |
| Save draft edit | Update `workerId`, `legalEntityId`, `title`, `scope`, `type`, `currency`, `rate`, `rateUnit`, `milestones`, `startDate`, `endDate`, `noticeDays`, and `updatedAt`. Retain ID, number and available creation metadata. Status is `draft` and signature and cancellation timestamps are null. | `contract.updated` |
| Sign and send | Append or update the contract and terms, with `status: pending_signature`, `clientSignedAt`, `sentAt`, `updatedAt`, and null `contractorSignedAt` and `cancelledAt`. Append a contractor on direct send if the entered email does not match an existing contractor. | `contract.sent` |
| Confirm contract cancellation | Set `status: cancelled`, `cancelledAt` and `updatedAt` on the pending signature contract. Retain signature and invitation timestamps. | `contract.cancelled` |
| Confirm payment | Set eligible same-currency invoices to `status: processing` with shared `paymentId` and `updatedAt`. Append one complete payment, with invoice IDs, payee allocations, cent-rounded total, invoice currency, `method: studio_balance`, `status: processing` and creation metadata. | `payment.released` |
| Submit request | Append a complete request with `status: pending`, calculated weekday `days`, creation fields and `updatedAt`; decision and withdrawal fields are null. | `time_off.requested` |
| Save request changes | Update `workerId`, `type`, `startDate`, `endDate`, `duration`, `days`, `note`, and `updatedAt` on the pending request. Retain ID and available creation metadata. Decision and withdrawal fields are null. | `time_off.edited` |
| Confirm withdrawal | Set `status: cancelled`, `cancelledAt` and `updatedAt` on a pending request. | `time_off.cancelled` |
| Approve request | Set `status: approved`, `reviewedBy`, `reviewedAt`, `decisionNote: null` and `updatedAt` on a pending request. | `time_off.approved` |
| Deny request | Set `status: denied`, `reviewedBy`, `reviewedAt`, `decisionNote` (trimmed reason or null) and `updatedAt` on a pending request. | `time_off.denied` |

The first load sends `action: set` with the merged world. The API preserves the first stored initial state. `set_current` replaces the current state once a baseline exists, and `reset` restores the baseline as current state. Form entry, navigation, filter or sort changes, pagination, selection, cancelled dialogs, failed validation, downloads and idle tabs do not save business state. See [AUDIT.md](AUDIT.md) for the current same-session stale-tab limitation.

