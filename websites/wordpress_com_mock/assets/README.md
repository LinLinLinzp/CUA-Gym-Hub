# WordPress.com research and implementation references

WordPress.com hosts websites and blogs. This workspace covers editorial administration for a single culture publication. The managing editor moves drafts through review, publication and scheduling. A site editor maintains static pages and their hierarchy. A media producer maintains reusable assets and accessibility metadata. A moderator works through incoming comments and replies to readers. The planned site starts with the managing editor signed in. [WordPress.com features](https://wordpress.com/features/) · [Dashboard navigation](https://wordpress.com/support/navigate-wordpress-com/)

WordPress.com documents both the Classic and Default admin styles, with Classic used when no preference is set. Classic is the workflow reference because its Posts, Pages, Media and Comments screens form a consistent set with direct entry points. Shared block editing is a separate workspace for individual documents. The application uses the original editorial styling specified in [DESIGN.md](../DESIGN.md). [Admin interface styles](https://wordpress.com/support/navigate-wordpress-com/set-your-admin-interface-style/) · [Block editor overview](https://wordpress.org/documentation/article/wordpress-block-editor/)

## Feature inventory

| Priority | Surface | Behavior and layout |
| --- | --- | --- |
| P0.1–P0.4 | Scaffold, dashboard, routing and state | Persistent navigation, utility header, linked content totals and recent records. New menu goes directly to post/page composition or media upload. Stable entry points and a single user-driven Harbor store. |
| P1.1 | Posts table | Status counts above the list, search and filters beside bulk controls. A title anchors each row with author, taxonomy, comment count and date. Quick Edit is a compact settings form. |
| P1.2 | Post editor | Toolbar with Preview and Save/Publish, ordered writing canvas, block inserter and inspector. Post settings cover author, slug, excerpt, categories, tags, featured image, comments and lifecycle. A confirmation step precedes publication. |
| P1.3 | Pages table and editor | Separate list and a shared editor. Parent and Order convey document hierarchy. Tabs, Quick Edit and bulk settings sit in the same places as on Posts. |
| P1.4 | Content recovery | Trash is a filtered state with Restore and Delete permanently. Restore returns content to Drafts. The editor also exposes Move to Trash. |
| P1.5 | Media Library | Grid for visual scanning, list for file/attachment details, search/type/date filters, and an Add Media File drop zone. Attachment details pair a large preview with editable metadata. |
| P1.6 | Media actions | Attach/Detach in the list and a selectable library in the editor. Show attachment ownership and content references where they help. Confirm permanent deletion of a single item or a selection. |
| P1.7 | Comments queue | Status tabs with counts, table with Author, Comment, In response to and Submitted on, distinct pending rows and status-dependent actions. Search and select before applying bulk changes. |
| P1.8 | Comment forms and history | Reply and Quick Edit inline, a history view for persisted actions, post/page preview with approved comments. |
| P2.1–P2.2 | Editor convenience | Keyboard save and shortcut help, document outline, preview widths. |

WordPress.com documents that restored content moves to Drafts, and media deletion removes a library item permanently. Page Parent and Order are separate settings. Comments distinguish pending from approved and provide queue-specific bulk moderation. [Post and page trash](https://wordpress.com/support/trash/) · [Page hierarchy](https://wordpress.com/support/pages/page-attributes/) · [Bulk edit](https://wordpress.com/support/edit-pages-screen/) · [Media deletion](https://wordpress.com/support/delete-media-files/) · [Comment moderation](https://wordpress.com/support/comments/manage-your-sites-comments/)

Publication and scheduling use explicit editor controls. Desktop has space for a full canvas and adjacent inspector. On narrow web viewports, use a collapsible navigation and settings drawer so the same actions remain reachable. Shortcut help and preview widths are secondary. [Create a post](https://wordpress.com/support/posts/) · [Create a page](https://wordpress.com/support/pages/) · [Schedule posts and pages](https://wordpress.com/support/schedule-a-post-or-page/) · [Editing on mobile](https://wordpress.com/support/edit-your-site-on-mobile/) · [Keyboard shortcuts](https://wordpress.com/support/wordpress-editor/keyboard-shortcuts/)

## Data and runtime context

One site and one signed-in user define the workspace. Posts use categories and tags. Pages form a parent-child hierarchy. Media can belong to one uploaded-to target and can appear in multiple blocks or featured images. Comments point to their target and optional parent. Moderation history and permanent deletion remain observable in activity events. Default content covers books, regional art, community events and local history in English. [Field definitions and seed distributions](data_model.md)

The runtime persists full state only after explicit user mutations. It also handles local media bytes and serves built assets offline. Scheduling saves an observable date and status, and current time is used for validation and display. Live services such as account management, hosting, billing, Reader, subscriber emails, external media imports and Akismet sit outside this single-site editorial scope. [Harbor runtime contract](../../../HARBOR_CONTRACT.md) · [Implementation checklist](../TODO.md)

## Visual references

The local screenshots are research references for layout and workflow. WordPress.com Support supplies the product-specific screenshots, and WordPress.org docs supply the shared Classic admin and block editor views. Some captures show older versions or cropped, annotated controls. Use current WordPress.com guides for labels and the local design spec for implementation tokens.

| Local image | What it shows | Source |
| --- | --- | --- |
| [Dashboard](screenshots/reference/dashboard.jpg) | Dark utility bar and fixed left navigation, with an overview and quick links organized as cards. | [WP Admin dashboard](https://wordpress.com/support/dashboard/) |
| [Posts list](screenshots/reference/posts-list.png) | Status links above a dense table, with title, author, taxonomies, comments and date. Filters and bulk controls sit directly above it. | [Posts screen](https://wordpress.org/documentation/article/posts-screen/) |
| [Pages table](screenshots/reference/pages-table.png) | The shared list skeleton with page-focused columns, search, filters and selection. | [Pages screen](https://wordpress.org/documentation/article/pages-screen/) |
| [Page filters](screenshots/reference/pages-list.jpg) | Add New Page next to the screen title and inline status filters with counts. | [Post and page settings](https://wordpress.com/support/edit-a-page-or-posts-settings/) |
| [Quick Edit](screenshots/reference/quick-edit-page.jpg) | Inline two-column form with title and slug opposite parent, order and status, followed by Update and Cancel. | [Post and page settings](https://wordpress.com/support/edit-a-page-or-posts-settings/) |
| [Block editor](screenshots/reference/block-editor.jpg) | Slim top toolbar, centered writing canvas, and a right inspector with document and block settings. | [Block editor overview](https://wordpress.org/documentation/article/wordpress-block-editor/) |
| [Publish controls](screenshots/reference/publish-toolbar.jpg) | Saved indicator, preview and settings icons, and prominent Publish control. | [Create a post](https://wordpress.com/support/posts/) |
| [Scheduled settings](screenshots/reference/scheduled-status.jpg) | Status and publication date grouped as editable settings in the right inspector. | [Schedule posts and pages](https://wordpress.com/support/schedule-a-post-or-page/) |
| [Media grid](screenshots/reference/media-grid.png) | Grid/list toggle and filters at the start of the toolbar, search at the other end, regular preview tiles below. | [Media Library screen](https://wordpress.org/documentation/article/media-library-screen/) |
| [Media list](screenshots/reference/media-list.png) | Thumbnail and filename in the first column, with author, upload target, and Attach/Detach actions. | [Media Library screen](https://wordpress.org/documentation/article/media-library-screen/) |
| [Media entry point](screenshots/reference/media-library.jpg) | Library heading and Add Media File control. | [Manage media](https://wordpress.com/support/media/) |
| [Upload controls](screenshots/reference/media-upload.jpg) | Drop target with a centered Select Files button. | [Manage media](https://wordpress.com/support/media/) |
| [Media details](screenshots/reference/media-details.png) | Large preview at left and file metadata plus ALT text, title, caption and description fields at right. | [Media Library screen](https://wordpress.org/documentation/article/media-library-screen/) |
| [Attach media](screenshots/reference/media-attach.jpg) | Searchable modal results with a single target selector and confirmation button. | [Find and edit media](https://wordpress.com/support/media/edit-media-library/) |
| [Delete media](screenshots/reference/media-delete.jpg) | Permanent-delete action in the media row alongside file actions. | [Delete media](https://wordpress.com/support/delete-media-files/) |
| [Comment moderation](screenshots/reference/comments-moderation.jpg) | Pending highlight and different Approve/Unapprove actions, with the target column next to the comment body. | [Manage comments](https://wordpress.com/support/comments/manage-your-sites-comments/) |
| [Bulk comments](screenshots/reference/comments-bulk.jpg) | Selection checkboxes, Bulk actions menu and Apply button. | [Manage comments](https://wordpress.com/support/comments/manage-your-sites-comments/) |

## Bundled seed media

The built-in image generator produced the editorial photo sheet. Its crops and the local PDF, audio test tones and still-video fixtures are bundled in [public/media](../public/media).

### Photo sheet prompt

> Create one photorealistic editorial photography contact sheet used as a sprite sheet for a fictional coastal arts journal. Landscape 3:2. EXACTLY 4 equally sized columns and 3 equally sized rows, straight edge-to-edge cells with NO gaps, NO frames, NO labels, NO text, no collage overlap. Each cell is an independent natural documentary photograph. Row 1 left to right: woodcut printmaking press and ink rollers on a workbench; vintage maps on a bookshop table; stack of poetry books on a rainy waterfront window; dark green harbor at dawn with a moored ferry. Row 2: pottery bowls in a studio; elegant small art gallery with visitors viewed from behind; neighborhood market flower stall; coastal red-brick industrial museum. Row 3: reader holding book in library; dusk bandstand with musicians seen from distance; small oral history recorder on wooden desk; aerial view of walking path along salt marsh. Quiet natural light, wealthy texture, green, indigo, brick and paper hues, believable local journal documentary photography. Strict 4x3 grid.
