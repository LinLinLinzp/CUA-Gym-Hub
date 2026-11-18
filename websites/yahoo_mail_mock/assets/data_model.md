# Yahoo Mail Mock — Data Model

Source of truth for `src/data/seed.js` (`createInitialData()`), the store, and `SCHEMA.md`.
All state is a single JSON-serialisable object (no Dates, Maps, functions). APP key for
`loadState/saveState`: `'yahoo_mail'`.

**Robustness rule (HARBOR_CONTRACT §2):** every reader must tolerate injected state with empty arrays,
one record, hundreds of records and missing optional fields. Always read with defaults:
`(state.messages || [])`, `msg.to || []`, `msg.attachments || []`, `contact.emails || []`, `settings?.signature?.enabled`.
Unknown `folderId` → preserve the id and expose the record through All mail/search with an ‘Unknown folder’ label; do not silently relabel it Inbox. Unknown category → render in All, with a neutral category label. Missing optional arrays read as `[]`; never inject example records to fill an empty injected array.

## Top-level keys

| Key | Type | Purpose |
|-----|------|---------|
| `currentUser` | object | Signed-in account (pre-logged-in) |
| `folders` | array | System + user folders (incl. subfolders) |
| `messages` | array | Every email: received, sent, drafts, spam, trash, archived |
| `contacts` | array | Address book |
| `contactLists` | array | Contact lists (groups) |
| `filters` | array | Ordered mail filters (index 0 = highest priority) |
| `blockedAddresses` | array | Blocked senders |
| `unsubscribes` | array | Unsubscribe actions taken |
| `settings` | object | All preferences |
| `activityLog` | array | Append-only structured log of user business actions |

Ids are strings with fixed prefixes. New ids: `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`.
Timestamps: ISO strings from `new Date().toISOString()`.

---

## §currentUser

```js
currentUser: {
  id: 'usr_megan',
  name: 'Megan Brooks',
  firstName: 'Megan',
  email: 'megan.brooks@yahoo.com',
  aliases: ['mbrooks.design@yahoo.com'],        // extra "From" options in compose
  avatarColor: '#7E57C2',
  storage: { usedBytes: 1288490188, totalBytes: 21474836480 }   // "1.2 GB of 20 GB used" (display only)
}
```

## §Folders

```js
{ id: 'inbox', name: 'Inbox', type: 'system', parentId: null, order: 0, createdAt: '2019-04-02T15:00:00.000Z' }
```

| Field | Type | Notes |
|-------|------|-------|
| id | string | System ids are fixed: `inbox`, `draft`, `sent`, `archive`, `spam`, `trash`. User folders: `fld_*` |
| name | string | Display name. System names: Inbox, Drafts, Sent, Archive, Spam, Trash |
| type | `'system' \| 'user'` | System folders cannot be renamed/deleted |
| parentId | string \| null | For subfolders (user folders only) |
| order | number | Sort order among siblings (user folders sort alphabetically by name in UI; `order` is fallback) |
| createdAt | ISO | |
| updatedAt | ISO? | set on rename |

Virtual (non-stored) mailboxes: **Unread** (received messages outside trash/spam/draft with `isRead=false`), **Starred**
(`isStarred=true`, not trash/spam), and Views (Attachments/Photos/Documents, Orders, Travel, Subscriptions)
are computed at render time — never stored as folders.

Counts: Inbox / user folders show **unread** count; Drafts shows **total** count; Spam shows total count; Trash shows nothing.

## §Messages

One record per email (a conversation is the set of messages sharing `conversationId`).

