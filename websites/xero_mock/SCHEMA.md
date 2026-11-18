# xero_mock Schema

**Base URL** `http://localhost:5413/`  
**Go Endpoint** `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Read** `GET /state?sid=<sid>` → `{stored_state, has_custom_state, sid}`  
**Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`  
**Reset** `POST /post?sid=<sid>` with `{"action":"reset"}`

The APP key is `xero`. Boot merges injected objects over seed defaults and
replaces seed arrays with supplied arrays. A fresh browser posts the merged
baseline with `set`. An existing baseline is preserved. `set_current` replaces
the current snapshot, and reset restores the stored baseline. Use a fresh
browser context or SID to pick up a new injected world because the template
caches loaded state by SID. Read changed top-level keys in `state_diff` and
inspect their records in `current_state`. Development and Harbor differ in the
shape of their diff values.

## 0. Global conventions

- **IDs**: fixed string ids in seed (`con_c01`, `inv_0031`, `bill_0012`, `pay_0007`, `bsl_090_071`…). New records: `${prefix}_${Date.now().toString(36)}${counter}` (no randomness needed; must be unique).
- **Dates**: business dates as `'YYYY-MM-DD'` strings. Audit timestamps (`createdAt`, `updatedAt`, `approvedAt`, `reconciledAt`…) as ISO strings from `new Date().toISOString()` at the moment of the user action. Seed audit timestamps are fixed ISO strings (e.g. `'2026-10-12T09:14:00.000Z'`).
- **Money**: JS numbers rounded to 2 dp via `round2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100`. Never strings, never floats like 0.30000000000000004.
- **Currency**: everything GBP (`currencyCode: 'GBP'`). Multi-currency is out of scope.
- **Actor**: most business records carry `createdBy`, `updatedBy`, or action-specific fields such as `approvedBy`, `reconciledBy`, and `sentBy`. History events use `userId` and `userName`. The action tables identify actual writes.
- **Derived, never stored**: "Overdue" (status AUTHORISED && dueDate < today from `new Date()`), account balances, report figures (except snapshots in `savedReports`), dashboard numbers, "Reconcile N items" counts. Do **not** write derived values into state on load.
- **Robustness**: every array may be empty or missing; every optional field may be missing. Use `(state.invoices || [])` patterns and default rendering for missing contact/account (`'(Unknown contact)'`).
- **seed.js must be pure ESM** importable from Node (`vite.config.js` imports it): no `window`, `localStorage`, CSS/asset imports, no `new Date()`/`Math.random()` for values. It may import pure helpers from `src/utils/ledger.js` / `src/utils/money.js`.

## State Schema

| Key | Type | Seed and record shape |
| --- | --- | --- |
| `organisation` | object | Brightwater Creative Ltd, financial and invoice settings (§2.1) |
| `currentUser` | object | Hannah Clarke, same shape as a user (§2.2) |
| `users` | object[] | 4 users (§2.2) |
| `accounts` | object[] | 54 chart-of-accounts entries (§2.3) |
| `taxRates` | object[] | 9 tax rates (§2.4) |
| `trackingCategories` | object[] | 1 category with options (§2.5) |
| `brandingThemes` | object[] | 2 themes (§2.5) |
| `contactGroups` | object[] | 3 groups with contact IDs (§2.5) |
| `contacts` | object[] | 40 customers, suppliers and other contacts (§2.6) |
| `items` | object[] | 14 products and services (§2.7) |
| `invoices` | object[] | 46 sales invoices, type `ACCREC` (§2.8) |
| `bills` | object[] | 35 supplier bills, type `ACCPAY` (§2.8) |
| `creditNotes` | object[] | 3 sales or supplier credits (§2.21) |
| `quotes` | object[] | 6 sales quotes (§2.21) |
| `purchaseOrders` | object[] | 4 purchase orders (§2.21) |
| `repeatingInvoices` | object[] | 2 schedules and invoice templates (§2.21) |
| `payments` | object[] | 46 invoice and bill payments, including 2 batch members (§2.9) |
| `batchPayments` | object[] | 1 supplier payment batch (§2.10) |
| `bankAccounts` | object[] | 3 bank accounts linked to chart accounts (§2.11) |
| `bankStatementLines` | object[] | 133 lines, including 25 unreconciled (§2.12) |
| `bankTransactions` | object[] | 49 spend or receive transactions (§2.13) |
| `bankTransfers` | object[] | 8 transfers (§2.14) |
| `bankRules` | object[] | 3 matching and allocation rules (§2.15) |
| `manualJournals` | object[] | 2 journals with debit and credit lines (§2.16) |
| `savedReports` | object[] | 3 draft or published snapshots (§2.17) |
| `reportExports` | object[] | Empty at seed, export settings and file metadata (§2.18) |
| `favouriteReports` | string[] | `ProfitAndLoss`, `BalanceSheet`, `AgedReceivablesSummary` |
| `historyEvents` | object[] | 256 seed events with linked entity IDs (§2.19) |
| `emailLog` | object[] | Empty at seed, simulated send records (§2.20) |
| `dashboardLayout` | object | Widget order and visibility (§2.21) |

### Default IDs

| Entity | IDs for common verifier fixtures |
| --- | --- |
| Organisation and users | `org_brightwater`, `usr_hannah`, `usr_tom`, `usr_priya`, `usr_marcus` |
| Contacts and accounts | `con_c01` (Ridgeway University), `con_c02` (Boom FM), `acc_090` (bank), `acc_200` (Sales) |
| Invoices and bills | `inv_0001`–`inv_0046`, `bill_0001`–`bill_0035` |
| Bank accounts and payment batch | `ba_090`, `ba_091`, `ba_092`, `bp_0001` |
| Reports and credit notes | `rep_0001`–`rep_0003`, `cn_0001`–`cn_0003` |

See `createInitialData()` for the full ID set.

## Minimal Inject Example

This payload replaces the invoice list with one draft and leaves the default
contacts available.

```json
{
  "invoices": [
    {
      "id": "inv_example",
      "type": "ACCREC",
      "status": "DRAFT",
      "contactId": "con_c01",
      "invoiceNumber": "INV-EXAMPLE",
      "date": "2026-11-18",
      "dueDate": "2026-12-18",
      "lineItems": []
    }
  ]
}
```

## 2. Entities

