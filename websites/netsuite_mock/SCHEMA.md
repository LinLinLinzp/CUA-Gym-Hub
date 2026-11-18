# netsuite_mock Schema

**Base URL**: `http://localhost:5447/`  
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}`

On a fresh browser context, the client loads `GET /state?sid=<sid>` and merges its `stored_state` over the defaults. Injected arrays replace default arrays. Injected objects merge by key. Reset restores the initial snapshot, or uses the default data if the local Vite server has no initial snapshot. Use a fresh browser context or SID to exercise a new local injection because the client caches hydrated state in localStorage.

Both `set` and `set_current` replace current state by default. The server also captures the first POST snapshot as initial, or the request's `initial_state` if supplied. Subsequent POSTs preserve that baseline. For a partial injection, the boot merge can add default keys to the current state and therefore to the diff. `state_diff` reports changed top-level collections or objects, so verify each record and its nested fields in `current_state`. See the [data model](assets/data_model.md) for business rules and fixture details.

## State Schema

| Key | Type | Notes |
|---|---|---|
| `company` | object | account/company info |
| `currentUser` | object | logged-in user (pre-logged-in) |
| `preferences` | object | order-management & UI prefs (§2.3) |
| `counters` | object | next document numbers (§2.4) |
| `employees` | array | §2.5 |
| `locations` | array | 3 warehouses |
| `departments`, `classes` | arrays | classification |
| `accounts` | array | chart of accounts subset |
| `terms`, `shipMethods`, `paymentMethods`, `taxItems` | arrays | reference lists |
| `customers` | array | §3.1 |
| `vendors` | array | §3.2 |
| `items` | array | §3.3 (incl. per-location stock) |
| `salesOrders` | array | §4.2 |
| `itemFulfillments` | array | §4.3 |
| `invoices` | array | §4.4 |
| `customerPayments` | array | §4.5 |
| `purchaseOrders` | array | §4.6 |
| `itemReceipts` | array | §4.7 |
| `vendorBills` | array | §4.8 |
| `vendorPayments` | array | §4.9 and Pay Bills |
| `inventoryAdjustments` | array | §4.10 |
| `inventoryTransfers` | array | §4.11 |
| `systemNotes` | array | §4.12 audit trail |
| `userNotes` | array | §4.13 and Activities → User Notes |
| `shortcuts` | array | §2.6 nav Shortcuts (star menu) |
| `tasks` | array | P2 Activities > Tasks |

Form drafts, current filters, tabs, sorting, page selection and expanded navigation live in the browser UI. The explicit Rows per Page setting is stored in `preferences.listRowsPerPage`.

### Default IDs

| Collection | Fixed seed IDs |
|---|---|
| Customers and vendors | `cust_1001`–`cust_1040` and `vend_2001`–`vend_2022` |
| Items | 60 SKU-derived IDs, including `item_pmp1050` (PMP-1050) and `item_svcdeliv` (SVC-DELIV) |
| Employees and warehouses | `emp_101`–`emp_110` and `loc_1` (Portland), `loc_2` (Reno), `loc_3` (Columbus) |
| Sales and billing | `so_10411`–`so_10458`, `if_8201`–`if_8232`, `inv_20871`–`inv_20903`, `pymt_6101`–`pymt_6120` |
| Purchasing and payables | `po_4501`–`po_4532`, `ir_3301`–`ir_3318`, `bill_1101`–`bill_1116`, `vp_1201`–`vp_1208` |
| Stock movements | `adj_1041`–`adj_1050` and `trf_1011`–`trf_1016` |
| Audit and workspace | `sn_1`–`sn_414`, `note_1`–`note_8`, `short_1`–`short_6`, `task_3001`–`task_3010` |

---

## §2 Reference data

### 2.1 `company`
```js
{ name: 'Cascade Industrial Supply', legalName: 'Cascade Industrial Supply, Inc.', accountId: 'ACME',
  domain: 'acme.app.netsuite.com', address: '4120 NW Yeon Ave, Portland, OR 97210', phone: '(503) 555-0142',
  currency: 'USD', fiscalYearStart: '01', taxId: '93-1847720', edition: 'US' }
```
### 2.2 `currentUser`
```js
{ employeeId: 'emp_101', name: 'Jordan Ellis', email: 'jordan.ellis@cascadeindustrial.com',
  role: 'Administrator', roleCenter: 'Classic', initials: 'JE' }
