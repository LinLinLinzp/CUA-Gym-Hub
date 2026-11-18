# procore_mock Schema

**Base URL** `http://localhost:5436/`  
**Go endpoint** `GET /go?sid=<session>` returns `initial_state`, `current_state`, and `state_diff`.  
**Inject** `POST /post?sid=<session>` with `{"action":"set","state":{...}}`.  
**Reset** `POST /post?sid=<session>` with `{"action":"reset"}` restores the stored baseline, or the seed when no baseline exists.

The top-level keys below are defined by the application. Additional keys supplied through Harbor injection are preserved. Identifiers and display numbers are strings. Construction dates use local `YYYY-MM-DD`, time-of-day fields use local `HH:mm`, and timestamps use ISO 8601.

`Created` means `createdAt: timestamp, createdById: ID or null`. `Updated` means `updatedAt: timestamp, updatedById: ID or null`. Mutations use `account.currentUserId` for attribution, or null when absent. Optional fields and relationships can be absent or null in an injected world.

## State Schema

| Key | Record shape |
| --- | --- |
| `account` | Object with `companyName, currentUserId, defaultProjectId` |
| `projects[]` | `id, number, name, city, memberIds: ID[]` |
| `people[]` | `id, name, role, companyId?` |
| `companies[]` | `id, name, trade, projectIds: ID[]` |
| `contracts[]` | `id, projectId, number, title, companyId, status, originalAmount: number` |
| `rfis[]` | `id, projectId, number, subject, question, location?, assigneeIds: ID[], dueDate?, officialResponseId?, status` with Draft, Open, or Closed. Created and optional Updated. |
| `rfiResponses[]` | `id, rfiId, text` and Created. |
| `submittals[]` | `id, projectId, number, title, type, specSection, description, responsibleCompanyId?, reviewerId?, ballInCourtId?, dueDate?, revision: integer, status, attachments?: Attachment[]`. Status is Draft, In Review, or a review decision. Created and optional Updated. |
| `submittalReviews[]` | `id, submittalId, revision: integer, decision, comments` and Created. Decisions are Approved, Approved as Noted, Revise and Resubmit, or Rejected. |
| `dailyLogs[]` | `id, projectId, date, status, completedAt?, completedById?`. Status is Open or Complete. Created and optional Updated. |
| `dailyLogEntries[]` | `id, dailyLogId, type, details: object`. Created and optional Updated. |
| `changeOrders[]` | `id, projectId, contractId, number, title, reason, description, reviewerId?, scheduleImpactDays: integer, totalAmount: number, status, submittedAt?, submittedById?, decidedAt?, decidedById?, decisionComment?`. Status is Draft, Pending Approval, Approved, or Rejected. Created and optional Updated. |
| `changeOrderLineItems[]` | `id, changeOrderId, costCode, description, quantity: number, unitCost: number, amount: number`. Created and optional Updated. |
| `activity[]` | `id, projectId, entityType, entityId, action, relatedId?, entryType?, previousStatus?, newStatus?` and Created. Entity types are `rfi`, `submittal`, `dailyLog`, and `changeOrder`. |

An attachment stores the Harbor upload metadata `url, original_name, stored_name, content_type, size: integer`.

| Entry type | Details |
| --- | --- |
| `weather` | `condition, tempF: number, observedAt, notes?` |
| `manpower` | `companyId, workerCount: integer, hoursPerWorker: number, location?, description?` |
| `note` | `text, location?` |
| `delivery` | `companyId?, material, quantity: number, unit, receivedAt, notes?` |

Crew-hours are calculated from `workerCount × hoursPerWorker`. A line extension rounds to cents, and `totalAmount` sums the rounded extensions.

### Default IDs

| Record | Seed IDs |
| --- | --- |
| Projects | `proj-harborview` (default), `proj-juniper` |
| Account actor | `person-maya` |
| Prime contracts | `contract-harbor-general`, `contract-harbor-mechanical`, `contract-harbor-shell`, `contract-juniper-general` |
| RFIs | `rfi-harbor-001` through `rfi-harbor-024`, `rfi-juniper-001` through `rfi-juniper-006` |
| Submittals | `sub-harbor-001` through `sub-harbor-022`, `sub-juniper-001` through `sub-juniper-006` |
| Daily logs | `day-harbor-<YYYY-MM-DD>` and `day-juniper-<YYYY-MM-DD>` for recorded dates |
| Change orders | `co-harbor-001` through `co-harbor-018`, `co-juniper-001` through `co-juniper-006` |

