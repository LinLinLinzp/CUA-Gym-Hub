# Smartsheet state model

`createInitialData()` returns the following JSON object. IDs are opaque strings and remain stable after names or display positions change. Use deterministic IDs for seed data and generate fresh IDs in successful create transactions. Business timestamps are ISO instants, such as `2026-11-18T02:15:00.000Z`, assigned with `new Date().toISOString()` at commit time. Schedule dates are date-only strings such as `2026-11-23`.

```js
return {
  currentUserId: 'usr_avery',
  users,
  workspaces,
  sheets,
  rows,
  forms,
  formSubmissions,
  approvalWorkflows,
  approvalRequests,
  preferences: { favoriteSheetIds: ['sh_launch_plan', 'sh_vendor_intake'] },
}
```

Array keys can be replaced by an injected state. Treat omitted optional arrays and maps as empty in selectors. Tolerate a missing current-user record with a neutral account display. A contact without a matching user record displays its ID or an unknown contact label. Missing linked sheets, forms, or rows should produce a recoverable empty or unavailable view. Handle incomplete injected schedules at render time. Initialize or repair records only as part of an explicit user commit.

## Users, workspaces, and preferences

| Record | Fields and example |
| --- | --- |
| `User` | `id: string` (`usr_avery`), `name: string` (`Avery Morgan`), `email: string` (`avery.morgan@example.test`), `role?: string` (`Program Manager`). |
| `Workspace` | `id: string` (`ws_operations`), `name: string` (`Operations`), `ownerId: string` (`usr_avery`), `description?: string` (`Shared tracking for operations and vendors`). |
| `Preferences` | `favoriteSheetIds: string[]` (`['sh_vendor_intake']`), scoped to the current session user. |

## Sheets and rows

| Record | Fields and example |
| --- | --- |
| `Sheet` | `id: string` (`sh_vendor_intake`), `workspaceId: string` (`ws_operations`), `ownerId: string` (`usr_avery`), `name: string` (`Vendor Request Log`), `status: 'active' \| 'deleted'`, `columns: Column[]`, `projectSettings?: ProjectSettings`, `savedFilters?: SavedFilter[]`. Includes `createdAt`, `createdBy`, `updatedAt`, and `updatedBy`. Deletion also adds `deletedAt` and `deletedBy`. |
| `Column` | `id: string` (`col_priority`), `title: string` (`Priority`), `type: ColumnType` (`dropdown`), `primary?: boolean` (`false`), `options?: string[]` (`['Low','Normal','Urgent']`). Display order is the array order. Store one primary text column per sheet. |
| `Row` | `id: string` (`row_vendor_badges`), `sheetId: string` (`sh_vendor_intake`), `position: number` (`12`), `cells: Record<columnId, CellValue>` (`{col_request: 'Visitor badges', col_priority: 'Urgent'}`), `source: 'grid' \| 'form'`, `status: 'active' \| 'deleted'`, `formSubmissionId?: string` (`sub_vendor_badges`). Includes creation and update metadata and, when deleted, deletion metadata. |
| `SavedFilter` (P2) | `id: string` (`flt_urgent`), `name: string` (`Urgent requests`), `columnId: string` (`col_priority`), `operator: 'equals' \| 'contains' \| 'isBlank'`, `value?: CellValue` (`Urgent`). |

All metadata fields are strings. Actor fields reference user IDs. For new records with update metadata, initialize both creation and update metadata from the same actor and instant. Use `system` as the reserved actor only in seed data and `anonymous` for submissions in sessions without an identified user. Every reference to a column is resolved within its sheet. Active rows display in ascending `position`, with `id` as a tie-breaker. For insertion or sort, compute the new active order and write new positions and update metadata to rows whose positions change. Deleted rows retain their IDs and cells for historical relationships. Protect approval response cells while their request is pending. A row referenced by an active schedule can be deleted once its successor references have been removed or the successors are deleted in the same action.

| `Column.type` | `CellValue` |
| --- | --- |
| `text` | String, e.g. `Visitor badges`. |
| `number` | Finite number, e.g. `1250.50`. Numeric comparison and sorting use the stored value. |
| `date` | `YYYY-MM-DD` string, e.g. `2026-11-23`. |
| `dropdown` | Option string, e.g. `Urgent`. |
| `contact` | User ID string, e.g. `usr_avery`. |
| `checkbox` | Boolean, e.g. `false`. |
| `percent` | Number from 0 to 100, e.g. `40` for `40%`. |
| `duration` | Nonnegative whole number of working days, e.g. `3`. |
| `predecessor` | `Predecessor[]`, e.g. `[{rowId: 'row_launch_design', type: 'FS', lagDays: 0}]`. |