```
Header shows "Jordan Ellis" / "Cascade Industrial Supply - Administrator".

### 2.3 `preferences`
```js
{ dateFormat: 'M/D/YYYY',
  salesOrderDefaultStatus: 'Pending Approval',      // 'Pending Approval' | 'Pending Fulfillment'
  purchaseOrderSupervisorApprovalDefault: false,    // default of the "Supervisor Approval" checkbox on new POs
  creditLimitHandling: 'Warn',                      // 'Warn' | 'Ignore'  (credit HOLD always blocks)
  allowNegativeInventory: false,
  defaultLocationId: 'loc_1',
  listRowsPerPage: 50,
  showConfirmationBanners: true }
```
### 2.4 `counters` (seed values = next number to issue)
```js
{ nextInternalId: 5001, salesOrder: 10459, itemFulfillment: 8233, invoice: 20904, customerPayment: 6121,
  purchaseOrder: 4533, itemReceipt: 3319, vendorBill: 1117, vendorPayment: 1209,
  inventoryAdjustment: 1051, inventoryTransfer: 1017, customer: 1041, vendor: 2023 }
```
tranId formats: `SO10459`, `IF8233`, `INV20904`, `PYMT6121`, `PO4533`, `IR3319`, bill transaction number `BILL1117`,
`VP1209`, `ADJ1051`, `TRF1017`; customer entityId `C1041`, vendor entityId `V2023`. Counter increments only on successful save.

### 2.5 `employees` (10)
| id | internalId | name | title | department | email | flags |
|---|---|---|---|---|---|---|
| emp_101 | 101 | Jordan Ellis | Operations Manager | Operations | jordan.ellis@… | currentUser, isSupervisor |
| emp_102 | 102 | Priya Raman | Account Manager | Sales | priya.raman@… | salesRep |
| emp_103 | 103 | Marcus Bell | Account Manager | Sales | marcus.bell@… | salesRep |
| emp_104 | 104 | Elena Ortiz | Inside Sales Rep | Sales | elena.ortiz@… | salesRep |
| emp_105 | 105 | Tom Whitaker | Purchasing Manager | Purchasing | tom.whitaker@… | buyer, purchaseApprovalLimit 10000 |
| emp_106 | 106 | Grace Liu | Warehouse Manager – Portland | Operations | grace.liu@… | |
| emp_107 | 107 | Dev Patel | Warehouse Lead – Reno | Operations | dev.patel@… | |
| emp_108 | 108 | Hannah Brooks | A/R Specialist | Finance | hannah.brooks@… | |
| emp_109 | 109 | Sam Okafor | A/P Clerk | Finance | sam.okafor@… | |
| emp_110 | 110 | Rachel Kim | Controller | Finance | rachel.kim@… | |
Shape: `{ id, internalId, entityId:'E101', name, firstName, lastName, title, departmentId, email, phone, supervisorId, isSalesRep, isBuyer, isSupervisor, inactive:false, purchaseApprovalLimit? }`. Employee emails use `@cascadeindustrial.com`.

### 2.6 Other reference lists
- `locations`:
  `{ id:'loc_1', internalId:1, name:'01: Portland', fullName:'Portland Main Warehouse', address:'4120 NW Yeon Ave, Portland, OR 97210', managerId:'emp_106', inactive:false, makeInventoryAvailable:true }`,
  `loc_2` "02: Reno" (Reno Distribution Center, 1355 Capital Blvd, Reno, NV 89502, emp_107),
  `loc_3` "03: Columbus" (Columbus East Warehouse, 2800 Fisher Rd, Columbus, OH 43204, emp_101).
- `departments`: `dept_1` Sales, `dept_2` Operations, `dept_3` Purchasing, `dept_4` Finance, `dept_5` Administration. `{id,internalId,name,inactive}`
- `classes` (product line): `cls_1` Fluid Handling, `cls_2` Power Transmission, `cls_3` Fasteners & Hardware, `cls_4` Safety & PPE, `cls_5` Electrical, `cls_6` Material Handling, `cls_7` Services. Fields are `{id,internalId,name,inactive}`.
- `terms`: `{id, name, days, discountPercent, discountDays}` — `term_due` Due on receipt (0), `term_n15` Net 15, `term_n30` Net 30, `term_n45` Net 45, `term_n60` Net 60, `term_1n30` 1% 10 Net 30, `term_2n30` 2% 10 Net 30.
- `shipMethods`: `ship_upsg` UPS Ground, `ship_ups2` UPS 2nd Day Air, `ship_fdxg` FedEx Ground, `ship_ltl` FedEx Freight LTL, `ship_truck` Company Truck, `ship_will` Customer Pickup (Will Call). `{id,name,inactive}`
- `paymentMethods`: `{id,name}` for `pm_ach` ACH, `pm_check` Check, `pm_wire` Wire, `pm_visa` VISA, `pm_mc` Master Card, `pm_amex` American Express.
- `taxItems`: `{id, name, rate, state}` — `tax_or` "OR - No Sales Tax" 0, `tax_wa` "WA State Sales Tax" 8.9, `tax_id` "ID State Sales Tax" 6.0, `tax_nv` "NV Washoe County" 8.265, `tax_ca` "CA Sacramento County" 8.75, `tax_oh` "OH Franklin County" 7.5, `tax_exempt` "Exempt - Resale/Gov" 0.
- `accounts` (`{id, internalId, number, name, type, inactive}`; display `"1200 Inventory Asset"`):
  1000 Operating Checking (Bank) · 1010 Payroll Checking (Bank) · 1050 Undeposited Funds (Other Current Asset) ·
  1100 Accounts Receivable (Accounts Receivable) · 1200 Inventory Asset (Other Current Asset) · 1300 Prepaid Expenses (Other Current Asset) ·
  1500 Warehouse Equipment (Fixed Asset) · 2000 Accounts Payable (Accounts Payable) · 2100 Inventory Received Not Billed (Other Current Liability) ·
  2200 Sales Tax Payable (Other Current Liability) · 2300 Accrued Liabilities (Other Current Liability) · 3000 Retained Earnings (Equity) ·
  3100 Common Stock (Equity) · 4000 Sales – Products (Income) · 4100 Sales – Services (Income) · 4200 Freight & Handling Income (Income) ·
  4900 Sales Discounts (Income) · 5000 Cost of Goods Sold (Cost of Goods Sold) · 5100 Freight In (Cost of Goods Sold) ·
  5200 Inventory Shrinkage (Cost of Goods Sold) · 5210 Damaged Goods Write-off (Cost of Goods Sold) · 5220 Cycle Count Variance (Cost of Goods Sold) ·
  6000 Salaries & Wages (Expense) · 6100 Rent Expense (Expense) · 6300 Shop Supplies (Expense) · 6400 Freight Out (Expense) · 6500 Equipment Rental (Expense) · 6600 Office Supplies (Expense).
  ids: `acct_<number>` (e.g. `acct_1200`).
- `shortcuts` (seed 6): `{id, label, path, createdById?, createdAt?}` — "Enter Sales Orders" `/app/accounting/transactions/salesord`, "Fulfill Orders"
  `/app/accounting/transactions/itemshipmanager`, "Receive Orders" `/app/accounting/transactions/receiveorders`,
  "Adjust Inventory" `/app/accounting/transactions/invadjst`, "Open Invoices" `/app/accounting/transactions/transactionlist?Transaction_TYPE=CustInvc&status=Open`,
  "Current Inventory Status" `/app/reporting/reportrunner?reporttype=INVSTATUS`.

---

## §3 Entities

### 3.1 `customers`
```js
{ id:'cust_1001', internalId:1001, entityId:'C1001', companyName:'Pacific Rim Fabrication', isPerson:false,
  status:'CUSTOMER-Closed Won', category:'Manufacturer', salesRepId:'emp_102',
  email:'ap@pacificrimfab.com', phone:'(503) 555-0187', fax:'', url:'',
  termsId:'term_n30', creditLimit:50000, creditHold:'Auto',   // 'Auto' | 'On' | 'Off'
  taxable:true, taxItemId:'tax_or', defaultLocationId:'loc_1', shipMethodId:'ship_truck', priceLevel:'Base Price',
  billAddress:{ addressee:'Pacific Rim Fabrication', attention:'Accounts Payable', addr1:'8800 N Columbia Blvd', addr2:'', city:'Portland', state:'OR', zip:'97203', country:'United States' },
  shipAddress:{ …same shape… },
  primaryContact:'Dana Whitfield', comments:'', inactive:false, dateCreated:'2021-03-15',
  createdAt, createdById, lastModifiedAt, lastModifiedById }
