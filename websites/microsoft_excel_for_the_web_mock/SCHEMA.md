# Microsoft Excel for the web Mock Schema

**Base URL** `http://localhost:5305/`  
**Go endpoint** `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`  
**Reset** `POST /post?sid=<sid>` with `{"action":"reset"}`

Read the current snapshot from `GET /go?sid=<session>` under `current_state`. `state_diff` reports modified or added top-level keys. `operations[]` records committed actions in order.

On first load in a fresh browser context, Excel merges injected objects over the seed and replaces arrays supplied by the injection. That load sends one baseline `set`. The workbook list or editor can display the hydrated state while the baseline is pending, and the store accepts edits after acknowledgment. A failed first `/state` request currently makes the adapter fall back to the seed and send it as the baseline, which can replace an injected current snapshot. The API retains the first initial snapshot for the sid and resets current state to that snapshot. On reload with no pending edit, Excel reads and merges the current server snapshot without posting a new baseline. Excel keeps one hydrated or saved snapshot in localStorage as a fallback when Harbor is unreachable.

The worker checkpoints the latest pending snapshot to IndexedDB as edits arrive and posts snapshots in order. Each acknowledgment clears only its own revision. Reload in the same tab recovers the pending snapshot and its existing operation IDs. Before replacing server state, Excel checks the last known server snapshot and the last submitted snapshot, which may have reached Harbor before its response was lost. If the current server snapshot already differs at that check, Excel displays Save conflict and offers a JSON download of the pending state and a way to load the server version. These recovery controls do not write to Harbor. The state check and POST are separate requests. Independent browser contexts can read the same current snapshot and both acknowledge writes. In this case the final POST replaces the earlier snapshot, including its operation records. Read `/go` to verify which operations Harbor holds.

## State Schema

| Top-level key | Type | Meaning / example |
|---|---|---|
| schemaVersion | number | `1` |
| currentUserId | string | `user-megan-bowen`; actor for explicit actions |
| users | User[] | People picker and owner records |
| workbooks | Workbook[] | File metadata and lifecycle |
| sheets | Sheet[] | Stable sheet identities and layout |
| cells | Cell[] | Sparse, authoritative content and formula caches |
| tables | Table[] | Ranges/styles/columns; no duplicated row values |
| filters | Filter[] | Committed predicates, including cleared records |
| sorts | Sort[] | Current/superseded sort configurations |
| shares | Share[] | Direct person grants |
| shareLinks | ShareLink[] | Local simulated sharing links |
| comments | Comment[] | P2; baseline may be `[]` |
| charts | Chart[] | P2; baseline may be `[]` |
| operations | Operation[] | Structured action evidence; seed starts `[]` |
| conditionalFormats | ConditionalFormat[] | Active and deleted worksheet formatting rules |
| validationRules | ValidationRule[] | Active and deleted worksheet validation rules |
| preferences | object | `{ribbonMode:'classic',zoom:100}`; explicit setting changes only |

All timestamps are ISO UTC strings, not Date objects. Seed uses fixed timestamps. Committed actions use one transaction timestamp from `new Date().toISOString()` and actor `currentUserId`. Unknown injected actors can remain string IDs; display a neutral `You` fallback without adding users. New records use unique string IDs; defaults use fixed human-readable IDs. Do not regenerate IDs when renaming/reordering.

Common `Audit` fields on mutable entity records: `createdAt:string`, `createdBy:string`, `updatedAt:string`, `updatedBy:string`; example `2026-10-21T09:00:00.000Z`, `user-megan-bowen`. Fields noted `?` are optional; nullable fields explicitly allow null. User is read-only seed data. Operation is append-only. Arrays are normalized foreign-key collections. Missing optional collections are treated as empty by selectors; missing optional fields use read-time defaults. Preserve injected unknown fields on updates.

Use one transaction for authoritative mutation + affected formula caches + workbook metadata + operation. On successful content/config changes update owning `workbooks[].updatedAt/updatedBy`; opening only updates lastOpenedAt and its operation, favoriting changes favoriteUserIds and its operation. View selection/menu drafts are not business state. For an empty injected world, render the empty state until the user creates content.

