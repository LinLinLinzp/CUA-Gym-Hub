# Yahoo Mail — Research and Implementation Handoff

Researched 2026-11-18. Target directory: `websites/yahoo_mail_mock`; port **5300**. Canonical implementation checklist: [../TODO.md](../TODO.md). State contract: [data_model.md](data_model.md). Design: [../DESIGN.md](../DESIGN.md). This is a planning deliverable; runtime/browser acceptance remains assigned to dev/playwright.

## Product, scope and personas

Yahoo Mail is a personal webmail workspace combining inbox triage, message composition, folder organization, rule-based routing, files and an address book. The default persona is Megan Brooks, a Brightlane designer managing work launches alongside family, renovation, bills and a Lisbon trip. Tasks should have concrete, distinguishable recipients, subjects and files, allowing agents to practice multi-step work and recover from mistakes.

Primary training journeys: read and organize incoming mail; find an invoice; create a folder and move mail; create/reorder a filter and demonstrate routing with a self-addressed message; reply to a colleague with the correct recipients; forward an attached document; add a sender, update their address and email a contact list. An injected task may replace the entire default world, so no workflow may depend on Megan's seed ids.

The visual target is the **New Yahoo Mail desktop family**, documented by Yahoo's June 2024 announcement and retained in later references. The inherited file names saying “2025” identify the reference set, not a verified launch date. Build one coherent light interface, using the official screenshot as visual authority, with an expanded folder sidebar by default for training discoverability. Native mobile, classic/basic variants, account connection and paid features are outside scope.

## Primary research and decisions

