# Substack product research

Substack gives writers a publication website, a subscriber list, an article editor, and a discussion space under posts. A publisher moves between a dashboard for operational work and the public publication for reading and discussion. The culture scenario uses *The Sunday Margins*, a fictional newsletter covering books, independent film, exhibitions, and city life. [Substack feature overview](https://substack.com/features) · [Publisher dashboard guide](https://support.substack.com/hc/en-us/articles/29152946791188-How-can-I-publish-on-Substack)

## Personas

| Persona | Work in this scenario |
| --- | --- |
| Mara Ellis, publisher | Draft and publish criticism, schedule an edition, review drafts and post performance, import and export readers, and grant complimentary access. |
| Mara as moderator | Reply on published articles, pin an editorial clarification, resolve reports, restore hidden comments, and change discussion permissions. |
| Jonah Mercer, contributor | Authored some of the seeded articles and gives the publisher a realistic byline to encounter in post lists. |
| Readers such as Imani, Theo, and Lucia | Represent free, paying, and comped readers in subscriber lists and in written discussion. |

The publisher is the active user for the training workflows. The reader view shows publication content and discussion. Preview controls let the publisher inspect audience and device variants. [Reader and publisher navigation](https://support.substack.com/hc/en-us/articles/41021434922772-How-can-I-navigate-my-Substack-on-desktop) · [Post preview guide](https://support.substack.com/hc/en-us/articles/4433990875796-Can-I-see-how-a-post-will-look-like-to-readers-before-publishing)

## Feature inventory

| Priority | Surface | Features |
| --- | --- | --- |
| P0 | Foundation | Offline Vite scaffold, publisher shell and Home, deep links and SID retention, Harbor state, deterministic seed and injection support, build and acceptance. |
| P1 | Posts | Published/Drafts/Scheduled views, search and filter, formatted article editing and preview, publish/schedule/unschedule, draft duplication and post deletion. |
| P1 | Subscribers | Summary, search, filter, sort, selection and detail, manual add and CSV import, remove and local CSV export. |
| P1 | Comp subscriptions | Individual/bulk grant, duration and optional founding access, finite extension, future start for paid access, end comp and verify fallbacks. |
| P1 | Comments | Reader thread, post and reply, pin, remove, reported comment review and hidden comment recovery, post and publication comment settings. |
| P2 | Deeper workspace | Additional display columns, post detail metrics, and system-aware appearance. |

[TODO.md](../TODO.md) defines the implementable actions and enumerates persisted writes. [DESIGN.md](../DESIGN.md) specifies the workspace layout and tokens.

## View and interaction notes

- **Publisher Home.** Substack's desktop publisher Home distinguishes a narrow navigation sidebar from the active page. The overview is above latest post, drafts, and recent posts, with article actions close to the rows. This plan uses Home as the signed-in entry point and gives Posts, Subscribers, Moderation and Settings clear navigation. [Guide to Substack Home](https://support.substack.com/hc/en-us/articles/15754587436820-Guide-to-your-Substack-Home)
- **Posts.** Published, Drafts, and Scheduled are sibling views rather than separate objects. Search, filtering and sorting apply inside each view. Published rows expose performance; draft rows have author and last edit; overflow menus provide edit, duplicate, and delete actions as applicable. [Posts page guide](https://support.substack.com/hc/en-us/articles/15853567274772-Guide-to-your-Substack-Posts-page)
- **Editor and review.** The wide web editor centers the article with a compact formatting toolbar, Preview, and Continue. Publish choices include intended audience, comment access, tags, delivery, and schedule. The official web editor supports Cmd/Ctrl+B, Cmd/Ctrl+I, and markdown-style block entry. The native editor has its own controls and the official scheduling flow is web-only. [Publishing guide](https://support.substack.com/hc/en-us/articles/360037831771-How-do-I-publish-a-new-post-on-Substack) · [Editor shortcuts](https://support.substack.com/hc/en-us/articles/5582336874132-Can-I-use-shortcuts-in-the-Substack-editor) · [Scheduling](https://support.substack.com/hc/en-us/articles/360037870412-How-do-I-schedule-an-article-to-publish-for-a-future-date-on-Substack) · [Mobile app publishing](https://support.substack.com/hc/en-us/articles/28586634838292-How-to-publish-a-post-from-the-Substack-app)
- **Subscriber list and detail.** A dense subscriber table has search by name/email, column controls, filters, a select-all flow, and overflow actions. Profile detail provides type, source, stats, recent activity, comments, and subscription actions. The documented add flow accepts emails or an imported file. The planned CSV actions run locally and record the imported rows or export scope. [Subscriber dashboard](https://support.substack.com/hc/en-us/articles/360058529871-How-do-I-use-the-subscriber-dashboard-on-Substack) · [Manual add](https://support.substack.com/hc/en-us/articles/360037460332-How-do-I-manually-add-a-new-subscriber-to-my-mailing-list) · [Mailing list import](https://support.substack.com/hc/en-us/articles/360037829931-How-do-I-import-my-mailing-list-from-another-platform-such-as-Mailchimp-Ghost-or-Beehiiv)
- **Comp subscription.** Subscriber row and bulk menus can grant a complimentary paid subscription, with a duration picker in a confirmation dialog. Paying subscribers get the additional time after their billing period. The official screenshot shows finite durations, forever, and a founding option. End comp in the plan is a publisher action for rehearsing explicit revocation without removing the reader, with labels and state behavior defined in TODO.md. [Subscriber dashboard](https://support.substack.com/hc/en-us/articles/360058529871-How-do-I-use-the-subscriber-dashboard-on-Substack) · [Comp dialog](https://support.substack.com/hc/article_attachments/48329665980436)
- **Article discussion and moderation.** The discussion is attached to the article and has a composer, nested replies, row menus, and optional pinned comments. The publisher controls who can comment per post and can disable discussion for the publication. Reported and hidden comments have different queues and actions. The app uses seeded content in those queues for repeatable moderator tasks. [Comment access and pinning](https://support.substack.com/hc/en-us/articles/360037832711-How-do-I-enable-or-disable-comments-on-my-posts) · [Reporting and moderation](https://support.substack.com/hc/en-us/articles/5780832770452-Can-I-moderate-comments-on-my-Substack-posts) · [Hidden comments](https://support.substack.com/hc/en-us/articles/49712271829012-What-are-Reply-Rules-on-Substack)

## Screenshot references

The images are research references from official public help pages. The Posts screenshots use an older horizontal publisher nav, while the Home screenshot documents the sidebar. Product releases and publication themes account for differences in color and layout. Use the files to inspect workflows and control groupings. The design uses its own editorial layout, theme, and publication assets.

| Local screenshot | What to look at | Source |
| --- | --- | --- |
| [Publisher Home](screenshots/publisher-home.png) | Full desktop shell, sidebar grouping, overview metrics, recent posts and drafts | [Desktop navigation screenshot](https://support.substack.com/hc/article_attachments/41021397616916) |
| [Published posts](screenshots/published-posts.png) | Section tabs, search and filter bar, performance columns, sparse row actions | [Published tab screenshot](https://support.substack.com/hc/article_attachments/33358663928084) |
| [Draft posts](screenshots/draft-posts.png) | Draft sorting and overflow actions for edit, duplicate and delete | [Drafts tab screenshot](https://support.substack.com/hc/article_attachments/33358648491540) |
| [Article editor](screenshots/editor.png) | Full-width editor chrome, centered serif column, grouped toolbar, Preview and Continue | [Editor screenshot](https://support.substack.com/hc/article_attachments/32921333851668) |
| [Publish settings](screenshots/publish-settings.png) | Stacked choice groups for audience, comments, tags, delivery and schedule | [Scheduling guide screenshot](https://support.substack.com/hc/article_attachments/32923181498900) |
| [Subscriber table](screenshots/subscriber-table.png) | Search, filter and column controls above a compact selectable table | [Subscriber dashboard screenshot](https://support.substack.com/hc/article_attachments/48329665975572) |
| [Subscriber details](screenshots/subscriber-details.png) | Identity header, status and stats, detail tabs and an action menu | [Subscriber details screenshot](https://support.substack.com/hc/article_attachments/36666107841300) |
| [Add subscribers](screenshots/add-subscribers.png) | Email entry followed by subscription type selector | [Manual add screenshot](https://support.substack.com/hc/article_attachments/35404841094036) |
| [Comp duration](screenshots/comp-duration.png) | Modal with count-specific confirmation, duration menu, and founding flag | [Comp dialog screenshot](https://support.substack.com/hc/article_attachments/48329665980436) |
| [Article comment menu](screenshots/comment-pin.png) | Thread composer, reply action, and publisher pin and removal entries | [Comment pin screenshot](https://support.substack.com/hc/article_attachments/27291381528980) |
| [Moderation](screenshots/moderation.png) | Queue tabs, date header, comment excerpt, and explicit exception actions | [Hidden queue screenshot](https://support.substack.com/hc/article_attachments/51292001459220) |

## Data and runtime decisions

The [data model](data_model.md) defines six record types plus a typed event history. Publication, author, subscriber, grant, post, and parent-comment IDs connect the editor, lists, and reader. Publication and post settings determine who can write comments. A subscriber's base membership and complimentary grants are stored separately so a grant's end does not imply list removal. The model is for Harbor and follows the observed product actions. The [Substack developer API terms](https://substack.com/api-tos) describe public data access as a separate concern.

The publisher workspace uses explicit saves for drafts and publication changes. Simulated delivery, moderation decisions, and subscription changes have verifier-readable records. Dates may affect status labels and access without background state mutations. Scheduled publication is verified by its stored timestamp and can be advanced by an explicit Publish now action. The scope excludes sign-in, real billing and messaging, automated moderation, and platform surfaces outside the seeded editorial workflows. [Harbor runtime contract](../../../HARBOR_CONTRACT.md)
