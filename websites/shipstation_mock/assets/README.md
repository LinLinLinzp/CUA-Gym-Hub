# ShipStation workflow research

ShipStation supports the day-to-day fulfillment queue for a merchant team. Northline Goods is a synthetic account with a shipping coordinator creating and correcting orders, an outbound lead preparing grouped shipments, and a warehouse associate reconciling returns. The same signed-in workspace provides access to all three jobs.

Public ShipStation help and API references informed the workflow names and lifecycle below. The workspace design and all display assets are specified locally in [DESIGN.md](../DESIGN.md).

| Priority | Feature | Workspace treatment |
| --- | --- | --- |
| P0 | Account shell | A left rail with Orders, Labels, Batches, and Returns, a text wordmark, and signed-in account context. |
| P0 | Harbor runtime | A shared loaded world, session-aware routing, and verifier-readable action records. |
| P1 | Find and review orders | Status filters and store search lead to a full record with recipient, items, shipping options, and related records. |
| P1 | Manual order management | A form creates an order and optional items. An unshipped order can be edited, held, released, marked paid, or cancelled when eligible. |
| P1 | Outbound labels | A shipping options review leads to label creation, preview, print request, or void. Labels has its own searchable list and detail views. |
| P1 | Batch fulfillment | Select orders from the queue or batch detail, review shipment readiness, process the group in one operation, print the generated labels, and archive. |
| P1 | Returns | Select items and reasons from an eligible order, authorize an inbound label, and track status through receipt or cancellation. |
| P1 | Verification | Exercise each workflow on localhost and match UI results to `/go` fields. |

## Product behavior behind the plan

- **Orders.** Fulfillment work starts in Awaiting Shipment. Manual orders have a recipient, address, and manual store, with line items optional. The queue combines status and search so operators can switch from a worklist to a known order. [View, Search, and Sort Orders](https://help.shipstation.com/hc/en-us/articles/360025869052-View-Search-and-Sort-Orders), [Create Manual Orders](https://help.shipstation.com/hc/en-us/articles/360035969692-Create-Manual-Orders)
- **Labels.** Configure origin, carrier service, package, and weight before creating postage. Creation moves the order into Shipped. Voiding retains the label history and can reopen the order. The local Labels page presents outbound label history and return labels together with direction filters. [Create & Print Your First Label](https://help.shipstation.com/hc/en-us/articles/360026156831-Create-Print-Your-First-Label), [Void Labels](https://help.shipstation.com/hc/en-us/articles/360026157751-Void-Labels)
- **Batches.** Create a named group, add eligible orders, process to produce labels, and archive the completed batch. The plan uses one open batch per order and a validation step before a single state commit. [Create a Batch](https://help.shipstation.com/hc/en-us/articles/4405152102171-Create-a-Batch), [Introduction to Batch Shipping](https://help.shipstation.com/hc/en-us/articles/360035969752-Introduction-to-Batch-Shipping)
- **Returns.** A return references a shipped order, item quantities and reasons, and an inbound label. Outstanding returns can be recorded as received. Cancelling an unused return preserves the record and voids its label. [Create Return Label for an Existing Order](https://help.shipstation.com/hc/en-us/articles/54111736057371-Create-Return-Label-for-an-Existing-Order), [Mark Returns as Received or Completed](https://help.shipstation.com/hc/en-us/articles/49977335759771-Mark-Returns-as-Received-or-Completed), [Return Details](https://help.shipstation.com/hc/en-us/articles/49977365977627-Return-Details)
- **Record boundaries.** Orders, labels, batches, and returns have stable identifiers and reference one another. The workspace uses a label record for each shipped package, with separate records for each return authorization and group of outbound orders. [ShipStation API v2](https://docs.shipstation.com/apis/openapi)

## Data and boundaries

See [data_model.md](data_model.md) for shapes, links, examples, and selection of seed fixtures. See [TODO.md](../TODO.md) for implementation order and observable state writes. Rates and print previews are generated locally. Account setup, live carrier/store integrations, email, billing, and the customer returns portal are outside the fulfillment workflows in this build.