### 2.1 organisation (object)
```js
{
  id: 'org_brightwater', name: 'Brightwater Creative Ltd', legalName: 'Brightwater Creative Ltd',
  shortCode: '!kX9pQ', countryCode: 'GB', baseCurrency: 'GBP', timezone: 'Europe/London',
  registrationNumber: '10456723', taxNumber: 'GB 284 1937 62', // VAT number
  industry: 'Graphic design and marketing services',
  address: { line1: 'Unit 4, 27 Shoreditch High Street', city: 'London', postalCode: 'E1 6PN', country: 'United Kingdom' },
  phone: '020 7946 0321', email: 'accounts@brightwatercreative.co.uk', website: 'www.brightwatercreative.co.uk',
  financialYearEnd: { day: 31, month: 3 },           // FY = 1 Apr – 31 Mar
  conversionDate: '2026-04-01',
  vatScheme: 'Accrual', vatPeriod: 'Quarterly', vatStagger: 'Mar/Jun/Sep/Dec',
  lockDate: null,                                     // 'YYYY-MM-DD' (P2 settings)
  invoiceSettings: {
    invoicePrefix: 'INV-', nextInvoiceNumber: 47,
    quotePrefix: 'QU-', nextQuoteNumber: 7,
    creditNotePrefix: 'CN-', nextCreditNoteNumber: 4,
    purchaseOrderPrefix: 'PO-', nextPurchaseOrderNumber: 5,
    defaultSalesLineAmountType: 'Exclusive', defaultPurchaseLineAmountType: 'Exclusive',
    salesPaymentTerms: { day: 30, type: 'DAYSAFTERBILLDATE' },
    billsPaymentTerms: { day: 20, type: 'OFFOLLOWINGMONTH' },
    defaultBrandingThemeId: 'bt_standard'
  }
}
```

### 2.2 currentUser / users
```js
currentUser: { id: 'usr_hannah', firstName: 'Hannah', lastName: 'Clarke', name: 'Hannah Clarke', initials: 'HC',
               email: 'hannah@brightwatercreative.co.uk', role: 'Adviser', canApprove: true }
users: [
  { id: 'usr_hannah', name: 'Hannah Clarke', email: 'hannah@brightwatercreative.co.uk', role: 'Adviser' },
  { id: 'usr_tom',    name: 'Tom Reid',      email: 'tom@brightwatercreative.co.uk',    role: 'Standard' },
  { id: 'usr_priya',  name: 'Priya Shah',    email: 'priya@brightwatercreative.co.uk',  role: 'Invoice only' },
  { id: 'usr_marcus', name: 'Marcus Bell',   email: 'marcus@bellandco-accountants.co.uk', role: 'Read only' }
]
```

### 2.3 accounts (chart of accounts)
```js
{ id: 'acc_200', code: '200', name: 'Sales', type: 'REVENUE', class: 'REVENUE',
  taxType: 'OUTPUT2', description: 'Income from any normal business activity',
  status: 'ACTIVE' | 'ARCHIVED', showOnDashboard: false, enablePayments: false,
  bankAccountId: null, systemAccount: null /* 'DEBTORS'|'CREDITORS'|'GST'|'RETAINEDEARNINGS'|'ROUNDING'|'UNPAIDEXPCLM'|... */ }
```
`type` → `class` mapping: REVENUE/SALES/OTHERINCOME → REVENUE; DIRECTCOSTS/EXPENSE/OVERHEADS/DEPRECIATN → EXPENSE; BANK/CURRENT/INVENTORY/PREPAYMENT/FIXED/NONCURRENT → ASSET; CURRLIAB/LIABILITY/TERMLIAB → LIABILITY; EQUITY → EQUITY.

Report section per type: REVENUE/SALES → "Trading Income"; DIRECTCOSTS → "Cost of Sales"; OTHERINCOME → "Other Income"; EXPENSE/OVERHEADS/DEPRECIATN → "Operating Expenses"; BANK → "Bank"; CURRENT/INVENTORY/PREPAYMENT → "Current Assets"; FIXED → "Fixed Assets"; NONCURRENT → "Non-current Assets"; CURRLIAB → "Current Liabilities"; TERMLIAB/LIABILITY → "Non-current Liabilities"; EQUITY → "Equity".

Seed (UK Xero default chart, codes fixed). `taxType` default in brackets:
| Code | Name | Type | Default tax |
|---|---|---|---|
| 090 | Business Current Account | BANK | NONE (bankAccountId `ba_090`) |
| 091 | Business Savings Account | BANK | NONE (`ba_091`) |
| 092 | Company Credit Card | BANK | NONE (`ba_092`) |
| 200 | Sales | REVENUE | OUTPUT2 |
| 260 | Other Revenue | REVENUE | OUTPUT2 |
| 270 | Interest Income | OTHERINCOME | NONE |
| 310 | Cost of Goods Sold | DIRECTCOSTS | INPUT2 |
| 315 | Subcontractor Costs | DIRECTCOSTS | NONE |
| 320 | Direct Printing Costs | DIRECTCOSTS | INPUT2 |
| 400 | Advertising & Marketing | OVERHEADS | INPUT2 |
| 401 | Audit & Accountancy fees | OVERHEADS | INPUT2 |
| 404 | Bank Charges | OVERHEADS | NONE |
| 408 | Cleaning | OVERHEADS | INPUT2 |
| 412 | Consulting | OVERHEADS | INPUT2 |
| 416 | Depreciation | DEPRECIATN | NONE |
| 420 | Entertainment-100% business | OVERHEADS | INPUT2 |
| 425 | Postage, Freight & Courier | OVERHEADS | ZERORATEDINPUT |
| 429 | General Expenses | OVERHEADS | INPUT2 |
| 433 | Insurance | OVERHEADS | EXEMPTINPUT |
| 437 | Interest Paid | OVERHEADS | NONE |
| 441 | Legal Expenses | OVERHEADS | INPUT2 |
| 445 | Light, Power, Heating | OVERHEADS | INPUT2 |
| 449 | Motor Vehicle Expenses | OVERHEADS | INPUT2 |
| 453 | Office Expenses | OVERHEADS | INPUT2 |
| 461 | Printing & Stationery | OVERHEADS | INPUT2 |
| 463 | IT Software and Consumables | OVERHEADS | INPUT2 |
| 469 | Rent | OVERHEADS | EXEMPTINPUT |
| 473 | Repairs & Maintenance | OVERHEADS | INPUT2 |
| 477 | Salaries | OVERHEADS | NONE |
| 478 | Directors' Remuneration | OVERHEADS | NONE |
| 485 | Subscriptions | OVERHEADS | INPUT2 |
| 489 | Telephone & Internet | OVERHEADS | INPUT2 |
| 493 | Travel - National | OVERHEADS | INPUT2 |
| 494 | Travel - International | OVERHEADS | ZERORATEDINPUT |
| 610 | Accounts Receivable | CURRENT | NONE (systemAccount DEBTORS) |
| 620 | Prepayments | PREPAYMENT | NONE |
| 630 | Inventory | INVENTORY | NONE |
| 710 | Office Equipment | FIXED | INPUT2 |
| 711 | Less Accumulated Depreciation on Office Equipment | FIXED | NONE |
| 720 | Computer Equipment | FIXED | INPUT2 |
| 721 | Less Accumulated Depreciation on Computer Equipment | FIXED | NONE |
| 800 | Accounts Payable | CURRLIAB | NONE (CREDITORS) |
| 810 | Other Creditors | CURRLIAB | NONE |
| 820 | VAT | CURRLIAB | NONE (GST) |
| 825 | PAYE Payable | CURRLIAB | NONE |
| 830 | Corporation Tax | CURRLIAB | NONE |
| 840 | Historical Adjustment | CURRLIAB | NONE |
| 850 | Suspense | CURRLIAB | NONE |
| 860 | Rounding | CURRLIAB | NONE (ROUNDING) |
| 877 | Tracking Transfers | CURRLIAB | NONE |
| 900 | Loan | TERMLIAB | NONE |
| 950 | Capital - Ordinary Shares | EQUITY | NONE |
| 960 | Retained Earnings | EQUITY | NONE (RETAINEDEARNINGS) |
| 970 | Owner A Funds Introduced | EQUITY | NONE |

