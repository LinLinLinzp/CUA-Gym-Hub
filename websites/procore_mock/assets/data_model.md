# Procore workspace state model

## Conventions

Store plain JSON. IDs are opaque strings, display numbers are strings, dates are local construction dates as `YYYY-MM-DD`, and timestamps are ISO 8601 strings. Optional fields may be null, absent, or empty where appropriate. Resolve lookup names defensively and show a useful fallback for missing references. Every record with audit fields has `createdAt, createdById, updatedAt?, updatedById?`. Mutation timestamps come from `new Date().toISOString()`. The actor is the account's current user. If that lookup is absent in an injected world, retain the account actor ID where available and allow null attribution if none is provided. Fixed seed IDs and timestamps never depend on the clock.

All collections below are arrays. `account` is an object. Generated IDs must be collision-safe within the session. Assign human-readable numbers by advancing the highest matching number already present in the project and checking for duplicates. `RFI-031`, `SUB-029`, and `CO-025` illustrate the formats. A Daily Log is unique by project/date regardless of the internal ID.

## Account and lookup records

| Key | Fields and types | Example |
| --- | --- | --- |
| `account` | `companyName: string, currentUserId: string, defaultProjectId: string` | Northbank Builders, `person-maya`, `proj-harborview` |
| `projects[]` | `id, number, name, city: string; memberIds: string[]` | `proj-harborview`, P-2617, Harborview Medical Pavilion, Portland, OR, [`person-maya`, `person-leo`] |
| `people[]` | `id, name, role: string; companyId?: string` | `person-maya`, Maya Chen, Project Engineer, `company-northbank` |
| `companies[]` | `id, name, trade: string; projectIds: string[]` | `company-cedar`, Cedar Mechanical, Mechanical, [`proj-harborview`] |
| `contracts[]` | `id, projectId, number, title, companyId, status: string; originalAmount: number` | `contract-harbor-general`, `proj-harborview`, PC-001, General Construction, `company-northbank`, Approved, 4230000.00 |

Person selectors draw from the project's membership and company selectors from the project's companies. Eligible order contracts are those in the same project with status Approved or Complete. Contract totals shown in the UI can derive approved changes from `changeOrders[]`.

## RFIs

| Key | Fields and types | Example |
| --- | --- | --- |
| `rfis[]` | `id, projectId, number, subject, question: string; status: Draft \| Open \| Closed; location?: string; assigneeIds: string[]; dueDate?: date; officialResponseId?: string`; audit fields | `rfi-harbor-007`, `proj-harborview`, RFI-007, Level 2 corridor soffit clearance, “Can the soffit drop 50 mm below detail A-412?”, Open, L2 East Corridor, [`person-leo`], 2026-11-23, `reply-harbor-007a` |
| `rfiResponses[]` | `id, rfiId, text, createdById, createdAt: string` | `reply-harbor-007a`, `rfi-harbor-007`, “Maintain clearance at the smoke barrier and revise the duct offset.”, `person-leo`, 2026-11-10T17:20:00.000Z |

Only a response attached to the RFI can be selected as official. The record holds one official response ID, so replacing it retains both replies without duplicate official flags.

## Submittals

| Key | Fields and types | Example |
| --- | --- | --- |
| `submittals[]` | `id, projectId, number, title, specSection, type, description: string; revision: integer; status: Draft \| In Review \| Approved \| Approved as Noted \| Revise and Resubmit \| Rejected; responsibleCompanyId?, reviewerId?, ballInCourtId?: string; dueDate?: date; attachments?: Attachment[]`; audit fields | `sub-harbor-003`, `proj-harborview`, SUB-003, Isolation valve product data, 23 05 23, Product Data, “Provide valve schedules and pressure ratings for the lab branch.”, 1, In Review, `company-cedar`, `person-leo`, `person-leo`, 2026-11-24 |
| `submittalReviews[]` | `id, submittalId, comments, createdById, createdAt: string; revision: integer; decision` is one of the four decision statuses above | `review-harbor-003-r0`, `sub-harbor-003`, “Include pressure ratings above 150 psi.”, `person-leo`, 2026-11-12T14:30:00.000Z, 0, Revise and Resubmit |

An Attachment stores `url, original_name, stored_name, content_type: string; size: integer`, matching the successful Harbor upload response. Use the session ID for the upload and save metadata only after the upload succeeds. On failure, keep the form open and offer a retry. Seed an empty attachment array or use an actual local synthetic file. Submit requires a valid reviewer and due date. Revision increments only on resubmission, and historical decisions keep their original revision.

## Daily Log

