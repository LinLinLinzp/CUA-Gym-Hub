# Excel for the web — proposed observable data model

Planning specification, 2026-11-18. Implement this model in `src/data/seed.js`, use the unchanged standard dataManager, then publish its actual implementation in app-root `SCHEMA.md`. These are sandbox records inspired by the product, not a Microsoft Graph API implementation. Entity/relationship inspiration: [Graph workbook overview](https://learn.microsoft.com/graph/excel-concept-overview), [worksheet resource](https://learn.microsoft.com/en-us/graph/api/resources/workbookworksheet?view=graph-rest-1.0), [range resource](https://learn.microsoft.com/en-us/graph/api/resources/workbookrange?view=graph-rest-1.0).

## 1. Envelope and conventions

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
| preferences | object | `{ribbonMode:'classic',zoom:100}`; explicit setting changes only |

All timestamps are ISO UTC strings, not Date objects. Seed uses fixed timestamps. Committed actions use one transaction timestamp from `new Date().toISOString()` and actor `currentUserId`. Unknown injected actors can remain string IDs; display a neutral `You` fallback without adding users. New records use unique string IDs; defaults use fixed human-readable IDs. Do not regenerate IDs when renaming/reordering.

Common `Audit` fields on mutable entity records: `createdAt:string`, `createdBy:string`, `updatedAt:string`, `updatedBy:string`; example `2026-10-21T09:00:00.000Z`, `user-megan-bowen`. Fields noted `?` are optional; nullable fields explicitly allow null. User is read-only seed data. Operation is append-only. Arrays are normalized foreign-key collections. Missing optional collections are treated as empty by selectors; missing optional fields use read-time defaults. Preserve injected unknown fields on updates.

Use one transaction for authoritative mutation + affected formula caches + workbook metadata + operation. On successful content/config changes update owning `workbooks[].updatedAt/updatedBy`; opening only updates lastOpenedAt and its operation, favoriting changes favoriteUserIds and its operation. View selection/menu drafts are not business state. For an empty injected world, render the empty state until the user creates content.

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
Example: `id='sheet-sales'`, `workbookId='wb-regional-sales'`, `name='Sales'`, `position=0`, `visibility='visible'`, `status='active'`, `tabColor=null`, `autoFilterRange=null`, `columnWidths={'1':104,'2':112,'3':104,'4':152,'5':72,'6':96,'7':112,'8':104}`, `rowHeights={'1':24}`, other optional arrays empty. Indices for dimensions are 1-based; position is zero-based.

Names compare case-insensitively within active children of the same workbook, max 31 characters. Last visible sheet guard applies to explicit Hide/Delete, not initial empty injections. Duplicate creates independent linked child IDs, never alias arrays. Soft-deleted children are excluded; their retained records do not accidentally render in filters/All Sheets.

## 3. Cell and formula entities

### Cell

Audit + `{id:string, workbookId:string, sheetId:string, row:number, column:number, address:string, input:string, formula:string|null, value:string|number|boolean|null, valueType:'blank'|'string'|'number'|'boolean'|'date'|'error', error:string|null, dependencies:CellReference[], format?:CellFormat}`.

`CellReference={sheetId:string,address:string}`. Address is normalized uppercase A1, row/column 1-based; unique key `(sheetId,row,column)`. ID remains stable when moving a cell; address must match row/column. Newly occupied coordinates receive new IDs. Blank coordinates without formatting need no record. Clearing content retains formatting; removing a cell is recorded as an explicit clear operation. Formula dependencies may point to blank addresses with no Cell record. Expand range dependencies or store normalized references for every coordinate consistently; do not derive IDs from names.

`CellFormat={fontFamily?:string,fontSize?:number,bold?:boolean,italic?:boolean,underline?:boolean,fontColor?:string,fillColor?:string,horizontalAlign?:'left'|'center'|'right',verticalAlign?:'top'|'middle'|'bottom',wrapText?:boolean,numberFormat?:'General'|'Number'|'Currency'|'Percentage'|'Date',decimalPlaces?:number}`. Example `{bold:true,fillColor:'#E9F5EE',numberFormat:'Currency',decimalPlaces:2}`. Font size is points. P2 may extend formats with border rules after documenting them. Formatting-only blank cells have input `''`, value null, type blank.

Formula example:

```json
{
  "id": "cell-sales-G2", "workbookId": "wb-regional-sales", "sheetId": "sheet-sales",
  "row": 2, "column": 7, "address": "G2", "input": "=E2*F2", "formula": "=E2*F2",
  "value": 250, "valueType": "number", "error": null,
  "dependencies": [{"sheetId":"sheet-sales","address":"E2"},{"sheetId":"sheet-sales","address":"F2"}],
  "format": {"numberFormat":"Currency","decimalPlaces":2},
  "createdAt":"2026-10-21T09:00:00.000Z", "createdBy":"user-megan-bowen",
  "updatedAt":"2026-10-21T09:00:00.000Z", "updatedBy":"user-megan-bowen"
}
```

Literal example E2: `input='10', formula=null, value=10, valueType='number', error=null, dependencies=[]`; text entered with a leading apostrophe preserves text, e.g. `input="'0012", value='0012', valueType='string'`. Blank is null, not zero. A literal date uses ISO `YYYY-MM-DD` as input/value with type date; formulas supporting date arithmetic can be deferred rather than silently coercing dates. Formula booleans are JSON booleans. Currency stays numeric, formatting adds `$` on display. No NaN or Infinity.

### Formula contract

Supported grammar and functions are F01 in TODO; cache and dependency fields must match committed input. `input === formula` for formula cells, including leading `=`. Treat string literals and quoted sheet identifiers separately; escaped apostrophes in a quoted sheet name use `''`. Internal dependencies use sheet IDs, while displayed formula retains names. Resolve references inside a workbook only.

Recalculate all transitively affected formulas in the same user transaction, never from an idle timer/useEffect that writes state. Read-time computed values for injected missing caches may be derived without writing. Rename updates both input and formula text for reference tokens and retains stable dependency sheet IDs. Delete sheet makes references invalid and stores `value=null,valueType='error',error='#REF!'`. Cycle uses sandbox `#CIRC!`; unsupported function `#NAME?`; division by zero `#DIV/0!`; incompatible values `#VALUE!`. A formula error displays error text in normal cell text color.

Copy/fill translates relative reference axes by target-source deltas and retains `$` axes. Moving/cutting and sorting preserve referential correctness across dependent cells using a coordinate permutation, not a text regex. No `eval` or remote evaluator. Duplicate sheet maps references explicitly targeting itself to the new sheet; other targets stay unchanged. Copy workbook remaps every internal sheet reference/dependency.

## 4. Table, filter and sort entities

### Table

Audit + `{id:string,workbookId:string,sheetId:string,name:string,range:string,hasHeaders:boolean,style:string,filterEnabled:boolean,columns:TableColumn[],status:'active'|'deleted'}`.
`TableColumn={id:string,name:string,column:number}` where column is absolute 1-based worksheet index. Example `id='tbl-marketing-budget'`, workbook `wb-marketing-budget`, sheet `sheet-marketing-detail`, name `MarketingBudget`, range `A1:F31`, hasHeaders true, style `TableStyleMedium2`, filterEnabled true, columns `[ {id:'col-budget-month',name:'Month',column:1}, ... ]`, status active. Table name case-insensitively unique per workbook; range disallows active-table overlap. Structured-reference formula syntax is out of baseline scope; use normal A1 formulas.

### Filter

Audit + `{id:string,workbookId:string,sheetId:string,tableId:string|null,range:string,column:number,kind:'values'|'text'|'number'|'date',values:(string|number|boolean|null)[],predicates:Predicate[],join:'and'|'or',status:'active'|'cleared'}`.
`Predicate={operator:'equals'|'contains'|'beginsWith'|'greaterThan'|'lessThan'|'between'|'before'|'after',value:string|number|boolean|null,value2?:string|number|null}`.
Example `id='filter-sales-region'`, sheet `sheet-sales`, range `A1:H121`, tableId null, column 2, kind values, values `['West']`, predicates `[]`, join and, status active. Revenue custom criterion uses column 7, kind number, values `[]`, predicates `[{operator:'greaterThan',value:1000}]`. Date predicate values are ISO dates. For a table filter range matches the table's current range; plain sheet filter range matches sheet.autoFilterRange.

At most one current filter configuration per `(sheetId,tableId-or-range,column)`; upsert that record when changing kind, retain an operation history. Clearing resets values/predicates and sets status cleared. Multiple columns combine by AND; value selections within one column by OR; custom predicates by join. Typed values compare without stringifying numbers. A null value selects blanks. Filter is not deletion, sort, or a separate row store: derive visible rows from current authoritative cells. Column checklist values consider other active column predicates while allowing the current column to be revised. Inactive/deleted parent filters never apply.

### Sort

Audit + `{id:string,workbookId:string,sheetId:string,tableId:string|null,range:string,hasHeaders:boolean,keys:{column:number,direction:'asc'|'desc'}[],status:'active'|'superseded'}`.
Example `id='sort-sales-revenue'`, range A1:H121, hasHeaders true, keys `[{column:7,direction:'desc'}]`, active. Persist actual reordered cells; sorter metadata alone is insufficient. One active sort per range, supersede older configurations. Whole-row permutation and formula changes are captured in operation details. Sort headers stay fixed; stable ties retain prior row order; numeric sorting is numeric. Reapply filters after sorting by derivation.

## 5. Sharing and optional secondary entities

### Share

Audit + `{id:string,workbookId:string,recipientUserId:string|null,recipientEmail:string,permission:'view'|'edit',message:string,status:'active'|'revoked',revokedAt:string|null}`.
Example `id='grant-sales-alex'`, workbook wb-regional-sales, recipientUserId user-alex-wilber, recipientEmail alex.wilber@contoso.com, permission view, message `Please review the West region totals.`, active, revokedAt null. Unknown valid emails have recipientUserId null. Unique active recipient email per workbook. Resending updates existing active record; revocation retains evidence. Owner role comes from Workbook.ownerId, not a mutable grant. No emails are sent.

### ShareLink

Audit + `{id:string,workbookId:string,token:string,scope:'anyone'|'organization'|'specificPeople'|'existingAccess',permission:'view'|'edit',recipientEmails:string[],target:{sheetId:string|null,range:string|null},status:'active'|'revoked',copyCount:number,lastCopiedAt:string|null,revokedAt:string|null}`.
Example `id='link-sales-org-view'`, token link-sales-org-view, scope organization, permission view, recipientEmails `[]`, target `{sheetId:null,range:null}`, active, copyCount 1, lastCopiedAt `2026-11-10T14:15:00.000Z`, revokedAt null. Specific people must list at least one valid recipient. Record stores no absolute host or sid. Build same-origin `/workbook/:id?link=:token&sheet=...&range=...` with `withSid` when copying. A link target is a navigation convenience, not isolation of hidden workbook content. Permission metadata guides sandbox UI; no real security mechanism.

### Comment (P2)

Audit + `{id:string,workbookId:string,sheetId:string,anchor:string,parentId:string|null,body:string,status:'open'|'resolved'|'deleted'}`. Example comment-sales-g2 anchors G2, parentId null, body `Check the unit price before publishing.`, status open. Replies inherit anchor and refer to a root comment ID. Indicator derives from open roots. Initial array may be empty.

### Chart (P2)

Audit + `{id:string,workbookId:string,sheetId:string,sourceRange:string,type:'column'|'line'|'pie',title:string,position:{x:number,y:number},size:{width:number,height:number},status:'active'|'deleted'}`. Example chart-sales-region uses `Summary!A1:B5` resolved as sheet-local `A1:B5` on sheet-summary, type column, title `Revenue by Region`, position `{x:320,y:40}`, size `{width:480,height:300}`, active. Store sourceRange without sheet prefix because sheetId identifies it. No cached independent chart data values.

## 6. Structured action evidence

### Operation

`{id:string,type:string,actorId:string,createdAt:string,workbookId:string|null,sheetId:string|null,targetIds:string[],details:object,reversesOperationId?:string|null}`.

Details must be JSON serializable and substantiate the action. Use specific values/IDs, never only `message:'Changes saved'`. Mutation operations contain changed-field before/after values or concise patches; avoid snapshots of the entire workbook on every action. In-memory undo patches are separate, limited to 20 edit/format transactions, and are not required to persist.

| Workflow/action | Operation details example | Authoritative records also required |
|---|---|---|
| workbook create/copy | `{name:'North Region Forecast',templateId:null,sourceWorkbookId:null,newSheetIds:['sheet-new']}` | workbook and child records |
| workbook rename/delete/restore/favorite | `{changes:{name:{before:'Book 2',after:'North Region Forecast'}}}` or lifecycle/favorite before/after | workbook |
| sheet add/rename/reorder/hide/color/delete | `{changes:{name:{before:'Forecast',after:'Q1 Plan'}},rewrittenFormulaCellIds:['cell-summary-B2']}`; reorder adds `{sheetOrderBefore:[...],sheetOrderAfter:[...]}` | sheets, affected formulas, activeSheetId |
| cell/formula edit | `{range:'E2',changes:[{cellId:'cell-sales-E2',before:{input:'10',value:10},after:{input:'12',value:12}}],recalculatedCellIds:['cell-sales-G2','cell-summary-B2']}` | all changed/dependent cells |
| filter apply/clear/reapply | `{filterId:'filter-sales-region',range:'A1:H121',column:2,criteriaBefore:null,criteriaAfter:{kind:'values',values:['West']},visibleRowCount:30}` | filter plus range/table configuration |
| sort | `{range:'A1:H121',keys:[{column:7,direction:'desc'}],rowPermutation:[{from:2,to:61},...],recalculatedCellIds:[...]}` | sort configuration and actual moved cells |
| invite/update/revoke grant | `{shareIds:['grant-sales-alex'],recipientEmails:['alex.wilber@contoso.com'],permissionBefore:null,permissionAfter:'view',message:'Please review.'}` | grant |
| create/copy/revoke link | `{linkId:'link-sales-org-view',scope:'organization',permission:'view',target:{sheetId:null,range:null},copyCount:1}` | shareLink |
| undo/redo | `{originalOperationId:'op-123',affectedCellIds:[...]}`, reversesOperationId op-123 | restored/redo cells and dependent caches |

Opening records target workbook and lastOpenedAt; selecting sheets records old/new activeSheetId. Cancel/invalid input/no-result search/menu opening do not append operations. No background timestamps, presence updates, random audit events or timer saves.

## 7. Suggested createInitialData() and seed fixtures

```js
export function createInitialData() {
  // Build fresh arrays/objects on each call, using deterministic local fixture data.
  return {
    schemaVersion: 1,
    currentUserId: 'user-megan-bowen',
    users: createUsers(),              // 36 fixed English people, including Megan and Alex
    workbooks: createWorkbooks(),      // 36
    sheets: createSheets(),            // 72, including one blank workbook's Sheet1
    cells: createCells(),              // sparse, consistent with all ranges and caches
    tables: createTables(),            // 30, outside the unfiltered primary Sales range
    filters: createFilters(),          // 12, includes active and cleared examples elsewhere
    sorts: [], shares: createShares(), // 36
    shareLinks: createShareLinks(),    // 24
    comments: [], charts: [], operations: [],
    preferences: { ribbonMode: 'classic', zoom: 100 },
  };
}
```

Fixture generators are implementation suggestions, not permission to copy shared mutable arrays between calls. Fixed UTC dates from 2026-10-01 through 2026-11-16; relative labels derive using the runtime clock. Counts apply to default fixtures only. Injected arrays replace defaults; never refill an empty injected array.

Default workbook `wb-regional-sales`: 3 sheets `sheet-sales` (Sales, 0), `sheet-summary` (Summary, 1), `sheet-assumptions` (Assumptions, 2), owner Megan. Sales starts with plain data, autoFilterRange null, no active filters or tables on A1:H121. A1:H1 is `Order Date | Region | Sales Rep | Product | Units | Unit Price | Revenue | Status`. Rows 2–121 (120 orders) use fixed ISO dates, four regions North/South/East/West, six products, numeric units/prices, four statuses including Pending/Shipped/Delivered/Cancelled, and a few blank status cells for blank filtering. Each region appears 30 times. E2=10, F2=25, G2=`=E2*F2` caches 250. Every revenue row is an arithmetic formula. Ensure several West revenue values above/below 1000. Currency display for F/G; dates ISO values; no invented serial date conversion in the baseline.

Summary B2=`=SUM(Sales!G2:G121)`; B3=`=B2*Assumptions!B2`; Assumptions B2=0.1 formatted Percentage. Summary A2/A3 labels `Total Revenue`/`Commission`; seed consistent cached results and dependency references. Changing E2 to 12 increases G2 by 50, B2 by 50, B3 by 5. Additional formula cases can live in spare Summary cells; do not seed cycles/errors into the main headline totals.

Remaining 35 workbooks share 69 sheets, producing exactly 72 total (e.g. 34 books with 2 sheets, one book with 1 blank Sheet1). Include `Marketing Budget`, `Inventory Tracker`, `Project Timeline`, `Customer Orders`, `Team Capacity`, `Travel Expenses`, `Hiring Plan`, `Quarterly Forecast` plus descriptive department/quarter variants. At least 24 of these sheets have 24–60 data rows with 4–8 useful columns; other nonblank sheets have headers and 4–12 useful summary rows. Budget amounts, inventory quantities, project owners/statuses and dates vary meaningfully. Include dozens of literal and formula cells per populated sheet; no need to materialize thousands of blank cells. At least 30 tables distributed over these secondary sheets, one sheet may have two nonoverlapping tables.

36 workbooks: 24 owned by Megan, 12 owned by coworkers, with active Megan edit/view grants for Shared results; at least 8 favorites, 8 private owned files, and 4 read-only shared files. 36 grants across at least 18 workbooks; current user grants reference real owners and never duplicate owner roles. 24 links include organization/view/edit, specificPeople, existingAccess and revoked examples. 12 filter records on secondary sheets include active text/number/value criteria and cleared history. No seeded business operations masquerading as user actions.

## 8. Observable State Changes table for SCHEMA.md

The dev agent must expand this into one row per implemented action, using actual implemented paths. This minimum mapping is binding for the five seed workflows.

| Action family | Observable keys/fields |
|---|---|
| Create/open/rename/favorite/copy/delete/restore workbook | `workbooks[].{id,name,ownerId,location,status,favoriteUserIds,activeSheetId,lastOpenedAt,sourceWorkbookId,templateId,deletedAt,deletedBy,createdAt,createdBy,updatedAt,updatedBy}`; copied children; `operations[]` |
| Add/select/rename/duplicate/reorder/color/hide/unhide/delete sheet | `sheets[].{id,workbookId,name,position,tabColor,visibility,status,sourceSheetId,deletedAt,deletedBy,createdAt,createdBy,updatedAt,updatedBy}`; `workbooks[].activeSheetId`; rewritten/dependent `cells[]`; copied children; `operations[]` |
| Edit/clear/paste/fill/cut/formula/AutoSum/undo/redo | `cells[].{id,workbookId,sheetId,row,column,address,input,formula,value,valueType,error,dependencies,format,createdAt,createdBy,updatedAt,updatedBy}` and workbook metadata; `operations[]` |
| Enable filters/create table/apply/custom/clear/reapply | `sheets[].autoFilterRange`; `tables[].{id,name,range,columns,filterEnabled,style,hasHeaders,status}`; `filters[].{id,workbookId,sheetId,tableId,range,column,kind,values,predicates,join,status,createdAt,createdBy,updatedAt,updatedBy}`; workbook metadata; `operations[]`; cells only for inserted table headers |
| Sort | `sorts[].{id,workbookId,sheetId,tableId,range,hasHeaders,keys,status,createdAt,createdBy,updatedAt,updatedBy}`; moved/recalculated `cells[]`; workbook metadata; `operations[]` |
| Invite/change permission/remove grant | `shares[].{id,workbookId,recipientUserId,recipientEmail,permission,message,status,revokedAt,createdAt,createdBy,updatedAt,updatedBy}`; workbook metadata; `operations[]` |
| Copy/configure/revoke link | `shareLinks[].{id,workbookId,token,scope,permission,recipientEmails,target,status,copyCount,lastCopiedAt,revokedAt,createdAt,createdBy,updatedAt,updatedBy}`; workbook metadata; `operations[]` |

No required workflow may be downgraded to P2. `/go` returns the standard `{initial_state,current_state,state_diff}` envelope. Read records in current_state using IDs; diff groups whole modified top-level keys and is not an action/event stream. A verifier should inspect primary entities and linked operation records, not parse a rendered activity sentence.
