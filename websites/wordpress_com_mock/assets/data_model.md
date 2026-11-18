# WordPress.com state model

This is the proposed Harbor contract for the app's implementation. The repository's [Harbor contract](../../../HARBOR_CONTRACT.md) governs loading, persistence and injection. Implement the following shapes in `src/data/seed.js`, then document the implemented fields and writes in `SCHEMA.md`.

## Root state

| Key | Type | Example |
| --- | --- | --- |
| `site` | object | `{id:"site-harbor-field", name:"Harbor & Field Journal", tagline:"Arts, places, and public life on the coast", locale:"en-US", timezone:"UTC"}` |
| `currentUserId` | string | `"user-maya"` |
| `users` | user[] | Maya Chen and three colleagues |
| `posts` | post[] | “Inside the Lantern District Print Fair” |
| `pages` | page[] | “Visitor Information” |
| `categories` | term[] | Arts & Culture |
| `tags` | term[] | printmaking |
| `media` | media[] | Lantern District printmaking table |
| `comments` | comment[] | “Will there be a quiet hour on Sunday?” |
| `activity` | activity event[] | Moderation history and permanent-deletion records |

All records are plain JSON. Use stable, type-prefixed string IDs for seeded entities and the same type prefixes with unique IDs for new records. Keep post and page IDs unique across both arrays because they share an editor route. A block ID needs to be unique within its document. Use explicit `null` for absent associations or optional timestamps in new records. Resolving the signed-in user, site, labels and linked records must tolerate injected replacements and omissions. If `currentUserId` is absent from `users`, render a neutral signed-in label and use the session's existing `currentUserId` as the actor. Default arrays can be empty after injection. Keep transient UI state in components or the URL.

### Shared record stamps

| Field | Type | Example |
| --- | --- | --- |
| `id` | string | `"post-001"` |
| `createdAt` | ISO date-time string | `"2026-10-22T15:00:00.000Z"` |
| `createdBy` | user ID or null | `"user-maya"` or `null` for a guest comment |
| `updatedAt` | ISO date-time string | `"2026-10-24T18:15:00.000Z"` |
| `updatedBy` | user ID or null | `"user-maya"` |

On user-driven creation use `new Date().toISOString()` and the signed-in actor for both stamp pairs. On updates change only the updated pair. `authorId` identifies the credited author independently of the editing actor. Derived counts and display labels are computed from records.

## Users and terms

| Record | Fields and types | Example |
| --- | --- | --- |
| User | `id`, `name`, `username`, `email`, `role` strings. Role is `administrator`, `editor` or `author`. | `{id:"user-maya", name:"Maya Chen", username:"mayachen", email:"maya@harborfield.example", role:"administrator"}` |
| Category | Shared stamps plus `name`, `slug` strings | `{id:"cat-arts", name:"Arts & Culture", slug:"arts-culture", …stamps}` |
| Tag | Shared stamps plus `name`, `slug` strings | `{id:"tag-printmaking", name:"printmaking", slug:"printmaking", …stamps}` |

Posts use arrays of category and tag IDs. Reuse an existing term in the same taxonomy if its normalized slug matches a newly entered term. De-duplicate assignments. When available, use the seeded Uncategorized category as the default for an otherwise uncategorized new post. When an injected world lacks that category, accept an empty selection.

## Posts and pages

| Shared field | Type | Example |
| --- | --- | --- |
| Record stamps | Shared fields above | `"post-001"` |
| `title` | string | `"Inside the Lantern District Print Fair"` |
| `slug` | string, unique among posts or among sibling pages | `"lantern-district-print-fair"` |
| `blocks` | ordered block[] | `[{id:"block-001", type:"paragraph", text:"The fair opens Saturday at Pier Hall."}]` |
| `excerpt` | string | `"Printmakers from three coastal towns gather at Pier Hall."` |
| `authorId` | user ID | `"user-maya"` |
| `featuredImageId` | media ID or null | `"media-001"` |
| `commentsOpen` | boolean | `true` |
| `status` | `draft`, `pending`, `published`, `scheduled`, `private`, or `trash` | `"published"` |
| `scheduledAt` | ISO date-time string or null | `null` |
| `publishedAt` | ISO date-time string or null | `"2026-10-24T18:15:00.000Z"` |
| `trashedAt` | ISO date-time string or null | `null` |

| Type-specific field | Type | Example |
| --- | --- | --- |
| Post `categoryIds` | category ID[] | `["cat-arts"]` |
| Post `tagIds` | tag ID[] | `["tag-printmaking"]` |
| Page `parentId` | page ID or null | `"page-001"` |
| Page `menuOrder` | integer, default 0 | `2` |