### Default IDs

| Entity | IDs in `createInitialData()` |
|---|---|
| Current user and sample recipient | `user-megan-bowen`, `user-alex-wilber` |
| Featured and budget workbooks | `wb-regional-sales`, `wb-marketing-budget` |
| Featured workbook sheets | `sheet-sales`, `sheet-summary`, `sheet-assumptions` |
| Sales formula and Summary formula | `cell-sheet-sales-G2`, `cell-sheet-summary-B2` |
| Marketing Budget sheet, table and filter | `sheet-2-1`, `table-1`, `filter-1` |
| Sample direct grant and organization link | `grant-0-0`, `link-0` |

### Minimal Inject Example

Send this object as the `state` in a `set` request. Open `/workbook/audit-book?sid=<sid>` in a fresh browser context. The worksheet has one numeric cell and resolves independently of seed IDs.

```json
{
  "currentUserId": "audit-owner",
  "users": [],
  "workbooks": [{"id":"audit-book","name":"Audit workbook","ownerId":"audit-owner","status":"active","activeSheetId":"audit-sheet"}],
  "sheets": [{"id":"audit-sheet","workbookId":"audit-book","name":"Inventory","position":0,"visibility":"visible","status":"active"}],
  "cells": [{"id":"audit-a1","workbookId":"audit-book","sheetId":"audit-sheet","row":1,"column":1,"address":"A1","input":"42","formula":null,"value":42,"valueType":"number","error":null,"dependencies":[]}],
  "tables": [],
  "filters": [],
  "sorts": [],
  "shares": [],
  "shareLinks": [],
  "comments": [],
  "charts": [],
  "operations": [],
  "conditionalFormats": [],
  "validationRules": []
}
```

## 2. Identity, workbook and sheet entities

### User

`{id:string, displayName:string, email:string, initials:string, avatarColor:string, organization?:string, jobTitle?:string}`.
Example: `{id:'user-megan-bowen',displayName:'Megan Bowen',email:'megan.bowen@contoso.com',initials:'MB',avatarColor:'#8764B8',organization:'Contoso',jobTitle:'Sales Operations Manager'}`. Emails compare case-insensitively. No passwords, tokens or authentication sessions.

### Workbook

Audit + `{id:string, name:string, ownerId:string, location:string, status:'active'|'deleted', favoriteUserIds:string[], activeSheetId:string|null, lastOpenedAt:string|null, sourceWorkbookId?:string|null, templateId?:string|null, deletedAt?:string|null, deletedBy?:string|null}`.
Example: `id='wb-regional-sales'`, `name='FY26 Regional Sales'` (extension excluded), `ownerId='user-megan-bowen'`, `location='OneDrive / Documents / Sales'`, `status='active'`, `favoriteUserIds=['user-megan-bowen']`, `activeSheetId='sheet-sales'`, `lastOpenedAt='2026-11-16T08:30:00.000Z'`, other nullable fields null.

Every active sheet has one workbook parent. No separate workbook.sheetIds list; order is from sheet.position. `activeSheetId` must reference a visible active child when user actions modify it. For malformed injected links, render a fallback child without automatically saving a repair. Workbook soft deletion gates all children and links without overwriting their values; restore preserves children/grants. List ownership/access derives from owner, direct grants, or authorized link context. Existing-access links do not grant new access.

### Sheet

Audit + `{id:string, workbookId:string, name:string, position:number, visibility:'visible'|'hidden', status:'active'|'deleted', tabColor:string|null, autoFilterRange:string|null, sourceSheetId?:string|null, deletedAt?:string|null, deletedBy?:string|null, frozenRows?:number, frozenColumns?:number, columnWidths?:Record<string,number>, rowHeights?:Record<string,number>, hiddenRows?:number[], hiddenColumns?:number[], mergedRanges?:string[]}`.
Example: `id='sheet-sales'`, `workbookId='wb-regional-sales'`, `name='Sales'`, `position=0`, `visibility='visible'`, `status='active'`, `tabColor=null`, `autoFilterRange=null`, `columnWidths={'1':104,'2':112,'3':128,'4':152,'5':72,'6':96,'7':112,'8':104}`, `rowHeights={'1':24}`, other optional arrays empty. Indices for dimensions are 1-based; position is zero-based.