```js
{
  id: 'msg_0007',
  conversationId: 'cnv_0004',
  folderId: 'inbox',
  previousFolderId: null,              // set when moved to trash/spam/archive so "Restore"/"Not spam" can return it
  category: 'primary',                 // 'primary' | 'offers' | 'social' | 'newsletters' (inbox tabs)
  from: { name: 'Daniel Okafor', email: 'daniel.okafor@brightlane.io' },
  to: [{ name: 'Megan Brooks', email: 'megan.brooks@yahoo.com' }],
  cc: [{ name: 'Priya Raman', email: 'priya.raman@brightlane.io' }],
  bcc: [],
  replyTo: null,
  subject: 'Q2 launch plan — final review Thursday',
  snippet: 'Hi Megan, attached is the final deck for Thursday…',   // first ~140 chars of body, whitespace collapsed
  body: 'Hi Megan,\n\nAttached is the final deck…\n\nThanks,\nDaniel',  // plain text, \n line breaks
  bodyHtml: null,                      // optional: compose produces simple HTML (b/i/u/a/ul/ol/br/p) — sanitise on render
  date: '2026-03-16T08:47:00-07:00',   // received/sent time (ISO)
  isRead: false,
  isStarred: true,
  isDraft: false,
  status: 'received',                  // 'received' | 'sent' | 'draft'
  attachments: [ /* §Attachment */ ],
  hasImages: false,                    // remote images blocked banner (display only)
  listUnsubscribe: false,              // true → show "Unsubscribe" button at top of message
  summary: null,                       // optional AI summary text (P2 display)
  orderInfo: null,                     // optional { merchant, orderNumber, total: '84.97', currency:'USD', status:'Shipped', trackingNumber } → Orders view
  travelInfo: null,                    // optional { type:'flight'|'hotel', provider, confirmation, departAt, from, to } → Travel view
  inReplyToId: null,                   // reply: id of message replied to
  forwardedFromId: null,               // forward: id of original message
  replyType: null,                     // 'reply' | 'replyAll' | 'forward' (on the new sent/draft message)
  repliedAt: null,                     // set on ORIGINAL when user sends a reply  (→ reply arrow icon in list)
  forwardedAt: null,                   // set on ORIGINAL when user sends a forward (→ forward arrow icon in list)
  sentAt: null,                        // set when status becomes 'sent'
  movedAt: null,                       // last move time
  appliedFilterId: null,               // set when a filter routed this message (self-sent copy or seed)
  createdAt: '2026-03-16T08:47:00-07:00',
  updatedAt: null
}
```

### §Attachment (embedded in `message.attachments`)

```js
{
  id: 'att_0003',
  name: 'Q2_Launch_Deck_v7.pdf',
  size: 2483011,                       // bytes (number). Display "2.4 MB" / "245 KB"
  mimeType: 'application/pdf',
  kind: 'document',                    // 'image' | 'document' | 'other' (drives Photos vs Documents view)
  url: '/attachments/Q2_Launch_Deck_v7.pdf',   // seed: file under public/attachments/; upload: url from POST /upload
  source: 'seed',                      // 'seed' | 'upload' | 'forward'
  sourceMessageId: null,               // for forwarded attachments: original message id
  sourceAttachmentId: null,            // for forwarded attachments: original attachment id
  uploadedAt: null                     // ISO for 'upload'
}
```

Seed attachments must exist locally: generate tiny valid files in `public/attachments/` (minimal PDF text, small
PNG/JPG/SVG images drawn locally, a CSV, and valid minimal DOCX/XLSX ZIP packages). Do not rename empty or plain-text files to office formats. Image thumbnails render from these local files. **No remote URLs.**

### Message state machine
- Delete from any folder except Trash → `folderId:'trash'`, `previousFolderId:<old>`.
- Delete in Trash / "Empty Trash" → record removed from `messages` (log `message.delete_forever` with ids & subjects).
- Spam → `folderId:'spam'`, `previousFolderId`; "Not spam" → back to `previousFolderId || 'inbox'`.
- Archive → `folderId:'archive'`; "Move to Inbox" (Shift+E / Restore) → `inbox`.
- Draft lifecycle: compose creates `{status:'draft', isDraft:true, folderId:'draft'}` on first keystroke
  (save synchronously in the input event/store action; never debounce into an idle write); Send → same record becomes
  `{status:'sent', isDraft:false, folderId:'sent', sentAt, date: sentAt, isRead:true}`; Discard → record removed.

