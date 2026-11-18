# Toast product research

Toast brings restaurant menu configuration, order records, employee time entries, and refund review into a back-office workflow. This workspace uses a synthetic restaurant, Juniper & Rye, with Maya Chen as the operations manager. The manager can publish a price change before service, take or close a check during service, adjust an employee’s time entry, and resolve a refund against the original payment.

## Workflows and product references

| Priority | Area | Workspace behavior |
| --- | --- | --- |
| P0 | Account entry and navigation | Start in the operations overview. Link to Menus, Orders, Labor, and Refunds using the persistent section rail. Each workflow opens independently on reload. |
| P1 | Menu configuration | An item sits inside a menu group, and a group sits inside a menu. Saved configuration can be reviewed before publishing. Published availability and price feed new checks. |
| P1 | Order handling | Search or filter checks, examine the order ledger, add item selections to an open check, record a synthetic tender, or void an open check. Paid orders remain available for lookup and refund. |
| P1 | Labor corrections | Find a time entry by employee, job, date, or status. Correct recorded times and breaks or close an open entry. Save the reason with the before/after record. |
| P1 | Refunds | Begin at an eligible paid check, choose full, by item quantity, or custom amount, and review the amount before confirming. The refunds ledger links back to the sale. |
| P2 | Operations overview | Summaries show saved menu changes, open checks, employees clocked in, and refunds. Recent check links provide direct access to the order section. |

- Toast models menus, groups, and items as a hierarchy. Menu configuration changes such as adding an item or changing a price can be saved and then published to sale channels. [Menu hierarchy](https://doc.toasttab.com/doc/platformguide/adminMenuHierarchy.html) · [Publishing menu changes](https://doc.toasttab.com/doc/platformguide/adminUnderstandingWhenToPublishYourMenuMenuManager.html)
- An order can contain checks, item selections, and payments. A check can be entered before payment and completed later. The training workspace models one check and one tender per order. [Orders API overview](https://doc.toasttab.com/openapi/orders/overview/) · [Creating orders](https://doc.toasttab.com/doc/devguide/apiCreatingOrders.html)
- Time entries refer to actual clock-in and clock-out. Managers can correct recorded entries. Business dates and clock times are separate, which matters for overnight shifts. [Shifts overview](https://doc.toasttab.com/doc/platformguide/platformShiftsOverview.html) · [Time entries and breaks](https://doc.toasttab.com/doc/platformguide/platformShiftsTimeEntriesAndBreaks.html)
- Toast documents item-quantity, full-check, and custom-amount refund paths. Toast Web supports credit card and Toast gift card refunds. Toast limits a credit card payment to one refund, including a partial refund. [Issuing a refund](https://doc.toasttab.com/doc/platformguide/adminIssuingARefund.html) · [Refund permissions and limitations](https://doc.toasttab.com/doc/platformguide/adminRefundPermissionsLimitations.html)

## Screen composition

- **Overview** has a page heading, a row of linked summaries, and a recent-check table.
- **Menus** opens on a searchable item index. Menu and group controls expose the hierarchy, and the item editor keeps pricing and availability together. Published or draft status sits on each row. The publication dialog summarizes the changes ready to publish.
- **Orders** has search, status/date/service filters, and a check table. Order detail places the items ledger next to the total and tender summary. Open-check actions appear near the detail heading. The refund action appears with the tender.
- **Labor** shows a list of time entries with clock-in, clock-out, breaks, hours, and tips. The editor presents business date and clock timestamps together and shows the correction reason on updates.
- **Refunds** combines a Find a check entry point with a searchable history ledger. Starting from a paid check opens the refund form and review. The refund detail links to the check so managers can confirm the original quantities and tender.

See [Design](../DESIGN.md) for the original visual direction, [Data model](data_model.md) for records and relationships, and [TODO](../TODO.md) for acceptance criteria. The workspace uses fixed synthetic data and starts signed in. Authentication, networked payment processing, real receipt delivery, and payroll transfers are outside the scenario.
