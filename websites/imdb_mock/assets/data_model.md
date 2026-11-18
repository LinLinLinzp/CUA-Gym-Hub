# IMDb account data model

Use this proposed schema for `src/data/seed.js` and the account store. Document the implemented version and exact write set in `SCHEMA.md`. All values are JSON-serializable. Examples are fictional.

## Top-level state

| Key | Shape | Contents |
| --- | --- | --- |
| `user` | object | Active account and collection visibility |
| `titles` | array | Read-only catalog |
| `watchlist` | array | Active Watchlist memberships |
| `ratings` | array | Active personal ratings |
| `lists` | array | Active custom title lists |
| `listItems` | array | Active custom list memberships |
| `stateEvents` | array | Successful account mutations in action order |

## Records and types

Fields without an optional marker are required in new records. All `id`, `*Id`, `*At` and date fields are strings. Use ISO 8601 UTC timestamps for `*At` and a calendar date string for `releaseDate`. Store scores, years, runtimes, and positions as numbers.

### Account

```js
{ id: 'user-001', displayName: 'Morgan Ellis',
  watchlistVisibility: 'private', ratingsVisibility: 'public' }
```

Both visibility fields use `private | public`. Derive the avatar initials from `displayName`. Keep preferences with the account.

### Title

```js
{ id: 'title-001', name: 'Lanterns Under Glass', type: 'movie', year: 2021,
  releaseDate: '2021-10-08', runtimeMinutes: 108, genres: ['Drama', 'Mystery'],
  certificate: 'PG-13', imdbRating: 7.8,
  synopsis: 'A ferry dispatcher pieces together a map left behind in the station lost and found.',
  posterPath: '/art/lanterns-under-glass.webp' }
```

`type` is `movie | tvSeries | short | tvEpisode`. `name` is a display string. `genres` is an array of strings. `releaseDate`, `runtimeMinutes`, `genres`, `certificate`, `imdbRating`, `synopsis`, and `posterPath` may be absent in injected states. `imdbRating` is a fixed catalog aggregate, separate from the personal rating. The default catalog contains released titles. If an injected title has a valid future release date, disable rating using the Harbor clock. A missing date can use the year when available, with no release restriction when neither establishes a future release.

### Watchlist membership

```js
{ id: 'watch-001', userId: 'user-001', titleId: 'title-001',
  position: 1, createdAt: '2025-10-08T19:25:00.000Z' }
```

Unique among active memberships on `(userId, titleId)`. Position is a positive integer scoped to this account's Watchlist.

### Personal rating

```js
{ id: 'rating-001', userId: 'user-001', titleId: 'title-008', value: 9,
  createdAt: '2025-10-07T20:10:00.000Z', updatedAt: '2025-10-09T13:30:00.000Z' }
```

Unique on `(userId, titleId)`. `value` is an integer in `1…10`. On creation set both dates to the same action timestamp. On reads prefer `updatedAt` and fall back to `createdAt`.

### Custom title list

```js
{ id: 'list-001', userId: 'user-001', name: 'Rainy Night Mysteries',
  description: 'Slow-burn cases and coastal settings for a rainy evening.',
  visibility: 'private', createdAt: '2025-10-01T14:50:00.000Z',
  updatedAt: '2025-10-08T19:28:00.000Z' }
```

`name` and `description` are strings. An empty description is allowed. `visibility` is `private | public` and defaults to `private` on creation. Count and cover art are derived from memberships.

### Custom list membership

```js
{ id: 'list-item-001', userId: 'user-001', listId: 'list-001', titleId: 'title-001',
  position: 1, createdAt: '2025-10-08T19:28:00.000Z' }
```

Unique on `(listId, titleId)`. Position is a positive integer scoped to that list. The parent list and title must exist before a membership can be created.

### Mutation event

```js
{ id: 'event-d9cf93e0', type: 'rating.set', status: 'completed',
  userId: 'user-001', entityId: 'rating-001', titleId: 'title-008',
  createdAt: '2026-11-18T15:30:00.000Z',
  details: { previousValue: 7, value: 9 } }
```

`type` is one of the action names below. `status` is `completed`. `userId` identifies the actor. `entityId` identifies the affected membership, rating, list, or account as defined below. Include `titleId` and `listId` when the action targets a title or a custom list, respectively. `details` is the JSON object in the table. Call `new Date().toISOString()` once per accepted user action and use that value for all timestamps of the action. Use stable, unique generated IDs for new records and events, with the same entity ID carried across updates. Deletion events retain IDs and identifying values after the active records are gone.

