# Figma state model

Use these top-level keys in `src/data/seed.js` and document the implemented shapes in `SCHEMA.md`. All values are JSON. IDs are opaque strings. ISO values are UTC ISO 8601 strings, such as `2026-04-14T15:30:00.000Z`. A nullable field is written as `null` when cleared. Treat absent optional fields like their null or default value at render time.

## Top-level state and shared shapes

| Key | Type | Example or purpose |
|---|---|---|
| `account` | object | `{ currentUserId: "user-maya", workspaceName: "Commonfield Studio" }`. Both fields are strings. |
| `users` | array of User | Local actor and share directory |
| `folders` | array of Folder | Active destinations and historical references |
| `files` | array of File | File metadata, access policy and lifecycle |
| `pages` | array of Page | Ordered artboards belonging to files |
| `layers` | array of Layer | Objects, main component nodes and placed instances |
| `components` | array of Component | Reusable main records and publication state |
| `commentThreads` | array of CommentThread | Root comments with canvas anchors and resolution |
| `commentReplies` | array of CommentReply | Replies attached to threads |
| `fileAccess` | array of FileAccess | Active grants, pending invitations and removed records |
| `fileStars` | array of FileStar | Favorites scoped by file and user |

For each record marked **Audit**, include these four fields. `createdAt` and `updatedAt` are ISO strings. `createdById` and `updatedById` are user IDs. At creation set both timestamps from the same runtime clock value, and both actor fields to the acting signed-in user. On an edit change only the update fields. Generate fresh IDs only in user actions. A file-wide business action that touches several records uses one timestamp and commits one full-state mutation.

## Account and file library

| Record | Fields and types | Example |
|---|---|---|
| User | `id: string`, `name: string`, `email: string`, `avatarColor: string` | `user-maya`, Maya Chen, `maya.chen@example.test`, `#F2C1AA` |
| Folder | `id: string`, `name: string`, `description: string`, `status: "active" \| "archived"`, Audit | `folder-commerce`, Commerce, Checkout and account journeys, active |
| File | `id: string`, `name: string`, `ownerId: string`, `folderId: string \| null`, `sourceFileId: string \| null`, `status: "active" \| "trashed"`, `preview: "checkout" \| "dashboard" \| "component-board" \| "onboarding" \| "travel-map" \| "type-specimen" \| "blank"`, `linkAccess: LinkAccess`, `trashedAt: ISO \| null`, `trashedById: string \| null`, `restoredAt: ISO \| null`, `restoredById: string \| null`, Audit | `file-checkout`, Checkout Refresh, `user-maya`, `folder-commerce`, null, active, checkout, invited policy, four null lifecycle fields |
| LinkAccess | `audience: "invited" \| "anyone"`, `role: "view" \| "edit" \| null`, `updatedAt: ISO`, `updatedById: string` | invited, null, seed timestamp, `user-maya` |
| FileStar | `id: string`, `fileId: string`, `userId: string`, `status: "starred" \| "unstarred"`, Audit | `star-001`, `file-checkout`, `user-maya`, starred |

Drafts are active files with `folderId=null`. A missing parent falls back to an unavailable destination label in read views. For restore, an unavailable destination becomes Drafts. New files use `preview=blank`, `sourceFileId=null`, active status and an invited policy. Create an empty page named **Page 1** with the file. Allow the same file name in a folder and use IDs to distinguish records. For sort use ID as a stable tie-breaker.

When duplicating, copy pages, layers, and mains in one mutation. Allocate a page, layer, and local component ID map first. Use it to remap each duplicate's references. A copied main has `status=local` and null publication fields. Preserve instance references to external components. Copying an injected file without a page creates one fresh blank page. Use new audit fields, the current actor as owner, the source preview, null lifecycle fields, and a fresh invited link policy. Place the copy in Drafts if the original folder is unavailable.

## Document and reusable design

| Record | Fields and types | Example |
|---|---|---|
| Page | `id: string`, `fileId: string`, `name: string`, `position: number`, Audit | `page-checkout-mobile`, `file-checkout`, Mobile checkout, 0 |
| Layer | `id: string`, `fileId: string`, `pageId: string`, `parentLayerId: string \| null`, `name: string`, `kind: "frame" \| "shape" \| "text" \| "component" \| "instance"`, `componentId: string \| null`, `position: number`, `geometry: Geometry`, `fill: string \| null`, `text: string \| null`, Audit | `layer-checkout-pay`, `file-checkout`, `page-checkout-mobile`, null, Pay now button, shape, null, 2, `{x:84,y:424,width:256,height:42}`, `#F2C1AA`, null |
| Geometry | `x: number`, `y: number`, `width: number`, `height: number` | `{x:84,y:424,width:256,height:42}` in a 960 × 600 document coordinate space |
| Component | `id: string`, `fileId: string`, `pageId: string`, `mainLayerId: string`, `name: string`, `description: string`, `status: "local" \| "published"`, `publishedAt: ISO \| null`, `publishedById: string \| null`, Audit | `component-primary-button`, `file-field-kit`, `page-field-kit-core`, `layer-field-kit-primary`, Button / Primary, Primary action for checkout, published, seed timestamp, `user-maya` |

Sort pages and sibling layers by `position` then ID. Render canvas geometry inside the artboard with a consistent scale. Add shape creates a visible top-level rectangle of reasonable size at a deterministic free position. An instance stores its final size and location and its main's ID. At render time use the main's fill, text and child artwork when available. Provide a generic instance preview if a main could not be resolved. Publishing requires an editable source and an active file. An external asset is eligible for insertion if published, its file is active and readable, and its main layer is present. A local asset with a main is eligible before publication.

