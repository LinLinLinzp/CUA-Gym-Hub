# marketo_mock Schema

**Base URL** `http://localhost:5468/`  
**Go endpoint** `GET /go?sid=<sid>` returns `{initial_state, current_state, state_diff}`.  
**Inject** `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`.  
**Reset** `POST /post?sid=<sid>` with body `{"action":"reset"}` restores the server's initial snapshot.

The client uses the shared Harbor data manager with app key `marketo`. Load a fresh browser session with the same `sid` after injecting state. Harbor merges injected objects and replaces injected arrays before the client renders. `GET /state?sid=<sid>` returns the stored state under `stored_state`. Within `state_diff`, changed keys contain a `modified` value and new keys contain an `added` value.

## State Schema

All IDs are strings. Metadata on editable records consists of ISO UTC `createdAt` and `updatedAt` timestamps plus actor IDs `createdBy` and `updatedBy`.

| State key | Record fields |
| --- | --- |
| `currentUser` | `id`, `name`, `role`, `email`. Defaults to `user-001` (Maya Chen). |
| `folders[]` | `id`, `name`. |
| `people[]` | `id`, `firstName`, `lastName`, `email`, `company`, `country`, `lifecycleStage` (Prospect, MQL, SQL, Customer). |
| `programs[]` | `id`, `folderId`, `name`, `type`, `channel`, `description`, `status` (active, archived), metadata. |
| `programMembers[]` | `id`, `programId`, `personId`, channel-specific `status`, metadata. Unique by program and person. |
| `lists[]` | `id`, `name`, `kind` (static, smart), `programId` (null for Database), `description`, `matchMode` (null, all, any, everyone), `rules[]`, metadata. |
| `listMembers[]` | `id`, `listId`, `personId`, `createdAt`, `createdBy`. Unique by static list and person. |
| `smartCampaigns[]` | `id`, `programId`, `name`, `description`, `mode` (batch, trigger), `status` (draft, scheduled, completed, active, inactive), `matchMode`, `rules[]`, `triggers[]`, `flow[]`, nullable ISO `activatedAt` and `deactivatedAt`, metadata. |
| `campaignRuns[]` | `id`, `campaignId`, `programId`, `status` (scheduled, completed, canceled), nullable ISO `scheduledAt`, `startedAt`, `completedAt` and `canceledAt`, `processedPersonIds[]`, integer `processedCount`, `stepResults[]`, metadata. |
| `activityLog[]` | `id`, `action`, `entityType` (program, list, smartCampaign), `entityId`, `actorId`, ISO `createdAt`, `personIds[]`, integer `quantity` equal to the number of person IDs, nullable `runId`. |

| Embedded record | Fields |
| --- | --- |
| Rule | `id`, `field` (country, company, lifecycleStage, memberOfList), `operator` (is, isNot, contains, in, notIn), string `value` (text or a static list ID). |
| Trigger | `id`, `type` (personCreated, addedToList), `listId` (static list ID for addedToList, null for personCreated). |
| Flow step | `id`, `type` (addToList, removeFromList, changeProgramStatus), `listId` (static list ID or null), `status` (owning program channel status or null). Array order is execution order. |
| Step result | `stepId`, `type`, `targetId` (static list or program ID), `personIds[]` holding changed people, integer `changedCount`. |

Channel statuses are listed in [the data model](assets/data_model.md#program-channel-catalog). Static counts come from `listMembers` joined to `people`. Smart counts are derived by applying saved rules to `people` and `listMembers`. An unconfigured audience matches zero people. `everyone` explicitly selects the full people database.

When an injected campaign omits `mode`, the app infers Trigger from configured triggers and Batch otherwise. Loading and viewing the campaign does not write the inferred value.

### Default IDs

- Account actor `user-001`
- Folders `folder-field`, `folder-partner`, `folder-lifecycle`, `folder-digital`, `folder-customer`, `folder-events`
- Programs `program-001` through `program-030`
- People `person-001` through `person-072`
- Static lists `list-001` through `list-018` and smart lists `list-019` through `list-030`
- Smart campaigns `campaign-001` through `campaign-036`

## Minimal Inject Example

This state opens a single sparse program at `/programs/audit-program?sid=<sid>` and replaces the seeded business collections.

```json
{
  "folders": [{"id": "audit-folder", "name": "Field Marketing"}],
  "people": [],
  "programs": [{"id": "audit-program", "folderId": "audit-folder", "name": "Field Webinar", "type": "Event with Webinar", "channel": "Webinar", "status": "active"}],
  "programMembers": [],
  "lists": [],
  "listMembers": [],
  "smartCampaigns": [],
  "campaignRuns": [],
  "activityLog": []
}
```

## Observable State Changes (for LLM evaluation)

Each row describes a single whole-state commit. All activity entries record the affected entity, actor and timestamp. Additions include creation metadata, and editable changes include update metadata.

| User action | Business state written | Activity action |
| --- | --- | --- |
| Create program | Append active `programs` record with folder, name, type, channel and description. | `program_created` |
| Edit program | Update `programs.name`, `description` and update metadata. | `program_updated` |
| Archive or restore program | Set `programs.status` to archived or active and update metadata. | `program_archived` or `program_restored` |
| Add program members | Append missing `programMembers` relationships with the channel's initial status. | `program_members_added`, new person IDs and quantity |
| Change member status | Update selected `programMembers.status` and update metadata for changed links. | `program_member_status_changed`, changed person IDs and quantity |
| Create list | Append `lists` with name, kind, scope, description, null match mode and empty rules. | `list_created` |
| Edit list | Update `lists.name`, `description` and update metadata. | `list_updated` |
| Add or remove static list people | Append or remove scoped `listMembers` links. Update the owning list's update metadata. | `list_members_added` or `list_members_removed`, changed person IDs and quantity |
| Save smart list rules | Update `lists.matchMode`, `rules` and update metadata. | `list_rules_saved` |
| Create campaign | Append `smartCampaigns` with program, name, description and draft Batch configuration. | `campaign_created` |
| Save campaign Smart List | Update `smartCampaigns.matchMode`, `rules`, `triggers`, derived `mode` and metadata. Mode changes set status to draft. | `campaign_smart_list_saved` |
| Save flow | Update ordered `smartCampaigns.flow` and update metadata. | `campaign_flow_saved` |
| Schedule future batch | Append a scheduled `campaignRuns` record with UTC `scheduledAt`, empty results and zero processed people. Set campaign status to scheduled. | `campaign_run_scheduled`, run ID |
| Cancel run | Update `campaignRuns.status` and `canceledAt`. Set campaign status to completed if an earlier run completed, or draft otherwise. | `campaign_run_canceled`, run ID |
| Run batch now | Append completed `campaignRuns` with start/completion times, processed person IDs and ordered step results. Set campaign status to completed. Apply Flow changes to `programMembers` and/or `listMembers` with timestamps on changed lists. | `campaign_run_completed`, run ID and processed person IDs |
| Activate or deactivate Trigger | Update `smartCampaigns.status` and `activatedAt` or `deactivatedAt`. | `campaign_activated` or `campaign_deactivated` |

Navigation, preview, editing drafts, dismissing dialogs, canceled changes, duplicate memberships, unchanged member statuses and idle tabs produce no business writes. Scheduled runs and active triggers are stored configuration. Immediate Batch runs are executed in the confirmed state transition.

