# IMDb state schema

**Base URL** `http://localhost:5354/`  
**Go endpoint** `GET /go?sid=<sid>` returns `initial_state`, `current_state`, and `state_diff`.  
**Read** `GET /state?sid=<sid>` returns `stored_state`, `has_custom_state`, and `sid`.  
**Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`. Use a fresh `sid` for a new injected world.  
**Reset** `POST /post?sid=<sid>` with `{"action":"reset"}` restores the server's initial snapshot. To load it, open the same `sid` in a fresh browser context or clear the site's browser storage first.

The Harbor endpoints `/state`, `/post`, and `/go` scope JSON state by `sid`. The state manager loads the injected world over deterministic defaults. The store commits successful business actions with one whole-state `set_current` snapshot and one event. Search, navigation, collection view controls, cancel, invalid submissions, and unchanged values add no events.

## State schema

| Top-level key | Shape | Fields |
| --- | --- | --- |
| `user` | Object | `id`, `displayName`, `watchlistVisibility`, `ratingsVisibility` |
| `titles` | Array of catalog records | `id`, `name`, `type`, `year`, optional `releaseDate`, `runtimeMinutes`, `genres`, `certificate`, `imdbRating`, `synopsis`, `posterPath` |
| `watchlist` | Array of memberships | `id`, `userId`, `titleId`, `position`, `createdAt` |
| `ratings` | Array of ratings | `id`, `userId`, `titleId`, `value`, `createdAt`, `updatedAt` |
| `lists` | Array of custom title lists | `id`, `userId`, `name`, `description`, `visibility`, `createdAt`, `updatedAt` |
| `listItems` | Array of memberships | `id`, `userId`, `listId`, `titleId`, `position`, `createdAt` |
| `stateEvents` | Array of completed action records | `id`, `type`, `status`, `userId`, `entityId`, `createdAt`, `details`, `titleId` for a title action, `listId` for a list action |

IDs and timestamps are strings. All action timestamps use the same UTC ISO 8601 value per action. Release dates are calendar dates. Position numbers start at one and are scoped to the owning Watchlist or list. Personal rating values are integers from one to ten. Catalog IMDb scores, runtime, and year are numeric when available. `genres` is an array of strings. Title types are `movie`, `tvSeries`, `short`, and `tvEpisode`. Visibility is `private` or `public`. The seeded world has 72 titles, 26 Watchlist memberships, 32 ratings, 24 lists, 98 list memberships, and an empty event array.

### Default IDs

- `user-001` is Morgan Ellis.
- `title-001` through `title-072` identify catalog entries. `title-072` is Night Ferry to Bellport, with no initial memberships or rating.
- `watch-001` through `watch-026`, `rating-001` through `rating-032`, and `list-001` through `list-024` identify seeded collection records. The 98 list membership IDs use the `list-item-` prefix and span `list-item-001` through `list-item-266` with gaps.

## Minimal injection example

```json
{
  "user": {"id": "viewer-1", "displayName": "Robin Ash"},
  "titles": [{"id": "film-1", "name": "A Single Film", "type": "movie", "year": 2024}],
  "watchlist": [],
  "ratings": [],
  "lists": [],
  "listItems": [],
  "stateEvents": []
}
```

## Observable State Changes

All rows below append `stateEvents[]` with `status: "completed"`. `orderedIds` contains membership IDs in the resulting order. Parent-list timestamps use the event's `createdAt` value.

| User action | Event type | Record changes in the same snapshot | Event entity and details |
| --- | --- | --- | --- |
| Add to Watchlist on search or detail | `watchlist.add` | Append a `watchlist` membership with the fields above. Re-add creates a new ID. If an injected sequence lacks valid positions, compact before appending. | New membership ID and `titleId`. `{ position }` |
| Remove from Watchlist on search, detail, or collection row | `watchlist.remove` | Delete the membership and compact remaining account Watchlist positions. | Removed membership ID and `titleId`. `{ previousPosition }` |
| Save a new position in Watchlist order | `watchlist.reorder` | Update affected `watchlist[].position`. | Moved membership ID and `titleId`. `{ previousPosition, position, orderedIds }` |
| Change Watchlist visibility | `watchlist.visibility` | Set `user.watchlistVisibility`. | Account ID. `{ previousVisibility, visibility }` |
| Save a rating from detail or a ratings row | `rating.set` | Insert a rating with both timestamps, or update `ratings[].value` and `updatedAt` in place. | Rating ID and `titleId`. `{ previousValue, value }`. A new rating has a null previous value. |
| Remove rating in dialog | `rating.remove` | Delete the rating row. | Removed rating ID and `titleId`. `{ previousValue, value: null }` |
| Change Ratings visibility | `ratings.visibility` | Set `user.ratingsVisibility`. | Account ID. `{ previousVisibility, visibility }` |
| Create list | `list.create` | Append a `lists` record with the fields above. | New list ID in both `entityId` and `listId`. `{ name, visibility }` |
| Save list details from the list index or detail | `list.edit` | Update changed `lists[].name`, `description`, or `visibility` and set `updatedAt`. | List ID in both fields. `{ changes }` maps changed fields to `{ previousValue, value }`. |
| Confirm list deletion | `list.delete` | Delete the list from `lists` and its memberships from `listItems`. | Removed list ID in both fields. `{ name, removedItemIds, removedTitleIds }` |
| Add title from the list or title picker | `list.item.add` | Append a `listItems` record and update the parent list's `updatedAt`. Compact invalid injected positions before appending when necessary. | New membership ID, `listId`, and `titleId`. `{ position }` |
| Remove title from the list | `list.item.remove` | Delete the `listItems` record, compact siblings' positions, and update the parent list's `updatedAt`. | Removed membership ID, `listId`, and `titleId`. `{ previousPosition }` |
| Save a new position in list order | `list.reorder` | Update affected `listItems[].position` and parent list's `updatedAt`. | Moved membership ID, `listId`, and `titleId`. `{ previousPosition, position, orderedIds }` |

The state preserves extra injected keys. Collection counts, displayed artwork, rating distributions, and view preferences are derived or transient.
