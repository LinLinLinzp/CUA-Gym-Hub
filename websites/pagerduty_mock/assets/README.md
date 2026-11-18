# PagerDuty workflow research

## Account and users

PagerDuty connects an operational problem to an accountable responder. A service routes through one escalation policy, whose ordered rules target people and on-call schedules. In Acme Operations, Maya Chen is the active user. The workspace serves three tasks across two roles. An on-call engineer triages incidents and checks coverage. A team lead edits rotations and escalation paths. [Incidents Overview](https://docs.pagerduty.com/incident-management/incidents/overview), [Escalation Policy Basics](https://docs.pagerduty.com/incident-management/schedules/escalation-policies)

## Feature inventory and view layouts

| Priority | Feature | View and behavior |
| --- | --- | --- |
| P0 | Signed-in shell | Sidebar for the three domains, direct routes and deep links, breadcrumb and workspace context |
| P0 | Harbor state | Boot before mounting routes, scoped API session and fixed linked seed records |
| P1 | Incident queue | Toolbar with status, search and filters above a paged table. Selection shows bulk lifecycle controls. |
| P1 | Incident details | Context and chronological activity, assignment and notes, conditional response actions |
| P1 | Manual incident creation | Select a service, enter incident details, preview routing and open the saved incident |
| P1 | Lifecycle actions | Acknowledge, resolve and reassign through eligible actions. Edit key triage fields and add a note. |
| P1 | Schedule list and detail | Searchable directory and week timeline of layers, overrides and effective coverage |
| P1 | Schedule editor | Timezone, ordered layers and members, handoff and restrictions with coverage preview |
| P1 | Schedule overrides and removal | Add or cancel an override, then confirm deletion for an unreferenced schedule |
| P1 | Policy list and detail | Searchable directory and rule sequence with target links, timeouts and services |
| P1 | Policy editor and removal | Add, remove and reorder levels, configure repeats, manage service links and confirm deletion when unused |
| P2 | Incident activity view | Filter recorded actions by event type or time |
| P2 | Schedule comparison | Inspect two saved schedules for a selected week |

## Product behavior informing the design

- The incident queue should make open work easy to find while keeping resolved incidents searchable. Incident detail shows who owns the work, which service was affected, and what happened next. Acknowledging claims an incident and resolving closes it. Notes stay available for later review. [Navigate the Incidents Page](https://docs.pagerduty.com/incident-management/incidents/navigate-incidents-page), [Edit Incidents](https://docs.pagerduty.com/incident-management/incidents/edit-incidents)
- Bringing multiple responders into a rotation requires ordered membership, a predictable handoff, and a clear effective result. Later eligible layers take precedence and a temporary override supersedes the covered segment. [Schedule Basics](https://docs.pagerduty.com/incident-management/schedules/schedule-basics), [Schedule Examples](https://docs.pagerduty.com/incident-management/schedules/schedule-examples), [Edit Schedules](https://docs.pagerduty.com/incident-management/schedules/edit-schedules)
- A service has one policy. A policy can link multiple services and can target either a schedule or a person. A timeout controls when a rule advances, and a coverage gap moves assignment to the next eligible level. Save the rules used when the incident is created so an operator can see the routing that applied at the time. [Escalation Policy Basics](https://docs.pagerduty.com/incident-management/schedules/escalation-policies)

Use [the workspace design](../DESIGN.md) for layout and offline visuals. Keep authentication and external paging outside the workspace. Treat services, teams and people as routing reference data and keep the scope on response and coverage.

## State model

The store contains teams, responders and services as reference records, plus first-class incidents, notes, schedules, overrides, policies and activity. An incident links back to its service and keeps a copy of the policy rules used for routing. An override has its own ID and lifecycle. The complete record shapes, nullability and audit fields are in [data_model.md](data_model.md).

## Local acceptance scenario

1. Start a new browser session with a unique `sid` and open Incidents at `http://localhost:5490`. Filter and open an existing incident. Capture the baseline `/go` response and the count of client POSTs.
2. Create a schedule, configure its members and handoff, then add a temporary override covering the task clock. Assert `schedules`, `scheduleOverrides` and `activity`. Reload the schedule deep link and verify the override is effective.
3. Create a policy with that schedule first and a direct user as fallback. Set a timeout and repeat count and assign a designated service. Assert ordered `escalationPolicies[].rules`, `services[].escalationPolicyId` and `activity`. Reopen and edit the order or timeout, and check stable rule IDs.
4. Create an incident on that service while the override is active. Assert `incidents[].serviceId`, the captured policy and the routed responder. Acknowledge, add a note, reassign and resolve. After each action, wait for the matching POST and assert the exact changes in `/go`. Confirm the note and history after reload.
5. Exercise schedule override cancellation, unused schedule and policy deletion, and blocked deletion while references remain. Verify canceling a dialog and rejecting an invalid form leave `/go` and the business POST count unchanged.
6. In isolated test sessions, verify sparse references, empty arrays, a singleton fixture and a fixture with hundreds of incidents. Verify deep navigation keeps the `sid`, mutations stay isolated, and the app posts nothing after the initial baseline while idle. Use the local state API to set up fixtures before opening a fresh browser context.