## Minimal Inject Example

Set this fixture under a fresh `sid`, then visit `/projects/field-office/daily-log/2026-11-18?sid=<session>`. The project starts with a blank day and supports saving a note. Harbor replaces arrays and merges objects with the defaults.

```json
{
  "account": { "defaultProjectId": "field-office", "currentUserId": "field-engineer" },
  "projects": [{ "id": "field-office", "name": "Field Office", "memberIds": ["field-engineer"] }],
  "people": [{ "id": "field-engineer", "name": "Riley Morgan", "role": "Field Engineer" }],
  "companies": [],
  "contracts": [],
  "rfis": [],
  "rfiResponses": [],
  "submittals": [],
  "submittalReviews": [],
  "dailyLogs": [],
  "dailyLogEntries": [],
  "changeOrders": [],
  "changeOrderLineItems": [],
  "activity": []
}
```

## Observable State Changes (for LLM evaluation)

Every successful operation below appends one `activity[]` record in the same state save. Status transitions include `previousStatus, newStatus` in the activity record.

| User action | Activity action | Business fields written |
| --- | --- | --- |
| Save RFI draft | `create` | Append RFI with generated identity and number, Draft status, subject, question, location, assignees, due date, null official response, and Created. |
| Edit RFI | `edit` | Set `subject, question, location, assigneeIds, dueDate` and Updated. |
| Open, close, or reopen RFI | `open`, `close`, `reopen` | Set RFI `status` and Updated. |
| Post RFI reply | `reply` | Append response with `id, rfiId, text` and Created, and set RFI Updated. The activity links the response via `relatedId`. |
| Set or replace official response | `set_official_response` | Set RFI `officialResponseId` and Updated. The activity links the selected response. |
| Save submittal draft | `create` | Append submittal with generated identity and number, Draft status, revision 0, null Ball in Court, form fields, attachment metadata, and Created. |
| Edit submittal | `edit` | Set `title, type, specSection, description, responsibleCompanyId, reviewerId, dueDate, attachments` and Updated. A successful upload appends metadata to existing attachments. |
| Submit submittal | `submit` | Set `status = In Review, ballInCourtId = reviewerId` and Updated. |
| Record submittal review | `review` | Append review with `id, submittalId, revision, decision, comments` and Created. Set submittal `status = decision, ballInCourtId = null` and Updated. Activity links the review. |
| Resubmit submittal | `resubmit` | Increment `revision`, set `status = In Review, ballInCourtId = reviewerId` and Updated. |
| Add a daily log entry | `add_entry` | On first entry append a day with `id, projectId, date, status = Open`, null completion fields, Created, and Updated. Otherwise set day Updated. Append entry with `id, dailyLogId, type, details` and Created. |
| Edit or remove a log entry | `edit_entry`, `delete_entry` | Set entry `details` and Updated, or remove the entry. Set day Updated. |
| Complete or reopen day | `complete`, `reopen` | Set day `status, completedAt, completedById` and Updated. Reopen sets completion fields to null. |
| Save change order draft or edit | `create`, `edit` | Append a Draft order with generated identity and number and Created, or update the current order and set Updated. Write `contractId, title, reason, description, reviewerId, scheduleImpactDays, totalAmount`. Append or update corresponding line records with `costCode, description, quantity, unitCost, amount` and audit fields, and remove dropped line records. |
| Submit change order | `submit` | Set `status = Pending Approval, submittedAt, submittedById` and Updated. |
| Approve or reject change order | `approve`, `reject` | Set `status, decisionComment, decidedAt, decidedById` and Updated. |

Daily Log entry activity includes both `relatedId` for the entry and `entryType` for its type. The parent remains available through `entityId` even when the entry is removed.

Harbor can write one baseline during a cold session load. Route changes, project and date changes, searches, filters, sorting, pagination, cancellations, invalid submissions, and idle tabs make no business-state writes.