When a main layer is converted, keep its ID, `parentLayerId`, `geometry`, `fill`, `text`, and existing children. Set the new component record's `fileId` and `pageId` to the same IDs as the layer. An instance's `fileId` and `pageId` refer to its destination. Use the component record's file and page for **Go to main component**.

## Feedback

| Record | Fields and types | Example |
|---|---|---|
| CommentThread | `id: string`, `fileId: string`, `pageId: string`, `layerId: string \| null`, `x: number`, `y: number`, `body: string`, `status: "open" \| "resolved"`, `resolvedAt: ISO \| null`, `resolvedById: string \| null`, `reopenedAt: ISO \| null`, `reopenedById: string \| null`, Audit | `thread-checkout-001`, `file-checkout`, `page-checkout-mobile`, `layer-checkout-pay`, 0.22, 0.74, “Could we clarify the total above the pay button?”, open, four null lifecycle fields |
| CommentReply | `id: string`, `threadId: string`, `body: string`, Audit | `reply-checkout-001`, `thread-checkout-001`, “I'll add the subtotal and shipping breakdown.” |

Store `x` and `y` normalized to [0, 1] within the page artboard. The layer link is optional context. Pin rendering uses normalized positions and can recover if a layer becomes unavailable. When placing a pin on a layer use the click coordinates relative to the artboard, or the layer center for keyboard placement. Read page or thread query parameters only if the referenced record belongs to the file. A thread in a direct link supplies its own page. Hide resolved threads by default, and reveal a directly linked resolved thread with its status identified. Update the thread when a reply is posted. For resolved threads show Reopen in place of the reply composer. A reopened thread keeps its reopen timestamp when subsequently resolved.

## Access and permissions

| Record | Fields and types | Example |
|---|---|---|
| FileAccess | `id: string`, `fileId: string`, `userId: string \| null`, `email: string`, `role: "view" \| "edit"`, `status: "active" \| "pending" \| "removed"`, `removedAt: ISO \| null`, `removedById: string \| null`, Audit | `access-checkout-001`, `file-checkout`, `user-jules`, `jules.bennett@example.test`, edit, active, null, null |

Use the configured `account.currentUserId` as the actor. If it is absent from the injected directory, show a neutral account label and handle grants by matching the configured ID when available. Fall back safely if there is no usable actor. Identify the owner by `files[].ownerId`. Determine effective access as the highest of owner, the actor's active direct grant, and `anyone` link role. A file with no applicable role is restricted. Scope active file listings and published assets to readable files. The owner manages sharing and trash/restore. Editors can rename, move and edit the document. All readable files support open, comment, star, duplicate and copy link. For nonowners, the Share dialog shows the current link settings and Copy link. Trash lists the actor's trashed files. Validate roles in the mutation path as well as the controls.

Use trimmed, lower-case email for grant matching. Existing active and pending grants block duplicates. Removed grants remain as history, so a later invitation creates a new record. A known directory user creates an active grant and sets `userId`; a syntactically valid address outside the directory creates a pending grant with null `userId`. Keep the known directory and seeded addresses under the reserved `example.test` domain. Changing a pending grant's role leaves it pending. Link setting and grant updates leave document edit metadata intact. On **Only invited people**, store a null role and decide access from owner or active grants. Session-aware links open the file under the current synthetic account.

## Suggested seed

Build the initial object from fixed arrays or deterministic functions that generate IDs and dates from explicit indices. Use fixed historical dates across multiple months. Use exactly the same initial state for every run. Define one active empty folder and an archived folder for fallback cases. Avoid array position as an identifier in any code path.

| Entity | Target and coverage |
|---|---|
| Users | 24 synthetic directory entries. Start as Maya Chen (`user-maya`). Include Jules Bennett (`user-jules`) and Serena Park (`user-serena`) as invite suggestions. |
| Folders | 8 including Commerce (`folder-commerce`), Field Design System (`folder-design-system`), Product Growth, Research, Brand, and Platform. |
| Files | 48 including Checkout Refresh (`file-checkout`), Field UI Kit (`file-field-kit`), Account Onboarding (`file-onboarding`), and Operations Dashboard. Include at least eight drafts, four trashed files, and a restricted file. Put the named training files high in Files by their fixed update dates and make them Maya-owned. Keep file names recognizably distinct across previews and work areas. |
| Pages and layers | 100 pages and 200 layers. Include `page-checkout-mobile` with `layer-checkout-pay`, a visible plain shape eligible for conversion, and `page-field-kit-core` with existing main layers. Seed a blank page as an Add shape starting point. |
| Components | 42 mains spanning controls, navigation, input fields and cards. Publish at least 12, including `component-primary-button` from Field UI Kit. Include instances referencing both local and published sources among the layers. |
| Threads and replies | 42 threads and 72 replies, with open and resolved threads and some threads without replies. Place several on `page-checkout-mobile` and at least one on a different page in the same file. |
| Access grants | 64 grants across files. Include two direct grants and an unknown pending invite in Checkout Refresh. Keep one directory user with no Checkout Refresh grant so the invite workflow has a known-recipient path. Seed invited-only and anyone policies, plus a view-only file. |
| Stars | 14 records across current and other users, including `star-001` for Maya on Checkout Refresh and historical unstarred records. |

Keep bookmarked seed IDs linked even if a record's display name changes. Vary authored content and optional fields so file scopes, sorting, page navigation and asset search each have meaningful results. Missing parents, people, or optional data should degrade through display fallbacks without inserting state on boot.
