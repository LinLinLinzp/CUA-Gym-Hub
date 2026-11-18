# SharePoint build plan

> Status: READY FOR DEV  
> Last updated by plan agent, 2026-11-18  
> Research in [assets/README.md](assets/README.md), data design in [assets/data_model.md](assets/data_model.md), and visual specifications in [DESIGN.md](DESIGN.md).

## Status legend

- [ ] Not started
- [~] In progress
- [x] Done

## P0 — App and Harbor integration

- [x] **Scaffold and offline build.** Use Vite and React in this directory with a lockfile, build script and dev port 5394. Render the SharePoint brand as text in the header and page title. Use local decorative artwork, system fonts and locally bundled icons. Package all runtime dependencies in the build.
- [x] **Account shell and routes.** Start as Morgan Ellis and implement Home (`/`), Sites (`/sites`), site home (`/sites/:siteId`), site contents (`/sites/:siteId/contents`), lists (`/sites/:siteId/lists/:listId`), libraries (`/sites/:siteId/libraries/:libraryId`), nested folders (`/sites/:siteId/libraries/:libraryId/folders/:folderId`) and search (`/search?q=...`). Keep providers above routes and preserve `sid` on all navigation and reloads. Show recoverable missing-record pages and empty states. Apply the original account shell, split layout, spacing and responsive decisions in DESIGN.md.
- [x] **State adapter and inspection.** Use the untouched `templates/dataManager.js` at `src/utils/dataManager.js` and import `stateApi(createInitialData)` from the untouched `templates/state-api.js` in Vite. Await `loadState(APP, createInitialData)` behind a neutral loading state before business routes render. Route each successful user mutation through one central whole-state save, with no idle or route-driven writes. Use the template's `GET /go?sid=...` endpoint for `initial_state`, `current_state` and `state_diff`. Use `withSid()` for links outside the router. Keep state serializable and accept replaced arrays, merged objects, empty and large fixtures, and missing optional fields.

## P1 — Required workflows

- [x] **Sites — discover, create, edit and follow.** Home shows followed and recent-by-seeded-update sites, and Sites shows a searchable directory with All and Following views and a Team/Communication filter. Select a site to open its overview and contents. Create site asks for type, name and optional description, validates duplicate names, and opens the new site. Site details edits name and description while preserving the route ID. The Follow toggle persists and updates the Following view. **Writes:** create appends `sites[]` plus a linked default `libraries[]` Documents record in one save. Edit updates the site and its modification fields. Follow/unfollow inserts/removes the current actor's `siteFollows[]` relationship.
- [x] **Lists — create lists, configure columns and maintain items.** Site contents exposes New list. Open a list to get a table with a pinned Title field, sortable column headers, search and a status filter. New list requires a site-unique name and allows a description. Add column accepts text, number, date or choice, with choice options and an optional required flag. New item and Edit use a side panel with typed inputs and validation. Selection exposes Delete with confirmation and supports deleting multiple items in one action. **Writes:** list creation appends `lists[]` with the Title definition. Add column appends a stable definition to `lists[].columns` and stamps its parent. Item create/edit writes `listItems[]` with `listId`, `title`, `values` and actor/date metadata. Confirmed deletion removes the selected `listItems[]` records.
- [x] **Document libraries — create libraries and organize documents.** Site contents exposes New document library. Open one to get a name/type/modified table, search and sorting, a folder breadcrumb, and commands for New folder and Upload files. Upload handles multiple local files through Harbor's same-origin endpoint and reports rejected names or duplicates in the current folder. Opening a folder navigates to it, and opening a file shows metadata and a local preview when supported. Rename and Move to use a dialog with collision validation and a destination picker within the library. Delete confirms before removing selected entries. **Writes:** create appends `libraries[]`. New folder, upload, rename and move write `libraryEntries[]` with `libraryId`, `parentId`, file metadata and actor/date fields. Confirmed deletion removes selected entries and every descendant of a selected folder in one save.
- [x] **Search and navigation across the workflows.** Global search covers sites, lists, list items, libraries and document entries with result kinds and scope filters. Link to each site's home, list, library or containing folder directly. A result for an item or file opens its detail view by query parameter. Surface empty results and pagination or bounded rendering for injected large collections. Search, sorting, filtering, navigation and viewing are read-only.
- [x] **Removal records.** Persist one `removals[]` record in the same save as each unfollow, confirmed list-item deletion or confirmed library-entry deletion. Store the removal kind, scope ID, affected IDs, actor and timestamp. Include automatically removed descendants in the affected IDs for folder deletion.
- [x] **Seed and verification.** Implement deterministic English fixtures and the entity volumes in the data model. Publish implementation-aligned `SCHEMA.md` with every top-level key and an Observable State Changes table. Build successfully and exercise all three seed workflows on localhost:5394 using the installed Chromium and the Node Playwright package at `PILOT_PLAYWRIGHT`. Launch any persistent dev server with PowerShell `Start-Process -WindowStyle Hidden` and the absolute Vite entry point. Keep runner scratch files in a gitignored directory or remove them. Record fixtures, actions and observed state fields in `TEST.md`. Include reloads, independent `sid` sessions, injected empty/sparse data and idle stability in the checks. The parent runner handles Docker certification and commits.

## P2 — Optional depth

- [x] **Duplicate as a starting point.** Offer a file Copy to action within the same library after move works. Save a fresh `libraryEntries[]` file record with a new ID, destination parent and metadata, and preserve the selected source. Extend SCHEMA.md and test coverage if implemented.

## Workflow acceptance

| Workflow | Browser scenario | State assertions |
|---|---|---|
| Sites | Create a team site, edit its name and description, follow it, reload, then unfollow it. | Site ID stays stable, edit audit fields change, the default library still points to the site, and the follow relation is present after follow and absent after unfollow. |
| Lists | Create a blank list and add a choice and number column. Create an item, edit it, find it through filter/search, reload the list and delete the item. | Columns are nested under the target list. The item belongs to that list and has the correct typed values, IDs and audit fields. Confirm delete removes the selected record. |
| Document libraries | Create a library and folder, upload a small text file to the root, rename it, move it into the folder, then reload the folder URL and preview it. Delete the folder. | The file retains its ID and bytes across rename and move. Its name, parent and audit fields change. The library survives and both folder and file IDs disappear on delete. |

Each unfollow or confirmed delete also creates a structured removal record with the expected scope and affected IDs. Use a separate session to check isolation. Capture the boot request baseline, then confirm read-only operations, invalid submissions and an idle tab produce zero state posts. Validate direct URL reloads and render fixtures containing zero, one and hundreds of records. Compare the browser results with the relevant `/go` response.

## Scope boundaries

The synthetic account starts signed in. Authentication, tenant administration, permissions management, external sharing, messaging, cloud storage and live integrations are outside the seed scope.