Cells can be missing or explicitly `null`. Treat either as blank, and keep `0` and `false` valid. Reject invalid type conversions before committing. A blank dropdown or contact clears the value. Store predecessor row IDs even if the editor displays a row number or task name.

## Forms and submissions

| Record | Fields and example |
| --- | --- |
| `Form` | `id: string` (`frm_vendor_intake`), `sheetId: string` (`sh_vendor_intake`), `title: string` (`Vendor Access Request`), `description?: string` (`Submit access needs for a vendor visit.`), `status: 'active' \| 'inactive'`, `fields: FormField[]` in display order, `confirmationMessage: string` (`Your request has been received.`), `rowPlacement: 'top' \| 'bottom'`, creation and update metadata. |
| `FormField` | `id: string` (`ff_vendor_priority`), `columnId: string` (`col_priority`), `label: string` (`Request priority`), `helpText?: string` (`Select Urgent if needed within two business days.`), `required: boolean`, `hidden: boolean`, `defaultValue?: CellValue` (`Normal`), `visibleWhen?: {fieldId: string, equals: CellValue}` (P2, e.g. `{fieldId: 'ff_vendor_priority', equals: 'Urgent'}`). |
| `FormSubmission` | `id: string` (`sub_vendor_badges`), `formId: string` (`frm_vendor_intake`), `sheetId: string` (`sh_vendor_intake`), `rowId: string` (`row_vendor_badges`), `values: Record<columnId, CellValue>` (`{col_request: 'Visitor badges', col_priority: 'Urgent'}`), `status: 'submitted'`, `createdAt: string`, `createdBy: string`. |

Map at most one field to each column. Offer text, number, date, dropdown, contact, checkbox, and percentage as form fields. Hide the scheduling and approval-controlled system fields from the form field picker. Save builders only if they have a title and at least one visible field. A hidden required field needs a valid default. Apply typed defaults first and preserve entered `false` and `0`. Preview uses the same validation and commits nothing. Submission records and their linked rows commit together. `formSubmissions[].values` captures the submitted values before any schedule calculation or approval status write. Inactive forms and forms on deleted sheets cannot accept new submissions.

## Approval workflows and requests

| Record | Fields and example |
| --- | --- |
| `ApprovalWorkflow` | `id: string` (`aw_vendor_review`), `sheetId: string` (`sh_vendor_intake`), `name: string` (`Urgent vendor sign-off`), `status: 'active' \| 'paused'`, `trigger: {event: 'rowAdded' \| 'rowChanged', columnId?: string}`, `condition?: {columnId: string, operator: 'equals', value: CellValue}` (`{columnId: 'col_priority', operator: 'equals', value: 'Urgent'}`), `approverId: string` (`usr_avery`), `responseColumnId: string` (`col_approval`), `subject: string` (`Review vendor access`), `message: string` (`Confirm the vendor is on the site list.`), creation and update metadata. |
| `ApprovalRequest` | `id: string` (`apr_vendor_badges`), `workflowId: string` (`aw_vendor_review`), `sheetId: string` (`sh_vendor_intake`), `rowId: string` (`row_vendor_badges`), `approverId: string` (`usr_avery`), `requestedBy: string` (`usr_leah`), `responseColumnId: string` (`col_approval`), `subject: string`, `message: string`, `status: 'pending' \| 'approved' \| 'declined' \| 'canceled'`, `createdAt: string`, `readAt?: string`, `readBy?: string`, `respondedAt?: string`, `respondedBy?: string`, `responseNote?: string` (`Approved for the April visit.`), `canceledAt?: string`, `canceledBy?: string`. |

A Row changed rule requires a watched column. Detect actual typed value changes from the direct edit, and evaluate conditions against the resulting row before applying any approval writes. A Row added rule evaluates both grid-created and form-created rows. For a blank grid row whose values arrive later, use Row changed to act on a subsequent qualifying edit. Workflow saves and reactivation apply to future matching events. Deduplicate by `(workflowId, rowId)`. Configure at most one active workflow for a given sheet response column to keep concurrently pending decisions separate. Avoid replacing a response cell on a row if an earlier request for that cell is still pending. The request snapshots the recipient, response column and message in case the rule changes later. Disable a rule save when the watched column is its approval response column.

