# Xero mock — Data Model

> Source of truth for `src/data/seed.js` (`createInitialData()`), the store, `src/utils/ledger.js`
> and `SCHEMA.md`. Field names loosely follow the Xero Accounting API (camelCased) so tasks
> read naturally to people who know Xero. APP key for dataManager: **`'xero'`**.

## 0. Global conventions

- **IDs**: fixed string ids in seed (`con_c01`, `inv_0031`, `bill_0012`, `pay_0007`, `bsl_090_071`…). New records: `${prefix}_${Date.now().toString(36)}${counter}` (no randomness needed; must be unique).
- **Dates**: business dates as `'YYYY-MM-DD'` strings. Audit timestamps (`createdAt`, `updatedAt`, `approvedAt`, `reconciledAt`…) as ISO strings from `new Date().toISOString()` at the moment of the user action. Seed audit timestamps are fixed ISO strings (e.g. `'2026-10-12T09:14:00.000Z'`).
- **Money**: JS numbers rounded to 2 dp via `round2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100`. Never strings, never floats like 0.30000000000000004.
- **Currency**: everything GBP (`currencyCode: 'GBP'`). Multi-currency is out of scope.
- **Actor**: every created/changed record carries `createdBy` / `updatedBy` / `approvedBy` / `reconciledBy` = `currentUser.id` (`'usr_hannah'`) and, where helpful, a name snapshot.
- **Derived, never stored**: "Overdue" (status AUTHORISED && dueDate < today from `new Date()`), account balances, report figures (except snapshots in `savedReports`), dashboard numbers, "Reconcile N items" counts. Do **not** write derived values into state on load.
- **Robustness**: every array may be empty or missing; every optional field may be missing. Use `(state.invoices || [])` patterns and default rendering for missing contact/account (`'(Unknown contact)'`).
- **seed.js must be pure ESM** importable from Node (`vite.config.js` imports it): no `window`, `localStorage`, CSS/asset imports, no `new Date()`/`Math.random()` for values. It may import pure helpers from `src/utils/ledger.js` / `src/utils/money.js`.

## 1. Top-level state shape

```js
{
  organisation: {...},          // object (merges)
  currentUser: {...},           // object
  users: [],                    // 4
  accounts: [],                 // chart of accounts, 54
  taxRates: [],                 // 9
  trackingCategories: [],       // 1 (P2 usage)
  brandingThemes: [],           // 2
  contactGroups: [],            // 3
  contacts: [],                 // 40
  items: [],                    // 14  (Products and services)
  invoices: [],                 // 46  sales invoices (ACCREC)
  bills: [],                    // 35  supplier bills (ACCPAY)
  creditNotes: [],              // 3   (P2 UI)
  quotes: [],                   // 6   (P2 UI)
  purchaseOrders: [],           // 4   (P2 UI)
  repeatingInvoices: [],        // 2   (P2 UI)
  payments: [],                 // ~46 payments against invoices/bills (one per paid doc; 2 inside the batch)
  batchPayments: [],            // 1
  bankAccounts: [],             // 3
  bankStatementLines: [],       // ~133 imported statement lines (~108 reconciled + 25 unreconciled)
  bankTransactions: [],         // ~49 spend/receive money
  bankTransfers: [],            // 8 (2 savings + 6 card repayments)
  bankRules: [],                // 3   (P2 UI)
  manualJournals: [],           // 2   (conversion balances + 1 depreciation)
  savedReports: [],             // 3   draft/published report snapshots
  reportExports: [],            // 0
  favouriteReports: [],         // ['ProfitAndLoss','BalanceSheet','AgedReceivablesSummary']
  historyEvents: [],            // audit trail for documents ("History & Notes")
  emailLog: [],                 // mock record of "sent" invoices/statements (no real email)
  dashboardLayout: {...}        // object: widget order/visibility (P2 edit homepage)
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
  paymentIds: ['pay_…','pay_…'], billIds: ['bill_…','bill_…'], total: 1316.40,
  isReconciled: true, statementLineId: 'bsl_090_…', createdAt, createdBy }
```

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
  settings: {…same as savedReports.settings}, fileName: 'Brightwater Creative Ltd - Profit and Loss.xlsx',
  summary: {…}, createdAt, createdBy }
