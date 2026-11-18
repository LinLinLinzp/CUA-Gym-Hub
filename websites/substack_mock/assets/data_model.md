# Substack state model

The proposed Harbor state describes one publication and its signed-in publisher. Store plain JSON with stable string IDs, ISO 8601 UTC timestamps, numeric quantities, and two-decimal currency strings. A documented nullable field can be omitted in injected records. Render with safe defaults and resolve relations by ID. Never backfill records on render.

## Top-level shape

| Key | Type | Example or default |
| --- | --- | --- |
| `currentUserId` | string | `usr_mara` |
| `publication` | Publication | The Sunday Margins, `pub_sunday_margins` |
| `users` | User[] | Mara Ellis, Imani Cole, Jonah Mercer |
| `posts` | Post[] | 42 articles |
| `subscribers` | Subscriber[] | 84 records |
| `compSubscriptions` | CompSubscription[] | 26 grants |
| `comments` | Comment[] | 120 comments |
| `events` | Event[] | Typed history, including fixed seed examples |

`Publication.ownerId`, author IDs and actor IDs refer to `users[].id`. Content and subscriber records have `publicationId`. `Subscriber.userId` is nullable because importing an email does not create a Substack user. A comment points to its post, its author, and optionally a parent comment on the same post. A grant points to its subscriber. All records remain addressable after user removal or deletion.

In the tables below, `?` means nullable or omitted. Timestamps shown without times in the prose use the full ISO format in actual state.

## Publication and users

| Record | Fields and representative values |
| --- | --- |
| Publication | `id: string = "pub_sunday_margins"`, `ownerId: string = "usr_mara"`, `name: string = "The Sunday Margins"`, `slug: string = "the-sunday-margins"`, `description: string = "Close readings of books, films, and city life."`, `logoPath?: string = "/images/sunday-margins.png"`, `currency: string = "USD"`, `commentsEnabled: boolean = true`, `createdAt: ISO = "2024-10-01T14:00:00.000Z"`, `updatedAt: ISO`, `updatedById: string = "usr_mara"` |
| User | `id: string = "usr_mara"`, `name: string = "Mara Ellis"`, `handle: string = "maraellis"`, `role: owner\|contributor\|reader = owner`, `avatarPath?: string = "/images/avatars/mara.png"` |

## Posts

| Field | Type and example |
| --- | --- |
| `id`, `publicationId`, `authorId`, `slug` | strings such as `post_018`, `pub_sunday_margins`, `usr_mara`, `the-last-video-store` |
| `title`, `subtitle?`, `bodyHtml` | strings such as “The Last Video Store”, “What we lose when a shelf becomes a search box”, and `"<p>The shop still stamped its return dates by hand.</p>"`. Sanitize injected and editor-written HTML before rendering. |
| `thumbnailPath?`, `tags` | local image path such as `/images/posts/video-store.webp`; string[] such as `["Film", "City Life"]` |
| `status` | `draft\|scheduled\|published\|deleted` |
| `audience` | `everyone\|free\|paid\|founding`, default `everyone` |
| `commentPolicy` | `everyone\|subscribers\|paid\|founding\|disabled`, default `everyone` on a public post |
| `sendByEmailAndApp` | boolean, defaults to true in a new editor |
| `createdAt`, `createdById`, `updatedAt`, `updatedById` | ISO and actor ID pairs, e.g. `"2026-11-08T14:35:00.000Z"` and `"usr_mara"` |
| `scheduledAt?`, `publishedAt?`, `deliveryAt?`, `deletedAt?` | ISOs, e.g. `"2026-11-22T15:00:00.000Z"` for a scheduled article. `deliveryAt` records simulated delivery at publication. A schedule alone does not set `publishedAt` or `deliveryAt`. A deleted record may retain historical lifecycle dates. |
| `duplicatedFromId?` | string, e.g. `post_018`; reads as null for an original |
| `metrics?` | object of nonnegative numbers `{views: 1240, recipients: 71, opens: 43, newSubscribers: 4}`. Keys are optional. New drafts have null metrics. |