Names compare case-insensitively within active children of the same workbook, max 31 characters. Last visible sheet guard applies to explicit Hide/Delete, not initial empty injections. Duplicate creates independent linked child IDs, never alias arrays. Soft-deleted children are excluded; their retained records do not accidentally render in filters/All Sheets.

## 3. Cell and formula entities

### Cell

Audit + `{id:string, workbookId:string, sheetId:string, row:number, column:number, address:string, input:string, formula:string|null, value:string|number|boolean|null, valueType:'blank'|'string'|'number'|'boolean'|'date'|'error', error:string|null, dependencies:CellReference[], format?:CellFormat}`.

`CellReference={sheetId:string,address:string}`. Address is normalized uppercase A1, row/column 1-based; unique key `(sheetId,row,column)`. ID remains stable when moving a cell; address must match row/column. Newly occupied coordinates receive new IDs. Blank coordinates without formatting need no record. Clearing content retains formatting; removing a cell is recorded as an explicit clear operation. Formula dependencies may point to blank addresses with no Cell record. Expand range dependencies or store normalized references for every coordinate consistently; do not derive IDs from names.

`CellFormat={fontFamily?:string,fontSize?:number,bold?:boolean,italic?:boolean,underline?:boolean,fontColor?:string,fillColor?:string,horizontalAlign?:'left'|'center'|'right',verticalAlign?:'top'|'middle'|'bottom',wrapText?:boolean,numberFormat?:'General'|'Number'|'Currency'|'Percentage'|'Date',decimalPlaces?:number}`. Example `{bold:true,fillColor:'#E9F5EE',numberFormat:'Currency',decimalPlaces:2}`. Font size is points. P2 may extend formats with border rules after documenting them. Formatting-only blank cells have input `''`, value null, type blank.

Formula example:

```json
{
  "id": "cell-sheet-sales-G2", "workbookId": "wb-regional-sales", "sheetId": "sheet-sales",
  "row": 2, "column": 7, "address": "G2", "input": "=E2*F2", "formula": "=E2*F2",
  "value": 250, "valueType": "number", "error": null,
  "dependencies": [{"sheetId":"sheet-sales","address":"E2"},{"sheetId":"sheet-sales","address":"F2"}],
  "format": {"numberFormat":"Currency"},
  "createdAt":"2026-10-21T09:00:00.000Z", "createdBy":"user-megan-bowen",
  "updatedAt":"2026-10-21T09:00:00.000Z", "updatedBy":"user-megan-bowen"
}
```

Literal example E2: `input='10', formula=null, value=10, valueType='number', error=null, dependencies=[]`; text entered with a leading apostrophe preserves text, e.g. `input="'0012", value='0012', valueType='string'`. Blank is null, not zero. A literal date uses ISO `YYYY-MM-DD` as input/value with type date; formulas supporting date arithmetic can be deferred rather than silently coercing dates. Formula booleans are JSON booleans. Currency stays numeric, formatting adds `$` on display. No NaN or Infinity.

### Formula contract

Supported grammar and functions are F01 in TODO; cache and dependency fields must match committed input. `input === formula` for formula cells, including leading `=`. Treat string literals and quoted sheet identifiers separately; escaped apostrophes in a quoted sheet name use `''`. Internal dependencies use sheet IDs, while displayed formula retains names. Resolve references inside a workbook only.

