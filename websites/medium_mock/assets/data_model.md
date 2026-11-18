# Medium Mock — Data Model

`src/data/seed.js` exports `createInitialData()` returning the object below. It is called on the
client **and** on the server (`stateApi(createInitialData)` builds the `/go` baseline), so it must be
**pure and deterministic**: fixed ids, fixed ISO timestamps, no `Date.now()`, no `Math.random()`.
Everything is plain JSON (no Dates, Maps, functions). Store key: `APP = 'medium'`.

Runtime-created records use `newId(prefix)` = `` `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}` ``
and `createdAt/updatedAt = new Date().toISOString()`.

## 0. Top-level shape

```js
{
  currentUserId: 'u_maya',
  users: [],            // §1   32 records
  publications: [],     // §2   10 records
  topics: [],           // §3   36 records
  stories: [],          // §4   84 records (drafts, scheduled, published, unlisted)
  submissions: [],      // §5    9 records
  lists: [],            // §6   14 records
  listSaves: [],        // §7    3 records
  responses: [],        // §8  140 records
  claps: [],            // §9   30 records (current user's claps only)
  highlights: [],       // §10  10 records
  follows: [],          // §11  40 records (current user's follows)
  mutes: [],            // §12   1 record
  notifications: [],    // §13  30 records
  readingHistory: [],   // §14  25 records
  settings: {},         // §15
  ui: {}                // §16 persisted UI prefs only (no transient state)
}
```

**Rendering robustness (HARBOR §2)** — every selector must tolerate: missing arrays (`state.lists ?? []`),
unknown ids (author not found → render "Unknown author"), missing optional fields, empty arrays (show
real empty states), and 500+ records. Never assume `currentUser` exists — fall back to a guest-safe
render rather than crashing.

Enumerations (use these exact strings — verifiers match on them):

| Field | Values |
|-------|--------|
| `story.status` | `'draft'` · `'scheduled'` · `'published'` |
| `story.visibility` | `'public'` · `'unlisted'` |
| `story.license` | `'all_rights_reserved'` · `'cc_by'` · `'cc_by_sa'` · `'public_domain'` |
| `body[].type` | `'p'` · `'h3'` · `'h4'` · `'blockquote'` · `'pullquote'` · `'code'` · `'ul'` · `'ol'` · `'image'` · `'hr'` |
| `submission.status` | `'pending'` · `'in_review'` · `'edits_requested'` · `'declined'` · `'approved'` · `'withdrawn'` |
| `list.visibility` | `'public'` · `'private'` |
| `response.targetType` / `clap.targetType` | `'story'` · `'list'` · `'response'` (claps only) |
| `follow.targetType` / `mute.targetType` | `'user'` · `'publication'` · `'topic'` |
| `publication.submissionPolicy` | `'open'` · `'writers_only'` · `'closed'` |
| `notification.type` | `'follow'` · `'clap'` · `'response'` · `'reply'` · `'list_add'` · `'submission_received'` · `'submission_approved'` · `'submission_declined'` · `'edits_requested'` · `'publication_writer_added'` · `'mention'` |

---

## 1. users

```js
{
  id: 'u_maya',                     // fixed: 'u_maya', 'u_001' … 'u_031'
  username: 'mayalindqvist',        // unique, lowercase, used in /@:username
  name: 'Maya Lindqvist',
  pronouns: 'she/her',              // optional
  bio: 'Essays on books, film, and the art of paying attention. Editor of Slow Culture.',
  about: 'Long-form “About” text (2–4 paragraphs) shown on the About tab.',
  avatarColor: '#E8D5B7',           // from DESIGN.md avatar palette
  followerCount: 2417,              // others → this user (number)
  followingCount: 186,
  isMember: true,                   // shows member ring/star in some places
  isPartner: true,                  // Partner Program — can paywall stories
  emailSubscriberCount: 312,        // used in publish dialog "Email to 312 subscribers"
  joinedAt: '2019-03-14T10:00:00.000Z',
  location: 'Stockholm, Sweden'     // optional
}
```
Current user = `u_maya`. `u_001` = **Medium Staff** (@medium-staff, bio "Official account of Medium’s editorial team.", owns the Staff Picks list, writes no stories). Other 30 users: writers across culture topics (books, film, music, art,
history, food, travel, writing craft, philosophy, photography) plus a few tech/productivity writers
for realism. Follower counts span 40 → 186K. 4 users are editors of Maya's publication's partner pubs.

## 2. publications