All excludes Trash. Pending displays as Pending Review in the editor. Private is visible to the signed-in user in local preview. New posts default to comments open and new pages to comments closed. Page parents must exist and their ancestry must remain acyclic after a single or bulk change. For display, an injected missing or invalid parent can fall back to a top-level row. Slugs start from the title if blank, and get a unique suffix when generated; if a user enters a conflicting slug, show validation. Use an “Untitled” display fallback for a titleless draft. Publication and review require a title.

| Action | Status and date assignment |
| --- | --- |
| Save draft or revert to draft | Set `draft`; clear `publishedAt`, `scheduledAt`, `trashedAt`. |
| Submit for review | Set `pending`; clear all three lifecycle timestamps. |
| Publish or switch to private | Set `published` or `private`; set `publishedAt` to the confirmed date or action time, clear `scheduledAt` and `trashedAt`. For an already live item preserve the date unless the user explicitly changes it. |
| Schedule or reschedule | Set `scheduled` and the chosen future `scheduledAt`; clear `publishedAt` and `trashedAt`. Changes to the clock affect display. |
| Update | Preserve status and lifecycle dates unless the user changes a lifecycle field. |
| Move to Trash | Set `trash`, set `trashedAt`, clear `scheduledAt`; retain the prior `publishedAt` while in Trash. |
| Restore | Set `draft` and clear all three lifecycle timestamps. |

### Blocks

Blocks carry `id` and `type` plus the fields of their type.

| Type | Fields | Example |
| --- | --- | --- |
| `paragraph` | `text` string | `{id:"block-001", type:"paragraph", text:"The fair opens Saturday at Pier Hall."}` |
| `heading` | `text` string, `level` integer 2–4 | `{id:"block-002", type:"heading", text:"Getting there", level:2}` |
| `list` | `items` string[], `ordered` boolean | `{id:"block-003", type:"list", items:["Ferry to Pier 4", "Bus 16 to Market Street"], ordered:false}` |
| `quote` | `text`, `citation` strings | `{id:"block-004", type:"quote", text:"Everyone was welcome at the print table.", citation:"Nora Alvarez"}` |
| `image` | `mediaId` media ID or null, `caption` string | `{id:"block-005", type:"image", mediaId:"media-001", caption:"A tabletop proofing press at Pier Hall."}` |

Render copy as text. Read the image alt text from the linked media item. Use a placeholder with the retained caption after a referenced image is permanently deleted.

## Media

| Field | Type | Example |
| --- | --- | --- |
| Record stamps | Shared fields above | `"media-001"` |
| `fileName` | string, original file name | `"lantern-district-print-table.jpg"` |
| `url` | same-origin path string | `"/media/lantern-district-print-table.jpg"` or `"/files/example-session/329a_scan.jpg"` |
| `mimeType` | string | `"image/jpeg"` |
| `sizeBytes` | nonnegative integer | `248192` |
| `width`, `height` | positive integers or null | `1920`, `1280` |
| `title` | string | `"Lantern District print table"` |
| `altText` | string | `"Two ink rollers and a woodcut block on a worktable"` |
| `caption` | string | `"Workshop tools at Pier Hall."` |
| `description` | string | `"Editorial photograph for the October print fair feature."` |
| `authorId` | user ID | `"user-imani"` |
| `uploadedTo` | `{type:"post"\|"page", id:string}` or null | `{type:"post", id:"post-001"}` |

Use the response's `original_name`, `url`, `size` and `content_type` when creating an upload record. Dimensions can be null if unavailable. Accept named offline file types such as JPEG, PNG, GIF, WebP, PDF, MP3, OGG, MP4 and WebM. Treat files that fail validation or upload as form errors. Store the returned path and keep any temporary blob URL local to the preview. If direct preview response headers prevent an image from rendering, fetch the same-origin bytes and create a temporary object URL. Attachment ownership is optional. A media item may be used in more than one document. Permanent deletion removes the record from the library and clears references in the same state commit. The standard Harbor file endpoint serves stored bytes.

## Comments

| Field | Type | Example |
| --- | --- | --- |
| Record stamps | Shared fields above | `"comment-001"` |
| `contentType` | `"post"` or `"page"` | `"post"` |
| `contentId` | post or page ID | `"post-001"` |
| `parentId` | comment ID on the same content or null | `null` |
| `authorId` | user ID or null for a guest | `null` |
| `authorName` | string | `"Ruth Ellis"` |
| `authorEmail` | string | `"ruth.ellis@example.net"` |
| `body` | string | `"Will there be a quiet hour on Sunday?"` |
| `status` | `pending`, `approved`, `spam`, or `trash` | `"pending"` |
| `priorStatus` | `pending`, `approved`, or null | `null` |

