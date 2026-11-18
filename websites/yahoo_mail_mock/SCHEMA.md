# yahoo_mail_mock Schema

**Base URL**: `http://localhost:5300/`  
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}`

Inject before opening a fresh browser context. Arrays replace seeded arrays and objects merge with defaults at startup. The first set establishes the server baseline. Later saves update current state, and reset restores the baseline. A browser that has already loaded that session can retain a local copy. The official Harbor runtime partitions state by task and site. The dev API uses the supplied sid to distinguish sessions.

Each committed business dispatch posts one complete JSON snapshot with its activity records. Compare records by ID in `current_state`. The `state_diff` object contains changed top-level keys and wraps each full value in `{modified: value}` or `{added: value}`. It omits removals of entire top-level keys. Within one browser profile, same-origin tabs with the same sid acquire an exclusive lock before reading the shared committed snapshot and saving a change. Reloading while an action waits for the lock can cancel the action before it reaches `/post`. Idle tabs make no state writes.

## State Schema

| Key | Type | Description |
| --- | --- | --- |
| `currentUser` | Object | `{id, name, firstName, email, aliases: string[], avatarColor, jobTitle?, company?, location?, storage: {usedBytes: number, totalBytes: number}}`. |
| `folders` | Array | `{id, name, type: 'system' or 'user', parentId: string or null, order: number, createdAt, updatedAt?}`. |
| `messages` | Array | Message records described below. |
| `contacts` | Array | `{id, firstName, lastName, nickname, emails: [{type, address}], phones: [{type, number}], addresses: [{type, street, city, state, zip, country}], company, jobTitle, birthday, website, notes, isFavorite: boolean, avatarColor?, source: 'manual' or 'added_from_message', createdAt, updatedAt?}`. |
| `contactLists` | Array | `{id, name, contactIds: string[], createdAt, updatedAt?}`. |
| `filters` | Array | Priority-ordered `{id, name, rules: {from, toCc, subject, body}, action: {type: 'move', folderId}, createdAt, updatedAt?}`. Each rule is null or `{operator, value, matchCase: boolean}`. Operators are `contains`, `does not contain`, `begins with`, and `ends with`. |
| `blockedAddresses` | Array | `{id, email, createdAt, source: 'settings' or 'message'}`. |
| `unsubscribes` | Array | `{id, senderEmail, senderName, messageId: string or null, createdAt}`. |
| `settings` | Object | Preference sections described below. |
| `activityLog` | Array | `{id, type, actor, createdAt, messageIds: string[], folderIds: string[], filterIds: string[], contactIds: string[], listIds: string[], details: object}`. Actor is the account email or ID. |

### Messages and attachments

- Message identity and placement fields are `id`, `conversationId`, `folderId`, `previousFolderId?`, `category?`, `status`, `isDraft`, `isRead`, and `isStarred?`. Status is `received`, `sent`, or `draft`. Inbox category is `primary`, `offers`, `social`, or `newsletters`.
- Mail content fields are `from`, `to[]`, `cc[]`, `bcc[]`, `replyTo?`, `subject`, `body`, `bodyHtml?`, `snippet`, optional `quotedText`, draft-only `recipientInput: {to?, cc?, bcc?}` for text awaiting chip confirmation, and `attachments[]`. Each address is `{name?: string, email: string}`. A recipient input value is a string for a new address or `{chipIndex: number, chipEmail: string, text: string}` for an existing chip. Confirming or canceling clears the pending value.
- Relationship and timestamp fields include `date`, `createdAt`, `updatedAt?`, `sentAt?`, `movedAt?`, `inReplyToId?`, `forwardedFromId?`, `replyType?`, `repliedAt?`, `forwardedAt?`, `receivedCopyOfId?`, and `appliedFilterId?`. Reply type is `reply`, `replyAll`, or `forward`.
- Optional presentation fields are `hasImages`, `listUnsubscribe`, `summary`, `orderInfo: {merchant, orderNumber, total, currency, status, trackingNumber?}`, and `travelInfo: {type, provider, confirmation, departAt, from, to}`. Order totals are decimal strings.
- An attachment is `{id, name, size: number, mimeType, kind, url, source, uploadedAt?, sourceMessageId?, sourceAttachmentId?, reusedFromMessageId?, reusedFromAttachmentId?}`. Kind is `image`, `document`, or `other`. Source is `seed`, `upload`, `forward`, or `recent`. URLs target local `/attachments/` or `/files/` payloads. An upload's `size` is the byte count returned by the server and must match the selected file before the upload is recorded.
- Timestamps written by actions are ISO strings. Seeded optional timestamps, relationship IDs, and presentation fields may be null. An injected record can omit optional fields.

### Settings

| Section | Fields |
| --- | --- |
| `appearance` | `theme: 'light' or 'dark' or 'auto'`, `themeColor: string`, `density: 'compact' or 'comfortable' or 'spacious'`, `messageLayout: 'list' or 'right' or 'bottom'` |
| `inbox` | `categoriesEnabled: boolean`, `defaultCategory: string`, `showUnreadCount: boolean`, `sort: 'date_desc' or 'date_asc' or 'unread' or 'starred' or 'sender'` |
| `viewing` | `conversations: boolean`, `showImages: 'ask' or 'always' or 'never'`, `markAsRead: 'immediately' or 'never'`, `afterMove: 'next' or 'previous' or 'list'` |
| `writing` | `signature: {enabled: boolean, text: string}`, `defaultFont: 'sans-serif' or 'serif' or 'monospace'`, `defaultFontSize: 'small' or 'medium' or 'large'`, `defaultFrom: string`, `sendWithCtrlEnter: boolean`, `linkPreviews: boolean` |
| `sidebar` | Boolean `compact`, `viewsExpanded`, `foldersExpanded`, `moreExpanded` |
| `rightPanel` | `open: boolean`, `tab: 'starred' or 'contacts'` |
| `vacationResponse` | `enabled: boolean`, `startDate: string`, `endDate: string`, `subject: string`, `message: string`, `onlyContacts: boolean`, `updatedAt: string or null`. Date inputs use `YYYY-MM-DD` or an empty string. |
| `ai` | `messageSummaries: boolean` |
| `notifications` | Boolean `browser` and `sound` |
| Top level of `settings` | `keyboardShortcuts: boolean` |

`themeColor`, `defaultCategory`, `linkPreviews`, and `notifications` are seeded fields without user controls.

### Default IDs

- Account `usr_megan` with alias `mbrooks.design@yahoo.com`.
- Built-in folders `inbox`, `draft`, `sent`, `archive`, `spam`, and `trash`.
- Custom folders `fld_work`, `fld_q2launch`, `fld_receipts`, `fld_travel`, `fld_family`, `fld_bills`, `fld_bookclub`, `fld_clients`, `fld_research`, `fld_design`, `fld_finance`, `fld_events`, `fld_hiring`, `fld_learning`, `fld_health`, `fld_home`, `fld_insurance`, `fld_running`, `fld_schools`, `fld_taxes`, `fld_volunteer`, `fld_warranties`, `fld_recipes`, and `fld_music`.
- Messages `msg_0001` through `msg_0160`. Drafts are `msg_0076` through `msg_0079`. The featured launch thread is `cnv_0001`. Attachment IDs run from `att_0001` through `att_0065`.
- Contacts `ct_0001` through `ct_0048`, lists `cl_0001` through `cl_0024`, filters `flt_0001` through `flt_0024`, blocks `blk_0001` and `blk_0002`, and unsubscribe `uns_0001`. The activity log starts empty.

## Minimal Inject Example

```json
{
  "action": "set",
  "state": {
    "folders": [],
    "messages": [
      {
        "id": "mail_1",
        "folderId": "inbox",
        "category": "primary",
        "status": "received",
        "isRead": false,
        "from": {"email": "taylor@example.com"},
        "subject": "Project notes"
      }
    ],
    "contacts": [],
    "contactLists": [],
    "filters": [],
    "blockedAddresses": [],
    "unsubscribes": [],
    "activityLog": []
  }
}
```

## Observable State Changes (for LLM evaluation)

| User Action | State Field Changed |
| --- | --- |
| Open unread mail, mark read/unread, star/unstar | Changed `messages[]` receive `isRead` or `isStarred` and `updatedAt`. `message.read`, `message.unread`, `message.star`, or `message.unstar` includes `messageIds` and per-message `details.changes[{messageId, field, before, after}]`. Opening from the UI marks unread received messages in the displayed conversation when the preference allows it. A direct URL load is read-only. |
| Move, archive, trash, spam, restore, or mark not spam | `messages[].folderId`, `previousFolderId`, `movedAt`, and `updatedAt`. `message.move/archive/delete/spam/restore/not_spam` includes `messageIds`, `folderIds` and `details.changes[{messageId, fromFolderId, toFolderId, previousFolderIdBefore}]`. Restore and Not spam clear `previousFolderId`. |
| Undo | Restores the available prior flag or placement fields, updates `updatedAt`, and adds `message.undo` with `details.undoneActivityId` and changed IDs. |
| Delete permanently or empty Trash or Spam | Removes messages. `message.delete_forever` or `folder.empty` includes `messageIds`, `folderIds`, `details.subjects`, and `details.deletedMessages[{id, subject, folderId, conversationId}]`. |
| Create, rename, or delete a folder | Adds, updates, or removes `folders[]`. `folder.create/rename/delete` carries `folderIds` and `details.before/after`. Delete retargets linked filters to Inbox and records `filterIds` plus `details.adjustedFilters` with each filter's snapshots. |
| Mark all as read in a folder | Sets `messages[].isRead` and `updatedAt`. `folder.mark_all_read` includes `folderIds`, `messageIds`, and read-flag changes. |
| Compose, edit, reply, reply all, or forward | Adds or updates a Drafts message and its `updatedAt` plus affected `from`, `to`, `cc`, `bcc`, `recipientInput`, `subject`, `body`, `bodyHtml`, `snippet`, or `attachments` fields. `draft.save` records `messageIds`, `details.changedFields`, and `details.isNew`. Reply and forward set `inReplyToId` or `forwardedFromId`, `replyType`, and `quotedText`, with `details.originalMessageId` on creation. Forward copies attachment metadata with new IDs and source links. |
| Discard drafts | Removes the confirmed draft records in one state update. Each removed draft has a `draft.discard` event with `messageIds`, `details.before`, and `details.after: null`. Drafts are excluded from regular mailbox moves and deletion. |
| Upload, remove, or reuse an attachment | Updates draft `attachments[]` and `updatedAt`. Alongside `draft.save`, each file has `attachment.upload/remove/reuse` with `messageIds` and `details.{attachmentId,name,size,mimeType,url}`. Remove includes the prior attachment in `details.before`. Reuse adds `details.reusedFromMessageId` and `details.reusedFromAttachmentId`. An upload response with missing files, invalid local URLs, or mismatched byte counts produces zero attachment events and leaves the draft's attachment list unchanged. |
| Preview or download an attachment | Records `attachment.preview/download` on a successful file request with the owner in `messageIds` and `details.{attachmentId,name,size,mimeType,url}`. |
| Reveal local inline images | Presentation only. The action does not change the message or add an activity record. |
| Send a draft, reply, reply all, or forward | Enforces the 25,000,000-byte total attachment limit. Transforms a valid draft into Sent with the same ID, clears `recipientInput`, and writes `status`, `isDraft`, `folderId`, `isRead`, `sentAt`, `date`, and `updatedAt`. Replies and forwards also update the source `repliedAt` or `forwardedAt` and `updatedAt`. Exactly one `message.send/reply/reply_all/forward` records the Sent ID in `messageIds`, `folderIds:['sent']`, and `details.{to,cc,bcc,subject,attachmentIds,originalMessageId,incomingCopyIds}`. |
| Send to the account or an alias | Creates at most one received copy with `receivedCopyOfId`, its own ID and attachment IDs, `isRead:false`, `sentAt:null`, destination `folderId`, and `appliedFilterId`. If matched, `filter.apply` links the copy, filter, and destination and records `details.{sentMessageId,fromFolderId,toFolderId}`. |
| Create, edit, reorder, or delete a filter | Updates the `filters[]` record or array order. `filter.create/update/delete/reorder` includes `filterIds` and `details.before/after`. Reorder updates `filters[].updatedAt` on the moved filter and adds `details.{fromIndex,toIndex,orderedFilterIds}`. Create and edit carry the destination in `folderIds`. New destination folder creation adds a `folder.create` entry in the same state update. |
| Add, edit, favorite, or delete a contact | Adds, updates or removes `contacts[]` with `contact.create/update/favorite/delete`, `contactIds`, and `details.before/after`. Favorite changes `isFavorite` and `updatedAt`. Adding a sender uses `source:'added_from_message'` and the source ID in `messageIds`. Delete removes memberships from `contactLists[].contactIds`, updates their `updatedAt`, and includes affected `listIds` and `details.changes[{listId,before,after}]`. |
| Create, edit, or delete a contact list | Writes `contactLists[]` and `list.create/update/delete` with `listIds`, `contactIds`, and `details.before/after`. On edit, `contactIds` in the activity are the resulting members. |
| Email a contact or contact list | Creates a draft with expanded recipient addresses in `messages[].to` and records `draft.save` with the draft ID. |
| Block or unblock an address | Adds or removes a `blockedAddresses[]` record. `sender.block` also writes `messages[].folderId,previousFolderId,movedAt,updatedAt` for matching received mail moved to Trash and logs each transition in `details.changes`. When initiated from a message, its ID appears in `details.sourceMessageId`. `sender.unblock` records the removed entry in `details.before`. |
| Unsubscribe | Adds one `unsubscribes[]` record per sender. `sender.unsubscribe` includes the source in `messageIds` and `details.{unsubscribeId,senderEmail,after}`. |
| Change settings | Writes changed preference fields and `settings.update` with `details.section` and `details.changed[fieldPath]: {before, after}`. |

Counts, search results, open menus, selection, and the open preview dialog are derived or transient. A successful preview request is recorded separately. The state template owns bootstrap and session scoping. Idle views make no user-action saves.
