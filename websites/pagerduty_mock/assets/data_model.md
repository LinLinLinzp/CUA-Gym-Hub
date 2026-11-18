# PagerDuty state model

`createInitialData()` in `src/data/seed.js` returns the top-level keys below. All fields are plain JSON values. IDs are opaque strings and timestamps are UTC ISO 8601 strings. Use fixed values for the seed and `new Date().toISOString()` for user actions. Generate stable unique IDs once per successful creation. Keep the same ID on edits, including edited nested rules and layers.

## Top-level records

| Key | Type and fields | Example |
| --- | --- | --- |
| `account` | Object with `name`, `currentUserId`, `timeZone` strings | `Acme Operations`, `usr-maya-chen`, `America/New_York` |
| `users` | Array of `{id, name, email, role, teamIds}`. `teamIds` is a string array. Other fields are strings. | `usr-maya-chen`, `Maya Chen`, `maya.chen@example.test`, `Responder`, `["team-platform"]` |
| `teams` | Array of `{id, name, description}` strings | `team-platform`, `Platform`, `Core infrastructure and reliability` |
| `services` | Array of `{id, name, description, teamId, escalationPolicyId}`. Reference fields are string or null. | `svc-checkout`, `Checkout API`, `Checkout request handling`, `team-commerce`, `pol-commerce-primary` |
| `incidents` | Array of incident records with fields below | `inc-1042`, `1042`, `Checkout gateway latency above threshold` |
| `incidentNotes` | Array of `{id, incidentId, body, createdBy, createdAt}` strings | `note-1042-01`, `inc-1042`, `Latency rose after the edge rollout.`, `usr-maya-chen`, `2026-11-17T15:04:00.000Z` |
| `schedules` | Array of schedule records with ordered layers | `sch-platform-primary`, `Platform Primary` |
| `scheduleOverrides` | Array of override records with user and schedule references | `ovr-platform-01`, `sch-platform-primary`, `usr-maya-chen` |
| `escalationPolicies` | Array of policy records with ordered rules | `pol-commerce-primary`, `Commerce Primary` |
| `activity` | Array of structured audit events | `evt-1042-create`, `incident.created`, `inc-1042` |

Incidents, schedules, overrides and policies include `createdBy`, `createdAt`, `updatedBy` and `updatedAt` strings. Use the same actor and time for creation and initial update. Each successful edit refreshes the update fields and preserves creation fields. Where service assignments change, `services[].escalationPolicyId` is the source of truth and the policy activity records the affected service IDs.

## Incidents

| Field | Type | Example |
| --- | --- | --- |
| `id`, `number` | String, integer | `inc-1042`, `1042` |
| `title`, `description` | Strings | `Checkout gateway latency above threshold`, `p95 exceeded 900 ms in us-east` |
| `serviceId`, `escalationPolicyId` | String, nullable string | `svc-checkout`, `pol-commerce-primary` |
| `policySnapshot` | `{policyId, rules, repeatCount}` or null | `policyId: pol-commerce-primary`, rules as described below, `repeatCount: 2` |
| `assignmentTarget` | `{type, id}` or null. Type is `user` or `escalation_policy`. | `{"type":"escalation_policy","id":"pol-commerce-primary"}` |
| `assigneeIds` | Array of user IDs | `["usr-maya-chen"]` |
| `status` | `triggered`, `acknowledged`, `resolved` | `triggered` |
| `urgency`, `priority` | `high` or `low`, and `P1` through `P5` or null | `high`, `P2` |
| `acknowledgedAt`, `acknowledgedBy` | Timestamp and user ID, both nullable | `2026-11-17T15:00:00.000Z`, `usr-maya-chen` |
| `resolvedAt`, `resolvedBy` | Timestamp and user ID, both nullable | `2026-11-17T15:28:00.000Z`, `usr-maya-chen` |

For creation, obtain the next display number from the highest valid integer in the loaded incidents, with 1000 as the minimum starting number. Initialize lifecycle milestones to null and `assignmentTarget` to the service policy. Resolve the first covered rule at the action time. For each rule, look up direct users and active schedule coverage, deduplicate responder IDs, and skip levels with no eligible users. Save no incident if all rules lack coverage. Copy the policy's rule data into the incident snapshot so edits to the policy cannot alter previous incident routing. A direct-user reassignment sets `assignmentTarget` and `assigneeIds` while retaining the incident's current policy snapshot. Acknowledging sets the active user as the owner. Incident note authors use `createdBy` and appear independently of the incident's current owner.

## Schedules and overrides

`schedules[]` includes `id`, `name`, `description`, `timeZone`, nullable `teamId`, and `layers`. Example schedule `sch-platform-primary` uses `America/New_York` and `team-platform`.