## §Contacts

```js
{
  id: 'ct_0001',
  firstName: 'Daniel',
  lastName: 'Okafor',
  nickname: '',
  emails: [{ type: 'work', address: 'daniel.okafor@brightlane.io' }],   // type: 'personal'|'work'|'other'
  phones: [{ type: 'mobile', number: '+1 (415) 555-0142' }],             // type: 'mobile'|'home'|'work'|'other'
  company: 'Brightlane',
  jobTitle: 'Product Marketing Lead',
  addresses: [{ type: 'work', street: '500 Howard St', city: 'San Francisco', state: 'CA', zip: '94105', country: 'United States' }],
  birthday: '1988-07-14',              // 'YYYY-MM-DD' or ''
  website: '',
  notes: 'Owns launch comms.',
  isFavorite: true,
  avatarColor: '#5B8DB8',
  source: 'manual',                    // 'manual' | 'added_from_message'
  createdAt: '2024-11-02T17:20:00.000Z',
  updatedAt: null
}
```
Display name = `${firstName} ${lastName}`.trim() || first email address.
Primary email = `emails[0].address`.

## §ContactLists

```js
{ id: 'cl_0001', name: 'Brightlane Launch Team', contactIds: ['ct_0001','ct_0002','ct_0005'], createdAt: '2025-12-01T10:00:00.000Z', updatedAt: null }
```
Typing a list name in To/CC autocompletes the list; choosing it expands into one chip per member email.
Deleting a contact removes its id from every list.

## §Filters

Ordered array; index 0 = top priority (UI "Filters are listed by priority"; up/down arrows reorder).

```js
{
  id: 'flt_0001',
  name: 'Brightlane work',
  rules: {
    from:    { operator: 'contains', value: '@brightlane.io', matchCase: false },  // or null when unused
    toCc:    null,
    subject: null,
    body:    null
  },
  action: { type: 'move', folderId: 'fld_work' },   // destination; 'trash' is allowed
  createdAt: '2025-06-10T16:00:00.000Z',
  updatedAt: null
}
```
`operator` ∈ `'contains' | 'does not contain' | 'begins with' | 'ends with'`. All non-null rules must match (AND).
Rule target text: `from` → `from.name + ' ' + from.email`; `toCc` → all to+cc names/emails;
`subject`; `body` (plain text). Case-insensitive unless `matchCase`.
Description line in list (as real product): `Deliver to "Work" if From contains "@brightlane.io"`.
Max 500 filters (show "N of 500 used").

**Where filters apply in the mock (filters only act on *new incoming* mail, like the real product):**
when the user sends a message whose To/CC/BCC includes `currentUser.email` or an alias, an incoming copy is created
(`status:'received'`, `folderId:'inbox'`, `isRead:false`, new id, same conversationId); the filters run top-down on it,
first match sets `folderId = action.folderId` and `appliedFilterId = filter.id`. Blocked senders never apply here.

## §BlockedAddresses

```js
{ id: 'blk_0001', email: 'deals@shopnowdaily.biz', createdAt: '2025-08-03T12:00:00.000Z', source: 'settings' }  // source: 'settings'|'message'
```
Blocking from a message also moves all messages from that address to Trash (log the moved ids).

## §Unsubscribes

```js
{ id: 'uns_0001', senderEmail: 'news@thedailyhike.com', senderName: 'The Daily Hike', messageId: 'msg_0031', createdAt: '…' }
```

## §Settings