Recalculate the owning workbook in the same user transaction and update audit fields on cells whose caches changed. The grid, filters, sorter and table header creation use the same derived values when injected records omit `value`, `valueType`, or a formula's text, error or dependencies. Read-time derivation leaves the server snapshot unchanged. Explicit null values for blanks and formula errors are valid cached values. Rename updates both input and formula text for reference tokens and retains stable dependency sheet IDs. Deleting a sheet replaces its reference tokens in other sheets with `#REF!` and stores `value=null,valueType='error',error='#REF!'`. Cycles use `#CIRC!`. Unsupported functions use `#NAME?`, division by zero uses `#DIV/0!`, and incompatible values use `#VALUE!`. Formula errors display in the normal cell text color.

Copy and fill translate relative reference axes by target-source deltas and retain `$` axes. Cut rewrites references to follow moved coordinates and rejects a move that would split a referenced rectangle before committing cells or an operation. Generating table headers uses the same guard and rejects insertions that would split a reference. Sort rewrites references when their mapped coordinates form a rectangle. If a sort splits a referenced range, the existing formula text remains and recalculation uses the cells now at those addresses. Duplicate sheet remaps explicit self-references to the new sheet. Copy workbook remaps every internal sheet reference and dependency.

## 4. Table, filter and sort entities

### Table

Audit + `{id:string,workbookId:string,sheetId:string,name:string,range:string,hasHeaders:boolean,style:string,filterEnabled:boolean,columns:TableColumn[],status:'active'|'deleted'}`.
`TableColumn={id:string,name:string,column:number}` where column is absolute 1-based worksheet index. Example `id='table-1'`, workbook `wb-marketing-budget`, sheet `sheet-2-1`, name `Table1`, range `A1:F31`, hasHeaders true, style `TableStyleMedium2`, filterEnabled true, columns `[ {id:'table-1-col-1',name:'Item',column:1}, ... ]`, status active. Table name case-insensitively unique per workbook; range disallows active-table overlap. Structured-reference formula syntax is out of baseline scope; use normal A1 formulas.

Create Table names columns from the same evaluated values the grid displays, including when injected header cells have incomplete caches. A valid, unique header retains its cell ID and input. Generated names fill blank headers and disambiguate duplicates.

### Filter

Audit + `{id:string,workbookId:string,sheetId:string,tableId:string|null,range:string,column:number,kind:'values'|'text'|'number'|'date',values:(string|number|boolean|null)[],predicates:Predicate[],join:'and'|'or',status:'active'|'cleared'}`.
`Predicate={operator:'equals'|'contains'|'beginsWith'|'greaterThan'|'lessThan'|'between'|'before'|'after',value:string|number|boolean|null,value2?:string|number|null}`.
Example after filtering Sales: `id='filter-sales-region'`, sheet `sheet-sales`, range `A1:H121`, tableId null, column 2, kind values, values `['West']`, predicates `[]`, join and, status active. Revenue custom criterion uses column 7, kind number, values `[]`, predicates `[{operator:'greaterThan',value:1000}]`. Date predicate values are ISO dates. For a table filter range matches the table's current range; plain sheet filter range matches sheet.autoFilterRange.

Each current filter configuration is keyed by `(sheetId,tableId-or-range,column)`. Changing the kind updates that record and appends an operation. Clearing sets status to cleared and empties values and predicates. Multiple columns combine by AND. Value selections within one column combine by OR. Custom predicates use the stored join. Values retain their types, with null selecting blanks. Visible rows derive from the current cells. The checklist considers other active column predicates and search, and checklist edits preserve selected values that either one hides. Confirming an unchanged checklist preserves the criterion. Clear Filter or an explicit Select All with an empty search clears the column criterion, including values currently hidden by other filters. Applying a checklist that selects every unfiltered value also clears it. Criteria apply only to active filter scopes.

### Sort

Audit + `{id:string,workbookId:string,sheetId:string,tableId:string|null,range:string,hasHeaders:boolean,keys:{column:number,direction:'asc'|'desc'}[],status:'active'|'superseded'}`.
Example `id='sort-sales-revenue'`, range A1:H121, hasHeaders true, keys `[{column:7,direction:'desc'}]`, active. Sorting uses evaluated values and persists the reordered cell records. The latest sort supersedes the previous active sort for that range. Operation details include the row permutation and formula changes. Sort headers stay fixed, ties retain prior row order, and blanks sort last. Active filters apply to the resulting rows.

