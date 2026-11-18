# PandaDoc planning data model

Use plain JSON. IDs and timestamps are strings, with UTC ISO timestamps. Monetary fields are finite numbers rounded to cents. Create IDs on confirmed actions, and use `new Date().toISOString()` for new action timestamps. Optional links and missing optional historical timestamps may be absent or null. Keep stored amounts and statuses authoritative and tolerate absent optional fields on injected records.

## Top-level state

| Key | Shape | Example |
| --- | --- | --- |
| `workspace` | `{ id, name, currentUserId, currency }` | `{ id: "ws_alder", name: "Alder Studio", currentUserId: "usr_maya", currency: "USD" }` |
| `users[]` | `{ id, name, email, role }` | `{ id: "usr_maya", name: "Maya Patel", email: "maya@alder.example", role: "member" }` |
| `contacts[]` | `{ id, name, email, company, title?, createdBy, createdAt }` | `{ id: "ct_hana", name: "Hana Soto", email: "hana@harborlight.example", company: "Harborlight Books", title: "Operations Director", createdBy: "usr_maya", createdAt: "2026-10-01T15:00:00.000Z" }` |
| `catalogItems[]` | `{ id, sku, name, description, category, unitPrice, currency }` | `{ id: "prd_workshop", sku: "STR-101", name: "Discovery workshop", description: "Two-hour stakeholder workshop", category: "Strategy", unitPrice: 450, currency: "USD" }` |
| `templates[]` | `{ id, name, category, description, ownerId, createdAt, updatedAt, sections: Section[], pricingTables: PricingTable[] }` | `tpl_launch`, “Brand launch proposal”, “Strategy”, “Scope and estimate for launch services”, `usr_maya`, fixed dates, an opening section and an estimate |
| `documents[]` | `Document[]` | `doc_harborlight`, below |
| `deliveries[]` | `{ id, documentId, recipientIds: string[], method: "link", subject?, message?, status: "sent", actorId, createdAt }` | `del_harborlight`, `doc_harborlight`, `["rcp_hana"]`, local link, “Website refresh proposal”, “Please review the scope”, sent by `usr_maya` |
| `signatures[]` | `{ id, documentId, recipientId, fieldId, completionId, method: "typed" \| "drawn", value, status: "signed", actorId, createdAt }` | `sig_hana`, `doc_harborlight`, `rcp_hana`, `fld_hana`, `cmp_hana`, typed value “Hana Soto”, actor `rcp_hana` |
| `signingCompletions[]` | `{ id, documentId, recipientId, signatureIds: string[], pricingSnapshot: PricingSnapshot[], currency, documentValue, status: "completed", actorId, createdAt }` | `cmp_hana`, `doc_harborlight`, `rcp_hana`, `["sig_hana"]`, decision snapshot, USD 891, actor `rcp_hana` |
| `activity[]` | `{ id, documentId?, actorId, actorType: "user" \| "recipient", type, relatedIds: string[], createdAt }` | `act_hana`, `doc_harborlight`, `rcp_hana`, recipient, `signing.completed`, `["cmp_hana", "sig_hana"]`, signing time |

Scalar fields in the shape column are strings unless another type is shown or they are named in the numeric and boolean rules below. Template and catalog ID prefixes have no relationship to the UI labels. Proposed activity types are `document.created`, `document.updated`, `document.duplicated`, `contact.created`, `recipients.updated`, `pricing.saved`, `pricing.removed`, `fields.updated`, `document.sent`, and `signing.completed`. For a compound Save draft, each affected area may append its own event within the one commit. Link child mutations through `relatedIds`.

## Document-owned records

| Record | Shape | Example values |
| --- | --- | --- |
| Document | `{ id, title, company?, ownerId, templateId?, sourceDocumentId?, status, currency, value, sections: Section[], recipients: Recipient[], fields: Field[], pricingTables: PricingTable[], signingOrderEnabled, createdAt, updatedAt, sentAt?, completedAt? }` | `doc_harborlight`, “Harborlight website refresh”, “Harborlight Books”, `usr_maya`, `tpl_launch`, `sent`, USD, 891, one scope section, Hana as signer, one signature field and one estimate |
| Section | `{ id, heading, body }` | `sec_scope`, “Scope of work”, “Review the storefront and prepare a revised content plan.” |
| Recipient | `{ id, contactId, name, email, role: "signer" \| "cc", order?, status: "pending" \| "completed", addedAt, completedAt? }` | `rcp_hana`, `ct_hana`, “Hana Soto”, `hana@harborlight.example`, signer, 1, pending |
| Field | `{ id, type: "signature", label, sectionId, recipientId, required, createdAt }` | `fld_hana`, signature, “Client signature”, `sec_scope`, `rcp_hana`, true |
| PricingTable | `{ id, name, currency, lineItems: LineItem[], discount: Adjustment, tax: Adjustment, subtotal, discountAmount, taxAmount, total, createdAt, updatedAt }` | `pt_estimate`, “Project estimate”, USD, two workshops, 10% discount, 10% tax, subtotal 900, discount 90, tax 81, total 891 |
| LineItem | `{ id, catalogItemId?, name, description, unitPrice, quantity, optional, selected, quantityEditable, lineTotal }` | `li_workshop`, `prd_workshop`, “Discovery workshop”, “Two-hour stakeholder workshop”, unit price 450, quantity 2, false, true, true, 900 |
| Adjustment | `{ type: "percent" \| "fixed", value }` | `{ type: "percent", value: 10 }` |
| PricingSnapshot | `{ tableId, total, lineItems: { lineItemId, selected, quantity, lineTotal }[] }` | `pt_estimate`, 891, workshop selected with quantity 2 and line total 900 |