New IDs are generated on the committing action. Generate the initial slug from the title and disambiguate by ID; keep it stable through edits. A duplicate has a new unique slug and stands on its own lifecycle, with the “Copy of …” title editable.

For the comment-policy control, show Everyone, Subscribers, Paid subscribers, and No one on a public post. Allow Subscribers and No one on a free-only post, Paid subscribers and No one on a paid post, and Founding members and No one on a founding post. Intersect the policy with the article's audience. The publisher can participate on a published post with discussion enabled. The global switch and No one disable new messages even for the publisher. Preview reads the selected audience and never grants or consumes an entitlement.

## Subscribers

| Field | Type and example |
| --- | --- |
| `id`, `publicationId`, `userId?` | strings such as `sub_031`, `pub_sunday_margins`, `usr_imani` |
| `email`, `name?` | lower-case normalized string such as `imani.cole@example.test` and optional display string such as `Imani Cole` |
| `status`, `baseType` | `active\|removed` and `free\|paid\|founding\|trial`. Comp access is derived separately. |
| `source`, `country?` | `manual\|csv\|web\|app\|recommendation`, e.g. `recommendation`; optional display string such as `Canada` |
| `joinedAt`, `createdAt`, `createdById?`, `updatedAt`, `updatedById?` | ISO and actor metadata, e.g. joined on `"2025-04-20T16:30:00.000Z"`, created by `usr_mara` for a manual addition |
| `trialEndsAt?`, `welcomeEmailRequestedAt?` | ISO, e.g. `"2026-12-18T05:00:00.000Z"` for a trial; welcome intent is a timestamp set only if selected |
| `billingInterval?`, `paidPeriodStartedAt?`, `paidThroughAt?`, `periodAmount?`, `totalRevenue?` | `monthly\|annual`, two ISOs such as `"2026-11-01T15:00:00.000Z"` and `"2026-12-01T15:00:00.000Z"`, and USD decimal strings such as `"8.00"` and `"72.00"` |
| `activityScore?`, `emailOpens30d?` | nonnegative numbers, e.g. `4` out of 5 and `13` |
| `removedAt?`, `removedById?` | ISO and actor ID |

CSV input consumes a header with `email` and optional `name`, with standard quoting and BOM handling. Split manually entered addresses by comma or newline. A duplicate active email is skipped. As a seed policy, addresses that have previously been removed are rejected at import and remain available in history. Trial options use 7 days, 1 month, 3 months, 6 months, or 1 year. Compute the end from the commit time. Store the same timestamp in `joinedAt`, `createdAt`, and `updatedAt` on addition. An optional welcome message is represented only by `welcomeEmailRequestedAt`.

For paid removal with complete billing data, compute the prorated remainder as `periodAmount × clamp((paidThroughAt − now) / (paidThroughAt − paidPeriodStartedAt), 0, 1)`. Round once to two decimals, record currency and amount per affected ID, and reject an invalid or zero-length billing period from the refund calculation. Historical revenue remains an input metric.

## Comp subscriptions

| Field | Type and example |
| --- | --- |
| `id`, `publicationId`, `subscriberId` | strings such as `comp_014`, `pub_sunday_margins`, `sub_031` |
| `status`, `tier` | `granted\|revoked` and `paid\|founding` |
| `duration` | last chosen option, `7d\|30d\|90d\|6mo\|1y\|forever`, e.g. `90d` |
| `startsAt`, `endsAt?` | ISO pair, e.g. `"2026-11-18T05:00:00.000Z"` through `"2027-02-16T05:00:00.000Z"`; null end represents forever |
| `amount`, `currency` | `"0.00"` and the publication currency, e.g. `"USD"` |
| `createdAt`, `createdById`, `updatedAt`, `updatedById` | ISO and actor pairs |
| `revokedAt?`, `revokedById?` | ISO and actor ID when ended explicitly |