Route the request to the selected user’s in-app Requests view. The unread badge counts the current recipient’s unread requests, except canceled requests. Opening request details from the inbox may mark it read through an explicit user action. Cold deep links and reloads display details without marking read. Decision buttons validate the current recipient, pending status, and active linked row and sheet before writing the request and its response cell together. Record `Approved`/`Declined` in the cell and `approved`/`declined` in the request record. A deleted row or sheet cancels pending requests in the same commit. Keep completed requests available as history when their original rows or sheets are deleted.

## Project settings and schedule edits

| Record | Fields and example |
| --- | --- |
| `ProjectSettings` | `startColumnId: string` (`col_start`), `endColumnId: string` (`col_finish`), `percentColumnId?: string` (`col_percent`), `dependenciesEnabled: boolean`, `durationColumnId?: string` (`col_duration`), `predecessorsColumnId?: string` (`col_predecessors`), `workingWeekdays: number[]` (`[1,2,3,4,5]` using Monday `1` through Sunday `7`), `holidays: string[]` (`['2026-11-26']`). |
| `Predecessor` | `rowId: string` (`row_launch_design`), `type: 'FS'`, `lagDays: number` (`1`, a signed integer count of working days). |

- Require two distinct date columns for Gantt. If settings are missing, open configuration or suggest two existing date columns. Without dependencies, render undated rows without bars, single-date rows as milestones, and same-day ranges as one-day bars. Move a bar by the same calendar-day offset on both endpoints, or move one boundary in resize. Percentage fills read from the mapped percent cell.
- With dependencies on, require mapped duration and predecessor columns, at least one working weekday, and valid date-only holidays. Use date-only arithmetic so local time zones and daylight saving do not move bars. Count working days inclusively from the scheduled start for positive duration. A `0`-day milestone has matching start and end dates. If a controlled task has several predecessors, use the latest required start. A zero-lag `FS` start is the next working day after the predecessor’s end. Adjust that day by `lagDays`. For example, Friday `2026-11-20` with zero lag yields Monday `2026-11-23`; a two-day successor ends Tuesday `2026-11-24` when neither day is a holiday.
- For a task without a predecessor, allow start and duration edits. A valid end-date edit or resize recomputes duration, and a drag move keeps the existing duration. Snap a moved dependency-enabled start forward to a workday. Controlled starts use the predecessor editor, while their end and duration can be adjusted together. When enabling dependencies, infer a missing duration from an existing valid mapped range, while keeping an explicit zero as a milestone. A row with insufficient scheduling data remains unscheduled. A new predecessor must reference an active row in the same sheet with a calculable finish.
- Validate the proposed graph and date range, then recompute the affected downstream rows in dependency order before one save. A circular dependency, missing predecessor in the proposed edit, or invalid range blocks the edit and preserves the schedule. Gantt and Grid share the same validator, calculations, and row data. Derived date changes receive update metadata as part of the initiating user action and do not trigger approvals.

## Seed fixtures

| Data | Required examples and coverage |
| --- | --- |
| Users | 30 fictional English-language coworkers on `example.test`, including Avery Morgan (`usr_avery`), program manager, and Leah Brooks (`usr_leah`), operations lead. Seed actionable inbox items for Avery. |
| Workspaces | 8 including Product Launch (`ws_launch`), Operations (`ws_operations`), Customer Success, Facilities, Finance, People, Marketing, and IT. |
| Sheets | 36 across the eight workspaces. Include Launch Delivery Plan (`sh_launch_plan`), Vendor Request Log (`sh_vendor_intake`), Facilities Refresh (`sh_facilities_refresh`, dependencies off), and an empty Onboarding Requests sheet (`sh_onboarding_requests`). |
| Rows | At least 360 across the active sheets. Give Launch Delivery Plan and Vendor Request Log at least 30 each. Include open and done items, varied assignees, priorities, boolean and numeric fields, undated tasks, a milestone, and a three-link dependency chain with an overlapping independent task. |
| Forms and submissions | 24 forms including `frm_vendor_intake`, with a mix of active and inactive forms, distinct field orders, required inputs, typed defaults, and examples for both insertion positions. Seed 48 submissions with corresponding rows. Include a visible required field and a hidden priority default of `Urgent` in the vendor fixture. |
| Workflows and requests | 24 rules including `aw_vendor_review`, a Row added rule for urgent vendor requests assigned to Avery. Cover Row changed, optional conditions, inactive rules, and other recipients. Seed 36 requests across pending, approved, declined, and canceled; give Avery at least two pending unread requests and historical decisions. The linked row status cells agree with each active request’s stage. |

Use fixed seed timestamps and explicit 2026 schedule dates. Derive labels such as Today or Overdue from `new Date()` at render time. Preserve a visible timeline when the runtime clock is outside seeded task dates by centering the initial date window on the data and offering a Today control.
