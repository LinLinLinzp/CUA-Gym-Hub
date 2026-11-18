# Xero Mock — TODO

> Status: COMPLETE
> Last updated by: dev agent, 2026-11-18
> Research: `assets/README.md` | Data model + seed + state-change table: `assets/data_model.md` | Style: `DESIGN.md`
> Overrides: `SEED.md` and `/HARBOR_CONTRACT.md` win over anything generic. **Dev server port: 5413** (strictPort).
> SEED.md must-have workflows → **W1 Invoices, W2 Bank reconciliation, W3 Bills, W4 Reports**. Every item tagged `[W#]` must write the structured records listed (see data_model.md §5).

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Done

---

## P0 — Core Shell
<!-- Without these, the app cannot render. Implement first, in order. -->

- [x] **Scaffold**: Vite + React 18 (JS) in `websites/xero_mock` (`npm create vite@latest . -- --template react`), deps: `react-router-dom@6`. Optional: `recharts` (bundled, offline) for dashboard charts — or hand-rolled SVG. No CSS framework requirement; Tailwind allowed. No Google Fonts / CDN / remote images — use the system font stack from DESIGN.md §3. Commit `package-lock.json`. `index.html` `<title>Xero | Brightwater Creative Ltd</title>`, favicon = inline SVG cyan circle (`public/favicon.svg`).
- [x] **vite.config.js** exactly per contract:
  ```js
  import { defineConfig } from 'vite'
  import react from '@vitejs/plugin-react'
  import { stateApi } from '../../templates/state-api.js'
  import { createInitialData } from './src/data/seed.js'
  export default defineConfig({
    plugins: [react(), stateApi(createInitialData)],
    server: { port: 5413, strictPort: true },
    preview: { port: 5413, strictPort: true },
  })
  ```
  `/go`, `/state`, `/post`, `/upload` are served by the plugin — **do NOT add a React `/go` route** (it would be shadowed and is not needed). Add `.mock-states/` and `.mock-files/` to `.gitignore`.
- [x] **dataManager**: copy `templates/dataManager.js` unchanged to `src/utils/dataManager.js`. APP key `'xero'`.
- [x] **Seed** `src/data/seed.js` exporting `createInitialData()` — pure ESM, Node-importable, deterministic, fixed ids, exactly the records in data_model.md §4 (orgs, users, 54 accounts, 9 tax rates, 40 contacts, 14 items, 46 invoices, 35 bills, payments, batch payment, 3 bank accounts, statement lines incl. the 25 unreconciled, bankTransactions, transfers, 2 manual journals, 3 saved reports, history events, P2 seeds). Generate monthly series with loops over fixed month arrays (no `Math.random`, no `new Date()` values). Write a dev-only sanity script `scripts/check-seed.mjs` (node) asserting: unique ids; every invoice/bill total = Σ lines + tax; every PAID doc has payments summing to total−credits; every reconciled statement line's `reconciliation.matched` ids exist and amounts sum to |line.amount|; Balance Sheet balances (Net Assets = Equity) at 2026-11-30; unreconciled counts 18/2/5.
- [x] **Pure utils** (no React, no browser APIs; imported by seed + UI):
  - `src/utils/money.js` — `round2`, `fmtMoney(n)` → `1,800.00`, `fmtGBP(n)` → `£1,800.00`, `calcLine`, `calcDocumentTotals(doc, taxRates)` (rules in data_model §2.8), `fmtDate('2026-11-03')` → `3 Nov 2026`, `addDays`, `dueDateFromTerms(date, terms)`, `todayISO()` (= local `new Date()` → `YYYY-MM-DD`, UI only).
  - `src/utils/ledger.js` — `buildJournal`, `accountBalance(state, code, asAt)`, `buildProfitAndLoss`, `buildBalanceSheet`, `buildAged`, `buildBankRecSummary`, `buildTrialBalance`, `buildAccountTransactions`, `fyStart(date, org)` (data_model §3).
  - `src/utils/reconcile.js` — `candidatesFor(state, line)`, `suggestionFor(state, line)` (data_model §4.6), `statementBalance(state, bankAccountId)`, `unreconciledCount(state, bankAccountId)`.
  - `src/utils/status.js` — `displayStatus(doc, today)` → 'Draft' | 'Awaiting Approval' | 'Awaiting Payment' | 'Overdue' | 'Paid' | 'Voided'.
- [x] **Store** `src/store/StoreContext.jsx`: on mount `await loadState('xero', createInitialData)`; render a neutral full-page loader (navy header skeleton + "Loading…") until resolved. Hold state in `useReducer`; expose `dispatch(action)` + typed action helpers (`createInvoice`, `approveInvoice`, `recordPayment`, `reconcileLine`, `saveReport`, …). **Persist via a wrapper**: every action creator computes `next = reducer(prev, action)` and, when `next !== prev`, calls `saveState('xero', next)` — no `useEffect` that posts on mount, no timers, no autosave intervals, no derived writes (overdue, balances) on load. All reducers tolerate missing arrays (`state.invoices || []`). New ids `${prefix}_${Date.now().toString(36)}${n}`; timestamps `new Date().toISOString()`; actor `state.currentUser.id`.
- [x] **Session-preserving navigation**: `src/components/SidLink.jsx` + `useSidNavigate()` that append the current `?sid=` (from `getSessionId()`) to every internal `to`; use them everywhere instead of raw `Link`/`navigate`. Anything leaving the SPA (downloads, print windows) uses `withSid()`.
- [x] **App layout** (`src/components/Layout.jsx`), per DESIGN.md §4–5:
  - Fixed 56px navy header (`#0B1F3A`): logo (inline SVG cyan circle + white "xero"), org switcher "Brightwater Creative Ltd ▾" (dropdown: org name + "Settings" → `/settings`, list showing current org ✓), menus **Home, Sales, Purchases, Reporting, Accounting, Tax, Contacts** (dropdown contents below), right icons **+**, **Search**, **Notifications**, **Help**, avatar "HC" (menu: name/email, "Profile" disabled-styled, no logout).
  - Menu contents (each item navigates; omit anything not implemented):
    - Sales: Sales overview `/sales` · Invoices `/invoices` · Quotes `/quotes` (P2) · Products and services `/products` · Customers `/contacts?type=customers` · Sales settings `/settings/invoice`.
    - Purchases: Purchases overview `/purchases` · Bills `/bills` · Purchase orders `/purchase-orders` (P2) · Suppliers `/contacts?type=suppliers` · Purchases settings `/settings/invoice`.
    - Reporting: All reports `/reports` · Profit and Loss · Balance Sheet · Aged Receivables Summary · Aged Payables Summary · Bank Reconciliation Summary · Trial Balance.
    - Accounting: Bank accounts `/bank-accounts` · Chart of accounts `/chart-of-accounts` · Manual journals `/manual-journals` (P2) · Bank rules `/bank-rules` (P2) · Accounting settings `/settings/financial`.
    - Tax: VAT returns `/reports/vat-return` (P2) · Tax rates `/settings/tax-rates`.
    - Contacts: All contacts · Customers · Suppliers · Groups `/contacts?group=…`.
  - Active top menu gets 3px white underline based on route prefix. Dropdowns close on outside click/Esc/navigation.
  - Below header: `<main>` with canvas `#F2F3F4`; each page renders its own white page-header band (breadcrumb, H1, actions).
  - `document.title` per page: `"<Page> | Brightwater Creative Ltd | Xero"`.
