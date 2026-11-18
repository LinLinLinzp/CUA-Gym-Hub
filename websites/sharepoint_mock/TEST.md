# SharePoint Mock — Test Report

> Round: 1  
> Date: 2026-11-18  
> Server: http://localhost:5394  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
|--------|-------|
| Routes tested | 9 |
| Elements tested (grouped checks) | 42 |
| ✅ Passed | 41 |
| ❌ Failed | 1 cosmetic |
| ⚠️ Skipped (out of scope) | 0 |

Chromium ran through the installed `PILOT_PLAYWRIGHT` package. The production build passed. The suite recorded no page exceptions, console warnings or errors, or external HTTP requests.

## ✅ Passing Tests

- **`/` and `/sites`, account navigation and discovery.** Verified SharePoint and Home links, Browse sites, recently updated links, followed-site pagination, View following, All sites, Following, site-type filter, text search, empty results, and directory pagination. The Create site control changed on hover. Escape closed its dialog and restored focus.
- **`/sites/:siteId` and `/sites/:siteId/contents`, sites workflow.** Created `Regional Service Desk QA` as a team site, edited its name to `Regional Support Desk QA` and saved a new description, followed it, reloaded and found it in Following, then unfollowed it. Empty and duplicate names were rejected. Overview, Site contents, breadcrumbs, and the New menu worked. The new site’s Documents library stayed linked after editing.
- **`/sites/:siteId/lists/:listId`, lists workflow.** Created `Support Handoffs QA`, added required choice, number, date, and text columns, and created an item with all four types. Edited from the detail panel, cleared an optional field, filtered by status and numeric text, sorted by Hours, and reopened the item through global search and a direct reload. Verified row-menu edit and delete cancellation, checkbox selection, and confirmed bulk deletion. Blank list names, duplicate choices, and missing required item fields were rejected.
- **Library root and folder routes, document-libraries workflow.** Created `Support Archives QA` and a child folder. The file picker accepted two text files and reported a duplicate in the same batch. Renamed the guide, moved it into the folder, reloaded the folder, previewed the content, and compared the downloaded bytes to the upload. Copied the guide to the root, canceled and then confirmed a folder cascade, and deleted the root copy through its row menu. Verified folder search, sort controls, selection, breadcrumbs, and duplicate or invalid names and destinations.
- **`/search?q=…`, global search.** Opened all six result types and checked site-scope and result-kind filters, empty results, `?sid=` retention, and direct item and file links. Missing site, list, library, folder, and unknown routes rendered recovery links.
- **Harbor state and fixtures.** The workflow session made one baseline `set` and 21 successful `set_current` writes, one per mutation. Read-only operations, rejected submissions, cancellations, cached reloads, and a 5.5-second idle period produced zero `/post` requests. Empty arrays, sparse singleton records, 300-record list and library tables, a 301-site directory, and 900 matching search results rendered. A separate session accepted injection, updated independently, and reset to its own initial snapshot.

### `/go` observations by workflow

The default baseline returned 12 users, 24 sites, 8 follows, 30 lists, 150 list items, 30 libraries, 149 entries, and zero removals. Each row below was checked against the immediately preceding `current_state` snapshot and the corresponding browser action.

