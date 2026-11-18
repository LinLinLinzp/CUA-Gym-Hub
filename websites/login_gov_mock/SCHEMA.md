# Login.gov Mock Schema

- **Base URL** `http://localhost:5544/`
- **Go endpoint** `GET /go?sid=<sid>` returns `initial_state`, `current_state`, and `state_diff`. The diff is keyed by changed top-level fields, whose entries contain `modified` or `added` values.
- **Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{…}}`. Open the same SID in a fresh browser context so bootstrap reads the injected state.
- **Reset** `POST /post?sid=<sid>` with `{"action":"reset"}` restores the API's saved baseline. Use a fresh browser context when reopening a reset SID to avoid its cached state.

Business changes save the full state once. All dates below are ISO 8601 UTC timestamps. IDs, labels, email addresses, enum values and visit references are strings. Document and contact samples are display-only.

## State Schema

| Top-level key | Fields |
| --- | --- |
| `account` | `id`, `displayName`, `primaryEmailId` |
| `emails[]` | `id`, `address`, `label`, `status` (`confirmed` or `unconfirmed`) |
| `identity` | `accountId`, `status` (`unverified` or `verified`), `updatedAt`, optional `verifiedAt` and `verificationAttemptId` |
| `verificationAttempts[]` | `id`, `accountId`, `actorId`, optional `serviceId`, `status` (`in_progress`, `pending_in_person`, `verified`, `canceled`), `step` (`method`, `sample_identity`, `sample_contact`, `review`, `visit`, `complete`), optional `method` (`online` or `in_person`), optional `documentType` (`state_id`, `drivers_license`, `passport`), boolean `sampleIdentityConfirmed` and `sampleContactConfirmed`, `createdAt`, `updatedAt`, optional `visitReference`, `visitDeadlineAt`, `submittedAt`, `completedAt`, `canceledAt` |
| `services[]` | `id`, `name`, `agency`, `category`, optional `description`, boolean `requiresVerifiedIdentity`, string array `requestedAttributes` |
| `connections[]` | `id`, `accountId`, `serviceId`, `status` (`connected` or `disconnected`), `sharedEmailId`, string array `sharedAttributes`, `createdAt`, `updatedAt`, `connectedAt`, optional `disconnectedAt` |
| `connectionEvents[]` | `id`, `connectionId`, `accountId`, `serviceId`, `actorId`, `type` (`connected`, `reconnected`, `shared_email_changed`, `disconnected`), `createdAt`, `before` and `after` snapshots |

Snapshots contain `status`, `sharedEmailId`, `sharedEmailAddress` and `sharedAttributes`. Unresolved email references yield a null address. The first connect event has a null `before` snapshot. Account-owned rows are scoped using `accountId`. Injected fields outside this schema are preserved by writes.

### Default IDs

- Account `acct_jordan`. Confirmed emails `email_personal`, `email_work`, and `email_alternate`.
- Verification attempts `va_001` through `va_024`.
- Services `svc_001` through `svc_036`. `svc_025` is an unconnected identity-gated service and `svc_026` is an unconnected email-only service.
- Connections `conn_001` through `conn_024`. The numeric suffix matches the related service.
- Connection events use `evt_<three-digit connection suffix>_connected`, `evt_<suffix>_email` for seed email changes, and `evt_<suffix>_disconnected` for seed disconnections.

## Minimal Inject Example

This state uses the default account and confirmed emails, a single catalog service and empty histories. Arrays replace defaults and omitted objects keep their defaults.

```json
{
  "verificationAttempts": [],
  "services": [
    {
      "id": "svc_audit",
      "name": "Sample Records Portal",
      "agency": "Sample Records Office",
      "category": "Records",
      "requiresVerifiedIdentity": false,
      "requestedAttributes": ["email"]
    }
  ],
  "connections": [],
  "connectionEvents": []
}
```

## Observable State Changes (for LLM evaluation)

| Action | Record writes |
| --- | --- |
| Verify identity | Appends one `verificationAttempts[]` record with account and actor IDs, optional resolved service ID, `in_progress`, `method` step, false confirmations, and creation/update times. Requires an unverified account without an active attempt. |
| Continue from Method | Updates the same draft with `method`, `sample_identity` step and `updatedAt`. Changing method clears document type and both confirmations. |
| Continue from Review sample identity | Updates `documentType`, `sampleIdentityConfirmed: true`, `sample_contact` step and `updatedAt`. Changing document type clears contact confirmation. |
| Continue from Confirm sample contact | Updates `sampleContactConfirmed: true`, `review` step and `updatedAt`. |
| Submit online / complete unexpired sample visit | Updates the same attempt to `verified`, `complete`, and sets `completedAt` and `updatedAt`. Online submission also sets `submittedAt`. In the same write, sets `identity.accountId`, `status: verified`, `verifiedAt`, `verificationAttemptId` and `updatedAt`. |
| Submit for an in-person visit | Updates the same attempt with `pending_in_person`, `visit` step, `visitReference`, `visitDeadlineAt` (seven days after submission), `submittedAt` and `updatedAt`. |
| Cancel verification | Updates the active attempt to `canceled` and sets `canceledAt` and `updatedAt`. |
| Agree and connect | Appends one connection with account/service IDs, `connected` status, the eligible email and requested attribute snapshot, plus creation/update/connection times. Appends a `connected` event. A gated service requires verified identity. |
| Agree and reconnect | Updates the disconnected connection's `status`, `sharedEmailId`, `sharedAttributes`, `connectedAt` and `updatedAt` and removes `disconnectedAt`. Appends a `reconnected` event. |
| Change shared email | Updates the active connection's `sharedEmailId` and `updatedAt`. Appends a `shared_email_changed` event with before/after IDs and addresses. Requires a different confirmed address. |
| Disconnect service | Updates the active connection's `status`, `disconnectedAt` and `updatedAt`. Appends a `disconnected` event. |

Each connection event stores its own ID, account, service, actor and connection IDs, before/after snapshots, and the matching mutation timestamp. Filtering, viewing, navigation, form edits before confirmation, validation failures and duplicate actions make no business writes.
