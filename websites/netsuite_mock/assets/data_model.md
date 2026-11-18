# NetSuite Mock — Data Model

> Single source for state shape, business rules, seed contents, and the observable state-change table.
> `SCHEMA.md` (written by dev at the app root) must be kept in sync with §1–§4 and §7 of this file.
> APP key for `loadState/saveState`: **`'netsuite'`**. All state is plain JSON (no Dates/Maps/functions).

Conventions
- **IDs**: use fixed prefixed strings in seed (`cust_1001`, `item_pmp1050`, `so_10458`). New transactions and master records
  use `${prefix}_${Date.now().toString(36)}${counter}` and carry a numeric `internalId` taken from `counters.nextInternalId`.
  Skip occupied IDs and numbers in the injected world. Advance counters only within the successful business commit.
- **Dates**: business dates are `'YYYY-MM-DD'` strings (`tranDate`, `dueDate`, `shipDate`). Audit timestamps are ISO strings from
  `new Date().toISOString()` (`createdAt`, `lastModifiedAt`). Seed uses fixed literals only (no `new Date()` in seed).
- **Money**: numbers rounded to 2 decimals (`round2`). Quantities: numbers. Rates: numbers (up to 4 decimals for costs).
- **Actor**: `createdById` / `setById` = `state.currentUser.employeeId` (`emp_101`, Jordan Ellis). Include `createdById` and
  `createdAt` on newly created customers, vendors and items as well as transactions. Set `lastModifiedById` and
  `lastModifiedAt` on edited master records and transactions.
- **postingPeriod**: `'Nov 2026'` style string derived from `tranDate` at save time.
- All reducers must tolerate missing arrays/fields (`state.salesOrders || []`, `line.quantityFulfilled || 0`).

### Account behavior

- Advanced Shipping and Advanced Receiving are enabled. Inventory items bill after fulfillment on sales orders and after receipt on POs.
  Sales service and non-inventory quantities become billable on approval. Receiving a non-stock line advances the PO line counters.
- Fulfillment consumes on-hand once, on first save. Later packing or shipping changes fulfillment metadata. Standalone invoices
  principally cover services and non-stock items. In this workspace invoicing is a receivables action, and on-hand moves through
  fulfillment, receiving, inventory adjustment and stock transfer.
- Validate each linked quantity against the current source line, and validate cumulative movement for repeated stock lines per
  item and location. If a valid receipt or transfer adds stock at a location missing from an injected item, create the location row
  with zero opening stock and nullable reorder settings before applying the change.
- For partial and multi-invoice cases, preserve original source line IDs. An unpaid converted invoice edit may change quantities on
  eligible source lines, subject to the billable amount calculated with the invoice's prior quantity added back. Void keeps stored
  lines and totals for history, clears the outstanding balance and reverses only the linked order's billed quantities.
- Reject preserves `supervisorApproval:false`; approve sets it to true. Explicitly closed or cancelled orders remain terminal if
  a linked invoice is voided. Preserve completed quantities and history when closing lines.

---

## §1 Top-level keys

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
| `vendorPayments` | array | §4.9 (seeded; Pay Bills UI is P2) |
| `inventoryAdjustments` | array | §4.10 |
| `inventoryTransfers` | array | §4.11 |
| `systemNotes` | array | §4.12 audit trail (one+ per user action) |
| `userNotes` | array | §4.13 (P2 Communication subtab) |
| `shortcuts` | array | §2.6 nav Shortcuts (star menu) |
| `tasks` | array | P2 Activities > Tasks |

Not in state (UI-only, localStorage under a separate key `netsuite:ui:<sid>`): Recent Records list, collapsed
sections, list page size. These must never call `saveState`.

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
Shape: `{ id, internalId, entityId:'E101', name, firstName, lastName, title, departmentId, email, phone, supervisorId, isSalesRep, isBuyer, inactive:false }` (emails at `@cascadeindustrial.com`).

### 2.6 Other reference lists
- `locations`:
  `{ id:'loc_1', internalId:1, name:'01: Portland', fullName:'Portland Main Warehouse', address:'4120 NW Yeon Ave, Portland, OR 97210', managerId:'emp_106', inactive:false, makeInventoryAvailable:true }`,
  `loc_2` "02: Reno" (Reno Distribution Center, 1355 Capital Blvd, Reno, NV 89502, emp_107),
  `loc_3` "03: Columbus" (Columbus East Warehouse, 2800 Fisher Rd, Columbus, OH 43204, emp_101).
- `departments`: `dept_1` Sales, `dept_2` Operations, `dept_3` Purchasing, `dept_4` Finance, `dept_5` Administration. `{id,internalId,name,inactive}`
- `classes` (product line): `cls_1` Fluid Handling, `cls_2` Power Transmission, `cls_3` Fasteners & Hardware, `cls_4` Safety & PPE, `cls_5` Electrical, `cls_6` Material Handling, `cls_7` Services.
- `terms`: `{id, name, days, discountPercent, discountDays}` — `term_due` Due on receipt (0), `term_n15` Net 15, `term_n30` Net 30, `term_n45` Net 45, `term_n60` Net 60, `term_1n30` 1% 10 Net 30, `term_2n30` 2% 10 Net 30.
- `shipMethods`: `ship_upsg` UPS Ground, `ship_ups2` UPS 2nd Day Air, `ship_fdxg` FedEx Ground, `ship_ltl` FedEx Freight LTL, `ship_truck` Company Truck, `ship_will` Customer Pickup (Will Call). `{id,name,inactive}`
- `paymentMethods`: `pm_ach` ACH, `pm_check` Check, `pm_wire` Wire, `pm_visa` VISA, `pm_mc` Master Card, `pm_amex` American Express.
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
- `shortcuts` (seed 6): `{id, label, path}` — "Enter Sales Orders" `/app/accounting/transactions/salesord`, "Fulfill Orders"
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
  primaryContact:'Dana Whitfield', comments:'', inactive:false, dateCreated:'2021-03-15', lastModifiedAt:'2026-06-01T16:00:00.000Z' }
