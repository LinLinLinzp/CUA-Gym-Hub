# Planned Harbor state model

`createInitialData()` in `src/data/seed.js` returns a plain JSON object. Use string IDs, ISO 8601 UTC timestamps for writes and fixed timestamps in the seed. References use IDs even when names change. On injected worlds, preserve original IDs and tolerate omitted optional fields and missing references. View defaults stay in memory until a user commits an action.

## Top-level keys

| Key | Type | Seed target |
| --- | --- | --- |
| `currentUser` | Actor object | Maya Chen, Marketing Operations Manager |
| `folders` | Folder[] | Six folders including Field Marketing, Partner Programs and Lifecycle |
| `people` | Person[] | 72 people across synthetic organizations and regions |
| `programs` | Program[] | 30 programs, including active and archived |
| `programMembers` | ProgramMember[] | At least 72 links spanning supported channel statuses |
| `lists` | List[] | 18 static, 12 smart, shared and program-scoped |
| `listMembers` | ListMember[] | At least 72 links across nonempty static lists |
| `smartCampaigns` | SmartCampaign[] | 36 records across modes and statuses |
| `campaignRuns` | CampaignRun[] | Completed, scheduled and canceled examples |
| `activityLog` | Activity[] | Examples linked to each workflow |

## Record shapes and examples

Use `createdAt`, `createdBy`, `updatedAt`, `updatedBy` as metadata for editable records. `createdAt` and `updatedAt` are ISO strings such as `2026-10-14T14:30:00.000Z`. `createdBy` and `updatedBy` reference an actor ID such as `user-001`. At creation use the same timestamp and actor for both pairs. Fields listed as nullable store `null` when unset.

| Record | Fields, types and example values |
| --- | --- |
| Actor | `id` string `user-001`, `name` string `Maya Chen`, `role` string `Marketing Operations Manager`, `email` string `maya.chen@example.test` |
| Folder | `id` string `folder-field`, `name` string `Field Marketing` |
| Person | `id` string `person-001`, `firstName` string `Tessa`, `lastName` string `Morris`, `email` string `tessa.morris@example.test`, `company` string `Juniper Gaugeworks`, `country` string `United States`, `lifecycleStage` string `MQL` from `Prospect`, `MQL`, `SQL`, `Customer` |
| Program | `id` string `program-001`, `folderId` folder ID `folder-field`, `name` string `North America Operations Webinar`, `type` string `Event with Webinar`, `channel` string `Webinar`, `description` string `Quarterly operations briefing`, `status` enum `active` or `archived`, editable metadata |
| ProgramMember | `id` string `program-member-001`, `programId` string `program-001`, `personId` string `person-001`, `status` channel-specific string `Registered`, editable metadata. Unique on program and person. |
| List | `id` string `list-001`, `name` string `West Coast Webinar Registrants`, `kind` enum `static` or `smart`, `programId` program ID `program-001` or null for Database, `description` string `Registrants for the partner webinar`, `matchMode` enum `all`, `any`, `everyone` or null, `rules` Rule[] (empty for static), editable metadata |
| ListMember | `id` string `list-member-001`, `listId` static list ID `list-001`, `personId` person ID `person-001`, `createdAt` ISO string, `createdBy` actor ID. Unique on list and person. |
| SmartCampaign | `id` string `campaign-001`, `programId` program ID `program-001`, `name` string `Promote webinar registrants`, `description` string `Record selected attendees`, `mode` enum `batch` or `trigger`, `status` enum `draft`, `scheduled`, `completed`, `active` or `inactive`, `matchMode` same as List, `rules` Rule[], `triggers` Trigger[], `flow` FlowStep[], `activatedAt` and `deactivatedAt` nullable ISO strings, editable metadata |
| CampaignRun | `id` string `run-001`, `campaignId` string `campaign-001`, `programId` string `program-001`, `status` enum `scheduled`, `completed` or `canceled`, `scheduledAt`, `startedAt`, `completedAt` and `canceledAt` nullable ISO strings, `processedPersonIds` person-ID array such as `["person-001"]`, `processedCount` integer `1`, `stepResults` StepResult[], editable metadata |
| Activity | `id` string `activity-001`, `action` event string such as `program_member_status_changed`, `entityType` enum `program`, `list` or `smartCampaign`, `entityId` corresponding ID, `actorId` string `user-001`, `createdAt` ISO string, `personIds` person-ID array, `quantity` integer equal to its length, `runId` nullable campaign-run ID |