## 5. Sharing and optional secondary entities

### Share

Audit + `{id:string,workbookId:string,recipientUserId:string|null,recipientEmail:string,permission:'view'|'edit',message:string,status:'active'|'revoked',revokedAt:string|null}`.
Seed example `id='grant-0-0'`, workbook `wb-19`, recipientUserId `user-adele-vance`, recipientEmail `adele.vance@contoso.com`, permission edit, message `Please review the latest figures.`, active, revokedAt null. Unknown valid emails have recipientUserId null. An invitation updates the existing active grant by recipient ID when available. Email-only grants match by trimmed, case-insensitive email. Existing duplicate matches are revoked and listed in `details.recipients[].revokedDuplicateGrantIds`. The retained grant keeps its ID. Revocation preserves the grant record. The workbook's owner role comes from `Workbook.ownerId`.

### ShareLink

Audit + `{id:string,workbookId:string,token:string,scope:'anyone'|'organization'|'specificPeople'|'existingAccess',permission:'view'|'edit',recipientEmails:string[],target:{sheetId:string|null,range:string|null},status:'active'|'revoked',copyCount:number,lastCopiedAt:string|null,revokedAt:string|null}`.
Seed example `id='link-0'`, token `contoso-link-0`, scope organization, permission view, recipientEmails `[]`, target `{sheetId:null,range:null}`, active, copyCount 1, lastCopiedAt `2026-11-10T14:15:00.000Z`, revokedAt null. Specific people must list at least one valid recipient. Record stores no absolute host or sid. Build same-origin `/workbook/:id?link=:token&sheet=...&range=...` with `withSid` when copying. A link target is a navigation convenience, not isolation of hidden workbook content. Permission metadata guides sandbox UI; no real security mechanism.

### Comment (P2)

Audit + `{id:string,workbookId:string,sheetId:string,anchor:string,parentId:string|null,body:string,status:'open'|'resolved'|'deleted'}`. Example comment-sales-g2 anchors G2, parentId null, body `Check the unit price before publishing.`, status open. Replies inherit anchor and refer to a root comment ID. Indicator derives from open roots. Initial array may be empty.

### Chart (P2)

Audit + `{id:string,workbookId:string,sheetId:string,sourceRange:string,type:'column'|'line'|'pie',title:string,position:{x:number,y:number},size:{width:number,height:number},status:'active'|'deleted'}`. Example chart-sales-region uses `Summary!A1:B5` resolved as sheet-local `A1:B5` on sheet-summary, type column, title `Revenue by Region`, position `{x:320,y:40}`, size `{width:480,height:300}`, active. Store sourceRange without sheet prefix because sheetId identifies it. No cached independent chart data values.

### ConditionalFormat

Audit + `{id:string,workbookId:string,sheetId:string,range:string,kind:'number'|'text'|'date',predicate:Predicate,format:CellFormat,status:'active'|'deleted'}`. First matching active rule in record order sets the display fill, font color and bold when those fields are supplied. Rule styling is derived separately from `cells[].format`. The rule never copies a value or format into individual cells.

### ValidationRule

Audit + `{id:string,workbookId:string,sheetId:string,range:string,kind:'list'|'number'|'date',values:string[],minimum:number|string|null,maximum:number|string|null,allowBlank:boolean,message:string,status:'active'|'deleted'}`. List entries compare against case-insensitive text. Number and ISO date bounds are inclusive and may be omitted using null. Subsequent direct cell-content transactions must satisfy each active rule on changed coordinates. A failed transaction leaves state unchanged and displays the rule message. Undo/redo can restore historical edits.

## 6. Structured action evidence

### Operation

`{id:string,type:string,actorId:string,createdAt:string,workbookId:string|null,sheetId:string|null,targetIds:string[],details:object,reversesOperationId?:string|null}`.