`showOnDashboard: true` for 200, 400, 469, 478 (Account watchlist). One archived account: 449 → `status:'ARCHIVED'`.

### 2.4 taxRates
```js
{ id: 'tax_output2', taxType: 'OUTPUT2', name: '20% (VAT on Income)', rate: 20, appliesTo: 'sales', status: 'ACTIVE' }
```
Seed (9): OUTPUT2 "20% (VAT on Income)" 20 · INPUT2 "20% (VAT on Expenses)" 20 · RROUTPUT "5% (VAT on Income)" 5 · RRINPUT "5% (VAT on Expenses)" 5 · ZERORATEDOUTPUT "Zero Rated Income" 0 · ZERORATEDINPUT "Zero Rated Expenses" 0 · EXEMPTOUTPUT "Exempt Income" 0 · EXEMPTINPUT "Exempt Expenses" 0 · NONE "No VAT" 0 (`appliesTo:'both'`).

### 2.5 trackingCategories, brandingThemes, contactGroups
```js
trackingCategories: [{ id: 'trk_dept', name: 'Department', status: 'ACTIVE',
  options: [{ id: 'opt_design', name: 'Design' }, { id: 'opt_marketing', name: 'Marketing' }, { id: 'opt_photo', name: 'Photography' }] }]
brandingThemes: [{ id: 'bt_standard', name: 'Standard', isDefault: true, paymentTermsText: 'Payment due within 30 days. Bank: Barclays 20-45-67 43218765' },
                 { id: 'bt_special', name: 'Special projects', isDefault: false, paymentTermsText: '50% deposit, balance on delivery.' }]
contactGroups: [{ id: 'grp_retainer', name: 'Retainer clients', contactIds: ['con_c01','con_c08'] },
                { id: 'grp_education', name: 'Education', contactIds: ['con_c01','con_c16'] },
                { id: 'grp_utilities', name: 'Utilities & premises', contactIds: ['con_s01','con_s02','con_s03'] }]
```

### 2.6 contacts
```js
{
  id: 'con_c01', name: 'Ridgeway University', accountNumber: 'RIDG01', contactStatus: 'ACTIVE' | 'ARCHIVED',
  isCustomer: true, isSupplier: false,
  firstName: 'Eleanor', lastName: 'Marsh', email: 'accounts.payable@ridgeway.ac.uk',
  phone: '0161 496 0172', mobile: '', website: 'www.ridgeway.ac.uk',
  billingAddress: { line1: 'Finance Office, Ridgeway House', line2: 'Oxford Road', city: 'Manchester', region: '', postalCode: 'M13 9PL', country: 'United Kingdom' },
  deliveryAddress: null,
  taxNumber: '',                         // contact's VAT number
  defaultSalesAccountCode: '200', defaultSalesTaxType: 'OUTPUT2',
  defaultPurchaseAccountCode: null, defaultPurchaseTaxType: null,
  salesPaymentTerms: { day: 30, type: 'DAYSAFTERBILLDATE' } | null,
  billsPaymentTerms: null,
  notes: '', starred: false,
  createdAt: '2026-04-01T08:00:00.000Z', updatedAt: '2026-04-01T08:00:00.000Z'
}
```
Payment term types: `DAYSAFTERBILLDATE` ("day(s) after the invoice date"), `DAYSAFTERBILLMONTH` ("day(s) after the end of the invoice month"), `OFCURRENTMONTH` ("of the current month"), `OFFOLLOWINGMONTH` ("of the following month").
"You owe" / "They owe" columns are derived (Σ amountDue of AUTHORISED bills / invoices).