```
Derived (never stored): `balance` = Σ open invoice `amountRemaining`; `overdueBalance` = Σ amountRemaining of invoices with
`dueDate < today`; `unbilledOrders` = Σ over open SOs of (unbilled qty × rate) + unbilled tax/shipping; `daysOverdue` = max days past due;
`unappliedPayments` = Σ payment `unapplied`.

### 3.2 `vendors`
```js
{ id:'vend_2001', internalId:2001, entityId:'V2001', companyName:'Northwind Pump Manufacturing', legalName:'Northwind Pump Manufacturing LLC',
  category:'Manufacturer', email:'orders@northwindpump.com', phone:'(316) 555-0110', accountNumber:'CIS-44102',
  termsId:'term_n30', taxId:'48-1120934', is1099Eligible:false, currency:'USD', creditLimit:null,
  address:{ addr1:'2200 E Pawnee St', city:'Wichita', state:'KS', zip:'67211', country:'United States' },
  primaryContact:'Lisa Moreno', defaultExpenseAccountId:null, comments:'', inactive:false, dateCreated:'2019-08-02',
  createdAt, createdById, lastModifiedAt, lastModifiedById, fax?, url? }
```
Derived: `balance` = Σ open bill `amountRemaining`; `openPOAmount`.

Vendor seed IDs use `vend_<number>`.

### 3.3 `items`
```js
{ id:'item_pmp1050', internalId:101, itemId:'PMP-1050', displayName:'1/2 HP Cast Iron Centrifugal Pump',
  type:'inventoryItem',            // 'inventoryItem' | 'nonInventoryItem' | 'serviceItem'
  subtype:null,                    // non-inventory & service: 'Sale' | 'Purchase' | 'Resale'
  classId:'cls_1', departmentId:null, upcCode:'0841237105017', manufacturer:'Northwind', mpn:'NW-CI050',
  unitsType:'Each', stockUnit:'Ea', saleUnit:'Ea', purchaseUnit:'Ea',
  salesDescription:'1/2 HP cast iron centrifugal pump, 115/230V, 1" NPT', purchaseDescription:'NW-CI050 centrifugal pump 1/2HP',
  basePrice:389.00,                // sales price (Base Price level)
  purchasePrice:232.00,            // standard purchase cost (default PO rate)
  averageCost:232.00,              // moving average (updated by item receipts) — inventory items only
  lastPurchasePrice:232.00,
  costingMethod:'Average',
  preferredVendorId:'vend_2001',
  vendors:[{ vendorId:'vend_2001', vendorCode:'NW-CI050', purchasePrice:232.00, preferred:true }],
  incomeAccountId:'acct_4000', cogsAccountId:'acct_5000', assetAccountId:'acct_1200', expenseAccountId:null,
  taxable:true, weight:38, weightUnit:'lb',
  locations:[ { locationId:'loc_1', onHand:24, reorderPoint:8, preferredStockLevel:16, bin:'A-01-03' },
              { locationId:'loc_2', onHand:10, reorderPoint:4, preferredStockLevel:8,  bin:'R-02-01' },
              { locationId:'loc_3', onHand:8,  reorderPoint:4, preferredStockLevel:8,  bin:'C-01-07' } ],
  inactive:false, createdAt, createdById, lastModifiedAt, lastModifiedById }
