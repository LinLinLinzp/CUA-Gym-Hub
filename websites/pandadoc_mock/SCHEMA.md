# pandadoc_mock Schema

**Base URL** `http://localhost:5421/`  
**Go endpoint** `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject** `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset** `POST /post?sid=<sid>` with body `{"action":"reset"}`

`GET /state?sid=<sid>` returns the persisted snapshot in `stored_state`. The shared Vite middleware records the initial snapshot on the first write and restores it on reset. Diff entries are keyed by changed top-level keys. Business actions post a whole-state `set_current` snapshot through the shared helper and append activity. Search, unsaved form inputs, signing previews and open dialogs stay in the browser.

## State Schema

IDs, names, labels, email addresses, currency codes, lifecycle values, and timestamps are strings. New timestamps are UTC ISO 8601. A question mark marks an optional field. Monetary fields are finite numbers rounded to cents. A verifier can encounter additional keys from an injected world.

| Key | Record shape |
| --- | --- |
| workspace | id, name, currentUserId, currency |
| users[] | id, name, email, role |
| contacts[] | id, name, email, company, title?, createdBy (user ID), createdAt |
| catalogItems[] | id, sku, name, description, category, unitPrice (money), currency |
| templates[] | id, name, category, description, ownerId (user ID), createdAt, updatedAt, sections (Section[]), pricingTables (PricingTable[]) |
| documents[] | Document records from the table below |
| deliveries[] | id, documentId, recipientIds (string[]), method = link, subject?, message?, status = sent, actorId (user ID), createdAt |
| signatures[] | id, documentId, recipientId, fieldId, completionId, method = typed or drawn, value (typed text or a PNG data URL), status = signed, actorId (recipient ID), createdAt |
| signingCompletions[] | id, documentId, recipientId, signatureIds (string[]), pricingSnapshot (PricingSnapshot[]), currency, documentValue (money), status = completed, actorId (recipient ID), createdAt |
| activity[] | id, documentId?, actorId, actorType = user or recipient, type, relatedIds (string[]), createdAt |

## Document records

| Record | Fields |
| --- | --- |
| Document | id, title, company?, ownerId (user ID), templateId?, sourceDocumentId?, status = draft, sent, viewed, completed, declined or expired, currency, value (money), sections (Section[]), recipients (Recipient[]), fields (Field[]), pricingTables (PricingTable[]), signingOrderEnabled (boolean), createdAt, updatedAt, sentAt?, completedAt? |
| Section | id, heading, body |
| Recipient | id, contactId, name and email (contact snapshots), role = signer or cc, order? (positive integer signer position, enforced when signingOrderEnabled is true), status = pending or completed, addedAt, completedAt? |
| Field | id, type = signature, label, sectionId, recipientId, required (boolean), createdAt |
| PricingTable | id, name, currency, lineItems (LineItem[]), discount (Adjustment), tax (Adjustment), subtotal, discountAmount, taxAmount, total (all money), createdAt, updatedAt |
| LineItem | id, catalogItemId?, name, description, unitPrice (money), quantity (positive integer), optional, selected, quantityEditable (booleans), lineTotal (money) |
| Adjustment | type = percent or fixed, value (nonnegative number, at most 100 for percent) |
| PricingSnapshot | tableId, total (money), lineItems (array of objects with lineItemId, selected (boolean), quantity (integer), lineTotal (money)) |

A row contributes zero when it is optional and unselected. The table subtotal sums rounded line totals. The discount is capped at subtotal, then tax applies to subtotal less discount. The proposal value sums table totals. A signer’s first completion locks that proposal’s accepted pricing for the remaining signers. Each completion records the accepted value and item choices at that point.

### Default IDs

| Entity | Fixed IDs and patterns |
| --- | --- |
| Workspace and users | `ws_alder`, `usr_maya`, `usr_elena`, `usr_jamie` |
| Proposals | `doc_harborlight` and `doc_02` through `doc_36`. `doc_02` has two pricing tables, `doc_08` is a blank draft, and `doc_04` is completed. |
| Contacts | `ct_<given-name-in-lowercase>`, including `ct_hana`, `ct_rowan`, and `ct_priya`. |
| Catalog and templates | `prd_workshop` and `prd_<group>_<index>`, `tpl_launch` and `tpl_<group>_<index>`. Group and index numbers start at zero. |
| Sequential signing fixture | `rcp_harborlight_0` and `rcp_harborlight_1` are signers. `rcp_harborlight_2` is a CC. The fields are `fld_harborlight_0` and `fld_harborlight_1`, and the delivery is `del_harborlight`. |
| Pricing and completed fixtures | `pt_harborlight` contains `li_harborlight_0` and optional `li_harborlight_1`. `sig_04` links `fld_04_0`, `rcp_04_0`, and `cmp_04`. |

