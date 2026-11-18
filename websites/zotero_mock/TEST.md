# Zotero Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5427  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested, including fallback | 7 |
| Scripted interaction call sites | 152 |
| ✅ Passing scenario groups | 11 |
| ❌ Failing scenario groups | 0 |
| ⚠️ In-scope scenario groups skipped | 0 |

All three SEED workflows passed with installed Chromium on Windows, against both Vite development assets and compiled assets. Both runs used the shared session middleware. The parent runner handles Docker certification.

## Commands

Run from `websites/zotero_mock`.

```powershell
npm install --no-audit --no-fund --cache .vite/npm-cache
npm run build
$vite = (Resolve-Path node_modules/vite/bin/vite.js).Path
Start-Process -WindowStyle Hidden -FilePath (Get-Command node.exe).Source -ArgumentList ('"{0}" --configLoader native --host localhost --port 5427 --strictPort' -f $vite) -WorkingDirectory (Get-Location).Path
node .vite/test_workflows.cjs
$env:ZOTERO_TEST_DIST = '1'
node .vite/test_workflows.cjs
Remove-Item Env:ZOTERO_TEST_DIST
node .vite/audit_edges.cjs
```

The runner loads Playwright from `PILOT_PLAYWRIGHT` and launches the installed Chromium executable. The compiled run serves local production HTML and assets through Playwright at the same origin. Browser requests to `/state`, `/post`, and `/go` reach the running middleware. The existing Vite listener was reused. Test runners and local screenshots are under gitignored `.vite/`.

## ✅ Passing Tests

| Scenario | Browser assertions | Persisted fields checked through `/go` |
| --- | --- | --- |
| Seed, search, browse | Personal landing and switching between group libraries. Title and year sorting, creator search, type and tag filters, clear filters, and reader access to Cite. | Initial account, 5 libraries, 36 collections, 108 items, 30 citations, and empty initial diff. Browsing and cancelling the composer did not add a write. |
| Private groups | Blank-name validation retains description. Whitespace is trimmed. Creating opens the group. The owner can edit via the directory. | Create appends `libraries[].id, name, kind, description, visibility, role, status, actorId, createdAt, updatedAt`. Edit updates `name, description, actorId, updatedAt`. |
| Collections | Create a parent and child, rename, move to the root and back, collapse and expand, exclude descendant destinations, and confirm cascade deletion. References remain visible after deletion. | Create appends `collections[].id, libraryId, parentId, name, status, actorId, createdAt, updatedAt, deletedAt`. Rename updates `name, actorId, updatedAt`. Moving updates `parentId, actorId, updatedAt`. Deletion updates `status, deletedAt, actorId, updatedAt` on both collections and `items[].collectionIds, actorId, updatedAt` on the affected item in one write. |
| References and Trash | Validate title and impossible dates, create in the active collection, reload the item deep link, edit, trash, and restore. Verify Unfiled after deleting the memberships. | Create appends `items[].id, libraryId, collectionIds, itemType, title, creators, date, publicationTitle, publisher, place, volume, issue, pages, DOI, ISBN, url, abstractNote, tags, status, actorId, createdAt, updatedAt, trashedAt`. The edit changes `title, publisher, actorId, updatedAt` for the submitted edits. Trash and restore update `status, trashedAt, actorId, updatedAt` and retain membership. |
| Membership | Add and remove from item details. Add two selected references in one operation and remove them from the collection view. Repeating an existing addition leaves state alone. | Each operation updates `items[].collectionIds, actorId, updatedAt` on affected records. A batch shares a timestamp and uses one write. |
| Citations and history | APA 7 with page and section locators, MLA 9 bibliography, Chicago author-date with a chapter locator, multi-item selection, preview, save, clipboard, and UTF-8 download. Reload history and repeat both actions. Clipboard denial leaves history unchanged. | Each successful action appends `citations[].id, libraryId, itemIds, locators, style, mode, output, action, sourceCitationId, status, actorId, createdAt`. Preview text matches persisted output and downloaded bytes. History actions preserve the snapshot and link to the source citation. |
| Cross-library copy | Copy two references to an editable group. Reader groups are excluded as destinations. Copies are visible under Unfiled. | Two `items[]` records append with copied metadata and tags and new `id, sourceItemId, libraryId, collectionIds, status, trashedAt, actorId, createdAt, updatedAt` values. Both are active with empty memberships and share one state write. |
| Injected worlds and isolation | Empty world, one-item world with missing metadata, cyclic and orphaned collections, 420 items and 140 collections, and a second independent default session. Test missing and mismatched deep links, mobile collection disclosure, full-width detail drawer, and reloads. | Each of four additional sessions posts only its baseline. The independent default session matches the untouched seed. The main session persists across reloads and has exactly 24 `set_current` posts after its baseline. Idle time produces no writes. |
| Navigation and transient controls | Select all, uncheck and clear selection, add and remove organization creators in an item draft, close dialog, hover and dismiss a menu with Escape, and follow the breadcrumb, history, wordmark, and unknown-route recovery links. | The main session remains at 24 user-driven writes. Draft, menu, selection, and navigation controls add none. |
| State API lifecycle | Baseline injection, merging account fields, current-state update, reset and distinct sessions. | `/go` preserves the initial snapshot, reports changed `libraries`, and clears the diff after reset. |
| Collection tree and directory layout | Open the deepest collection and its menu in a 40-level tree at 1280 and 390 px. Cancel Rename, collapse and reopen its parent, and check the menu remains within the panel. Verify directory columns at 1280, 768, 520, and 390 px, plus the desktop header gap. | The tree session's `state_diff` stays empty. |

The browser recorded zero external requests, page errors, console errors or warnings, or HTTP error responses. Every `/post` received HTTP 200 and the expected writes were observable through `/go`. Chromium can then report `ERR_ABORTED` for the unconsumed response body in the unchanged shared client. The runner accepts that signal only after HTTP 200.

## ❌ Bugs for Dev Agent

No open findings from this round.

## Visual Alignment Feedback

The collection tree caps its visual indentation after three nested levels and retains hierarchy and controls. The deepest label measured 78 px on desktop and 108 px on mobile. The 390 px viewport had no horizontal overflow. The directory switches to one column at 480 px to give card titles and management actions room on phones. Desktop brand-to-navigation spacing is 24 px.

## Round History

### Round 1 → Round 2

- AUDIT-001 fixed. Deep collection labels and menus stay within the panel at desktop and phone widths.
- AUDIT-002 fixed. Desktop navigation spacing and the directory breakpoints match the updated design.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `143608`. The local evidence is `factory/build/dyn_certify/143608/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `libraries → 0 → name`.
