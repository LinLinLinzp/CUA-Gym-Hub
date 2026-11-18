# Figma Mock — Test Report

> Round 2  
> Date 2026-11-18  
> Server http://localhost:5507  
> Tested by playwright agent

WORKFLOWS: PASS

Chromium ran through the installed Playwright at `PILOT_PLAYWRIGHT` on `http://localhost:5507`. The same browser suite passed with the Vite dev app and with the generated `dist/` HTML, CSS, and JavaScript served by the browser harness. Both used the live localhost Harbor endpoints. The final `npm run build` passed. Neither run reported browser errors or external HTTP requests.

## Workflow coverage and observable changes

Each successful action in the main session produced one `set_current` request. The checks compared the changed top-level keys after each action and diffed the associated records in `/go?sid=`. Each run recorded 28 business writes and one baseline `set` in its main session. The dev run used `figma-workflows-1795016790580` and the built run used `figma-workflows-1795016802981`.

| Workflow | Chromium coverage | Observable changes confirmed |
| --- | --- | --- |
| Files | Browsed folders, used case-insensitive search, switched to list view, sorted by name, and used End and Escape in the action menu. Created a design from Commerce, renamed it, moved it to Drafts, starred and unstarred it, and duplicated an editable and a view-only file. Confirmed Trash recovery from direct links and restored into both a valid folder and Drafts. | Creation appended a file and its Page 1. Rename and move changed `files[].name` and `folderId`. Star and unstar reused the same `fileStars[]` record. Duplication wrote `sourceFileId`, remapped page, layer and local component IDs, retained an external component ID, reset link policy and publication status, and excluded comments and access grants. Trash set `trashedById`, while restore cleared `trashedAt` and retained or cleared `folderId` as appropriate. |
| Comments | Placed one pin on Pay now button using C and another on an empty area using Add comment. Posted a reply, found the thread through reply search, resolved it, and reopened it through Show resolved. Reloaded the thread link and opened a seeded resolved thread by direct link on mobile. | `commentThreads[]` stored normalized coordinates, the relevant file and page, and a layer ID for the layer pin. The empty canvas pin stored `layerId=null`. `commentReplies[]` linked to the thread in the same write as the thread update. |
| Components | Converted a seeded shape, edited the prefilled name and description, inserted a local instance, published the main, created a shape on a blank page, and inserted the published component into another file. Followed the source link to the selected main. | The source `layers[]` record kept its geometry and pointed to the new `components[]` record. Editing changed the component description and both names. Instances referenced the source `componentId` from their destination file and page. |
| Sharing | Tried an invalid email, the owner, and a duplicate grant. Invited a directory user, changed the role, canceled and then confirmed removal, re-invited the same recipient, and added a pending address. Saved the anyone-can-edit policy, reopened Share, copied the URL, and opened it. Simulated clipboard denial on mobile and verified the selectable URL. | `fileAccess[]` distinguished normalized active, removed, and pending records and kept removal history. `files[].linkAccess` persisted the audience and role while leaving document edit time intact. Copying the URL sent zero state writes. A separate injected actor could edit through the saved link policy. |

### Record changes measured through `/go`

Added records included an `id` and the `createdAt`, `createdById`, `updatedAt`, and `updatedById` audit fields. The table lists other fields and the changed values on existing records. The main test session used the same actor throughout, so an existing `updatedById` value could remain equal when its timestamp changed.