```
- Only `inventoryItem` has `locations`, `averageCost`, `assetAccountId`. Non-inventory/service have `locations: []`.
- `locations[].onHand` stores stock quantity. The app derives committed, available, backordered and on-order quantities.
- `preferredStockLevel` = 2 × reorderPoint in seed. `bin` = `A-`/`R-`/`C-` + aisle-shelf (any fixed pattern).

The seed has 48 inventory items and 12 non-stock items. Seed inventory IDs use the lowercase SKU without dashes, prefixed with `item_`.

## §4 Transactions

### 4.1 Common header fields (every transaction)
```js
{ id, internalId, type,            // 'salesOrder'|'itemFulfillment'|'invoice'|'customerPayment'|'purchaseOrder'|'itemReceipt'|'vendorBill'|'vendorPayment'|'inventoryAdjustment'|'inventoryTransfer'
  tranId,                          // document number (see counters)
  tranDate:'2026-11-13', postingPeriod:'Nov 2026', status,       // display string, see each type
  memo:'', departmentId:null, classId:null, locationId:'loc_1',
  createdFromId:null, createdFromType:null,                      // parent transaction (e.g. IF → SO)
  createdById:'emp_101', createdAt, lastModifiedById, lastModifiedAt }
```
Common line identity is `{ lineId:'l1', line:1, itemId, units }`. Each transaction shape below specifies its own quantity, source link and pricing fields. Priced lines store `amount = round2(quantity × rate)`.

Type codes (URL `:type` / list `Transaction_TYPE`): salesOrder `salesord`/`SalesOrd` · itemFulfillment `itemship`/`ItemShip` ·
invoice `custinvc`/`CustInvc` · customerPayment `custpymt`/`CustPymt` · purchaseOrder `purchord`/`PurchOrd` · itemReceipt `itemrcpt`/`ItemRcpt` ·
vendorBill `vendbill`/`VendBill` · vendorPayment `vendpymt`/`VendPymt` · inventoryAdjustment `invadjst`/`InvAdjst` · inventoryTransfer `invtrnfr`/`InvTrnfr`.

### 4.2 `salesOrders`
```js
{ …common, type:'salesOrder', customerId:'cust_1038', otherRefNum:'PO-77812',   // customer's PO #
  salesRepId:'emp_104', termsId:'term_n30', shipDate:'2026-11-19', shipMethodId:'ship_upsg',
  shippingCost:0, shipAddress:'Yakima Valley Cold Chain\n1402 W Washington Ave\nYakima, WA 98903',
  billAddress:'…', taxItemId:'tax_wa', taxRate:8.9, discountRate:0,      // discountRate as a percent
  status:'Pending Approval',   // 'Pending Approval'|'Pending Fulfillment'|'Partially Fulfilled'|'Pending Billing/Partially Fulfilled'|'Pending Billing'|'Billed'|'Closed'|'Cancelled'
  lines:[{ lineId:'l1', line:1, itemId:'item_gagth250', description:'Bi-Metal Dial Thermometer 0-250°F', quantity:6, units:'Ea',
           rate:32.60, amount:195.60, taxable:true, locationId:'loc_1',
           quantityFulfilled:0, quantityBilled:0, isClosed:false }],
  subtotal, discountTotal, taxTotal, total,
  approvedById:null, approvedAt:null, closedAt:null, cancelledAt:null }
