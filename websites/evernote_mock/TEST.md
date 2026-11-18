# Evernote Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5409  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Implemented route patterns exercised | 9 |
| Playwright acceptance scenarios passed on Vite dev | 39 |
| Playwright acceptance scenarios passed with rebuilt `dist/` | 39 |
| Supplemental Playwright checks passed | 6 |
| Open P0 or P1 issues observed | 0 |

`npm run build` passed. Both acceptance runs used the installed Node Playwright and Chromium. The built-bundle run fulfilled page and asset requests from local `dist/` files at the localhost origin. Both runs used the template state API on port 5409.

## ✅ Passing Tests

Mutations were checked through `GET /go?sid=…`. Each mutation sent one whole-state commit, including compound actions. Read-only actions left the business state unchanged. The creation rows below use the full record field lists under [Record fields](#record-fields).

| Workflow and actions exercised | Fields verified in `/go` |
| --- | --- |
| **Notes discovery.** Open a note and its notebook, search by title, body and tag, filter, sort, and clear. Open and reload a result, go back and forward, and close the result while retaining the query. | No changes. |
| **Notes creation and editing.** Create in a notebook and focus Title. Save a multiline body, reload, then commit a second draft by leaving the editor. | New active `notes[]` record with scoped `notebookId`. Edits changed `notes[].title`, `content`, `updatedBy`, and `updatedAt`. Unchanged Save produced no write. |
| **Tags, move and duplication.** Add a trimmed tag, reject a duplicate, remove a tag, move through the notebook picker, and duplicate a note with a completed task. | Tag changes updated `notes[].tags`, `updatedBy`, and `updatedAt`. Move updated `notes[].notebookId`, `updatedBy`, and `updatedAt`. Duplication appended a note with `sourceNoteId` and a task with `sourceTaskId`, fresh IDs, and the new `noteId`. The copy retained completion metadata. |
| **Trash and restore.** Cancel a trash confirmation, trash a note, verify linked tasks disappear, recover a trashed deep link, and restore to the original or fallback notebook. | Trash set `notes[].status`, `trashedAt`, `trashedBy`, `updatedBy`, and `updatedAt`. Restore set `status`, resolved `notebookId`, cleared `trashedAt` and `trashedBy`, and updated `updatedBy` and `updatedAt`. Linked task IDs and statuses were retained. Cancellation produced no write. |
| **Notebooks.** Search, reject a duplicate, create, rename, set the default, verify deletion protection, then confirm deletion of a different notebook. | Creation appended an active `notebooks[]` record. Rename changed `notebooks[].name`, `updatedBy`, and `updatedAt`. Setting the default changed `preferences.defaultNotebookId`, `updatedBy`, and `updatedAt`. Deletion set `notebooks[].status`, `deletedAt`, `deletedBy`, `updatedBy`, and `updatedAt`, and set the child note’s trash fields in the same commit. Child note and task links were retained. |
| **Task creation and default destination.** Create within a note and from Tasks, set a default task note, follow Open note, and confirm both views use the same task ID. | Creation appended an open `tasks[]` record linked by `noteId`. Changing the default set `preferences.defaultTaskNoteId`, `updatedBy`, and `updatedAt`. |
| **Task changes.** Edit, relink, flag and unflag through the row menu, complete in the note, reopen from Tasks, filter and group, then delete from note detail. | Editing changed `tasks[].title`, `description`, `noteId`, `dueDate`, `flagged`, `updatedBy`, and `updatedAt`. Completion and reopening set `status`, set or cleared `completedAt` and `completedBy`, and updated `updatedBy` and `updatedAt`. Deletion set `status`, `deletedAt`, `deletedBy`, `updatedBy`, and `updatedAt`. Filters and grouping produced no writes. |
| **Empty workspace.** Create a first note and notebook, create a first task with a notebook and Things to do, and restore a trashed note that has no valid destination. | Each flow committed once. Verified the new records and their linked IDs, the applicable `preferences.defaultNotebookId` and `defaultTaskNoteId`, and preference audit fields. An injected custom top-level field survived. |
| **Harbor lifecycle and injected state.** Load the 24-notebook, 56-note and 40-task seed, test a singleton with missing fields and dangling links, and navigate and reload a 220-notebook, 420-note and 320-task world. Test distinct SIDs, a same-SID idle tab, and a delayed startup baseline. | Fresh pages posted one baseline. Cached reload, navigation and idle produced no writes. The delayed baseline left 56 notes in `initial_state` and the first user action added a new ID to the 57 notes in `current_state`. `set_current` and `reset` preserved and restored the original baseline as expected. |

### Record fields

- `notebooks[]` uses `id`, `name`, `status`, `createdBy`, `createdAt`, `updatedBy`, `updatedAt`, `deletedAt`, and `deletedBy`.
- `notes[]` uses `id`, `notebookId`, `title`, `content`, `tags`, `status`, `createdBy`, `createdAt`, `updatedBy`, `updatedAt`, `trashedAt`, and `trashedBy`. Duplicates add `sourceNoteId`.
- `tasks[]` uses `id`, `noteId`, `title`, `description`, `dueDate`, `flagged`, `status`, `completedAt`, `completedBy`, `deletedAt`, `deletedBy`, `createdBy`, `createdAt`, `updatedBy`, and `updatedAt`. Duplicates add `sourceTaskId`.

## ❌ Bugs for Dev Agent

No open P0 or P1 issues were observed. The acceptance runs recorded zero browser page errors and zero external requests.

## Visual Alignment Feedback

Reviewed local captures of Notes, Notebooks, Tasks, Trash and the mobile editor against the original workspace design. All four section tabs stayed within the viewport and remained operable at 320px and 390px. [DESIGN.md](DESIGN.md)

## Round History

### Round 1 → Round 2

- **AUDIT-001 · Fixed.** The workspace waits for the startup baseline before enabling edits. The delayed-request regression confirms that `/go` retains the first user change.
- **AUDIT-002 · Fixed.** The search field retains the collection query when opening, reloading, or closing a result and traversing browser history.
- **AUDIT-003 · Fixed.** The tabs wrap on narrow screens. Browser assertions confirmed that the document and tabs fit at both tested mobile widths.

The Harbor data manager still matches the template byte-for-byte.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `38228`. The local evidence is `factory/build/dyn_certify/38228/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `notebooks → 0 → name`.
