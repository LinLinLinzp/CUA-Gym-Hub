# Xero — Research Summary (plan agent, 2026-11-18)

## 1. Overview

**Xero** (go.xero.com) is a cloud accounting platform for small businesses and their advisers
(accountants/bookkeepers), strongest in NZ, Australia and the UK. Core jobs: raise **sales invoices**,
record and pay **supplier bills**, **reconcile bank feeds** against those transactions, and run
**financial reports** (Profit and Loss, Balance Sheet, Aged Receivables/Payables, Bank
Reconciliation Summary). The mock is a **UK organisation** (GBP, 20% VAT, financial year ending 31 March)
because UK VAT rates, wording ("Organisation", "Authorised") and the default UK chart of accounts are the
most recognisable Xero setup.

- Org: **Brightwater Creative Ltd**, a 4-person London design & marketing studio.
- Signed-in user: **Hannah Clarke** (director, role Adviser, can approve everything).
- Mock "today" for the seed story is 18 Nov 2026; the code always uses `new Date()` (the runtime freezes the clock per task).

### What makes Xero distinct (must be reflected)
1. **The bank reconciliation screen.** Each statement line sits on the left, Xero's suggested match in a green box on the right, and an **OK** button between them. The right-hand box has tabs **Match / Create / Transfer / Discuss**. **Find & Match** lets you combine several transactions, part-pay, or add bank-fee and minor adjustments. Reconciled rows disappear and the "Reconcile (N)" count drops.
2. **Document workflow states**: Draft → Awaiting Approval (SUBMITTED) → Awaiting Payment (AUTHORISED) → Paid, plus Voided. Invoices and bills both use these status tabs with counts.
3. **The two-balance concept**: "Statement balance" (from the bank feed) vs "Balance in Xero" (posted transactions).
4. **Report toolbar**: date range presets, "Compare with" N periods, Update, Export, Save as draft / Publish, plus drill-down from any figure to Account Transactions.
5. **The 2025 navigation**: dark top bar with Home · Sales · Purchases · Reporting · Accounting · Tax · Contacts, each a dropdown. Most menus end with "<Section> settings". There is also a global **+** create menu and search.

## 2. Personas & primary workflows
| Persona | Workflows |
|---|---|
| Business owner (Hannah) | Check homepage cash position, create & email invoices, approve bills, glance at P&L |
| Bookkeeper (Tom Reid, Standard) | Daily bank reconciliation, enter bills, batch-pay suppliers, chase overdue invoices |
| Accountant/adviser | Month-end reports (P&L, Balance Sheet, Trial Balance, Aged AR/AP), publish report packs, manual journals |

**SEED.md must-have workflows (all are P0/P1, and each persists structured records):**
1. **Invoices**: create, edit, submit, approve, email (mock), record payment, void or delete. Writes `invoices`, `payments`, `historyEvents`, `emailLog`.
2. **Bank reconciliation**: match, find & match (multi, part-payment, adjustments), create, transfer, discuss, unreconcile. Writes `bankStatementLines.reconciliation`, `payments`, `bankTransactions`, `bankTransfers`.
3. **Bills**: create, submit, approve, pay one bill, batch-pay several, void. Writes `bills`, `payments`, `batchPayments`.
4. **Reports**: run with settings, compare periods, drill down, save as draft or publish, export, favourite. Writes `savedReports`, `reportExports`, `favouriteReports`.

## 3. Feature list with priority

### P0: shell
- Navy global header with org switcher, 7 menus with dropdowns, a + create menu, search, bell, help and avatar
- Router covering every route listed in TODO.md; `?sid=` is kept on every navigation
- Store using `loadState`/`saveState` from `templates/dataManager.js`, plus a seed with fixed ids
- Pure ledger/money/reconcile utilities (they drive every number shown)
- `vite.config.js` with `stateApi(createInitialData)` on port 5413

### P1: core
- Homepage dashboard: bank account cards with a "Reconcile N items" button, Invoices owed to you, Bills to pay, Cash in and out, Profit/loss, Account watchlist, Tasks
- Invoices: list with summary tiles, status tabs, search, sort, pagination and bulk actions. Editor with line items, VAT maths and Save/Approve split buttons. View page with record payment, History & Notes, options menu (void, delete, copy, mark as sent, email modal)
- Bills: the same list, editor and view, plus Make a payment and Batch payment
- Bank accounts overview, the Reconcile screen (all 4 right-hand tabs plus Find & Match), Bank statements tab, Account transactions tab, Spend money / Receive money / Transfer money forms, and a bank transaction detail page with Unreconcile
- Reports centre (favourites, all reports, drafts, published) and reports for Profit and Loss, Balance Sheet, Aged Receivables Summary/Detail, Aged Payables Summary/Detail, Bank Reconciliation Summary, Trial Balance and Account Transactions. Each has the toolbar, compare, drill-down, Save/Publish and Export
- Contacts: list with filters (All, Customers, Suppliers, Archived, groups), detail page, new/edit form, archive
- Global search and the + create menu
- Chart of accounts (read and filter), Products and services (list plus create/edit)

