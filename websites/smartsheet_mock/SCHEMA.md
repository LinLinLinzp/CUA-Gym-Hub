# smartsheet_mock Schema

**Base URL** `http://localhost:5386/`  
**Go Endpoint** `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject** `POST /post?sid=<sid>` with JSON body `{"action":"set","state":{...}}`  
**Reset** `POST /post?sid=<sid>` with JSON body `{"action":"reset"}`

Use the same SID for the browser URL and the Vite state API. A fresh browser cache for that origin and SID reads custom state from `GET /state?sid=<sid>`. Injected arrays replace seed arrays, and injected objects merge over seed objects. Use a fresh SID and browser context when testing a new injection because reloads reuse the cached snapshot. Optional collections and cell maps render as empty where absent.

`/go` compares the current snapshot with the first stored baseline and reports changed top-level keys using `added` or `modified` entries. If the first POST injects a partial state, its payload establishes the baseline. The browser's first load can add omitted defaults to the current snapshot, which then appear in the diff. The reset action restores the stored baseline on the server.

## State Schema

All IDs are opaque strings. Sheet columns are scoped to their sheet. Business timestamps are UTC ISO instants. Schedule dates are date-only strings in YYYY-MM-DD format.

| Key | Shape |
| --- | --- |
| currentUserId | ID of the session user. |
| users | Array of {id, name, email, role?}. |
| workspaces | Array of {id, name, ownerId, description?}. |
| preferences | Object with favoriteSheetIds, an array of sheet IDs. |
| sheets | Array of {id, workspaceId, ownerId, name, status, columns, projectSettings?, savedFilters?, …metadata}. Status is active or deleted. Deleted sheets have deletedAt and deletedBy. |
| rows | Array of {id, sheetId, position, cells, source, status, formSubmissionId?, …metadata}. Source is grid or form. Status is active or deleted. Deleted rows have deletedAt and deletedBy. Position is one-based. The active display order is position then ID. |
| forms | Array of {id, sheetId, title, description?, fields, confirmationMessage, rowPlacement, status, …metadata}. Placement is top or bottom. Status is active or inactive. |
| formSubmissions | Array of {id, formId, sheetId, rowId, values, status, createdAt, createdBy}. Status is submitted. Values contains a typed snapshot keyed by column ID. |
| approvalWorkflows | Array of {id, sheetId, name, status, trigger, condition?, approverId, responseColumnId, subject, message, …metadata}. Status is active or paused. Trigger is {event, columnId?}, where rowAdded has no watched column and rowChanged has a watched column. Optional condition is {columnId, operator: "equals", value}. |
| approvalRequests | Array of {id, workflowId, sheetId, rowId, approverId, requestedBy, responseColumnId, subject, message, status, createdAt, readAt?, readBy?, respondedAt?, respondedBy?, responseNote?, canceledAt?, canceledBy?}. Status is pending, approved, declined, or canceled. Recipient, message, subject, and response column are snapshots. |

Metadata consists of createdAt, createdBy, updatedAt, and updatedBy. Creation initializes both metadata pairs together. An update preserves creation metadata. Actor fields use the session user ID, with anonymous as the fallback when no user ID is present. Seed fixture IDs and timestamps are deterministic.

### Default IDs

| Collection | Count | Representative IDs |
| --- | ---: | --- |
| Users | 30 | `usr_avery` (default current user), `usr_leah` |
| Workspaces | 8 | `ws_launch`, `ws_operations` |
| Sheets | 36 | `sh_launch_plan`, `sh_vendor_intake`, `sh_facilities_refresh`, `sh_onboarding_requests` |
| Rows | 396 | `row_launch_kickoff`, `row_vendor_badges` |
| Forms | 24 | `frm_vendor_intake` |
| Form submissions | 48 | `sub_vendor_badges` |
| Approval workflows | 24 | `aw_vendor_review` |
| Approval requests | 36 | `apr_vendor_badges` |

## Minimal Inject Example

Send this JSON body to the Inject endpoint to open a world with a single empty sheet. Its Grid route is `/sheets/sh_example?sid=<sid>`.

```json
{
  "action": "set",
  "state": {
    "currentUserId": "usr_example",
    "users": [{"id": "usr_example", "name": "Avery Example", "email": "avery@example.test"}],
    "workspaces": [{"id": "ws_example", "name": "Operations", "ownerId": "usr_example"}],
    "preferences": {"favoriteSheetIds": []},
    "sheets": [{
      "id": "sh_example",
      "workspaceId": "ws_example",
      "ownerId": "usr_example",
      "name": "Intake",
      "status": "active",
      "columns": [{"id": "col_name", "title": "Name", "type": "text", "primary": true}],
      "createdAt": "2026-11-18T00:00:00.000Z",
      "createdBy": "usr_example",
      "updatedAt": "2026-11-18T00:00:00.000Z",
      "updatedBy": "usr_example"
    }],
    "rows": [],
    "forms": [],
    "formSubmissions": [],
    "approvalWorkflows": [],
    "approvalRequests": []
  }
}
```

## Nested records and cell values

| Record | Shape |
| --- | --- |
| Column | {id, title, type, primary?, options?}. Columns are ordered by their array position. The primary column is text. Dropdown options are an array of strings. |
| ProjectSettings | {startColumnId, endColumnId, percentColumnId?, dependenciesEnabled, durationColumnId?, predecessorsColumnId?, workingWeekdays, holidays}. Start and end map to distinct date columns. Working weekdays use Monday 1 through Sunday 7. Holidays are date-only strings. |
| Predecessor | {rowId, type: "FS", lagDays}. A predecessor references an active row on the same sheet. Lag is a signed number of working days. |
| SavedFilter | {id, name, columnId, operator, value?}. The operator is equals, contains, or isBlank. Is blank omits value. |
| FormField | {id, columnId, label, helpText?, required, hidden, defaultValue?, visibleWhen?}. The optional visibility condition is {fieldId, equals} and references an earlier visible form field. |

The cell map is keyed by column ID. Missing cells and null are blank. Checkbox false and numeric zero are values.

| Column type | Stored value |
| --- | --- |
| text | String |
| number | Finite number |
| date | Date-only string |
| dropdown | One configured option |
| contact | User ID string |
| checkbox | Boolean |
| percent | Number between 0 and 100 |
| duration | Nonnegative whole number of workdays |
| predecessor | Array of Predecessor records |

## Observable State Changes (for LLM evaluation)

| User Action | State Field Changed |
| --- | --- |
| Create a blank or project sheet | Appends sheets[] with ID, workspaceId, ownerId, name, active status, preset columns, and creation/update metadata. Project Sheet also sets projectSettings. |
| Rename a sheet | Updates sheets[].name, updatedAt, updatedBy. |
| Favorite or unfavorite a sheet | Updates preferences.favoriteSheetIds. |
| Delete a sheet | Sets sheets[].status to deleted with deletedAt, deletedBy, updatedAt and updatedBy. Removes its ID from preferences.favoriteSheetIds. Sets pending approvalRequests for that sheet to canceled with canceledAt and canceledBy. |
| Add or insert a grid row | Appends rows[] with ID, sheetId, position, empty cells, source grid, active status, and creation/update metadata. Changed positions on other active rows receive update metadata. Stamps the parent sheet and evaluates Row added rules. |
| Edit a typed grid cell or schedule cell | Writes rows[].cells[columnId] and row and sheet update metadata. An active pending approval protects its response cell. Mapped schedule edits can also write calculated cells and update metadata to downstream rows. Actual changes to explicitly edited cells can trigger Row changed rules. |
| Delete selected rows | Marks the selected rows deleted with deletedAt, deletedBy, and update metadata, stamps the sheet, and cancels their pending requests with canceledAt and canceledBy. Active successor references block deletion until removed. |
| Add, rename, or reorder a column | Updates sheets[].columns and sheet update metadata. A new column gets an ID. Rename and reorder preserve IDs. |
| Sort a sheet | Sets the positions and update metadata of reordered active rows, plus sheet update metadata. Ties retain the prior order. A sort that leaves positions identical does not commit. |
| Save, rename, or delete a named filter | Updates sheets[].savedFilters and sheet update metadata. |
| Save a form builder | Appends or updates forms[] with ordered fields, title, description, confirmationMessage, rowPlacement, status, and metadata. Each field stores its configuration, any typed default, and any typed visibleWhen condition. The current save path drops fields whose columns are no longer eligible in the builder, including existing fields on newly mapped schedule columns. |
| Deactivate or reactivate a form | Sets forms[].status and form update metadata. |
| Submit a public form | Appends formSubmissions[] with the form, sheet and row IDs, typed values snapshot, submitted status, creator and timestamp. Appends a linked active source form row with the configured position and formSubmissionId. Sets displaced row positions and metadata, stamps the sheet, and evaluates Row added rules. Fields excluded by a visibility condition are omitted. |
| Save an approval workflow | Appends or updates approvalWorkflows[] with trigger, condition, approverId, responseColumnId, subject, message, status, and metadata. When requested, also appends a standard dropdown to sheets[].columns and stamps the sheet in the same commit. |
| Pause or reactivate a workflow | Sets approvalWorkflows[].status and update metadata. |
| Trigger a matching approval workflow | Appends one pending approvalRequests[] record per workflow and row with the linked IDs, requester, recipient, response column, message, subject, and createdAt. Writes Submitted to the row’s response cell. Shares the source action’s transaction and timestamp. |
| Open a request from the inbox or mark it read | Sets approvalRequests[].readAt and readBy for an unread eligible request. Cold request URLs and reloads are passive. |
| Approve or decline a pending request | Updates approvalRequests[].status, respondedAt, respondedBy, and responseNote. Sets readAt/readBy if needed, updates the response cell to Approved or Declined, and stamps the row and sheet. |
| Save Project Settings | Updates sheets[].projectSettings and sheet update metadata. Appends any requested mapping columns. Recalculates schedule values and stamps affected rows. |
| Move or resize a Gantt bar | Commits through the same grid cell transaction using the mapped date fields. The schedule computes affected dates and duration before one write. |

Initial load can post a baseline. Tabs sharing local storage and a SID synchronize from the current local snapshot without writing to the API. Each explicit commit starts from the latest local snapshot and sends the whole state to the server. The server applies snapshots in arrival order. Navigation, filter application, builder and cell drafts, previews, copying links, timeline zoom, divider changes, and drag previews leave business state unchanged. Invalid values, missing or cyclic active schedule predecessors, and repeated or ineligible approval decisions leave the current state unchanged.
