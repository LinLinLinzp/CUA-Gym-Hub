# Mattermost research and implementation handoff

> Research completed 2026-11-18 for `websites/mattermost_mock`. Planning only. Canonical implementation checklist: [../TODO.md](../TODO.md); style: [../DESIGN.md](../DESIGN.md); records: [data_model.md](data_model.md); verifier mapping: [../SCHEMA.md](../SCHEMA.md).

## Scope and research basis

Mattermost is a team collaboration application built around channels, messages, threads and shared files. The sandbox starts already signed in to the Acme workspace as Alex Morgan. Its required training tasks are **channels, threads, pinned posts and file uploads**, all P1 work, with structured persistence under the Harbor contract. Research used public first-party documentation, API resource descriptions and inspected UI screenshots; no authenticated Acme workspace was accessed.

The target is the desktop browser Channels experience. Reconstruct the Denim shell and the everyday menu/dialog/pane flows. Mainstream tier A means visual detail and task completion both matter: a static screenshot or success toast is insufficient. Port **5304** is reserved for this app; planning did not start a dev server.

Public docs describe the larger platform, including calls and playbooks. Those are beyond this seed's messaging sandbox. [Mattermost overview](https://docs.mattermost.com/) and [official onboarding course](https://academy.mattermost.com/p/mattermost-end-user-onboarding) establish the broader product scope.

## Personas and training journeys

| Persona | Realistic task | UI entry and completion |
|---|---|---|
| Engineering manager, Alex Morgan | Coordinate a release team | Create private Release Readiness, add Jordan, set purpose/header, post checklist |
| Contributor, Sarah Chen | Discuss one issue without flooding a channel | Open root discussion, reply in Thread pane, follow, revisit in Threads |
| Incident coordinator | Make a runbook easy for everyone to find | Pin post, inspect Pinned messages, jump to source, remove stale pin |
| Designer or analyst | Share and locate evidence | Upload real image/document bytes, send to channel/thread, preview/download, search Files |
| Team member catching up | Focus on relevant updates | Search in/from/date, mark read/unread, use saved messages and muted channels |

These are local training scenarios, not new product workflows that require production integrations.

## Verified behavior and planning decisions