Derive Upcoming, Active, and Expired from the granted interval `[startsAt, endsAt)` and current clock. A revoked grant and a removed subscriber have no comp access. Prefer a current grant over a future grant in details, and list affected grants using their IDs. Default records have at most one non-ended grant per subscriber. Extensions preserve its start and move the end forward, or set the end to null for forever. The optional founding flag upgrades the comp tier and is preserved across later extensions. Calculate 7, 30, and 90 days in UTC. For month/year options, clamp the UTC day to the last available day in the target month. If a paid period or trial ends in the future, start a fresh comp at that date. For a granted row whose period already ended, add a new grant and keep the prior one as history.

The effective label is Comp during a current grant, with founding access if granted at that tier. Then fall back to an active paid/founding period or unexpired trial, followed by free membership for an active subscriber. Treat a legacy paid/founding row without a period end as active base access, and start a comp for that row immediately. For the overview, Paid access includes current comps and trials as well as paid and founding subscribers. The individual Paid filter selects effective Paid/Founding, while Comp and Trial have their own options. Dates and access transitions are derived for display and do not cause writes.

## Comments

| Field | Type and example |
| --- | --- |
| `id`, `publicationId`, `postId`, `authorId`, `parentId?` | strings such as `cmt_073`, `pub_sunday_margins`, `post_018`, `usr_imani`, and `cmt_072` for a reply |
| `body` | plain text, e.g. `"Our old rental store sent overdue notices by postcard."` |
| `status`, `reviewStatus`, `reportReason?` | `visible\|hidden\|removed`, `none\|reported\|approved\|removed`, and optional plain text such as `"Repeated promotional links"` |
| `createdAt`, `updatedAt` | ISO timestamps |
| `pinnedAt?`, `pinnedById?`, `moderatedAt?`, `moderatedById?` | optional ISO/actor pairs |

Reader counts include visible roots and replies. Display pinned visible roots first in most-recent-pin order, then unpinned roots newest-first and replies oldest-first. Hide a removed or hidden body's text while keeping a placeholder when required for visible descendants. A missing/cyclic parent in injected state falls back safely without an unbounded traversal. A review approval preserves the comment's visibility state. The Hidden view reads `status`; Reported and Approved read `reviewStatus`; Removed reads `status`. Use deterministic tiebreakers on IDs.

## Events and observable writes

Every row below appends at least one event with `id`, `type`, `publicationId`, `actorId`, `createdAt`, `entityId`, and `details`. The primary entity ID is the affected post, grant, comment, or publication; for batch subscriber actions it is the publication ID. Example event ID `evt_028`, actor `usr_mara`, timestamp `"2026-11-18T05:13:00.000Z"`. Use the same action timestamp for the event and its related changes.