## Observable writes

Each row appends one `stateEvents` record and commits the affected active records in the same snapshot. New memberships append to the existing visible custom order. Removals compact positions for the owning collection. Numeric reorder moves one title to the requested position and shifts neighbors. Persist positions as 1 through N. Map `orderedIds` to active membership IDs, in the new order. Privacy controls, dialog saves, and reorder save commit only when the value changes.

| Event type | Exact active-state write | `entityId` | Event `details` |
| --- | --- | --- | --- |
| `watchlist.add` | Insert `watchlist` membership | New membership ID | `{ position }` |
| `watchlist.remove` | Delete membership and compact the remaining positions | Removed membership ID | `{ previousPosition }` |
| `watchlist.reorder` | Update affected `watchlist[].position` | Moved membership ID | `{ previousPosition, position, orderedIds }` |
| `watchlist.visibility` | Update `user.watchlistVisibility` | Account ID | `{ previousVisibility, visibility }` |
| `rating.set` | Insert `ratings` row or update `value` and `updatedAt` in the existing row | Rating ID | `{ previousValue, value }` with `null` previous value on create |
| `rating.remove` | Delete `ratings` row | Removed rating ID | `{ previousValue, value: null }` |
| `ratings.visibility` | Update `user.ratingsVisibility` | Account ID | `{ previousVisibility, visibility }` |
| `list.create` | Insert `lists` row | New list ID | `{ name, visibility }` |
| `list.edit` | Update changed `name`, `description`, or `visibility` and set `updatedAt` | List ID | `{ changes }`, keyed by changed field with `{ previousValue, value }` for each |
| `list.delete` | Delete one `lists` row and associated `listItems` | Removed list ID | `{ name, removedItemIds, removedTitleIds }` |
| `list.item.add` | Append `listItems` row and set parent list `updatedAt` | New membership ID | `{ position }` |
| `list.item.remove` | Delete membership, compact sibling positions, and set parent `updatedAt` | Removed membership ID | `{ previousPosition }` |
| `list.reorder` | Update affected `listItems[].position` and set parent `updatedAt` | Moved membership ID | `{ previousPosition, position, orderedIds }` |

In a reorder event, include the moved row's `titleId`. Validate targets, ownership, numeric range, and duplicate membership at the store boundary. Treat an unchanged save, cancelled dialog, duplicate add, or invalid attempt as a no-op. Preserve injected keys when writing the next whole state.

## Deterministic seed

```js
export function createInitialData() {
  return { user, titles, watchlist, ratings, lists, listItems, stateEvents: [] }
}
```

Return fresh record objects or a fresh deep copy of fixed fixtures. Use the Harbor template's array replacement and object merge. Derive indexes, counts, cover candidates, summaries, and filtered results in memory.

| Entity | Default fixtures |
| --- | --- |
| `user` | Morgan Ellis, stable ID `user-001` |
| `titles` | 72 English-language synthetic titles, stable `title-001` through `title-072`. Mix movies, TV series, shorts, and a few episodes across several genres and years. Include a same-name pair distinguishable by year, repeated genre and type combinations, and several optional metadata gaps. |
| `watchlist` | 26 fixed memberships with different added dates and multiple types and genres. Keep some unrated titles in the queue. |
| `ratings` | 32 distinct ratings for titles across the catalog, including scores 1 and 10, overlapping and outside the Watchlist. Include created and updated dates that differ. |
| `lists` | 24 named title lists with both visibility values and different updated dates. Examples include Rainy Night Mysteries, Night Bus Cinema, and Kitchen Table Dramas. Seed at least one intentionally empty list. |
| `listItems` | About 100 fixed memberships spread across the lists. Reuse some title IDs across different lists and include lists with 1, 2, and 10+ members. |
| `stateEvents` | Empty initially. |

Reserve a searchable released title such as `title-072`, “Night Ferry to Bellport”, with no starting Watchlist row, personal rating, or list membership. Seed at least one public and one private list with two or more titles so the verifier can exercise filtering and reorder.

## Injected state

Guard collection reads and optional metadata. A missing catalog link should display an unavailable title row with its membership or rating removal action still usable. A missing poster uses the local fallback. A missing aggregate rating displays as unavailable and sorts after present values. Treat missing positions as following valid numeric values and use stable ties such as ID. Use the same ordering when presenting editable positions. Empty collections have a useful recovery action. Keep any read-time fallback out of persisted data until a user performs a valid mutation. Use runtime `new Date()` for current-clock comparisons and virtualize or paginate long results only if needed.