```js
settings: {
  appearance: { theme: 'light', themeColor: 'purple', density: 'comfortable', messageLayout: 'list' },
      // theme 'light'|'dark'|'auto'; density 'spacious'|'comfortable'|'compact'; messageLayout 'list'|'right'|'bottom'
  inbox: { categoriesEnabled: true, defaultCategory: 'primary', showUnreadCount: true, sort: 'date_desc' },
      // sort 'date_desc'|'date_asc'|'unread'|'starred'|'sender'
  viewing: { conversations: true, showImages: 'ask', markAsRead: 'immediately', afterMove: 'next' },
      // showImages 'always'|'ask'|'never'; markAsRead 'immediately'|'never' (omit timer-based read delays); afterMove 'next'|'previous'|'list'
  writing: {
    signature: { enabled: true, text: 'Megan Brooks\nSenior Product Designer · Brightlane\n(415) 555-0199' },
    defaultFont: 'sans-serif', defaultFontSize: 'medium',
    defaultFrom: 'megan.brooks@yahoo.com', sendWithCtrlEnter: true, linkPreviews: true
  },
  vacationResponse: { enabled: false, startDate: '', endDate: '', subject: '', message: '', onlyContacts: false, updatedAt: null },
  notifications: { browser: false, sound: false },
  ai: { messageSummaries: true },
  keyboardShortcuts: true,
  rightPanel: { open: true, tab: 'starred' },     // UI preference — persisted when user toggles
  sidebar: { compact: false, viewsExpanded: true, foldersExpanded: true, moreExpanded: false }
}
```

## §ActivityLog (verifier-friendly, append-only)

```js
{ id: 'act_…', type: 'message.move', actor: 'megan.brooks@yahoo.com', createdAt: '…',
  messageIds: ['msg_0007'], folderIds: ['inbox','fld_work'], filterIds: [], contactIds: [], listIds: [],
  details: { changes: [{messageId:'msg_0007',fromFolderId:'inbox',toFolderId:'fld_work',previousFolderIdBefore:null}] } }
```
`type` values (one entry per user action, even bulk): `message.send`, `message.reply`, `message.reply_all`,
`message.forward`, `draft.save` (each explicit draft edit), `draft.discard`, `message.move`, `message.archive`,
`message.delete`, `message.delete_forever`, `message.spam`, `message.not_spam`, `message.restore`,
`message.read`, `message.unread`, `message.star`, `message.unstar`, `folder.create`, `folder.rename`,
`folder.delete`, `folder.mark_all_read`, `folder.empty`, `filter.create`, `filter.update`, `filter.delete`,
`filter.reorder`, `contact.create`, `contact.update`, `contact.delete`, `contact.favorite`, `list.create`,
`list.update`, `list.delete`, `sender.block`, `sender.unblock`, `sender.unsubscribe`,
`attachment.upload`, `attachment.preview`, `attachment.download`, `attachment.remove`, `attachment.reuse`, `filter.apply`, `settings.update` (details: {section, changed:{…}}),
`message.undo` (details: {undoneActivityId}).
Seed `activityLog: []`. Records are supplementary — the primary truth is always the entity fields.

---

## Seed composition (`createInitialData()`)

Newest seed message: **2026-03-16T08:47:00-07:00**. Use fixed ISO strings spread from 2025-11-20 to that anchor. This is a seed-data date, not a promise about the task's clock. Compute relative date headings against `new Date()`; tasks may freeze a different clock. Older dates use calendar month/year headings.
English, realistic, US-based persona. All ids fixed (`msg_0001…`, `ct_0001…`).

**Persona**: Megan Brooks, Senior Product Designer at **Brightlane** (SaaS company), lives in Oakland, CA.
Personal life: sister Hannah, book club, running club, planning a May trip to Lisbon, home renovation.

### Folders (30 total: 6 system + 24 user)
System: `inbox, draft, sent, archive, spam, trash`.
User: `fld_work` "Work", `fld_q2launch` "Q2 Launch" (parentId `fld_work`), `fld_receipts` "Receipts",
`fld_travel` "Travel", `fld_family` "Family", `fld_bills` "Bills", `fld_bookclub` "Book Club".
Add 17 fixed user folders: `fld_clients` Clients, `fld_research` Research, `fld_design` Design Reviews, `fld_finance` Finance, `fld_events` Events, `fld_hiring` Hiring, `fld_learning` Learning, `fld_health` Health, `fld_home` Home Renovation, `fld_insurance` Insurance, `fld_running` Running Club, `fld_schools` School Updates, `fld_taxes` Taxes, `fld_volunteer` Volunteering, `fld_warranties` Warranties, `fld_recipes` Recipes, `fld_music` Music. Research and Design Reviews are children of Work; Warranties is a child of Home Renovation.

