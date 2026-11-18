# Zotero — Implementation Plan

> Status — IMPLEMENTED AND VERIFIED  
> Last updated by the plan agent on 2026-11-18  
> [Research](assets/README.md) · [Data model](assets/data_model.md) · [Design](DESIGN.md)

## Status legend

- [ ] Pending
- [~] In progress
- [x] Complete

## P0 — Application shell and Harbor

- [x] Scaffold React and Vite in this directory with a lockfile, production build, and dev port **5427** with strict port binding. Use the shared `stateApi(createInitialData)` plugin from `../../templates/state-api.js` and copy `templates/dataManager.js` unchanged to `src/utils/dataManager.js`. Use `zotero` as the client app key.
- [x] Build the pre-signed-in shell from DESIGN.md. Place the Zotero wordmark, Libraries and Citations links, and Maya Chen’s account identity in the header. Show the library switcher, reference search, and primary item action in the library workspace. Use a responsive collection sidebar and open item details on demand.
- [x] Route `/` to the first active personal library or the Libraries index if none exists. Support `/libraries`, `/libraries/:libraryId`, `/libraries/:libraryId/collections/:collectionId`, `/libraries/:libraryId/items/:itemId`, and `/citations`. Preserve `?sid=` across links, redirects, and programmatic navigation. Use `withSid()` for internal links outside the router. Deep links and reloads must work; missing or mismatched IDs show a recoverable empty state.
- [x] Await `loadState(APP, createInitialData)` before displaying any route. Keep the loading screen neutral and all routes under their providers. Save the complete state once per committed user action through a single store function. Keep selection, navigation, searches, filters, and form drafts transient. Guard empty and large injected arrays, missing optional fields, and invalid relationships. Leave `/state`, `/post`, and `/go` to the shared middleware.
- [x] Seed the state described in [the data model](assets/data_model.md) and document the final implementation in `SCHEMA.md`. Include every top-level key and record shape and an Observable State Changes table with exact fields for each mutation. Record IDs, actor IDs, relation IDs, and ISO action timestamps. Keep the app offline at runtime.

## P1 — Libraries, collections, and citations

- [x] **Libraries.** List personal and group libraries with type, role, and reference count. Switch between libraries and keep searches and visible items scoped to the current library. Create a private group with a trimmed name and optional description. Let owners edit group details. Validate required names, keep drafts on validation failure, and open the newly created library on success. Allow read-only groups to browse and cite. **Writes:** append `libraries[]` on create with `id, name, kind, description, visibility, role, status, actorId, createdAt, updatedAt`. Edit writes `name, description, actorId, updatedAt` on that record. Switching libraries writes nothing.
- [x] **Library items.** Show title, creators, year, item type, and publication in the reference list. Search title, creators, publication, and tags. Filter by type or tag and sort by title, year, or date added. Open item details from a row and provide New Item, Edit, and Move to Trash in writable libraries. Include a Trash view with Restore and an Unfiled view for active items without collections. Support journal articles, books, reports, and web pages with the metadata fields in the data model. Default New Item to the current library and selected collection when applicable. **Writes:** create appends a complete `items[]` record, including `libraryId` and initial `collectionIds`. Edit updates the submitted metadata, `actorId`, and `updatedAt`. Trash and restore update `status, trashedAt, actorId, updatedAt`. Preserve collection links on trash so restore returns the reference to its previous collections. Search, filter, sort, and inspection write nothing.
- [x] **Collections.** Display a collapsible collection tree scoped to the current library with New Collection on the workspace and New Subcollection, Rename, Move, and Delete in the collection menu. Validate parent IDs within the library and prevent self-parenting or cycles. Confirm deletion with an explanation that references stay in the library. Mark the selected collection and its descendants deleted and clear their IDs from item memberships in the same save. Selecting a collection shows its directly filed active references. **Writes:** append `collections[]` on create with `id, libraryId, parentId, name, status, actorId, createdAt, updatedAt, deletedAt`. Rename edits `name`, move edits `parentId`, and both update `actorId, updatedAt`. Delete updates `status, deletedAt, actorId, updatedAt` on affected collections plus `items[].collectionIds, actorId, updatedAt` on affected items.
- [x] **Collection membership.** Offer Add to Collection on item details and on a checkbox-based selection toolbar. Show eligible active collections within the library. Offer Remove from Collection in a collection view. A reference can appear in several collections and remains visible in the full library. Deduplicate repeated additions and restrict all changes to writable libraries. **Writes:** add or remove the target ID in each affected `items[].collectionIds`, update `actorId, updatedAt`, and save the entire batch once. Skip writes if membership is already as requested.
- [x] **Citations.** Expose Cite from item details and the selection toolbar. Open a composer with the chosen items, APA 7, MLA 9, or Chicago author-date, and a Citation or Bibliography choice. Render a local preview, using an offline formatter and a fixed locale. Support page, chapter, and section locators in citation mode where applicable. Save to citation history, copy the preview, or download UTF-8 plain text. Keep one history row per successful explicit action. Show stored output in history and let users repeat copy or download from that output. **Writes:** append `citations[]` with `id, libraryId, itemIds, locators, style, mode, output, action, sourceCitationId, status, actorId, createdAt`. Only record `copied` after successful clipboard completion and `downloaded` after initiating a local download. Previews and cancelled or failed actions write nothing.
- [x] **End-to-end verification.** Build the site and exercise each P1 workflow through localhost in the installed Chromium using the Node Playwright package from `PILOT_PLAYWRIGHT`. For persistent Vite, use `Start-Process -WindowStyle Hidden` with an absolute Vite entry point. Verify changes through `/go?sid=…` and after hard reload. Cover empty, sparse, large, and optional-field injection, a second isolated sid, and no idle writes following the baseline. Test deep links, responsive controls, and clean console/runtime network behavior. Put commands, scenarios, assertions, and exact changed fields in `TEST.md`; keep runner scratch files gitignored or remove them. The parent runner owns Docker certification and commits.

## P2 — Optional depth

- [x] Allow selected references to be copied into a writable group library. Create new item records in the destination with fresh IDs and `sourceItemId`, retaining metadata and tags and starting with empty `collectionIds`. Document the optional field and cover this mutation in `SCHEMA.md` if implemented.

## Seed

- [x] Create one personal library and four groups with mixed owner, editor, and reader roles, 36 collections, 108 references, and 30 citation-history entries. Use deterministic fixed IDs, English synthetic titles and creators, and fixed ISO timestamps. Ensure personal-library and group views have enough varied records for filtering and sorting.

## Scope

The account starts signed in as Maya Chen. Authentication, real group invitations, web import, connector and word-processor integration, remote citation lookups, and file syncing are outside this brief.
