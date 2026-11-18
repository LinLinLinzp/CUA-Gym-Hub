# IMDb Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5354  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Main routes tested | 7 |
| Recovery paths tested | 3 |
| Seed workflows passed | 3 |
| Saved workflow actions verified in `/go` | 16 |
| Injected-world removals verified in `/go` | 3 |
| Open bugs | 0 |

Chromium from `PILOT_PLAYWRIGHT` passed the full acceptance suite against both the Vite dev server and the production build. The supplemental control and API lifecycle checks used the production build. Both servers were stopped after testing.

## ✅ Passing Tests

### Watchlist

| Action exercised | Record changes verified via `/go` |
| --- | --- |
| Add from search and re-add from title detail | Each add appended a `watchlist[]` record with a new `id`, `userId`, `titleId`, `createdAt`, and `position: 27`. Each appended a `stateEvents[]` entry of type `watchlist.add` with the membership ID, title ID, and position. The activity count increased. |
| Move to position 2 | Affected `watchlist[].position` values changed. The `watchlist.reorder` event recorded the moved membership and title, previous and new positions, and `details.orderedIds`. |
| Change visibility to Public | `user.watchlistVisibility` changed to `public`. The `watchlist.visibility` event recorded the previous and current values. The selection survived reload. |
| Remove from Watchlist | The membership disappeared from `watchlist[]`, remaining positions compacted to 1 through 26, and a `watchlist.remove` event recorded the removed membership, title, and previous position. The title detail toggle also passed a separate add/remove round trip. |

### Ratings

| Action exercised | Record changes verified via `/go` |
| --- | --- |
| Rate a title 1 | `ratings[]` gained one record with `id`, `userId`, `titleId`, numeric `value: 1`, and equal `createdAt` and `updatedAt`. The `rating.set` event recorded the rating ID, title ID, and transition from null to 1. |
| Edit the rating to 10 | The row retained `id` and `createdAt`. It changed `value` to 10 and advanced `updatedAt`. The `rating.set` event recorded the transition from 1 to 10. The editor preselected 1. |
| Change visibility to Private | `user.ratingsVisibility` changed to `private`. The write appended a `ratings.visibility` event. |
| Remove the rating | The record disappeared from `ratings[]`. A `rating.remove` event recorded its rating ID, title ID, and transition from 10 to null. The detail view returned to Unrated and the catalog score retained its original value. |

### Lists

| Action exercised | Record changes verified via `/go` |
| --- | --- |
| Create a list | `lists[]` gained a record with `id`, `userId`, trimmed `name`, `description`, default `visibility: private`, `createdAt`, and `updatedAt`. The `list.create` event included the list ID, name, and visibility. Creation opened the new list. |
| Edit list details | `lists[].name`, `description`, `visibility`, and `updatedAt` changed. The `list.edit` event carried the list ID and previous and new field values in `details.changes`. |
| Add titles from both pickers | Each picker appended a `listItems[]` record with `id`, `listId`, `titleId`, `position`, `createdAt`, and `userId`. Each updated the parent's `lists[].updatedAt` and appended a `list.item.add` event with the membership, list, title, and position. Both pickers marked the title as added and disabled duplicate additions. |
| Save a new list order | `listItems[].position` changed for the two affected memberships and the parent `lists[].updatedAt` advanced. The `list.reorder` event recorded the moved membership, list and title IDs, new position, and `details.orderedIds`. |
| Remove one list title | The selected `listItems[]` record disappeared, the remaining position compacted to 1, and the parent `lists[].updatedAt` advanced. A `list.item.remove` event identified the removed membership, list, and title. |
| Confirm list deletion | One snapshot removed the target row from `lists[]` and its remaining membership from `listItems[]`. The `list.delete` event recorded the list ID, name, and `details.removedItemIds` and `details.removedTitleIds`. Catalog, Watchlist, and Ratings matched the pre-delete snapshot. The UI returned to Your Lists. |

### Read-only controls and runtime

- **Routes and navigation** — Verified Activity, Search, Title, Watchlist, Ratings, Lists, and List Detail, plus recovery links for unknown paths, titles, and lists. Exercised account rail and overview links, the brand link, breadcrumbs, browser history, reload, and the keyboard skip link. Navigation retained `sid`.
- **Search and collection controls** — Matched case-insensitive title substrings, both titles named Borrowed Light, and an exact catalog ID. Search, no-match states, filters, sort options, sort reversal, compact views, and the ratings distribution rendered as expected and left `/go.current_state` unchanged.
- **Dialogs and feedback** — Verified blank-name validation, disabled rating save until selection, cancel, close, Escape focus restoration, unchanged rating and list saves, picker no-match states, list menu dismissal, canceling deletion, and notification dismissal. These interactions added zero business writes.
- **Injected worlds and isolation** — Verified empty collections, missing art and metadata, a future-release rating control, three dangling-reference removals, and a 380-record Watchlist. Extra injected keys survived writes. The default, empty, minimal, and large sessions returned independent snapshots. A separate API session verified `/state`, the initial baseline after a second `set`, a `set_current` diff, and reset to an empty diff.
- **Persistence** — The main session issued one baseline POST and one `set_current` per accepted action. Idle time and read-only controls added zero POSTs. The delayed-baseline regression passed in dev and preview. Two immediate Watchlist additions persisted in order at positions 27 and 28.
- **Build and offline operation** — `npm run build` passed and the shared data manager matched the template byte for byte. Chromium observed zero external runtime requests and zero page errors in the acceptance suite.

## ❌ Bugs for Dev Agent

No open bugs found in the retest.

## Visual Alignment Feedback

Reviewed localhost captures of all seven main views and the 360 px Activity view against the site's original design brief. The text brand, plum account rail, ivory workspace, and local poster art rendered consistently. The tested mobile views stayed within the viewport. Captures are under the gitignored `tests/` directory.

## Round History

### Round 1 → Round 2

- Reverified the delayed baseline fix in dev and preview.
- Reverified the three seed workflows and added checks for alternate navigation, sorting, dismissal, and recovery controls.
-

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `73748`. The local evidence is `factory/build/dyn_certify/73748/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `titles → 0 → name`.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Previously fixed, retested.** The existing Chromium regression delayed the initial POST and verified the baseline committed before the first mutation. Workflow replay verified 16 mutation snapshots.

Docker dynamic certification run `188924` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