### Messages — 160 records, including ≥ 35 conversations of 2–5 messages
| Folder | Count | Must include |
|--------|-------|-------------|
| inbox / primary | 34 | 12 unread; 6 starred; 8 with attachments (PDF, DOCX, XLSX, PNG, JPG); 5 multi-message conversations incl. one 5-message thread "Q2 launch plan — final review Thursday" with Megan's own replies in Sent; Hannah family threads; landlord/contractor quote with PDF; doctor appointment; book club |
| inbox / offers | 10 | Retail promos (Target, REI, Sephora-style invented brands OK: "Northfield Outfitters", "Lumen Home"), 4 unread, 2 with `listUnsubscribe:true` |
| inbox / social | 6 | LinkedIn-style "Riverline" notifications, Nextdoor-style "Neighborly", running club Strava-like "PaceClub" |
| inbox / newsletters | 9 | "The Daily Hike", "Morning Brew"-style "Market Morning", Figma-style "Design Digest", all `listUnsubscribe:true` |
| sent | 16 | Replies in threads (`inReplyToId` set, `replyType:'reply'`), 2 forwards (`forwardedFromId`), 3 with attachments |
| draft | 4 | One with To filled + attachment, one with empty To, one reply-draft in a thread, one with only subject |
| archive | 9 | Older work + personal; 3 with attachments |
| spam | 6 | Obvious phishing/lottery; one legit-looking mis-flagged newsletter (to test "Not spam") |
| trash | 5 | `previousFolderId` set (inbox ×3, offers inbox, fld_work) |
| fld_work | 6 | `appliedFilterId:'flt_0001'` on 4 |
| fld_q2launch | 4 | 2 with attachments |
| fld_receipts | 6 | `orderInfo` on all (Orders view), 2 PDF invoices |
| fld_travel | 3 | `travelInfo` (flight SFO→LIS May 9, hotel in Lisbon), 1 PDF itinerary |
| fld_family | 3 | photos (2 JPG attachments) |
| fld_bills | 3 | PG&E-style "Bay Power" bill, internet bill, water bill |
| fld_bookclub | 2 | |
| 17 additional user folders above | 34 | Exactly 2 messages each, matching each folder’s purpose; includes 6 more images and 6 more documents |

Additional inbox messages from `currentUser.email` (sent to self) are fine. ≥ 48 attachment records total
(≥ 18 images, ≥ 24 documents) so Photos/Documents views are meaningful.

### Contacts — 48 records
Coworkers at brightlane.io (12), family (5: Hannah Brooks, Mom "Carol Brooks", Dad "Richard Brooks", …),
friends (10), service providers (6: contractor "Luis Ortega – Ortega Remodeling", dentist office, landlord,
running coach…), book club (5), misc (10). 8 favorites. Mix of single/multiple emails, phones, addresses,
birthdays (some empty), 3 with only an email (no name) to test display fallback.

### Contact lists — 24
First four: "Brightlane Launch Team" (6), "Family" (5), "Book Club" (5), "Running Club" (4).
Add 20 named lists of 2–8 existing contacts: Design Review, Product Partners, Research Panel, Client Leads, Finance Team, Event Hosts, Hiring Panel, Learning Circle, Health Providers, Home Project, Insurance Contacts, School Friends, Tax Advisors, Volunteer Crew, Warranty Support, Recipe Swap, Music Friends, Lisbon Trip, Weekend Plans, Neighborhood. Membership overlaps are expected; every contactId must resolve.