- Public/private channel creation is entered through Add channels or sidebar plus. Name and channel URL are separate concepts. The plan includes validation and purpose editing. [Create channels](https://docs.mattermost.com/end-user-guide/collaborate/create-channels)
- Public channels and private membership have different discovery rules; the default Town Square is protected. Preserve archived history and expose it read-only. [Channel types](https://docs.mattermost.com/end-user-guide/collaborate/channel-types), [archive/restore](https://docs.mattermost.com/end-user-guide/collaborate/archive-unarchive-channels)
- Threads collapse replies under a root and offer a followed-thread inbox. Participation follows a thread; simply opening one does not. This drives separate Post, Thread and ThreadMembership records. [Threaded discussions](https://docs.mattermost.com/messaging/organizing-conversations)
- Saved messages are personal; pins are channel-wide. Pin/unpin actions are in the post More menu, and the header pin control opens a right pane. Current docs hide that header icon at zero pins; the plan retains an empty pane entry through Channel Info. [Save and pin messages](https://docs.mattermost.com/end-user-guide/collaborate/save-pin-messages)
- Attachments support picker/drop/paste, preview and download. **Research discrepancy resolved:** the end-user guide says 10 files/post and default 100 MB/file; the create-post API page still says 5. Use **10 and 100 MB** for this user-facing reconstruction, consistently across validation/tests. The local template is the operational API. [Share files](https://docs.mattermost.com/end-user-guide/collaborate/share-files-in-messages), [Create post API](https://docs.mattermost.com/api/reference/create-post)
- Search and settings reference images span releases. Support a deliberate useful subset of modifiers and local display preferences rather than inert menus. [Search](https://docs.mattermost.com/end-user-guide/collaborate/search-for-messages), [Display options](https://docs.mattermost.com/end-user-guide/preferences/manage-your-display-options)
- Keyboard and mobile support inform accessibility; native desktop window chrome and mobile bottom navigation are not part of the desktop web shell. [Keyboard shortcuts](https://docs.mattermost.com/end-user-guide/collaborate/keyboard-shortcuts), [Client availability](https://docs.mattermost.com/end-user-guide/access/client-availability)
- The app's entity links borrow upstream concepts such as root post ids and file ids; persistence uses a deliberately explicit local camelCase model with ISO times and action audit records. It does not implement `/api/v4`. [API resource index](https://docs.mattermost.com/api)

## Complete feature inventory

P0 foundation consists of 8 checklist items: scaffold/offline assets, standard state integration, JSON endpoints and sid, injection/provider resilience, desktop shell, routes, interaction primitives and observable schema. These are prerequisites for every product feature below.

The following 29 product features correspond one-to-one to the 24 P1 and 5 P2 items in TODO. Exact UI instructions and state writes are there; this table is the feature index.

| ID | Priority | Feature / entities |
|---|---|---|
| P1-01 | P1 | Create channels; Channel, ChannelMember, SidebarCategory |
| P1-02 | P1 | Browse/filter/sort/join public channels; ChannelMember |
| P1-03 | P1 | Rename, header and purpose; Channel |
| P1-04 | P1 | Search/add/remove members and leave; ChannelMember |
| P1-05 | P1 | Archive/restore with protected default; Channel |
| P1-06 | P1 | Timeline, Markdown, composer and send; Post |
| P1-07 | P1 | Author edit/delete and tombstones; Post, Pin, FileInfo, Thread |
| P1-08 | P1 | Thread creation/replies and pane; Post, Thread, ThreadMembership |
| P1-09 | P1 | Follow/unfollow even before first reply; ThreadMembership |
| P1-10 | P1 | Followed/Unreads inbox and explicit reads; ThreadMembership |
| P1-11 | P1 | Pin/unpin roots and replies; Pin + post mirror |
| P1-12 | P1 | Pinned pane, jump and empty states; derived shared pins |
| P1-13 | P1 | Multipart upload, picker/drop/paste and limits; FileInfo, Draft |
| P1-14 | P1 | Attachment send/cancel/retry; FileInfo, Draft, Post |
| P1-15 | P1 | File preview/download/channel file search; persisted file references |
| P1-16 | P1 | Message/file search with modifiers and jump; read-only selectors |
| P1-17 | P1 | Emoji picker and reactions; Reaction |
| P1-18 | P1 | Saved message collection; SavedPost |
| P1-19 | P1 | Direct/group conversations; Channel D/G, memberships |
| P1-20 | P1 | Favorite/mute/read/unread; ChannelMember, SidebarCategory |
| P1-21 | P1 | Persistent channel/thread drafts and mentions; Draft, Post, follows |
| P1-22 | P1 | Channel Info and contextual menus; existing commands |
| P1-23 | P1 | Display/notification/availability/status preferences; Preference |
| P1-24 | P1 | Keyboard and responsive parity; existing commands |
| P2-01 | P2 | Custom categories and reorder; SidebarCategory |
| P2-02 | P2 | Richer formatting and Markdown preview; Draft/Post |
| P2-03 | P2 | Recent mentions pane; Post.mentionedUserIds |
| P2-04 | P2 | Forward to channel/conversation; Post.forwardedPostId |
| P2-05 | P2 | Local header bookmarks; Channel.bookmarks |

## Major views and UI patterns

| View | Composition and interactions | Visual references |
|---|---|---|
| Main channel | Dark topbar/team rail/sidebar; white two-line channel header; chronological feed, avatars, attachment cards; bottom composer | `channel_view_thread_rhs_denim.jpg`, `doc_channel-header.png` |
| Thread beside channel | Root context and replies in independently scrolling right pane; Follow/Following and sticky reply input; preserve source channel | `channel_view_thread_rhs_denim.jpg`, `doc_desktop-unfollow-message-thread.jpg` |
| Threads inbox | Sidebar Threads active; roots list at center left, selected discussion to right; Followed/Unreads tabs and read control | `doc_crt-thread-view.jpg` |
| Browse/create channel | Plus menu; browse list/filter/search; create form modal; add-members modal; route into new/joined channel | `doc_add-channels-button.png`, `doc_browse-channels.png`, `doc_add-members-to-a-channel.png`; create form is inferred from documented fields, no exact modal screenshot available |
| Message actions | Compact hover toolbar, right-anchored More menu; inline edit; delete confirmation; shared accessible controls | `doc_message-more.png`, `doc_pin-message-to-channel.png` |
| Pinned messages | Pale gold pinned indication in feed; header pin count; compact right-side post list; Jump and unpin | `doc_pinned-example-channel.png`, `doc_pinned-posts.png`, `doc_pinned-example-rhs.png` |
| Files/composer | Paperclip in composer; staged chips; document card/image preview in sent posts; file pane with type filter | full Denim screenshot, `doc_channel-files-icon.png`, `doc_file-search-filter.png`; staging and preview modal sizes are reconstruction choices |
| Search | Global navy input opens white expanded search; Messages/Files; results pane with source context and jump | `doc_search-messages-expanded.png`, `doc_search-files.png`, `doc_jump-to-message.png` |
| Channel Info/members | Right-pane purpose/header; compact action strip, members/pins/files; member picker dialog | `doc_channel-purpose-info.png`, `doc_add-members-to-a-channel.png` |
| Saved/mentions | Same right-pane pattern; source post cards with jump/un-save | `doc_save-message.png`, search result reference; full saved pane is inferred |
| Settings | White wide modal over darkened shell, vertical left tabs, stacked form sections and Save/Cancel | `search-settings/000002.jpg`; old `search-main/000001.jpg` only demonstrates historical theme choices |
| Narrow/mobile | Full-width selected conversation or pane with back control; sidebar drawer | `mobile_pinned_messages.jpg`, `mobile_search_results.jpg` |

Precision targets are documented in DESIGN. Visual estimates are explicitly separate from verified source behavior. Unsupported plugin/enterprise rows are omitted, not clickable no-ops. Channel rows, result rows and long timelines must scroll rather than be truncated to seed examples.

## Screenshot inventory and provenance

**52 image files** are present: 48 pre-existing references retained, plus 4 re-downloaded directly from current official documentation. Every retained image was visually inspected via contact sheets; the full Denim channel and Threads inbox were also inspected at full image size. Dimensions in the file inventory can be read locally; key source dimensions are in DESIGN and the source manifest.

`screenshots/sources.json` records exact source-page URLs, image URLs, dimensions, SHA-256 and verification date for the four newly verified official files. Other images were already in the target directory; their original acquisition URL is unavailable, so they are visual references rather than independently verified source captures. Do not infer a current release version or exact CSS token values from them. `search-*` results are not automatically primary evidence.

The required local image-search script was run for an additional desktop/thread/upload query. It returned unrelated product photos; those three new results were discarded. Direct official documentation downloads supplied the useful additions. Existing files were preserved. Screenshots are research references, not backgrounds to embed as UI.

| File relative to `screenshots/` | Observed content and intended use |
|---|---|
| `channel_view_thread_rhs_denim.jpg` | High-resolution full app, navy rail/sidebar, channel, PDF card, right thread with image; primary composition |
| `channel_view_marketing.jpg` | Promotional text beside cropped app; color/density only, do not render promotion |
| `doc_add-channels-button.png` | Sidebar plus menu with create/browse/DM/category entries |
| `doc_add-members-to-a-channel.png` | Add people modal, selected user chip, Cancel/Add |
| `doc_browse-channels.png` | Sidebar plus menu with Browse channels hovered |
| `doc_channel-files-icon.png` | Header file icon and tooltip |
| `doc_channel-header.png` | Very wide thin channel heading/header crop; hierarchy only |
| `doc_channel-heading-categories.png` | Channel dropdown with category submenu |
| `doc_channel-more.png` | Sidebar channel context menu |
| `doc_channel-purpose-info.png` | Channel Info pane with purpose/header and members/pins/files rows |
| `doc_channel-search-filters.png` | Channel filter popover, checkboxes and Apply/reset |
| `doc_crt-following-thread.png` | Reply count, participant stack and Following chip |
| `doc_crt-new-unread-threads.jpg` | Full channel showing unread thread summary emphasis |
| `doc_crt-thread-view.jpg` | Full Threads inbox with followed roots and selected discussion |
| `doc_desktop-unfollow-message-thread.jpg` | Full channel/thread pane and Following control |
| `doc_favorites-list-sidebar.png` | Dark sidebar category and favorite channels |
| `doc_file-search-filter.png` | Dark file results and type-filter menu; apply structure to Denim light pane |
| `doc_forward-message.png` | Dark More menu including Forward and shortcut labels |
| `doc_jump-to-message.png` | Search results with hover Jump action |
| `doc_leave-channels.png` | Channel dropdown including Leave/Archive, red actions |
| `doc_mark-message-as-unread.png` | White More menu with unread row highlighted |
| `doc_message-more.png` | Hover reaction/save/reply/More toolbar crop |
| `doc_pin-message-to-channel.png` | White More menu, Pin to Channel highlighted |
| `doc_pinned-example-channel.png` | Wide pale-gold pinned-message row |
| `doc_pinned-example-rhs.png` | Pinned messages list, compact author/date/content |
| `doc_pinned-posts.png` | Channel header with pin icon/count tooltip |
| `doc_recent-emojis.png` | Wide message with recent reaction shortcuts toolbar |
| `doc_reply-to-message.png` | Reply icon on a bot post toolbar |
| `doc_save-message.png` | Bookmark hover button/tooltip |
| `doc_schedule-a-message.png` | Send split-button and schedule tooltip; excluded behavior |
| `doc_search-files.png` | Expanded search with Files tab and team selector |
| `doc_search-messages-expanded.png` | Expanded Messages search with modifier chips |
| `doc_search-messages.png` | Topbar search input crop |
| `doc_search-modifiers.png` | Message/file modifier suggestion menus |
| `doc_switch-channels.png` | Find Channels quick-switch dialog and results |
| `doc_unpin-message-from-channel.png` | More menu with Unpin from Channel row |
| `doc_write-dm.png` | Direct Messages heading plus button and shortcut tooltip |
| `mobile_pinned_messages.jpg` | Narrow pinned-screen title/back and post row; mobile structure only |
| `mobile_search_results.jpg` | Tall dark mobile results with highlighted matches; reduced layout only |
| `product_switcher_menu.jpg` | Product switcher with Channels/Boards/Playbooks; only Channels functional in scope |
| `web_welcome_onboarding.jpg` | Historical first-run page; excluded from startup |
| `search-compose/000001.jpg` | Tall channel screenshot with document cards/composer; supporting density reference |
| `search-compose/000002.jpg` | Duplicate full Denim channel/thread reference |
| `search-main/000001.jpg` | Historical aubergine preferences/theme picker; not target palette |
| `search-main/000002.jpg` | Duplicate marketing channel image; secondary only |
| `search-main/000003.jpg` | Historical welcome/onboarding; excluded flow |
| `search-settings/000001.jpg` | System Console configuration crop; outside scope |
| `search-settings/000002.jpg` | White Display Settings modal over darkened shell; supporting modal reference |
| `verified-official/add-channels-button.png` | Official re-download of plus/create/browse menu; exact source in manifest |
| `verified-official/pin-message-to-channel-3ad9efe87bbf2e79195b9e0256f28f74.png` | Official re-download of pin action menu |
| `verified-official/pinned-example-rhs-b9d1d6eab349fd091f77a1110ef3ceff.png` | Official re-download of pinned pane list |
| `verified-official/unpin-message-from-channel-ccd56d0ee72122444b89d072ca53279e.png` | Official re-download of unpin action menu |

## Data and runtime implementation notes

There are 16 record types: Team, User, TeamMember, Channel, ChannelMember, Post, Thread, ThreadMembership, Pin, FileInfo, Draft, Reaction, SavedPost, SidebarCategory, Preference, ActivityLog. Twenty top-level keys include these arrays plus version and context. Foreign keys remain stable when names change; shared pins, personal saves and per-user thread follows have separate records. [data_model.md](data_model.md) is the complete typed specification.

Use fixed ids and realistic English data: 32 users, 40 public/private channels plus 16 conversations, 360 posts, 44 tracked threads, 28 active pins, 36 posted files plus staged/cancelled cases. Small control collections need no artificial volume. Actual file fixtures are part of implementation, with exact byte counts. Default state is coherent but every view must also handle injected empty/single/large worlds.

The root Harbor contract takes precedence over the generic plan example: use both templates unchanged, await load before route render, keep `/go` as JSON, persist whole state once per actual user command, and never post idle updates. Local multipart `/upload` and `/files` are required despite the generic exclusion of uploads to real servers. All runtime assets remain offline/local. No React `/go` route, remote avatar/font dependency or hidden auto-seed repair is permitted.

Exact action→record mapping is in SCHEMA and the TODO coverage table. Browser acceptance must inspect `/go` before/after and after reload for channels/threads/pins/files, including actors, timestamps and linked ids. `TEST.md` and runtime certification are implementation-stage outputs and have not been fabricated in this research handoff.

## Exclusions and open visual limits

No auth/onboarding/logout, real calls, bots/AI, Boards/Playbooks, real notifications, invitation sends, payment/admin or production permission configuration. No background scheduled message/reminder jobs. These exclusions keep the sandbox local and satisfy the SEED/Harbor scope.

No first-party desktop screenshot was available for every modal. Create-channel form, staged upload chips, file-preview fallback and full Saved pane are specified reconstructions using documented actions and inspected shared component patterns. Color/spacing tokens in DESIGN are visual estimates. These limits do not block implementation or require access to a signed-in account.