Details must be JSON serializable and substantiate the action. Use specific values/IDs, never only `message:'Changes saved'`. Mutation operations contain changed-field before/after values or concise patches; avoid snapshots of the entire workbook on every action. In-memory undo patches are separate, limited to 20 edit/format transactions, and are not required to persist.

| Workflow | Example operation and `details` |
|---|---|
| Workbooks | `workbook.rename` → `{before:"Book 1",name:"North Region Forecast"}` |
| Sheets | `sheet.rename` → `{before:"Forecast",name:"Q1 Plan",rewrittenCellIds:["cell-summary-B2"],recalculatedCellIds:[]}` |
| Formulas | `formula.set` → `{range:"G2",address:"G2",formula:"=E2*F2",changes:[{id:"cell-sheet-sales-G2",address:"G2",before:{input:"250",format:null},after:{input:"=E2*F2",format:null}}],recalculatedCellIds:["cell-sheet-sales-G2"]}` |
| Filters | `filter.apply` → `{range:"A1:H121",column:2,tableId:null,before:null,kind:"values",values:["West"],predicates:[],join:"and"}` |
| Sharing | `share.invite` → `{recipients:[{recipientUserId:"user-alex-wilber",recipientEmail:"alex.wilber@contoso.com",before:null,permission:"view"}],permission:"view",message:"Please review."}` |

Opening records target workbook and lastOpenedAt; selecting sheets records old/new activeSheetId. Cancel/invalid input/no-result search/menu opening do not append operations. No background timestamps, presence updates, random audit events or timer saves.

## Observable State Changes

Each row appends a record to `operations[]` with the corresponding action type and the target IDs. In this table `book audit` means `workbooks[].updatedAt` and `workbooks[].updatedBy`. `Entity audit` means the target entity's `updatedAt` and `updatedBy`; newly inserted records also include `createdAt` and `createdBy`. `Cell caches` refers to `formula`, `value`, `valueType`, `error`, and `dependencies` on `cells[]`, with the audit fields updated when recalculation changes a cache. The transaction details include `recalculatedCellIds` when a recalculation runs.