### Filters — 24 (ordered)
1. `flt_0001` "Brightlane work" — From contains `@brightlane.io` → `fld_work`
2. `flt_0002` "Receipts" — Subject contains `order` → `fld_receipts`
3. `flt_0003` "Book club" — Subject begins with `[Book Club]` → `fld_bookclub`
4. `flt_0004` "Bills" — From contains `billing@` → `fld_bills`
5. `flt_0005` "Junk promos" — From ends with `.biz` → `trash`
6–22. One specific subject-contains rule per added user folder (same order as folder list above): `[Client]`, `[Research]`, `[Design Review]`, `[Finance]`, `[Event]`, `[Hiring]`, `[Learning]`, `[Health]`, `[Home]`, `[Insurance]`, `[Running]`, `[School]`, `[Tax]`, `[Volunteer]`, `[Warranty]`, `[Recipe]`, `[Music]`. Use fixed ids `flt_0006`–`flt_0022`.
23. `flt_0023` "Lisbon itinerary" — Subject contains `Lisbon` AND Body contains `confirmation` → `fld_travel`.
24. `flt_0024` "Family updates" — From contains `hannah.brooks@` → `fld_family`.
Seed examples matching these rules retain plausible `appliedFilterId` values; rules never retroactively run on boot.

### Blocked addresses — 2
`deals@shopnowdaily.biz`, `winner@lotto-intl-claims.net`.

### Unsubscribes — 1 (`news@coffeeclubmonthly.com`).

---

## Observable State Changes (copy into SCHEMA.md and keep in sync)

| User action | Fields written |
|-------------|----------------|
| Open unread message | `messages[i].isRead=true`, `updatedAt`; log `message.read` |
| Mark read/unread (row hover, toolbar, K / Shift+K) | `isRead`, `updatedAt`; log `message.read`/`message.unread` with `messageIds` |
| Star / unstar | `isStarred`, `updatedAt`; log |
| Move to folder (toolbar Move, hover Move, drag-and-drop, D) | `folderId`, `previousFolderId`, `movedAt`; log `message.move {fromFolderId,toFolderId}` |
| Archive | `folderId:'archive'`, `previousFolderId`, `movedAt`; log `message.archive` |
| Delete | `folderId:'trash'`, `previousFolderId`, `movedAt`; log `message.delete` |
| Delete forever / Empty Trash / Empty Spam | records removed from `messages`; log `message.delete_forever`/`folder.empty` with `messageIds` + `details.subjects` |
| Mark as spam / Not spam | `folderId`, `previousFolderId`; log |
| Restore from Trash | `folderId = previousFolderId||'inbox'`, `previousFolderId:null`; log `message.restore` |
| Undo (toast) | reverts the fields above; log `message.undo` |
| Create folder / subfolder | `folders.push({id,name,type:'user',parentId,createdAt})`; log `folder.create` |
| Rename folder | `folders[i].name`, `updatedAt`; log `folder.rename {details:{oldName,newName}}` |
| Delete folder (must have no messages or child folders) | folder removed; filters pointing to it get `action.folderId:'inbox'`; log |
| Mark all as read (folder menu) | all messages in folder `isRead:true`; log `folder.mark_all_read` |
| Compose → typing | draft message created/updated (`status:'draft'`, `folderId:'draft'`, to/cc/bcc/subject/body/attachments, `updatedAt`) |
| Attach file in compose | `attachments.push({source:'upload',url,size,mimeType,uploadedAt})` on the draft; log `attachment.upload` |
| Remove attachment | attachment removed from draft; log `attachment.remove` |
| Send new message | draft → `status:'sent'`, `folderId:'sent'`, `sentAt`, `date`; log `message.send {details:{to,cc,bcc,subject,attachmentCount}}`; self-addressed → incoming copy + filters |
| Reply / Reply all | new message `status:'sent'`, `inReplyToId`, `replyType`, `conversationId` = original's, subject `Re: …`; original `repliedAt`; log `message.reply`/`message.reply_all` |
| Forward | new message `forwardedFromId`, `replyType:'forward'`, subject `Fwd: …`, attachments copied with `source:'forward'`, `sourceMessageId`, `sourceAttachmentId`; original `forwardedAt`; log `message.forward` |
| Discard draft | draft record removed; log `draft.discard` |
| Preview attachment | log `attachment.preview` with `messageIds:[messageId]`, `details:{attachmentId,name}`; no attachment content mutation |
| Download attachment | log `attachment.download {messageId, details:{attachmentId,name}}` (file served from url) |
| Create / edit filter | `filters` push/update `{name,rules,action,createdAt/updatedAt}`; if "Folder name" typed → also `folders.push`; log |
| Delete filter | filter removed; log `filter.delete {details:{name}}` |
| Reorder filter (↑/↓) | array order changes; log `filter.reorder {details:{filterId, fromIndex, toIndex}}` |
| Add contact / edit / delete | `contacts` push/update/remove (+ removal from `contactLists[].contactIds`); log |
| Add sender to contacts (from message) | `contacts.push({source:'added_from_message'})`; log `contact.create` |
| Favorite contact | `isFavorite`; log `contact.favorite` |
| Create / edit / delete list | `contactLists` push/update/remove; log |
| Block sender / unblock | `blockedAddresses` push/remove; sender's messages → trash; log |
| Unsubscribe | `unsubscribes.push`; log |
| Change any setting | `settings.<section>.<field>`; log `settings.update {details:{section, changed}}` |
| Vacation response save | `settings.vacationResponse.{enabled,startDate,endDate,subject,message,onlyContacts,updatedAt}` |
| Signature save | `settings.writing.signature.{enabled,text}` |


