# Medium — Research Summary

> Plan agent, 2026-11-18. Companion docs: `../DESIGN.md` (visual spec), `data_model.md` (state),
> `../TODO.md` (build plan). Brief: `../SEED.md` (tier A, culture content; must-have workflows:
> **drafts, publish, lists, responses, publications**). Runtime: `../../../HARBOR_CONTRACT.md`.

## 1. Product overview

Medium (medium.com) is an open publishing platform for long-form writing. Anyone can write a
story in a minimalist rich-text editor and publish it to their profile or to a **publication**
(a multi-author, editor-curated magazine on Medium). Readers follow writers, publications and
topics; they **clap** (1–50 per story), write **responses** (threaded comments), **highlight**
passages and save stories into **lists** (the default private "Reading list" plus any number of
public/private lists). The Medium Partner Program lets writers paywall ("member-only") stories,
marked with a gold star.

Brand/UI identity: white canvas, near-black `#242424` text, Medium green `#1A8917` for actions,
serif reading column 680px wide, sans UI chrome, 1px `#F2F2F2` hairlines everywhere.

## 2. Personas & daily workflows

| Persona | Primary workflows |
|---------|-------------------|
| **Writer** (default user Maya Lindqvist, essayist & publication owner) | Start a story → autosaved **draft** → edit over days from *Your stories › Drafts* → **Publish** dialog (preview title/subtitle/image, topics ≤5, publication, paywall, schedule) → monitor claps/responses/stats → edit/unlist/delete |
| **Reader** | Browse home feed (For you / Following / topic tabs) → read story → clap, **respond**, highlight, **save to list** → curate lists in **Library** → follow authors/publications/topics |
| **Publication editor/owner** | Create **publication** → set info, topics, nav, submission policy → add writers/editors → review **submissions** (approve & publish / request edits / decline) → feature stories on the publication homepage |
| **Contributing writer** | Submit draft to a publication → track status in *Your stories › Submissions* → withdraw / resubmit after edits |

## 3. Feature inventory (P0 = shell, P1 = core workflows, P2 = depth)

### Core shell
- P0 Top bar: hamburger, logo, search pill, Write, bell (unread dot), avatar menu.
- P0 Left sidebar: Home, Library, Profile, Stories, Stats; Following section.
- P0 Right rail on home/profile: Staff Picks, Recommended topics, Who to follow, Recently saved, footer links.
- P0 State load/save via `templates/dataManager.js` & `templates/state-api.js`; routes deep-linkable with `?sid=`.

### Drafts (SEED workflow)
- P1 `Write` → `/new-story` creates a draft record immediately on first keystroke (not on mere navigation) and routes to `/p/:id/edit`.
- P1 Editor: title + block body; Enter = new paragraph; selection toolbar (B, i, link, H3, H4, quote/pull-quote); "+" inserter (image, divider, code block); autosave indicator "Saving…" → "Saved"; header "Draft in Maya Lindqvist".
- P1 *Your stories* `/me/stories`: tabs Drafts / Scheduled / Published / Unlisted / Submissions with counts; row menus: Edit draft, Delete draft (confirm), Submit to publication.
- P2 Share draft link (copy), Hints & keyboard shortcuts modal, import story (paste URL → creates draft with placeholder).

### Publish (SEED workflow)
- P1 Publish overlay: Story Preview (image chooser from story images or upload, preview title, preview subtitle, note text); Publishing to (self or publication picker); topics (≤5, autocomplete); Partner Program paywall checkbox; email-subscribers checkbox; **Publish now** / **Schedule for later** (date+time).
- P1 After publish: navigate to story page; "Your story is published" share modal (copy link).
- P1 Edit published story: editor header shows "Save and publish"; story settings page (unlisted, allow responses, slug, SEO, license).
- P1 Unlist / relist, delete published story.