```js
{
  id: 'pub_slow_culture',
  slug: 'slow-culture',             // route /:pubSlug ; must not collide with reserved routes
  name: 'Slow Culture',
  tagline: 'Essays for people who still read to the end.',   // ≤ 100 chars
  description: 'Slow Culture publishes long-form essays on books, film, music…', // ≤ 280
  logoColor: '#B5C9C3',             // generated square logo bg; logo text = initials
  headerStyle: 'light',             // 'light' | 'dark' — publication header band
  accentColor: '#1F3A5F',           // header band colour when headerStyle==='dark'
  ownerId: 'u_maya',
  editorIds: ['u_maya', 'u_007'],   // owner is always included
  writerIds: ['u_003', 'u_011', 'u_014', 'u_019', 'u_022'],
  topicIds: ['t_books', 't_film', 't_essay'],   // ≤ 5
  navItems: [ { id: 'nav_1', label: 'BOOKS', topicId: 't_books' }, … ],  // header nav tabs
  featuredStoryIds: ['st_0041', 'st_0044'],     // shown in hero grid on homepage (ordered)
  submissionPolicy: 'open',
  submissionGuidelines: 'We publish essays of 1,200–4,000 words…',
  followerCount: 18432,             // includes seeded follows; runtime follow/unfollow writes ±1 (§11)
  email: 'editors@slowculture.pub',
  twitter: 'slowculturepub',
  createdAt: '2021-06-02T09:00:00.000Z',
  updatedAt: '2026-10-28T14:12:00.000Z'
}
```
Seed (10): **Slow Culture** (owner `u_maya`), **Counter Arts** (Maya = writer), **The Writing
Cooperative** (Maya = writer), **Lessons from History** (Maya not a member, policy `open`),
**Human Parts**, **Electric Literature**, **Age of Awareness**, **The Startup**, **Fourth Wave**,
**Bouncin' and Behavin' Blogs** (Maya = editor, not owner). Reserved slugs that publication slugs may
NOT use: `me, p, new-story, new-publication, search, tag, list, settings, plans, membership, about`.

## 3. topics

```js
{ id: 't_books', slug: 'books', name: 'Books', storyCount: 412000, writerCount: 98000, followerCount: 1200000,
  relatedTopicIds: ['t_reading', 't_literature', 't_fiction'] }
```
36 topics: Books, Reading, Literature, Fiction, Poetry, Writing, Writing Tips, Essay, Film, Movies,
Television, Music, Art, Photography, Design, Architecture, History, Philosophy, Culture, Food,
Travel, Japan, Museums, Self Improvement, Productivity, Psychology, Relationships, Life Lessons,
Mental Health, Technology, Artificial Intelligence, Programming, Data Science, Startup, Science,
Climate Change. Topic `slug` is used in `/tag/:slug`.

## 4. stories

```js
{
  id: 'st_0041',                    // fixed seed ids st_0001 … st_0084
  slug: 'the-quiet-art-of-rereading',   // derived from title on publish; editable in story settings
  authorId: 'u_maya',
  publicationId: 'pub_slow_culture',   // null = personal story
  title: 'The Quiet Art of Rereading',
  subtitle: 'Why the second time through a book is where it finally starts talking back',
  body: [                           // ordered blocks (see enum). text = plain text (verifiers read this);
    { id: 'b1', type: 'p', text: 'The first time I read…', html: 'The first time I read <em>Middlemarch</em>…' },
    { id: 'b2', type: 'h3', text: 'Memory is a bad librarian' },
    { id: 'b3', type: 'image', src: 'cover:st_0041:2', caption: 'A shelf of annotated paperbacks.' },
    { id: 'b4', type: 'blockquote', text: '“We read to know we are not alone.”' },
    { id: 'b5', type: 'ul', items: ['Read slowly', 'Annotate', 'Return in a year'] },
    { id: 'b6', type: 'code', text: 'const x = 1;' },
    { id: 'b7', type: 'hr' }
  ],                                // html is optional inline markup: <strong>, <em>, <a href>. Sanitize on save.
  coverImage: 'cover:st_0041:1',    // generated-cover token (see §17) or null
  topicIds: ['t_books', 't_reading', 't_essay'],   // ≤ 5
  status: 'published',
  visibility: 'public',
  memberOnly: true,                 // "Meter my story / Partner Program" paywall; gold star in UI
  allowResponses: true,             // story settings "Allow responses"
  license: 'all_rights_reserved',
  seoTitle: '', seoDescription: '', canonicalUrl: '',
  previewTitle: null,               // publish-dialog overrides; null = use title/subtitle/coverImage
  previewSubtitle: null,
  previewImage: null,
  emailSubscribers: true,           // publish-dialog "Email to N subscribers" checkbox outcome
  pinnedToProfile: false,
  wordCount: 1642,                  // recomputed from body on every save (number)
  readingTime: 7,                   // minutes = max(1, ceil(wordCount/265) + images*0.2) rounded, set on save
  clapCount: 4812,                  // claps from OTHER users (fixed); my claps come from §9
                                    // (no responseCount field — always derived from responses[])
  viewCount: 21890, readCount: 8120,        // stats page (fixed)
  createdAt: '2026-10-02T08:14:00.000Z',
  updatedAt: '2026-10-05T19:40:00.000Z',    // bumped on every edit/save
  publishedAt: '2026-10-05T19:40:00.000Z',  // null for drafts
  scheduledFor: null,               // ISO when status==='scheduled'
  lastPublishedVersion: null        // P2: snapshot {title, subtitle, body} when editing a published story
}
```