### P2: depth
- Quotes, credit notes with allocation, purchase orders (copy to bill), repeating invoices (manual "create now")
- Manual journals; bank rules with suggestions in the Create tab; cash coding tab; statement CSV import; statement line delete/restore
- VAT Return report (read-only boxes 1–9), Executive Summary, General Ledger summary
- Settings: Organisation details, Invoice settings (branding, terms, numbering), Financial settings (FY end, lock date), Tax rates, Tracking categories, Users (read-only)
- Edit homepage (reorder or hide widgets); notifications panel; help drawer; invoice PDF print view; attachments via `/upload`

## 4. UI layout by view (no screenshots available; described from research and product knowledge)

> Image download failed: the sandbox has no outbound network, `icrawler` can't be installed, and WebFetch
> is blocked for every domain. `assets/screenshots/` is therefore empty. DESIGN.md and the descriptions
> below are the visual reference.

**Global header (56px, navy `#0B1F3A`)**
Starting from the left:
- the cyan Xero logo
- the org name with a chevron
- the menus Home, Sales ▾, Purchases ▾, Reporting ▾, Accounting ▾, Tax ▾ and Contacts ▾

On the right are the + , 🔍, 🔔, ? and avatar "HC" controls.

The menus contain:
- **Sales**: Sales overview, Invoices, Quotes, Products and services, Customers, Sales settings.
- **Purchases**: Purchases overview, Bills, Purchase orders, Suppliers, Purchases settings.
- **Reporting**: All reports, Profit and Loss, Balance Sheet, Aged Receivables, Aged Payables, Bank Reconciliation Summary, Reporting settings.
- **Accounting**: Bank accounts, Chart of accounts, Manual journals, Bank rules, Accounting settings.
- **Tax**: VAT returns, Tax rates.
- **Contacts**: All contacts, Customers, Suppliers, Groups.

**Homepage (`/dashboard`)**
- Page title "Brightwater Creative Ltd" with an "Edit homepage" button on the right.
- A 3-column card grid:
  - **Business Current Account** card: account number line, then "Statement balance" and "Balance in Xero" with dates. A blue "Reconcile 18 items" button and a 6-month balance sparkline. The "Manage ▾" menu offers Reconcile, Spend money, Receive money, Transfer, Account transactions.
  - **Business Savings Account** card: the same layout (2 items).
  - **Invoices owed to you**: "6 Draft invoices 4,140.00", "4 Awaiting approval 9,336.00", "11 Awaiting payment 15,984.00", "7 Overdue …" in red. Below that, a bar chart of amounts due: Older, <this week buckets>, Future. Clicking a bar opens the invoice list with that filter. Footer: "New invoice".
  - **Bills to pay**: the same layout for bills, with a "+ New bill" link.
  - **Cash in and out**: 6 monthly grouped bars (in = blue, out = grey) with a hover tooltip and a summary line "Cash in 12,345.00 / Cash out 9,876.00 / Difference".
  - **Profit or loss**: current FY-to-date figures for Income, Expenses and Net profit, with a mini line chart.
  - **Account watchlist**: table with Account, This month and YTD columns.
  - **Tasks**: "18 bank items to reconcile", "4 invoices awaiting approval", "3 bills awaiting approval", "7 overdue invoices", each linking to the filtered view.
  - **Recent invoice payments**: the last 5 payments received.

**Invoices list (`/invoices`)**
- Breadcrumb "Sales overview ›", H1 "Invoices".
- Buttons on the right: primary "New invoice" split (New repeating invoice, New credit note), plus standard buttons "Send statements" (P2) and "Export".
- Summary tiles: Draft, Awaiting approval, Awaiting payment, Overdue.
- Tabs: All | Draft (6) | Awaiting Approval (4) | Awaiting Payment (11) | Paid | Repeating.
- A "Search" toggle opens a panel with a text field ("Enter a contact, amount, or reference"), a date type (Any date / Invoice date / Due date), Start and End, and Search / Clear buttons.
- Table columns: ☐, Number, Ref, To, Date, Due Date, Paid, Due, Status, Sent.
- Sort by any column. Pagination at 25 per page by default.
- Checking rows shows a bulk bar. Draft/Submitted rows offer Approve, Delete, Print. Awaiting payment rows offer Email, Mark as sent, Print.