## Canonical implementation decisions (2026-11-18)

These clarify and override ambiguous shorthand above. This is an application-state design, not Yahoo's private API schema.

### Entity ownership and types

- `currentUser` is one object, `settings` is one object; all eight other top-level collections in the table are arrays. `attachments` are embedded in messages, not a top-level collection. `activityLog` starts empty.
- Address = `{name?:string,email:string}`; Email = `{type:string,address:string}`; Phone = `{type:string,number:string}`; PostalAddress = `{type:string,street:string,city:string,state:string,zip:string,country:string}`. Missing optional strings display as empty, never the literal `undefined`.
- `orderInfo` = null or `{merchant:string,orderNumber:string,total:string,currency:string,status:string,trackingNumber?:string}`; `total` is a decimal string with two places, e.g. `'84.97'`. `travelInfo` = null or `{type:'flight'|'hotel',provider:string,confirmation:string,departAt:string,from:string,to:string}`. These are read-only seed metadata.
- Add optional `messages[].receivedCopyOfId:string|null` for self-delivered copies. Add optional `Attachment.reusedFromMessageId:string|null` and `reusedFromAttachmentId:string|null` when attaching from recent mail; extend `source` to `'seed'|'upload'|'forward'|'recent'`.
- `category:'primary'` is the internal value for the visible **Priority** tab. All is the union of inbox categories. All mail (search scope) includes all folders except Drafts/Spam/Trash by default, with an explicit option to include them.
- Seed constructors return the ten top-level keys exactly; optional properties are not required for injected records. Normalize for reading only, never write repaired/default data back to the server on render. IDs from injected records are authoritative.

### Activity record contract

Every business mutation is atomic with its activity entry in the same full-state `saveState`. All log records have `{id:string,type:string,actor:string,createdAt:ISO,messageIds:string[],folderIds:string[],filterIds:string[],contactIds:string[],listIds:string[],details:object}`. Empty id arrays are valid. Actor = currentUser.email (fall back to currentUser.id if email absent). New timestamps come from `new Date().toISOString()`. Optional examples above showing `messageId`, `fromFolderId` or `toFolderId` are shorthand: store message ids in `messageIds`, related folders in `folderIds`, and movement details in `details.changes` as below.