```
Derived (never stored): `balance` = Σ open invoice `amountRemaining`; `overdueBalance` = Σ amountRemaining of invoices with
`dueDate < today`; `unbilledOrders` = Σ over open SOs of (unbilled qty × rate) + unbilled tax/shipping; `daysOverdue` = max days past due;
`unappliedPayments` = Σ payment `unapplied`.

Seed (40). Address = plausible street in city. Default location by state: OR/WA/ID → loc_1, NV/CA → loc_2, OH → loc_3. Tax item by state
(`tax_or`, `tax_wa`, `tax_id`, `tax_nv`, `tax_ca`, `tax_oh`) unless marked *exempt* (→ `tax_exempt`, `taxable:false`).

| entityId | companyName | city, state | terms | rep | credit limit | category | notes |
|---|---|---|---|---|---|---|---|
| C1001 | Pacific Rim Fabrication | Portland, OR | Net 30 | Priya | 50,000 | Manufacturer | |
| C1002 | Columbia River Paper Mill | Longview, WA | Net 45 | Priya | 60,000 | Pulp & Paper | |
| C1003 | Blue Mountain Brewing Co. | Pendleton, OR | Net 15 | Marcus | 15,000 | Food & Beverage | |
| C1004 | Cascade Timber Products | Bend, OR | Net 30 | Marcus | 40,000 | Forest Products | |
| C1005 | Willamette Valley Foods | Salem, OR | Net 30 | Priya | 35,000 | Food & Beverage | |
| C1006 | Tacoma Shipyard Services | Tacoma, WA | Net 45 | Elena | 60,000 | Marine | |
| C1007 | Spokane Precision Machining | Spokane, WA | Net 30 | Elena | 25,000 | Manufacturer | |
| C1008 | Boise Ag Equipment | Boise, ID | Net 30 | Marcus | 30,000 | Agriculture | |
| C1009 | Reno Mining Supply | Reno, NV | Net 30 | Elena | 20,000 | Distributor | *exempt* (resale). Near credit limit: SO10452 pushes it over |
| C1010 | Sierra Nevada Water District | Carson City, NV | Net 45 | Elena | 75,000 | Municipal | *exempt* |
| C1011 | Sacramento Valley Bottling | Sacramento, CA | Net 30 | Priya | 30,000 | Food & Beverage | |
| C1012 | Bay Area Biotech Facilities | South San Francisco, CA | 2% 10 Net 30 | Priya | 45,000 | Life Sciences | |
| C1013 | Central Ohio Plastics | Columbus, OH | Net 30 | Marcus | 40,000 | Manufacturer | |
| C1014 | Buckeye Metal Stamping | Marion, OH | Net 30 | Marcus | 30,000 | Manufacturer | |
| C1015 | Great Lakes Food Processing | Toledo, OH | Net 45 | Marcus | 50,000 | Food & Beverage | |
| C1016 | Dayton Aerospace Components | Dayton, OH | Net 30 | Elena | 60,000 | Aerospace | |
| C1017 | Kettle Falls Sawmill | Kettle Falls, WA | Net 30 | Priya | 20,000 | Forest Products | |
| C1018 | Rainier Cold Storage | Kent, WA | Net 30 | Priya | 25,000 | Logistics | |
| C1019 | Olympic Seafoods | Port Angeles, WA | Net 15 | Elena | 15,000 | Food & Beverage | |
| C1020 | Puget Sound Transit Maintenance | Seattle, WA | Net 45 | Elena | 80,000 | Municipal | *exempt* |
| C1021 | City of Bend Public Works | Bend, OR | Net 45 | Marcus | 50,000 | Municipal | *exempt* |
| C1022 | Klamath Basin Irrigation District | Klamath Falls, OR | Net 30 | Marcus | 25,000 | Agriculture | |
| C1023 | Treasure Valley Dairy | Nampa, ID | Net 30 | Marcus | 20,000 | Agriculture | |
| C1024 | Carson City Fabricators | Carson City, NV | Net 30 | Elena | 15,000 | Manufacturer | |
| C1025 | Elko Gold Processing | Elko, NV | Net 30 | Elena | 40,000 | Mining | `creditHold:'On'` (new SOs blocked) |
| C1026 | Lake Tahoe Resorts Facilities | South Lake Tahoe, CA | Net 30 | Priya | 20,000 | Hospitality | |
| C1027 | Fresno Packing House | Fresno, CA | Net 30 | Priya | 25,000 | Agriculture | |
| C1028 | Port of Stockton Maintenance | Stockton, CA | Net 45 | Priya | 50,000 | Municipal | *exempt* |
| C1029 | Toledo Glass Works | Toledo, OH | Net 30 | Marcus | 35,000 | Manufacturer | |
| C1030 | Akron Rubber Molding | Akron, OH | 1% 10 Net 30 | Marcus | 30,000 | Manufacturer | no transactions |
| C1031 | Cincinnati Chemical Blending | Cincinnati, OH | Net 30 | Elena | 45,000 | Chemicals | |
| C1032 | Mansfield Tool & Die | Mansfield, OH | Net 30 | Marcus | 15,000 | Manufacturer | |
| C1033 | Gresham Concrete Products | Gresham, OR | Net 30 | Priya | 20,000 | Construction | |
| C1034 | Hillsboro Semiconductor Facility Services | Hillsboro, OR | Net 45 | Priya | 100,000 | High Tech | |
| C1035 | Salem Health Facilities | Salem, OR | Net 30 | Priya | 30,000 | Healthcare | |
| C1036 | Eugene Craft Distillery | Eugene, OR | Due on receipt | Marcus | 5,000 | Food & Beverage | has overdue invoice |
| C1037 | Medford Orchard Cooperative | Medford, OR | Net 30 | Marcus | 15,000 | Agriculture | no transactions |
| C1038 | Yakima Valley Cold Chain | Yakima, WA | Net 30 | Elena | 25,000 | Logistics | |
| C1039 | Vancouver Marine Repair | Vancouver, WA | Net 30 | Elena | 20,000 | Marine | no transactions |
| C1040 | Coeur d'Alene Mill Works | Coeur d'Alene, ID | Net 30 | Marcus | 10,000 | Forest Products | `inactive:true` |
ids `cust_<number>` (e.g. `cust_1009`). Rep: Priya=emp_102, Marcus=emp_103, Elena=emp_104.

### 3.2 `vendors`
```js
{ id:'vend_2001', internalId:2001, entityId:'V2001', companyName:'Northwind Pump Manufacturing', legalName:'Northwind Pump Manufacturing LLC',
  category:'Manufacturer', email:'orders@northwindpump.com', phone:'(316) 555-0110', accountNumber:'CIS-44102',
  termsId:'term_n30', taxId:'48-1120934', is1099Eligible:false, currency:'USD', creditLimit:null,
  address:{ addr1:'2200 E Pawnee St', city:'Wichita', state:'KS', zip:'67211', country:'United States' },
  primaryContact:'Lisa Moreno', defaultExpenseAccountId:null, comments:'', inactive:false, dateCreated:'2019-08-02', lastModifiedAt:'…' }
```
Derived: `balance` = Σ open bill `amountRemaining`; `openPOAmount`.

| entityId | companyName | city, state | terms | category | notes |
|---|---|---|---|---|---|
| V2001 | Northwind Pump Manufacturing | Wichita, KS | Net 30 | Manufacturer | pumps |
| V2002 | Apex Valve & Fitting Co. | Houston, TX | Net 30 | Manufacturer | valves, fittings |
| V2003 | Midwest Bearing Supply | Indianapolis, IN | Net 45 | Distributor | bearings |
| V2004 | Summit Power Transmission | Milwaukee, WI | 2% 10 Net 30 | Distributor | belts, couplings, sprockets, chain |
| V2005 | Ironclad Fastener Corp. | Rockford, IL | Net 30 | Manufacturer | fasteners, anchors |
| V2006 | Guardian Safety Products | Charlotte, NC | Net 30 | Manufacturer | PPE |
| V2007 | Brightline Electrical Distributors | Sacramento, CA | Net 30 | Distributor | electrical |
| V2008 | Pioneer Motor & Drive | Cleveland, OH | Net 45 | Manufacturer | VFDs, gear reducers |
| V2009 | Coastal Hose & Hydraulics | Long Beach, CA | Net 30 | Distributor | hose |
| V2010 | Keystone Packaging Supply | Allentown, PA | Net 30 | Supplies | |
| V2011 | Redline Freight Logistics | Portland, OR | Net 15 | Freight | expense bills |
| V2012 | Pacific Steel Fabricators | Tualatin, OR | Net 30 | Subcontractor | custom skids |
| V2013 | Evergreen Office Supply | Beaverton, OR | Net 15 | Supplies | expense bills |
| V2014 | Columbia Industrial Rentals | Vancouver, WA | Net 30 | Services | expense bills |
| V2015 | TrueNorth Calibration Labs | Kent, WA | Net 30 | Subcontractor | |
| V2016 | Delta Industrial Chemicals | Baton Rouge, LA | Net 30 | Manufacturer | hydraulic oil |
| V2017 | Granite State Gaskets | Manchester, NH | Net 30 | Manufacturer | seals, gaskets |
| V2018 | Sierra Conveyor Components | Sparks, NV | Net 30 | Manufacturer | conveyor |
| V2019 | Harborline Imports Ltd. | Oakland, CA | Net 60 | Importer | `inactive:true` |
| V2020 | Precision Gauge Instruments | Tulsa, OK | Net 30 | Manufacturer | gauges |
| V2021 | Western States Forklift Service | Salem, OR | Net 30 | Services | expense bills |
| V2022 | Lakeshore Electric Motors | Grand Rapids, MI | Net 45 | Manufacturer | motors |
ids `vend_<number>`.

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
  inactive:false, createdAt:'2020-02-10T17:00:00.000Z', lastModifiedAt:'2026-06-01T16:00:00.000Z' }
```
- Only `inventoryItem` has `locations`, `averageCost`, `assetAccountId`. Non-inventory/service have `locations: []`.
- **Stored stock = `locations[].onHand` only.** Everything else is derived (§5.1).
- `preferredStockLevel` = 2 × reorderPoint in seed. `bin` = `A-`/`R-`/`C-` + aisle-shelf (any fixed pattern).

Seed: 60 items. Inventory items (48). Columns: on hand per location P/R/C (= loc_1/loc_2/loc_3), reorder point P/R/C.
`id` = `item_` + itemId lowercased without dashes (`item_pmp1050`); internalId 101–160 in table order.
Accounts: income 4000, COGS 5000, asset 1200. All taxable except services (taxable:false).

