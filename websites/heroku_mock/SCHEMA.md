# heroku_mock Schema

**Base URL**: `http://localhost:5482/`  
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}`

The state API serves JSON from `/go?sid=<session>`. The payload contains
`initial_state`, `current_state`, and a `state_diff` keyed by changed top-level
fields. Business records are in `current_state`. The local catalog and filters
are outside that state.

All IDs and labels are strings. Dates are UTC ISO 8601 strings. Quantities and
release versions are integers, and monthly prices are numeric USD amounts.
Fields marked optional can be absent in injected data. A before value can be
`null` if the injected record lacks the corresponding field.

## State Schema

| Key | Shape | Fields |
|---|---|---|
| `account` | Object | `id`, `name`, `email`, `workspaceName` |
| `apps` | Array | `id`, `name`, `region` (`us`, `eu`), `stack`, `status` (`active`, `maintenance`, `deleted`), `actorId`, `createdAt`, `updatedAt`. Optional `activeReleaseId`, `deletedAt`. |
| `formations` | Array | `id`, `appId`, `processType`, `size` (`eco`, `basic`, `standard-1x`, `standard-2x`), `quantity`, `status` (`running`, `stopped`, `retired`), `actorId`, `createdAt`, `updatedAt`. Optional `command`, `lastRestartedAt`. |
| `addOns` | Array | `id`, `appId`, `serviceKey`, `serviceName`, `name`, `planKey`, `monthlyPrice`, `status` (`provisioned`, `removed`), `actorId`, `createdAt`, `updatedAt`. Optional `removedAt`. |
| `releases` | Array | `id`, `appId`, `version`, `type` (`initial`, `deploy`, `add_on`, `rollback`), `status` (`succeeded`, `failed`, `pending`, `expired`), `description`, `actorId`, `createdAt`. Optional `revision`, `rollbackToReleaseId`, `addOnId`, `addOnEventId`. |
| `appEvents` | Array | `id`, `appId`, `type` (`create`, `rename`, `delete`), `name`, `actorId`, `createdAt`, `status` (`completed`). Create includes `initialReleaseId`, rename includes `previousName` when present, and delete includes `formationIds` and `addOnIds`. |
| `dynoEvents` | Array | `id`, `appId`, `type` (`scale`, `resize`, `scale_and_resize`, `restart`), `formationIds`, `quantity`, `actorId`, `createdAt`, `status` (`completed`). Edits include `size`, `previousSize`, and `previousQuantity`. |
| `addOnEvents` | Array | `id`, `appId`, `addOnId`, `releaseId`, `type` (`provision`, `change_plan`, `remove`), `planKey`, `monthlyPrice`, `actorId`, `createdAt`, `status` (`completed`). Plan changes and removals include `previousPlanKey` and `previousMonthlyPrice`. |

New records and events use `account.id` as `actorId` and
`new Date().toISOString()` as `createdAt`. Each action sets `actorId` and
`updatedAt` on the mutable rows it updates and saves one full snapshot.

### Default IDs

- Account: `usr-avery-morgan`.
- Apps: `app-001` through `app-032`.
- Formations: `formation-<appId>-<processType>`, for example `formation-app-001-web`.
- Add-ons: `addon-<appId>-<slot>` with slots `01` and `02` where present.
- Releases: `release-<appId>-<version>` with three-digit versions, for example `release-app-001-004`.
- Event arrays start empty.

## Minimal Inject Example

```json
{
  "apps": [
    {
      "id": "app-fixture",
      "name": "fixture-app",
      "region": "eu",
      "stack": "heroku-24",
      "status": "active",
      "actorId": "usr-avery-morgan",
      "createdAt": "2026-10-12T14:30:00.000Z",
      "updatedAt": "2026-10-12T14:30:00.000Z"
    }
  ],
  "formations": [],
  "addOns": [],
  "releases": [],
  "appEvents": [],
  "dynoEvents": [],
  "addOnEvents": []
}
```

## Observable State Changes

| User action | Written fields |
|---|---|
| Create app | Append an active `apps` row in the chosen region with `stack: heroku-24` and `activeReleaseId`. Append a succeeded `releases` v1 of type `initial`. Append `appEvents` create with app name and `initialReleaseId`. |
| Rename app | Set `apps[].name`. Append `appEvents` rename with `previousName` and the new `name`. |
| Delete app | Set `apps[].status: deleted` and `deletedAt`. Set linked nonretired `formations[].status: retired`. Set linked nonremoved `addOns[].status: removed` and `removedAt`. Append `appEvents` delete with IDs of the affected formations and add-ons. |
| Edit formation | Set `formations[].size`, `quantity`, and `status` based on the quantity. Append `dynoEvents` with linked formation ID, before and after size and quantity, and the corresponding edit type. Eco and Basic allow 0–1. Standard sizes allow 0–10. |
| Restart all dynos | Set `formations[].lastRestartedAt` on running formations. Append one `dynoEvents` restart with their IDs and the total restarted quantity. |
| Provision add-on | Append a provisioned `addOns` row with the selected service, plan and price. Append `addOnEvents` provision with `addOnId`, `planKey`, `monthlyPrice`, and `releaseId`. Create and activate an add-on release. |
| Change add-on plan | Set `addOns[].planKey` and `monthlyPrice`. Append `addOnEvents` change_plan with previous and new plan and price. Create and activate an add-on release. |
| Remove add-on | Set `addOns[].status: removed` and `removedAt`. The instance retains its final plan and price for history. Append `addOnEvents` remove with the final plan, `monthlyPrice: 0` and the previous price and plan. Create and activate an add-on release. |
| Create an add-on release | Append a succeeded `releases` row of type `add_on`, with its `addOnId`, `addOnEventId`, and previous active revision when present. Set `apps[].activeReleaseId`. |
| Deploy revision | Append a succeeded `releases` row of type `deploy` with the submitted `revision` and `description` or generated description. Set `apps[].activeReleaseId`. |
| Roll back | Append a succeeded `releases` row of type `rollback` with `rollbackToReleaseId` and the target revision when present. Set `apps[].activeReleaseId`. The target must be older than the active version and succeeded. |

Each new release uses the largest version for that app plus one. Resource deletion
and rollback retain historical records. Read-only navigation, filters, release
inspection, Quick Jump, cancellations, invalid input, and unchanged edits send
no business writes.
