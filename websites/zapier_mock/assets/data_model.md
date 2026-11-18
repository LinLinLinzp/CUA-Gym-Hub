# Zapier state model

The following shapes are the proposed contract for `src/data/seed.js` and the state store. IDs are strings. Dates are ISO 8601 UTC strings. `null` marks an intentionally unset value. Views must tolerate omitted fields and unresolved IDs in injected worlds. Preserve unknown keys during state updates.

## Root object

```js
{
  workspace: { id: 'ws_northwind', name: 'Northwind Operations', currentUserId: 'usr_avery' },
  users: [],
  folders: [],
  apps: [],
  connections: [],
  zaps: [],
  runs: [],
}
```

Return a fresh object from `createInitialData()` with the arrays populated as described below. Keep workspace and catalog reference data read-only.

## Users, folders, and integration catalog

| Record | Fields and examples |
| --- | --- |
| User | `id: string` (`usr_avery`), `name: string` (`Avery Morgan`), `email: string` (`avery@northwind.example`) |
| Folder | `id: string` (`fld_leads`), `name: string` (`Lead Operations`) |
| App | `id: string` (`app_sheets`), `name: string` (`Google Sheets`), `initials: string` (`GS`), `color: string` (`#2E7459`), `requiresConnection: boolean` (`true`), `events: Event[]` |
| Event | `id: string` (`new_row`), `name: string` (`New Spreadsheet Row`), `kind: 'trigger' \| 'action'`, `fields: Field[]`, `sampleOutput: object` (`{ email: 'casey@example.test' }`) |
| Field | `key: string` (`spreadsheet`), `label: string` (`Spreadsheet`), `required: boolean` (`true`) |

Use useful event options across Google Sheets, Slack, Gmail, HubSpot, Airtable, Google Forms, Google Calendar, Trello, Notion, and Schedule by Zapier. Schedule is a local editor option with `requiresConnection: false`.

## Zap and step records

```js
{
  id: 'zap_lead_alert', name: 'Notify sales about a new lead',
  ownerId: 'usr_avery', folderId: 'fld_leads',
  status: 'on', enabled: true, version: 1,
  draftSteps: [/* Step, ... */], publishedSteps: [/* Step, ... */],
  createdAt: '2026-10-05T14:00:00.000Z', createdBy: 'usr_avery',
  updatedAt: '2026-10-06T16:40:00.000Z', updatedBy: 'usr_avery',
  publishedAt: '2026-10-06T16:40:00.000Z',
}
```

- `ownerId` references a user. `folderId` references a folder or is `null`. `status` is `draft`, `on`, or `off`. `enabled` is a boolean. `version` is an integer starting at `0`. A new draft has an empty `publishedSteps` array and `publishedAt: null`.
- Each ordered step has `id: string` (`stp_lead_slack`), `kind: 'trigger' | 'action'`, `appId: string | null` (`app_slack`), `eventId: string | null` (`send_channel_message`), and `connectionId: string | null` (`con_sales_slack`).
- `fields` is an object keyed by event field. A setting is either `{ type: 'literal', value: '#sales-intake' }` or `{ type: 'mapping', stepId: 'stp_lead_trigger', outputKey: 'email' }`. Resolve mappings against earlier steps in the same version. On duplication, remap all references to the duplicated step IDs.
- `lastTest` is `null` or `{ status, input, output, error, createdAt, createdBy }`. `status` is `success` or `errored`. `input` and `output` are JSON objects or `null`. `error` is text or `null`. Reset test results on affected steps when their configuration or mapped inputs change.
- `createdAt`, `updatedAt`, `createdBy`, and `updatedBy` are strings. A published Zap's `publishedAt` is a timestamp string. Use the current workspace user and clock for mutations.

## Connection records

```js
{
  id: 'con_sales_slack', appId: 'app_slack', name: 'Sales alerts Slack',
  accountLabel: 'sales-ops@northwind.example', ownerId: 'usr_avery',
  status: 'expired', lastTestResult: 'expired',
  lastTestedAt: '2026-11-06T10:10:00.000Z', lastReconnectedAt: null,
  createdAt: '2026-10-05T14:00:00.000Z', createdBy: 'usr_avery',
  updatedAt: '2026-11-06T10:10:00.000Z', updatedBy: 'usr_avery',
}
```

All ID and label fields are strings. `status` and `lastTestResult` use `active` or `expired`, and `lastTestResult` starts `null`. Both last-action timestamps start `null`. Use the current user and clock for creation and edit metadata. Derive linked Zap counts from the union of draft and published step references, counting each Zap once. A test reads the stored connection status and records the result.

## Run and step result records

```js
{
  id: 'run_lead_error', zapId: 'zap_lead_alert',
  zapName: 'Notify sales about a new lead', zapVersion: 1,
  status: 'errored', taskCount: 0, source: 'trigger', replayOfRunId: null,
  createdAt: '2026-11-06T10:05:00.000Z', createdBy: null,
  triggerInput: { email: 'casey@example.test' },
  stepResults: [
    { stepId: 'stp_lead_trigger', name: 'New Spreadsheet Row', kind: 'trigger',
      appId: 'app_sheets', eventId: 'new_row', status: 'success',
      input: {}, output: { email: 'casey@example.test' }, error: null },
    { stepId: 'stp_lead_slack', name: 'Send Channel Message', kind: 'action',
      appId: 'app_slack', eventId: 'send_channel_message', status: 'errored',
      input: { channel: '#sales-intake' }, output: null,
      error: 'Reconnect Sales alerts Slack' },
  ],
}
```

- `zapId` and `replayOfRunId` reference a Zap and a source run, respectively. `replayOfRunId` and `createdBy` are null for trigger-originated history. `source` is `trigger` or `replay`. `zapVersion` and `taskCount` are nonnegative integers.
- Run `status` is `success`, `errored`, `filtered`, or `on_hold`. Step status uses the same values plus `skipped`. Result `input` and `output` are JSON objects or `null`. Result `error` is a string or `null`. Count each successful action result as one task and count the trigger as zero.
- Replay builds a new result list from `publishedSteps` and the original `triggerInput`. Use a deterministic local integration fixture to build each step's output from its mapped input. Store the new record in one mutation. Determine source eligibility by comparing the saved trigger app and event with the published trigger. Treat absent trigger data as unavailable for replay and explain this in the run detail.

## Seed composition

- Include four users and six folders, plus Zaps in the root. Use 36 Zaps distributed among folders and owners, including at least six drafts and eight off Zaps. Use varied names such as `Flag overdue onboarding reviews` and `Send renewal reminders`.
- Seed 28 connections across nine connection-based apps, including at least five expired and several unused accounts.
- Seed 84 historical runs across a fixed multiweek period, sorted by timestamp for display. Include each of the four statuses and at least one linked replay pair. Use the current runtime clock for relative display and quick date filters.
- Keep `zap_lead_alert`, `con_sales_slack`, and `run_lead_error` from the examples as linked fixtures. Give the Zap an enabled published version, a healthy Google Sheets trigger connection, and an expired Slack action connection. Reconnecting Slack makes the run eligible for replay. The replay produces one successful action task.
- Seed payloads with synthetic people, message text, rows, and channels. Keep test and replay payloads compact to avoid unnecessary state growth.