```

### 2.19 historyEvents ("History & Notes")
```js
{ id: 'hist_…', entityType: 'invoice' | 'bill' | 'contact' | 'bankTransaction' | 'bankTransfer' | 'payment' | 'statementLine'
                         | 'creditNote' | 'quote' | 'purchaseOrder' | 'manualJournal' | 'report' | 'bankAccount',
  entityId: 'inv_0031', action: 'Created' | 'Edited' | 'Submitted' | 'Approved' | 'Sent' | 'Payment received' | 'Paid'
                         | 'Payment removed' | 'Voided' | 'Deleted' | 'Note' | 'Reconciled' | 'Unreconciled' | 'Published' | 'Archived',
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
- **creditNotes**: same as invoices with `type: 'ACCRECCREDIT'|'ACCPAYCREDIT'`, `creditNoteNumber: 'CN-0001'`, `allocations: [{ id, invoiceId, amount, date, createdAt }]`, `remainingCredit`. Seed 3 (CN-0001 Basket Case 120.00 allocated to nothing (remaining 120.00); CN-0002 Hamilton Smith 60.00 fully allocated to INV-0007; CN-0003 supplier credit from Office Supplies Company 14.40 AUTHORISED unallocated).
- **quotes**: `{ id, quoteNumber:'QU-0006', contactId, date, expiryDate, title, summary, reference, lineAmountTypes, lineItems, subTotal, totalTax, total, status:'DRAFT'|'SENT'|'ACCEPTED'|'DECLINED'|'INVOICED', invoiceId, createdAt, … }` Seed 6 covering every status.
- **purchaseOrders**: `{ id, purchaseOrderNumber:'PO-0004', contactId, date, deliveryDate, deliveryAddress, attentionTo, reference, lineItems, totals, status:'DRAFT'|'SUBMITTED'|'AUTHORISED'|'BILLED', billId, … }` Seed 4.
- **repeatingInvoices**: `{ id, templateInvoice:{contactId, lineItems,…}, schedule:{ period:1, unit:'MONTHLY'|'WEEKLY', dueDateDay, dueDateType, startDate, nextScheduledDate, endDate }, saveAs:'DRAFT'|'AUTHORISED'|'AUTHORISED_SEND', status:'ACTIVE'|'PAUSED'|'DELETED' }` Seed 2 (Ridgeway retainer, Rex Media social). Generating invoices from schedules must happen only on a user click ("Create invoice now"), never automatically.
- **dashboardLayout**: `{ widgets: ['bank_ba_090','bank_ba_091','invoicesOwed','billsToPay','cashInOut','profitLoss','watchlist','tasks','recentPayments'], hidden: [] }`.

## 3. Ledger engine (`src/utils/ledger.js`, pure functions)

`buildJournal(state)` → array of `{ date, accountCode, debit, credit, sourceType, sourceId, contactId, description, reference }`:
| Source | Included when | Entries |
|---|---|---|
| invoice | status AUTHORISED or PAID | Dr 610 total · Cr each line's `accountCode` net (exclusive: lineAmount; inclusive: lineAmount − taxAmount) · Cr 820 totalTax |
| bill | AUTHORISED or PAID | Cr 800 total · Dr each line net · Dr 820 totalTax |
| creditNote (sales) | AUTHORISED/PAID | reverse of invoice (Dr lines, Dr 820, Cr 610) |
| payment ACCREC | status ≠ DELETED | Dr bank account code · Cr 610 |
| payment ACCPAY | status ≠ DELETED | Dr 800 · Cr bank account code |
| bankTransaction RECEIVE | status ≠ DELETED | Dr bank · Cr lines net · Cr 820 tax |
| bankTransaction SPEND | status ≠ DELETED | Dr lines net · Dr 820 tax · Cr bank |
| bankTransfer | always | Dr to-bank · Cr from-bank |
| manualJournal | POSTED | each line |

Credit-card account 092 behaves like a bank account (negative balance = liability; show under "Bank" section with negative amount, as Xero does).

Builders (each returns `{ columns, sections:[{title, rows:[{accountCode, accountName, amounts:[]}], totals:[]}], summary }`):
- `buildProfitAndLoss(state, { fromDate, toDate, compare, basis })` — income = Σ(credit−debit), expenses = Σ(debit−credit). Gross Profit = Trading Income − Cost of Sales; Net Profit = Gross Profit + Other Income − Operating Expenses. Compare: add N earlier periods of same length (`month`/`quarter`/`year`).
- `buildBalanceSheet(state, { asAtDate, compare })` — Assets (Bank, Current, Fixed, Non-current), Liabilities (Current, Non-current), Net Assets; Equity = 950/970 balances + Retained Earnings (960 + net profit of all prior FYs) + **Current Year Earnings** (net profit from FY start to asAt). Must satisfy Net Assets = Total Equity (assert in dev).
- `buildAged(state, { kind: 'receivables'|'payables', asAtDate, ageingBy })` — per contact outstanding (as at date: documents dated ≤ asAt, minus payments dated ≤ asAt) bucketed **Current** (not yet due), **< 1 Month**, **1 Month**, **2 Months**, **3 Months**, **Older** overdue, Total.
- `buildBankRecSummary(state, { bankAccountId, asAtDate })` — Balance in Xero; Less/Plus outstanding payments & receipts (unreconciled Xero items); Plus un-reconciled statement lines; = Statement balance.
- `buildTrialBalance(state, { asAtDate })` — per account Debit / Credit (balance sign) and YTD columns; totals equal.
- `buildAccountTransactions(state, { accountCode, fromDate, toDate })` — opening balance, lines (Date, Source, Description, Reference, Debit, Credit, Running balance), closing balance.
- `cashBasis` (P2): include invoices/bills only to the extent paid (pro-rata on payment date).

## 4. Seed data specification (`createInitialData()`)

All seed must be explicit or generated by deterministic loops (no randomness). Org "today" for narrative purposes is **18 Nov 2026**, but code must use `new Date()`.

### 4.1 Sales invoices (46) — totals are VAT 20% exclusive unless noted
| # | Date | Contact | Lines (item × qty @ price) | Total | Status / payment |
|---|---|---|---|---|---|
| INV-0001 | 2026-04-03 | Ridgeway University | RETAINER 1×1500 "…– April 2026" | 1,800.00 | PAID 2026-04-28 |
| INV-0002 | 2026-04-08 | Boom FM | BRAND-PKG 1×2400 | 2,880.00 | PAID 2026-05-06 |
| INV-0003 | 2026-04-15 | City Agency | DESIGN-HR 12×95 | 1,368.00 | PAID 2026-05-12 |
| INV-0004 | 2026-04-22 | Marine Systems Ltd | WEB-BUILD 1×4800 | 5,760.00 | PAID 2026-05-20 |
| INV-0005 | 2026-05-01 | Ridgeway University | RETAINER May | 1,800.00 | PAID 2026-05-29 |
| INV-0006 | 2026-05-07 | Bayside Club | PHOTO-DAY 2×650 | 1,560.00 | PAID 2026-06-04 |
| INV-0007 | 2026-05-14 | Hamilton Smith Ltd | STRAT-HR 8×120 | 1,152.00 | PAID 2026-06-10 (1,092.00 payment + CN-0002 60.00) |
| INV-0008 | 2026-05-21 | Coco Café | PRINT-A5 4×85 | 408.00 | PAID 2026-06-02 |
| INV-0009 | 2026-05-28 | Petrie McLoud Watson & Associates | SEO-AUDIT 1×750 | 900.00 | PAID 2026-06-25 |
| INV-0010 | 2026-06-02 | Ridgeway University | RETAINER June | 1,800.00 | PAID 2026-06-30 |
| INV-0011 | 2026-06-09 | Rex Media Group | SOCIAL-MGMT June 1×900 | 1,080.00 | PAID 2026-07-08 |
| INV-0012 | 2026-06-16 | Gateway Motors | WEB-BUILD 1×4800 + HOSTING 1×240 | 6,048.00 | PAID 2026-07-14 |
| INV-0013 | 2026-06-23 | Young Bros Transport | BRAND-PKG 1×2400 | 2,880.00 | PAID 2026-07-21 |
| INV-0014 | 2026-06-30 | Basket Case | DESIGN-HR 6×95 | 684.00 | VOIDED 2026-07-02 "Raised in error – duplicate" |
| INV-0015 | 2026-07-01 | Ridgeway University | RETAINER July | 1,800.00 | PAID 2026-07-30 |
| INV-0016 | 2026-07-08 | Rex Media Group | SOCIAL-MGMT July | 1,080.00 | PAID 2026-08-06 |
| INV-0017 | 2026-07-15 | SMART Agency | DESIGN-HR 20×95 | 2,280.00 | PAID 2026-08-12 |
| INV-0018 | 2026-07-22 | Espresso 31 | PHOTO-DAY 1×650 + PRINT-A5 2×85 | 984.00 | PAID 2026-08-19 |
| INV-0019 | 2026-08-03 | Ridgeway University | RETAINER Aug | 1,800.00 | PAID 2026-09-01 |
| INV-0020 | 2026-08-10 | Rex Media Group | SOCIAL-MGMT Aug | 1,080.00 | PAID 2026-09-08 |
| INV-0021 | 2026-08-17 | Hoyt Productions | STRAT-HR 15×120 | 2,160.00 | PAID 2026-09-15 |
| INV-0022 | 2026-08-24 | Port & Philip Freight | SEO-AUDIT 1×750 + DESIGN-HR 5×95 | 1,470.00 | AUTHORISED, due 2026-09-23 (**Older overdue**), sent |
| INV-0023 | 2026-09-01 | Ridgeway University | RETAINER Sep | 1,800.00 | PAID 2026-09-29 |
| INV-0024 | 2026-09-08 | Bayside Club | PHOTO-HALF 3×400 | 1,440.00 | AUTHORISED due 2026-10-08 (overdue) — partial-payment scenario U11 |
| INV-0025 | 2026-09-15 | Rex Media Group | SOCIAL-MGMT Sep | 1,080.00 | PAID 2026-10-13 |
| INV-0026 | 2026-09-22 | Fernhill Primary School | PRINT-A5 10×85 | 1,020.00 | PAID 2026-10-20 |
| INV-0027 | 2026-10-01 | Boom FM | BRAND-PKG 1×2400 + STRAT-HR 2.5×120 | 3,240.00 | PAID — payment `pay_inv0027` 2026-11-05 ba_090 **isReconciled:false** (scenario U3) |
| INV-0028 | 2026-10-06 | City Agency | DESIGN-HR 9×95 + STRAT-HR 1×120 | 1,170.00 | AUTHORISED due 2026-11-05 (U4) |
| INV-0029 | 2026-10-08 | Hamilton Smith Ltd | COPY-PG 10×125 | 1,500.00 | AUTHORISED due 2026-11-07 (U9) |
| INV-0030 | 2026-10-09 | City Agency | COPY-PG 12×125 | 1,800.00 | AUTHORISED due 2026-11-08 (U4) |
| INV-0031 | 2026-10-12 | Ridgeway University | RETAINER Oct, ref "Retainer Oct 2026" | 1,800.00 | AUTHORISED due 2026-11-11, sent (U1) |
| INV-0032 | 2026-10-13 | Rex Media Group | SOCIAL-MGMT Oct | 1,080.00 | AUTHORISED due 2026-11-12, sent (overdue, no bank line) |
| INV-0033 | 2026-10-20 | Oakleaf Organic Grocers | custom "Packaging design – organic range" 1×2000 acct 200 | 2,400.00 | AUTHORISED due 2026-11-19, sent (U17) |
| INV-0034 | 2026-10-27 | Gateway Motors | HOSTING 1×240 + DESIGN-HR 4×95 | 744.00 | AUTHORISED due 2026-11-26 |
| INV-0035 | 2026-10-30 | Truxton Property Management | PHOTO-DAY 1×650 | 780.00 | AUTHORISED due 2026-11-29 |
| INV-0036 | 2026-11-02 | Kensington Dental Group | PHOTO-HALF 2×400 | 960.00 | **DRAFT** (U14 — must be approved before it can be matched) |
| INV-0037 | 2026-11-03 | Rex Media Group | SOCIAL-MGMT Nov | 1,080.00 | SUBMITTED |
| INV-0038 | 2026-11-04 | Young Bros Transport | WEB-BUILD 1×4800 | 5,760.00 | SUBMITTED |
| INV-0039 | 2026-11-06 | Ridgeway University | RETAINER Nov | 1,800.00 | AUTHORISED due 2026-12-06, sent |
| INV-0040 | 2026-11-09 | SMART Agency | DESIGN-HR 14×95 | 1,596.00 | SUBMITTED |
| INV-0041 | 2026-11-10 | Hoyt Productions | COPY-PG 6×125 | 900.00 | SUBMITTED |
| INV-0042 | 2026-11-12 | Espresso 31 | PRINT-A5 3×85 | 306.00 | DRAFT |
| INV-0043 | 2026-11-13 | Marine Systems Ltd | HOSTING 1×240 + SEO-AUDIT 1×750 | 1,188.00 | DRAFT |
| INV-0044 | 2026-11-16 | Fernhill Primary School | PHOTO-HALF 1×400 | 480.00 | DRAFT |
| INV-0045 | 2026-11-17 | Petrie McLoud Watson & Associates | STRAT-HR 6×120 | 864.00 | DRAFT |
| INV-0046 | 2026-11-17 | Bayside Club | DESIGN-HR 3×95 | 342.00 | DRAFT |
Counts: Draft 6 (4,140.00) · Awaiting Approval 4 (9,336.00) · Awaiting Payment 11 (15,984.00 due; 7 overdue as at 18 Nov) · Paid 24 · Voided 1. Due dates = date + 30 days unless stated. All PAID invoices except INV-0027 have a reconciled `ba_090` payment and a matching reconciled statement line (payee = contact name upper-cased, reference = invoice number).

### 4.2 Bills (35) — supplier, account, tax
| Series | Account / tax | Amounts | Bills |
|---|---|---|---|
| Truxton Property Management rent (con_c20) | 469 EXEMPTINPUT | 1,950.00 | 1st of each month Apr–Nov, due 5th; Apr–Oct PAID (payment on 5th); **Nov AUTHORISED** due 2026-11-05 (U8), ref "RENT-NOV26" |
| Net Connect broadband (s01) | 489 INPUT2 | 45.00 + 9.00 = 54.00 | 1st of month Apr–Nov, due 4th; Apr–Oct PAID (DD on 4th); **Nov AUTHORISED** due 2026-11-04 (U2), ref "NC-88213" |
| PowerDirect electricity (s02) | 445 INPUT2 | Jun 240+48=288.00 PAID; Aug 230+46=276.00 PAID; **Oct 260+52=312.00 AUTHORISED** dated 2026-10-15 due 2026-11-14 (U12) ref "PD-1047721" |
| Central Copiers lease (s04) | 453 INPUT2 | 105+21=126.00 | Jul PAID; **Oct AUTHORISED** dated 2026-10-20 due 2026-11-20 (U13) ref "CC-Q3-2291" |
| MCO Cleaning Services (s03) | 408 INPUT2 | 150+30=180.00 | Sep PAID, Oct PAID, **Nov AUTHORISED** dated 2026-11-01 due 2026-12-20 |
| Swanston Security (s05) | 473 INPUT2 | 600+120=720.00 | Jun PAID (annual alarm monitoring) |
| Office Supplies Company (s06) | 461 INPUT2 | Jul 72+14.40=86.40 PAID; **Nov 119+23.80=142.80 DRAFT** |
| ABC Furniture (s07) | 710 INPUT2 | 950+190=1,140.00 | **SUBMITTED** 2026-11-08 "4 × ergonomic task chairs" |
| 24 Locks (s08) | 473 INPUT2 | 80+16=96.00 | **SUBMITTED** 2026-11-11 |
| Melrose Parking (s09) | 493 INPUT2 | 200+40=240.00 | **AUTHORISED** dated 2026-10-01 due 2026-10-31 (overdue) |
| Liam Patel Design (s10) | 315 NONE (NoTax) | Oct 1,200.00 **AUTHORISED** due 2026-11-15 (overdue); Nov 800.00 **DRAFT** |
| Printwell Ltd (s11) | 320 INPUT2 | Aug 425+85=510.00 PAID; **Nov 255+51=306.00 SUBMITTED** |
| Amazon Business (s18) | 453 INPUT2 | 54.16+10.83=64.99 **DRAFT** "Desk organisers" |
Counts: Draft 3 · Awaiting Approval 3 · Awaiting Payment 7 (5 overdue) · Paid 22. Bill `reference` is the supplier invoice number (make each unique, e.g. "TPM-RENT-0626").
Use **one batch payment** `bp_0001` 2026-07-31 paying Central Copiers Jul (126.00) + Office Supplies Jul (86.40) = 212.40, reconciled to a single statement line "BATCH PAYMENT JULY SUPPLIERS".

### 4.3 Recurring bankTransactions (reconciled history, Apr–Oct, one per month)
| Payee / contact | Account | Type | Bank | Amount | Day |
|---|---|---|---|---|---|
| Barclays Bank – monthly charges | 404 NONE | SPEND | ba_090 | 12.50 | 28th |
| Xero UK – subscription | 485 INPUT2 (inclusive) | SPEND | ba_090 | 35.00 | 15th |
| Google Workspace | 485 INPUT2 (inclusive) | SPEND | ba_090 | 11.40 | 17th |
| Hannah Clarke – director's salary | 478 NONE | SPEND | ba_090 | 3,000.00 | 25th |
| Adobe Systems Software Ireland – Creative Cloud | 463 INPUT2 (inclusive) | SPEND | ba_092 | 19.99 | 12th |
| Barclays Bank – savings interest | 270 NONE | RECEIVE | ba_091 | Apr 31.20, May 33.10, Jun 34.05, Jul 36.40, Aug 36.88, Sep 37.95 | last day |
| HM Revenue & Customs – VAT return Q1 | 820 NONE | SPEND | ba_090 | 3,128.40 | 2026-08-07 |
| Misc card spend (6): Capital Cab Co 18.60 (493) 2026-05-14; British Airways 212.00 (494 ZERORATEDINPUT) 2026-06-03; Pret A Manger 9.85 (420) 2026-06-19; Amazon Business 45.99 (453) 2026-07-09; Royal Mail 21.30 (425) 2026-08-21; Capital Cab Co 22.40 (493) 2026-09-30 | | SPEND | ba_092 | | |
Plus one **unreconciled manual** spend `btx_0099`: Office Supplies Company "Ink cartridges" 48.00 461 INPUT2 inclusive, ba_090, 2026-11-14, no statement line (appears as "outstanding payment" in Bank Reconciliation Summary).

### 4.4 bankTransfers (reconciled both sides)
- 2026-06-30 ba_090 → ba_091 5,000.00 "Transfer to savings"; 2026-09-30 ba_090 → ba_091 5,000.00.
- Credit-card repayments: on the 25th of each month May–Nov, ba_090 → ba_092 amount = Σ ba_092 spend lines dated in the previous calendar month (computed deterministically in seed). Nov 25 doesn't exist yet → only May–Oct (6 transfers), all reconciled both sides.

### 4.5 Unreconciled bank statement lines (25) — the reconciliation workload
Business Current Account `ba_090` (18 → "Reconcile 18 items"):
| id | Date | Payee | Reference | Amount | Intended resolution |
|---|---|---|---|---|---|
| bsl_090_U01 | 2026-11-03 | RIDGEWAY UNIVERSITY | INV-0031 | +1,800.00 | Suggested **Match** → INV-0031 (creates payment, invoice PAID) |
| bsl_090_U02 | 2026-11-04 | NET CONNECT LTD | DD NC-88213 | −54.00 | Suggested **Match** → Net Connect Nov bill |
| bsl_090_U03 | 2026-11-05 | BOOM FM LTD | BOOM FM BACS | +3,240.00 | Suggested **Match** → existing unreconciled payment `pay_inv0027` |
| bsl_090_U04 | 2026-11-06 | CITY AGENCY | INV-0028 INV-0030 | +2,970.00 | No single match → **Find & Match** INV-0028 (1,170) + INV-0030 (1,800) |
| bsl_090_U05 | 2026-11-07 | BARCLAYS BANK | MONTHLY FEE | −18.50 | **Create**: Barclays Bank / 404 Bank Charges / No VAT (bank rule suggestion P2) |
| bsl_090_U06 | 2026-11-09 | TRANSFER TO 73920184 | SAVINGS | −5,000.00 | **Transfer** → Business Savings Account |
| bsl_090_U07 | 2026-11-10 | PRET A MANGER | CARD 4417 | −4.80 | **Create**: 420 Entertainment / 20% (VAT on Expenses) |
| bsl_090_U08 | 2026-11-10 | TRUXTON PROPERTY | RENT-NOV26 | −1,950.00 | Suggested **Match** → Truxton Nov rent bill |
| bsl_090_U09 | 2026-11-11 | HAMILTON SMITH LTD | INV-0029 | +1,494.00 | **Find & Match** INV-0029 (1,500.00) + bank-fee adjustment −6.00 (or part-payment 1,494.00) |
| bsl_090_U10 | 2026-11-12 | LINKEDIN PREMIUM | LNKD*PREM | −29.99 | **Create**: 400 Advertising & Marketing / 20% (VAT on Expenses) |
| bsl_090_U11 | 2026-11-12 | BAYSIDE CLUB | PART PAYMENT INV-0024 | +600.00 | **Find & Match** INV-0024, edit applied amount to 600.00 (part payment; invoice stays AUTHORISED with amountDue 840.00) |
| bsl_090_U12 | 2026-11-13 | POWERDIRECT | PD-1047721 | −312.00 | Suggested **Match** → PowerDirect Oct bill |
| bsl_090_U13 | 2026-11-14 | CENTRAL COPIERS | CC-Q3-2291 | −126.00 | Suggested **Match** → Central Copiers Oct bill |
| bsl_090_U14 | 2026-11-16 | KENSINGTON DENTAL | INV-0036 | +960.00 | No match while INV-0036 is DRAFT; after approval → Match |
| bsl_090_U15 | 2026-11-16 | ROYAL MAIL | POSTAGE | −42.00 | **Create**: 425 Postage / Zero Rated Expenses |
| bsl_090_U16 | 2026-11-17 | GOOGLE *WORKSPACE | GSUITE | −11.40 | **Create**: Google Workspace / 485 / 20% (VAT on Expenses) |
| bsl_090_U17 | 2026-11-17 | OAKLEAF ORGANIC | INV-0033 | +2,400.00 | Suggested **Match** → INV-0033 |
| bsl_090_U18 | 2026-11-17 | XERO UK | XERO SUBSCRIPTION | −35.00 | **Create**: Xero UK / 485 / 20% (VAT on Expenses) |
Business Savings Account `ba_091` (2): bsl_091_U01 2026-10-31 "GROSS INTEREST" +38.42 (**Create** 270 Interest Income / No VAT); bsl_091_U02 2026-11-09 "TRANSFER FROM 43218765" +5,000.00 (**Transfer** from Business Current, or **Match** once U06 transfer exists).
Company Credit Card `ba_092` (5): bsl_092_U01 2026-11-02 AMAZON BUSINESS −79.00 (453); bsl_092_U02 2026-11-08 BRITISH AIRWAYS −186.40 (494 Zero Rated); bsl_092_U03 2026-11-12 ADOBE *CREATIVE CLOUD −19.99 (463); bsl_092_U04 2026-11-12 CAPITAL CAB CO −24.00 (493); bsl_092_U05 2026-11-15 UBER EATS −58.20 (420).

Reconciled history lines: one per seeded payment / bankTransaction / transfer side / batch payment (≈108 lines), ids `bsl_<acct>_<nnn>` in date order, `status:'reconciled'`, `reconciliation.method` = `'match'`, fixed `reconciledAt` = line date + 1 day 10:00Z, `reconciledBy:'usr_tom'`.

### 4.6 Match suggestion algorithm (`src/utils/reconcile.js`)
For an unreconciled line L on bank account B, candidates (same direction as sign of L.amount):
1. Unreconciled payments on B (`isReconciled:false`, status ≠ DELETED) — kind `payment`.
2. Unreconciled bankTransactions on B — kind `bankTransaction`.
3. Unreconciled transfer sides on B — kind `bankTransfer`.
4. Outstanding documents: receipts → invoices AUTHORISED with amountDue>0; spends → bills AUTHORISED with amountDue>0 (matching creates a payment for the full amountDue dated L.date, `source:'reconcile'`).
**Suggestion** = the single best candidate whose amount (or amountDue) equals |L.amount| exactly; score: +3 if L.reference contains document number/reference, +2 if payee fuzzy-contains contact name (case-insensitive, ignore "Ltd"), +1 if |date diff| ≤ 14 days. No suggestion if 0 exact-amount candidates. Draft/Submitted documents never appear. Find & Match lists **all** candidates of the right direction (searchable by name/reference/amount) — not just exact amounts.

## 5. Observable State Changes (draft for SCHEMA.md — keep in sync with code)

| User action (UI) | Writes |
|---|---|
| Invoice editor → **Save & close** (new) | `invoices[+]` {status:'DRAFT', invoiceNumber, lineItems, subTotal/totalTax/total, amountDue, createdAt, createdBy}; `organisation.invoiceSettings.nextInvoiceNumber`++; `historyEvents[+]` {entityType:'invoice', action:'Created'} |
| Invoice editor → **Submit for approval** | invoice.status='SUBMITTED', submittedAt/By; history 'Submitted' |
| Invoice editor/view → **Approve** | invoice.status='AUTHORISED', approvedAt/By; history 'Approved' |
| **Approve & email** / view → **Email** → Send | invoice.status='AUTHORISED' (if not already), sentToContact=true, sentAt; `emailLog[+]` {documentType:'invoice', documentId, to, subject, body}; history 'Sent' |
| Invoice view → **Mark as sent** (or bulk) | invoice.sentToContact=true, sentAt; history 'Sent' |
| Invoice edit → **Save** (existing) | invoice fields + recomputed totals, updatedAt/By; history 'Edited' |
| Invoice view → **Record payment** (Amount, Date paid, Paid to, Reference → Add payment) | `payments[+]` {type:'ACCRECPAYMENT', documentType:'invoice', documentId, bankAccountId, date, amount, reference, isReconciled:false, source:'manual'}; invoice.amountPaid/amountDue, paymentIds, status→'PAID' & fullyPaidOnDate when settled; history 'Payment received' / 'Paid' |
| Payment → **Remove payment** | payment.status='DELETED', deletedAt/By; document amountPaid/amountDue restored, status PAID→AUTHORISED; if it was reconciled its statement line → status 'unreconciled', reconciliation=null; history 'Payment removed' |
| Invoice → **Void** | status='VOIDED', voidedAt/By, voidReason; history 'Voided' |
| Draft/Submitted → **Delete** | status='DELETED', deletedAt; history 'Deleted' |
| Invoice list bulk **Approve** / **Delete** / **Mark as sent** | same per-record writes as single actions, one history event per invoice |
| Bill editor → Save draft / Submit / Approve | `bills[+]` or bill update, same fields/status rules as invoices (type 'ACCPAY'); history |
| Bill view → **Make a payment** (Amount paid, Date paid, Paid from, Reference) | `payments[+]` {type:'ACCPAYPAYMENT', documentType:'bill', …}; bill.amountPaid/amountDue/status; history |
| Bills list → select → **Make payment → Batch payment** → Make payments | `batchPayments[+]` {bankAccountId, date, reference, billIds, paymentIds, total}; one `payments[+]` per bill with batchPaymentId, source:'batch'; each bill amountPaid/amountDue/status |
| Bills list → **Schedule payment** (P2) | bill.plannedPaymentDate |
| Reconcile → Match suggestion → **OK** | statementLine.status='reconciled', reconciliation {method:'match', matched:[{kind,id,amount}], reconciledAt, reconciledBy}; matched payment/bankTransaction/transfer side isReconciled=true + statementLineId; if matched an outstanding invoice/bill: `payments[+]` {source:'reconcile', isReconciled:true, statementLineId} and document paid/amountDue updated |
| Reconcile → **Find & Match** → select items (+ optional amount edit / adjustment) → **Reconcile** | as above with method:'findmatch', matched[] ≥1 (part-payment amounts as edited); adjustments → `bankTransactions[+]` {source:'reconcile-adjustment', accountCode 404 (bank fee) or 860 (minor adjustment)} listed in reconciliation.adjustments |
| Reconcile → **Create** (Who/What/Why/VAT) → OK | `bankTransactions[+]` {type SPEND/RECEIVE, bankAccountId, contactId, date=line.date, lineAmountTypes:'Inclusive', lineItems[0]{accountCode, taxType, description, lineAmount=|amount|}, totals, isReconciled:true, statementLineId, source:'reconcile-create'}; statement line reconciled {method:'create'}; new contact if typed → `contacts[+]` |
| Reconcile → **Transfer** (account, description) → OK | `bankTransfers[+]` {from/to by sign, amount, date, fromIsReconciled/toIsReconciled for this side, statement line id}; statement line reconciled {method:'transfer'} |
| Reconcile → **Discuss** → Save | statementLine.discussNote, discussUpdatedAt |
| Bank statements tab → **Delete** line (P2) / Restore | statementLine.status='deleted' / 'unreconciled', deletedAt |
| Account transactions → **Unreconcile** / Remove & Redo | statement line → 'unreconciled', reconciliation=null; linked item isReconciled=false, statementLineId=null (Remove & Redo also deletes reconcile-created bankTransaction/payment → status 'DELETED'); history 'Unreconciled' |
| Spend money / Receive money form → Save | `bankTransactions[+]` {source:'manual', isReconciled:false} |
| Transfer money form → Save | `bankTransfers[+]` {source:'manual', both sides isReconciled:false} |
| Bank account → **Mark as reconciled** (P2 bulk on Account transactions) | item isReconciled=true (no statement line) |
| Report → **Save as draft** | `savedReports[+]` {reportType, title, status:'draft', settings, columns, rows, summary, createdAt, createdBy}; history {entityType:'report', action:'Created'} |
| Report → **Publish** | savedReports record status='published', publishedAt/By (new record if not saved yet); history 'Published' |
| Saved report → **Archive** / **Delete** / **Edit title & note** | status='archived' / removed from array / title, note, updatedAt |
| Report → **Export** → PDF / Excel / Google Sheets | `reportExports[+]` {reportType, format, settings, summary, fileName, createdAt, createdBy} (browser download of a generated file is optional UI) |
| Report centre → ☆ star toggle | `favouriteReports` add/remove reportType |
| Contact → **New contact** / Edit / Archive / Restore / Add to group | `contacts[+]` / contact fields, updatedAt / contactStatus / `contactGroups[].contactIds` |
| Products & services → New/Edit/Delete item | `items` |
| Chart of accounts → Add/Edit/Archive account (P2) | `accounts` (code unique, validated) |
| Quote → Save/Send/Mark accepted/declined/Create invoice (P2) | `quotes` status; Create invoice → `invoices[+]` + quote.status='INVOICED', invoiceId |
| Credit note → Approve / Allocate (P2) | `creditNotes`; allocation → invoice.amountCredited/amountDue/status |
| Purchase order → Approve / Copy to bill (P2) | `purchaseOrders`; `bills[+]`, po.status='BILLED', billId |
| Manual journal → Post (P2) | `manualJournals[+]` (debits = credits enforced) |
| Bank rule → Save (P2) | `bankRules[+]` |
| Settings → Organisation details / Invoice settings / Financial settings (P2) | `organisation` fields |
| Homepage → Edit homepage → Save (P2) | `dashboardLayout` |
| Any document → **Add note** (History & Notes) | `historyEvents[+]` {action:'Note', details:text} |
