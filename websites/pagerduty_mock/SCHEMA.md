# pagerduty_mock Schema

**Base URL**: `http://localhost:5490/`  
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}`

All records are JSON objects. IDs are opaque strings. Timestamps are UTC ISO 8601 strings. The default world has fixed identifiers and timestamps. User actions take the actor from `account.currentUserId` and the timestamp from the runtime clock.

Each changed top-level key in `state_diff` uses `modified` or `added` with the current value. The diff compares the current snapshot with the session baseline. `GET /state?sid=<sid>` supplies custom state and `POST /post?sid=<sid>` accepts full snapshots. Arrays replace defaults when loading an injected world. Objects merge recursively, and unknown injected fields are retained. `reset` restores current state to the saved initial state, or to the seed when the session has no saved initial state. Use a fresh browser context or a fresh `sid` when testing an injection because the client reuses its per-session local cache on reload.

## State Schema

| Key | Shape |
| --- | --- |
| `account` | `{name, currentUserId, timeZone}` |
| `users[]` | `{id, name, email, role, teamIds}`, with an ordered ID array in `teamIds` |
| `teams[]` | `{id, name, description}` |
| `services[]` | `{id, name, description, teamId, escalationPolicyId}`, with nullable references |
| `incidents[]` | `{id, number, title, description, serviceId, escalationPolicyId, policySnapshot, assignmentTarget, assigneeIds, status, urgency, priority, acknowledgedAt, acknowledgedBy, resolvedAt, resolvedBy, ...audit}` |
| `incidentNotes[]` | `{id, incidentId, body, createdBy, createdAt}` |
| `schedules[]` | `{id, name, description, timeZone, teamId, layers, ...audit}`, with nullable `teamId` |
| `scheduleOverrides[]` | `{id, scheduleId, userId, startAt, endAt, status, canceledAt, canceledBy, ...audit}` |
| `escalationPolicies[]` | `{id, name, description, teamId, repeatCount, rules, ...audit}`, with nullable `teamId` |
| `activity[]` | `{id, type, entityType, entityId, actorId, createdAt, details}`. Entity types are `incident`, `schedule` and `escalation_policy`. |

- Audit fields are `createdBy`, `createdAt`, `updatedBy` and `updatedAt`. Creation sets all four fields. Edits preserve creation fields.
- Incident `number` is an integer, `assigneeIds` is an array of user IDs, `status` is `triggered`, `acknowledged` or `resolved`, and `urgency` is `high` or `low`. `priority` is `P1` to `P5` or null. The four acknowledgement and resolution fields are nullable. `escalationPolicyId`, `assignmentTarget` and `policySnapshot` can be null. An assignment target is `{type, id}` with `type` equal to `user` or `escalation_policy`. A snapshot is `{policyId, rules, repeatCount}` with copied rule data.
- A layer is `{id, name, userIds, rotationType, rotationDays, startAt, handoffTime, restrictions}`. Layers and their member IDs are ordered. `rotationType` is `daily`, `weekly` or `custom`. `rotationDays` is a positive integer and `handoffTime` uses local `HH:mm`. A restriction is `{dayOfWeek, startTime, endTime}` with ISO weekday 1–7 and local `HH:mm` times.
- Override `status` is `active` or `canceled`. `canceledAt` and `canceledBy` are nullable. The most recent active override wins during its start-inclusive, end-exclusive interval. The last eligible layer wins outside overrides. Rotations advance on local calendar boundaries at the saved handoff. Overnight windows extend into the following day.
- A policy has ordered rules `{id, delayMinutes, targets}`. `repeatCount` is an integer from 0 to 9. Targets are ordered `{type, id}` objects with `type` equal to `user` or `schedule`. A rule's timeout is a positive whole number, with a three-minute minimum for multiple targets.

### Default IDs

| Entity | Fixed defaults |
| --- | --- |
| Account and users | Acme Operations with `usr-maya-chen` as the current responder. Other users include `usr-omar-patel` and `usr-elena-torres`. |
| Teams | `team-platform`, `team-commerce`, `team-security`, `team-data`, `team-customer-experience`, `team-networking`, `team-developer-tools`, `team-messaging` |
| Services | `svc-checkout`, `svc-identity-gateway`, `svc-search-indexer`, `svc-core-api`; other IDs use `svc-` plus the hyphenated service name. |
| Incidents and notes | `inc-1042` through `inc-979`. Seeded notes use `note-<incident number>-01` for incident numbers 1042 through 1003. |
| Schedules | `sch-platform-primary`, `sch-commerce-primary`, `sch-platform-secondary`, `sch-platform-weekend-response`, `sch-commerce-release-coverage`; other IDs use `sch-` plus the hyphenated schedule name. Layer IDs append `-core` or `-business`. |
| Shift overrides | `ovr-platform-01`, `ovr-2` through `ovr-12` |
| Escalation policies | `pol-platform-primary`, `pol-commerce-primary`, `pol-platform-secondary`; other IDs use `pol-` plus the hyphenated policy name. Rule IDs append `-01` or `-02`. |
| Activity | `evt-<event type>-<entity ID>`, with the note or override ID in place of the entity ID for note and override events. |

## Minimal Inject Example

```json
{
  "account": {"name": "Acme Operations"},
  "users": [],
  "teams": [],
  "services": [],
  "incidents": [],
  "incidentNotes": [],
  "schedules": [],
  "scheduleOverrides": [],
  "escalationPolicies": [],
  "activity": []
}
```

## Observable State Changes (for LLM evaluation)

Each successful action sends one full-state `set_current`. Listed activity event types append records with the actor, timestamp and entity ID. Structured `changes` entries use `{before, after}` per changed field.

| User action | Record writes | Activity type and details |
| --- | --- | --- |
| Create incident | Append incident with next integer number above the highest loaded number or 1000, service, policy ID and snapshot, policy assignment target, deduplicated responders from the first covered level, entered fields, triggered status, null lifecycle fields and creation audit | `incident.created` with `{serviceId, escalationPolicyId, assigneeIds}` |
| Acknowledge | For each triggered incident, set status to acknowledged, `assigneeIds` to the actor, `acknowledgedAt`, `acknowledgedBy` and update audit | `incident.acknowledged` with `{previousStatus, status}` for each changed incident |
| Resolve | For each selected open incident, set status to resolved, `resolvedAt`, `resolvedBy` and update audit | `incident.resolved` with `{previousStatus, status}` for each changed incident |
| Reassign | Set `assignmentTarget`, `assigneeIds`, triggered status, null acknowledgement fields and update audit. A policy reassignment also updates `escalationPolicyId` and `policySnapshot`. | `incident.reassigned` with `{previousAssigneeIds, assigneeIds, assignmentTarget}` |
| Edit incident | Update `title`, `description`, `priority`, `urgency` and update audit. Raising an acknowledged low-urgency incident to high also resets status to triggered and clears acknowledgement fields. | `incident.updated` with `{changes}` |
| Add note | Append note with `incidentId`, trimmed `body`, author and timestamp | `incident.note_added` with `{noteId}` |
| Create schedule | Append schedule with `name`, `description`, `timeZone`, `teamId`, ordered layers and creation audit | `schedule.created` with `{layerIds}` |
| Edit schedule | Update those schedule fields and update audit, retaining surviving layer IDs and every existing override | `schedule.updated` with `{changes}` |
| Add override | Append active override with schedule and user IDs, start and end times, null cancellation fields and creation audit | `schedule.override_added` with `{overrideId, userId, startAt, endAt}` |
| Cancel override | Set status to canceled, `canceledAt`, `canceledBy` and update audit | `schedule.override_canceled` with `{overrideId, userId, startAt, endAt}` |
| Delete schedule | Remove the schedule. Set status, cancellation fields and update audit on its active overrides. Current policy and open incident snapshot references block deletion. | `schedule.deleted` with `{name, canceledOverrideIds}` |
| Create policy | Append policy with `name`, `description`, `teamId`, `repeatCount`, ordered rules and creation audit. Update `services[].escalationPolicyId` on explicitly assigned services. | `policy.created` with `{ruleIds, affectedServiceIds}` |
| Edit policy | Update those policy fields and update audit, retaining surviving rule IDs. Update `services[].escalationPolicyId` on explicitly moved, replaced or unassigned services. | `policy.updated` with `{ruleIds, affectedServiceIds}` |
| Delete policy | Remove an unused policy. Linked services block deletion. Incident routing snapshots and existing activity are preserved. | `policy.deleted` with `{name}` |

Fresh storage for a session sends a baseline `set`. Reloads with cached state, view changes, filtering, draft changes, validation failures, cancellation, inspection and idle time emit zero business writes. Policy configuration is consulted during user-initiated incident creation and reassignment. The app derives coverage on view and has no write timers.