**Invoice editor (`/invoices/new`, `/invoices/:id/edit`)**
- Header: "New invoice" or "Edit invoice INV-0047", with a ← back link to Invoices.
- Field row: Contact (combobox with "+ Add contact"), Issue date, Due date (preset menu: "In 7/14/30 days", "End of next month", or a custom date), Invoice number (prefilled with the next number, editable), Reference. A collapsible "Optional details" holds Branding theme, Currency (GBP, locked) and "Amounts are" (Tax exclusive / Tax inclusive / No tax).
- Line table columns: Item, Description, Qty, Price, Disc %, Account, Tax rate, Tax amount, Amount GBP, ✕.
  - Selecting an item fills description, price, account and tax.
  - "+ Add line item" adds a row; empty lines are ignored on save.
- Totals block on the right: Subtotal, "Total VAT" (one line per rate, e.g. "VAT 20%"), **Total**.
- Bottom/top bar: "Save & close" (split: Save & add another, Submit for approval) and primary "Approve & email" (split: Approve, Approve & add another, Approve & print PDF).
- Validation: a contact is required, at least one line needs a description or amount, the account is required for approval, and the due date can't be before the issue date.

**Invoice view (`/invoices/:id`)**
- Title "Invoice INV-0031" with a status pill.
- Actions: Edit, Email, Print PDF, and an "⋯" menu (Copy to new invoice, Add credit note (P2), Mark as sent, Void, Delete for drafts, Add note).
- Draft and Submitted invoices show a top banner with an Approve button.
- Header facts: To, Date, Due date, Reference, Invoice number, Amount due.
- The read-only document follows: line table and totals. Below the Total are "Less Payment" rows (date, linked) and the **Amount Due**.
- For AUTHORISED invoices a **Record a payment** panel shows Amount paid, Date paid, Paid to (bank account select) and Reference, with an "Add payment" button.
- A collapsible **History & Notes** table has Changes, Date, User and Details columns, plus an "Add note" action.

**Bills (`/bills`, `/bills/new`, `/bills/:id`)**
- Same patterns as invoices. The list title is "Bills" (breadcrumb "Purchases overview ›").
- Columns: ☐, From, Reference, Date, Due date, Paid, Due, Status, Planned.
- Bulk on Awaiting Payment: "Make payment" (opens a batch payment), Schedule payment (P2), Void, Print.
- Editor fields: From, Date, Due date, Reference, Amounts are; same lines and totals. Buttons: Save draft, Submit for approval, Approve.
- The view page has a "Make a payment" panel (Paid from).
- **Batch payment** (`/bills/batch-payment?ids=`):
  - Fields: Payment date, Pay from account, Reference.
  - Table columns: From, Reference, Due date, Amount due, Payment (editable).
  - Shows the Total and a green "Make payments" button.

**Bank accounts (`/bank-accounts`)**
- Title "Bank accounts" with buttons "+ Add bank account" (P2) and "Bank rules" (P2).
- One white card per account: name, sort code and account number, a "Reconcile N items" button, Statement balance and Balance in Xero, and a "Manage account ▾" menu.

**Reconcile (`/bank-accounts/:id/reconcile`)**
- Title: the account name with a dropdown to switch accounts.
- Right of the title: "Statement balance 31,652.12" and "Balance in Xero 28,040.55" (as an example).
- Tabs: **Reconcile (18)** · Cash coding (P2) · Bank statements · Account transactions.
- Rows follow DESIGN.md §5 "Reconcile row", with pagination of 10 per page (selector 10/25/50).
- **Find & Match** expands under the row:
  - Search fields "Name or reference" and "Amount", and a "Show Spent/Received items" toggle.
  - Candidate list with columns ☐, Date, Name, Reference, Amount; selected items get an editable "Amount applied".
  - Footer: "Statement line 2,970.00 · Selected 2,970.00 · Out by 0.00", an "Adjustments ▾" menu (Bank fee, Minor adjustment) and a green "Reconcile" button that is enabled only when Out by = 0.00.
- **Create** fields:
  - Who: contact combobox, with a new-contact option
  - What: account picker
  - Why: description
  - VAT: tax rate, defaulting from the account

  An "Add details" link (P2) opens the full Spend money form prefilled.
- **Transfer** fields: "Transfer to/from" (other bank accounts) and Description.
- **Discuss**: a textarea and Save.

**Bank statements tab**
- Table columns: Date, Type, Payee, Reference, Spent, Received, Status ("Reconciled" green / "Unreconciled").
- Filter: All / Unreconciled / Reconciled / Deleted.

**Account transactions tab**
- Buttons "Spend money", "Receive money", "Transfer money".
- Table columns: Date, Description, Reference, Spent, Received, Reconciled (✓).
- Search. Clicking a row opens `/bank-transactions/:id` (or the payment or transfer detail), which offers **Unreconcile** and "Remove & redo".