- Moves: `details.changes:[{messageId,fromFolderId,toFolderId,previousFolderIdBefore}]`. Always update affected messages' `updatedAt` and `movedAt`. Permanent deletion logs `details.deletedMessages:[{id,subject,folderId,conversationId}]` before removal. Bulk actions produce one log listing every affected id; exclude unaffected ids.
- Read/star actions: `details.changes:[{messageId,field:'isRead'|'isStarred',before:boolean,after:boolean}]` and affected message ids. Opening an already-read message logs nothing. Toggle controls never propagate a row-open click.
- Folder/filter/contact/list CRUD: relevant id array + `details.before`/`details.after` snapshots of the affected record (null for absent). Filter reorder additionally records `details.fromIndex,toIndex,orderedFilterIds`. Folder deletion resets affected filter destinations to Inbox and lists those filter ids; refuse deletion while children or messages remain.
- Drafts: every user edit records `draft.save` with `messageIds` and `details.changedFields:string[]`, `details.isNew:boolean`; the entity itself holds full recipients, body and attachments. Opening an empty compose creates no message until input. Opening Reply/Forward is an explicit action and creates a populated draft immediately. Closing or navigating after edits retains it; explicit discard removes it with `draft.discard` and the prior record snapshot. No delayed auto-save callbacks.
- Attachment events: `messageIds`, `details:{attachmentId,name,size,mimeType,url}`; remove also records the prior attachment snapshot. Preview/download log only after a user explicitly requests the operation; failed requests create no success record. Reusing a recent attachment creates a new attachment id and logs `attachment.reuse` plus a draft save.
- Send/reply/forward: `messageIds:[sentId]`, `details:{to:Address[],cc:Address[],bcc:Address[],subject,attachmentIds:string[],originalMessageId:string|null,incomingCopyIds:string[]}`. Log exactly one of `message.send`, `message.reply`, `message.reply_all`, `message.forward`, along with optional self-delivery filter events. Replies use `inReplyToId` and original conversationId. A forward starts a new conversationId and uses `forwardedFromId`; original `forwardedAt` changes only upon Send.
- Self-delivery: each send produces at most one incoming copy if any recipient matches currentUser.email/aliases case-insensitively. Copy has new id, `receivedCopyOfId:sentId`, `status:'received'`, `isDraft:false`, `folderId:'inbox'`, `isRead:false`, `sentAt:null`, `date/createdAt:now`, and copied attachments with fresh attachment ids. Keep the sent message in Sent. Apply the first matching filter only to the copy. Add `filter.apply` with `messageIds:[copyId]`, `filterIds:[matchedId]`, `folderIds:[destination]`, `details:{sentMessageId,fromFolderId:'inbox',toFolderId}`. No match leaves `appliedFilterId:null`. Dangling/nonexistent destinations safely route to Inbox; no retroactive, timer-based or autonomous delivery.
- Undo is limited to read/star/move/archive/delete-to-trash/spam/restore actions. Keep the inverse snapshot in transient UI state; pressing Undo restores only those entity fields and appends `message.undo` with `details.undoneActivityId` and the changed ids. Do not truncate historical log entries or undo a permanent deletion/send.
- Settings logs carry `details:{section,changed:{fieldPath:{before,after}}}`. `sender.block` includes newly blocked email, moved message ids and per-message folder transitions; `sender.unblock` never resurrects messages. `sender.unsubscribe` references the new unsubscribe id in details and source message id in messageIds.

### Suggested createInitialData() assembly

```js
export function createInitialData() {
  return {
    currentUser: { /* fixed persona above */ },
    folders: buildFixedFolders(), // 30, ids as above
    messages: buildFixedMessages(), // 160, no Date.now/random for defaults
    contacts: buildFixedContacts(), // 48
    contactLists: buildFixedLists(), // 24, valid contactIds
    filters: buildFixedFilters(), // 24, valid destinations
    blockedAddresses: [/* two fixed records above */],
    unsubscribes: [/* one fixed record above */],
    settings: { /* defaults above */ },
    activityLog: [],
  }
}
```

Helper names here are illustrative; all defaults and timestamps must be deterministic, English, and internally consistent. New user-created ids may be generated at action time. Never persist computed counts, search results, selected ids, hover state, clocks, or duplicated conversation records.