| User action and operation type | Observable writes and operation details |
|---|---|
| Open a workbook · `workbook.open` | `workbooks[].lastOpenedAt`; details contain its previous and new timestamps. |
| Add or remove a favorite · `workbook.favorite` | `workbooks[].favoriteUserIds`; details contain `userId` and `favorite`. |
| Create a workbook · `workbook.create` | New `workbooks[]` and `sheets[]`; template data may add `cells[]`. Details contain the name and template ID. |
| Rename a workbook · `workbook.rename` | `workbooks[].name`, book audit; details contain the old and new names. |
| Save a copy · `workbook.copy` | New `workbooks[]` with `sourceWorkbookId`, copied `sheets[]` and linked `cells[]`, `tables[]`, `filters[]`, `sorts[]`, `comments[]`, `charts[]`, `conditionalFormats[]` and `validationRules[]`, when present. Details contain source/target workbook IDs and a source-to-copy sheet map. |
| Delete or restore a workbook · `workbook.delete`, `workbook.restore` | `workbooks[].status`, `deletedAt`, `deletedBy`, book audit; details contain the new status. |
| Add a sheet · `sheet.add` | New `sheets[]`, normalized active sheet `position` values if needed, `workbooks[].activeSheetId`, book audit; details contain name and position. |
| Switch sheets in editing mode · `sheet.select` | `workbooks[].activeSheetId`; details contain old and new active sheet IDs. |
| Rename a sheet · `sheet.rename` | `sheets[].name`, sheet audit, `cells[].input` and cell caches for rewritten references, book audit; details contain previous/new name and rewritten cell IDs. |
| Duplicate a sheet · `sheet.duplicate` | New `sheets[]` with `sourceSheetId`; new linked `cells[]`, `tables[]`, `filters[]`, `sorts[]`, `comments[]`, `charts[]`, `conditionalFormats[]` and `validationRules[]`, when present; affected `sheets[].position`, `workbooks[].activeSheetId`, book audit. Details contain source ID and before/after positions. |
| Reorder by drag or dialog · `sheet.reorder` | `sheets[].position` and audit for changed siblings, book audit; details contain previous/new positions keyed by sheet ID. |
| Set or clear tab color · `sheet.color` | `sheets[].tabColor`, sheet and book audit; details contain previous/new color. |
| Hide or unhide a sheet · `sheet.hide`, `sheet.unhide` | `sheets[].visibility`, sheet audit, `workbooks[].activeSheetId` when changed, book audit; details contain visibility, status and active sheet ID. |
| Delete a sheet · `sheet.delete` | `sheets[].status`, `deletedAt`, `deletedBy`, sheet audit, `workbooks[].activeSheetId` when changed, book audit, rewritten reference `cells[].input/formula` and affected cell caches. Child records stay linked to the deleted sheet. |
| Commit a literal · `cell.edit` | Sparse `cells[]` upsert with coordinate/ID, `input`, caches, cell audit and book audit; details contain selected range and old/new input and format by cell. |
| Commit a formula · `formula.set` | The same paths as `cell.edit` with formula caches and dependencies on all affected cells. Details include the committed formula, address, and recalculated cell IDs. |
| Clear contents · `cell.clear` | Cell input changes to `''` and its caches clear. Cells without format may be removed from `cells[]`. Book audit and per-cell old/new input and format appear on the operation. |
| Paste or fill · `range.paste`, `range.fill` | Sparse `cells[]` upserts/removals, cell caches, cell and book audit. Details contain destination range, source range when applicable and per-cell content/format changes. |
| Paste a cut range · `range.cut` | `cells[].sheetId/row/column/address` for moved records, removal of overwritten targets, reference rewrites in `input` plus cell caches and audits, book audit. Details contain source sheet/range, destination range, old/new addresses and rewritten cell IDs. |
| Format a range · `range.format` | `cells[].format`, sparse blank cells for formatting when needed, cell and book audit. Details contain the formatting patch and old/new per-cell values. |
| Merge or unmerge · `range.merge`, `range.unmerge` | `sheets[].mergedRanges`, sheet audit, book audit. Merge centers the retained top-left cell and clears contents at other occupied coordinates, updating cell caches and audit. Details contain previous/new merge lists and any affected cell contents. |
| Undo or redo · `edit.undo`, `edit.redo` | Restored or removed `cells[]` patches, restored `sheets[].mergedRanges` when part of the original action, applicable cell caches and audit, and book audit. Operation carries `reversesOperationId`. |
| Enable or disable a range filter · `filter.enable`, `filter.disable` | `sheets[].autoFilterRange`, sheet and book audit. Disabling sets matching criteria `filters[].status='cleared'`, empties `values` and `predicates`, and updates their audit. |
| Create a table · `table.create` | New `tables[]` and nested `tables[].columns[]` definitions, book audit, any added/renamed header `cells[]`. Generating headers shifts data `cells[].row/address`, rewrites formula references when supported, and refreshes cell caches and audit. Details contain the table name, range, style, whether headers were inserted, and `movedCellIds` and `rewrittenCellIds`. |
| Apply checklist or custom criteria · `filter.apply` | `filters[]` upsert keyed by parent range/table and worksheet column; writes `kind`, `values`, `predicates`, `join`, `status`, audit and book audit. Details contain prior/new criteria and scope. |
| Clear column or sheet criteria · `filter.clear` | Matching `filters[].status`, `values`, `predicates`, filter audit and book audit. Filter arrows remain configured. |
| Reapply criteria · `filter.reapply` | Matching `filters[].updatedAt/updatedBy`, book audit and operation containing filter IDs and current matching row count. Row visibility is derived. |
| Sort complete records · `range.sort` | New `sorts[]`; prior active same-range sort changes to `superseded` with audit. Moved `cells[].row/address`, rewritten `cells[].input`, cell caches and audit, book audit. Details include sort keys, source-to-destination row permutation and rewritten cell IDs. |
| Send an invitation · `share.invite` | `shares[]` upsert by active recipient ID or normalized email on an email-only grant. Writes `recipientUserId`, `recipientEmail`, `permission`, `message`, `status`, `revokedAt`, grant audit and book audit. Details contain recipients, prior and new permissions, the message and any revoked duplicate grant IDs. |
| Change or remove a person's access · `share.permission`, `share.revoke` | `shares[].permission` or `status` and `revokedAt`, grant audit and book audit. Details contain previous/new access metadata. |
| Copy a sharing link · `share.link.copy` | New or reused `shareLinks[]`, incremented `copyCount`, `lastCopiedAt`, link audit and book audit. Details contain token, scope, permission, target, recipients and copy count. |
| Change or revoke a link · `share.link.update`, `share.link.revoke` | `shareLinks[].permission` or `status` and `revokedAt`, link audit and book audit. Details contain previous/new access metadata. |
| Create or reply to a comment · `comment.add`, `comment.reply` | New `comments[]` with workbook/sheet IDs, anchor, parent ID, body, open status, audit and book audit. |
| Resolve, reopen or delete a comment · `comment.resolve`, `comment.reopen`, `comment.delete` | `comments[].status`, comment and book audit. Replies are linked by `parentId`; markers derive from open roots. |
| Insert a chart · `chart.create` | New `charts[]` with workbook/sheet IDs, type, title, source range, position, size, active status, audit and book audit. |
| Edit, move, resize or delete a chart · `chart.update`, `chart.move`, `chart.resize`, `chart.delete` | Changed `charts[].type/title/position/size/status`, chart and book audit. Details contain previous/new metadata; plot values derive from source cells. |
| Replace text · `range.replace` | Changed `cells[].input` or cleared records, cell caches and audit, book audit. Details identify source sheet ID and old/new content for each changed cell. |
| Freeze or unfreeze panes · `sheet.freeze` | `sheets[].frozenRows/frozenColumns`, sheet and book audit. Details contain previous/new frozen row and column counts. |
| Resize row or column · `sheet.resize` | `sheets[].rowHeights` or `columnWidths` with changed pixel dimensions, sheet and book audit. |
| Hide or unhide rows/columns · `sheet.hide`, `sheet.unhide` | Dimension actions set `sheets[].hiddenRows` or `hiddenColumns`, sheet and book audit. Details identify the affected dimension, indices, field, and previous/new index arrays. |
| Import local CSV · `workbook.import_csv` | New `workbooks[]`, `sheets[]` and typed `cells[]`; details contain local filename, row/column counts, header option and the per-column type mapping. CSV download and native print do not write business state. |
| Set zoom or ribbon layout · `preference.zoom`, `preference.ribbonMode` | `preferences.zoom` or `preferences.ribbonMode`; details carry the previous and new value. |
| Add or edit a conditional format · `conditionalFormat.create`, `conditionalFormat.update` | `conditionalFormats[]` rule ID, range, kind, predicate, format, status and audit, book audit. |
| Remove a conditional format · `conditionalFormat.delete` | `conditionalFormats[].status='deleted'`, rule and book audit. |
| Add or edit data validation · `validation.create`, `validation.update` | `validationRules[]` rule ID, range, kind, values, bounds, blank allowance, message, status and audit, book audit. |
| Remove data validation · `validation.delete` | `validationRules[].status='deleted'`, rule and book audit. |

Selection, filter and sharing drafts, search, dialog cancellation, clipboard copy/cut before paste, read-only sheet navigation, viewing mode, ribbon tab, pane visibility, per-view gridlines, expanded formula bar, Find navigation, and Show Formulas are transient. Rendering cached values from injected inputs never posts repaired state. Deleted workbook and sheet children remain available for inspection in `/go`.

Known verifier-relevant failures and browser reproductions are recorded in [AUDIT.md](AUDIT.md).