**Reports centre (`/reports`)**
- H1 "Reports".
- Search box "Find a report".
- Tabs: All reports · Drafts · Published · Archived.
- The All tab groups reports into sections: Favourites (★), Financial performance (Profit and Loss), Financial statements (Balance Sheet), Payables and receivables (Aged Payables Summary/Detail, Aged Receivables Summary/Detail), Reconciliations (Bank Reconciliation Summary), Taxes and balances (Trial Balance, VAT Return P2) and Transactions (Account Transactions).
- Each row has a star toggle and a link.

**Report page (`/reports/profit-and-loss` etc.)**
- Breadcrumb "Reports ›".
- Toolbar:
  - Date range: From/To pickers plus a presets menu (This month, This quarter, This financial year, Last month, Last quarter, Last financial year, Month to date, Quarter to date, Year to date)
  - Compare with: None, or 1–11 previous periods of month, quarter or year
  - More ▾: Accounting basis Accrual/Cash, Show total column, Show YTD, Hide zero rows
  - **Update**
  - Action buttons on the right: Export ▾ (PDF, Excel, Google Sheets), Save as ▾ (Save as draft, Publish), ☆
- Body: report title block, then the sections (see data_model §3). Amounts link to Account Transactions.

**Contacts (`/contacts`)**
- H1 "Contacts". Buttons "New contact", Import (P2), Export.
- Left filter or tabs: All contacts, Customers, Suppliers, Archived, plus Groups.
- Search "Search contacts".
- Table columns: ☐, Contact (name + primary person/email, star), You owe, They owe.
- Bulk actions: Add to group, Archive.
- **Detail page**:
  - Name, "Edit", and a "New ▾" menu (Invoice, Bill, Quote P2, Credit note P2)
  - Left column: contact info
  - Right column: "Money coming in" and "Money going out" summaries (outstanding/overdue amounts) and a recent activity table of invoices, bills and payments
- **Form**: Contact name*, Account number, Primary person (First, Last, Email), Phone, Website, Billing address, Delivery address ("Same as billing"), Financial details (VAT number, default sales/purchases account and tax, payment terms for invoices and bills).

## 5. Data model overview
See `data_model.md`. There are 30 top-level keys. The main ones:
- `invoices`, `bills`, `payments`, `batchPayments`
- `bankAccounts`, `bankStatementLines`, `bankTransactions`, `bankTransfers`
- `accounts`, `taxRates`, `contacts`, `items`
- `savedReports`, `reportExports`, `favouriteReports`
- `historyEvents`, `emailLog`

Every number shown comes from the pure ledger built from posted documents. Reports, balances and dashboard figures are derived, never stored, except the snapshots kept in `savedReports`.

## 6. Out of scope and why
- **Login, sign-up, 2FA, switching to other real organisations.** The runtime is pre-authenticated, and identity flows are excluded by the plan rules.
- **Real bank feeds, payment gateways (Stripe/GoCardless "Online payments"), real email sending and HMRC MTD VAT submission.** These need network access. Emails only write `emailLog`, and VAT returns are read-only reports.
- **Payroll, Projects, Analytics (Syft), Short-term cash flow, Fixed asset register, Expenses (expense claims), Hubdoc/Files inbox, multi-currency, inventory tracking.** They are large secondary products, so omit their menu entries entirely rather than leave dead links.
- **Live or ticking data.** The contract forbids state writes without a user action, so nothing may update on a timer.

## 7. Research sources
- Xero 2025 navigation redesign (Sales/Purchases/Reporting/Tax menus): uhy-uk.com "What's new in Xero & Dext (Autumn 2025)", tashlyconsulting.com, plusaccounting.co.uk
- Bank reconciliation tabs, Match/Create/Transfer/Discuss, Find & Match, adjustments: fitsmallbusiness.com, numeric.io, gentlefrog.com, levelandtrueaccounting.com, telleroo.com, help.xero.com "Create a spend money transaction"
- Invoice fields and Approve & email options: blog.xero.com "Five time-saving features exclusive to new invoicing", saasant.com, precoro.com, developer.xero.com (Invoices API, invoice statuses)
- Bills tabs, approval, batch payment: xero.com/blog/2022/09/bills-to-pay-refresh, joannabookkeeping.co.uk, pulsify.tech
- Reports toolbar, compare, aged reports: xero.my.site.com "Executive Summary", blog.xero.com "new reports latest enhancements", atkinsonsca.co.uk, coupler.io
- Homepage widgets: blog.xero.com "Your new Xero homepage is here", evanspartners.co.uk, gentlefrog.com
- Brand colours: brandcolor.dev (`#13B5EA`), logo.dev (navy `#010856`), knapsack.cloud (XUI design system)