```

### 4.3 `itemFulfillments`
```js
{ …common, type:'itemFulfillment', customerId, createdFromId:'so_10433', createdFromType:'salesOrder',
  status:'Shipped',            // 'Picked' | 'Packed' | 'Shipped'
  shipMethodId, shipAddress, trackingNumbers:'1Z999AA10123456784', shippedAt:'2026-11-03T22:10:00.000Z',
  lines:[{ lineId, line, orderLineId:'l1', itemId, description, locationId:'loc_1', quantity:2, units:'Ea' }] }
```
Inventory is decremented when the fulfillment is **saved** (any status) — documented simplification.

### 4.4 `invoices`
```js
{ …common, type:'invoice', customerId, createdFromId:'so_10424'|null, createdFromType:'salesOrder'|null,
  otherRefNum, salesRepId, termsId, dueDate:'2026-10-12', shipDate, shipMethodId, shippingCost, billAddress,
  taxItemId, taxRate, discountRate:0,
  status:'Open',               // 'Open' | 'Paid In Full' | 'Voided'
  lines:[{ lineId, line, orderLineId:'l1'|null, itemId, description, quantity, units, rate, amount, taxable }],
  subtotal, discountTotal, taxTotal, total, amountPaid, amountRemaining,
  voidedAt:null, voidedById:null, lastEmailedAt:null, toBeEmailed:false, toBePrinted:false }
```

### 4.5 `customerPayments`
```js
{ …common, type:'customerPayment', customerId, payment:4250.00,      // payment amount
  paymentMethodId:'pm_ach', checkNum:'', undepFunds:true, accountId:'acct_1050', arAccountId:'acct_1100',
  status:'Not Deposited',      // 'Not Deposited' (undepFunds) | 'Deposited' (posted to a bank account)
  applied:[{ invoiceId:'inv_20888', amount:1000.00, discount:0 }],
  appliedTotal:1000.00, unapplied:3250.00 }