| # | itemId | displayName | class | unit | basePrice | purchasePrice | pref. vendor | onHand P/R/C | reorder P/R/C |
|---|---|---|---|---|---|---|---|---|---|
| 1 | PMP-1050 | 1/2 HP Cast Iron Centrifugal Pump | Fluid | Ea | 389.00 | 232.00 | V2001 | 24/10/8 | 8/4/4 |
| 2 | PMP-1075 | 3/4 HP Stainless Centrifugal Pump | Fluid | Ea | 612.00 | 371.00 | V2001 | 12/6/3 | 5/3/2 |
| 3 | PMP-2150 | 1.5 HP Self-Priming Transfer Pump | Fluid | Ea | 948.00 | 566.00 | V2001 | 4/2/0 | 4/2/2 |
| 4 | PMP-3300 | 3 HP Close-Coupled End Suction Pump | Fluid | Ea | 1,835.00 | 1,120.00 | V2001 | 2/0/1 | 2/1/1 |
| 5 | VLV-3010 | 1" Brass Full-Port Ball Valve | Fluid | Ea | 38.50 | 19.40 | V2002 | 180/90/75 | 60/30/30 |
| 6 | VLV-3020 | 2" 316 Stainless Ball Valve | Fluid | Ea | 142.00 | 78.25 | V2002 | 46/20/18 | 15/8/8 |
| 7 | VLV-3110 | 3" Cast Iron Gate Valve, Flanged | Fluid | Ea | 486.00 | 291.00 | V2002 | 8/3/2 | 3/2/2 |
| 8 | VLV-3200 | 1/2" Brass Swing Check Valve | Fluid | Ea | 21.75 | 10.90 | V2002 | 240/120/90 | 80/40/40 |
| 9 | FTG-4012 | 1/2" NPT 90° Elbow, Black Iron (Box/25) | Fluid | Box | 31.00 | 15.60 | V2002 | 64/30/22 | 20/10/10 |
| 10 | FTG-4034 | 3/4" NPT Tee, Galvanized (Box/25) | Fluid | Box | 44.00 | 22.10 | V2002 | 38/14/12 | 15/8/8 |
| 11 | HOS-5025 | 1/2" Hydraulic Hose Assembly, 25 ft | Fluid | Ea | 96.00 | 52.80 | V2009 | 52/25/16 | 20/10/8 |
| 12 | HOS-5050 | 1" Suction/Discharge Hose, 50 ft | Fluid | Ea | 218.00 | 124.00 | V2009 | 14/6/0 | 6/3/3 |
| 13 | SEL-5510 | Mechanical Seal Kit, 5/8" Shaft | Fluid | Ea | 64.00 | 31.50 | V2017 | 75/30/28 | 25/10/10 |
| 14 | GSK-5620 | Spiral Wound Gasket 2" 150# (Pk/10) | Fluid | Pk | 58.00 | 27.90 | V2017 | 40/18/15 | 15/6/6 |
| 15 | BRG-6205 | 6205-2RS Deep Groove Ball Bearing | Power Trans. | Ea | 12.40 | 5.85 | V2003 | 420/160/210 | 150/60/60 |
| 16 | BRG-6308 | 6308-ZZ Deep Groove Ball Bearing | Power Trans. | Ea | 28.90 | 13.70 | V2003 | 140/60/55 | 50/20/20 |
| 17 | BRG-UCP207 | UCP207 Pillow Block Bearing, 1-1/4" | Power Trans. | Ea | 46.50 | 23.10 | V2003 | 66/24/30 | 20/10/10 |
| 18 | BRG-22216 | 22216 Spherical Roller Bearing | Power Trans. | Ea | 268.00 | 151.00 | V2003 | 9/2/4 | 4/2/2 |
| 19 | BLT-A42 | A42 Classical V-Belt | Power Trans. | Ea | 14.80 | 6.20 | V2004 | 210/80/95 | 60/30/30 |
| 20 | BLT-B68 | B68 Classical V-Belt | Power Trans. | Ea | 21.60 | 9.40 | V2004 | 130/50/40 | 40/20/20 |
| 21 | BLT-5VX800 | 5VX800 Cogged Wedge Belt | Power Trans. | Ea | 38.20 | 17.90 | V2004 | 60/22/18 | 20/10/10 |
| 22 | CPL-L110 | L110 Jaw Coupling Hub, 1-1/8" Bore | Power Trans. | Ea | 34.90 | 16.20 | V2004 | 85/30/26 | 25/10/10 |
| 23 | CPL-SPD110 | L110 Urethane Spider Insert | Power Trans. | Ea | 11.25 | 4.80 | V2004 | 150/60/48 | 50/20/20 |
| 24 | SPR-40B18 | #40 Roller Chain Sprocket, 18T, 1" Bore | Power Trans. | Ea | 27.40 | 12.85 | V2004 | 72/28/20 | 20/10/10 |
| 25 | CHN-40-10 | #40 Roller Chain, 10 ft Box | Power Trans. | Box | 54.00 | 26.40 | V2004 | 48/20/16 | 15/8/8 |
| 26 | GBX-W20 | Worm Gear Reducer 20:1, 56C Input | Power Trans. | Ea | 476.00 | 288.00 | V2008 | 6/2/3 | 3/2/2 |
| 27 | FST-HB3816 | 3/8-16 x 1-1/2" Hex Bolt Gr 8 (Box/100) | Fasteners | Box | 42.00 | 18.90 | V2005 | 120/45/60 | 40/15/15 |
| 28 | FST-HN3816 | 3/8-16 Hex Nut Gr 8 (Box/100) | Fasteners | Box | 16.80 | 7.10 | V2005 | 150/55/70 | 40/15/15 |
| 29 | FST-FW38 | 3/8" Flat Washer, Zinc (Box/100) | Fasteners | Box | 9.60 | 3.85 | V2005 | 200/80/90 | 50/20/20 |
| 30 | FST-SS1213 | 1/2-13 x 2" SS Hex Cap Screw (Box/50) | Fasteners | Box | 68.00 | 33.40 | V2005 | 30/12/10 | 12/6/6 |
| 31 | ANC-WDG12 | 1/2" x 4-1/4" Wedge Anchor (Box/25) | Fasteners | Box | 39.50 | 18.20 | V2005 | 70/26/0 | 20/10/10 |
| 32 | PPE-GL200 | Cut-Resistant Gloves ANSI A4, Large (Dz) | Safety | Dz | 46.00 | 21.50 | V2006 | 160/70/65 | 50/25/25 |
| 33 | PPE-HH100 | Type I Hard Hat, Ratchet Suspension, White | Safety | Ea | 18.90 | 8.40 | V2006 | 220/90/80 | 60/30/30 |
| 34 | PPE-SG55 | Anti-Fog Safety Glasses, Clear (Box/12) | Safety | Box | 38.40 | 16.80 | V2006 | 95/40/35 | 30/15/15 |
| 35 | PPE-HV3 | ANSI Class 3 Hi-Vis Vest, XL | Safety | Ea | 22.50 | 9.90 | V2006 | 140/60/50 | 40/20/20 |
| 36 | PPE-EP200 | Foam Ear Plugs NRR 32 (Box/200 pr) | Safety | Box | 29.75 | 13.20 | V2006 | 18/10/6 | 25/10/10 |
| 37 | PPE-FA50 | 50-Person Industrial First Aid Kit | Safety | Ea | 89.00 | 44.50 | V2006 | 22/8/7 | 8/4/4 |
| 38 | ELC-MTR5 | 5 HP TEFC Motor, 1800 RPM, 184T | Electrical | Ea | 742.00 | 455.00 | V2022 | 7/3/2 | 3/2/2 |
| 39 | ELC-MTR10 | 10 HP TEFC Motor, 1800 RPM, 215T | Electrical | Ea | 1,298.00 | 812.00 | V2022 | 3/1/0 | 2/1/1 |
| 40 | ELC-VFD3 | 3 HP Variable Frequency Drive, 460V | Electrical | Ea | 865.00 | 529.00 | V2008 | 10/4/4 | 4/2/2 |
| 41 | ELC-CB20 | 20A 1-Pole Circuit Breaker | Electrical | Ea | 14.60 | 6.75 | V2007 | 300/100/120 | 80/40/40 |
| 42 | ELC-WR12 | 12 AWG THHN Copper Wire, 500 ft Spool | Electrical | Spool | 118.00 | 74.00 | V2007 | 34/12/14 | 10/5/5 |
| 43 | ELC-LED150 | 150W LED High Bay Fixture, 5000K | Electrical | Ea | 164.00 | 92.00 | V2007 | 48/20/6 | 15/8/8 |
| 44 | ELC-CTR30 | 30A 3-Pole Contactor, 120V Coil | Electrical | Ea | 72.50 | 38.40 | V2007 | 40/15/12 | 12/6/6 |
| 45 | CNV-RLR19 | 1.9" Galvanized Conveyor Roller, 18" BF | Material Handling | Ea | 26.80 | 12.40 | V2018 | 260/90/0 | 80/30/0 |
| 46 | CNV-BLT24 | 24" PVC Conveyor Belting (per ft) | Material Handling | Ft | 19.40 | 9.10 | V2018 | 600/250/0 | 200/80/0 |
| 47 | GAG-PG100 | 2-1/2" Liquid-Filled Pressure Gauge 0-100 PSI | Fluid | Ea | 24.90 | 11.30 | V2020 | 110/40/35 | 30/15/15 |
| 48 | GAG-TH250 | Bi-Metal Dial Thermometer 0-250°F | Fluid | Ea | 32.60 | 15.10 | V2020 | 45/15/12 | 15/6/6 |