Allowed document statuses are `draft`, `sent`, `viewed`, `completed`, `declined`, and `expired`. Seed any historical viewed status. Render links and open recipient routes without recording an automatic view. Opening a draft or unknown signing ID gives an explanatory state. Recipient name and email are snapshots at assignment. Catalog names, descriptions and prices are snapshots at insertion. The document's section and table order is array order. Enabled signer order uses positive integer `order` among signers and is absent for CCs.

`value`, `documentValue`, `unitPrice`, `quantity`, `lineTotal`, `subtotal`, `discountAmount`, `taxAmount`, `total` and `order` are numbers. `signingOrderEnabled`, `required`, `optional`, `selected` and `quantityEditable` are booleans.

## Pricing and completion rules

Use the document currency in every table and filter catalog choices to matching currency. Store a positive whole quantity and a nonnegative finite unit price. Require percent adjustments in 0–100 and fixed amounts at or above zero. Default both adjustments to zero. Required rows are always selected. An unselected optional row contributes zero. Round each selected `quantity × unitPrice` to cents and sum to the subtotal. Apply and round the discount against the subtotal, capped at that subtotal. Apply and round tax against the subtotal less discount. The pricing table total is subtotal less discount plus tax. Sum table totals for document value. For example, two workshops at USD 450 with a 10% discount and 10% tax produce USD 891. Deselecting an optional USD 300 support row reduces a USD 1,188 total to USD 891 under the same adjustments.

Link a signature to the document, an assigned field and recipient, and exactly one completion. Only an eligible current signer can finish. On Finish, check the latest in-memory document and the current sid's persisted state when revalidating a potentially stale signer session. Treat already completed recipient/field pairs as finished. Disable repeated submission while pending. Commit the signatures, completion, status, optional choice changes, and activity together. The first completion freezes the accepted price in this workspace. Each completion carries a snapshot of the accepted choices and value. Use the same timestamp across the records of one successful transaction. Preserve unrelated or unknown state keys.

The shared state API accepts whole snapshots. Render a stale-attempt message if revalidation detects a newer incompatible change. Use a per-session browser lock, where available, to serialize signing revalidation and commits across same-origin tabs, retaining the unchanged shared helper. Because `saveState` does not return an acknowledgment, confirm via the same sid's `/state` before releasing a signing lock or reporting a confirmed persisted finish. A timeout leaves the outcome unconfirmed and a retry revalidates against persisted state before doing anything.

## Fixed fixtures and injected data

Return fresh arrays and objects from `createInitialData()`. Include 36 proposals across six statuses, 30 contacts, 30 catalog items, 24 templates and three users. Use English labels, synthetic recipients and companies, `.example` email domains, fixed IDs and dates, and short but distinct proposal content.

- Use a mix of older and newer dates, overlapping company names, price ranges, and repeated status categories so the register's controls have visible effects. Use draft, sent, viewed, completed, declined, and expired documents. Use at least one sequential two-signer sent document, one blank draft, one draft with multiple tables, and an optional catalog row with editable quantity.
- Seed at least one sent proposal with a CC and signer, and a completed proposal with delivery, per-field signatures, completion snapshots, timestamps, and activity. Seed deliveries for sent and viewed fixtures and link active signer fields to live recipient IDs. Seed completed fixtures with coherent recipient and document statuses.
- Render arrays as empty when absent. For injected rows with omitted optional fields or missing linked records, show readable fallbacks and gate actions that require those references. Never repair injected data on mount. Handle large arrays with pagination or bounded views.
- Put the implemented state shapes and per-action writes in the final `SCHEMA.md`. Exercise the proposal, pricing table, and signature flows against `/go?sid=...` and record observed fields in `TEST.md`.