Seed (40). Customers (`con_c01..c20`): Ridgeway University · Boom FM · City Agency · Marine Systems Ltd · Bayside Club · Hamilton Smith Ltd · Coco Café · Rex Media Group · Petrie McLoud Watson & Associates · Gateway Motors · Young Bros Transport · Basket Case · SMART Agency · Espresso 31 · Hoyt Productions · Fernhill Primary School · Port & Philip Freight · Oakleaf Organic Grocers · Kensington Dental Group · Truxton Property Management (**also supplier**, `isSupplier:true`, id `con_c20`).
Suppliers (`con_s01..s18`; the rent supplier is Truxton Property Management `con_c20`): Net Connect (s01) · PowerDirect (s02) · MCO Cleaning Services (s03) · Central Copiers (s04) · Swanston Security (s05) · Office Supplies Company (s06) · ABC Furniture (s07) · 24 Locks (s08) · Melrose Parking (s09) · Liam Patel Design (s10, freelancer, not VAT registered) · Printwell Ltd (s11) · Barclays Bank (s12) · Xero UK (s13) · Google Workspace (s14) · Adobe Systems Software Ireland (s15) · HM Revenue & Customs (s16) · Royal Mail (s17) · Amazon Business (s18).
Plus `con_x01` 'Hannah Clarke' (director, used for Directors' Remuneration), and archived `con_c99` 'Bluebell Florists' (ARCHIVED customer, no open items).
Give every contact a realistic person, email (`@<domain>.co.uk`), phone, UK address. Use the contact-specific payment terms: Ridgeway 30 days after invoice date; City Agency 30 days; Rex Media 30 days; others inherit org default.

### 2.7 items (Products and services)
```js
{ id: 'itm_design_hr', code: 'DESIGN-HR', name: 'Design – hourly rate', isSold: true, isPurchased: false,
  salesDescription: 'Graphic design services (per hour)', salesUnitPrice: 95.00, salesAccountCode: '200', salesTaxType: 'OUTPUT2',
  purchaseDescription: '', purchaseUnitPrice: null, purchaseAccountCode: null, purchaseTaxType: null,
  isTracked: false, status: 'ACTIVE' }
```
Seed (14): DESIGN-HR Design – hourly rate 95.00 · STRAT-HR Strategy consultation (per hour) 120.00 · COPY-PG Copywriting – per page 125.00 · BRAND-PKG Brand identity package 2,400.00 · WEB-BUILD Website build (fixed fee) 4,800.00 · HOSTING Website hosting (annual) 240.00 · SEO-AUDIT SEO audit 750.00 · RETAINER Monthly marketing retainer 1,500.00 · SOCIAL-MGMT Social media management (monthly) 900.00 · PHOTO-DAY Photography – day rate 650.00 · PHOTO-HALF Photography – half day 400.00 · PRINT-A5 A5 flyers (per 500) 85.00 · purchased-only: PAPER-A4 A4 paper (box of 5 reams) purchase 24.00 acct 461 · INK-CART Printer ink cartridge purchase 48.00 acct 461 (isSold false, isPurchased true).

### 2.8 invoices (sales, ACCREC) and bills (purchases, ACCPAY) — same shape
```js
{
  id: 'inv_0031', type: 'ACCREC',                 // bills: type 'ACCPAY', id 'bill_0001'
  invoiceNumber: 'INV-0031',                      // bills: '' (Xero bills use reference)
  reference: 'Retainer Oct 2026',                 // bills: supplier's invoice number e.g. 'NC-88213'
  contactId: 'con_c01', contactName: 'Ridgeway University',   // name snapshot
  date: '2026-10-12', dueDate: '2026-11-11',
  plannedPaymentDate: null,                       // bills only (P2 "Schedule payment")
  expectedPaymentDate: null,                      // invoices only (P2)
  brandingThemeId: 'bt_standard', currencyCode: 'GBP',
  lineAmountTypes: 'Exclusive' | 'Inclusive' | 'NoTax',
  lineItems: [{
    id: 'li_0031_1', itemCode: 'RETAINER', description: 'Monthly marketing retainer – October 2026',
    quantity: 1, unitAmount: 1500.00, discountRate: 0,      // percent
    accountCode: '200', taxType: 'OUTPUT2', taxAmount: 300.00, lineAmount: 1500.00,
    tracking: []                                            // [{categoryId, optionId}] P2
  }],
  subTotal: 1500.00, totalTax: 300.00, total: 1800.00,      // subTotal is ALWAYS net of tax
  amountPaid: 0, amountCredited: 0, amountDue: 1800.00,
  status: 'DRAFT' | 'SUBMITTED' | 'AUTHORISED' | 'PAID' | 'VOIDED' | 'DELETED',
  sentToContact: false, sentAt: null,                       // invoices
  fullyPaidOnDate: null,
  creditNoteIds: [], paymentIds: [],
  attachments: [],                                          // [{url, original_name, size, content_type}] via /upload (P2)
  createdAt, createdBy, updatedAt, updatedBy,
  submittedAt: null, submittedBy: null, approvedAt: null, approvedBy: null,
  voidedAt: null, voidedBy: null, voidReason: null, deletedAt: null
}
```
**Line math** (`src/utils/money.js`, pure):
- `gross = round2(quantity * unitAmount * (1 - discountRate/100))`.
- Exclusive: `lineAmount = gross`; `taxAmount = round2(lineAmount * rate/100)`.
- Inclusive: `lineAmount = gross` (includes VAT); `taxAmount = round2(lineAmount - lineAmount / (1 + rate/100))`.
- NoTax: `taxAmount = 0`, `taxType = 'NONE'`.
- `totalTax = Σ taxAmount`; Exclusive/NoTax: `subTotal = Σ lineAmount`, `total = subTotal + totalTax`; Inclusive: `total = Σ lineAmount`, `subTotal = total - totalTax`.
- `amountDue = round2(total - amountPaid - amountCredited)`; status → `PAID` and `fullyPaidOnDate = payment.date` when `amountDue === 0` and status was AUTHORISED.

**Status rules**
| From | Action | To | Notes |
|---|---|---|---|
| (new) | Save & close / Save draft | DRAFT | number assigned at creation for invoices |
| (new)/DRAFT | Submit for approval | SUBMITTED | "Awaiting Approval" |
| (new)/DRAFT/SUBMITTED | Approve / Approve & email | AUTHORISED | "Awaiting Payment"; requires contact, ≥1 line with account, dueDate |
| AUTHORISED | Payment(s) total = total | PAID | |
| PAID | Remove payment | AUTHORISED | payment.status → DELETED |
| AUTHORISED (no payments) | Void | VOIDED | voidReason optional |
| DRAFT/SUBMITTED | Delete | DELETED | kept in array, hidden from lists ("Deleted" only via search P2) |
| AUTHORISED | Edit | AUTHORISED | allowed if no payments; history "Edited" |
Display labels: DRAFT "Draft", SUBMITTED "Awaiting Approval", AUTHORISED "Awaiting Payment" (+ "Overdue" if dueDate < today), PAID "Paid", VOIDED "Voided".

### 2.9 payments
```js
{
  id: 'pay_0042', type: 'ACCRECPAYMENT' | 'ACCPAYPAYMENT' | 'ARCREDITPAYMENT',
  documentType: 'invoice' | 'bill' | 'creditNote', documentId: 'inv_0027', documentNumber: 'INV-0027',
  contactId: 'con_c02', bankAccountId: 'ba_090',
  date: '2026-11-05', amount: 3240.00, reference: 'Boom FM BACS',
  isReconciled: false, statementLineId: null,
  batchPaymentId: null,
  source: 'manual' | 'reconcile' | 'batch',
  status: 'AUTHORISED' | 'DELETED',
  createdAt, createdBy, deletedAt: null, deletedBy: null
}
```

### 2.10 batchPayments
```js
{ id: 'bp_0001', type: 'PAYBATCH', bankAccountId: 'ba_090', date: '2026-07-31', reference: 'July suppliers',
  paymentIds: ['pay_…','pay_…'], billIds: ['bill_…','bill_…'], total: 212.40,
  isReconciled: true, statementLineId: 'bsl_090_…', createdAt, createdBy }
```
Whole-batch removal adds `status:'DELETED'`, `deletedAt`, and `deletedBy` while
preserving `billIds`, `paymentIds`, and `total` for audit history.

### 2.11 bankAccounts
```js
{ id: 'ba_090', accountCode: '090', name: 'Business Current Account', type: 'BANK' | 'CREDITCARD',
  bankName: 'Barclays', sortCode: '20-45-67', accountNumber: '43218765', currencyCode: 'GBP',
  openingStatementBalance: 24350.00, openingBalanceDate: '2026-03-31',
  feedStatus: 'connected', showOnDashboard: true, status: 'ACTIVE' }
```
Seed: `ba_090` Business Current Account (Barclays 20-45-67 / 43218765, opening 24,350.00) · `ba_091` Business Savings Account (Barclays 20-45-67 / 73920184, opening 40,000.00) · `ba_092` Company Credit Card (type CREDITCARD, Barclaycard ending 4417, opening 0.00, showOnDashboard false).
- **Statement balance** (derived) = `openingStatementBalance + Σ amount` of that account's statement lines with `status !== 'deleted'`; date = latest line date.
- **Balance in Xero** (derived) = ledger balance of `accountCode` (all posted Xero transactions incl. unreconciled).

### 2.12 bankStatementLines
```js
{
  id: 'bsl_090_101', bankAccountId: 'ba_090', date: '2026-11-03',
  amount: 1800.00,                       // + received, − spent
  payee: 'RIDGEWAY UNIVERSITY', reference: 'INV-0031', description: 'BACS CREDIT', type: 'CREDIT' | 'DEBIT',
  status: 'unreconciled' | 'reconciled' | 'deleted',
  reconciliation: null | {
    method: 'match' | 'create' | 'transfer' | 'findmatch',
    matched: [{ kind: 'payment' | 'bankTransaction' | 'bankTransfer' | 'batchPayment', id: 'pay_…', amount: 1800.00 }],
    adjustments: [{ kind: 'bankFee' | 'minorAdjustment', bankTransactionId: 'btx_…', amount: -6.00 }],
    reconciledAt: ISO, reconciledBy: 'usr_hannah'
  },
  discussNote: '',                       // Discuss tab text
  discussUpdatedAt: null,
  importedAt: '2026-11-03T06:00:00.000Z', source: 'feed' | 'import',
  deletedAt: null
}
```

### 2.13 bankTransactions (Spend money / Receive money)
```js
{
  id: 'btx_0061', type: 'SPEND' | 'RECEIVE', bankAccountId: 'ba_090',
  contactId: 'con_s12', contactName: 'Barclays Bank', date: '2026-11-07', reference: 'Monthly fee',
  lineAmountTypes: 'Inclusive' | 'Exclusive' | 'NoTax',   // reconcile Create defaults to 'Inclusive'
  lineItems: [{ id, description: 'Bank charges November', quantity: 1, unitAmount: 18.50,
                accountCode: '404', taxType: 'NONE', taxAmount: 0, lineAmount: 18.50, tracking: [] }],
  subTotal: 18.50, totalTax: 0, total: 18.50,             // total is always positive; direction from type
  isReconciled: true, statementLineId: 'bsl_090_105',
  source: 'reconcile-create' | 'reconcile-adjustment' | 'manual' | 'bank-rule',
  bankRuleId: null,
  status: 'AUTHORISED' | 'DELETED',
  createdAt, createdBy, updatedAt
}
```
Reconcile Create form maps: Who → contactId, What → lineItems[0].accountCode, Why → lineItems[0].description, VAT → lineItems[0].taxType; amount = |statement amount|, Inclusive.

### 2.14 bankTransfers
```js
{ id: 'btr_0009', fromBankAccountId: 'ba_090', toBankAccountId: 'ba_091', date: '2026-11-09', amount: 5000.00,
  reference: 'Transfer to savings',
  fromIsReconciled: true, fromStatementLineId: 'bsl_090_110',
  toIsReconciled: false, toStatementLineId: null,
  createdAt, createdBy, source: 'reconcile-transfer' | 'manual' }
```

### 2.15 bankRules (P2)
```js
{ id: 'rule_001', name: 'Barclays monthly charges', type: 'SPEND' | 'RECEIVE' | 'TRANSFER', bankAccountId: null /* any */,
  conditions: [{ field: 'payee' | 'reference' | 'description' | 'amount', operator: 'contains' | 'equals' | 'startsWith', value: 'BARCLAYS' }],
  matchAll: true,
  contactId: 'con_s12', lines: [{ accountCode: '404', taxType: 'NONE', description: 'Bank charges', percent: 100 }],
  referenceSource: 'payee', status: 'ACTIVE', createdAt, createdBy }
```
Seed: Barclays fees → 404 NONE; "PRET" → 420 INPUT2 (contact created on the fly 'Pret A Manger'); "GOOGLE" → 485 INPUT2 contact con_s14. Bank-rule suggestions show in the Create tab as "Bank rule: <name>" prefilled (P2).

### 2.16 manualJournals
```js
{ id: 'mj_0001', narration: 'Conversion balances', date: '2026-03-31', status: 'POSTED' | 'DRAFT' | 'VOIDED',
  showOnCashBasis: true,
  lines: [{ id, accountCode: '090', description: '', taxType: 'NONE', debit: 24350.00, credit: 0 }, …],
  createdAt, createdBy }
```
Seed:
- `mj_0001` "Conversion balances" 2026-03-31 POSTED: Dr 090 24,350.00 · Dr 091 40,000.00 · Dr 720 8,600.00 · Cr 950 1,000.00 · Cr 960 71,950.00.
- `mj_0002` "Depreciation Apr–Sep 2026" 2026-09-30 POSTED: Dr 416 860.00 · Cr 721 860.00.

### 2.17 savedReports (Reports workflow output)
```js
{
  id: 'rep_0001', reportType: 'ProfitAndLoss' | 'BalanceSheet' | 'AgedReceivablesSummary' | 'AgedReceivablesDetail'
                         | 'AgedPayablesSummary' | 'AgedPayablesDetail' | 'BankReconciliationSummary' | 'TrialBalance'
                         | 'AccountTransactions' | 'VatReturn',
  title: 'Profit and Loss – Q1 FY27',
  status: 'draft' | 'published' | 'archived',
  settings: {
    fromDate: '2026-04-01', toDate: '2026-06-30',     // period reports
    asAtDate: null,                                   // BS / TB / aged / bank rec
    compare: { periods: 0, periodType: 'month' | 'quarter' | 'year' },
    basis: 'accrual' | 'cash',
    bankAccountId: null, accountCode: null, contactId: null,
    ageingBy: 'dueDate' | 'invoiceDate', ageingPeriods: 4, ageingPeriodLength: 'month',
    showTotalColumn: false, showYtdColumn: false, hideZeroRows: true
  },
  columns: ['Apr–Jun 2026'],                          // column labels in the snapshot
  summary: {                                          // headline numbers for verifiers
    // ProfitAndLoss: totalTradingIncome, totalCostOfSales, grossProfit, totalOtherIncome, totalOperatingExpenses, netProfit
    // BalanceSheet:  totalBank, totalCurrentAssets, totalFixedAssets, totalAssets, totalCurrentLiabilities, totalLiabilities, netAssets, totalEquity
    // Aged*:         total, current, lt1Month, month1, month2, month3, older
    // BankReconciliationSummary: balanceInXero, outstandingPayments, outstandingReceipts, unreconciledStatementLines, statementBalance
    // TrialBalance: totalDebits, totalCredits
  },
  rows: [{ section: 'Trading Income', accountCode: '200', accountName: 'Sales', amounts: [21500.00] }, …],
  note: '',                                           // optional report note ("Add note" in report)
  createdAt, createdBy, updatedAt,
  publishedAt: null, publishedBy: null
}
```
Seed (3, snapshots computed in seed.js with the pure ledger builders):
- `rep_0001` P&L 2026-04-01→2026-06-30, accrual, no compare, **published** 2026-07-10T10:30:00Z by usr_hannah, title "Profit and Loss – Q1 FY27".
- `rep_0002` Balance Sheet as at 2026-09-30, **draft** 2026-10-08 by usr_tom, title "Balance Sheet – 30 Sep 2026".
- `rep_0003` Aged Receivables Summary as at 2026-10-31, ageing by due date, **published** 2026-11-02 by usr_hannah.

### 2.18 reportExports
```js
{ id: 'rx_…', reportType: 'ProfitAndLoss', savedReportId: null, format: 'PDF' | 'Excel' | 'Google Sheets',
  settings: {…same as savedReports.settings}, fileName: 'Brightwater Creative Ltd - Profit and Loss.csv',
  summary: {…}, createdAt, createdBy }
```

### 2.19 historyEvents ("History & Notes")
```js
{ id: 'hist_…', entityType: 'invoice' | 'bill' | 'contact' | 'bankTransaction' | 'bankTransfer' | 'payment' | 'statementLine'
                         | 'creditNote' | 'quote' | 'purchaseOrder' | 'manualJournal' | 'report' | 'bankAccount',
  entityId: 'inv_0031', action: 'Created' | 'Edited' | 'Submitted' | 'Approved' | 'Sent' | 'Payment received' | 'Payment made' | 'Paid'
                         | 'Payment removed' | 'Voided' | 'Deleted' | 'Note' | 'Reconciled' | 'Unreconciled' | 'Published' | 'Archived' | 'Restored' | 'Refreshed',
  details: 'INV-0031 to Ridgeway University for 1,800.00.', userId: 'usr_hannah', userName: 'Hannah Clarke',
  createdAt: ISO }
```
Seed: deterministic events for each invoice/bill (Created, Approved, Sent, Paid as applicable) with fixed timestamps derived from the document date at 09:00Z.

### 2.20 emailLog
```js
{ id: 'em_…', documentType: 'invoice' | 'statement' | 'quote' | 'purchaseOrder' | 'remittance', documentId: 'inv_0047',
  to: ['accounts.payable@ridgeway.ac.uk'], cc: [], subject: 'Invoice INV-0047 from Brightwater Creative Ltd for Ridgeway University',
  body: 'Hi Eleanor,\n\nHere\'s invoice INV-0047 for GBP 1,800.00.\n…', attachPdf: true, sendMeACopy: false,
  sentAt: ISO, sentBy: 'usr_hannah' }
```

### 2.21 Other P2 entities
- **creditNotes**: same as invoices with `type: 'ACCRECCREDIT'|'ACCPAYCREDIT'`, `creditNoteNumber: 'CN-0001'`, `allocations: [{ id, invoiceId, amount, date, createdAt, createdBy }]`, `remainingCredit`, `amountDue` (equal to remainingCredit), `fullyPaidOnDate` (allocation date when settled), `updatedAt/By`. Approved notes with credit remaining are AUTHORISED (Awaiting Payment, never Overdue); fully allocated notes are PAID. Seed 3 (CN-0001 Basket Case 120.00 DRAFT unallocated; CN-0002 Hamilton Smith 60.00 PAID, fully allocated to INV-0007, amountDue 0, fullyPaidOnDate 2026-06-10; CN-0003 supplier credit from Office Supplies Company 14.40 AUTHORISED unallocated).

  The list and header display older AUTHORISED notes with allocations and zero `remainingCredit` as Paid. This display fallback leaves stored records untouched. Editor saves synchronize `fullyPaidOnDate` with the saved status. A copy saved as draft starts with its full credit, empty allocations and `fullyPaidOnDate: null`.
- **quotes**: `{ id, quoteNumber:'QU-0006', contactId, date, expiryDate, title, summary, reference, lineAmountTypes, lineItems, subTotal, totalTax, total, status:'DRAFT'|'SENT'|'ACCEPTED'|'DECLINED'|'INVOICED', invoiceId, createdAt, … }` Seed 6 covering every status; INVOICED `qu_0005` links to Bayside Club invoice `inv_0046`.
- **purchaseOrders**: `{ id, purchaseOrderNumber:'PO-0004', contactId, date, deliveryDate, deliveryAddress, attentionTo, reference, lineItems, totals, status:'DRAFT'|'SUBMITTED'|'AUTHORISED'|'BILLED', billId, … }` Seed 4; BILLED `po_0004` links to Office Supplies Company bill `bill_0027`.
- **repeatingInvoices**: `{ id, templateInvoice:{contactId, lineItems,…}, schedule:{ period:1, unit:'MONTHLY'|'WEEKLY', dueDateDay, dueDateType, startDate, nextScheduledDate, endDate }, saveAs:'DRAFT'|'AUTHORISED'|'AUTHORISED_SEND', status:'ACTIVE'|'PAUSED'|'DELETED' }` Seed 2 (Ridgeway retainer, Rex Media social). Generating invoices from schedules must happen only on a user click ("Create invoice now"), never automatically.
- **dashboardLayout**: `{ widgets: ['bank_ba_090','bank_ba_091','invoicesOwed','billsToPay','cashInOut','profitLoss','watchlist','tasks','recentPayments'], hidden: [] }`.

## Observable State Changes (for LLM evaluation)

| User action (UI) | Writes |
|---|---|
| Invoice editor → **Save & close** (new) | `invoices[+]` {status:'DRAFT', invoiceNumber, lineItems, subTotal/totalTax/total, amountDue, createdAt, createdBy}; `organisation.invoiceSettings.nextInvoiceNumber`++; `historyEvents[+]` {entityType:'invoice', action:'Created'} |
| Invoice editor → **Submit for approval** | invoice.status='SUBMITTED', submittedAt/By; history 'Created' (new) or 'Edited' (existing), plus 'Submitted' when entering SUBMITTED; no duplicate Submitted event on unchanged-status edits |
| Invoice editor/view → **Approve** | invoice.status='AUTHORISED', approvedAt/By; history 'Approved' when entering AUTHORISED; editor also writes 'Created' (new) or 'Edited' (existing); no duplicate Approved event on unchanged-status edits |
| **Approve & email** / view → **Email** → Send | invoice.status='AUTHORISED' (if not already), sentToContact=true, sentAt; `emailLog[+]` {documentType:'invoice', documentId, to, subject, body}; history 'Sent' |
| Invoice view → **Mark as sent** (or bulk) / **Mark as unsent** | `sentToContact` true / false, `sentAt` ISO timestamp / null, history `Sent` / `Marked as unsent` |
| Invoice edit → **Save** (existing) | invoice fields + recomputed totals, updatedAt/By; approvedAt/By and submittedAt/By preserved when status is unchanged (also for bills); history 'Edited' |
| Invoice view → **Record payment** (Amount, Date paid, Paid to, Reference → Add payment) | `payments[+]` {type:'ACCRECPAYMENT', documentType:'invoice', documentId, bankAccountId, date, amount, reference, isReconciled:false, source:'manual'}; invoice.amountPaid/amountDue, paymentIds, status→'PAID' & fullyPaidOnDate when settled; history 'Payment received' / 'Paid' |
| Payment → **Remove payment** | payment.status='DELETED', deletedAt/By; document amountPaid/amountDue restored, status PAID→AUTHORISED; if it was reconciled its statement line → status 'unreconciled', reconciliation=null; history 'Payment removed' |
| Invoice → **Void** | status='VOIDED', voidedAt/By, voidReason; history 'Voided' |
| Draft/Submitted → **Delete** | status='DELETED', `deletedAt`, `deletedBy`, history 'Deleted' |
| Invoice list bulk **Approve** / **Delete** / **Mark as sent** | same per-record writes as single actions, one history event per invoice |
| Bill editor → Save draft / Submit / Approve | `bills[+]` or bill update, same fields/status rules as invoices (type 'ACCPAY', invoiceNumber always '', supplier bill number in reference); sales nextInvoiceNumber unchanged; history 'Created'/'Edited' details use reference, plus 'Submitted'/'Approved' when entering that status |
| Bill view → **Make a payment** (Amount paid, Date paid, Paid from, Reference) | `payments[+]` {type:'ACCPAYPAYMENT', documentType:'bill', documentNumber:bill.reference, …}; bill.amountPaid/amountDue/status; history 'Payment made' for partial / 'Paid' for full payment (also for batch/reconcile payments) |
| Bills list → select → **Make payment → Batch payment** → Make payments | `batchPayments[+]` {bankAccountId, date, reference, billIds, paymentIds, total}; one `payments[+]` per bill with batchPaymentId, source:'batch'; each bill amountPaid/amountDue/status |
| Bills list → **Schedule payment** (P2) | bill.plannedPaymentDate |
| Reconcile → Match suggestion → **OK** | statementLine.status='reconciled', reconciliation {method:'match', matched:[{kind,id,amount}], reconciledAt, reconciledBy}; matched payment/bankTransaction/transfer side isReconciled=true + statementLineId; if matched an outstanding invoice/bill: `payments[+]` {source:'reconcile', isReconciled:true, statementLineId} and document paid/amountDue updated |
| Reconcile → **Find & Match** → select items (+ optional amount edit / adjustment) → **Reconcile** | as above with method:'findmatch', matched[] ≥1 (part-payment amounts as edited); adjustments → `bankTransactions[+]` {source:'reconcile-adjustment', accountCode 404 (bank fee) or 860 (minor adjustment)} listed in reconciliation.adjustments |
| Reconcile → **Create** (Who/What/Why/VAT) → OK | `bankTransactions[+]` {type SPEND/RECEIVE, bankAccountId, contactId, date=line.date, lineAmountTypes:'Inclusive', lineItems[0]{accountCode, taxType, description, lineAmount=|amount|}, totals, isReconciled:true, statementLineId, source:'reconcile-create'}; statement line reconciled {method:'create'}; new contact if typed → `contacts[+]` |
| Reconcile → **Transfer** (account, description) → OK | `bankTransfers[+]` {from/to by sign, amount, date, fromIsReconciled/toIsReconciled for this side, statement line id}; statement line reconciled {method:'transfer'} |
| Reconcile → **Discuss** → Save | `bankStatementLines[].discussNote`, `discussUpdatedAt`, `discussUpdatedBy` |
| Bank statements tab → **Delete** line (P2) / Restore | statementLine.status='deleted' / 'unreconciled', deletedAt |
| Account transactions → **Unreconcile** / Remove & Redo | statement line → 'unreconciled', reconciliation=null; linked item isReconciled=false, statementLineId=null (Remove & Redo also deletes reconcile-created bankTransaction/payment → status 'DELETED'); history 'Unreconciled' |
| Spend money / Receive money form → Save | `bankTransactions[+]` {source:'manual', isReconciled:false} |
| Transfer money form → Save | `bankTransfers[+]` {source:'manual', both sides isReconciled:false} |
| Bank account → **Mark as reconciled** (P2 bulk on Account transactions) | item isReconciled=true (no statement line) |
| Report → **Save as draft** | `savedReports[+]` {reportType, title, status:'draft', settings, columns, rows, summary, createdAt, createdBy}; history {entityType:'report', action:'Created'} |
| Report → **Publish** | savedReports record status='published', publishedAt/By (new record if not saved yet); history 'Published' |
| Saved report → **Archive** / **Restore** / **Delete** / **Edit title & note** / **Refresh with latest data** | status='archived' & previousStatus / status restored from previousStatus / removed from array / title, note / settings, columns, rows, summary; updatedAt; history 'Archived' / 'Restored' / no history on delete / 'Edited' / 'Refreshed' |
| Report → **Export** → PDF / Excel / Google Sheets | `reportExports[+]` {reportType, savedReportId, format, settings, summary, fileName, createdAt, createdBy}. The record is currently written before the Excel download or PDF print call. |
| Report centre → ☆ star toggle | `favouriteReports` add/remove reportType |
| Contact → **New contact** / Edit / Archive / Restore / Add to group | `contacts[+]` / contact fields, updatedAt / contactStatus / `contactGroups[].contactIds` |
| Products & services → New/Edit/Delete item | `items` |
| Chart of accounts → Add/Edit/Archive account (P2) | `accounts` (code unique, validated) |
| Quote → Save/Send/Mark accepted/declined/Create invoice (P2) | `quotes` status; save logs `Created`/`Edited`, send logs `Sent` with `emailLog[+]`, accepted/declined log `Accepted`/`Declined`. Create invoice → `invoices[+]` + quote.status='INVOICED', invoiceId, updatedAt/By; invoice history `Created`, quote history `Invoiced` with details=invoiceId. Repeat conversion is rejected without writes if invoiceId/billId exists or status is INVOICED/BILLED, including injected records missing their link. |
| Credit note → Save/Approve/Allocate (P2) | `creditNotes`; editor synchronises remainingCredit/amountDue and logs `Created`/`Edited`, plus `Submitted`/`Approved` when entering SUBMITTED/AUTHORISED (including create-and-approve; unchanged-status edits add no duplicate transition event); view Approve logs `Approved`. Allocation appends creditNote.allocations `{id, invoiceId, amount, date, createdAt, createdBy}`, reduces remainingCredit and amountDue, sets status='PAID' and fullyPaidOnDate=allocation date when remainingCredit is zero, and writes updatedAt/By. Invoice amountCredited/amountDue/creditNoteIds/updatedAt/By change; if settled, status='PAID' and fullyPaidOnDate are set. Both entities receive `historyEvents[+]` action `Credit allocated`; credit-note details include amount and invoice id. History includes entityType/entityId, userId/userName and createdAt. Rejected allocations write nothing. |
| Purchase order → Save/Send/Approve/Copy to bill (P2) | `purchaseOrders`; editor logs `Created`/`Edited`, plus `Submitted`/`Approved` on entry to SUBMITTED/AUTHORISED (no duplicate transition event on unchanged-status edits); view Approve logs `Approved`; send adds `emailLog[+]` and history `Sent`. Copy to bill → `bills[+]`, po.status='BILLED', billId, updatedAt/By; bill history `Created`, PO history `Copied to bill` with details=billId. Repeat conversion rejected without writes by linked id or INVOICED/BILLED status |
| Quote / Purchase order / Credit note → Delete (P2) | document.status='DELETED', deletedAt, updatedAt/By; history `Deleted` (credit notes with allocations reject deletion without writes) |
| Manual journal → Post (P2) | `manualJournals[+]` (debits = credits enforced) |
| Bank rule → Save (P2) | `bankRules[+]` |
| Settings → Organisation details / Invoice settings / Financial settings (P2) | `organisation` fields |
| Homepage → Edit homepage → Save (P2) | `dashboardLayout` |
| Any document → **Add note** (History & Notes) | `historyEvents[+]` {action:'Note', details:text} |


## Implemented extensions and exact mutation notes

All 30 top-level keys above are present in the default world. `reduceAction` in
`src/store/reducer.js` is the mutation boundary. StoreContext normally writes one
full snapshot per dispatch. Some UI actions dispatch multiple times. Reducer
validation that throws before dispatch completes leaves the previous snapshot
intact. Reports and balances are calculated during rendering. See AUDIT.md
for incomplete attribution and export failure behavior.

Optional fields introduced by implemented features:

- `bankRules[].transferBankAccountId` selects the other account for a transfer rule.
  `bankTransfers[].bankRuleId` links the resulting transfer to that rule.
- `bankTransactions[].bankRuleId` links a rule-created spend/receipt. Multiple
  percentage allocations are represented as separate `lineItems` whose inclusive
  amounts sum to the bank statement amount.
- `savedReports[].previousStatus` preserves the status used by Archive → Restore.
  Snapshot rows may include `heading`, `total`, `percentage`, `contactId`,
  `documentId`, `documentNumber`, `contactName`, `date`, `dueDate`, `reference`,
  `overdueDays`, `sourceType`, `sourceName`, `sourceId`, `debit`, `credit`, and
  `tracking` in addition to `accountCode`, `accountName`, `amounts`.
- `savedReports[].settings.trackingOptionId` filters Profit and Loss by a
  Department option. `VatReturn` summaries contain numeric `box1` … `box9`.
  Executive Summary combines P&L and Balance Sheet summary fields; General
  Ledger Summary uses an empty summary object and its stored rows.
- `repeatingInvoices[].schedule.dueDateDay` and `dueDateType` specify payment
  terms for generated invoices. Generation only occurs when the user clicks.
- `bankTransfers[].status` and `batchPayments[].status` can be `DELETED`.
  Bank items marked reconciled without a statement line carry `reconciledAt/By`.
- `bankStatementLines[].discussUpdatedBy` records discussion authorship;
  imported lines also carry `importedBy`.

| Additional user action | Exact observable writes |
| --- | --- |
| Repeating invoice → Save/Pause/Resume/Delete | `repeatingInvoices` record fields, `status` (`ACTIVE`/`PAUSED`/`DELETED`), `createdAt/By` or `updatedAt/By` |
| Repeating invoice → Create invoice now | `invoices[+]`; `organisation.invoiceSettings.nextInvoiceNumber`; `repeatingInvoices[].schedule.nextScheduledDate`; `historyEvents[+]` |
| Bank rule → Save/Delete | `bankRules[+]`/record update/removal; save validates allocation percentages total 100 and account references |
| Cash coding → Save & reconcile | One `bankTransactions[+]` and `bankStatementLines[].reconciliation` per selected line; optional new `contacts`; history records |
| Import statement CSV | `bankStatementLines[+]` with `source:'import'`, `status:'unreconciled'`, `importedAt/By`; exact duplicates skipped |
| Add bank account | `bankAccounts[+]` and matching `accounts[+]` with related `bankAccountId` |
| Mark bank items as reconciled | Item/transfer-side reconciled flags and `reconciledAt/By`; batch member payment flags also updated |
| Remove batch payment | Batch `status:'DELETED'`, `deletedAt/By`, original billIds/paymentIds/total retained; member payment `status:'DELETED'`, `deletedAt/By`; bill totals/payment ids restored; matched statement line unreconciled. Removing an individual payment instead reduces the active batch's ids and total. |
| Add details → Save on a statement line | `bankTransactions[+]`, matched `bankStatementLines[].reconciliation`; validation is atomic with creation |
| File upload → Attach | `invoices[].attachments`, `bills[].attachments`, or `bankTransactions[].attachments` append returned upload metadata; `updatedAt/By` |
| Chart watchlist star | `accounts[].showOnDashboard` |
| Edit account code | `accounts` plus related document lines, journals, rules, repeating templates, item defaults, and contact defaults change to the new code |
| Invoice settings → Save | `organisation.invoiceSettings`, `organisation.updatedAt/By`, `brandingThemes` payment terms text |
| Tax rates → Save | `taxRates[+]` with generated `id/taxType`, numeric `rate`, `appliesTo`, `status:'ACTIVE'`, `createdAt/By` |
| Tracking option → Add/Rename | `trackingCategories[].options[+]` or `.options[].name` |
| Homepage → Save layout | `dashboardLayout.widgets` order and `.hidden` ids |
| Contact star | `contacts[].starred`, `updatedAt/By` |
| Bill schedule payment | `bills[].plannedPaymentDate` |

Exports preserve the applied settings and summary; changing toolbar controls
without clicking Update does not change the displayed report or persisted
state. CSV/list exports, searches, filters, modal cancellation, print views,
help, navigation, and page rendering are read-only. PDF export records an
export and opens the browser print dialog. Excel export downloads CSV; Google
Sheets records the export and shows a local toast, as specified in TODO.md.

## Validation and acceptance status

`npm run check:seed`, `check:workflows`, `check:secondary`, `check:render`,
`check:preview`, and `check:runtime` document the available developer checks.
See `TEST.md` for workflow acceptance evidence and `AUDIT.md` for the current build, runtime and verification status.
