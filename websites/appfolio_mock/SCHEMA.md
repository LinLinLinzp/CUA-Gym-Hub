# appfolio_mock Schema

| Operation | Interface |
| --- | --- |
| Base URL | `http://localhost:5439/` |
| Inspect | `GET /go?sid=<sid>` returns `{initial_state, current_state, state_diff}`. |
| Load stored state | `GET /state?sid=<sid>` returns `{stored_state, has_custom_state, sid}`. |
| Inject | `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`. |
| Update | `POST /post?sid=<sid>` with `{"action":"set_current","state":{...}}`. |
| Reset | `POST /post?sid=<sid>` with `{"action":"reset"}` restores the stored initial state, or defaults if the session has no initial state. Use a fresh browser context to load the reset state. |

Use a fresh session ID and browser context for each injected scenario. On first load, injected arrays replace default arrays, objects merge, and unknown keys survive later writes. The template retains the first posted baseline as `initial_state` and groups diffs by top-level key. When injection established the baseline with a partial state, defaults merged on boot can also appear in `state_diff`. Use `current_state` to inspect the complete workspace and record-level values.

## State Schema

Calendar days use `YYYY-MM-DD`, timestamps are ISO 8601 strings, and amounts are USD numbers with up to two decimal places. Square brackets indicate an array. Optional fields may be absent, null, or empty for text. Each property, unit, lease, order, charge and payment has a string `id` plus `createdAt`, `createdBy`, `updatedAt`, and `updatedBy`. Actor fields link to `account.id`. Existing records keep their creation metadata during updates.

| Key | Fields |
| --- | --- |
| `account` | `id`, `name`, `workspaceName`, `role`. Defaults to Jordan Ellis at Cedarline Property Services with ID `staff-001`. |
| `properties[]` | `name`, `address1`, optional `address2`, `city`, `region`, `postalCode`, `type` (`multifamily`, `single_family`, `commercial`), `status` (`active`, `archived`), optional `notes`. |
| `units[]` | `propertyId` → property, `label`, integer `beds`, numeric `baths` and `marketRent`, boolean `rentReady`, `status` (`active`, `archived`). |
| `leases[]` | `propertyId` → property, `unitId` → unit, `residentName`, optional `residentEmail`, `startDate`, `endDate`, numeric `monthlyRent` and `deposit`, `status` (`recorded`, `ended`), optional `renewedFromLeaseId` → preceding lease, `endedOn`, `endReason`. |
| `assignees[]` | `id`, `name`, `type` (`staff`, `vendor`), optional `trade`. |
| `workOrders[]` | `propertyId` → property, optional `unitId` → unit, `title`, `description`, `category` (`plumbing`, `electrical`, `hvac`, `appliance`, `general`), `priority` (`low`, `normal`, `high`, `urgent`), `permissionToEnter` (`yes`, `no`, `unknown`), `status` (`open`, `assigned`, `scheduled`, `in_progress`, `completed`, `canceled`), optional `assigneeId` → assignee, `scheduledFor` (day), `startedAt`, `completedAt`, `completionNote`, `canceledAt`, `cancelReason`, and `history[]`. |
| `rentCharges[]` | `leaseId` → lease, `type` (`rent`, `fee`), `description`, `postedOn`, `dueOn`, positive `amount`, `status: "posted"`. |
| `rentPayments[]` | `leaseId` → lease, `chargeId` → charge of the same lease, `receivedOn`, positive `amount`, `method` (`check`, `cash`, `bank_transfer`, `other`), optional `reference`, `status: "recorded"`. |

Each work-order history event has `id`, `action` (`created`, `edited`, `assigned`, `scheduled`, `started`, `completed`, `canceled`), `toStatus`, optional `fromStatus`, `createdAt`, and `createdBy`. Assignment adds `assigneeId`, scheduling adds `scheduledFor`, and completion and cancellation add `note`.

### Default IDs

| Collection | Fixed IDs |
| --- | --- |
| Account | `staff-001` |
| Properties | `prop-001` through `prop-028` |
| Units | `unit-001` through `unit-084` |
| Leases | `lease-001` through `lease-048` |
| Assignees | `asgn-001` through `asgn-012` |
| Work orders | `wo-001` through `wo-042` |
| Rent charges | `charge-001` through `charge-072` |
| Rent payments | `payment-001` through `payment-048` |

### Minimal Inject Example

This empty portfolio uses the default account.

```json
{
  "action": "set",
  "state": {
    "properties": [],
    "units": [],
    "leases": [],
    "assignees": [],
    "workOrders": [],
    "rentCharges": [],
    "rentPayments": []
  }
}
```

## Observable State Changes

Each accepted form writes the complete workspace once. Each append includes a new ID and creation and update metadata. Updates refresh `updatedAt` and `updatedBy`.

| User action | Collection and exact business fields written |
| --- | --- |
| Add / edit property | Append or update `properties[]`. Write `name`, `address1`, `address2`, `city`, `region`, `postalCode`, `type`, `status`, `notes`. Archiving is blocked while a linked current or future lease is in effect. |
| Add / edit unit | Append or update `units[]` with `propertyId`, `label`, `beds`, `baths`, `marketRent`, `rentReady`, `status`. The label is unique within its property and archiving is blocked while a linked current or future lease is in effect. |
| Create / edit lease | Append or update `leases[]` with `propertyId`, `unitId`, `residentName`, `residentEmail`, `startDate`, `endDate`, `monthlyRent`, `deposit`, `status`. New terms use `recorded`. |
| Renew lease | Append the new lease fields above plus `renewedFromLeaseId` referencing the source term. The source term and its ledger stay linked to the original ID. |
| End lease | Update the selected `leases[]` item with `status: "ended"`, `endedOn` and `endReason`. |
| Create / edit work order | Append or update `workOrders[]` with `propertyId`, `unitId`, `title`, `description`, `category`, `priority`, `permissionToEnter`, `status` and `history`. Creation sets `open` and a `created` event. Editing appends an `edited` event and retains its status. |
| Assign | Set `status: "assigned"` and `assigneeId`, append assigned event with the assignee ID. |
| Schedule / reschedule | Set `status: "scheduled"` and `scheduledFor`, append scheduled event with the scheduled day. |
| Start work | Set `status: "in_progress"` and `startedAt`, append started event. |
| Complete | Set `status: "completed"`, `completedAt`, `completionNote`, append completed event with `note`. |
| Cancel work order | Set `status: "canceled"`, `canceledAt`, `cancelReason`, append canceled event with `note`. |
| Post charge | Append `rentCharges[]` with a valid `leaseId`, `type`, `description`, `postedOn`, `dueOn`, `amount`, `status: "posted"`. |
| Record payment | Append `rentPayments[]` with the same `leaseId` as its `chargeId`, `receivedOn`, `amount`, `method`, `reference`, `status: "recorded"`. The amount is capped at the selected charge's outstanding balance. |

Occupancy, lease phases, open balances, and running ledger totals are calculated from saved records. After the baseline POST, browsing, filtering, idle time, form validation failures and dialog dismissal produce zero writes.