| Event type | State changes and event `details` |
| --- | --- |
| `post.created` | Append a complete draft to `posts`. Details `{postId, status}`. |
| `post.updated` | Change saved editable post fields (`title, subtitle, bodyHtml, audience, commentPolicy, tags, sendByEmailAndApp`) and `updatedAt, updatedById`. Details `{postId, changedFields: string[]}`. |
| `post.published` | Set `status, audience, commentPolicy, tags, sendByEmailAndApp, scheduledAt, publishedAt, deliveryAt, updatedAt, updatedById`. Details `{postId, previousStatus, publishedAt, audience, deliveryAt}`. |
| `post.scheduled` | Set `status, audience, commentPolicy, tags, sendByEmailAndApp, scheduledAt, updatedAt, updatedById`. Details `{postId, previousScheduledAt, scheduledAt, audience}`. |
| `post.unscheduled` | Set `status, scheduledAt, updatedAt, updatedById`. Details `{postId, previousScheduledAt}`. |
| `post.duplicated` | Append a complete new draft with `duplicatedFromId`. Details `{postId, sourcePostId}`. |
| `post.deleted` | Set `status, deletedAt, updatedAt, updatedById`. Details `{postId, previousStatus}`. |
| `subscriber.added` | Append accepted `subscribers` rows. Details `{subscriberIds: string[], quantity: number, source, baseType, welcomeEmailRequested: boolean}`. |
| `subscriber.removed` | Set subscriber `status, removedAt, removedById, updatedAt, updatedById`; revoke non-ended grants by setting `status, revokedAt, revokedById, updatedAt, updatedById`. Details `{subscriberIds: string[], compIds: string[], quantity: number, refunds: [{subscriberId, amount, currency}]}`. This event captures bundled revocations. |
| `subscriber.exported` | Append only the event. Details `{subscriberIds: string[], quantity: number, scope: "all" or "filtered", columns: string[], filename: string}`. |
| `comp.granted` | Append a full grant. Details `{compId, subscriberId, startsAt, endsAt, duration, tier, amount, currency}`. |
| `comp.extended` | Set grant `endsAt, duration, tier, updatedAt, updatedById`. Same details as `comp.granted` plus `previousEndsAt`. |
| `comp.revoked` | Set grant `status, revokedAt, revokedById, updatedAt, updatedById`. Details `{compId, subscriberId}`. |
| `comment.created` | Append a full comment. Details `{postId, commentId, parentId}`. |
| `comment.pinned` / `comment.unpinned` | Set or clear `pinnedAt, pinnedById`; update `updatedAt`. Details `{postId, commentId}`. |
| `comment.removed` | Set `status`, clear `pinnedAt, pinnedById`, set `reviewStatus` for reported comments, and set `moderatedAt, moderatedById, updatedAt`. Details `{postId, commentId, previousStatus, reviewStatus}`. |
| `comment.approved` | Set `reviewStatus, moderatedAt, moderatedById, updatedAt`. Details `{postId, commentId, reviewStatus}`. |
| `comment.unhidden` | Set `status, moderatedAt, moderatedById, updatedAt`. Details `{postId, commentId, previousStatus}`. |
| `publication.commentsChanged` | Set `publication.commentsEnabled, updatedAt, updatedById`. Details `{commentsEnabled: boolean}`. |

A bulk comp logs each changed grant in one state save. A confirmation that changes nothing generates no event. Search, sorting, pagination, UI personalization, and time-derived transitions never change Harbor state.

## Seed plan

Return fresh objects and arrays from `createInitialData()` every call. Use fixed IDs and dates, with 2026-11-18 as the reference date for the example mix. Base actual render-time calculations on `new Date()`. Seed a finite comp around the reference date, one forever comp, upcoming comps tied to known billing dates, and unexpired trials. Include predictable linkable targets for Playwright.

| Seed entity | Examples |
| --- | --- |
| People | Mara Ellis runs the publication. Jonah Mercer is a contributor. Imani Cole, Theo Park, and Lucia Reyes are readers. Use `example.test` email addresses. |
| Posts | **The Last Video Store** (published, Everyone, Film); **A Map of Quiet Museums** (published, paid, Art); **Weekend Reading, No. 41** (draft, Books); **Our Winter Screening List** (scheduled, Film). Use original English subtitles and paragraphs throughout. |
| Subscribers | Imani is free with high activity; Theo is paid monthly with a known period end; Lucia has an existing finite comp. Spread the remainder over additional sources, types, countries, revenue, and engagement levels. |
| Comp subscriptions | Link a current 90-day comp to Lucia, a future comp to a different paid subscriber with an actual future renewal, and a revoked comp to a still-active free subscriber. |
| Comments | Seed topical threads on several posts. Include an owner-pinned correction, readers replying about favorite neighborhood cinemas, a hidden promotional comment, and a reported comment with a reason and visible thread link. |
| Events | Use fixed IDs and timestamps for representative historical grants and moderation decisions. Event targets resolve to seeded rows and ordering is stable. |
