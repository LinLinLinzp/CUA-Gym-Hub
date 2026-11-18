# FreshBooks research

FreshBooks is an invoicing and accounting workspace for small service businesses. The relevant loop is to record work and purchases, turn eligible activity into a client invoice, and record payment. Retainers add a scheduled fee and a time allowance, with separate billing for eligible excess after the period closes. The planned workspace belongs to a consulting studio. [FreshBooks product overview](https://www.freshbooks.com/) · [Accounting features](https://www.freshbooks.com/accounting) · [Retainers guide](https://support.freshbooks.com/hc/en-us/articles/360015379391-What-are-retainers)

## Personas and workflow entry points

| Persona | Primary work | Typical starting point |
| --- | --- | --- |
| Maya Chen, owner | Prepare drafts, review balances, send invoices and agree retainer terms | Dashboard → Create New, or Invoices → Retainers |
| Imani Brooks, controller | Enter purchases, match client billability, rebill and record client payments | Expenses, Invoices or Payments |
| Nico Alvarez, consultant | Record project work, confirm the service and mark eligible time against a retainer | Time Tracking → New Entry or Start Timer |

The personas and company names are fictional fixtures. The product's menu links Invoices, Expenses and Time Tracking from the main navigation. Its Dashboard can start an invoice, expense or retainer. Client-specific creation also exists for invoices and retainers. [Workspace overview](https://support.freshbooks.com/hc/en-us/articles/115011801007-How-do-I-get-started-in-FreshBooks) · [Dashboard guide](https://support.freshbooks.com/hc/en-us/articles/115015407988-How-do-I-use-my-dashboard)

## Feature inventory

| Priority | Areas | Planned behavior |
| --- | --- | --- |
| P0 | Shell, Dashboard and routing | Left navigation and utility search, linked client/project/payment surfaces, Create New, seeded dashboard metrics, deep links, loading and empty worlds |
| P0 | Harbor | Same-origin offline state middleware, session-scoped hydration and mutation, one baseline, verifier-visible state and no idle writes |
| P1 | Invoices | Scan/search/filter records. Create, edit and duplicate with line items, taxes, discount, terms and notes. Send, mark sent, record partial or full payment and manage visibility. |
| P1 | Time Tracking | Day/All ledgers, manual work logs, timer, billability, project/service and optional retainer. Search, filter, edit and apply eligible bulk actions. |
| P1 | Expenses | Detailed and quick forms, category, date, merchant, gross, taxes, currency, receipts and client/project assignment. Mark billable with optional markup. |
| P1 | Invoice from tracked activity | Review unbilled time and eligible expenses for the client, choose scope/format, preview lines and commit source links on invoice Save/Send. |
| P1 | Retainers | List, create, edit, track period work, explicitly issue a due fee, bill eligible excess, associate projects, and archive/delete/restore. |
| P2 | Secondary interaction | Week/Month time views, Retainer Summary, and documented desktop shortcuts. |

The web interface is the reference. Native mobile time tracking centers on a bottom tab and a compact timer. The App Store also emphasizes capture and billing from a phone. For the browser app, narrow layouts keep existing controls reachable and retain the desktop workflow names. [iOS time guide](https://support.freshbooks.com/hc/en-us/articles/115001745408-How-do-I-track-time-on-iOS) · [App Store listing](https://apps.apple.com/us/app/freshbooks-invoicing-app/id1052884030) · [Desktop keyboard shortcuts](https://support.freshbooks.com/hc/en-us/articles/360033786391-What-are-the-keyboard-shortcuts)

## Screens and interaction details

### Navigation and Dashboard

The desktop app pairs left-side navigation with utility controls for search and account access. On the Dashboard, creation actions sit beside the title. Outstanding invoices appear in a comparative bar with a currency control and aging breakdown. Create New and the chart links provide shortcuts into the underlying ledgers. Build the app's dashboard using metrics that the seeded business records can support. [Workspace overview](https://support.freshbooks.com/hc/en-us/articles/115011801007-How-do-I-get-started-in-FreshBooks) · [Dashboard guide](https://support.freshbooks.com/hc/en-us/articles/115015407988-How-do-I-use-my-dashboard)

### Invoices and Payments

The invoice list groups client/number, description, date pair and amount/status. A selection bar and per-row quick actions surface frequent operations. In the editor, the invoice document anchors the left side while settings and transaction actions sit beside it. Issue and due dates, client and reference precede the line-item table. Totals, notes and terms sit below. Save makes a draft on a new invoice. Send To opens a recipient and message review. The detail screen offers a separate Mark as Sent and a manual Add a Payment action. [Create an invoice](https://support.freshbooks.com/hc/en-us/articles/216631328-How-do-I-create-an-invoice) · [Manage invoices](https://support.freshbooks.com/hc/en-us/articles/4404632032013-How-do-I-manage-my-invoices) · [Record a payment](https://support.freshbooks.com/hc/en-us/articles/216631578-How-do-I-add-edit-or-delete-a-payment)

### Time Tracking

The day view places date navigation, member selection and weekday totals above the time entry list. The inline row carries assignment, service, date, notes, time amount and billable choice. The Start Timer action sits next to New Entry. All is a denser ledger with member/date, work detail, duration and billing state. The Week view groups rows by assignment/service across seven days. The timer can be paused or logged explicitly. [Track time](https://support.freshbooks.com/hc/en-us/articles/225525527-How-do-I-track-my-time) · [Review time entries](https://support.freshbooks.com/hc/en-us/articles/115002137288-How-do-I-review-time-entries)

### Expenses and rebilling

The list combines merchant/category, date/source, client/project/description and amount/tax/status. The full form has a receipt area and an adjacent settings pane. A billable expense belongs to a client and can carry a project, markup and a receipt-inclusion preference. Rebilling requires a same-client, same-currency invoice. Time and expense import opens an explicit scope review with a date range, projects, expense inclusion and time presentation. Preserve source IDs in every presentation format so the ledger can show why the source is billed. [Create an expense](https://support.freshbooks.com/hc/en-us/articles/216631488-How-do-I-create-an-expense) · [Attach a receipt](https://support.freshbooks.com/hc/en-us/articles/227480268-How-do-I-attach-receipts-to-my-bills-and-expenses) · [Rebill expenses](https://support.freshbooks.com/hc/en-us/articles/231963968-How-do-I-rebill-expenses) · [Generate an invoice from time](https://support.freshbooks.com/hc/en-us/articles/227602308-How-do-I-generate-an-invoice)

### Retainers

In Invoices → Retainers, a new agreement starts with terms and invoice schedule, then previews the billing document. The detail screen places terms next to period hours and budget, above tabs for invoices, time and projects. Time tracked to the agreement uses the allowance for its work period. For an expired period, the excess banner can open an invoice preview. The source product schedules invoices in the background. In Harbor, the due first invoice can be issued on final creation and later invoices are issued with an explicit action. The state stores the requested delivery preference and any simulated delivery. [Retainers guide](https://support.freshbooks.com/hc/en-us/articles/360015379391-What-are-retainers)

## Desktop visual references

Public FreshBooks support screenshots and one frame from its product walkthrough were downloaded and inspected for layout, terminology and interaction sequence. Screenshots are research references. Use the design tokens in [DESIGN.md](../DESIGN.md) for implementation.

| Local image | What the reference shows | Source |
| --- | --- | --- |
| [dashboard-shell.png](screenshots/dashboard-shell.png) | Walkthrough frame showing older blue navigation, Dashboard content, expanded creation menu and chart hierarchy | [FreshBooks walkthrough GIF](https://www.freshbooks.com/media/2025/10/BillOverview-Blog.gif) |
| [dashboard-create-new.png](screenshots/dashboard-create-new.png) | Recent content capture with title, primary action, stacked charts and the open creation menu | [Dashboard guide](https://support.freshbooks.com/hc/en-us/articles/115015407988-How-do-I-use-my-dashboard) |
| [dashboard-outstanding.png](screenshots/dashboard-outstanding.png) | Overdue/outstanding segments beside the aggregate and aging buckets | [Dashboard guide](https://support.freshbooks.com/hc/en-us/articles/115015407988-How-do-I-use-my-dashboard) |
| [invoice-row-actions.png](screenshots/invoice-row-actions.png) | Dense ledger, checkbox column, active row and quick action popover | [Manage invoices](https://support.freshbooks.com/hc/en-us/articles/4404632032013-How-do-I-manage-my-invoices) |
| [invoice-editor.png](screenshots/invoice-editor.png) | Full document frame, line-item table, numeric totals, settings and Save/Send To actions | [Create an invoice](https://support.freshbooks.com/hc/en-us/articles/216631328-How-do-I-create-an-invoice) |
| [invoice-import-dialog.png](screenshots/invoice-import-dialog.png) | Scope dialog with date selector, project search, Select All and No Project | [Generate an invoice from time](https://support.freshbooks.com/hc/en-us/articles/227602308-How-do-I-generate-an-invoice) |
| [expense-list.png](screenshots/expense-list.png) | Search, ledger headers and inline add row | [Create an expense](https://support.freshbooks.com/hc/en-us/articles/216631488-How-do-I-create-an-expense) |
| [expense-list-actions.png](screenshots/expense-list-actions.png) | Selected expense and bulk toolbar with merchant, category and amount row | [Manage expenses](https://support.freshbooks.com/hc/en-us/articles/4404624622349-How-do-I-manage-my-expenses) |
| [expense-editor.png](screenshots/expense-editor.png) | Category and purchase details with receipt area and settings rail | [Create an expense](https://support.freshbooks.com/hc/en-us/articles/216631488-How-do-I-create-an-expense) |
| [time-manual.png](screenshots/time-manual.png) | Day navigation and inline client/project, service, date, notes and time fields | [Track time](https://support.freshbooks.com/hc/en-us/articles/225525527-How-do-I-track-my-time) |
| [time-timer.png](screenshots/time-timer.png) | Start Timer entry point beside New Entry | [Track time](https://support.freshbooks.com/hc/en-us/articles/225525527-How-do-I-track-my-time) |
| [time-week.png](screenshots/time-week.png) | Seven-day editable grid, row totals and explicit Save | [Track time](https://support.freshbooks.com/hc/en-us/articles/225525527-How-do-I-track-my-time) |
| [time-all.png](screenshots/time-all.png) | Search and compact time/status cells with inline entry controls | [Review time entries](https://support.freshbooks.com/hc/en-us/articles/115002137288-How-do-I-review-time-entries) |
| [retainer-terms.png](screenshots/retainer-terms.png) | Client and terms sections, schedule radio options and Set and Continue | [Retainers guide](https://support.freshbooks.com/hc/en-us/articles/360015379391-What-are-retainers) |
| [retainer-overview.png](screenshots/retainer-overview.png) | Terms card, period chart, summary figures and linked ledgers | [Retainers guide](https://support.freshbooks.com/hc/en-us/articles/360015379391-What-are-retainers) |
| [retainer-excess.png](screenshots/retainer-excess.png) | Closed-period excess banner and invoice action | [Retainers guide](https://support.freshbooks.com/hc/en-us/articles/360015379391-What-are-retainers) |

## State design

The model uses IDs linking users, clients, projects, invoices, payments, time, expenses and retainer periods. Imported invoice lines keep quantities and source allocations. Payments and agreement periods use their own records. Totals, overdue aging, elapsed timer display and retainer progress are derived. The public API is evidence for the business objects and relationships. The Harbor state uses a local schema. [Planned record shapes](data_model.md) · [Invoices API](https://www.freshbooks.com/api/invoices) · [Time Entries API](https://www.freshbooks.com/api/time_entries) · [Expenses API](https://www.freshbooks.com/api/expenses)

The preselected owner is already in the workspace. The scoped workflows use local receipts, manual payment recording and simulated invoice delivery. Login, bank and payment integrations, native apps, external delivery and automatic billing are outside the offline exercise. [Workflow checklist](../TODO.md) · [Harbor contract](../../../HARBOR_CONTRACT.md)