### Lists (SEED workflow)
- P1 Bookmark button on cards & story page → list-picker popover (checkboxes per list, Reading list first) → "Create new list" modal (name ≤60, description ≤280, Make it private).
- P1 Library `/me/lists`: tabs Your lists / Saved lists / Highlights / Reading history / Responses; "New list" button.
- P1 List page: header (owner, name, description, count, visibility), item notes ("Add a note"), remove item, menu: Edit list info, Make private/public, Delete list (not Reading list); Save list (others' public lists) → Saved lists.
- P2 Reorder items (drag handle + "Reorder" mode), clap/respond on public lists, share list.

### Responses (SEED workflow)
- P1 Responses drawer on story page (and inline "Responses (N)" section under article): composer ("What are your thoughts?" → expands with B/I, Cancel, Respond), sort Most relevant / Most recent, threaded replies, clap on response, own-response menu (Edit / Delete), author-side menu on own story (Hide response), "Show hidden" for author.
- P1 Library › Responses tab lists my responses with links.
- P2 Respond from highlight (quote), responses on lists, story setting "Allow responses" off → composer replaced by "Responses are turned off for this story."

### Publications (SEED workflow)
- P1 Publication homepage `/:pubSlug` (header band, nav tabs, Follow, featured grid, Latest stories) and About page (description, editors, writers, follower count, submission guidelines).
- P1 `/new-publication` creation form; `/me/publications` list (owner/editor/writer sections).
- P1 Manage publication `/:pubSlug/manage`: Submissions inbox (approve & publish / request edits / decline), Stories (published in pub; remove from publication; feature/unfeature), Writers & editors (add by username search, remove, promote to editor), Info & homepage (name, tagline, description, topics, nav items, logo colour), Submission settings (open / writers only / closed + guidelines).
- P1 Writer side: submit draft to publication (modal), Submissions tab with status badges, withdraw, resubmit.

### Reading & discovery
- P1 Home feed tabs: For you, Following, Featured, followed topics (+ manage topics). Feed cards with clap/response counts, member star, bookmark, "…" menu (follow author/pub, mute).
- P1 Story page: byline + Follow, action bar top & bottom, body render (all block types), topic pills, author card, "More from <author>", "Recommended from Medium".
- P1 Claps (1–50, long-press), follow/unfollow user/pub/topic.
- P1 Search `/search?q=` with Stories / People / Publications / Topics / Lists tabs.
- P1 Profile `/@:username`: Home / Lists / About tabs, right rail with follow/edit profile.
- P1 Topic page `/tag/:slug`: header, Follow, Recommended/Latest stories, related topics.
- P1 Notifications `/me/notifications`: All / Responses tabs, unread styling, mark all read.
- P2 Highlights (select text → Highlight), Stats `/me/stats`, Settings `/me/settings`, profile edit modal, mute & "Show less like this", reading history management, Following management `/me/following`.

## 4. View layouts (desktop ≥ 1080px)

- **Home `/`**: top bar 57px; sidebar 240px; main 728px column: sticky tab row then feed (story cards separated by hairlines). Right rail 368px: "Staff Picks" (3 compact items + "See the full list"), "Recommended topics" pills (7) + "See more topics", "Who to follow" (3 rows: avatar, name, bio clamp, Follow outline pill) + "See more suggestions", "Recently saved" (4 items + "See all (N)"), footer links.
- **Story `/@user/slug-id`**: sidebar collapsed by default on story pages (hamburger re-opens). 680px column: title, subtitle, byline (44px avatar, name · Follow, "Published in X · 7 min read · Nov 3, 2026"), action bar, body, topic pills, bottom action bar, author card, responses section, More from author (2×2), Recommended.
- **Editor `/p/:id/edit`**: dedicated 65px top bar (monogram, "Draft in Maya Lindqvist", "Saved"; right: Publish green-sm, "…", bell, avatar); no sidebar; 700px canvas with serif placeholders.
- **Publish overlay**: two columns — "Story Preview" left, "Publishing to: Maya Lindqvist" right.
- **Your stories `/me/stories`**: H1 "Your stories" + "Write a story" (green) + "Import a story" (outline); tabs with counts; rows of title / snippet / meta + chevron menu.
- **Library `/me/lists`**: H1 "Your library" + "New list" (green); tabs; grid of list cards (single column, 140px tall).
- **List page `/@user/list/slug-id`**: owner row, H1 list name, description, "N stories · Private 🔒", action icons; then items as feed cards with note blocks.
- **Publication `/:slug`**: full-width header band (logo 48px square, name 32px bold, tagline), nav tabs uppercase 13px letter-spaced (see `screenshots/publication_header_nav.jpg`), Follow pill and "Submit" link in nav; featured grid (1 large + 2 small), "Latest" list with feed cards; right side About blurb + editors.
- **Profile `/@user`**: main column H1 name (42px) + tabs Home/Lists/About; right rail avatar 88px, name, followers, bio, Edit profile (green text) or Follow + subscribe icon, "Following" list (5) — see `screenshots/profile_logged_in_with_lists_rail.jpg` (older left icon rail; use current 240px sidebar instead).

## 5. Reference screenshots (`screenshots/`)

Image search on this network returned mostly stock imagery; medium.com / miro.medium.com and the
Help Center were unreachable. The five genuine Medium captures kept:

| File | What it shows | Use it for |
|------|---------------|------------|
| `feed_trending_and_story_list.jpg` | Logged-out home (2022–24): logo, "Trending on Medium" numbered grid, story list items (author line 13px, bold 20px title, grey subtitle, meta "Nov 3 · 8 min read · Advice ★", bookmark-plus + "…" icons, 160×107 thumbnail), right rail "Discover more of what matters to you" topic pills (outlined variant) and footer links | Feed card anatomy, spacing, topic pills, footer |
| `brand_landing_header.jpg` | Yellow logged-out landing header, black "Get Started" pill | Logo lockup, black pill button |
| `profile_logged_in_with_lists_rail.jpg` | Logged-in profile (older icon rail), green notification badge, right rail: search pill, 88px avatar, "15.3K Followers", bio, green "Edit profile", "Lists" section with 3-image stacked covers + "N stories", footer | Profile right rail, list mini-cards, green accents |
| `publication_header_nav.jpg` | Towards Data Science publication header band (dark blue), tagline, uppercase nav tabs, divider, "SUBMIT", "Following ▾" pill | Publication homepage header |
| `article_body_serif_caption.jpg` | Story body in serif (dark-mode reader), centred figcaption "Photo by …", paywall prompt | Body typography, caption style (implement light mode only) |

Everything else in DESIGN.md comes from Medium's measured production CSS (680px column; title
42/52 bold sans; body 20/32 serif; colours `#242424 / #6B6B6B / #1A8917 / #F2F2F2`).

## 6. Data model overview

See `data_model.md`. Entities: users, publications, topics, stories (with block bodies, status
draft/scheduled/published, visibility public/unlisted), submissions, lists (+ items with notes),
listSaves, responses (threaded, hide/edit/delete), claps, highlights, follows, mutes,
notifications, readingHistory, settings, ui.

## 7. Out of scope (and why)

- Sign in / sign up / Google-Apple-Facebook auth, password, 2FA, account deletion — the sandbox starts
  signed in as **Maya Lindqvist (@mayalindqvist)**; "Sign out" in the avatar menu shows a toast
  "Signing out is disabled in this demo".
- Membership checkout / payments / Stripe; "Become a member" links go to a static `/plans` page with
  disabled buttons.
- Real email sending (newsletter / "email subscribers" just records a boolean), real audio "Listen",
  real embeds (Twitter/YouTube) — embed block stores the URL and renders a grey link card.
- Mobile app parity, custom domains, Medium API/integration tokens, import from URL fetching (P2 creates
  a draft with the URL as text only).
- Any timer-driven "live" activity (new claps arriving, etc.) — forbidden by HARBOR §1.