| Source | Findings used / limits |
|---|---|
| [Yahoo desktop redesign announcement, 2024-06-11](https://unified.www.yahooinc.com/press/yahoo-mail-redesigns-the-inbox-for-a-cleaner-smarter-and-simpler-experience) | Official visual anchor: pale canvas, rounded content cards, category navigation, starred/contacts panel, richer message rows and summary cards. Local official artwork has known provenance in `screenshots/official/sources.json`. Marketing browser frame/purple backdrop are outside the actual app. |
| [New Yahoo Mail filters](https://help.yahoo.com/kb/SLN36699.html) | Incoming-mail rules have a 500-rule limit and ordered precedence. The newer navigation uses left More → Settings. Offline self-delivery is our sandbox mechanism for demonstrating application, not an additional Yahoo toolbar control. |
| [New Yahoo Mail folders](https://help.yahoo.com/kb/new-yahoo-mail/article-renaming-folders-sln36725.html) | Folder search and inline Add/Update controls; nested folders; deletion blocked when messages or children remain. Prefer this current behavior to the older modal-only references. |
| [New Yahoo Mail contacts](https://help.yahoo.com/kb/add-edit-delete-contacts-yahoo-mail-sln36695.html) | Address-book panel and sender-card entry points, editing and confirmed deletion. Same data powers compose autocomplete and list expansion. |
| [New Yahoo Mail attachments](https://help.yahoo.com/kb/new-yahoo-mail/attach-insert-files-emojis-yahoo-mail-sln36719.html), [message size](https://help.yahoo.com/kb/SLN5673.html) | Computer and recent-mail attachment entry points; aggregate limit of 25 MB. The mock uses 25,000,000 bytes consistently. Files use Harbor's local upload/download endpoints. |
| [New Yahoo Mail search](https://en-global.help.yahoo.com/kb/SLN36721.html) | Sender shortcut plus advanced From/To/Subject/Keyword/date/scope/attachment refinements. Search form conditions are combined consistently in the mock. |
| [Yahoo keyboard shortcuts](https://help.yahoo.com/kb/new-yahoo-mail/navigate-compose-send-email-keyboard-shortcuts-yahoo-mail-sln3579.html) | Yahoo-style N/R/A/F/K/L/E/D actions and search focus. Implement only the subset in TODO, with text-input safeguards. |
| [Yahoo developer access](https://senders.yahooinc.com/developer/developer-access/) | Public developer guidance describes standard mail/contact interfaces rather than an open proprietary browser-state schema. Our JSON model is an original sandbox design inferred from visible workflows; it is not an asserted Yahoo API contract. |
| [Yahoo Mail overview](https://en.wikipedia.org/wiki/Yahoo_Mail) | Broad product/history cross-check; no technical implementation decisions depend on third-party API claims. |

Search covered feature overview, desktop screenshots, walkthroughs, shortcuts, desktop/mobile differences and schema hints. Yahoo Help returned HTTP 429 for some direct opens; the indexed article results were readable and used, with URLs retained above. Official press text and artwork were readable. No signed-in mailbox, personal email or live account was accessed.

## Feature inventory (23 groups)

| # | Priority | Group | Implementation reference / persistent records |
|---|---|---|---|
| 1 | P0 | Shell, brand, local fonts, sidebar and side panel | TODO P0-01,05; `settings` toggles |
| 2 | P0 | Session bootstrap, store and state API | P0-02,03,04,06; ten-key baseline, user-action saves |
| 3 | P0 | Seed, offline files and verifier documentation | P0-07,08; deterministic entities, SCHEMA/TEST |
| 4 | P1 | Inbox/categories/thread reading | P1-01; message read records |
| 5 | P1 | Read/star/bulk selection/Starred panel | P1-02; message flags and activity |
| 6 | P1 | Move/archive/trash/spam/restore/undo | P1-03; per-id folder transitions |
| 7 | P1 | Searchable folders, nesting and CRUD | P1-04; folder entities and linked filter updates |
| 8 | P1 | Search, advanced criteria and sorting | P1-05; transient query, explicit saved sort |
| 9 | P1 | Compose and draft lifecycle | P1-06; drafts, recipient arrays, body and activity |
| 10 | P1 | Send and self-delivery | P1-07,12; Sent and received-copy links |
| 11 | P1 | Reply / Reply all | P1-08; recipients, source links and repliedAt |
| 12 | P1 | Forward | P1-09; new conversation and attachment provenance |
| 13 | P1 | Attach/remove/reuse files | P1-10; embedded attachment metadata and activity |
| 14 | P1 | Attachment Views/preview/download | P1-11; file request records linked to owning mail |
| 15 | P1 | Filter CRUD/order/application | P1-12; rules, destinations, filter.apply |
| 16 | P1 | Contacts CRUD/from sender/favorites/lists | P1-13–15; contacts, memberships and draft expansion |
| 17 | P1 | Appearance/writing/viewing preferences | P1-16; settings plus activity |
| 18 | P1 | Accessibility, shortcuts, errors/empty states | P1-17; equivalent underlying business actions |
| 19 | P2 | Sender blocking | P2-01; blocked list and moved message ids |
| 20 | P2 | Subscription management | P2-02; unsubscribe records |
| 21 | P2 | Order/travel metadata Views | P2-03; read-only card metadata |
| 22 | P2 | Vacation response configuration | P2-04; settings only |
| 23 | P2 | Dark/responsive polish, summaries/help | P2-05,06; explicit preferences or read-only overlays |

## Major view layouts and behavior

- **Inbox**: fixed header over a canvas; left navigation, flexible white message card and 320px side card. Category tabs sit at the top of Inbox. Priority uses two-line rows with sender above summary/snippet and optional thumbnail; All/category/folder lists favor denser scan-friendly single-line rows. Checkbox, star and hover actions do not trigger row navigation. Empty collections retain a useful shell with Compose.
- **Reading**: subject/title and Back above sender headers; recipients expand without a page transition; message bodies stack chronologically within a conversation, with individual attachments and Reply/Reply all/Forward at the bottom. Default opens in the main card; right/bottom split layouts are preferences. Preserve mailbox context for Back, next and previous. Unknown optional HTML is sanitized and remote resources remain blocked.
- **Compose**: a white main-area editor retains the navigation frame, with From/To/Cc/Bcc rows, Subject and generous body space. Recipient chips use matching contacts; lists expand to explicit people. Formatting and files sit near Send at bottom. Upload is a local user action; drafts persist on each edit without a later idle callback.
- **Folders**: expanded tree or Folders panel, with search, indent guides and row overflow actions. New Folder and Rename use inline inputs with Add/Update and Cancel; subfolder creation retains the chosen parent. A folder with content/children cannot be deleted.
- **Filters**: full settings view: left settings menu, middle ordered list/count/actions, right editor with expandable rule sections and destination selector or folder-name input. Render a clear no-filter empty state, not seeded fallback rows. Save commits one atomic update; cancel never applies changes.
- **Files**: Attachments/Photos/Documents Views show local tiles or rows, sender/date and ownership links. Image/PDF preview is a centered modal with metadata and actual download action; office formats use metadata plus download, without pretending to render them. The recent-file picker uses these same records.
- **Contacts**: right panel All/Favorites/Lists, search and overflow; detail replaces the panel's list. Full Contacts route reuses list/detail/edit forms in a wider two-column arrangement. Sender cards lead here. Multiple email/phone rows and email-only contacts are supported. Removing a contact also cleans list ids.
- **Settings**: gear opens quick preferences; More settings leads to the full view and Back to Inbox. More → Settings in the sidebar is a second entry. No authentication, upsell or account-link flow is functional. Forms show explicit saved changes.

## Screenshot catalogue and visual interpretation

**38 image files total** (36 static images + two GIFs; includes duplicates). All were inspected as labelled contact sheets; the main official layout and filter-editor reference were also inspected at full size. Use the curated images, not every search hit indiscriminately. Dimensions are recorded in `screenshots/manifest.json`.

| Local reference | Use / observed structure |
|---|---|
| `official/desktop-overview.jpeg` | Primary shell/layout authority: rounded search, compact nav rail, central category card, black “mail” suffix in wordmark, right Starred/Contacts list; real app excludes outer purple marketing background. |
| `official/starred-panel.png` | Detailed right-panel tabs, yellow stars and stacked subject/sender/date typography. |
| `official/message-summary.gif` + `message-summary-frame.png` | Reading hierarchy: subject, top summary card, sender/body, right panel. The enlarged purple-bordered floating card is an explanatory marketing overlay, not an in-app modal to reproduce. |
| `official/quick-actions.gif` + `quick-actions-frame.png` | Rich Priority rows with two text lines and contextual pills/thumbs. Copy-code/calendar actions are secondary visual references, not mandatory new workflows. |
| `01_inbox_2025_old_vs_new_KEY.png` | Side-by-side classic/new comparison; right half only is a shell reference. Too small for exact token measurement. |
| `02_inbox_2025_primary_tab_starred_panel.jpg` | Cropped laptop showing Priority-style inbox and side panel, consistent with official source. No laptop/bezel should enter the app. |
| `03_left_nav_2025_more_new_folder_dialog.jpg` | More menu, Attachments/Orders entry points, Folders and rounded Create dialog. Use color/radius cues; current folder Help supersedes its dialog-only creation path. Watermarks/highlight annotations are not UI. |
| `04_inbox_list_folders_views_toolbar.jpg` | Classic dense rows and selection toolbar with left hierarchy/right tools. Structural fallback only; do not copy purple topbar or ads. |
| `05_message_read_attachment_inline_reply.jpg` | Classic message header, attachment chip and bottom inline reply/editor; adapt in new palette. |
| `06_compose_full_page_views_sidebar.jpg` | Large blank main editor, From/To/Subject, bottom Send/formatting/file controls; orange background is classic theming, not target. |
| `07_compose_with_contacts_lists_panel.jpg` | Compose next to contact-list member panel with email-list/edit-list controls. |
| `08_settings_filters_new_filter_hires.jpg` | Best filter form anatomy: three columns, middle list and up/down/delete, name, collapsible From/To-Cc/Subject/Body, destination/create-folder and Save/Cancel. |
| `09_settings_filters_edit_filter.jpg` | Selected filter row and deletion control; same editor structure. |
| `10_settings_filters_empty.jpg` | Empty filter illustration/helper layout and Add affordance. Generate a local simple illustration if useful. |
| `11_settings_writing_email_signature.jpg` | Signature toggle/editor and default font controls. |
| `12_settings_contacts.jpg` | Legacy contacts-import/settings structure; real provider imports are out of scope. |
| `13_contact_details_panel_edit_delete.jpg` | Right contact detail with name/avatar, overflow Edit/Delete, email and history area. |
| `14_sort_menu.jpg` | Anchored sort popup with selected-item tick and date/unread/starred ordering choices. |
| `15_quick_settings_theme_layout_panel.jpg` | Theme swatches, light/dark, list spacing/layout, More settings link; new palette only. |
| `16_message_blocked_images_reply_links.jpg` | Reading banner for blocked images, single message body, reply links and bottom editor. No actual remote image request. |
| `17_inbox_folder_context_menu.jpg` | Folder-hover overflow menu, mark-read operation; functional cues only. |
| `18_contacts_full_page_list_detail.jpg` | Legacy wider contact list/detail proportions; full-page fallback layout, not topbar styling. |
| `inbox/000001.jpg` | Duplicate-style classic list/sort reference. |
| `inbox/000002.jpg` | Duplicate filter-editor reference. |
| `inbox/000003.jpg` | Very old Yahoo top navigation crop; not the visual target. |
| `inbox/000004.jpg` | Classic multi-account dropdown; account connection is excluded. |
| `research-compose/000001.jpg` | Compose with bottom formatting strip; duplicate-style fallback. |
| `research-filters/000001.jpg` | Classic quick-settings popover and More settings entry. |
| `research-inbox/000001.jpg` | App Store/mobile search result, not a desktop-mail reference; do not use for implementation. |
| `settings-compose/000001.jpg` | Duplicate quick-settings popover. |
| `settings-compose/000002.jpg` | Duplicate selected-filter/delete reference. |
| `settings-compose/000003.jpg` | Duplicate empty-filter reference. |
| `settings-compose/000004.jpg` | Classic inbox with settings icon highlighted. |
| `research-current/000001.jpg` | Newly downloaded classic full-page compose (same layout as 06); usable only for compose geometry. |
| `research-current/000002.jpg` | Newly downloaded old Contacts settings/import view; secondary reference only, imports omitted. |
| `research-current/000003.jpg` | Newly downloaded classic compose/Compose-button walkthrough (same family as research-compose). |

The existing non-official images have no reliable source metadata in the inherited folder. Their annotations suggest walkthrough screenshots, and several are watermarked; do not invent original URLs/dates. Retain them as structural evidence, never ship them as runtime images. The three new image-search download URLs and official provenance are in the manifest. The query returned older compose/contact screens rather than a new-version editor, so those views use verified functional behavior re-skinned with the official visual system. CSS token values are implementation estimates, not certified pixel samples.

## Data model and observable workflows

Ten top-level keys: `currentUser`, `folders`, `messages`, `contacts`, `contactLists`, `filters`, `blockedAddresses`, `unsubscribes`, `settings`, `activityLog`. Messages embed attachments; conversation ids relate individual emails without duplicate thread objects; filter actions point to folders; contact lists point to contact ids; new sent replies/forwards link to their source messages; self-delivery links received copy to the Sent id.

Seed volume: 160 messages, 30 folders, 48 contacts, 24 lists, 24 filters and at least 48 attachments. Smaller secondary arrays (blocked/unsubscribe) represent realistic prior actions, not main searchable entities. Fixed ids and dates make injected/replayed tasks deterministic. Newly user-created records use fresh ids and current ISO timestamps.

User changes update primary records and append structured activity together. Preview/download are represented by events linking attachment and message ids. Search, selection, open menus and counts are transient/derived. Nothing writes on idle, including delayed mark-read or draft timers. The standard middleware's baseline and full-state save behavior override generic plan examples for Go.jsx, custom session stores or an app-only localStorage implementation.

## Exclusions and implementation confidence

High confidence: required workflow behavior from current Yahoo Help; new desktop shell from official artwork; Harbor session/state semantics from repository contract. Design estimates: exact pixel tokens and modern compose/filter/contact editor styling where only classic screenshots exist. Sandbox-specific choices: self-send delivery, append-only structured activity, selected route shapes, full-page Contacts fallback and alias/recipient handling needed for observable training tasks.

Skip login/logout/passwords/OAuth, real network delivery, provider imports, remote services, real subscriptions/billing, external tracking/calendar and live AI. These cannot operate offline and do not improve the six required workflows. The local Harbor API is the sole runtime service. Handoff acceptance requires actual build, dynamic certification and playwright state evidence; these have not been run by the plan agent.