| Key | Fields and types | Example |
| --- | --- | --- |
| `dailyLogs[]` | `id, projectId: string; date: date; status: Open \| Complete; completedAt?, completedById?: string`; audit fields | `day-harbor-2026-11-16`, `proj-harborview`, 2026-11-16, Complete, 2026-11-16T22:10:00.000Z, `person-maya` |
| `dailyLogEntries[]` | `id, dailyLogId: string; type: weather \| manpower \| note \| delivery; details: object`; audit fields | `entry-harbor-112`, `day-harbor-2026-11-16`, manpower, `{companyId: 'company-cedar', workerCount: 6, hoursPerWorker: 7.5, location: 'Level 2', description: 'Set lab branch hangers.'}` |

| Entry type | Fields in `details` | Example |
| --- | --- | --- |
| `weather` | `condition: string; tempF: number; observedAt: string` in local HH:mm format; `notes?: string` | Light rain, 54, 07:00, “North access path wet.” |
| `manpower` | `companyId: string; workerCount: integer; hoursPerWorker: number; location?, description?: string` | Cedar Mechanical, 6, 7.5, Level 2, “Set lab branch hangers.” |
| `note` | `text: string; location?: string` | “Surveyor verified curtainwall bench marks.”, South elevation |
| `delivery` | `companyId?: string; material: string; quantity: number; unit: string; receivedAt: string` in local HH:mm format; `notes?: string` | Cedar Mechanical, Isolation valves, 12, each, 09:45, “Checked against packing list.” |

Validate positive crew counts and delivery quantities, hours greater than zero and at most 24, and numeric temperatures across zero. Open the default Daily Log route on the current local date from `new Date()` and make recent recorded dates visible in the calendar or date shortcut. An empty date becomes an Open record only when its first entry saves. Reopening clears completion fields.

## Change Orders

| Key | Fields and types | Example |
| --- | --- | --- |
| `changeOrders[]` | `id, projectId, contractId, number, title, reason, description: string; status: Draft \| Pending Approval \| Approved \| Rejected; scheduleImpactDays: integer; totalAmount: number; reviewerId?, submittedAt?, submittedById?, decidedAt?, decidedById?, decisionComment?: string`; audit fields | `co-harbor-005`, `proj-harborview`, `contract-harbor-general`, CO-005, Lab exhaust support reinforcement, Design Revision, “Add bracing at the penthouse curb.”, Pending Approval, 2, 4850.00, `person-leo`, 2026-11-13T18:00:00.000Z, `person-maya` |
| `changeOrderLineItems[]` | `id, changeOrderId, costCode, description: string; quantity, unitCost, amount: number`; audit fields | `line-harbor-005a`, `co-harbor-005`, 05-1200, Brace assemblies, 5, 970.00, 4850.00 |

Require positive quantities and allow signed unit costs to represent credits. Round each quantity × unit cost to cents and sum the rounded lines. Persist the lines and aggregate in the same mutation. Drafts can have no cost lines. Submission requires a reviewer and a valid cost line. Approved and Rejected are terminal states in this workspace.

## Activity

`activity[]` stores `id, projectId, entityType, entityId, action, createdById, createdAt: string` and optional `relatedId, previousStatus, newStatus, entryType: string`. `entityType` is `rfi`, `submittal`, `dailyLog`, or `changeOrder`. Record one event per action in the same state write. Use stable action keys.

| Parent type | Action keys | Extra links and fields |
| --- | --- | --- |
| `rfi` | `create, edit, open, reply, set_official_response, close, reopen` | Link the reply on reply and official selection. Include status fields on transitions. |
| `submittal` | `create, edit, submit, review, resubmit` | Link the review record on review. Include status fields on transitions. |
| `dailyLog` | `add_entry, edit_entry, delete_entry, complete, reopen` | Use the day as parent, the entry as `relatedId`, and include `entryType` on all entry operations. Include status fields on transitions. |
| `changeOrder` | `create, edit, submit, approve, reject` | Include status fields on transitions. |

## createInitialData()

Return a fresh object with `account, projects, people, companies, contracts, rfis, rfiResponses, submittals, submittalReviews, dailyLogs, dailyLogEntries, changeOrders, changeOrderLineItems, activity`. Use literal fixtures or deterministic generation with fixed IDs and dates. Keep activity empty or populate it with fixed events consistent with the seeded business records.

| Project | Dataset |
| --- | --- |
| P-2617 Harborview Medical Pavilion, Portland, OR | 24 RFIs, 22 submittals, 19 logged dates with 50 entries, and 18 change orders. Use three eligible contracts or two eligible and one draft contract, with dedicated mechanical and structural contacts. |
| P-2624 Juniper Transit Annex, Tacoma, WA | 6 RFIs, 6 submittals, 6 logged dates with 15 entries, and 6 change orders. Use a separate eligible contract and distinct trade contacts. |

Include populated and empty log dates in October and November 2026, due dates on both sides of the seed period, at least one pending decision in each review tool, and mixed statuses in both projects. Use realistic subjects such as duct offsets, firestop shop drawings, concrete delivery, and steel support reinforcement. Avoid orphaned seeded links. Derive relative status and day selection from the runtime clock and use no timers to persist data.