Rules:
- **Draft** = `status:'draft'`, `publishedAt:null`. Appears only in `/me/stories?tab=drafts` (and editor).
- **Publish now** → `status:'published'`, `publishedAt=now`, `updatedAt=now`, plus `topicIds`, `memberOnly`,
  `emailSubscribers`, `preview*`, `publicationId` (only if user is editor/owner of that publication, else see §5).
- **Schedule** → `status:'scheduled'`, `scheduledFor=<ISO chosen>`. A scheduled story is displayed as published
  *only when* `new Date() >= scheduledFor` at render time (no timers, no state writes).
- **Unlisted** → `visibility:'unlisted'` (any status). Unlisted published stories are excluded from feeds,
  search, profile, topic and publication pages, but open by direct URL.
- `responseCount` (derived) = responses where `targetType==='story' && targetId===story.id && !hidden && !deleted`.
- Displayed clap total = `story.clapCount + (my clap record?.count ?? 0)`.

Seed (84):
- `u_maya`: **7 drafts** (`st_0001`–`st_0007`: 2 nearly empty — title only; 1 with only body text, no title;
  4 substantial 400–1,500 words; one of them, `st_0004`, is attached to publication Counter Arts and has a
  pending submission), **1 scheduled** (`st_0008`, scheduledFor `2026-12-01T15:00:00.000Z`),
  **8 published** (`st_0040`–`st_0047`, 3 in Slow Culture, 1 in Counter Arts, 4 personal; 3 member-only),
  **2 unlisted published** (`st_0048`, `st_0049`).
- Other authors: **66 published** stories (`st_0009`–`st_0039`, `st_0050`–`st_0084`) spread across all 10
  publications and personal profiles, `publishedAt` between `2026-07-01` and `2026-11-17`, 40% member-only,
  clapCount 3 → 48,200, each with 1–5 topics. 6 of them by Slow Culture writers are drafts submitted to Slow
  Culture (`status:'draft'`, `publicationId:'pub_slow_culture'`, referenced by incoming submissions §5).
