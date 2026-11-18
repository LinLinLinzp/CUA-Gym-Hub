# PandaDoc workflow research

PandaDoc combines document authoring, pricing, recipient management, delivery, and signature completion. The local Alder Studio workspace focuses on an account manager preparing a client proposal, a sales lead checking the price and deal status, and a client reviewing options and signing.

## Feature inventory

| Priority | Area | Experience |
| --- | --- | --- |
| P0 | Workspace overview | Status counts and recent proposals derived from the register. |
| P0 | Document register | Search titles, companies and recipients, combine search and status filters, sort, paginate, open a document, and handle zero results. |
| P0 | App and state | Session-preserving routing, initial load, user-only commits, local assets, and injected-world support. |
| P1 | Proposal editor | Start blank or use a template, edit sections, save drafts, and duplicate proposals from the register or detail page. |
| P1 | Recipients and sending | Connect contacts, assign roles, configure order, review validation, and publish local signing links. |
| P1 | Pricing table | Build from catalog products and custom rows, configure recipient options, and calculate totals. |
| P1 | Field placement | Attach a required or optional signature field to a section and recipient. |
| P1 | Recipient experience | Review the document, select allowed pricing options, type signatures, and finish in the configured sequence. |
| P1 | Supporting libraries | Browse templates, look up catalog products, and select or add contacts when preparing a document. |
| P2 | Interaction depth | Add drawn signatures, owner/date filters, and expanded row-menu keyboard support. |

## Behavior used in the plan

- Document status and value are read from records. Searches combine with filters. A duplicate starts as a draft. The workspace shows count and status separately from the details of a particular proposal. [Home](https://support.pandadoc.com/en/articles/9714824-home) · [Manage documents and templates](https://support.pandadoc.com/en/articles/9714835-manage-your-documents-templates-and-content-library-items)
- Template roles identify participants before specific contacts are assigned. Before sending, the author can see which signer owns each field. Sequential signing becomes available signer by signer when each participant confirms completion. [Roles and recipients](https://support.pandadoc.com/en/articles/14812677-roles-recipients-signing-order-and-switching-signers) · [Field assignment](https://support.pandadoc.com/en/articles/9714628-assigning-fields-to-recipients) · [Signing order](https://support.pandadoc.com/en/articles/9714771-signing-order)
- Products can come from the catalog. Quantity, unit price, discounts and taxes determine totals. Recipients can choose optional items and change quantities on eligible rows. The seed explicitly calls for a Pricing table, which remains the author-facing label in this workspace. [Pricing table setup](https://support.pandadoc.com/en/articles/9714703-pricing-table-add-and-set-your-pricing-table) · [Discounts and taxes](https://support.pandadoc.com/en/articles/9714706-pricing-table-discounts-and-taxes) · [Recipient options](https://support.pandadoc.com/en/articles/9714705-pricing-table-optional-items-and-editable-quantity)
- Review and send and Finish are distinct actions. A signer can fill assigned fields before explicitly completing. Record both signatures and signer completion so that a verifier can distinguish individual field values, partial completion and final completion. [Send and sign a document](https://support.pandadoc.com/en/articles/9714673-send-and-sign-a-document-new-experience) · [Recipient's guide](https://support.pandadoc.com/en/articles/9714786-sign-a-pandadoc-recipient-s-guide) · [Document details](https://developers.pandadoc.com/reference/document-details)

## Original workspace layout

The overview opens directly to the workspace with document counts and recent activity. The register uses a document-title link and a compact row menu. The proposal editor presents a paper surface with section navigation, an inspector for recipients and fields, and a focused editor for wide pricing tables. Templates use locally designed document previews. Catalog and Contacts use search and compact tables. The signing route narrows the frame around the document, permitted choices, and the current signer's remaining fields. See [DESIGN.md](../DESIGN.md) for tokens and responsive layouts.

## Data and scope

Documents own their sections, recipients, fields and pricing tables. Contacts, products and templates are reusable library records. Deliveries, signatures, signing completions, and activity link back to document IDs. [Data model](data_model.md)

The workspace starts with a synthetic account and reserved example addresses. The local send record and local signer links cover delivery and completion without authentication, external messaging, identity verification, payment, or integration dependencies.