- [x] **Routing** (`App.jsx`, `BrowserRouter`, all routes inside StoreProvider + ToastProvider; unknown routes → friendly "Page not found" with link Home; hard reload on any route works):
  `/` → redirect `/dashboard` · `/dashboard` · `/sales` · `/purchases` ·
  `/invoices` (`?status=all|draft|submitted|authorised|paid|repeating`, `?overdue=1`, `?q=`) · `/invoices/new` (`?contactId=`) · `/invoices/:id` · `/invoices/:id/edit` ·
  `/bills` (same query params) · `/bills/new` · `/bills/:id` · `/bills/:id/edit` · `/bills/batch-payment?ids=a,b` · `/batch-payments/:id` ·
  `/bank-accounts` · `/bank-accounts/:bankAccountId/reconcile` · `/bank-accounts/:bankAccountId/statements` · `/bank-accounts/:bankAccountId/transactions` · `/bank-accounts/:bankAccountId/cash-coding` (P2) ·
  `/bank-transactions/new?type=spend|receive&bankAccountId=` · `/bank-transactions/:id` · `/bank-transfers/new?from=` · `/bank-transfers/:id` · `/payments/:id` ·
  `/reports` (`?tab=all|drafts|published|archived`) · `/reports/profit-and-loss` · `/reports/balance-sheet` · `/reports/aged-receivables` (`?view=summary|detail&contactId=`) · `/reports/aged-payables` · `/reports/bank-reconciliation` · `/reports/trial-balance` · `/reports/account-transactions` (`?accountCode=&from=&to=`) · `/reports/saved/:id` · `/reports/vat-return` (P2) ·
  `/contacts` (`?type=all|customers|suppliers|archived&group=`) · `/contacts/new` · `/contacts/:id` · `/contacts/:id/edit` ·
  `/products` · `/chart-of-accounts` · `/search?q=` ·
  P2: `/quotes`, `/quotes/new`, `/quotes/:id`, `/credit-notes/:id`, `/purchase-orders`, `/purchase-orders/:id`, `/manual-journals`, `/manual-journals/new`, `/bank-rules`, `/settings`, `/settings/organisation`, `/settings/invoice`, `/settings/financial`, `/settings/tax-rates`, `/settings/tracking`, `/settings/users`.
  Query params drive tabs/filters so deep links work; record pages with unknown id show "This invoice could not be found" + back link (no crash).
- [x] **Shared components**: `Button` (primary/standard/borderless/green/destructive, split variant), `Modal` (Esc, overlay click, focus trap), `ConfirmDialog`, `Toast` (UI only), `Tabs` (with counts), `DataTable` (checkbox column, sortable headers, row click, bulk bar, pagination 25/50/100/200, empty state "There are no items to display"), `StatusPill`, `DateInput` (text "3 Nov 2026" + calendar popover, stores ISO), `MoneyInput` (accepts "1,800" → 1800), `ContactPicker` (search, "+ Add contact" → quick modal: name, email, isCustomer/isSupplier), `AccountPicker` (grouped by type, "200 - Sales", searchable, archived hidden), `TaxRatePicker` (filtered by sales/purchases), `ItemPicker`, `SummaryTiles`, `HistoryNotes` (table + "Add note" modal), `PageHeader` (breadcrumb, title, actions).
- [x] **Empty/odd-world robustness**: every page renders with `{}` arrays empty, 1 record, 500 records, and records missing optional fields (no `contactName`, no `lineItems`, unknown `accountCode`, unknown `bankAccountId`). Verify by temporarily loading `?sid=empty` after `POST /post {action:'set', state:{invoices:[],bills:[],bankStatementLines:[],contacts:[]}}`.
- [x] **SCHEMA.md** at app root: every top-level key + record shapes (copy from data_model.md §1–2, adjust to code) and the **Observable State Changes** table (data_model.md §5, kept in sync with the reducer). Update it whenever an action changes.

## P1 — Primary Features

- [x] **TEST.md BUG-001**: New and copied bills must keep `invoiceNumber: ''`, use the supplier reference in payments/history, and leave sales invoice numbering unchanged.

### Homepage
- [x] **Homepage dashboard `/dashboard`**: page header "Brightwater Creative Ltd" (H1) + "Edit homepage" standard button (P2 behaviour; P1 = hidden until implemented). 3-column card grid (DESIGN §4), all figures derived via ledger/reconcile utils:
  - **Bank account cards** (one per `bankAccounts` with `showOnDashboard`): name (link → account transactions), sort code + number in caption, blue button **"Reconcile N items"** (→ `/bank-accounts/:id/reconcile`; hidden if N=0), "Statement balance" + date of latest line, "Balance in Xero" + today, SVG area sparkline of ledger balance at month-ends for 6 months, "Manage ▾" menu (Reconcile, Spend money, Receive money, Transfer money, Account transactions, Bank statements).
  - **Invoices owed to you**: rows "N Draft invoices · total", "N Awaiting approval", "N Awaiting payment", "N Overdue" (red); each row links to `/invoices?status=…`/`?overdue=1`; bar chart of AUTHORISED amountDue bucketed by due date: "Older", previous week, this week, next 3 weeks, "Future" (overdue bars red); clicking a bar → invoices list filtered by that due-date range; footer button "New invoice".
  - **Bills to pay**: same for bills; "+ New bill" link.
  - **Cash in and out**: last 6 calendar months grouped bars — cash in = Σ receipts into bank accounts (payments ACCREC, RECEIVE txns, excl. transfers), out = Σ spends (excl. transfers); hover tooltip with month, in, out, difference; summary line below.
  - **Profit or loss**: FY-to-date Income, Expenses, Net profit (from `buildProfitAndLoss`), link "View Profit and Loss report".
  - **Account watchlist**: accounts with `showOnDashboard`, columns Account, This month, YTD.
  - **Tasks**: links "N bank items to reconcile" (sum over accounts), "N invoices awaiting approval", "N bills awaiting approval", "N overdue invoices", "N overdue bills" (zero-count rows hidden).
  - **Recent invoice payments**: latest 5 ACCREC payments (date, contact, invoice number link, amount).

