# Google Merchant Center workflow research

Merchant Center is a workspace for keeping a retailer’s catalog up to date and diagnosing listings that cannot appear across shopping destinations. For Northline Supply Co., a catalog operator maintains offers and visibility, a feed operator configures recurring delivery and inspects rejected rows, and a merchant operations lead corrects product data or requests review. The synthetic account uses a single signed-in operator across all three routes.

## Feature inventory

| Priority | Feature | Planned interaction |
| --- | --- | --- |
| P0 | Account shell, navigation, and dashboard | Overview links from catalog, source and issue metrics into their working views. The persistent header identifies the merchant and operator. |
| P0 | State and fixture integration | Load via Harbor before rendering, keep sid in navigation, and persist each explicit business event with related IDs and structured payloads. |
| P1 | Catalog browsing and detail | Find products by offer ID or title and narrow by status, visibility, availability, market or source. Open attributed product details and linked issues. |
| P1 | Product editor and visibility | Add or edit an offer, change visibility individually or in bulk, and remove a manual item through confirmation. Approval and visibility are separate attributes. |
| P1 | Data source configuration | Browse primary and supplemental sources, add a file or scheduled source, and edit setup with validated timing. |
| P1 | Feed history and processing | Submit a small local file or run an offline fixture. Inspect status and accepted/rejected counts, row errors and product linkage. Remove a source from its detail screen. |
| P1 | Needs attention | Group the open work by impact and examine individual records. Route data corrections to the product editor and offer a review form for eligible issues. |
| P2 | Filtered issue export | Download affected records to a local CSV. |

## Public product behavior

- Merchants can add products individually, edit a product from its details, and change visibility in the product list or in bulk. Maintain separate status, availability and visibility columns. [Product editor](https://support.google.com/merchants/answer/12158381?hl=en) · [Product details](https://support.google.com/merchants/answer/12491108?hl=en) · [Visibility and status](https://support.google.com/merchants/answer/12488713)
- Product data sources arrange input by method, with setup and last update information. A file can be submitted directly or described by a file link with an update schedule. Processing reports contain results and diagnostics, so a saved configuration and a completed run should appear as distinct events. [Manage data sources](https://support.google.com/merchants/answer/13982673?hl=en-EN) · [Add products from a file](https://support.google.com/merchants/answer/12158380?hl=en) · [Schedule updates](https://support.google.com/merchants/answer/14991445?hl=en) · [Troubleshoot data sources](https://support.google.com/merchants/answer/13760862?hl=en-419)
- Needs attention brings together diagnostics and paths to correction or review. A missing identifier can lead to editing the affected attribute, while an eligible website check or disagreement opens a review request. The workspace records submission and exposes the pending state. [Merchant Center issues](https://support.google.com/merchants/answer/12153802) · [Fix missing or incorrect GTIN](https://support.google.com/merchants/answer/14899834?hl=en) · [Request a review](https://support.google.com/merchants/answer/13585221?hl=en-GB)
- Offer identity and approval concepts informed the local field choices. The app uses account-scoped opaque IDs and structured records tailored for Harbor verification. [Merchant API product identity](https://developers.google.com/merchant/api/guides/products/add-manage) · [Merchant API product status and issues](https://developers.google.com/merchant/api/guides/products/list-products-data-issues)

## Views

- **Overview** shows the synthetic account, catalog status breakdown, latest feed activity and a shortlist of open issues. Every summary link lands on matching records.
- **Products** uses a dense table with preview, offer identity, pricing, availability, approval and visibility. A product detail view brings together offer fields, the owning source and issues. The editor groups identity, pricing and availability, and listing metadata.
- **Data sources** shows source method, target market, latest run and status. Each source opens a setup and update-history workspace. The run panel supports a file picker or the configured local fixture and gives usable row diagnostics.
- **Needs attention** uses severity summaries and a filterable issue table. Issue details surface why the item appears, which product or source it affects, and the next available action. Review uses a short form with clear acknowledgement or explanation requirements.

The appearance comes from the [original design guide](../DESIGN.md). The [state model](data_model.md) covers merchant identity, offers, sources, runs, issues and action history. Keep sign-in, live integrations, remote file fetching and real policy adjudication outside the local account workflow.