| Workflow | Browser action | Fields observed via `/go` |
|----------|----------------|----------------------------|
| Sites | Create a team site | Appended `sites[]` with `id`, `name`, `description`, `type`, `ownerId`, and creation and update audit fields. Appended the linked default Documents `libraries[]` record with `id`, `siteId`, `name`, `description`, `isDefault: true`, and audit fields in the same save. |
| Sites | Edit details | Updated `sites[].name`, `description`, `updatedAt`, and `updatedBy`. The site ID, creation audit fields, and default library stayed stable. |
| Sites | Follow, reload, and unfollow | Follow appended `siteFollows[]` with `id`, `siteId`, `userId`, and `createdAt`. Reload kept the relation. Unfollow removed it and appended a `removals[]` record with `kind: unfollowSite`, the site ID in `scopeId`, the follow ID in `recordIds`, and actor and timestamp. |
| Lists | Create a list and add four column types | Appended `lists[]` with `id`, `siteId`, `name`, `description`, audit fields, and the required Title definition. Each column save appended `{id, name, type, required, options}` under `lists[].columns` and updated the list’s `updatedAt` and `updatedBy`. |
| Lists | Create two items and edit the first | Each insert wrote `listItems[]` with `id`, `listId`, `title`, typed `values`, and audit fields. The first item’s edit kept its ID and creation audit fields, changed `title`, `values`, `updatedAt`, and `updatedBy`, saved `4.25` as a number, preserved the date string, and removed the cleared text value. |
| Lists | Confirm bulk deletion | Removed both item IDs from `listItems[]` and appended `removals[]` with `kind: deleteListItems`, the list ID as `scopeId`, both item IDs in `recordIds`, and actor and timestamp. |
| Document libraries | Create a library and root folder | Appended `libraries[]` with `id`, `siteId`, `name`, `description`, audit fields, and `isDefault: false`. Appended `libraryEntries[]` with `id`, `libraryId`, `parentId: null`, `kind: folder`, name, and audit fields. |
| Document libraries | Upload two files and a duplicate | Appended two `libraryEntries[]` records in one save. Each contained `id`, `libraryId`, `parentId`, `kind: file`, name, `sizeBytes`, `mimeType`, same-origin `contentUrl`, and audit fields. The duplicate produced feedback and no extra record. |
| Document libraries | Rename and move the guide | Rename updated `libraryEntries[].name`, `updatedAt`, and `updatedBy`. Move updated `parentId`, `updatedAt`, and `updatedBy`. The ID, creation audit fields, size, and content URL were stable. The preview and byte-exact download passed after reloading the folder. |
| Document libraries | Copy the guide to the root | Appended a `libraryEntries[]` record with a fresh `id`, root `parentId`, audit fields, and the same content URL. The source stayed in its folder. |
| Document libraries | Confirm folder cascade and delete the root copy | Removed the folder and original file IDs in one `libraryEntries[]` update. A second action removed the root copy. Each save appended `removals[]` with `kind: deleteLibraryEntries`, the library ID in `scopeId`, affected entry IDs in `recordIds`, and actor and timestamp. The library and unrelated file stayed present. |

Every removal record also had its own ID. The final cumulative `state_diff` contained `sites`, `lists`, `libraries`, `libraryEntries`, and `removals`. Follow and list-item arrays returned to baseline after their changes were reversed or deleted. Their intermediate `/go` snapshots and removal records verified the workflow.

## ❌ Bugs for Dev Agent

### BUG-001 · P2 · Mobile item panel leaves a narrow gutter

| Field | Value |
|-------|-------|
| Route | `/sites/:siteId/lists/:listId` |
| Element | New item side panel |
| Action | Open New item at 390 × 844 px |
| Expected | Full-width panel per `DESIGN.md` |
| Actual | The panel measures 356 px and starts 34 px from the left edge. Fields and actions remain usable. |
| Console errors | None |
| Fix hint | Override the generic dialog `max-width` for `dialog.panel` at the mobile breakpoint. |

## Visual Alignment Feedback

Reviewed screenshots of Home, Sites, site overview, site contents, lists, library roots, folders, file preview, and search at 1440 × 960 px, plus Home and the item panel at 390 × 844 px. The review used the original design in `DESIGN.md`. The pine and cream palette, paper illustration, layouts, tables, and dialogs were visible. At mobile width the cards stacked, search occupied a separate row, and the populated table scrolled within its container. The item panel gutter is recorded in BUG-001.

## Round History

### Round 1

- Sites, lists, and document libraries passed. No P0 or P1 issues were found.
- BUG-001 remains open as a P2 visual issue.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `66632`. The local evidence is `factory/build/dyn_certify/66632/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `users → 0 → displayName`.