Mine filters by `authorId === currentUserId`. Pending and Approved contribute to All. Approved comments under approved ancestors are visible in the saved preview; an injected missing parent is displayed at the root when the comment's target exists. When moving an active comment to Spam or Trash, store its active status as `priorStatus`. Not Spam/Restore returns to that prior status or to Pending if it is missing, and clears `priorStatus`. Approve and Unapprove also clear `priorStatus`. Reject moderation actions that do not apply to the row's current status. Bulk moderation applies to eligible rows and reports skipped rows. When deleting a comment, update any surviving direct reply to the nearest surviving ancestor on the same target, or to the root if there is none. Traverse the pre-commit thread when several levels are deleted.

## Activity events

| Field | Type | Example |
| --- | --- | --- |
| `id` | string | `"activity-001"` |
| `action` | enum below | `"comment_approved"` |
| `targetType` | `post`, `page`, `media`, or `comment` | `"comment"` |
| `targetId` | entity ID | `"comment-001"` |
| `actorId` | user ID | `"user-maya"` |
| `createdAt` | ISO date-time string | `"2026-10-24T18:15:00.000Z"` |
| `contentType` | `post`, `page`, or null | `"post"` |
| `contentId` | entity ID or null | `"post-001"` |
| `fromStatus`, `toStatus` | applicable status string or null | `"pending"`, `"approved"` |
| `relatedIds` | entity ID[] | `[]` |

Allowed `action` values are `post_deleted`, `page_deleted`, `media_deleted`, `comment_approved`, `comment_unapproved`, `comment_spammed`, `comment_unspammed`, `comment_trashed`, `comment_restored`, `comment_replied`, `comment_edited` and `comment_deleted`. For reply the target is the new comment, the old status is null and `relatedIds` contains the parent. For edit both statuses are the comment's current status. For any deletion `toStatus` is null. Post/page deletion records the removed comment IDs in `relatedIds`; media deletion records affected document IDs once each, including its attached target if it exists. Comment deletion records reparented reply IDs. For other actions `relatedIds` is empty. Use the content link on every comment event. Use null for `contentType` and `contentId` on non-comment events. History remains readable by target ID after a deletion.

## Seed distribution

- **Site and team.** Harbor & Field Journal covers regional arts, oral history, books, public spaces and events. Maya Chen is the administrator. Imani Brooks, Nora Alvarez and Elliot Reed write and edit. Seed overlapping assignments across several fixed months so author and date filters have useful intersections.
- **36 posts.** 17 published, 9 drafts, 3 pending, 3 scheduled, 2 private and 2 trashed. Include “Inside the Lantern District Print Fair”, “The Last Independent Map Shop”, and “Five Winter Readings by the Waterfront”. Write real headings, paragraphs and at least a dozen linked images. Spread posts across six categories (Uncategorized, Arts & Culture, Books, Local History, Place and Events) and fourteen topic tags with repeated assignments.
- **28 pages.** 16 published, 6 drafts, 2 pending, 1 scheduled, 1 private and 2 trashed. Include Home, About, Visit, Calendar, Archive and Community Guidelines. Include at least six children across three parents, one three-level chain, and siblings with varying order.
- **48 media items.** 36 editorial images, 6 PDFs, 4 audio items and 2 video items, with existing local files for each URL. Include at least 13 unattached items and attachments to both posts and pages. Use a mix of filled and blank alt text, captions and descriptions. Prefer bundled, appropriately sourced images from gallery, streetscape, book and event contexts.
- **72 comments.** 36 approved, 19 pending, 11 spam and 6 trashed. Tie them to multiple live posts and comment-enabled pages. Include threads across several targets, guest senders, at least eight replies, and a mix of the moderator's own comments and other commenters. Seed a few consistent activity rows including an approval, a reply and a spam move.

Define the seed as `createInitialData() => ({ site, currentUserId, users, posts, pages, categories, tags, media, comments, activity })` with fresh objects, stable IDs and literal UTC timestamps on each call. Set scheduled examples beyond the other seed dates, with fixed timestamps. Reserve `new Date()` for display, validation and user actions.

Field and relationship references. [Posts REST reference](https://developer.wordpress.org/rest-api/reference/posts/) · [Pages REST reference](https://developer.wordpress.org/rest-api/reference/pages/) · [Media REST reference](https://developer.wordpress.org/rest-api/reference/media/) · [Comments REST reference](https://developer.wordpress.org/rest-api/reference/comments/)
