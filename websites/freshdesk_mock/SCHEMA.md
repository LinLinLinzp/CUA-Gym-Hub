# freshdesk_mock Schema

**Base URL** `http://localhost:5452/`  
**Go Endpoint** `GET /go?sid=<sid>` returns `initial_state`, `current_state`, and `state_diff`.  
**Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`. Open the app at `/?sid=<sid>` in a fresh browser session after injecting.  
**Reset** `POST /post?sid=<sid>` with `{"action":"reset"}` restores the initial state in the Vite API. Use a fresh SID or clear the browser's cached state before opening a reset session.

## State Schema

The state is one JSON object per Harbor session. IDs are strings and timestamps are ISO 8601 UTC strings. Filled-out records represent absent links and deadlines with `null`. The account's `currentAgentId` supplies the actor for user actions. Injected arrays replace seed arrays, injected objects merge, and record updates preserve unrecognized fields. In `state_diff`, each changed top-level key contains its current value under `modified` or `added`. Per-field changes are available in the event records.

| Key | Type | Description |
| --- | --- | --- |
| `account` | object | `id`, `name`, `currentAgentId`. |
| `agents` | array | `id`, `name`, `email`, `role` (admin or agent), `groupIds[]`. |
| `groups` | array | `id`, `name`, `description`. |
| `contacts` | array | `id`, `name`, `email`, optional `company`, `createdAt`, `createdBy`. |
| `tickets` | array | `id`, integer `number`, `subject`, `description`, `requesterId`, `status`, `priority`, `type`, `source`, `groupId`, `assigneeId`, `tags[]`, `createdBy`, `createdAt`, `updatedAt`, `resolvedAt`, `closedAt`, `slaPolicyId`, `firstResponseDueAt`, `firstRespondedAt`, `lastCustomerReplyAt`, `nextResponseDueAt`, `lastRespondedAt`, `resolutionDueAt`, `firstResponseDueOverrideAt`, `resolutionDueOverrideAt`. |
| `ticketConversations` | array | `id`, `ticketId`, `authorId`, `kind` (reply, note, or customer_reply), `visibility` (public or private), `body`, `cannedResponseIds[]`, `createdAt`. Customer replies link to contacts. Other entries link to agents. |
| `ticketEvents` | array | `id`, `ticketId`, `type` (created, updated, reply_sent, note_added, sla_due_dates_updated, or customer_reply_received for seed history), `actorId`, `createdAt`, `changes`, `conversationId`. |
| `slaPolicies` | array | `id`, `name`, `description`, `enabled`, `isDefault`, integer `rank`, `matchMode` (all or any), `conditions[]` of `{field, value}`, `hoursMode` (calendar or business), `scheduleId`, `targets`, `createdBy`, `createdAt`, `updatedAt`, `deletedAt`. Each priority in `targets` has integer `firstResponseMinutes`, `everyResponseMinutes`, and `resolutionMinutes`. |
| `businessSchedules` | array | `id`, `name`, `timeZone` (UTC), `weekdays[]` numbered Sunday 0 through Saturday 6, `startMinute` and `endMinute` counted from midnight UTC. |
| `cannedResponseFolders` | array | `id`, `name`, `createdBy`, `createdAt`, `updatedAt`. |
| `cannedResponses` | array | `id`, `folderId`, `title`, `body`, `shortCode`, `visibility` (everyone, groups, or myself), `groupIds[]`, `ownerId`, `createdAt`, `updatedAt`, `deletedAt`. |
| `adminEvents` | array | `id`, `entityType` (sla_policy, canned_response, or canned_response_folder), `entityId`, `action` (created, updated, activated, deactivated, reordered, deleted, or moved), `actorId`, `createdAt`, `changes`. |

Ticket status is `open`, `pending`, `resolved`, or `closed`. Priority is `low`, `medium`, `high`, or `urgent`. Types are `question`, `incident`, `problem`, and `request`. Sources are `email`, `portal`, `phone`, and `chat`.

Event `changes` maps exact field names to `{from, to}` with `null` for absent values. Ticket creation events have an empty changes object. Ticket numbers increase from the current maximum, with 1001 as the initial number in an empty account. IDs for new records use UUIDs prefixed by record type.

### Default IDs

- Account `acct-ops` starts as agent `agt-01` (Morgan Ellis). Agent IDs range from `agt-01` to `agt-12`, and contacts from `con-01` to `con-40`.
- Groups are `grp-logistics`, `grp-billing`, `grp-suppliers`, `grp-access`, `grp-equipment`, and `grp-service`.
- Tickets range from `tkt-1001` to `tkt-1048`. Conversation IDs range from `msg-001` to `msg-091`, and ticket event IDs from `te-1` to `te-161`.
- SLA policies use the group suffixes above with the `sla-` prefix and numeric suffixes `-2` and `-3` for additional policies in every group. The `-4` policy exists for each group except Service. The default is `sla-default`, and the schedule is `biz-ops`.
- Folders are `crf-freight`, `crf-billing`, `crf-suppliers`, `crf-access`, `crf-equipment`, and `crf-service`. Responses range from `cr-001` to `cr-036`. The seed has no admin events.

## Minimal Inject Example

Use this as the `state` value in the injection request for a single-ticket account. The omitted account fields use their seed values.

```json
{
  "agents": [{"id":"agt-01","name":"Morgan Ellis","role":"admin"}],
  "groups": [],
  "contacts": [{"id":"contact-example","name":"Drew Patel","email":"drew@example.test"}],
  "tickets": [{"id":"ticket-example","number":1001,"subject":"Check pickup window","requesterId":"contact-example","status":"open","priority":"medium"}],
  "ticketConversations": [],
  "ticketEvents": [],
  "slaPolicies": [],
  "businessSchedules": [],
  "cannedResponseFolders": [],
  "cannedResponses": [],
  "adminEvents": []
}
```

## Observable State Changes (for LLM evaluation)

| User action | State changes |
| --- | --- |
| Create ticket | Append `tickets[]` with all fields above. Append `contacts[]` if the requester email did not match a contact. Append `ticketEvents[]` of type `created`. |
| Save ticket properties, resolve, close, reopen, or bulk update | Change applicable `tickets[].status`, `priority`, `type`, `source`, `groupId`, `assigneeId`, `tags`, `resolvedAt`, `closedAt`, and `updatedAt`. A priority or matching-field change can also change `slaPolicyId`, `firstResponseDueAt`, `nextResponseDueAt`, and `resolutionDueAt`. Append one `updated` event per changed ticket. |
| Send reply or save note | Append `ticketConversations[]` with all fields above. Template provenance is stored as distinct IDs in `cannedResponseIds` for replies. Update `tickets[].updatedAt` and optional status, `resolvedAt`, and `closedAt`. Public responses also set `firstRespondedAt` if absent, set `lastRespondedAt`, and clear `nextResponseDueAt`. Append `reply_sent` or `note_added` with the new `conversationId`. |
| Save manual SLA due dates | Change `tickets[].firstResponseDueAt` and `firstResponseDueOverrideAt`, and/or `resolutionDueAt` and `resolutionDueOverrideAt` for edited deadlines. Update `updatedAt` and append a `sla_due_dates_updated` event. |
| Create or edit policy | Append all `slaPolicies[]` record fields for a new policy, or update changed `name`, `description`, `enabled`, `matchMode`, `conditions`, `hoursMode`, `scheduleId`, `targets`, and `updatedAt`. Append a `created` or `updated` admin event. Default fallback rank may also advance on creation and gets a separate `reordered` event. |
| Activate or deactivate policy | Update `slaPolicies[].enabled` and `updatedAt`. Append an `activated` or `deactivated` admin event. |
| Move or delete custom policy | Change `slaPolicies[].rank` and `updatedAt` for each affected policy, or set `deletedAt` and `updatedAt` for the deleted policy. Append a `reordered` or `deleted` admin event per changed policy. |
| Create or rename folder | Append `cannedResponseFolders[]` or update `name` and `updatedAt`. Append a `created` or `updated` admin event. |
| Create, edit, move, or delete response | Append `cannedResponses[]`, patch editable `folderId`, `title`, `body`, `shortCode`, `visibility`, `groupIds`, or set `deletedAt`. Set `updatedAt` and append the corresponding `created`, `updated`, `moved`, or `deleted` admin event. |
| View, search, filter, sort, paginate, select, preview, insert an unsent template, cancel, reject validation, or submit unchanged fields | No business state changes. |

Matching fields are `groupId`, `source`, and `type`. The first enabled, undeleted custom policy by rank wins, followed by the active default. Policy administration leaves saved ticket deadlines intact. A qualifying ticket edit recomputes outstanding deadlines, honoring first-response and resolution overrides and keeping completed deadlines. Business targets accrue during the UTC schedule's configured weekday windows. For an outstanding follow-up, the calculation starts at `lastCustomerReplyAt`.

The composer resolves `{{ticket.requester.name}}`, `{{ticket.id}}` (visible ticket number), and `{{ticket.subject}}`. Group responses require the acting agent's group membership in the picker. Personal responses require ownership.
