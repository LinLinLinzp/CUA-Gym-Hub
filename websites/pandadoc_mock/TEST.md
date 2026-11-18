# PandaDoc Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5421  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| App routes tested | 7 |
| Seed workflows passed | 3 of 3 |
| Passing workflow and control groups | 14 |
| Open P0 defects | 2 |
| Open P1 defects | 3 |

Node Playwright from `PILOT_PLAYWRIGHT` drove installed Chromium on both Vite dev and the production build served through Vite preview. Production build sessions were `workflow_1795000109726`, `audit_1795000110038`, and `controls_1795000109811`. The test harnesses and locally captured screenshots are in the ignored `test-results` directory.

## ✅ Passing Tests

### Seed workflow state changes through `/go`

| SEED.md workflow | Exact changed state paths verified |
| --- | --- |
| Proposals | `documents[]` gained draft records with `id`, `title`, `company`, `ownerId`, `currency`, `status`, `value`, `createdAt`, `updatedAt`, sections, and linked `templateId` or `sourceDocumentId` where applicable. Draft saves changed `title`, `company`, `sections[]`, and `updatedAt`. Recipient saves changed `recipients[]` and `signingOrderEnabled`. Send added `deliveries[]` with `documentId`, `recipientIds`, `actorId`, `method`, `subject`, `message`, `status`, and `createdAt`, and changed the proposal's `status`, `sentAt`, and `updatedAt`. Contact creation added `contacts[]`. Each write appended linked `activity[]` entries. |
| Pricing tables | Saving or removing a table changed `documents[].pricingTables[]`, `value`, and `updatedAt` and appended `activity[]`. Verified table `discount`, `tax`, `subtotal`, `discountAmount`, `taxAmount`, and `total`, plus ordered `lineItems[]` with `catalogItemId` where applicable, `description`, `unitPrice`, `quantity`, `optional`, `selected`, `quantityEditable`, and `lineTotal`. Recipient acceptance persisted eligible `quantity` and `selected` choices, recalculated totals and document `value`, and stored `signingCompletions[].pricingSnapshot[]` and `documentValue`. |
| Signatures | Saving placement changed `documents[].fields[]` with `id`, `label`, `type`, `required`, `sectionId`, and `recipientId`. Finish added `signatures[]` with `documentId`, `recipientId`, `fieldId`, `completionId`, `method`, `value`, and `createdAt` and added `signingCompletions[]` with `documentId`, `recipientId`, `signatureIds`, `pricingSnapshot`, `documentValue`, and `createdAt`. Finish changed `documents[].recipients[].status` and `completedAt`, changed `documents[].updatedAt`, and appended `activity[]`. The last signer changed `documents[].status` to `completed` and set `completedAt`. |

### Workflow details

| Workflow | Result and persisted fields checked |
| --- | --- |
| Workspace and register | PASS. Verified 36 proposals, 30 contacts, 30 products, 24 templates and 3 users. Followed the Draft count to Documents, combined Draft and Sent, paginated, searched by recipient, exercised empty results, sorted by title, and applied owner and modification-date filters. No changes to state_diff. |
| Create and edit a proposal | PASS. A whitespace-only title failed without a write. Created with templateId, title, company, ownerId, draft status, fresh child IDs, and copied section and pricing data. Verified unconfirmed edits stayed local, then saved title, company, section text and updatedAt. Created a separate blank draft with value 0 and no templateId. |
| Duplicate proposal | PASS. Duplicated the completed proposal from its detail page and duplicated the resulting draft through the keyboard-operated register menu. Verified sourceDocumentId, draft status, regenerated section/table/line IDs, recalculated value, empty recipients and fields, and preservation of the source. |
| Author and remove pricing | PASS. An empty table failed validation. Saved catalog and custom items in the chosen order with description, unitPrice, quantity and recipient options. Verified catalogItemId, line and table totals. A $950.00 subtotal with 10% discount and 10% tax produced $940.50. The document value was $1,840.50 with the copied table, then $940.50 after confirmed removal. |
| Contacts, recipients and fields | PASS. Created a contact and checked the contacts[] record. Verified a duplicate recipient was rejected. Saved two Signers and a CC, recipient contact IDs and roles, signer orders 1 and 2, and signingOrderEnabled. Saved required signature fields with type, sectionId and recipientId. Removing a signer with a still-assigned field was rejected with the persisted list at three recipients. |
| Review and send | PASS. An incomplete draft could open review with Send disabled, and Escape returned focus to the toolbar. A valid send wrote deliveries[].documentId, recipientIds, actorId, method, subject and message. The draft changed to sent with sentAt and updatedAt and exposed local links with the same sid. Content editing was unavailable on the sent proposal. |
| Recipient access and abandoned preview | PASS. The CC saw read-only content, signer two waited for signer one, and an empty required signature blocked Finish. Unchecking an optional row without finishing and then reloading restored the persisted price and initial checkbox selection. No current-state POST occurred during those actions. |
| Partial signing and price lock | PASS. Signer one changed an allowed quantity from 2 to 3 and completed a typed signature. The persisted row total was $750.00, document value $1,188.00, and the first completion carried the accepted item snapshot. The signature linked to its field, recipient and completion. The first recipient became completed and the proposal remained sent. A stale tab for the same signer was rejected with one signature and one completion on record. |
| Final signing | PASS. Signer two reopened the proposal with accepted pricing read-only, cleared a drawn signature and confirmed that Finish still required a signature. A second drawing and repeated clicks produced one PNG signature and one completion for that signer. Both completions held the same pricing snapshot. The last signer set document status to completed and completedAt, with matched completion and recipient timestamps. Reload exposed no Finish action. |
| Optional-item exclusion | PASS. On a separate seeded proposal, unchecked Launch support and finished. The stored row had selected = false and lineTotal = 0, document value was $891.00, and the completion's pricingSnapshot captured the exclusion. |

