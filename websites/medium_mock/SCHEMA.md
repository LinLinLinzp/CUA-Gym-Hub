# Medium observable state

**Base URL**: `http://localhost:5340/`
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`
**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`
**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}`
**State read**: `GET /state?sid=<sid>` → `{stored_state, has_custom_state, sid}`

The app loads `createInitialData()` through the unchanged Harbor data manager with
`APP = 'medium'`. `/state`, `/post`, and `/go` are provided by `templates/state-api.js`
in development and preview, and the Harbor host in production. `?sid=` isolates
sessions and is retained in internal navigation. The first load posts one `set`;
subsequent writes are whole-state `set_current` calls from user actions only.

The full field reference is [assets/data_model.md](assets/data_model.md). Timestamps
on new records and edits are ISO strings from `new Date().toISOString()`. Counts
are numbers. Optional references may be null. Missing arrays render as empty arrays.

| Top-level key | Record shape |
|---|---|
| currentUserId | Signed-in user id, defaults to `u_maya` |
| users | `{id, username, name, pronouns?, bio, about, avatarColor, followerCount, followingCount, isMember, isPartner, emailSubscriberCount, joinedAt, location?}` |
| publications | `{id, slug, name, tagline, description, logoColor, headerStyle, accentColor, ownerId, editorIds[], writerIds[], topicIds[], navItems:[{id,label,topicId}], featuredStoryIds[], submissionPolicy, submissionGuidelines, followerCount, email, twitter, createdAt, updatedAt}` |
| topics | `{id, slug, name, storyCount, writerCount, followerCount, relatedTopicIds[]}` |
| stories | `{id, slug, authorId, publicationId, title, subtitle, body[], coverImage, topicIds[], status, visibility, memberOnly, allowResponses, license, seoTitle, seoDescription, canonicalUrl, previewTitle, previewSubtitle, previewImage, emailSubscribers, pinnedToProfile, wordCount, readingTime, clapCount, viewCount, readCount, createdAt, updatedAt, publishedAt, scheduledFor, lastPublishedVersion?}` |
| submissions | `{id, storyId, publicationId, submittedById, status, noteToEditors, editorNote, decidedById, decidedAt, createdAt, updatedAt}` |
| lists | `{id, ownerId, name, description, visibility, isDefault, items:[{storyId,note,addedAt}], clapCount, createdAt, updatedAt}` |
| listSaves | `{id, userId, listId, createdAt}` |
| responses | `{id, targetType, targetId, parentResponseId, authorId, body, bodyHtml, quote, clapCount, hidden, hiddenById, edited, deleted, createdAt, updatedAt}` |
| claps | `{id, userId, targetType, targetId, count, createdAt, updatedAt}`; at most 50 per user/target |
| highlights | `{id, userId, storyId, blockId, text, startOffset, endOffset, createdAt}` |
| follows | `{id, followerId, targetType, targetId, createdAt}` |
| mutes | `{id, userId, targetType, targetId, createdAt}` |
| notifications | `{id, userId, type, actorId, storyId, responseId, listId, publicationId, submissionId, read, createdAt}` |
| readingHistory | `{id, userId, storyId, readAt}` |
| settings | `{email, allowEmailReplies, emailNotifications:{storyRecommendations,newFollowers,responses,claps,mentions,publicationSubmissions,newsletter}, pushNotifications, defaultResponseSort, hideActivity, readingFont}` |
| ui | `{sidebarOpen, homeTab, dismissedTips[]}`; excludes transient menus/drawers |

Body blocks: `{id,type,text?,html?,items?,src?,caption?}`. Types: `p`, `h3`, `h4`,
`blockquote`, `pullquote`, `code`, `ul`, `ol`, `image`, `hr`. Inline HTML is sanitized
to strong/emphasis, safe links, and line breaks. Images are local data URIs or
`cover:<seed>:<variant>` tokens resolved to deterministic SVGs.

Story status: `draft | scheduled | published`; visibility: `public | unlisted`.
Submission status: `pending | in_review | edits_requested | declined | approved | withdrawn`.
Publication submission policy: `open | writers_only | closed`.
List visibility: `public | private`. Response target: `story | list`. Clap target:
`story | list | response`. Follow/mute target: `user | publication | topic`.
License: `all_rights_reserved | cc_by | cc_by_sa | public_domain`.
Response counts derive from non-hidden, non-deleted responses; clap totals combine
fixed base counts and the current user's clap record. Scheduled stories become
visible at render time once due, without writing state on a timer.

### Default IDs
- Current user: `u_maya` (@mayalindqvist)
- Medium Staff (owns Staff Picks list): `u_001` (@medium-staff)
- Reading list (default, protected from deletion): `lst_reading_maya`
- Staff Picks list: `lst_staff_picks`
- Publications Maya owns/edits/writes for: `pub_slow_culture` (slug `slow-culture`, owner),
  `pub_counter_arts` (slug `counter-arts`, writer), `pub_writing_cooperative`
  (slug `the-writing-cooperative`, writer)
- Stories: `st_0001`–`st_0084` (`st_0001`–`st_0008` and `st_0040`–`st_0049`
  belong to Maya; `st_0079`–`st_0084` are other authors' drafts; the remaining
  records are other authors' published stories)
- Topics: `t_books`, `t_reading`, `t_literature`, … 36 total (see `assets/data_model.md`)

## Minimal Inject Example

```json
{
  "currentUserId": "u_maya",
  "users": [
    { "id": "u_maya", "username": "mayalindqvist", "name": "Maya Lindqvist",
      "bio": "Essays on books, film, and the art of paying attention.", "about": "",
      "avatarColor": "#1A8917", "followerCount": 2417, "followingCount": 186,
      "isMember": true, "isPartner": true, "emailSubscriberCount": 312,
      "joinedAt": "2021-03-01T00:00:00.000Z" }
  ],
  "publications": [],
  "topics": [],
  "stories": [
    { "id": "st_0001", "slug": "the-quiet-art-of-rereading", "authorId": "u_maya",
      "publicationId": null, "title": "The Quiet Art of Rereading", "subtitle": "",
      "body": [{ "id": "b_1", "type": "p", "text": "A new paragraph.", "html": "A new paragraph." }],
      "coverImage": null, "topicIds": [], "status": "published", "visibility": "public",
      "memberOnly": false, "allowResponses": true, "license": "all_rights_reserved",
      "previewTitle": null, "previewSubtitle": null, "previewImage": null,
      "emailSubscribers": true, "pinnedToProfile": false, "wordCount": 3, "readingTime": 1,
      "clapCount": 0, "viewCount": 0, "readCount": 0, "createdAt": "2026-07-01T00:00:00.000Z",
      "updatedAt": "2026-07-01T00:00:00.000Z", "publishedAt": "2026-07-01T00:00:00.000Z",
      "scheduledFor": null }
  ],
  "submissions": [], "lists": [], "listSaves": [], "responses": [], "claps": [],
  "highlights": [], "follows": [], "mutes": [], "notifications": [], "readingHistory": [],
  "settings": { "defaultResponseSort": "relevant" },
  "ui": { "sidebarOpen": true, "homeTab": "for-you", "dismissedTips": [] }
}
```

## Observable State Changes

| Action | UI path | State path(s) changed | Example values |
|---|---|---|---|
| Create draft | Write → type title/body | `stories[]` new full record | `{authorId:'u_maya',status:'draft',publishedAt:null}` |
| Autosave draft | Editor typing, blur, leave, Publish | `stories[].title/body/wordCount/readingTime/updatedAt` | body block `{type:'p',text:'A new paragraph',html:'A new paragraph'}` |
| Edit published story | Story → Edit → Save and publish | `stories[].title/body/wordCount/readingTime/updatedAt` | published content updated only on explicit save |
| Publish | Editor → Publish → Publish now | `stories[].status/publishedAt/updatedAt/slug/topicIds/memberOnly/emailSubscribers/previewTitle/previewSubtitle/previewImage/publicationId/scheduledFor` | `status:'published'`, `scheduledFor:null` |
| Schedule | Publish → Schedule for later | same publish fields, `status/scheduledFor` | `status:'scheduled'`, future ISO time |
| Unschedule | Stories → Scheduled → menu | `stories[].status/scheduledFor/updatedAt` | `'draft'`, `null` |
| Delete story | Editor/Stories/story menu → Delete | `stories[]`, `submissions[].status/updatedAt`, `lists[].items`, `publications[].featuredStoryIds` | story removed, related submissions `'withdrawn'` |
| Pin story | Stories → published menu | `stories[].pinnedToProfile/updatedAt` | `true` |
| Story settings / unlist | Story → Story settings / menu | `stories[].visibility/allowResponses/slug/subtitle/seoTitle/seoDescription/canonicalUrl/license/previewTitle/previewSubtitle/previewImage/topicIds/memberOnly/updatedAt` | `'unlisted'`, `false`, `'cc_by'` |
| Create list | Library → New list / bookmark picker | `lists[]` | `{ownerId:'u_maya',name:'Essays',visibility:'private',items:[]}` |
| Save/remove story | Bookmark picker checkbox / list Remove | `lists[].items/updatedAt` | `{storyId,note:'',addedAt}` added/removed |
| Edit list / privacy | Library/list menu | `lists[].name/description/visibility/updatedAt` | `'public'` |
| Item note | List → Add a note/Edit note → Save | `lists[].items[].note`, `lists[].updatedAt` | `'Return to this essay'` |
| Reorder items | List → Reorder → drag or arrows | `lists[].items/updatedAt` | reordered item array |
| Delete list | List/Library menu → Delete | `lists[]`, `listSaves[]` | removed; default list protected |
| Save another list | Public list → Save list / Saved list | `listSaves[]` | `{userId:'u_maya',listId,createdAt}` toggled |
| Respond / reply | Responses composer → Respond | `responses[]` | full response, `parentResponseId:null` or reply parent id |
| Response formatting | Composer B/i → Respond | `responses[].bodyHtml/updatedAt` | sanitized strong/emphasis |
| Edit response | Own response → menu → Edit → Save | `responses[].body/bodyHtml/edited/updatedAt` | `edited:true` |
| Delete response | Own response → Delete | `responses[].deleted/updatedAt` | `deleted:true` |
| Hide / show response | Own story → response menu | `responses[].hidden/hiddenById/updatedAt` | `true`, `'u_maya'` / `false`, `null` |
| Clap story/list/response | Clap icon or held press | `claps[]` new/upsert `count/updatedAt` | `targetType:'response'`, count 1–50 |
| Undo claps | Story menu | `claps[]` | current user's target clap removed |
| Create publication | Publications → New publication → Next | `publications[]` full record | owner/editor current user; writerIds `[]`, followerCount `0` |
| Edit publication info | Manage → Info & homepage → Save | `publications[].name/tagline/description/logoColor/headerStyle/accentColor/topicIds/email/twitter/editorIds/navItems/updatedAt` | nav `{id,label:'BOOKS',topicId:'t_books'}` |
| Submission settings | Manage → Submission settings → Save | `publications[].submissionPolicy/submissionGuidelines/updatedAt` | `'writers_only'` |
| Add/remove/promote writer | Manage → People | `publications[].writerIds/editorIds/updatedAt` | writer id added, moved to editor, or removed |
| Leave publication | My publications → Leave | `publications[].writerIds/updatedAt` | current user removed |
| Submit draft | Editor/Stories/pub SUBMIT → Submit | `submissions[]`, `stories[].publicationId/updatedAt` | new `'pending'` record with noteToEditors |
| Add to own publication | Submit modal → Add to publication | `stories[].publicationId/updatedAt` | no submission created for editor/owner |
| Withdraw / resubmit | Stories → Submissions menu | `submissions[].status/updatedAt`, `stories[].publicationId/updatedAt` | `'withdrawn'` + null / `'pending'` + publication id |
| Mark in review | Manage → Submissions | `submissions[].status/updatedAt`, `stories[].updatedAt` | `'in_review'` |
| Approve & publish | Manage → Submissions / preview | `submissions[].status/decidedById/decidedAt/editorNote/updatedAt`, `stories[].status/publicationId/publishedAt/slug/updatedAt` | `'approved'`, `'published'` |
| Request edits / decline | Manage → Submissions → modal | same submission decision fields; decline clears story publication | `'edits_requested'` with required note / `'declined'` |
| Feature / reorder featured | Manage → Stories menu | `publications[].featuredStoryIds/updatedAt` | ordered ids, max 5 |
| Remove story from pub | Manage → Stories menu | `stories[].publicationId/updatedAt`, `publications[].featuredStoryIds/updatedAt` | null, id removed |
| Follow / unfollow | Writer/publication/topic Follow | `follows[]`, target `.followerCount`, current user `.followingCount` | structured record added/removed and counts ±1 |
| Record reading | Click story link | `readingHistory[]` new/upsert `.readAt` | no write on direct route load |
| Clear/remove history | Library → Reading history | `readingHistory[]` | emptied or selected record removed |
| Highlight / remove | Select story text → Highlight / click highlight | `highlights[]` | passage, block id and offsets / removed |
| Mute / unmute | Story/feed menu / Following → Muted | `mutes[]` | structured target record added/removed |
| Show less | Feed card menu | none (local UI only) | card hidden for application session |
| Read notification | Click notification / Mark all as read | `notifications[].read` | `true`; no mount write |
| Profile edit | Settings → Account → Save | `users[].name/username/pronouns/bio/about/avatarColor/updatedAt` | chosen colour and validated text |
| Publishing/settings toggles | Settings → Publishing/Notifications | `settings.allowEmailReplies/defaultResponseSort/emailNotifications.*` | boolean / `'recent'` |
| Sidebar | Top bar hamburger | `ui.sidebarOpen` | boolean |
| Home tab | Home tab click | `ui.homeTab` | `'following'` / topic slug |
| Import story | Stories → Import URL | `stories[]` | draft title from hostname/path, body `Imported from ...` |
| Featured image | Editor image Shift+F | `stories[].coverImage/updatedAt` | selected image token/data URI |

No runtime notification creation, simulated activity, external image requests,
authentication, or checkout is implemented. Menus, response drawers, search text,
scroll pagination, toast visibility, and selection controls are transient UI.
