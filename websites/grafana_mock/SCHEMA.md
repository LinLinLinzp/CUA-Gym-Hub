# grafana_mock Schema

**Base URL** `http://localhost:5491/`  
**Go Endpoint** `GET /go?sid=<sid>` returns `{initial_state, current_state, state_diff}`  
**Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`  
**Reset** `POST /post?sid=<sid>` with `{"action":"reset"}`

`GET /state?sid=<sid>` returns `{stored_state, has_custom_state, sid}`. Inject before opening a fresh session. Arrays in an injection replace defaults and nested objects merge with defaults during hydration. Compare records by ID within `current_state`. The template reports changed top-level keys in `state_diff`.

## State Schema

| Key | Shape |
| --- | --- |
| `workspace` | `{id: string, name: string}` |
| `currentUser` | `{id: string, name: string, email: string, role: string}` |
| `folders` | `Folder[]` |
| `dataSources` | `DataSource[]` |
| `dashboards` | `Dashboard[]` |
| `starredDashboardIds` | `string[]` of dashboard IDs |
| `evaluationGroups` | `EvaluationGroup[]` |
| `alertRules` | `AlertRule[]` |
| `contactPoints` | `ContactPoint[]` |
| `notificationTests` | `NotificationTest[]` |
| `activity` | `Activity[]` |

## Records

`Creation` has `createdAt` (ISO 8601 UTC string) and `createdBy` (user ID). `Revision` includes `Creation`, `updatedAt` (ISO 8601 UTC string), and `updatedBy` (user ID). A new revision uses the same actor and time for creation and last update. IDs are strings. Destination URLs are configuration strings for the local notification simulator.

| Record | Fields |
| --- | --- |
| `Folder` | `id`, `title: string`, `Creation` |
| `DataSource` | `id`, `name: string`, `type: 'prometheus' or 'testdata'` |
| `Dashboard` | `id`, `title: string`, `description: string`, `folderId: string or null`, `tags: string[]`, `timeRange: {from: string, to: string}`, `panels: Panel[]`, `Revision` |
| `Panel` | `id`, `title: string`, `type: 'timeseries' or 'stat' or 'table'`, `dataSourceId: string`, `query: string`, `unit: string`. Panel order follows array order. |
| `EvaluationGroup` | `id`, `name: string`, `folderId: string`, `intervalSeconds: number`, `Creation` |
| `AlertRule` | `id`, `name: string`, `folderId: string`, `evaluationGroupId: string`, `dataSourceId: string`, `query: string`, `condition: {operator: 'gt' or 'lt', threshold: number}`, `pendingSeconds: number`, `noDataState: 'no_data' or 'alerting' or 'normal' or 'keep_last'`, `errorState: 'error' or 'alerting' or 'normal' or 'keep_last'`, `labels: Record<string, string>`, `annotations: {summary?: string, description?: string, runbookUrl?: string}`, `contactPointId: string or null`, `dashboardId: string or null`, `panelId: string or null`, `isPaused: boolean`, `evaluationState: 'normal' or 'pending' or 'alerting' or 'no_data' or 'error'`, `health: 'ok' or 'error' or 'no_data'`, `Revision` |
| `ContactPoint` | `id`, `name: string`, `integrations: Integration[]`, `Revision` |
| `Integration` | `id`, `type: 'email' or 'slack' or 'webhook'`, `disableResolveMessage: boolean`, `settings`. Email settings have `addresses: string[]`. Slack settings have `channel: string` and `url: string`. Webhook settings have `url: string` and `method: 'POST' or 'PUT'`. |
| `NotificationTest` | `id`, `contactPointId: string`, `integrationId: string`, `integrationType: 'email' or 'slack' or 'webhook'`, `message: string`, `status: 'simulated_success'`, `Creation` |
| `Activity` | `id`, `action: 'delete'`, `entityType: 'dashboard' or 'alert_rule' or 'contact_point'`, `entityId: string`, `entityName: string`, `status: 'completed'`, `Creation` |

A dashboard with `folderId: null` belongs to General. An alert's evaluation group belongs to its folder. The optional linked panel belongs to the dashboard identified by the same rule. Historical test and deletion records retain IDs after their records are removed. The app preserves additional fields supplied by injected worlds on record edits.

### Default IDs

Seeded team keys are `platform`, `checkout`, `edge`, `storage`, `reliability`, and `security`. Replace `{team}` and `{index}` below with the indicated key and number.

| Record | Seeded IDs |
| --- | --- |
| Workspace and user | `ws-acme` and `usr-maya` |
| Folders and data sources | `fld-{team}`, `ds-prom`, `ds-testdata` |
| Dashboards | `db-{team}-overview`, `db-{team}-{index}` for 1–5 |
| Panels | Overview IDs `pnl-{team}-latency` (Checkout uses `pnl-latency`), `db-{team}-overview-stat`, and `db-{team}-overview-table`. Other dashboards use their dashboard ID with `-trend`, `-stat`, or `-table` suffixes where those panels exist. |
| Starred dashboards | `db-checkout-overview`, `db-platform-overview`, `db-reliability-overview` |
| Evaluation groups | `grp-{team}-slos`, `grp-{team}-infra` |
| Alert rules | `rule-{team}-errors`, `rule-{team}-{index}` for 1–5 |
| Contact points | `cp-{team}`, `cp-{team}-{index}` for 1–4 |
| Integrations | `int-{team}-{type}` for the unnumbered point or `int-{team}-{index}-{type}` for numbered points. The suffix gives its integration type. |
| Notification tests and activity | Both start empty. |

## Minimal Inject Example

Use this `state` object for a dashboard-only world. Its single dashboard opens at `/d/fixture-dashboard?sid=<sid>`, and missing optional fields use the app's read-time fallbacks.

```json
{
  "folders": [],
  "dashboards": [{ "id": "fixture-dashboard", "title": "Fixture dashboard" }],
  "starredDashboardIds": [],
  "evaluationGroups": [],
  "alertRules": [],
  "contactPoints": []
}
```

## Observable State Changes (for LLM evaluation)

| Explicit action | State paths and values |
| --- | --- |
| Create folder from the library or dashboard editor | Append `folders[]` with `id`, trimmed `title`, `createdAt`, `createdBy`. |
| Create dashboard | Append `dashboards[]` with `id`, `title`, `description`, `folderId`, `tags`, `timeRange.from`, `timeRange.to`, `panels[]`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`. |
| Save dashboard edits, move, or change panels | Update `dashboards[id].{title,description,folderId,tags,timeRange,panels,updatedAt,updatedBy}`. Applying a panel to the draft stages `panels[].{id,title,type,dataSourceId,query,unit}` for this save. Removed panels are absent from the saved array. Edits retain the dashboard and panel IDs. |
| Duplicate dashboard | Save a new dashboard record with new dashboard and panel IDs and its own `createdAt`, `createdBy`, `updatedAt`, `updatedBy`. |
| Star or unstar dashboard | Add or remove its ID in `starredDashboardIds[]`. |
| Confirm dashboard deletion | Remove `dashboards[id]` and its ID in `starredDashboardIds[]`. Append `activity[]` with the deletion record and `entityType: 'dashboard'`. |
| Save new alert rule | Append `alertRules[]` with all rule fields listed above, including `evaluationState: 'normal'`, `health: 'ok'`, `isPaused: false` and revision fields. |
| Save alert rule edits | Update `alertRules[id].{name,folderId,evaluationGroupId,dataSourceId,query,condition,pendingSeconds,noDataState,errorState,labels,annotations,contactPointId,dashboardId,panelId,updatedAt,updatedBy}`. Empty relationship selections save as `null`. |
| Save rule with inline evaluation group | Append `evaluationGroups[]` with `id`, `name`, `folderId`, `intervalSeconds`, `createdAt`, `createdBy` in the same write that sets `alertRules[id].evaluationGroupId` to the new ID. |
| Pause or resume rule | Set `alertRules[id].isPaused` to true or false and update `updatedAt`, `updatedBy`. |
| Confirm alert rule deletion | Remove `alertRules[id]`. Append `activity[]` with the deletion record and `entityType: 'alert_rule'`. |
| Create contact point | Append `contactPoints[]` with `id`, `name`, `integrations[]`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`. |
| Save contact point edits | Update `contactPoints[id].{name,integrations,updatedAt,updatedBy}`. Integration records store `id`, `type`, `disableResolveMessage`, and typed `settings`. Existing integration edits retain IDs. |
| Confirm test notification | Append `notificationTests[]` with `id`, `contactPointId`, `integrationId`, `integrationType`, `message`, `status: 'simulated_success'`, `createdAt`, `createdBy`. |
| Confirm contact point deletion | Remove `contactPoints[id]`. Append `activity[]` with the deletion record and `entityType: 'contact_point'`. |

Every successful deletion records `activity[].{id,action,entityType,entityId,entityName,status,createdAt,createdBy}`. Rules block removal of related dashboards, panels, and contact points. Navigation, filters, charts, previews, drafts, validation, and cancelled or blocked actions write no business state.