Non-inventory (6) and Services (6):
| # | itemId | displayName | type / subtype | basePrice | purchasePrice | vendor | income acct | taxable |
|---|---|---|---|---|---|---|---|---|
| 49 | NI-FABSKID | Custom Pump Skid Fabrication | nonInventory / Resale | 2,450.00 | 1,610.00 | V2012 | 4000 | yes |
| 50 | NI-SPECORD | Special Order Item | nonInventory / Resale | 0.00 | 0.00 | — | 4000 | yes |
| 51 | NI-CRATE | Export Crating | nonInventory / Sale | 145.00 | — | — | 4200 | yes |
| 52 | NI-SHPSUP | Shop & Packaging Supplies | nonInventory / Purchase | — | 0.00 | V2010 | (expense 6300) | no |
| 53 | NI-HYDOIL | ISO 46 Hydraulic Oil, 5 gal Pail | nonInventory / Resale | 78.00 | 41.00 | V2016 | 4000 | yes |
| 54 | NI-CALCERT | NIST Calibration Certificate | nonInventory / Sale | 35.00 | — | — | 4100 | no |
| 55 | SVC-INSTALL | Field Installation Labor (per hour) | service / Sale | 125.00 | — | — | 4100 | no |
| 56 | SVC-PMPRPR | Pump Rebuild Service | service / Sale | 385.00 | — | — | 4100 | no |
| 57 | SVC-CALIB | Gauge Calibration Service | service / Resale | 48.00 | 22.00 | V2015 | 4100 | no |
| 58 | SVC-TRAIN | Onsite Safety Training (Half Day) | service / Sale | 650.00 | — | — | 4100 | no |
| 59 | SVC-RUSH | Rush Order Handling Fee | service / Sale | 45.00 | — | — | 4200 | no |
| 60 | SVC-DELIV | Local Delivery Charge | service / Sale | 65.00 | — | — | 4200 | no |
(Units for non-inv/services: Ea, except SVC-INSTALL = Hr.)

---

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
Line common: `{ lineId:'l1', line:1, itemId, description, quantity, units, rate, amount }` (`amount = round2(quantity*rate)`).

Type codes (URL `:type` / list `Transaction_TYPE`): salesOrder `salesord`/`SalesOrd` · itemFulfillment `itemship`/`ItemShip` ·
invoice `custinvc`/`CustInvc` · customerPayment `custpymt`/`CustPymt` · purchaseOrder `purchord`/`PurchOrd` · itemReceipt `itemrcpt`/`ItemRcpt` ·
vendorBill `vendbill`/`VendBill` · vendorPayment `vendpymt`/`VendPymt` · inventoryAdjustment `invadjst`/`InvAdjst` · inventoryTransfer `invtrnfr`/`InvTrnfr`.