```

### 4.6 `purchaseOrders`
```js
{ …common, type:'purchaseOrder', vendorId:'vend_2001', employeeId:'emp_105', supervisorApproval:true,
  otherRefNum:'',              // vendor's order #
  dueDate:'2026-11-20',        // "Receive By"
  termsId, shipToLocationId:'loc_2', shipMethodId:null,
  status:'Pending Receipt',    // 'Pending Supervisor Approval'|'Rejected by Supervisor'|'Pending Receipt'|'Partially Received'|'Pending Billing/Partially Received'|'Pending Bill'|'Fully Billed'|'Closed'
  lines:[{ lineId, line, itemId, vendorCode:'NW-CS300', description, quantity, units, rate, amount,
           expectedReceiptDate:'2026-11-20', quantityReceived:0, quantityBilled:0, isClosed:false }],
  subtotal, taxTotal:0, total,
  approvedById, approvedAt, rejectedById, rejectedAt, rejectionReason:'', closedAt }
```

### 4.7 `itemReceipts`
```js
{ …common, type:'itemReceipt', vendorId, createdFromId:'po_4520', createdFromType:'purchaseOrder', status:'Received',
  lines:[{ lineId, line, orderLineId:'l1', itemId, description, locationId:'loc_2', quantity:3, units, rate:1120.00, amount }],
  total }
```

### 4.8 `vendorBills`
```js
{ …common, type:'vendorBill', transactionNumber:'BILL1117', tranId:'NPM-55821',   // tranId = vendor invoice "Reference No."
  vendorId, createdFromId:'po_4511'|null, createdFromType, termsId, dueDate, apAccountId:'acct_2000',
  status:'Open',               // 'Open' | 'Paid In Full' | 'Pending Approval' (unused in seed)
  lines:[{ lineId, line, orderLineId, itemId, description, quantity, units, rate, amount }],      // Items subtab
  expenses:[{ lineId, accountId:'acct_6400', amount:420.00, memo:'Outbound LTL Oct' }],            // Expenses subtab
  total, amountPaid, amountRemaining }
```

### 4.9 `vendorPayments`
`{ …common, type:'vendorPayment', tranId:'VP1201', vendorId, accountId:'acct_1000', paymentMethodId:'pm_ach', checkNum, total, applied:[{billId, amount}] , status:'Cleared' }`

### 4.10 `inventoryAdjustments`
```js
{ …common, type:'inventoryAdjustment', status:'Posted', accountId:'acct_5220', adjustmentLocationId:'loc_1', customerId:null,
  lines:[{ lineId, line, itemId, locationId:'loc_1', units:'Ea', quantityOnHandBefore:420, adjustQtyBy:-4,
           newQuantity:416, unitCost:5.85, memo:'' }],
  estimatedTotalValue:-23.40 }      // Σ adjustQtyBy × unitCost
```

### 4.11 `inventoryTransfers`
```js
{ …common, type:'inventoryTransfer', status:'Posted', fromLocationId:'loc_1', toLocationId:'loc_2',
  lines:[{ lineId, line, itemId, description, units, quantityOnHandFrom:260, quantity:50 }] }
```

### 4.12 `systemNotes` (audit trail — System Information subtab)
```js
{ id:'sn_…', recordType:'salesOrder', recordId:'so_10458', date:'2026-11-17T17:22:05.000Z',
  createdAt:'2026-11-17T17:22:05.000Z', setById:'emp_101',
  context:'UI', type:'Create',      // 'Create'|'Edit'|'Change'|'Approve'|'Reject'|'Close'|'Cancel'|'Void'|'Delete'|'Status'
  field:'Status', oldValue:'Pending Approval', newValue:'Pending Fulfillment' }
