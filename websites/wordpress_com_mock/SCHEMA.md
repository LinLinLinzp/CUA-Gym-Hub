# wordpress_com_mock Schema

**Base URL**: `http://localhost:5349/`

**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`

**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`

**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}`

**State read**: `GET /state?sid=<sid>` → `{stored_state, has_custom_state, sid}`

On the first load in a fresh browser session, injected arrays replace their seeded equivalents and injected objects merge with seeded objects. The client sends the merged world to the server as its baseline. When injection has already created `initial_state`, that snapshot remains the original supplied state. `state_diff` compares top-level collections and fields against that snapshot. Reset restores server-side current state from the initial snapshot. Use a fresh browser context or SID to bypass a previously loaded browser cache when verifying a new injection.

## State Schema

| Key | Type | Description |
| --- | --- | --- |
| `site` | object | `{ id, name, tagline, locale, timezone }`, all strings |
| `currentUserId` | string | Signed-in user ID |
| `users` | array | User records |
| `posts` | array | Post records |
| `pages` | array | Page records |
| `categories` | array | Category records |
| `tags` | array | Tag records |
| `media` | array | Media records |
| `comments` | array | Comment records |
| `activity` | array | Activity records |

New posts, pages, terms, media and comments have `id`, `createdAt`, `createdBy`, `updatedAt`, and `updatedBy`. Actor fields contain the signed-in user ID. Seeded guest comments use `null` for guest authorship. Related IDs are strings. Dates and timestamps are UTC ISO 8601 strings. An absent association or lifecycle date on an app-created record is `null`.

## Record shapes

| Record | Fields |
| --- | --- |
| User | `id`, `name`, `username`, `email`, `role` (`administrator`, `editor`, or `author`) |
| Category or tag | Record stamps, `name`, `slug`. IDs begin with `cat-` or `tag-`. |
| Post | Record stamps, `title`, `slug`, `excerpt`, `blocks` (ordered array), `authorId`, `featuredImageId`, `commentsOpen` (boolean), `status` (`draft`, `pending`, `published`, `scheduled`, `private`, or `trash`), `publishedAt`, `scheduledAt`, `trashedAt`, `categoryIds` and `tagIds` (arrays) |
| Page | Record stamps and the post fields through `trashedAt`, plus `parentId` and `menuOrder` (integer) |
| Media | Record stamps, `fileName`, `url` (same-origin path), `mimeType`, `sizeBytes` (integer), `width` and `height` (integer or null), `title`, `altText`, `caption`, `description`, `authorId`, `uploadedTo` (`{ type: "post" \| "page", id }` or null) |
| Comment | Record stamps, `contentType` (`post` or `page`), `contentId`, `parentId`, `authorId` (null for guests), `authorName`, `authorEmail`, `body`, `status` (`pending`, `approved`, `spam`, or `trash`), `priorStatus` (`pending`, `approved`, or null) |
| Activity | `id`, `action`, `targetType` (`post`, `page`, `media`, or `comment`), `targetId`, `actorId`, `createdAt`, `contentType`, `contentId`, `fromStatus`, `toStatus`, `relatedIds` (array). Content links are present on comment events. |

Each block has a stable `id` within its document and a `type`.

| Block type | Additional fields |
| --- | --- |
| `paragraph` | `text` |
| `heading` | `text`, `level` (2, 3, or 4) |
| `list` | `items` (ordered array of strings), `ordered` (boolean) |
| `image` | `mediaId`, `caption` |
| `quote` | `text`, `citation` |

### Default IDs

| Entity | IDs |
| --- | --- |
| Site | `site-harbor-field` |
| Users | `user-maya` (default actor), `user-imani`, `user-nora`, `user-elliot` |
| Posts | `post-001` through `post-036` |
| Pages | `page-001` through `page-028` |
| Categories | `cat-uncategorized`, `cat-arts`, `cat-books`, `cat-history`, `cat-place`, `cat-events` |
| Tags | `tag-printmaking`, `tag-waterfront`, `tag-bookshops`, `tag-poetry`, `tag-oral-history`, `tag-architecture`, `tag-public-art`, `tag-neighborhoods`, `tag-walking`, `tag-archives`, `tag-museums`, `tag-markets`, `tag-performance`, `tag-accessibility` |
| Media | `media-001` through `media-048` |
| Comments | `comment-001` through `comment-072` |
| Activity | `activity-001` through `activity-003` |

## Minimal Inject Example

```json
{
  "posts": [{"id": "post-audit-001", "title": "Harbor reading list", "status": "draft"}],
  "pages": [],
  "media": [],
  "comments": [],
  "activity": []
}
```

This state replaces the listed collections and uses the seeded site, users and taxonomy. To open the injected post in Vite, visit `/wp-admin/post.php?post=post-audit-001&action=edit&sid=<sid>`. The current Harbor static host serves the generated `/wp-admin/post%2Ephp` spelling.

## Observable State Changes (for LLM evaluation)

Every updated business record receives `updatedAt` and `updatedBy`. A batch updates its rows and activity in one state commit. Editor changes, dialog changes, preview options, search, selection, and filtering stay local until an explicit business action succeeds.

| User Action | State Field Changed |
| --- | --- |
| Save a new post or page | Append full record to `posts[]` or `pages[]`, including author, lifecycle fields and record stamps. Use a normalized supplied slug or generate one from the title. |
| Update in the document editor | Write changed `title`, `slug`, `blocks`, `excerpt`, `authorId`, `featuredImageId`, or `commentsOpen`. Also write `categoryIds` and `tagIds` for a post or `parentId` and `menuOrder` for a page. Append new normalized terms with stamps to `categories[]` or `tags[]` and assign their IDs within the same commit. |
| Quick Edit or Bulk Edit | Write chosen `authorId`, `commentsOpen`, post `categoryIds` or `tagIds`, or page `parentId`. Status changes also write the applicable lifecycle fields described below. Quick Edit also supports `title`, `slug`, and page `menuOrder`. |
| Save draft or submit for review | Set `status` to `draft` or `pending`. Clear `publishedAt`, `scheduledAt`, and `trashedAt` on transition. |
| Publish or publish privately | Set `status` to `published` or `private`; set `publishedAt` from the chosen UTC date, prior live date or action time. Clear `scheduledAt` and `trashedAt`. |
| Schedule or reschedule | Set `status: "scheduled"`, set `scheduledAt` to the selected future UTC time, and clear `publishedAt` and `trashedAt`. |
| Move content to Trash | Set `status: "trash"` and `trashedAt`. Clear `scheduledAt` and keep the prior `publishedAt`. |
| Restore content | Set `status: "draft"` and clear `publishedAt`, `scheduledAt` and `trashedAt`. |
| Permanently delete content | Remove matching posts or pages and their comments. Clear matching `media[].uploadedTo` and surviving child `pages[].parentId`. Append a `post_deleted` or `page_deleted` event per row with removed comment IDs in `relatedIds`. |
| Upload media | Append one `media[]` record per successful file with `url` from the upload response under `/files/<sid>/`, `fileName`, `mimeType`, `sizeBytes`, `width` and `height`, initial metadata, `uploadedTo: null`, author and stamps. |
| Save attachment details | Write changed `media[].title`, `altText`, `caption`, and `description`. |
| Attach, change attachment or detach | Set `media[].uploadedTo` to a post or page link or to null. |
| Reuse an image | On document Save, write `blocks[].mediaId` or `featuredImageId` on that post or page. |
| Permanently delete media | Remove selected `media[]` records. Clear matching `featuredImageId` and image block `mediaId` values across posts and pages. Keep block captions. Append a `media_deleted` event per file with affected document IDs in `relatedIds`, including its attachment. |
| Approve or unapprove comment | Set `status` to `approved` or `pending`, clear `priorStatus`, and append a `comment_approved` or `comment_unapproved` event. |
| Mark comment as Spam or Trash | Save its active status in `priorStatus`, set its destination `status`, and append a `comment_spammed` or `comment_trashed` event. |
| Restore comment or mark Not Spam | Restore `priorStatus` or use `pending` when absent. Clear `priorStatus` and append a `comment_restored` or `comment_unspammed` event. |
| Permanently delete comments | Remove eligible spam or trash comments. Update surviving direct replies to the nearest surviving same-thread ancestor or null. Append a `comment_deleted` event per removed row with its reparented reply IDs. |
| Reply or Approve and Reply | Add an approved signed-in comment linked by `parentId`, `contentType`, and `contentId`. Add a `comment_replied` event for the new reply with its parent in `relatedIds`. Approve and Reply also sets the parent to `approved`, clears its `priorStatus`, and appends its `comment_approved` event. |
| Quick Edit comment | Write changed `body`, `authorName` or `authorEmail`. Append a `comment_edited` event carrying the same status before and after. |

Activity event IDs begin with `activity-`. Comment events carry the owning content link, originating status and resulting status. Permanent deletions have `toStatus: null`. A new reply has `fromStatus: null`. A media deletion has null status fields.