### 4.2 `salesOrders`
```js
{ …common, type:'salesOrder', customerId:'cust_1038', otherRefNum:'PO-77812',   // customer's PO #
  salesRepId:'emp_104', termsId:'term_n30', shipDate:'2026-11-19', shipMethodId:'ship_upsg',
  shippingCost:0, shipAddress:'Yakima Valley Cold Chain\n1402 W Washington Ave\nYakima, WA 98903',
  billAddress:'…', taxItemId:'tax_wa', taxRate:8.9, discountRate:0,      // discountRate % (P2 UI; keep 0)
  status:'Pending Approval',   // 'Pending Approval'|'Pending Fulfillment'|'Partially Fulfilled'|'Pending Billing/Partially Fulfilled'|'Pending Billing'|'Billed'|'Closed'|'Cancelled'
  lines:[{ lineId:'l1', line:1, itemId:'item_gagth250', description:'Bi-Metal Dial Thermometer 0-250°F', quantity:6, units:'Ea',
           rate:32.60, amount:195.60, taxable:true, locationId:'loc_1',
           quantityFulfilled:0, quantityBilled:0, isClosed:false }],
  subtotal, discountTotal, taxTotal, total,   // see §5.3
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
  appliedTotal:1000.00, unapplied:0 }
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

### 4.9 `vendorPayments` (seed; UI P2)
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
Every user action that writes a record appends ≥1 note (a create → 1 `Create` note; a status change on a parent caused by a
child transaction → a `Status` note on the parent; an entity edit → one `Change` note per changed field).
Seed: one `Create` note per seeded record (date = tranDate T16:00:00Z), plus a `Status` note per SO/PO whose status ≠ initial.

### 4.13 `userNotes` (P2) `{ id, recordType, recordId, title, memo, noteType:'Note'|'Phone Call'|'E-mail', direction:'Incoming'|'Outgoing', authorId, createdAt }`
### `tasks` (P2) `{ id, internalId, title, assignedToId, priority:'High'|'Medium'|'Low', status:'Not Started'|'In Progress'|'Completed', startDate, dueDate, companyId, transactionId, message, createdAt }` — seed 10.

---

## §5 Business rules & derived values (pure functions in `src/utils/`)

### 5.1 Inventory quantities (per item × location), `src/utils/inventory.js`
- `onHand` — stored.
- `committed` = Σ over salesOrders with status ∈ {Pending Fulfillment, Partially Fulfilled, Pending Billing/Partially Fulfilled}
  of lines (inventory items, `!isClosed`, `locationId` = loc) of `max(0, quantity − quantityFulfilled)`, capped so that
  total committed ≤ onHand (allocate in SO `tranDate` order; the uncovered remainder is **backOrdered**).
- `available` = `onHand − committed` (≥ 0).
- `backOrdered` = Σ remaining unfulfilled − committed (≥ 0).
- `onOrder` = Σ over purchaseOrders with status ∈ {Pending Receipt, Partially Received, Pending Billing/Partially Received}
  of lines (location = PO `shipToLocationId`, `!isClosed`) of `max(0, quantity − quantityReceived)`.
  (Pending Supervisor Approval POs are NOT on order.)
- `value` = onHand × item.averageCost.
- Item totals = Σ over locations. **Below reorder point** when `available + onOrder ≤ reorderPoint` and reorderPoint > 0
  (per location) → "Items to Reorder" reminder counts distinct item×location pairs.
- Pending Approval SOs do not commit stock.

### 5.2 Status machines
**Sales order** — `deriveSalesOrderStatus(so, items)` after every fulfillment/invoice/close action (never on load):
1. If `status ∈ {Pending Approval, Cancelled, Closed}` and the action isn't approve/reopen → keep.
2. Let `L` = lines with `!isClosed`. "fulfillable" = item.type === 'inventoryItem'. Non-fulfillable lines are billable immediately.
3. `billableQty(line)` = (fulfillable ? quantityFulfilled : quantity) − quantityBilled.
4. `allFulfilled` = every fulfillable line in L has quantityFulfilled ≥ quantity; `anyFulfilled` = some fulfillable line has quantityFulfilled > 0.
5. `allBilled` = every line in L has quantityBilled ≥ quantity (and every closed line has quantityBilled ≥ quantityFulfilled).
6. Result: allBilled → **Billed**; else allFulfilled → **Pending Billing**; else anyFulfilled → (Σ billableQty > 0 ? **Pending Billing/Partially Fulfilled** : **Partially Fulfilled**); else **Pending Fulfillment**.
Button availability on the SO view:
| Status | Buttons |
|---|---|
| Pending Approval | Edit, Back, **Approve**, Cancel Order, Print, Actions(Make Copy, Delete) |
| Pending Fulfillment | Edit, Back, **Fulfill**, **Bill** if eligible service/non-stock quantity exists, Close Order, Print, Actions(Make Copy, Delete if no children) |
| Partially Fulfilled | Edit, Back, **Fulfill**, Close Order, Print, Actions(Make Copy) |
| Pending Billing/Partially Fulfilled | Edit, Back, **Fulfill**, **Bill**, Close Order, Print, Actions(Make Copy) |
| Pending Billing | Edit, Back, **Bill**, Close Order, Print, Actions(Make Copy) |
| Billed / Closed / Cancelled | Edit (Billed/Closed only memo/ref editable), Back, Print, Actions(Make Copy) |
Fulfill requires an approved, open order with remaining fulfillable quantity. Bill requires an approved, open order with positive
billable quantity, including a mixed order with an unbilled service line before its first fulfillment. Show Print when implemented in P2.
Make Copy is an additional product reference.

**Purchase order** — `derivePurchaseOrderStatus(po)`: keep {Pending Supervisor Approval, Rejected by Supervisor, Closed} unless the
action changes them. Over lines with `!isClosed`: allReceived / anyReceived / billable = Σ(quantityReceived − quantityBilled) > 0 /
allBilled = every line quantityBilled ≥ quantity. Result: allBilled → **Fully Billed**; allReceived → (billable ? **Pending Bill** : **Fully Billed**);
anyReceived → (billable ? **Pending Billing/Partially Received** : **Partially Received**); else **Pending Receipt**.
Buttons: Pending Supervisor Approval → Approve, Reject; receivable → Receive; billable → Bill; open → Close Order.

**Invoice**: Voided invoices have `amountRemaining:0`. For active invoices, `amountRemaining = round2(total − amountPaid)`;
`amountRemaining ≤ 0` means Paid In Full, otherwise Open.
Displayed extra flag (not stored): **Overdue** when Open and `dueDate < today` (today = `new Date()` local `YYYY-MM-DD`). "Days Overdue" column.
**Vendor bill**: same as invoice (Open / Paid In Full).

### 5.3 Totals (`src/utils/money.js` → `calcTotals(lines, {taxRate, discountRate, shippingCost}, items)`)
- `subtotal` = Σ line.amount; `discountTotal` = −round2(subtotal × discountRate/100);
- `taxTotal` = round2(Σ amount of lines with `taxable` × (1 − discountRate/100) × taxRate/100) (taxRate = 0 when customer `taxable:false`);
- `total` = round2(subtotal + discountTotal + taxTotal + shippingCost).
- Invoice created from SO: carry the SO shipping charge while no active linked invoice already carries it. Preserve that invoice's
  shipping amount during edits. A replacement may carry shipping after the earlier shipping invoice has been voided.
- Due date = tranDate + terms.days.
- Payment terms discount (2% 10) is display-only in P1.

### 5.4 Validation messages (shown in the alert dialog, exact wording)
- Missing required: `Please enter value(s) for: Customer, Location` (comma-joined field labels).
- No lines: `You must enter at least one line item for this transaction.`
- Fulfil > remaining: `You can not fulfill more than the remaining quantity (4) for item PMP-1075.`
- Fulfil > on hand: `Insufficient quantity on hand for item ANC-WDG12 at location 03: Columbus. On hand: 0, requested: 10.`
- Receive > remaining: `You can not receive more than the remaining quantity (2) for item BRG-22216.`
- Bill > billable: `The quantity billed (5) exceeds the quantity received and not yet billed (3) for item BLT-5VX800.`
- Adjustment negative: `Inventory for item PPE-EP200 at 01: Portland cannot go below zero (new quantity: -2).`
- Transfer same location: `From Location and To Location must be different.`
- Transfer > on hand: `Not enough inventory for item CNV-RLR19 at 01: Portland. Available to transfer: 260.`
- Payment applied > payment: `The total amount applied (1,500.00) exceeds the payment amount (1,000.00).`
- Credit hold (blocks save): `This customer is on credit hold. The transaction cannot be saved.`
- Credit limit (confirm, `creditLimitHandling:'Warn'`): `The customer's balance plus unbilled orders and this transaction (23,410.50) exceed the customer's credit limit (20,000.00). Do you want to continue?` OK = save, Cancel = stay.
- Delete confirm: `Are you sure you want to delete this record?`
- Void confirm: `Are you sure you want to void this transaction? This cannot be undone.`
- Inactive entity cannot be chosen in pickers (filtered out unless "Show Inactives").

---

## §6 Seed transactions (fixed; build with small helper fns in `src/data/seed.js`)

Rules applied to all seed docs unless stated: SO/INV `rate = item.basePrice`; PO/IR/Bill `rate = item.purchasePrice`;
location = customer default (SO) / as listed (PO); sales rep = customer's rep; terms = entity's terms; taxItem/taxRate = customer's;
`shippingCost` = 0 except where noted; createdById = emp_101 (SOs: the sales rep; POs: emp_105); `createdAt` = tranDate+'T16:00:00.000Z'.
`otherRefNum` for SOs: `'PO-' + (70000 + soNumber % 1000 * 7)` (deterministic). Line `quantityFulfilled/Billed` per the status notes.
Verify that SO/PO line quantities match their active linked IF/INV/IR/BILL lines, every SO/PO stored status equals its derived status,
invoice `amountPaid` equals the sum of applied payments, seed on-hand is nonnegative and totals recompute exactly. Explicit warehouse,
date and rate values on fixture rows take precedence over defaults.

### 6.1 Sales orders (48) — ids `so_<number>`; dates 2026
| tranId | date | cust | status | lines (itemId × qty) and fulfillment notes |
|---|---|---|---|---|
| SO10411 | 06-03 | C1001 | Billed | PMP-1050×4, SEL-5510×6, BRG-6205×40 |
| SO10412 | 06-09 | C1013 | Billed | BRG-6308×20, BLT-B68×30, CPL-L110×10 |
| SO10413 | 06-16 | C1005 | Billed | VLV-3020×8, FTG-4012×6, GAG-PG100×12 |
| SO10414 | 06-24 | C1009 | Billed | PPE-GL200×20, PPE-HH100×40, PPE-SG55×10 |
| SO10415 | 07-01 | C1020 | Billed | ELC-LED150×24, ELC-WR12×6, SVC-INSTALL×16 (2 invoices) |
| SO10416 | 07-08 | C1016 | Billed | ELC-MTR5×2, ELC-VFD3×2, GBX-W20×1 ; shippingCost 145.00 |
| SO10417 | 07-14 | C1002 | Billed | PMP-2150×2, VLV-3110×2, HOS-5050×4 (2 shipments, 2 invoices) |
| SO10418 | 07-21 | C1011 | Billed | BLT-A42×50, BRG-UCP207×12, SPR-40B18×8 |
| SO10419 | 07-28 | C1029 | Billed | FST-HB3816×10, FST-HN3816×10, FST-FW38×10 |
| SO10420 | 08-04 | C1006 | Billed | HOS-5025×12, VLV-3010×30, GSK-5620×6 (2 shipments, 2 invoices) |
| SO10421 | 08-11 | C1034 | Billed | ELC-CB20×60, ELC-CTR30×8, PPE-FA50×4 |
| SO10422 | 08-18 | C1024 | Billed | CNV-RLR19×40, CNV-BLT24×120 ; shippingCost 210.00 |
| SO10423 | 08-22 | C1015 | Billed | PMP-1075×3, SEL-5510×6, GAG-TH250×10 (2 shipments, 2 invoices) |
| SO10424 | 08-27 | C1021 | Billed | PPE-HV3×30, PPE-EP200×6, PPE-HH100×30 |
| SO10425 | 09-02 | C1031 | Billed | VLV-3020×12, GSK-5620×8, BRG-22216×2 (2 shipments, 2 invoices) |
| SO10426 | 08-29 | C1036 | Closed | VLV-3200×24 (fulfilled 24, billed 24), PMP-1050×1 (isClosed, 0 fulfilled) |
| SO10427 | 09-05 | C1040 | Closed | BRG-6205×100 (isClosed, nothing fulfilled) memo "Customer ceased operations" |
| SO10428 | 09-22 | C1004 | Pending Billing | BLT-5VX800×10, CPL-SPD110×20, SPR-40B18×6 (all fulfilled) |
| SO10429 | 10-06 | C1017 | Pending Billing | BRG-6308×12, BRG-UCP207×8 (all fulfilled) |
| SO10430 | 10-14 | C1012 | Pending Billing | VLV-3020×6, GAG-PG100×10 (fulfilled), SVC-CALIB×10 (service) |
| SO10431 | 10-21 | C1014 | Pending Billing | FST-SS1213×6, FST-HB3816×8, ANC-WDG12×4 (all fulfilled) |
| SO10432 | 10-27 | C1026 | Pending Billing | PPE-GL200×10, PPE-SG55×6, PPE-FA50×2 (all fulfilled) |
| SO10433 | 11-02 | C1008 | Pending Billing | PMP-1050×2, HOS-5025×4, VLV-3010×10 (all fulfilled) ; shippingCost 85.00 |
| SO10434 | 10-09 | C1013 | Pending Billing/Partially Fulfilled | ELC-LED150×20 (fulfilled 6 → 14 remaining, 6 Columbus on hand and 8 backordered), ELC-CB20×40 (fulfilled 40); nothing billed |
| SO10435 | 10-16 | C1010 | Pending Billing/Partially Fulfilled | PMP-3300×2 (0 fulfilled; Reno onHand 0 → backordered), GBX-W20×2 (fulfilled 2); nothing billed |
| SO10436 | 10-23 | C1022 | Pending Billing/Partially Fulfilled | VLV-3110×4 (fulfilled 2), FTG-4034×10 (fulfilled 10); nothing billed |
| SO10437 | 10-01 | C1006 | Partially Fulfilled | HOS-5025×20 (ful 20, billed 20), HOS-5050×6 (ful 2, billed 2) |
| SO10438 | 10-12 | C1028 | Partially Fulfilled | CNV-RLR19×60 (ful 30, billed 30), CNV-BLT24×200 (ful 200, billed 200) |
| SO10439 | 10-19 | C1016 | Partially Fulfilled | ELC-MTR10×2 (ful 1, billed 1; Columbus onHand 0 → 1 backordered), ELC-VFD3×2 (ful 2, billed 2) |
| SO10440 | 10-28 | C1001 | Pending Fulfillment | PMP-1075×2, SEL-5510×4, SVC-INSTALL×8 |
| SO10441 | 10-30 | C1007 | Pending Fulfillment | BRG-6205×80, BRG-6308×20, BLT-A42×24 |
| SO10442 | 11-03 | C1013 | Pending Fulfillment | ANC-WDG12×10 (Columbus onHand 0 → backordered; PO4521 inbound), FST-HB3816×6 |
| SO10443 | 11-04 | C1033 | Pending Fulfillment | PPE-HH100×25, PPE-HV3×25, PPE-EP200×4 |
| SO10444 | 11-05 | C1011 | Pending Fulfillment | PMP-2150×1, VLV-3020×4, GAG-PG100×6 |
| SO10445 | 11-06 | C1015 | Pending Fulfillment | GSK-5620×5, SEL-5510×8, BRG-22216×2 |
| SO10446 | 11-09 | C1018 | Pending Fulfillment | ELC-WR12×4, ELC-CB20×30, ELC-CTR30×6 |
| SO10447 | 11-10 | C1027 | Pending Fulfillment | HOS-5050×2, VLV-3010×20 ; shipMethod LTL, shippingCost 120.00 |
| SO10448 | 11-11 | C1034 | Pending Fulfillment | ELC-LED150×12, SVC-INSTALL×24 |
| SO10449 | 11-12 | C1019 | Pending Fulfillment | PPE-GL200×12, PPE-FA50×2 |
| SO10450 | 11-04 | C1025 | Cancelled | PMP-3300×1, ELC-MTR5×1 memo "Cancelled – customer on credit hold" |
| SO10451 | 11-07 | C1003 | Cancelled | BLT-B68×10 memo "Customer cancelled – duplicate order" |
| SO10452 | 11-10 | C1009 | Pending Approval | PPE-GL200×30, PPE-HH100×50, PPE-SG55×20 (approving/saving triggers credit-limit warning) |
| SO10453 | 11-12 | C1029 | Pending Approval | FST-HN3816×20, FST-FW38×20, FST-HB3816×12 |
| SO10454 | 11-13 | C1002 | Pending Approval | PMP-3300×1, VLV-3110×2, HOS-5050×2 |
| SO10455 | 11-14 | C1035 | Pending Approval | PPE-FA50×6, PPE-SG55×8, SVC-TRAIN×1 |
| SO10456 | 11-16 | C1023 | Pending Approval | BLT-B68×12, CPL-L110×4, CPL-SPD110×8 |
| SO10457 | 11-17 | C1032 | Pending Approval | ELC-MTR5×1, CPL-L110×2, BRG-UCP207×4 |
| SO10458 | 11-17 | C1038 | Pending Approval | GAG-TH250×6, GAG-PG100×6, VLV-3200×24 |
Approved SOs: `approvedById:'emp_101'`, `approvedAt` = tranDate+'T18:00:00.000Z'. SO `shipDate` = tranDate + 3 days.
C1009 (Reno Mining Supply) has a 20,000 credit limit and an 18,500 open balance from INV20903. SO10452 adds 3,093.00, putting exposure
at 21,593.00. When validating a saved order, exclude its prior version from the customer's existing order exposure.

### 6.2 Item fulfillments (32) — `IF8201…IF8232`, ids `if_<number>`, all `status:'Shipped'`, date = SO date + 2 days (second shipment +16 days)
One per shipment: SO10411–10414, 10416, 10418, 10419, 10421, 10422, 10424 (1 each, all lines); SO10415 (LED + wire only);
SO10417 (#1 PMP-2150×2 + VLV-3110×2, #2 HOS-5050×4); SO10420 (#1 HOS-5025×12 + VLV-3010×30, #2 GSK-5620×6);
SO10423 (#1 PMP-1075×3 + SEL-5510×6, #2 GAG-TH250×10); SO10425 (#1 VLV-3020×12 + GSK-5620×8, #2 BRG-22216×2);
SO10426 (VLV-3200×24); SO10428–10433 (1 each, inventory lines); SO10434–10439 (1 each with the fulfilled quantities above).
Assign IF numbers in date order. Location = SO line location.

### 6.3 Invoices (33) — ids `inv_<number>`; due date from terms unless specified; `amountPaid` from payments
| tranId | date | source | lines | status / payment |
|---|---|---|---|---|
| INV20871 | 06-05 | SO10411 | all | Paid In Full |
| INV20872 | 06-12 | SO10412 | all | Paid In Full |
| INV20873 | 06-19 | SO10413 | all | Paid In Full |
| INV20874 | 06-26 | SO10414 | all | Paid In Full |
| INV20875 | 07-03 | SO10415 | LED×24, WR12×6 | Paid In Full |
| INV20876 | 07-10 | SO10416 | all (+ shipping 145.00) | Paid In Full |
| INV20877 | 07-16 | SO10417 | PMP-2150×2, VLV-3110×2 | Paid In Full |
| INV20878 | 07-18 | standalone C1004 | SVC-PMPRPR×2 | Paid In Full |
| INV20879 | 07-23 | SO10418 | all | Paid In Full |
| INV20880 | 07-24 | SO10415 | SVC-INSTALL×16 | Paid In Full |
| INV20881 | 07-30 | SO10419 | all | Paid In Full |
| INV20882 | 08-05 | SO10417 | HOS-5050×4 | Paid In Full |
| INV20883 | 08-06 | SO10420 | HOS-5025×12, VLV-3010×30 | Paid In Full |
| INV20884 | 08-13 | SO10421 | all | Paid In Full |
| INV20885 | 08-14 | standalone C1010 | SVC-CALIB×24, NI-CALCERT×24 | Paid In Full |
| INV20886 | 08-20 | SO10422 | all (+ shipping 210.00) | Paid In Full |
| INV20887 | 08-25 | SO10423 | PMP-1075×3, SEL-5510×6 | Paid In Full |
| INV20888 | 08-28 | SO10424 | all | Open, partially paid 1,000.00 — overdue |
| INV20889 | 09-01 | SO10426 | VLV-3200×24 | Open, unpaid — overdue (Due on receipt) |
| INV20890 | 09-03 | SO10420 | GSK-5620×6 | Paid In Full |
| INV20891 | 09-04 | SO10425 | VLV-3020×12, GSK-5620×8 | Paid In Full |
| INV20892 | 09-10 | SO10423 | GAG-TH250×10 | Open — overdue |
| INV20893 | 09-15 | standalone C1021 | SVC-TRAIN×2 | Voided (voidedAt 2026-09-16T17:00:00.000Z, amountRemaining 0) |
| INV20894 | 09-18 | SO10425 | BRG-22216×2 | Open, partially paid 200.00 — overdue |
| INV20895 | 09-25 | standalone C1034 | SVC-INSTALL×40 | Paid In Full |
| INV20896 | 10-03 | SO10437 | HOS-5025×20, HOS-5050×2 | Open — overdue (due 11-17) |
| INV20897 | 10-08 | standalone C1001 | SVC-PMPRPR×1, SVC-DELIV×1 | Open — overdue (due 11-07) |
| INV20898 | 10-15 | SO10438 | CNV-RLR19×30, CNV-BLT24×200 | Open, partially paid 2,000.00 (due 11-29) |
| INV20899 | 10-22 | SO10439 | ELC-MTR10×1, ELC-VFD3×2 | Open (due 11-21) |
| INV20900 | 10-29 | standalone C1012 | SVC-CALIB×15 | Open (due 11-28) |
| INV20901 | 11-06 | standalone C1035 | SVC-TRAIN×1 | Open (due 12-06) |
| INV20902 | 11-13 | standalone C1018 | SVC-DELIV×3, NI-CRATE×2 | Open (due 12-13) |
| INV20903 | 11-14 | standalone C1009 | SVC-INSTALL×148 | Open, unpaid, 18,500.00 (due 12-14) |
Totals: 20 Paid In Full, 12 Open (6 overdue as of 2026-11-18, 3 partially paid), 1 Voided.

### 6.4 Customer payments (20) — `PYMT6101…PYMT6120`, ids `pymt_<number>`
One payment per Paid-In-Full invoice dated invoice date + 21 days, **except** combined payments: INV20875+INV20880 (C1020, dated 08-10),
INV20877+INV20882 (C1002, dated 08-20), INV20883+INV20890 (C1006, dated 09-24). Plus the 3 partial payments: INV20888 1,000.00 (10-20),
INV20894 200.00 (10-30), INV20898 2,000.00 (11-12). Method: municipal → Check (checkNum `10xxx`), others ACH.
Payments dated ≤ 2026-11-01 → `undepFunds:false, accountId:'acct_1000', status:'Deposited'`; later → `undepFunds:true, accountId:'acct_1050', status:'Not Deposited'`.
`unapplied: 0` for all.

### 6.5 Purchase orders (32) — ids `po_<number>`, employee emp_105, `dueDate` = date + 14 days
| tranId | date | vendor | ship to | status | lines (itemId × qty; recv / billed) |
|---|---|---|---|---|---|
| PO4501 | 06-02 | V2003 | loc_1 | Fully Billed | BRG-6205×300, BRG-6308×100, BRG-UCP207×40 |
| PO4502 | 06-10 | V2006 | loc_1 | Fully Billed | PPE-GL200×120, PPE-HH100×150, PPE-SG55×60 |
| PO4503 | 06-23 | V2001 | loc_1 | Fully Billed | PMP-1050×20, PMP-1075×10, PMP-2150×4 |
| PO4504 | 07-07 | V2004 | loc_3 | Fully Billed | BLT-A42×100, BLT-B68×80, CPL-L110×40 |
| PO4505 | 07-20 | V2007 | loc_2 | Fully Billed | ELC-CB20×150, ELC-WR12×12, ELC-LED150×30 |
| PO4506 | 08-03 | V2002 | loc_1 | Fully Billed | VLV-3010×120, VLV-3020×40, VLV-3200×200 |
| PO4507 | 08-17 | V2005 | loc_3 | Fully Billed | FST-HB3816×80, FST-HN3816×100, FST-FW38×120 |
| PO4508 | 08-31 | V2018 | loc_2 | Fully Billed | CNV-RLR19×150, CNV-BLT24×500 |
| PO4509 | 09-04 | V2019 | loc_1 | Closed | GAG-PG100×200 (isClosed, nothing received) memo "Vendor discontinued – sourced from V2020" |
| PO4510 | 09-09 | V2009 | loc_1 | Closed | HOS-5050×10 (recv 4, billed 4, then isClosed) |
| PO4511 | 09-16 | V2017 | loc_1 | Pending Bill | SEL-5510×60, GSK-5620×30 (all received) |
| PO4512 | 09-24 | V2020 | loc_3 | Pending Bill | GAG-PG100×40, GAG-TH250×20 (all received) |
| PO4513 | 10-02 | V2022 | loc_3 | Pending Bill | ELC-MTR5×4, ELC-MTR10×2 (all received) |
| PO4514 | 10-09 | V2008 | loc_2 | Pending Bill | ELC-VFD3×6, GBX-W20×4 (all received) |
| PO4515 | 10-13 | V2003 | loc_3 | Pending Billing/Partially Received | BRG-6205×200 (recv 200), BRG-22216×6 (recv 2) |
| PO4516 | 10-20 | V2006 | loc_2 | Pending Billing/Partially Received | PPE-HV3×80 (recv 80), PPE-EP200×30 (recv 0) |
| PO4517 | 10-22 | V2004 | loc_1 | Partially Received | BLT-5VX800×40 (recv 20/billed 20), SPR-40B18×30 (30/30), CHN-40-10×20 (0/0) |
| PO4518 | 10-27 | V2002 | loc_3 | Partially Received | VLV-3110×6 (2/2), FTG-4034×30 (30/30) |
| PO4519 | 10-29 | V2009 | loc_2 | Partially Received | HOS-5025×40 (20/20), HOS-5050×12 (0/0) |
| PO4520 | 11-02 | V2001 | loc_2 | Pending Receipt | PMP-3300×3, PMP-2150×4 |
| PO4521 | 11-03 | V2005 | loc_3 | Pending Receipt | ANC-WDG12×60, FST-SS1213×20 |
| PO4522 | 11-05 | V2007 | loc_3 | Pending Receipt | ELC-LED150×40, ELC-CTR30×20 |
| PO4523 | 11-06 | V2022 | loc_3 | Pending Receipt | ELC-MTR10×4 |
| PO4524 | 11-09 | V2006 | loc_1 | Pending Receipt | PPE-EP200×40, PPE-FA50×20 |
| PO4525 | 11-10 | V2018 | loc_3 | Pending Receipt | CNV-RLR19×100, CNV-BLT24×300 |
| PO4526 | 11-12 | V2012 | loc_1 | Pending Receipt | NI-FABSKID×2 @1,610.00 memo "Skids for Hillsboro Semi project" |
| PO4527 | 11-13 | V2016 | loc_1 | Pending Receipt | NI-HYDOIL×24 |
| PO4528 | 10-30 | V2010 | loc_1 | Rejected by Supervisor | NI-SHPSUP×1 @2,400.00 memo "Pallet wrap & strapping – annual"; rejectionReason "Use the blanket agreement pricing" |
| PO4529 | 11-14 | V2003 | loc_1 | Pending Supervisor Approval | BRG-22216×8, BRG-6308×60 |
| PO4530 | 11-16 | V2020 | loc_2 | Pending Supervisor Approval | GAG-PG100×60, GAG-TH250×30 |
| PO4531 | 11-17 | V2008 | loc_1 | Pending Supervisor Approval | GBX-W20×6, ELC-VFD3×8 |
| PO4532 | 11-17 | V2001 | loc_1 | Pending Supervisor Approval | PMP-3300×4, PMP-1075×10, PMP-2150×6 |
`supervisorApproval` = true for every PO not in Pending Supervisor Approval/Rejected.

### 6.6 Item receipts (18) — `IR3301…IR3318`, date = PO date + 10 days
One per PO for PO4501–PO4508 (all lines), PO4510 (HOS-5050×4), PO4511–PO4514 (all), PO4515 (BRG-6205×200, BRG-22216×2),
PO4516 (PPE-HV3×80), PO4517 (BLT-5VX800×20, SPR-40B18×30), PO4518 (VLV-3110×2, FTG-4034×30), PO4519 (HOS-5025×20).
Location = PO shipToLocationId. (Seed onHand is the **current** snapshot; receipts are history and are not replayed.)

### 6.7 Vendor bills (16) — `BILL1101…BILL1116`, ids `bill_<number>`; `tranId` = vendor invoice # (e.g. `MBS-88412`), date = receipt date + 3 days
From POs: PO4501–PO4508 (8 bills, full), PO4510 (HOS-5050×4), PO4517 (BLT-5VX800×20 + SPR-40B18×30), PO4518 (VLV-3110×2 + FTG-4034×30),
PO4519 (HOS-5025×20) = 12. Expense bills (no PO, `expenses` lines): V2011 Redline Freight 1,284.50 (acct 6400, 09-30), V2013 Evergreen Office 212.38 (6600, 10-15),
V2014 Columbia Industrial Rentals 1,950.00 (6500, 10-31), V2021 Western States Forklift 640.00 (6500, 11-08).
Status: bills for PO4501–PO4506 + Redline + Evergreen = **Paid In Full** (8); the other 8 **Open** (amountRemaining = total).

### 6.8 Vendor payments (8) — `VP1201…VP1208`, one per paid bill, date = bill date + 25 days, ACH from acct_1000, status 'Cleared'.

### 6.9 Inventory adjustments (10) — `ADJ1041…ADJ1050`
| tranId | date | location | account | lines (item: adjustQtyBy) | memo |
|---|---|---|---|---|---|
| ADJ1041 | 07-15 | loc_1 | 5220 | BRG-6205: -4, BLT-A42: +2 | Q3 cycle count – aisle A |
| ADJ1042 | 07-29 | loc_1 | 5210 | PMP-1050: -1 | Cracked volute – freight damage |
| ADJ1043 | 08-12 | loc_2 | 5220 | CNV-RLR19: -3 | Cycle count Reno |
| ADJ1044 | 08-26 | loc_3 | 5200 | PPE-GL200: -2, PPE-SG55: -1 | Shrinkage – Columbus |
| ADJ1045 | 09-09 | loc_1 | 5220 | FST-HB3816: +3, FST-HN3816: -2 | Cycle count – fasteners |
| ADJ1046 | 09-23 | loc_2 | 5210 | ELC-LED150: -2 | Damaged in handling |
| ADJ1047 | 10-07 | loc_1 | 5220 | VLV-3010: -5, VLV-3200: +6 | Q4 cycle count – valves |
| ADJ1048 | 10-21 | loc_3 | 5210 | HOS-5025: -1 | Hose assembly failed pressure test |
| ADJ1049 | 11-04 | loc_1 | 5220 | GAG-PG100: -2 | Cycle count – gauges |
| ADJ1050 | 11-14 | loc_3 | 5220 | PPE-HH100: +5 | Found stock – mis-slotted |
`quantityOnHandBefore` = plausible (current onHand − adjustQtyBy); `unitCost` = item.averageCost; `estimatedTotalValue` = Σ.

### 6.10 Inventory transfers (6) — `TRF1011…TRF1016`
TRF1011 07-02 loc_1→loc_2 CNV-RLR19×50, CNV-BLT24×150 · TRF1012 08-06 loc_1→loc_3 BRG-6205×60 ·
TRF1013 09-01 loc_2→loc_1 PPE-HH100×40 · TRF1014 09-29 loc_1→loc_3 PMP-1050×4, SEL-5510×10 ·
TRF1015 10-20 loc_3→loc_2 FST-HB3816×15 · TRF1016 11-11 loc_1→loc_2 VLV-3010×30 (memo "Rebalance for SO10447").

### 6.11 Other seed
- `systemNotes`: generated (§4.12). `userNotes`: 8 notes on customers/SOs (P2). `tasks`: 10 (P2), e.g. "Call Reno Mining Supply re: credit limit" (High, due 11-19, emp_104).
- `shortcuts`: 6 (§2.6).

---

## §7 Observable State Changes (verifier contract — copy into SCHEMA.md)

All transaction and master record creations include the relevant common header, `createdById` and ISO `createdAt`,
advance `counters.nextInternalId` and any named document or entity counter, and append `systemNotes`. Every
edit or lifecycle action also appends an audit note. Parent audit notes identify changes from linked transactions.

| # | User action (UI path) | Records written / fields changed |
|---|---|---|
| W1.1 | Create sales order (Transactions › Sales › Enter Sales Orders › Save) | `salesOrders[+]` {tranId `SO<counter>`, customerId, tranDate, status = form Status (default prefs.salesOrderDefaultStatus), locationId, lines[{itemId, quantity, rate, amount, taxable, quantityFulfilled:0, quantityBilled:0}], subtotal, taxTotal, shippingCost, total, otherRefNum, memo, salesRepId, termsId, shipMethodId, createdById, createdAt}; `counters.salesOrder`+1; `counters.nextInternalId`+1; `systemNotes[+]` Create |
| W1.2 | Edit sales order (Edit › Save) | `salesOrders[i]` changed fields + recomputed totals, `lastModifiedAt`; lines added/removed (only lines with 0 fulfilled/billed can be removed; quantity cannot go below quantityFulfilled); `systemNotes[+]` Edit |
| W1.3 | Approve SO (view **Approve** or Approve Sales Orders page) | `salesOrders[i].status` Pending Approval→Pending Fulfillment (or Pending Billing for service-only), `approvedById`, `approvedAt`; `systemNotes[+]` Approve |
| W1.4 | Cancel order (Pending Approval only) | `status:'Cancelled'`, `cancelledAt`; all lines `isClosed:true`; note |
| W1.5 | Close order | open lines `isClosed:true`; `status:'Closed'`, `closedAt`; note. Releases committed stock (derived) |
| W1.6 | Fulfill (SO **Fulfill** → Item Fulfillment › Save; or Fulfill Orders page) | `itemFulfillments[+]` {tranId `IF<n>`, createdFromId=SO id, customerId, status, lines[{orderLineId, itemId, locationId, quantity}]}; `items[k].locations[loc].onHand` −= qty; `salesOrders[i].lines[j].quantityFulfilled` += qty; SO `status` re-derived; `counters.itemFulfillment`+1; notes on IF (Create) and SO (Status) |
| W1.7 | Mark Packed / Mark Shipped on IF | `itemFulfillments[i].status`, `shippedAt` (Shipped); note |
| W1.8 | Delete SO (no children) | removed from `salesOrders`; note Delete |
| W2.1 | Create PO (Enter Purchase Orders › Save) | `purchaseOrders[+]` {tranId `PO<n>`, vendorId, employeeId, tranDate, dueDate, shipToLocationId, supervisorApproval, status ('Pending Receipt' if supervisorApproval else 'Pending Supervisor Approval'), lines[{itemId, quantity, rate, amount, expectedReceiptDate, quantityReceived:0, quantityBilled:0}], total}; counters; note |
| W2.2 | Approve / Reject PO (view buttons or Approve Purchase Orders page) | Approve writes `status:'Pending Receipt'`, `supervisorApproval:true`, `approvedById`, `approvedAt`. Reject writes `status:'Rejected by Supervisor'`, `supervisorApproval:false`, `rejectedById`, `rejectedAt`, `rejectionReason`. Both append a note. |
| W2.3 | Receive (PO **Receive** → Item Receipt › Save; Receive Orders page) | `itemReceipts[+]` {tranId `IR<n>`, createdFromId=PO id, vendorId, lines[{orderLineId, itemId, locationId, quantity, rate, amount}], total}; on inventory lines, `items[k].locations[loc].onHand` += qty, `items[k].averageCost` = round4((oldTotalOnHand×oldAvg + qty×rate)/(oldTotalOnHand+qty)) for a positive opening total (use receipt rate if opening total is nonpositive), `items[k].lastPurchasePrice` = rate; every received line increments `purchaseOrders[i].lines[j].quantityReceived`; PO status re-derived; notes |
| W2.4 | Bill PO (PO **Bill** → Vendor Bill › Save) | `vendorBills[+]` {transactionNumber `BILL<n>`, tranId (vendor ref, required), vendorId, createdFromId, lines[{orderLineId, itemId, quantity, rate, amount}], total, amountRemaining=total, status 'Open', dueDate}; PO lines `quantityBilled` += qty; PO status re-derived; notes |
| W2.5 | Close PO | open lines `isClosed:true`; `status:'Closed'`, `closedAt`; note |
| W2.6 | Edit / Delete PO | Edit updates the allowed header/line fields, recomputes totals and status, and sets `lastModifiedAt` and `lastModifiedById`. Keep line IDs for linked quantities and prevent reducing ordered quantity below received or billed. Delete removes the PO if it has no receipts/bills. Both append an audit note. |
| W3.1 | Adjust Inventory (Transactions › Inventory › Adjust Inventory › Save) | `inventoryAdjustments[+]` {tranId `ADJ<n>`, accountId, adjustmentLocationId, tranDate, memo, lines[{itemId, locationId, quantityOnHandBefore, adjustQtyBy, newQuantity, unitCost}], estimatedTotalValue}; `items[k].locations[loc].onHand` = newQuantity; counters; note |
| W3.2 | Transfer Inventory (Save) | `inventoryTransfers[+]` {tranId `TRF<n>`, fromLocationId, toLocationId, lines[{itemId, quantityOnHandFrom, quantity}]}; onHand −qty at from, +qty at to; note |
| W3.3 | Create inventory item (Lists › Accounting › Items › New › Inventory Item › Save) | `items[+]` {itemId (unique, required), displayName, type:'inventoryItem', basePrice, purchasePrice, averageCost=purchasePrice, preferredVendorId, classId, units, accounts, locations[{locationId, onHand (initial, optional), reorderPoint, preferredStockLevel}]}; note |
| W3.4 | Edit item (incl. Locations reorder point / preferred stock, prices, inactive) | `items[k]` changed fields, `lastModifiedAt`; one `Change` note per field |
| W3.5 | Order Items (P2) | creates `purchaseOrders[+]` per vendor (as W2.1) for selected items |
| W4.1 | Bill SO (SO **Bill** → Invoice › Save; Bill Sales Orders page) | `invoices[+]` {tranId `INV<n>`, createdFromId=SO id, customerId, tranDate, dueDate, termsId, lines[{orderLineId, itemId, quantity, rate, amount, taxable}], subtotal, taxTotal, shippingCost, total, amountPaid:0, amountRemaining=total, status 'Open'}; SO lines `quantityBilled` += qty; SO status re-derived; notes |
| W4.2 | Create standalone invoice (Transactions › Sales › Create Invoices › Save) | `invoices[+]` as W4.1 with `createdFromId:null` |
| W4.3 | Accept payment (Invoice **Accept Payment** or Transactions › Customers › Accept Customer Payments › Save) | `customerPayments[+]` {tranId `PYMT<n>`, customerId, payment, paymentMethodId, checkNum, undepFunds, accountId, applied[{invoiceId, amount}], appliedTotal, unapplied, status}; each applied `invoices[i].amountPaid` += amount, `amountRemaining`, `status` ('Paid In Full' when 0); notes |
| W4.4 | Void invoice (Actions › Void; only when amountPaid = 0) | `invoices[i]` {status:'Voided', amountRemaining:0, voidedAt, voidedById}; if from SO: SO lines `quantityBilled` −= invoiced qty and SO status re-derived; notes |
| W4.5 | Edit invoice (Open, no payments) | changed fields/lines, totals, `amountRemaining`; SO `quantityBilled` adjusted by delta; note |
| E.1 | Create/edit customer | `customers[+/i]` (entityId `C<n>` on create), note(s) |
| E.2 | Create/edit vendor | `vendors[+/i]` (entityId `V<n>`), note(s) |
| P2 | Pay Bills | `vendorPayments[+]`, bills `amountPaid/amountRemaining/status` |
| P2 | Add/remove shortcut | `shortcuts[+/-]` |
| P2 | Set Preferences | `preferences.*` |
| P2 | Add note / task | `userNotes[+]` / `tasks[+/i]` |

Viewing pages, sorting, filtering, opening menus, searching **never** write state.

---

## §8 `createInitialData()` skeleton (`src/data/seed.js`, pure ESM, Node-importable)
```js
export function createInitialData() {
  const ref = buildReference();            // company, currentUser, preferences, counters, employees, locations, departments, classes, accounts, terms, shipMethods, paymentMethods, taxItems, shortcuts
  const customers = buildCustomers();      // §3.1 table
  const vendors = buildVendors();          // §3.2 table
  const items = buildItems();              // §3.3 tables (current onHand snapshot)
  const so = buildSalesOrders(customers, items);              // §6.1 specs → lines, totals, quantities
  const ifs = buildFulfillments(so);                          // §6.2
  const invoices = buildInvoices(so, customers, items);       // §6.3
  const payments = buildCustomerPayments(invoices);           // §6.4 (+ sets amountPaid/amountRemaining/status)
  const po = buildPurchaseOrders(vendors, items);             // §6.5
  const irs = buildItemReceipts(po);                          // §6.6
  const bills = buildVendorBills(po, vendors);                // §6.7
  const vps = buildVendorPayments(bills);                     // §6.8
  const adjustments = buildAdjustments(items);                // §6.9
  const transfers = buildTransfers(items);                    // §6.10
  const systemNotes = buildSystemNotes({ so, ifs, invoices, payments, po, irs, bills, adjustments, transfers, customers, vendors, items });
  return { ...ref, customers, vendors, items, salesOrders: so, itemFulfillments: ifs, invoices, customerPayments: payments,
    purchaseOrders: po, itemReceipts: irs, vendorBills: bills, vendorPayments: vps, inventoryAdjustments: adjustments,
    inventoryTransfers: transfers, systemNotes, userNotes: buildUserNotes(), tasks: buildTasks() };
}
```
Deterministic: no `Math.random`, no `new Date()`; internalIds assigned in a fixed order.