### W1 — Invoices
- [x] **[W1] Invoices list `/invoices`**: breadcrumb "Sales overview ›"; H1 "Invoices"; actions: primary split **"New invoice"** (menu: New repeating invoice (P2), New credit note (P2)), standard "Export" (downloads CSV of current filtered rows via Blob — UI only, no state write). **Summary tiles**: Draft (count, total), Awaiting approval, Awaiting payment (Σ amountDue), Overdue (red) — clicking selects the tab/filter. **Tabs** with counts: All · Draft · Awaiting Approval · Awaiting Payment · Paid · Repeating (P2 list of `repeatingInvoices`); `?status=` in URL. **Search panel** (toggle "Search"): text matches invoice number, reference, contact name, or amount (exact "1800"/"1,800.00"); date filter type Any/Invoice date/Due date with Start/End; "Search" applies, "Clear" resets; result count line "Showing items 1–25 of 46". **Table** columns ☐, Number, Ref, To, Date, Due Date, Paid, Due, Status (pill; Overdue derived red), Sent (✉ "Sent" when sentToContact); default sort Date desc; all headers sortable; row click → `/invoices/:id` (DRAFT → `/invoices/:id/edit`). Hide DELETED. **Bulk bar** (≥1 checked): "N items selected · GBP total" + actions depending on selection: **Approve** (only Draft/Submitted with valid account codes; confirm modal "Approve 3 invoices?"), **Delete** (Draft/Submitted only, confirm), **Mark as sent** (Authorised), **Print** (opens print view, P2 = toast "Preparing PDF"). Writes per data_model §5.
- [x] **[W1] Invoice editor `/invoices/new` & `/invoices/:id/edit`** (new-invoicing layout, DESIGN §5):
  - Header: back link "← Invoices", title "New invoice" / "Edit invoice INV-0047", status pill when editing.
  - Fields: **Contact** (ContactPicker, required; selecting applies contact payment terms → due date and default account/tax for new lines), **Issue date** (default today), **Due date** (default from contact or org terms: 30 days; preset menu "In 7 days / 14 days / 30 days / End of next month"), **Invoice number** (prefilled `INV-` + padded `nextInvoiceNumber`, editable, must be unique → error "Invoice number already exists"), **Reference**. "Optional details" toggle: Branding theme (Standard / Special projects), Currency (GBP, disabled), **Amounts are** (Tax exclusive / Tax inclusive / No tax).
  - Line table: Item (ItemPicker → fills description, unit price, account, tax), Description (textarea autosize), Qty (default 1), Price, Disc % (hidden unless column enabled via "⚙ Columns" menu toggles: Disc %, Tax amount), Account (AccountPicker; default contact/org 200), Tax rate (default from account), Amount (computed, right aligned); row ✕ delete; "+ Add line item"; at least 1 empty row shown. Totals block: Subtotal, "Total VAT" with per-rate lines ("VAT 20% · 300.00"; inclusive mode label "Includes VAT"), **Total** (bold, "GBP"). Live recompute via `calcDocumentTotals`.
  - Buttons: standard split **"Save & close"** (menu: Save & add another, Submit for approval), primary split **"Approve & email"** (menu: Approve, Approve & add another, Approve & print PDF (P2 print view)). Cancel/back with unsaved changes → confirm "Discard changes?".
  - Validation (top error banner + field highlights): Contact required; ≥1 line with description or amount; for Submit/Approve: each non-empty line needs Account; due date ≥ issue date; quantity ≠ 0. Lock date check (P2).
  - Writes: create → `invoices[+]` with status per button, `nextInvoiceNumber`++ (only on create when the default number was used), history 'Created' (+ 'Submitted'/'Approved'); edit → updated fields, recalculated totals, updatedAt/By, history 'Edited'. Editing AUTHORISED invoice with payments: block with message "This invoice has payments applied. Remove the payments to edit." "Approve & email" saves as AUTHORISED then opens the **Email modal** for the new invoice.
- [x] **[W1] Invoice view `/invoices/:id`**:
  - Header: "Invoice INV-0031", StatusPill, actions **Edit** (DRAFT/SUBMITTED/AUTHORISED w/o payments), **Email**, **Print PDF** (P2 print route `/invoices/:id/print`; P1 can be a disabled-looking item omitted), **⋯ menu**: Copy to new invoice (→ editor prefilled, new number), Mark as sent / Mark as unsent, Void (AUTHORISED w/o payments → confirm modal with optional reason), Delete (DRAFT/SUBMITTED), Add note.
  - Banner for DRAFT ("This is a draft invoice" + Edit, Approve) and SUBMITTED ("This invoice is awaiting approval" + **Approve** button, Edit).
  - Facts row: To (link to contact), Date, Due date (red "Overdue" if so), Invoice number, Reference, Amount due (large).
  - Document: line table (Description, Qty, Unit price, Disc, Account, Tax rate, Amount), Subtotal, VAT, Total; then each payment "Less Payment — 3 Nov 2026 — 1,800.00" (link `/payments/:id`), credit notes "Less Credit Note" (P2), **Amount Due**.
  - **Record a payment** panel (AUTHORISED with amountDue>0): Amount paid (default amountDue; must be >0 and ≤ amountDue — overpayment out of scope, error "Payment amount must not exceed the amount due"), Date paid (default today), Paid to (bank accounts select, default Business Current Account, required), Reference; **Add payment** → writes payment (isReconciled:false) and updates invoice; toast "Payment recorded".
  - **History & Notes** (collapsed by default, "Show history (N entries)"): Changes, Date (D MMM YYYY h:mm am), User, Details; "Add note" modal → history 'Note'.
- [x] **[W1] Email invoice modal** (from Approve & email, view → Email, bulk Email P2): To (prefilled contact email, comma list, required, email-format validation), "Send me a copy" checkbox, Subject (default "Invoice INV-0031 from Brightwater Creative Ltd for Ridgeway University"), Message (default template with greeting, amount due, due date, sign-off "Thanks, Hannah Clarke, Brightwater Creative Ltd"), "Include PDF attachment" checkbox (checked); **Send** → `emailLog[+]`, invoice.sentToContact=true/sentAt, history 'Sent'; toast "Invoice sent". Cancel writes nothing.
- [x] **[W1] Payment detail `/payments/:id`**: shows payment (type, contact, document link, bank account, date, amount, reference, Reconciled ✓/✗, statement line link). Actions: **Remove payment** (confirm; if reconciled warn "This will also unreconcile the bank statement line") → data_model §5 "Remove payment".