### Embedded records

| Record | Fields, types and example values |
| --- | --- |
| Rule | `id` string `rule-001`, `field` enum `country`, `company`, `lifecycleStage` or `memberOfList`, `operator` enum `is`, `isNot`, `contains`, `in` or `notIn`, `value` string such as `United States` or a static list ID such as `list-001`. Country and lifecycle use `is` or `isNot`, company also supports `contains`, membership uses `in` or `notIn`. |
| Trigger | `id` string `trigger-001`, `type` enum `personCreated` or `addedToList`, `listId` nullable static list ID (required for `addedToList`) |
| FlowStep | `id` string `step-001`, `type` enum `addToList`, `removeFromList` or `changeProgramStatus`, `listId` nullable static list ID (required for list steps), `status` nullable string (required for a status step, which targets the campaign's program). Array order is execution order. |
| StepResult | `stepId` string `step-001`, `type` same as FlowStep, `targetId` static list or program ID, `personIds` array of changed person IDs, `changedCount` integer equal to its length |

### Program channel catalog

Use a code constant for the catalog. A member added without an explicit status starts at the first status in the applicable row. The final status represents success. Archived programs retain existing links and remain readable. In an injected program with an unfamiliar channel, show existing data and surface the missing catalog entry when editing membership.

| Program type | Channel | Statuses |
| --- | --- | --- |
| `Default` | Website | Member, Converted |
| `Default` | Content Syndication | Member, Engaged |
| `Event` | Trade Show | Invited, Registered, No Show, Attended |
| `Event with Webinar` | Webinar | Invited, Registered, No Show, Attended |
| `Engagement` | Nurture | Member, Engaged |
| `Email` | Email Send | Member, Sent, Opened, Clicked |

## Read and mutation semantics

- Names are trimmed and compared case-insensitively within the owning folder, list scope or program. A fresh ID is generated on successful creation. Removal and membership checks use IDs and preserve unrelated links. Derive people counts from live references and deduplicate matching IDs.
- A smart list or campaign with unconfigured `matchMode: null` matches nobody. `everyone` is an explicit selection. `all` and `any` require at least one valid rule, except that a trigger campaign with no extra filters can use `everyone`. When an injected value or referenced list is missing, the affected rule fails safely even for a negated operator. Trim and compare text case-insensitively.
- At Batch confirmation, compute the qualified IDs once, then apply the saved flow in array order. Add To List and Remove From List are idempotent, and Change Program Status creates a membership if one is absent or updates the existing status if different. A step records only changed IDs. `processedCount` counts everyone evaluated through the flow, including people whose steps were no-ops. Put the run, all related changes and one lifecycle activity entry in a single state commit.
- Future dated runs start `scheduled` with empty `processedPersonIds` and `stepResults` and `processedCount: 0`. Use runtime `new Date()` for validation, require a future time and serialize user-entered local time to UTC. Permit one pending run per campaign. Cancellation sets `canceledAt`, changes the run to `canceled` and returns the campaign to `completed` when it has a completed run or `draft` otherwise. Trigger activation/deactivation writes the associated status and timestamp only, plus the activity entry. Running or toggling a campaign must be an explicit user action.
- Recommended activity action values are `program_created`, `program_updated`, `program_archived`, `program_restored`, `program_members_added`, `program_member_status_changed`, `list_created`, `list_updated`, `list_members_added`, `list_members_removed`, `list_rules_saved`, `campaign_created`, `campaign_smart_list_saved`, `campaign_flow_saved`, `campaign_run_completed`, `campaign_run_scheduled`, `campaign_run_canceled`, `campaign_activated` and `campaign_deactivated`. Keep `personIds` empty for actions without affected people and `runId` null for actions outside a run.

## Seed assembly

Define six folders, the actor and ordered English name and organization fixtures. Build the people and asset arrays with fixed IDs such as `person-001`, `program-001`, `list-001` and `campaign-001`. Assign meaningful combinations of regions, stages, event statuses and channels so several smart-list and campaign matches overlap. Include an editable draft batch, an active trigger, an inactive trigger and a scheduled batch. Keep the dates and reference mappings stable across calls. Return all ten keys from `createInitialData()`, returning fresh arrays and record objects each time.