## Minimal Inject Example

Use the following as the `state` value in a `set` request. Arrays replace defaults. Including each array makes this a single draft workspace without unrelated seeded records.

```json
{
  "workspace": {"id": "ws_alder", "name": "Alder Studio", "currentUserId": "usr_maya", "currency": "USD"},
  "users": [{"id": "usr_maya", "name": "Maya Patel", "email": "maya@alder.example", "role": "member"}],
  "documents": [{
    "id": "doc_example",
    "title": "Studio planning proposal",
    "ownerId": "usr_maya",
    "status": "draft",
    "currency": "USD",
    "value": 0,
    "sections": [{"id": "sec_example", "heading": "Scope of work", "body": "Prepare the workshop plan."}],
    "pricingTables": [],
    "recipients": [],
    "fields": [],
    "signingOrderEnabled": false,
    "createdAt": "2026-11-18T12:00:00.000Z",
    "updatedAt": "2026-11-18T12:00:00.000Z"
  }],
  "contacts": [],
  "catalogItems": [],
  "templates": [],
  "deliveries": [],
  "signatures": [],
  "signingCompletions": [],
  "activity": []
}
```

## Observable State Changes (for LLM evaluation)

| User action | State writes | Activity type and related IDs |
| --- | --- | --- |
| Create blank proposal | Append a document with draft status, actor as ownerId, currency, title, company, initial section, empty pricingTables/recipients/fields, value 0, signingOrderEnabled false, createdAt and updatedAt. | document.created, empty |
| Create from template | Append the draft with templateId, copied sections and pricingTables, fresh IDs for sections, tables and rows, and calculated value. | document.created, template ID |
| Save draft content | Update title, company, sections and updatedAt. | document.updated, saved section IDs |
| Duplicate proposal | Append a draft with sourceDocumentId, inherited templateId where present, copied sections and pricingTables with fresh IDs, recalculated value, empty recipients and fields, and fresh ownership and timestamps. | document.duplicated, source document ID |
| Create contact | Append contacts[] with name, email, company, title, createdBy and createdAt. | contact.created, contact ID |
| Save recipients | Update documents[].recipients, including contact snapshots, role, state, addedAt and enabled signer order. Update signingOrderEnabled and updatedAt. | recipients.updated, saved recipient IDs |
| Save signature fields | Update documents[].fields, including assignment IDs, type, label, required and createdAt. Update updatedAt. Save draft can write recipients and fields in one transaction. | fields.updated, saved field IDs |
| Save pricing table | Insert or replace a table in documents[].pricingTables. Save lineItems, adjustments, calculated row and table amounts, table timestamps, document value and updatedAt. | pricing.saved, table and row IDs |
| Confirm pricing table removal | Remove a pricing table with its rows and recalculate document value. Update updatedAt. | pricing.removed, removed table and row IDs |
| Send proposal | Append deliveries[] linked to the proposal and recipient IDs, and save optional subject/message. Set document status = sent, sentAt and updatedAt. | document.sent, delivery and recipient IDs |
| Finish as an eligible signer | Append one signatures[] entry per captured field, plus a signingCompletions[] entry linked to the new signatures and accepted pricing snapshot. Set signer status = completed and completedAt, and update document updatedAt. Commit eligible selected/quantity changes and calculated totals as part of the same action. On the last signer, set document status = completed and completedAt. | signing.completed, completion and signature IDs |
| Search, filter, paginate, open a proposal or signer link, or abandon a draft/signing preview | No business-state write. | None |

A compound draft save creates one activity entry for each saved area. The snapshot keeps additional injected keys. The first load per sid and browser storage profile uses the shared helper to post a baseline. Reloads in that profile read current state without a new baseline. Transactions reread the server and confirm persistence before reporting success. Same-origin tabs in the same browser profile serialize commits with the browser Web Locks API when available. See [AUDIT.md](AUDIT.md) for known exceptions to persistence and record linking.