### W3 — Bills
- [x] **[W3] Bills list `/bills`**: breadcrumb "Purchases overview ›"; H1 "Bills"; primary split **"New bill"** (menu: New credit note (P2), New repeating bill (P2)); summary tiles (Draft, Awaiting approval, Awaiting payment, Overdue); tabs All · Draft · Awaiting Approval · Awaiting Payment · Paid · Repeating(P2); search panel (supplier, reference, amount, date range); columns ☐, From, Reference, Date, Due Date, Planned (plannedPaymentDate or "—"), Paid, Due, Status. Bulk: **Approve** / **Delete** on Draft & Submitted; on Awaiting Payment **Make payment ▾ → Batch payment** (navigates `/bills/batch-payment?ids=`; requires ≥1 AUTHORISED bill and, if 1 selected, also offers "Single payment" → bill view), **Void** (confirm; only bills without payments), Print (P2).
- [x] **[W3] Bill editor `/bills/new`, `/bills/:id/edit`**: header "New bill"; fields **From** (ContactPicker; defaults supplier purchase account/tax), **Date** (today), **Due date** (default org bills terms = 20th of following month, or contact terms), **Reference** (supplier invoice no.), Amounts are (default Tax exclusive); line table identical to invoice but tax picker filtered to purchase rates and account default 429; totals; attachments area "Drag files here or browse" (P2 → `/upload`, store `{url, original_name, size, content_type}` in bill.attachments). Buttons: **Save draft** (standard), **Submit for approval** (standard), primary split **Approve** (menu: Approve & add another, Approve & view next). Same validation as invoices (contact + accounts). Writes `bills[+]`/update + history.
- [x] **[W3] Bill view `/bills/:id`**: header "Bill — <Supplier> — <Reference>", StatusPill, actions Edit, ⋯ (Copy to new bill, Void, Delete, Add note, Schedule payment (P2)), banners for Draft/Submitted with **Approve**; facts From, Date, Due date (Overdue red), Reference, Amount due; document lines/totals/payments; **Make a payment** panel: Amount paid, Date paid, **Paid from** (bank account), Reference → **Make payment** writes `payments[+]` type ACCPAYPAYMENT; History & Notes.
- [x] **[W3] Batch payment `/bills/batch-payment?ids=`**: H1 "New batch payment"; fields **Payment date** (today), **Pay from** (bank account select, default Business Current Account), **Reference** (e.g. "Nov suppliers"); table From, Reference, Due date, Amount due, **Payment** (editable MoneyInput, default amountDue, 0 ≤ x ≤ amountDue; rows with 0 excluded), row remove ✕; footer **Total** live; non-AUTHORISED ids ignored with notice "2 bills could not be included because they are not awaiting payment". Green **Make payments** → `batchPayments[+]` + one payment per bill (`batchPaymentId`, `source:'batch'`) + bill amountPaid/amountDue/status + history per bill; redirect to `/batch-payments/:id` (detail: date, account, reference, list of bills & amounts, total, Reconciled status, action **Remove batch payment** (P2)). Reconcile screen treats an unreconciled batch as one candidate with kind `batchPayment` (amount = total).