| Layer field | Type | Example |
| --- | --- | --- |
| `id`, `name` | Strings | `layer-platform-core`, `Primary rotation` |
| `userIds` | Ordered string array | `["usr-maya-chen","usr-omar-patel"]` |
| `rotationType`, `rotationDays` | `daily`, `weekly` or `custom`, plus positive integer | `weekly`, `7` |
| `startAt` | Timestamp anchoring the first member's handoff | `2026-11-16T14:00:00.000Z` |
| `handoffTime` | Local `HH:mm` | `09:00` |
| `restrictions` | Array of `{dayOfWeek, startTime, endTime}`. Days are ISO integers 1–7. Times are local `HH:mm`. | `[{"dayOfWeek":1,"startTime":"09:00","endTime":"17:00"}]` |

An empty restrictions array means continuous eligibility. The editor anchors `startAt` to the first local handoff and uses `rotationDays` calendar days in schedule time, including daylight-saving changes. Resolve coverage from the most recent active override for the instant, breaking ties by ID, then the last eligible layer in saved order. Within a layer rotate through `userIds`. Use start-inclusive and end-exclusive windows. For restriction windows that cross midnight, extend the end into the next day. If no layer covers the time, render a gap. Use the same calculation for the timeline, effective responder and incident assignment. Derive all shift segments and current responder labels from schedule records and the viewed time.

`scheduleOverrides[]` includes `id`, `scheduleId`, `userId`, `startAt`, `endAt`, `status` (`active` or `canceled`), nullable `canceledAt` and `canceledBy`, and the audit fields. An example is `ovr-platform-01` covering `2026-11-18T14:00:00.000Z` through `2026-11-18T18:00:00.000Z` for `usr-maya-chen`. Require a valid positive interval. An override that has ended is outside effective coverage. Keep its saved lifecycle value until an explicit cancellation.

## Escalation policies

`escalationPolicies[]` includes `id`, `name`, `description`, nullable `teamId`, integer `repeatCount` (0–9), and `rules`. Example `pol-commerce-primary` has `teamId: team-commerce` and `repeatCount: 2`. Each rule has an `id`, integer `delayMinutes`, and ordered `targets` of `{type, id}`, with `type` equal to `user` or `schedule`. For example, `rule-commerce-01` targets `sch-commerce-primary` with a 15-minute timeout and `rule-commerce-02` targets `usr-omar-patel` with a 30-minute timeout. Require at least one target per rule and validate the applicable single or multi-target timeout. Policy detail gets linked services by matching `services[].escalationPolicyId`. The workspace uses policy configuration for user-initiated routing and never schedules background business writes.

## Activity

Each event has `id`, `type`, `entityType` (`incident`, `schedule` or `escalation_policy`), `entityId`, `actorId`, `createdAt` and `details`. Use these event types and JSON payloads in addition to the primary record changes in [TODO.md](../TODO.md).

| `type` | `details` |
| --- | --- |
| `incident.created` | `{serviceId, escalationPolicyId, assigneeIds}` |
| `incident.acknowledged`, `incident.resolved` | `{previousStatus, status}` |
| `incident.reassigned` | `{previousAssigneeIds, assigneeIds, assignmentTarget}` |
| `incident.updated` | `{changes}`, keyed by actual changed fields with `{before, after}` for each |
| `incident.note_added` | `{noteId}` |
| `schedule.created` | `{layerIds}` |
| `schedule.updated` | `{changes}`, using `{before, after}` pairs for changed schedule fields |
| `schedule.override_added`, `schedule.override_canceled` | `{overrideId, userId, startAt, endAt}` |
| `schedule.deleted` | `{name, canceledOverrideIds}` |
| `policy.created`, `policy.updated` | `{ruleIds, affectedServiceIds}` |
| `policy.deleted` | `{name}` |

## Default world and injected data

Seed one account, 8 teams, 36 users, 32 services, 64 incidents, 40 notes, 30 schedules, 12 overrides, 28 escalation policies, and their corresponding activity. Use fixed IDs and dates, including a spread of incident statuses, priorities, services and team ownership. Provide Open items assigned to Maya and other responders, both high and low urgency, and searchable resolved history. Give each policy a first level with a schedule or user and cover multi-target and fallback cases. Include seeded unreferenced policies and schedules for deletion, services with direct-user fallback, overrides across multiple schedules, and examples of layered and restricted rotations. Use realistic synthetic service names like Checkout API, Identity Gateway and Search Indexer. Render all dates against the runtime clock and leave history available even when fixed seed dates are outside the current week.

`loadState()` handles the array replacement and object merge contract. Index references with defensive lookup. Use empty arrays for optional nested collections when rendering and display an unavailable reference label when a related record is absent. Keep injected unknown fields through saves. Validate against the live records before writing new links. Create `SCHEMA.md` from the implemented store and synchronize its Observable State Changes table with the actual UI handlers.