- **Bodies**: 20 "hero" stories (incl. all of Maya's published ones and the top-6 Staff Picks) have full
  6–12 block bodies with at least one h3, one image block and one blockquote. All others have 3–5 real,
  topic-specific paragraphs (no lorem ipsum).

## 5. submissions (story → publication review)

```js
{
  id: 'sub_001',
  storyId: 'st_0004',
  publicationId: 'pub_counter_arts',
  submittedById: 'u_maya',
  status: 'pending',                // see enum
  noteToEditors: 'This is a 2,100-word essay on…',   // optional, from submit modal
  editorNote: null,                 // set when editor requests edits / declines
  decidedById: null,                // editor id on approve/decline/edits_requested
  createdAt: '2026-11-10T18:22:00.000Z',
  updatedAt: '2026-11-10T18:22:00.000Z',
  decidedAt: null
}
```
Transitions (each writes `status`, `updatedAt`, and the listed fields):
- Writer submits (story menu / publish dialog with non-editor publication) → new record `pending`; story gets
  `publicationId` set (still `status:'draft'`).
- Writer **Withdraw submission** → `withdrawn`; story `publicationId → null`.
- Editor **Start review** (opens story from inbox) → `in_review` (optional, explicit button "Mark in review").
- Editor **Request edits** (requires note) → `edits_requested`, `editorNote`, `decidedById`, `decidedAt`.
- Editor **Decline** (optional note) → `declined`, same fields; story `publicationId → null`.
- Editor **Approve & publish** → `approved`, `decidedById`, `decidedAt`; story `status:'published'`,
  `publishedAt=now`, `publicationId` kept.
- Writer resubmits after edits → same record goes back to `pending` with new `updatedAt`.

Seed (9): Maya outgoing — `sub_001` pending (st_0004→Counter Arts), `sub_002` edits_requested (st_0005→The
Writing Cooperative, editorNote set), `sub_003` declined (older story→Lessons from History), `sub_004`
approved (st_0043→Counter Arts). Incoming to Slow Culture — `sub_005`…`sub_009` (4 pending, 1 in_review)
from Slow Culture writers.

## 6. lists

```js
{
  id: 'lst_reading_maya',
  ownerId: 'u_maya',
  name: 'Reading list',             // ≤ 60 chars
  description: '',                  // ≤ 280 chars
  visibility: 'private',
  isDefault: true,                  // the Reading list: cannot be deleted or renamed
  items: [                          // ordered; newest first by default
    { storyId: 'st_0012', note: '', addedAt: '2026-11-16T21:04:00.000Z' }
  ],
  clapCount: 0,                     // claps from others (public lists)
  createdAt: '2019-03-14T10:00:00.000Z',
  updatedAt: '2026-11-16T21:04:00.000Z'
}
```
Seed (14): Maya — **Reading list** (private, default, 9 items), **Essays I keep rereading** (public, 7, two
items have notes), **Film criticism worth your time** (public, 6), **On the craft of writing** (public, 5),
**Kyoto, slowly** (private, 4), plus 9 public lists owned by other users — the first is **Staff Picks** (`lst_staff_picks`, owner `u_001`,
12 items; its first 6 items are the home right-rail Staff Picks, in item order) — (4–15 items each, e.g. "Best of
Electric Literature 2026", "Music writing that made me listen again", "History's strangest footnotes").
`items[].storyId` must reference published stories only.

## 7. listSaves (saving someone else's list into "Saved lists")

```js
{ id: 'ls_001', userId: 'u_maya', listId: 'lst_u004_music', createdAt: '2026-10-21T12:00:00.000Z' }
```

## 8. responses

```js
{
  id: 'rsp_0001',
  targetType: 'story',              // 'story' | 'list'
  targetId: 'st_0041',
  parentResponseId: null,           // id of response being replied to (threaded)
  authorId: 'u_012',
  body: 'This made me pick Middlemarch back up…',   // plain text, ≤ 4000 chars, newlines allowed
  bodyHtml: null,                   // optional inline <strong>/<em> from B/I buttons
  quote: null,                      // optional highlighted passage when responding from a highlight
  clapCount: 14,                    // claps from others; my claps in §9 with targetType 'response'
  hidden: false,                    // story author used "Hide this response"
  hiddenById: null,
  edited: false,
  deleted: false,                   // soft-delete keeps thread shape; UI shows nothing if no replies
  createdAt: '2026-10-06T07:30:00.000Z',
  updatedAt: '2026-10-06T07:30:00.000Z'
}
```
Seed (140): every published story with clapCount > 200 gets 1–12 responses; Maya's published stories get
4–10 each (incl. 2 replies by Maya, 1 hidden response, 1 response authored by Maya on others' stories ×6);
3 responses on public lists. ~25% are replies (`parentResponseId` set, max depth 2).

## 9. claps (current user's claps; one record per target)

```js
{ id: 'clp_001', userId: 'u_maya', targetType: 'story', targetId: 'st_0012', count: 12,
  createdAt: '2026-11-02T08:00:00.000Z', updatedAt: '2026-11-02T08:01:10.000Z' }
```
`count` 1–50. Clapping again increments `count` and `updatedAt`; "Undo claps" (P2) deletes the record.

## 10. highlights

```js
{ id: 'hl_001', userId: 'u_maya', storyId: 'st_0012', blockId: 'b4',
  text: 'Memory is not a recording; it is a rehearsal.', startOffset: 0, endOffset: 46,
  createdAt: '2026-11-01T20:00:00.000Z' }
```

## 11. follows (current user → user / publication / topic)

```js
{ id: 'fol_001', followerId: 'u_maya', targetType: 'user', targetId: 'u_004', createdAt: '2025-02-11T09:00:00.000Z' }
```
Seed (40): 18 users, 8 publications, 14 topics. Followed topics drive the home tab row; followed
users/pubs drive the "Following" feed and the sidebar Following section.
Rule: seeded `followerCount` values already include the seeded follows. On a runtime **Follow**, add the
follow record AND `followerCount += 1` on the target user/publication/topic; on **Unfollow**, delete the
record AND `followerCount -= 1` (floor 0). Display `followerCount` as-is. Following yourself is impossible
(hide the button on your own profile/publication-you-own).

## 12. mutes

```js
{ id: 'mut_001', userId: 'u_maya', targetType: 'user', targetId: 'u_029', createdAt: '…' }
```
Muted authors/publications are filtered out of all feeds and recommendations.

## 13. notifications (for current user)

```js
{ id: 'ntf_001', userId: 'u_maya', type: 'response', actorId: 'u_012', storyId: 'st_0041',
  responseId: 'rsp_0007', listId: null, publicationId: null, submissionId: null,
  read: false, createdAt: '2026-11-17T09:12:00.000Z' }
```
Seed (30): 9 unread, all types represented, newest `2026-11-17`. The app never creates notifications
for the current user at runtime (we do not simulate other people). The only runtime writes are the
`read` flags: clicking a notification sets that one `read:true`; "Mark all as read" sets all `read:true`.

## 14. readingHistory

```js
{ id: 'rh_001', userId: 'u_maya', storyId: 'st_0012', readAt: '2026-11-16T21:00:00.000Z' }
```
Opening a story page (user navigation) upserts a record for that story (`readAt=now`). "Clear all history"
button empties the array (confirm dialog). Toggle "Remove from history" per row.

## 15. settings (current user)

```js
{
  email: 'maya.lindqvist@fastmail.com',
  allowEmailReplies: true,
  emailNotifications: { storyRecommendations: true, newFollowers: true, responses: true, claps: false,
                        mentions: true, publicationSubmissions: true, newsletter: true },
  pushNotifications: false,
  defaultResponseSort: 'relevant',  // 'relevant' | 'recent'
  hideActivity: false,              // hide claps/responses from profile
  readingFont: 'serif'              // P2 display pref
}
```

## 16. ui (persisted preferences only)

```js
{ sidebarOpen: true, homeTab: 'for-you', dismissedTips: [] }
```
Do not store transient UI (open menus, drawer state, hover) in state.

## 17. Generated images

`coverImage`, `previewImage`, `image` blocks store a token `cover:<seed>:<variant>` or a data-URI (user
upload via FileReader). `src/utils/art.js` exports `coverDataUri(token)` → deterministic SVG data URI
(palette + shapes chosen from a hash of the seed). Avatars & publication logos are rendered by components
from `avatarColor`/`logoColor` + initials. Users may also upload an image in the editor/publish dialog:
read with `FileReader.readAsDataURL`, downscale to ≤ 1200px wide via canvas (keep state small), store data URI.

## 18. Relationships

```
users 1─* stories (authorId)            publications 1─* stories (publicationId)
users *─* publications (ownerId/editorIds/writerIds)
stories 1─* submissions *─1 publications
users 1─* lists 1─* items → stories     users *─* lists via listSaves
stories|lists 1─* responses (targetType/targetId); responses 1─* responses (parentResponseId)
users 1─* claps → stories|lists|responses
users 1─* follows → users|publications|topics
stories *─* topics (topicIds)
```

## 19. Suggested `createInitialData()` skeleton

```js
// src/data/seed.js
import { USERS } from './seed/users.js'
import { PUBLICATIONS } from './seed/publications.js'
import { TOPICS } from './seed/topics.js'
import { STORIES } from './seed/stories.js'          // largest file; bodies inline
import { RESPONSES } from './seed/responses.js'
import { LISTS, LIST_SAVES } from './seed/lists.js'
import { SUBMISSIONS, CLAPS, HIGHLIGHTS, FOLLOWS, MUTES, NOTIFICATIONS, READING_HISTORY } from './seed/activity.js'

const clone = (x) => JSON.parse(JSON.stringify(x))

export function createInitialData() {
  return clone({
    currentUserId: 'u_maya',
    users: USERS, publications: PUBLICATIONS, topics: TOPICS, stories: STORIES,
    submissions: SUBMISSIONS, lists: LISTS, listSaves: LIST_SAVES, responses: RESPONSES,
    claps: CLAPS, highlights: HIGHLIGHTS, follows: FOLLOWS, mutes: MUTES,
    notifications: NOTIFICATIONS, readingHistory: READING_HISTORY,
    settings: { /* §15 */ }, ui: { sidebarOpen: true, homeTab: 'for-you', dismissedTips: [] },
  })
}
```
`seed.js` is imported by `vite.config.js` (Node) — keep it free of browser APIs and CSS/asset imports.