### W2 — Bank accounts & reconciliation
- [x] **[W2] Bank accounts `/bank-accounts`**: H1 "Bank accounts"; actions "Bank rules" (P2), "+ Add bank account" (P2). One white card per bank account: name (link → transactions), "Barclays · 20-45-67 43218765", **Reconcile N items** button (blue; hidden when 0, shows "Account reconciled ✓" instead), Statement balance (+ date), Balance in Xero, Manage account ▾ (Reconcile, Bank statements, Account transactions, Spend money, Receive money, Transfer money). Credit card shows "Company Credit Card · ending 4417".
- [x] **[W2] Reconcile screen `/bank-accounts/:bankAccountId/reconcile`** (the signature screen, DESIGN §5 "Reconcile row"):
  - Page header: account name with switcher ▾ (other bank accounts), right side "Statement balance £x" and "Balance in Xero £y" figures, "Manage account ▾".
  - Account tabs: **Reconcile (N)** · Cash coding (P2) · Bank statements · Account transactions (routes above).
  - Toolbar: pagination "Items 1–10 of 18", page size 10/25/50, sort "Oldest first / Newest first" (default oldest first), text filter "Search statement lines" (payee/reference/amount).
  - Each unreconciled line row: left statement box (date, payee bold, reference, description, Spent/Received column with amount, "more ▾" → Discuss, View statement line details); centre **OK**; right box with tabs:
    - **Match** (default when `suggestionFor` returns a candidate): pale-green box showing contact, kind label ("Invoice INV-0031" / "Bill NC-88213" / "Payment: Boom FM" / "Spend Money" / "Transfer from Business Current Account" / "Batch payment"), date, amount; "View details" opens a read-only side drawer summarising the candidate record (link "Open" → its page); top-right link **Find & Match**. OK enabled. If no suggestion: tab shows "No matches found." + **Find & Match** button and the row defaults to the **Create** tab; OK disabled until a valid tab state exists.
    - **Create**: **Who** (ContactPicker; typing an unknown name offers "+ Add 'Pret A Manger' as a new contact" → creates contact on OK), **What** (AccountPicker, required), **Why** (description, required), **VAT** (TaxRatePicker; defaults from account; filtered by direction), optional Region/Department tracking (P2), link "Add details" (P2 → `/bank-transactions/new?...&statementLineId=` prefilled). OK enabled when Who, What, Why set. Bank-rule suggestion banner "Bank rule: Barclays monthly charges" prefilled (P2).
    - **Transfer**: "Transfer to" (spent) / "Transfer from" (received) select of other bank accounts (required), Description. If an unreconciled opposite-side transfer already exists for same amount within ±7 days, Match tab suggests it instead.
    - **Discuss**: textarea + "Save" (writes discussNote only; doesn't reconcile; row shows 💬 indicator when note exists).
  - **OK** (or Enter while focused in row) → `reconcileLine(...)` per data_model §5; the row fades out (300ms), counts in tab/header/dashboard update; no undo button (as in Xero) — reversal is via Account transactions → Unreconcile.
  - **Find & Match panel** (expands under the row, one open at a time): heading "Find & select matching transactions"; inputs "Search by name or reference", "Search by amount", checkbox "Show Spent items"/"Show Received items" (default the line's direction); candidate table ☐, Date, Name, Reference, Type (Invoice/Bill/Payment/Spend Money/Receive Money/Transfer/Batch), Amount (outstanding/total), and for selected invoice/bill rows an editable **Amount applied** (default outstanding; part payment allowed, 0 < x ≤ outstanding); selected list summary; **Adjustments ▾** → add "Bank fee" (account 404, No VAT) or "Minor adjustment" (account 860) row with signed amount input; footer totals "Statement line 1,494.00 · Total selected 1,500.00 · Adjustments −6.00 · **Out by 0.00**" (red when ≠ 0); green **Reconcile** enabled only when out by = 0.00; **Cancel** closes without writes. On Reconcile: payments created for invoice/bill rows (amount applied, date = line.date, source:'reconcile'), existing items marked reconciled, adjustment bankTransactions created, line reconciled with `method:'findmatch'`.
  - Empty state when N=0: illustration-free panel "You've reconciled all your bank statement lines 🎉" + link "View account transactions".
- [x] **[W2] Bank statements tab `/bank-accounts/:id/statements`**: table Date, Type (Credit/Debit), Payee, Reference, Description, Spent, Received, Status ("Reconciled" green / "Unreconciled" amber / "Deleted" grey); filter select All/Unreconciled/Reconciled/Deleted; search; row click → statement line drawer (fields + reconciliation details: method, matched items with links, reconciledAt/By, discuss note). P2: select unreconciled lines → **Delete** (status 'deleted'), deleted line → **Restore**.
- [x] **[W2] Account transactions tab `/bank-accounts/:id/transactions`**: action buttons **Spend money**, **Receive money**, **Transfer money**; table of every Xero item on this bank account (payments, bankTransactions, transfer sides, batch payments): Date, Description (contact / "Transfer to …"), Reference, Type, Spent, Received, Reconciled ✓ (green tick or blank); search + date filter; row click → `/payments/:id`, `/bank-transactions/:id`, `/bank-transfers/:id`, `/batch-payments/:id`.
- [x] **[W2] Spend / Receive money form `/bank-transactions/new?type=spend|receive&bankAccountId=`**: H1 "Spend Money" / "Receive Money"; fields To/From (ContactPicker), Date, Reference, Bank account (select, prefilled), Amounts are (default Tax inclusive); line table (Item, Description, Qty, Price, Account, Tax rate, Amount) + totals; **Save** → `bankTransactions[+]` source 'manual' isReconciled false (or, when `statementLineId` param present (P2 "Add details"), reconciled to that line); redirect to detail.
- [x] **[W2] Bank transaction detail `/bank-transactions/:id`**: type title ("Spend Money — Barclays Bank"), status line "Reconciled ✓ on 8 Nov 2026" or "Unreconciled", fields + lines + totals; actions ⋯: **Edit** (if unreconciled), **Unreconcile** (if reconciled → line back to unreconciled; transaction kept), **Remove & Redo** (if reconciled & created from reconcile: transaction.status='DELETED', line unreconciled), **Delete** (unreconciled only), Add note; History.
- [x] **[W2] Transfer money `/bank-transfers/new` + detail `/bank-transfers/:id`**: From account, To account (must differ), Date, Amount (>0), Reference → `bankTransfers[+]` (manual). Detail shows both sides with each side's reconciled status; **Delete** if neither side reconciled; **Unreconcile** per side.
- [x] **[W2] Unreconcile from payment / batch payment detail**: "Unreconcile" action on `/payments/:id` and `/batch-payments/:id` when reconciled (line → unreconciled, item isReconciled false; reconcile-created payment stays as a manual payment unless "Remove & Redo" chosen which deletes it and restores the invoice/bill amountDue).

### W4 — Reports
- [x] **[W4] Reports centre `/reports`**: H1 "Reports"; search "Find a report" filters names; tabs **All reports · Drafts (N) · Published (N) · Archived (N)** (`?tab=`). All tab: "Favourites" section (from `favouriteReports`) then categories — Financial performance: Profit and Loss; Financial statements: Balance Sheet; Payables and receivables: Aged Payables Detail, Aged Payables Summary, Aged Receivables Detail, Aged Receivables Summary; Reconciliations: Bank Reconciliation Summary; Taxes and balances: Trial Balance, VAT Return (P2); Transactions: Account Transactions. Each row: ☆/★ toggle (writes `favouriteReports`), name link. Drafts/Published/Archived tabs list `savedReports` (Title, Report type, Date range/as at, Created/Published by, Updated date), row click → `/reports/saved/:id`; row ⋯: Archive / Restore, Delete (confirm).
- [x] **[W4] Report shell (shared by all report pages)**: breadcrumb "Reports ›"; title block (report name, org name, period caption e.g. "For the month ended 30 November 2026" / "As at 30 November 2026"); **toolbar**: Date range (From/To DateInputs or single "Date" for as-at reports) + presets dropdown (This month, This quarter, This financial year, Last month, Last quarter, Last financial year, Month to date, Quarter to date, Year to date, End of last month, End of last quarter, End of last financial year — computed from `new Date()` and FY end 31 Mar), **Compare with** (None / 1–11 periods × Month/Quarter/Year; adds N earlier-period columns; current period is the leftmost column, older periods to the right), **More ▾** (Accounting basis Accrual/Cash (P2 cash), Show total column, Show YTD column, Hide accounts with zero balance (default on)), primary **Update** (settings take effect only on Update; unapplied changes show "Update to see changes"). Right actions: **Export ▾** (PDF, Excel, Google Sheets) → `reportExports[+]` + toast "Exporting Profit and Loss…" (Excel triggers a Blob CSV download named `Brightwater Creative Ltd - Profit and Loss.csv`; PDF → `window.print()` of the report region; Google Sheets → toast only), **Save as ▾** (Save as draft, Publish) → modal: Title (default "<Report> – <period>"), optional Note → `savedReports[+]` with settings, columns, rows, summary (data_model §2.17); ★ favourite toggle. Initial settings come from URL query (`?from=&to=&date=&compare=&periodType=`) so drill-down and deep links work; Update pushes them into the URL.
- [x] **[W4] Profit and Loss `/reports/profit-and-loss`**: default range "This month"; sections Trading Income (accounts + "Total Trading Income"), Cost of Sales ("Total Cost of Sales"), **Gross Profit**, Other Income, Operating Expenses ("Total Operating Expenses"), **Net Profit** (double rule). Compare columns + optional Total/YTD columns; Variance not required. Each account amount links → `/reports/account-transactions?accountCode=&from=&to=` for that column's period.
- [x] **[W4] Balance Sheet `/reports/balance-sheet`**: default "End of this month" (as at = last day of current month); sections **Assets** (Bank: 090/091/092; Current Assets: 610, 620, 630; Fixed Assets: 710, 711, 720, 721) "Total Assets"; **Liabilities** (Current Liabilities: 800, 820, 825, 830…; Non-current: 900) "Total Liabilities"; **Net Assets**; **Equity** (Capital – Ordinary Shares 950, Current Year Earnings, Retained Earnings) "Total Equity". Net Assets must equal Total Equity. Compare with N previous month/quarter/year ends. Drill-down links (Current Year Earnings → P&L for FY to date).
- [x] **[W4] Aged Receivables `/reports/aged-receivables`** (Summary default, `?view=detail`): "Date" (default today), **Ageing by** Due date / Invoice date, **Ageing periods** 4 × 1 month (P2 configurable). Summary columns Contact, Current, < 1 Month, 1 Month, 2 Months, 3 Months, Older, Total; totals row + "Percentage of total" row. Contact name → detail view filtered to that contact (invoice rows: Date, Number (link), Reference, Due date, Overdue days, Total, Paid, Credited, Due). Aged Payables `/reports/aged-payables` identical for bills.
- [x] **[W4] Bank Reconciliation Summary `/reports/bank-reconciliation`**: Bank account select (default Business Current Account), "Date" (default today); rows: **Balance in Xero**; "Plus: Outstanding payments" (unreconciled spends, listed with date/description/amount, e.g. btx_0099 Ink cartridges 48.00); "Less: Outstanding receipts" (unreconciled receipts, e.g. Boom FM 3,240.00); "Plus: Un-reconciled bank statement lines" (listed; signed); **Statement balance**; check row equals `statementBalance()`. Updates immediately after reconciliation.
- [x] **[W4] Trial Balance `/reports/trial-balance`**: "Date" as at (default end of last month), columns Account, Debit, Credit, YTD Debit, YTD Credit, grouped Revenue/Expenses/Assets/Liabilities/Equity; totals equal; account links drill down.
- [x] **[W4] Account Transactions `/reports/account-transactions`**: Account select (any account; default 200), date range; columns Date, Source (Receivable Invoice / Payable Invoice / Spend Money / Receive Money / Payment / Transfer / Manual Journal), Description, Reference, Debit, Credit, Running balance; opening and closing balance rows; source rows link to the record.
- [x] **[W4] Saved report view `/reports/saved/:id`**: renders the stored snapshot (rows/columns/summary — not recomputed) with banner "Draft report — last edited 8 Oct 2026 by Tom Reid" or "Published 10 Jul 2026 by Hannah Clarke"; actions: **Publish** (draft → published, publishedAt/By), **Edit** title & note (modal), **Refresh with latest data** (recompute rows/summary from current ledger with stored settings, updatedAt), **Archive**/**Restore**, **Delete** (confirm → removed), **Export** (→ `reportExports[+]` with savedReportId). Published reports are read-only except Archive/Export.

### Contacts & reference data
- [x] **Contacts list `/contacts`**: H1 "Contacts"; actions "New contact" (primary), "Export" (CSV, UI only); left filter list / tabs: All contacts, Customers, Suppliers, Archived, then "Groups" with each `contactGroups` name and count (`?type=` / `?group=`); search "Search contacts" (name, person, email, account number); table ☐, ★, Contact (name bold + primary person & email caption), Email, **You owe** (Σ bills amountDue), **They owe** (Σ invoices amountDue; overdue portion red caption "x overdue"); sortable; pagination. Bulk: **Add to group** (modal: choose existing or "New group" name → `contactGroups` write), **Archive** (confirm; blocked with message if contact has outstanding items), **Restore** (in Archived view). ★ toggles `contact.starred`.
- [x] **Contact detail `/contacts/:id`**: header name + StatusPill "Archived" if archived; actions **Edit**, **New ▾** (Invoice → `/invoices/new?contactId=`, Bill → `/bills/new?contactId=`, Quote (P2), Credit note (P2)), ⋯ (Archive/Restore, Add to group, Add note). Left card: contact person, email (mailto), phone, website, billing/delivery address, VAT number, payment terms, default accounts. Right: "Money coming in" (outstanding, overdue) and "Money going out" mini summaries; **Activity** table of this contact's invoices, bills, payments, bank transactions (Date, Type, Number/Ref, Amount, Status) with type filter; Notes/history.
- [x] **Contact form `/contacts/new`, `/contacts/:id/edit`** (also used by quick-add modal in pickers in a reduced form): Contact name* (unique case-insensitive among ACTIVE → error "A contact with this name already exists"), Account number, Primary person (First name, Last name, Email — validated format), Phone, Mobile, Website, Billing address (Line 1, Line 2, Town/City, Region, Postal code, Country select default United Kingdom), Delivery address with "Same as billing address" checkbox, **Financial details**: VAT number, Default sales account + VAT, Default purchases account + VAT, Invoice payment terms (number + type select: "day(s) after the invoice date" / "day(s) after the end of the invoice month" / "of the current month" / "of the following month"), Bills payment terms; Customer/Supplier checkboxes; Notes. Save → `contacts[+]`/update with createdAt/updatedAt; Cancel.
- [x] **Products and services `/products`**: H1 "Products and services"; "New item" button → modal: Code* (unique), Name*, "I sell this item" (sale price, sales account, tax rate, sales description), "I purchase this item" (cost, purchase account, tax, description); table Code, Name, Sale price, Cost price, Sales account; search; row click → edit modal; ⋯ Delete (confirm). Writes `items`.
- [x] **Chart of accounts `/chart-of-accounts`**: H1 "Chart of accounts"; tabs All accounts · Assets · Liabilities · Equity · Expenses · Revenue · Archive; search; table Code, Name (+ description caption), Type, Tax rate, YTD (balance from ledger, FY to date) — YTD links to Account Transactions; Watchlist ☆ toggle (`showOnDashboard`, P1 since it feeds homepage). P2: "+ Add account" / edit modal (code unique 1–10 chars, name, type, tax, description, show on dashboard) and Archive.

### Global
- [x] **Global "+" create menu** (header): New invoice, New bill, New contact, New quote (P2), New purchase order (P2), New manual journal (P2), Spend money, Receive money, Transfer money (each → its route, bank account defaulting to Business Current Account).
- [x] **Global search** (header 🔍 → overlay panel with input "Search Xero" focused): live results (debounced 150ms, max 5 per group) grouped **Contacts** (name/email/account number), **Invoices** (number, reference, contact, exact amount), **Bills** (reference, supplier, amount), **Bank transactions** (contact, reference, amount); ↑/↓ + Enter navigation; "See all results for '…'" → `/search?q=` page with the same groups (unlimited, tables). Read-only, no state writes.
- [x] **Sales overview `/sales`** & **Purchases overview `/purchases`**: H1 "Sales overview"/"Purchases overview"; tiles Draft / Awaiting approval / Awaiting payment / Overdue with amounts (link to list tabs); "Customers owing the most" (top 5 by amountDue) / "Suppliers you owe the most"; monthly invoiced/billed bar chart (6 months); buttons "New invoice"/"New bill". Read-only.
- [x] **Notifications panel** (bell): derived list (no state) — "3 bills awaiting your approval", "7 invoices are overdue", "18 bank statement lines to reconcile"; red dot when any; each links to the filtered view.

## P2 — Secondary Features
- [x] **TEST.md BUG-011**: Never show credit notes as overdue; fully allocated notes become PAID with zero amountDue, settlement date and linked history; correct the seeded paid note and document the observable writes.
- [x] **TEST.md BUG-009**: Block repeat quote/PO conversion by status and linked id; link seeded converted documents to existing invoices/bills.
- [x] **TEST.md BUG-010**: Use readable secondary-document history actions, include conversion target ids, and record Approved when saving into AUTHORISED.
- [x] **TEST.md VISUAL-006**: Use shared status pills and readable labels in secondary-document headers, lists and tabs.
- [x] **TEST.md BUG-008**: Record Submitted/Approved history when an existing invoice or bill changes status in the editor; unchanged-status edits keep only Edited.
- [x] **TEST.md BUG-006**: Preserve approval/submission timestamps and actors when editing a document without changing its status.
- [x] **TEST.md BUG-007**: Preserve deleted batch bill/payment ids and total, record deletedBy, and retain individual payment removal bookkeeping.
- [x] **TEST.md VISUAL-005**: Use Home in the dashboard tab title while keeping the organisation name as its H1.
- [x] **TEST.md BUG-002**: Part-paid bills record "Payment made" in history; invoices keep "Payment received".
- [x] **TEST.md BUG-003**: Repeating tab count comes from non-deleted repeating invoices.
- [x] **TEST.md BUG-004**: Saved-report history uses consistent Published/Archived/Restored/Edited/Refreshed action labels.
- [x] **TEST.md BUG-005**: Picker and Create menu accessible names match visible field labels.
- [x] **TEST.md VISUAL-001–004**: Keep invoice numbers/dates on one line and truncate references; label matching transaction types; align bank-card headers; remove duplicate profit headings and constrain the Amounts are control.
<!-- Depth and realism, implement only after every P1 item is solid. -->
- [x] **Quotes** (`/quotes`, `/quotes/new`, `/quotes/:id`): tabs All, Draft, Sent, Declined, Accepted, Invoiced; editor like invoice plus Expiry date, Title, Summary, Terms; actions Send (email modal → emailLog, status SENT), Mark as accepted/declined, **Create invoice** (→ new DRAFT invoice copied lines, quote.status 'INVOICED', invoiceId), Copy, Delete. Numbers `QU-` + nextQuoteNumber.
- [x] **Credit notes** (`/credit-notes/:id`, "New credit note" from invoice ⋯ / contact): editor like invoice; Approve; **Allocate credit** modal listing contact's outstanding invoices with amount to allocate (≤ remaining credit, ≤ amountDue) → `allocations[+]`, invoice.amountCredited/amountDue/status; refund via payment (ARCREDITPAYMENT) optional.
- [x] **Purchase orders** (`/purchase-orders`): tabs Draft, Awaiting approval, Approved, Billed; editor (Delivery date, Delivery address, Attention, Telephone, Delivery instructions); Approve; Send (emailLog); **Copy to bill** → new DRAFT bill, PO status BILLED, billId.
- [x] **Repeating invoices** (Invoices → Repeating tab): list (Reference/contact, Repeat "Every 1 month", Next invoice date, End date, Amount, Save as), editor (schedule, due-date rule, save as Draft/Approve/Approve for sending), Pause/Resume, Delete, **Create invoice now** (user click only) → new invoice, nextScheduledDate advanced.
- [x] **Manual journals** (`/manual-journals`, `/manual-journals/new`): Narration, Date, "Amounts are", lines (Description, Account, Tax rate, Debit, Credit), totals must balance ("Total is out by 12.00" error), Post / Save as draft, Void; feeds ledger.
- [x] **Bank rules** (`/bank-rules`): list; editor (Spend/Receive/Transfer; conditions payee/reference/description/amount with operator; contact; allocation lines with %; reference source); rules matching a statement line show "Bank rule: <name>" in Create tab prefilled; "Apply rule" OK writes bankTransaction `source:'bank-rule'`, bankRuleId.
- [x] **Cash coding tab**: spreadsheet-like grid of unreconciled lines with editable Payee/Account/Tax/Description columns, select rows → **Save & reconcile N items** (creates bankTransactions in bulk, method 'create').
- [x] **Import a statement** (Manage account ▾): CSV file chooser (parse locally with FileReader; columns Date, Amount, Payee, Description, Reference) → preview mapping → Import → `bankStatementLines[+]` `source:'import'`; duplicate detection warning.
- [x] **Statement line delete/restore** on Bank statements tab (status 'deleted', deletedAt).
- [x] **Account transactions → Mark as reconciled** (bulk select unreconciled items without statement lines).
- [x] **VAT Return report** `/reports/vat-return`: period select (quarters Mar/Jun/Sep/Dec); boxes 1–9 computed from ledger (Box 1 VAT due on sales, Box 4 VAT reclaimed, Box 5 net, Box 6 total sales ex VAT, Box 7 total purchases ex VAT, Boxes 2/8/9 = 0.00); "Submit to HMRC" button absent (read-only); Save as draft/Publish like other reports.
- [x] **Executive Summary / General Ledger Summary** reports (read-only, same shell).
- [x] **Cash basis** option in P&L / Balance Sheet / Trial Balance (`basis:'cash'`).
- [x] **Settings hub** `/settings`: cards Organisation details, Users, Invoice settings, Financial settings, Tax rates, Tracking categories, Chart of accounts. Pages: Organisation details form (name, legal name, registration no., VAT no., address, phone, email, website → `organisation`); Invoice settings (branding themes list + edit terms text, default payment terms sales/bills, number prefixes & next numbers); Financial settings (FY end day/month, lock date, VAT period); Tax rates (list + new tax rate modal name/rate/applies to); Tracking categories (add option, rename); Users (read-only table with roles, "Invite a user" disabled-styled omitted).
- [x] **Tracking** (Department) column in invoice/bill/spend line tables + filter in P&L.
- [x] **Edit homepage**: drag to reorder cards, hide/show via checklist, Save → `dashboardLayout`; Cancel discards.
- [x] **Invoice print view** `/invoices/:id/print` (A4 layout with branding theme name, org address, VAT number, bill-to, lines, totals, payment terms text) + `window.print()`; used by Print PDF / Approve & print PDF.
- [x] **Attachments** on bills/invoices/bank transactions via `POST /upload?sid=` (multipart) → store returned file meta in `attachments[]`; list with download link `withSid(file.url)`.
- [x] **Help drawer** (?) with static searchable list of help topics (no network).
- [x] **Keyboard**: in reconcile row, Tab cycles fields, Enter = OK; "/" focuses global search.

## Data Seed (implement in createInitialData())
<!-- Exact specs in data_model.md §4. Fixed ids, deterministic. -->
- [x] organisation (Brightwater Creative Ltd, GB, GBP, FY end 31 Mar, invoice settings next numbers INV 47 / QU 7 / CN 4 / PO 5), currentUser Hannah Clarke, 4 users.
- [x] accounts: 54 UK chart rows (data_model §2.3) incl. 3 bank accounts, watchlist flags on 200/400/469/478, 449 archived.
- [x] taxRates 9; trackingCategories 1 (Department ×3 options); brandingThemes 2; contactGroups 3.
- [x] contacts: 40 (20 customers incl. Truxton as customer+supplier, 18 suppliers, director, 1 archived) — each with person, email, phone, UK address; payment terms on 3 customers.
- [x] items: 14 (12 sold, 2 purchased-only).
- [x] invoices: 46 exactly per data_model §4.1 → Draft 6 / Awaiting Approval 4 / Awaiting Payment 11 (7 overdue at 18 Nov 2026) / Paid 24 / Voided 1; history events Created/Approved/Sent/Paid.
- [x] bills: 35 per §4.2 → Draft 3 / Awaiting Approval 3 / Awaiting Payment 7 (5 overdue) / Paid 22; one batch payment bp_0001 (2 July bills, 212.40).
- [x] payments: one per paid document (+ `pay_inv0027` unreconciled; INV-0007 1,092.00 + CN-0002 60.00).
- [x] bankTransactions: monthly series §4.3 (bank fees, Xero, Google, director's salary, Adobe on card, savings interest, HMRC VAT, 6 misc card spends) + unreconciled `btx_0099`.
- [x] bankTransfers: 2 savings transfers + 6 card repayments (§4.4).
- [x] bankStatementLines: reconciled history (one per Xero bank-side item) + **25 unreconciled** exactly per §4.5 (18 current / 2 savings / 5 card) covering: exact invoice match, exact bill match, existing-payment match, multi-invoice find & match, bank-fee adjustment, part payment, draft-invoice blocker, transfer pair, 8 create-type lines.
- [x] manualJournals: conversion balances 2026-03-31 + depreciation 2026-09-30.
- [x] savedReports: rep_0001 (P&L Q1 published), rep_0002 (BS 30 Sep draft), rep_0003 (Aged Receivables 31 Oct published) with computed snapshots; favouriteReports 3; reportExports [].
- [x] P2 seeds: 3 credit notes, 6 quotes (all statuses), 4 purchase orders, 2 repeating invoices, 3 bank rules, dashboardLayout.

## Verification checklist (dev self-test before handing to audit/playwright)
- [x] `npm run build` passes; `npm run preview` on 5413 serves `dist/` with the state API; `/go?sid=t1` returns `{initial_state,current_state,state_diff}`.
- [x] Idle tab for 60s posts nothing (no timers/effects writing state); load posts exactly one baseline `set`. TEST.md Round 2 records 60s on dev and 70s on built dist with zero idle POSTs, plus exactly one baseline POST.
- [x] Each workflow below produces the listed `state_diff` keys at `/go` (playwright must record these in TEST.md):
  - W1: create + approve & email invoice → `invoices`, `organisation`, `emailLog`, `historyEvents`; record payment → `payments`, `invoices`, `historyEvents`.
  - W2: reconcile U01 (Match) → `bankStatementLines`, `payments`, `invoices`; U04 (Find & Match ×2) → same; U05 (Create) → `bankTransactions`, `bankStatementLines`; U06 (Transfer) → `bankTransfers`, `bankStatementLines`; U09 (adjustment) → `bankTransactions` + `payments`; Discuss → `bankStatementLines`.
  - W3: create + approve bill → `bills`, `historyEvents`; batch payment of 2 bills → `batchPayments`, `payments`, `bills`.
  - W4: run P&L Last month compare 2 months → Save as draft → Publish → `savedReports`; Export Excel → `reportExports`; star Trial Balance → `favouriteReports`.
- [x] Injected worlds render: empty arrays, 1 invoice, 500 statement lines, missing optional fields; deep-link hard reload on `/bank-accounts/ba_090/reconcile?sid=x` and `/reports/balance-sheet?sid=x`.
- [x] No "Mock"/"Clone" text anywhere; no remote URLs in `dist/` (`grep -r "http" dist/assets | grep -v "w3.org"` empty of CDNs).

## Out of Scope
<!-- Dev must NOT implement these. -->
- Authentication / login / logout / sign-up / 2FA / password flows (app starts pre-logged-in as **Hannah Clarke**, Adviser, at Brightwater Creative Ltd); switching to other organisations.
- Real bank feeds, Open Banking connections, online payment gateways (Stripe, GoCardless, "Pay now" links), real email/SMS sending, HMRC MTD submission, Companies House filing.
- Payroll, Projects, Analytics (Syft), Short-term cash flow, Business snapshot, Fixed asset register, Expense claims / Expenses, Hubdoc / Files inbox, Inventory tracking, multi-currency & foreign exchange, Xero App Store integrations, subscription & billing — **omit their menu entries** (no dead links).
- Any timer-driven or "simulated" activity (no live balances, auto-generated repeating invoices, autosave intervals, random notifications).
- A React `/go` page (served by `templates/state-api.js`).


## Developer validation — 2026-11-18

All implementation items and seeds are checked above. See `DEV_VALIDATION.md`
for commands and scope. Build, seed invariants, primary/secondary state
transitions, 232 server-render cases, preview deep-link responses, API session
isolation, upload/download, and a 60-second client idle check pass. That round's
production preview check ran on port 5406.

Round 2 AUDIT.md reports no P0/P1 issues. TEST.md now records browser evidence
for W1–W4 and injected empty/single-record worlds; together with the 232 passing
developer render cases (including 500 statement lines), these complete the
workflow and injected-world checklist rows. BUG-001–005 and VISUAL-001–004 are
fixed and tracked above. AUDIT.md and TEST.md remain unchanged for their owning
agents to recheck.

TEST.md Round 2 closes the idle-tab row with 60s dev and 70s built-dist browser
checks (zero idle POSTs). This session fixes BUG-006/007 and VISUAL-005, adds
regressions for approval/submission metadata and whole/partial batch removal,
and updates SCHEMA.md. Build, seed, primary/secondary workflow, 232 render cases,
and production-preview API checks pass on port 5406. The reports remain unchanged
for their owning agents to recheck the new fixes. The official runtime certifier
`factory/hub_tools/dyn_certify.py` remains absent from this checkout.

TEST.md Round 3 and AUDIT.md Round 3 report no P0/P1 findings; all existing
TODO items were already checked. Fixed the remaining P2 BUG-008: saving an
existing invoice or bill in the editor now records Submitted/Approved on a
status transition, in addition to Edited. Unchanged-status edits preserve
approval/submission metadata and add no duplicate transition event. The workflow
regression reproduced the missing history before the fix and passes afterward,
covering both document types and Draft → Submitted, Draft → Approved, and
Submitted → Approved. SCHEMA.md documents the writes. AUDIT.md and TEST.md
remain unchanged for their owning agents.

TEST.md Round 4 and AUDIT.md Round 4 contain no open P0/P1 findings. Fixed
BUG-009/010 and VISUAL-006: converted quotes/POs reject repeat conversion even
without their linked ids; the seeded converted documents link to existing
records for the same contact; copying clears conversion links. Secondary
history uses readable actions, conversion target ids, and Submitted/Approved
events on editor status transitions. Headers/lists/tabs share readable status
labels and pill styling. Seed, primary/secondary workflow and 232 render checks
pass; targeted markup checks verify links, conversion actions and status labels.
SCHEMA.md and DEV_VALIDATION.md document the results. AUDIT.md and TEST.md
remain unchanged for browser/audit revalidation.

Round 5 reports show no open P0 or P1 findings. BUG-011 passes the seed,
secondary workflow, and server-render checks. Fully allocated credit notes
store a zero balance, the settlement date, and credit history linked to the
invoice. Previously saved fully allocated notes appear in the Paid tab, and
copies start with their full credit. Dev and built preview checks pass on 5413.
Harbor's Docker certifier passed on the built app, including hydration, one
baseline POST, and zero idle POSTs.
