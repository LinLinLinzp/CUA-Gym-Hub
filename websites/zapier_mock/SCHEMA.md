# zapier_mock Schema

**Base URL** · `http://localhost:5506/`  
**Go Endpoint** · `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject** · `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`  
**Reset** · `POST /post?sid=<sid>` with `{"action":"reset"}`

The diff reports changes at the top-level key. The underlying records below are available in `current_state` for exact assertions. `GET /state?sid=<sid>` returns the persisted world as `stored_state`. Reset restores the saved baseline or the default world when no baseline exists.

## State Schema

| Key | Shape |
| --- | --- |
| `workspace` | `{ id, name, currentUserId }` |
| `users[]` | `{ id, name, email }` |
| `folders[]` | `{ id, name }` |
| `apps[]` | `{ id, name, initials, color, requiresConnection, events }` |
| `connections[]` | Connection records |
| `zaps[]` | Zap records |
| `runs[]` | Run snapshots |

IDs and human-readable labels are strings. Timestamps are ISO 8601 UTC strings. `null` marks unset values. Injected arrays replace defaults and injected objects merge recursively. Extra injected properties are kept in the persisted world.

An app event is `{ id, name, kind, fields, sampleOutput }`. `kind` is `trigger` or `action`. Each event field is `{ key, label, required }`, where `required` is boolean. In an injected field, a missing label falls back to `key`. `sampleOutput` is a JSON object keyed by available mapping outputs. `requiresConnection` is boolean.

### Default IDs

| Entity | IDs |
| --- | --- |
| Workspace | `ws_northwind` |
| Users | `usr_avery`, `usr_jordan`, `usr_morgan`, `usr_riley` |
| Folders | `fld_leads`, `fld_customers`, `fld_projects`, `fld_finance`, `fld_people`, `fld_marketing` |
| Apps | `app_sheets`, `app_slack`, `app_gmail`, `app_hubspot`, `app_airtable`, `app_forms`, `app_calendar`, `app_trello`, `app_notion`, `app_schedule` |
| Connections | `con_sales_slack` and `con_<app suffix>_0` through `con_<app suffix>_2` for each app that requires a connection |
| Zaps | `zap_lead_alert`, `zap_02` through `zap_36` |
| Runs | `run_lead_error`, `run_002` through `run_084` |

## Minimal Inject Example

```json
{
  "workspace": { "name": "Audit workspace" },
  "zaps": [{ "id": "zap_injected", "name": "Review intake", "status": "draft" }],
  "runs": [],
  "connections": []
}
```

## Records

### Zap

```text
{
  id, name, ownerId, folderId, status, enabled, version,
  draftSteps, publishedSteps, publishedAt,
  createdAt, createdBy, updatedAt, updatedBy
}
```

- `folderId` is a folder reference or `null` for the workspace root. `ownerId`, `createdBy` and `updatedBy` reference users.
- `status` is `draft`, `on`, or `off`. `enabled` is boolean. `version` is an integer that starts at zero. `publishedAt` starts null.
- `draftSteps` and `publishedSteps` are ordered arrays. The first step is a trigger. The published array is the snapshot used by replay.
- Each step is `{ id, kind, appId, eventId, connectionId, fields, lastTest }`. The three selection IDs start null. `eventId` refers to the event on the selected app, and `connectionId` refers to a connection for that app.
- Each entry of `fields` is keyed by the configured event field. Values are `{ type: 'literal', value }` or `{ type: 'mapping', stepId, outputKey }`. The mapping points to an earlier step in the same Zap.
- `lastTest` starts null. After a successful test it is `{ status: 'success', input, output, error: null, createdAt, createdBy }`. Input and output are JSON objects. An invalid test displays its validation error in the editor and leaves persisted state unchanged.

### Connection

```text
{
  id, appId, name, accountLabel, ownerId, status,
  lastTestedAt, lastTestResult, lastReconnectedAt,
  createdAt, createdBy, updatedAt, updatedBy
}
```

- `appId` references the app catalog. `ownerId`, `createdBy`, and `updatedBy` reference users. `accountLabel` is a synthetic label.
- `status` is `active` or `expired`. `lastTestResult` shares those values and starts null. `lastTestedAt` and `lastReconnectedAt` start null.
- Linked Zap counts are derived from the union of draft and published references. Each Zap is counted once.

### Run

```text
{
  id, zapId, zapName, zapVersion, status, taskCount, source, replayOfRunId,
  createdAt, createdBy, triggerInput, stepResults
}
```

- `zapId` references the original Zap. `zapName` and integer `zapVersion` snapshot the name and version at execution. Historical snapshots survive deletion of a Zap.
- `status` is `success`, `errored`, `filtered`, or `on_hold`. `taskCount` is a nonnegative integer. Replay counts one task per successful action.
- `source` is `trigger` or `replay`. `replayOfRunId` and `createdBy` are null for trigger-originated history. Replays link the original run ID and the acting user ID.
- `triggerInput` is a JSON object. `stepResults[]` contains `{ stepId, name, kind, appId, eventId, status, input, output, error }`. The name is the event name. Step status can additionally be `skipped`. Input and output are objects or null. Error is text or null. Simulated replay action outputs contain a deterministic fixture and a `data` object with the resolved input.

## Observable State Changes (for LLM evaluation)

Every successful mutation below submits one whole-world `set_current` request. Edit metadata is `updatedAt` and `updatedBy`. Creation metadata adds `createdAt` and `createdBy`. Actors come from `workspace.currentUserId`, and action times come from the runtime clock.

| User action | Exact changed fields |
| --- | --- |
| Create Zap | Append `zaps[]` with `id`, `name`, `ownerId`, `folderId`, `status='draft'`, `enabled=false`, `version=0`, `draftSteps` with one empty trigger, `publishedSteps=[]`, `publishedAt=null`, and creation metadata. |
| Save draft | Replace the selected `zaps[].name` and ordered `draftSteps`. Write edit metadata. In-draft app, event, connection, configuration, and mapping edits are reflected in `draftSteps`. When relevant configuration changes, the affected `draftSteps[].lastTest` values become null. Step IDs generated locally for partial injected drafts become persistent with the draft. |
| Test step | Save the current draft as above and set the selected `draftSteps[].lastTest` to the result. The count of `runs[]` stays the same. |
| Publish | Write `zaps[].name`, `draftSteps`, `publishedSteps`, incremented `version`, `publishedAt`, `enabled=true`, `status='on'`, and edit metadata. |
| Turn published Zap on or off | Write `zaps[].enabled`, `status`, and edit metadata. All step and version fields keep their saved values. |
| Rename Zap | Write `zaps[].name` and edit metadata. |
| Move Zap | Write `zaps[].folderId` and edit metadata. |
| Duplicate Zap | Append a newly owned draft record with a new Zap ID, display name ending in `(copy)`, new step IDs, remapped step references, cleared test results, `enabled=false`, `status='draft'`, `version=0`, `publishedAt=null`, `publishedSteps=[]`, and creation metadata. |
| Delete Zap | Remove the selected `zaps[]` entry. All `runs[]` snapshots remain. |
| Replay run | Append one `runs[]` record with `id`, `zapId`, `zapName`, `zapVersion`, `status='success'`, numeric `taskCount`, `source='replay'`, `replayOfRunId`, `createdAt`, `createdBy`, original `triggerInput`, and newly generated `stepResults`. |
| Replay selected runs | Append the same record shape once per replayable selected source in a single save. Report skipped sources with their validation reasons. |
| Add connection | Append `connections[]` with `id`, `appId`, `name`, `accountLabel`, `ownerId`, `status='active'`, null `lastTestedAt`, `lastTestResult`, and `lastReconnectedAt`, and creation metadata. |
| Rename connection | Write `connections[].name` and edit metadata. |
| Test connection | Write `connections[].lastTestedAt`, `lastTestResult`, and edit metadata. |
| Reconnect | Write `connections[].status='active'`, `lastReconnectedAt`, and edit metadata on the same ID. |
| Delete connection | Remove the selected `connections[]` entry. In the same save, write `enabled=false`, `status='off'`, and edit metadata to enabled Zaps whose published steps reference that ID. Step references and all run records are retained. |

Navigation, searches, filters, sorting, pagination, dependency inspection, task usage, and unsaved form edits are read-only with respect to Harbor state. The standard state manager makes one baseline `set` request when loading a session into a fresh browser profile.