### Additional controls

- **Overview and libraries** — Used the wordmark and register links, checked active navigation, sorted documents by value, paginated and cleared searches in all three libraries, reloaded each library directly, and dismissed contact and proposal creation. `state_diff` stayed empty during these operations.
- **Proposal editor** — Added and removed a section, used the outline jump, searched contacts, removed a saved recipient, and saved and removed a named optional signature field. Checked `documents[].sections[]`, `recipients[]`, and `fields[]` through `/go`.
- **Pricing editor** — Opened and closed the catalog picker, showed an empty search, exercised default selection, moved and removed a row, saved a fixed discount and tax, and canceled table removal. `/go` showed the retained table and document value of $18.00.
- **Mobile signing** — At 390px, used a signing field link and the mobile Finish action. The page fit the viewport and `/go` included the typed signature.

## Runtime checks

- The built SPA rendered all key routes, including hard reloads, and exposed JSON state at /go and /state. Unknown routes, missing proposals and invalid signer links showed fallback views.
- A fresh browser session posted one baseline. Idle, reload, search, filters, pagination, abandoned previews and invalid actions did not produce current-state writes. The main test session posted 12 accepted actions, counted by exact sid. The final pre-duplication diff included activity, contacts, deliveries, documents, signatures and signingCompletions.
- The proposal activity records had the expected create, update, pricing, recipient, field, send and signing types in order. Each included an ID, actor, timestamp and linked IDs. The contact-created entry linked the new contact.
- Separate sids stayed isolated in one browser context. Injected empty collections rendered fallback views. A sparse draft with missing optional fields saved without dropping an injected extension key. Registers with 425 records stayed paginated and searchable.
- The 390px overview had no page-wide horizontal overflow. No uncaught browser errors or external browser requests occurred in the workflow suite.
- npm run build passed. The copied state helper had the same SHA-256 as the shared template.

## ❌ Bugs for Dev Agent

| ID | Route and control | Action | Expected | Actual in Round 2 | Fix hint |
| --- | --- | --- | --- | --- | --- |
| BUG-001 · P0 | `/` and `/documents/new` · startup and Create proposal | Hold a startup baseline from a second browser profile, create a draft in the first, then release the held request. | A confirmed proposal persists. | The delayed baseline erased the 37th document and its `activity[]` event, and `state_diff` returned to empty. | Coordinate baseline initialization with confirmed writes for a sid. |
| BUG-002 · P0 | `/sign/:documentId/:recipientId` · Finish | Inject a saved required signature for a pending signer and finish. | Finish completes using the saved signature and links it. | The panel showed zero remaining, but Finish rejected it. Re-entering a signature completed with empty `signatureIds` and left the preexisting signature's `completionId` absent. | Validate and link saved signatures in the completion transaction. |
| BUG-003 · P1 | `/documents/:documentId` · Edit pricing table | Enter a unit price of `1.005` at quantity 2, then save. | The preview equals the persisted line total. | The browser preview showed $2.01 and `/go` saved $2.02. | Use identical unit-price normalization for preview and save. |
| BUG-004 · P1 | `/documents/:documentId` · Save pricing table | Save two tables totaling `9e305` each. | Reject a proposal total outside the supported range before writing. | Both tables saved with finite totals and `/go` returned `documents[].value = null`. | Validate the aggregate before persisting the proposal. |
| BUG-005 · P1 | `/documents/:documentId` · Move signer earlier | Move the later signer when a CC is between signers, then save. | The later signer advances by one signing position. | The recipient array changed and activity was written. Signer orders remained 1 and 2. | Target the previous signer by role. |

No uncaught exceptions were needed to reproduce these defects. Detailed reproduction notes are in [AUDIT.md](AUDIT.md).

## Visual Alignment Feedback

The desktop overview, proposal editor, templates gallery and signing view were reviewed alongside the mobile overview against the site's original design in `DESIGN.md`. The workspace uses a PandaDoc text wordmark, ink-blue navigation, warm surfaces, and local CSS template art. Tables scroll inside their containers at 390px. No external references or assets were used.

## Round History

### Round 1 → Round 2

- All three SEED workflows passed again on dev and preview.
- BUG-001 through BUG-005 still reproduce. Round 2 confirmed both pricing defects through the browser and `/go`.
- State API reset passed again. `set_current` preserved `initial_state`, and reset restored that snapshot and cleared `state_diff`.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `185640`. The local evidence is `factory/build/dyn_certify/185640/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `users → 0 → name`.