```
A record creation appends a `Create` note. A child transaction that changes its parent's line quantities or status appends a `Status` note for the parent. Item edits append a `Change` note per changed field. Customer and vendor edits append one `Edit` note per save.
The seed contains `Create` notes and status history.

### 4.13 `userNotes` (P2) `{ id, recordType, recordId, title, memo, noteType:'Note'|'Phone Call'|'E-mail', direction:'Incoming'|'Outgoing', authorId, createdAt }`
### 4.14 `tasks` (P2) `{ id, internalId, title, assignedToId, priority:'High'|'Medium'|'Low', status:'Not Started'|'In Progress'|'Completed', startDate, dueDate, companyId, transactionId, message, createdById, createdAt, lastModifiedById?, lastModifiedAt? }`.

---

## Minimal Inject Example

Inject this state into a fresh SID to clear the sales order and invoice lists while retaining the default references.

```json
{
  "salesOrders": [],
  "invoices": [],
  "company": { "name": "Cascade Industrial Supply" }
}
```

## Observable State Changes (for LLM evaluation)

All transaction and master record creations include the relevant common header, `createdById` and ISO `createdAt`,
advance `counters.nextInternalId` and any named document or entity counter, and append `systemNotes`. Every
edit or lifecycle action has the audit footprint in the table below. Parent rollups update that parent's `lastModifiedById` and
`lastModifiedAt` when its line quantities or status change. Parent notes identify the affected parent and record the status transition when it changes.
Document and internal counters advance past the number allocated. The next allocation skips any collisions. Blank optional
fields can be null, empty strings, or absent in an injected world.

| # | User action (UI path) | Records written / fields changed |
|---|---|---|
| W1.1 | Create sales order (Transactions › Sales › Enter Sales Orders › Save) | `salesOrders[+]` with the §4.2 shape, including `lines[].{lineId,locationId,itemId,quantity,rate,amount,quantityFulfilled,quantityBilled,isClosed}`. Selecting Pending Fulfillment at creation sets approval metadata and derives the operational status from the lines. Advances `counters.salesOrder` and `counters.nextInternalId`. Appends a Create note. |
| W1.2 | Edit sales order (Edit › Save) | Updates editable fields, totals, `lastModifiedAt` and `lastModifiedById`. A line with fulfilled or billed quantity keeps its item and warehouse and cannot be removed or reduced below either quantity. Appends an Edit note. |
| W1.3 | Approve SO (view **Approve** or Approve Sales Orders page) | `salesOrders[i].status` Pending Approval→Pending Fulfillment (or Pending Billing for service-only), `approvedById`, `approvedAt`; `systemNotes[+]` Approve |
| W1.4 | Cancel order (Pending Approval only) | `status:'Cancelled'`, `cancelledAt`; all lines `isClosed:true`; note |
| W1.5 | Close order | open lines `isClosed:true`; `status:'Closed'`, `closedAt`; note. Releases committed stock (derived) |
| W1.6 | Fulfill (SO **Fulfill** → Item Fulfillment › Save; or Fulfill Orders page) | `itemFulfillments[+]` {tranId `IF<n>`, createdFromId=SO id, customerId, status, lines[{orderLineId, itemId, locationId, quantity}]}; `items[k].locations[loc].onHand` −= qty; `salesOrders[i].lines[j].quantityFulfilled` += qty; SO `status` re-derived; `counters.itemFulfillment`+1; notes on IF (Create) and SO (Status) |
| W1.7 | Mark Packed / Mark Shipped on IF | `itemFulfillments[i].status`, `shippedAt` (Shipped); note |
| W1.8 | Delete SO (no children) | removed from `salesOrders`; note Delete |
| W2.1 | Create PO (Enter Purchase Orders › Save) | `purchaseOrders[+]` {tranId `PO<n>`, vendorId, employeeId, tranDate, dueDate, shipToLocationId, supervisorApproval, status ('Pending Receipt' if supervisorApproval else 'Pending Supervisor Approval'), lines[{itemId, quantity, rate, amount, expectedReceiptDate, quantityReceived:0, quantityBilled:0}], total}; counters; note |
| W2.2 | Approve / Reject PO (view buttons or Approve Purchase Orders page) | Approve writes `status:'Pending Receipt'`, `supervisorApproval:true`, `approvedById`, `approvedAt`. Reject writes `status:'Rejected by Supervisor'`, `supervisorApproval:false`, `rejectedById`, `rejectedAt`, `rejectionReason`. Both append a note. |
| W2.3 | Receive (PO **Receive** → Item Receipt › Save; Receive Orders page) | `itemReceipts[+]` {tranId `IR<n>`, createdFromId=PO id, vendorId, lines[{orderLineId, itemId, locationId, quantity, rate, amount}], total}; on inventory lines, `items[k].locations[loc].onHand` += qty, `items[k].averageCost` = round4((oldTotalOnHand×oldAvg + qty×rate)/(oldTotalOnHand+qty)) for a positive opening total (use receipt rate if opening total is nonpositive), `items[k].lastPurchasePrice` = rate; every received line increments `purchaseOrders[i].lines[j].quantityReceived`; PO status re-derived; notes |
| W2.4 | Bill PO (PO **Bill** → Vendor Bill › Save) | `vendorBills[+]` {transactionNumber `BILL<n>`, tranId (vendor ref, required), vendorId, createdFromId, lines[{orderLineId, itemId, quantity, rate, amount}], total, amountRemaining=total, status 'Open' when the total is positive, dueDate}; PO lines `quantityBilled` += qty; PO status re-derived; notes |
| W2.5 | Close PO | open lines `isClosed:true`; `status:'Closed'`, `closedAt`; note |
| W2.6 | Edit / Delete PO | Edit updates the allowed header/line fields, recomputes totals and status, and sets `lastModifiedAt` and `lastModifiedById`. Keep line IDs for linked quantities and prevent reducing ordered quantity below received or billed. Delete removes the PO if it has no receipts/bills. Both append an audit note. |
| W3.1 | Adjust Inventory (Transactions › Inventory › Adjust Inventory › Save) | `inventoryAdjustments[+]` {tranId `ADJ<n>`, accountId, adjustmentLocationId, tranDate, memo, lines[{itemId, locationId, quantityOnHandBefore, adjustQtyBy, newQuantity, unitCost}], estimatedTotalValue}; `items[k].locations[loc].onHand` = newQuantity; counters; note |
| W3.2 | Transfer Inventory (Save) | `inventoryTransfers[+]` {tranId `TRF<n>`, fromLocationId, toLocationId, lines[{itemId, quantityOnHandFrom, quantity}]}; onHand −qty at from, +qty at to; note |
| W3.3 | Create inventory item (Lists › Accounting › Items › New › Inventory Item › Save) | `items[+]` {itemId (unique, required), displayName, type:'inventoryItem', basePrice, purchasePrice, averageCost=purchasePrice, preferredVendorId, classId, units, accounts, locations[{locationId, onHand (initial, optional), reorderPoint, preferredStockLevel}]}; note |
| W3.4 | Edit item (incl. Locations reorder point / preferred stock, prices, inactive) | `items[k]` editable fields, `lastModifiedAt`, `lastModifiedById`, and a `Change` note per changed field. Saving an identical normalized item currently refreshes its modification metadata without a note. |
| W3.5 | Order Items (P2) | creates `purchaseOrders[+]` per vendor (as W2.1) for selected items |
| W4.1 | Bill SO (SO **Bill** → Invoice › Save; Bill Sales Orders page) | `invoices[+]` {tranId `INV<n>`, createdFromId=SO id, customerId, tranDate, dueDate, termsId, lines[{orderLineId, itemId, quantity, rate, amount, taxable}], subtotal, taxTotal, shippingCost, total, amountPaid:0, amountRemaining=total, status 'Open' for a positive balance}; SO lines `quantityBilled` += qty; SO status re-derived; notes |
| W4.2 | Create standalone invoice (Transactions › Sales › Create Invoices › Save) | `invoices[+]` as W4.1 with `createdFromId:null` |
| W4.3 | Accept payment (Invoice **Accept Payment** or Transactions › Customers › Accept Customer Payments › Save) | `customerPayments[+]` {tranId `PYMT<n>`, customerId, payment, paymentMethodId, checkNum, undepFunds, accountId, applied[{invoiceId, amount}], appliedTotal, unapplied, status}; each applied `invoices[i].amountPaid` += amount, `amountRemaining`, `status` ('Paid In Full' when 0); notes |
| W4.4 | Void an open unpaid invoice (Actions › Void) | `invoices[i]` {status:'Voided', amountRemaining:0, voidedAt, voidedById}. For a linked invoice, subtracts invoiced quantities from the source SO lines' `quantityBilled` and re-derives SO status. Appends audit notes. |
| W4.5 | Edit invoice (Open, no payments) | changed fields/lines, totals, `amountRemaining`; SO `quantityBilled` adjusted by delta; note |
| E.1 | Create/edit customer | `customers[+/i]` (entityId `C<n>` on create), note(s) |
| E.2 | Create/edit vendor | `vendors[+/i]` (entityId `V<n>`), note(s) |
| P2 | Pay Bills | `vendorPayments[+]` with `vendorId, total, paymentMethodId, accountId, applied[].{billId,amount}`, document and internal counters, affected `vendorBills[i].{amountPaid,amountRemaining,status,lastModifiedAt,lastModifiedById}`, and `systemNotes[+]` |
| P2 | Add/remove shortcut | `shortcuts[+/-]` and `systemNotes[+]` |
| P2 | Set Preferences | Changed `preferences.*` values and one `systemNotes[+]` per changed setting |
| P2 | Add note / task | `userNotes[+]` or `tasks[+/i]`, `counters.nextInternalId` on task creation, and `systemNotes[+]` |

Viewing pages, sorting, filtering, opening menus, searching **never** write state.

---