| UI action | Added records and fields, or changed fields on existing records |
| --- | --- |
| Create file | Added `files[]` with `name`, `folderId`, `ownerId`, `sourceFileId`, `status`, `preview`, `linkAccess`, `trashedAt`, `trashedById`, `restoredAt`, `restoredById`. Added `pages[]` with `fileId`, `name`, `position`. |
| Rename and move | Changed `files[].name` or `files[].folderId`, with `files[].updatedAt` in each write. |
| Star and unstar | Star added `fileStars[]` with `fileId`, `userId`, `status`. Unstar changed `status` and `updatedAt` on that record. |
| Duplicate | Added `files[]` with the same field shape as Create, including `sourceFileId`, and copied `pages[]`, `layers[]`, and any local `components[]`. The copies remapped the destination file, page, parent-layer, main-layer and local component references and retained the external component ID. |
| Trash and restore | Trash changed `files[].status`, `trashedAt`, `trashedById`, `updatedAt`. Restore cleared both trash fields and changed `status`, `restoredAt`, `restoredById`, `updatedAt`. The archived-folder restore also changed `folderId` to `null`. |
| Post comment | Added `commentThreads[]` with `fileId`, `pageId`, `layerId`, `x`, `y`, `body`, `status`, `resolvedAt`, `resolvedById`, `reopenedAt`, `reopenedById`. |
| Post reply | Added `commentReplies[]` with `threadId` and `body`. Changed `commentThreads[].updatedAt` in the same write. |
| Resolve and reopen | Changed `commentThreads[].status`, `resolvedAt`, `resolvedById`, `updatedAt`. Reopen also changed `reopenedAt` and `reopenedById`. |
| Create main component | Added `components[]` with `fileId`, `pageId`, `mainLayerId`, `name`, `description`, `status`, `publishedAt`, `publishedById`. Changed `layers[].kind`, `componentId`, `name`, `updatedAt`, and `files[].updatedAt`. |
| Edit main component | Changed `components[].name`, `description`, `updatedAt`, `layers[].name`, `layers[].updatedAt`, and `files[].updatedAt`. |
| Publish component | Changed `components[].status`, `publishedAt`, `publishedById`, `updatedAt`, and `files[].updatedAt`. |
| Add shape or insert instance | Added `layers[]` with `fileId`, `pageId`, `parentLayerId`, `kind`, `name`, `componentId`, `geometry`, `position`, `text`, `fill`. Changed `files[].updatedAt`. |
| Invite and re-invite | Added `fileAccess[]` with `fileId`, `userId`, `email`, `role`, `status`, `removedAt`, `removedById`. |
| Change role and remove access | Role change updated `fileAccess[].role` and `updatedAt`. Removal changed `status`, `removedAt`, `removedById`, `updatedAt`. |
| Save link access | Changed `files[].linkAccess.audience`, `role`, and `updatedAt`. The saved policy carried `updatedById`. |
| Copy link | Zero state writes. Clipboard and fallback displayed the local design URL with `sid`. |

## Runtime and layout checks

- Verified one baseline write on a fresh session, a stable initial snapshot after edits, and unchanged state in a second session. An idle tab watching the edited session sent zero writes after another tab changed it.
- Exercised all-empty collections, a file with missing optional fields and no pages, and a 360-file workspace. The sparse duplicate created a page and preserved unknown injected fields. Search reached the last file in the large workspace.
- Checked invalid file and thread links, view-only controls, browser Back with the session parameter, and hard reloads on design and thread links.
- Verified that whitespace-only names and comments, an unchanged move, an empty publication selection, invalid invites, and canceled actions left business state unchanged.
- Captured and reviewed the library and editor at 1440 × 900 and Share at 390 × 844 against the original design brief. Confirmed the library gallery, editor dock, and scrollable Share dialog. Checked mobile navigation, comment placement, and viewport width.

## Bugs for Dev Agent

The audit found and fixed three edge cases. The full workflow suite and the focused checks below passed against both the Vite dev app and the built assets.

| Audit regression | Verified result |
| --- | --- |
| Browser Back during comment composition | The draft composer and pin disappeared when the active page changed. The session sent only its baseline `set`. |
| Injected component with a missing source page | The existing instance stayed visible with its fallback rendering. The source was reported as unavailable, and the asset and broken source link were absent. |
| Injected grant without an ID | The recipient stayed visible without role or removal controls. |
| Harbor reset and initial snapshot | Repeated `set` and `set_current` preserved the first `initial_state`. Reset restored it to `current_state` and cleared the diff for that session. The injected session remained isolated. |

## Round History

### Round 1 → Round 2

- Fixed the prefilled component description field so its label resolves as `Description` in both Create and Edit. Chromium changed the prefilled description and confirmed `components[].description` in both runs.
- Added a canvas-only pin with `layerId=null` and reran the previous audit regressions.

No open findings from these checks. Docker dynamic certification is owned by the parent runner.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `133988`. The local evidence is `factory/build/dyn_certify/133988/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `users → 0 → name`.
