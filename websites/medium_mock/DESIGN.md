# Design System Inspired by Medium (medium.com, logged-in web app, 2025–2026 layout)

> Sources: reference screenshots in `assets/screenshots/`, measured values published for medium.com
> article pages (680px column, sohne/source-serif sizes), a reverse-engineered Medium token sheet,
> and Medium Help Center descriptions. Where a value could not be confirmed from a screenshot,
> the closest value from Medium's production CSS conventions is given. **Treat every hex/px value
> below as the spec** — do not substitute Tailwind defaults.

## 1. Visual Theme & Atmosphere

Medium is a typography-first reading product. The canvas is pure white, text is a warm
near-black `#242424` (never `#000`), and almost everything structural is done with
1px hairlines in `#F2F2F2` rather than cards or shadows. The UI chrome (nav, bylines,
buttons, metadata) is set in a neutral grotesque sans (Medium uses *Söhne*; we use the
Helvetica Neue stack), while story bodies are set in a large, airy serif at 20px / 32px
in a 680px column — it should feel like a magazine page, not a dashboard.

Colour is used as punctuation: Medium green `#1A8917` appears only on action surfaces
(Publish, Respond, Create, Write a story, "Edit profile" text link, notification dot),
the gold member star `#FFC017` marks member-only stories, and black `#191919` pills are
used for Follow / Get started. Overlays are *white* translucent (not dark), menus and
popovers float with a soft shadow, and icons are thin 1–1.5px outline glyphs in
`#6B6B6B` that become `#242424` on hover/active.

## 2. Color Palette & Roles

### Primary
- **Brand Green** (`#1A8917`): Primary CTA fill — Publish, Publish now, Respond, Create (list), Write a story, Save (settings), Approve & publish. Also "Edit profile" / green text links and the notification dot.
- **Brand Green Hover** (`#0F730C`): Hover state of green buttons.
- **Brand Green Disabled** (`#1A8917` at `opacity: .3`): Respond/Create/Publish when form invalid.
- **Background** (`#FFFFFF`): Every page canvas, top bar, sidebar, editor.
- **Text Primary** (`#242424`): Titles, names, body, active nav items, active tab.
- **Text Secondary** (`#6B6B6B`): Subtitles in feed, meta rows (date, read time), inactive tabs, sidebar items, icons.
- **Text Tertiary / Placeholder** (`#B3B3B1`): Editor placeholders ("Title", "Tell your story…"), the "+" insert button outline.
- **Black Pill** (`#191919`): "Follow" button fill, "Get started"; hover `#000000`.

### Accent
- **Member Star** (`#FFC017`): 15px four-point sparkle/star before the date on member-only stories.
- **Highlight** (`#E7F7E7` on body text, i.e. `rgba(26,137,23,.1)`): reader highlights in story body.
- **Selection Toolbar** (`#1A1A1A` bg, `#FFFFFF` icons, active icon `#7EE787`-ish → use `#8BD18A`): floating editor/reader toolbar.

### Interactive
- **Link in body** (`#242424`, underline `1px` `rgba(36,36,36,.4)`; hover underline `#242424`).
- **Green text link** (`#1A8917`, hover `#0F730C`): "Edit profile", "See all (186)", "Create new list".
- **Grey text link** (`#6B6B6B`, hover `#242424`): "Cancel", "Schedule for later", sidebar items, footer links.
- **Focus ring**: `outline: 1px solid #242424` on inputs; buttons none.

### Surface & Borders
- **Subtle surface** (`#F9F9F9`): search pill bg, list-card bg, code block bg, form inputs in modals, publish-preview image box.
- **Chip surface** (`#F2F2F2`): topic pills, tag chips, hover bg for menu rows (`#F9F9F9` acceptable).
- **Hairline** (`#F2F2F2`): top bar bottom border, sidebar right border, right-rail left border, feed item separators, tab-row bottom border, article action-bar top+bottom borders.
- **Input underline** (`#E6E6E6`): publish-preview title/subtitle underline inputs; focus `#242424`.
- **Outline button border** (`#242424` for black outline, `#1A8917` for green outline).
- **Modal overlay** (`rgba(255,255,255,0.94)`): full-viewport white scrim behind modals (Medium's overlays are light, not dark).
- **Drawer scrim** (`rgba(0,0,0,0)` — none): the responses drawer slides over content without dimming.

### Status
- **Success** (`#1A8917`): toast check icon, "Approved" submission badge text.
- **Warning** (`#C89A16`): "Edits requested" submission badge, "Scheduled" label.
- **Error / Destructive** (`#C94A4A`): "Delete" confirm button fill, validation text ("Name is required"), "Declined" badge.
- **Info** (`#386DBA`): rarely used — "In review" badge only.
- **Badge backgrounds**: use the status colour at 10% alpha with the status colour text, 12px, padding 2px 8px, radius 99em.

## 3. Typography Rules

Fonts (offline only — no Google Fonts / CDN):
- **UI sans (Söhne stand-in)**: `-apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif` → CSS var `--font-sans`.
- **Reading serif (source-serif-pro stand-in)**: `npm i @fontsource/source-serif-4` (import 400, 400-italic, 700) → `"Source Serif 4", Charter, Georgia, Cambria, "Times New Roman", serif` → `--font-serif`.
- **Mono**: `Menlo, Monaco, "Courier New", Courier, monospace` → `--font-mono`.
- **Logo wordmark**: render "Medium" in `--font-serif`, 700, 26px, letter-spacing −0.04em next to the monogram SVG (see §5 Logo).

| Role | Font | Size | Weight | Line Height | Letter Spacing | Colour |
|------|------|------|--------|-------------|----------------|--------|
| Article title (H1) | sans | 42px (mobile 32px) | 700 | 52px | −0.011em | #242424 |
| Article subtitle | sans | 22px | 400 | 28px | −0.011em | #6B6B6B |
| Article body paragraph | serif | 20px (mobile 18px) | 400 | 32px | −0.003em | #242424 |
| Article H3 ("big T") | sans | 24px | 700 | 30px | −0.016em | #242424 |
| Article H4 ("small T") | sans | 20px | 700 | 24px | 0 | #242424 |
| Blockquote | serif italic | 20px | 400 | 32px | −0.003em | #242424 (3px left bar) |
| Pull quote | serif italic | 30px | 400 | 44px | −0.014em | #6B6B6B |
| Code block | mono | 14px | 400 | 1.18 | −0.022em | #242424 |
| Figcaption | sans | 14px | 400 | 20px | 0 | #6B6B6B, centred |
| Page H1 ("Your stories", "Your library", profile name) | sans | 42px | 700 | 52px | −0.011em | #242424 |
| Section heading in right rail ("Staff Picks") | sans | 16px | 600 | 20px | 0 | #242424 |
| Feed card title | sans | 20px (list detail 24px) | 700 | 24px | −0.016em | #242424 |
| Feed card subtitle | sans | 16px | 400 | 20px | 0 | #6B6B6B (2-line clamp) |
| Byline row ("In X by Y") | sans | 13px | 400 | 20px | 0 | names #242424, "In"/"by" #6B6B6B |
| Meta row (date, claps, responses) | sans | 13px | 400 | 20px | 0 | #6B6B6B |
| Tab label | sans | 14px | 400 | 20px | 0 | inactive #6B6B6B, active #242424 |
| Sidebar nav item | sans | 14px | 400 | 20px | 0 | #6B6B6B; active #242424 |
| Button label | sans | 14px | 400 | 20px | 0 | — |
| Response body | sans | 14px | 400 | 20px | 0 | #242424 |
| Editor title placeholder | serif | 42px | 400 | 1.25 | −0.012em | #B3B3B1 |
| Editor body placeholder | serif | 21px | 400 | 1.58 | −0.003em | #B3B3B1 |
| Toast | sans | 14px | 400 | 20px | 0 | #FFFFFF on #242424 |

## 4. Spacing & Layout

- **Top bar**: height `57px`, padding `0 24px`, border-bottom `1px solid #F2F2F2`, sticky, z-index 50.
  - Left cluster (gap 16px): hamburger icon (24px, toggles sidebar), logo (monogram 34×19 + wordmark, total ≈112×25), search pill.
  - Search pill: width `240px`, height `40px`, bg `#F9F9F9`, radius `20px`, padding `0 12px`, 24px magnifier icon `#6B6B6B`, placeholder "Search" `#6B6B6B` 14px, no border.
  - Right cluster (gap 32px): "Write" (24px pencil-square icon + "Write" 14px #6B6B6B, hover #242424), bell icon 24px (green 8px dot top-right when unread), avatar 32px circle (opens account menu).
- **Left sidebar**: width `240px`, fixed under top bar, border-right `1px solid #F2F2F2`, padding `24px 0`. Nav items: height `40px`, padding `0 24px`, icon 24px + label gap 16px. Sections: [Home, Library, Profile, Stories, Stats] → 1px divider (margin 24px) → "Following" header row (14px #6B6B6B) → followed writers/pubs rows (24px avatars, 14px name, green 6px dot if new story) → "Find writers and publications to follow." / "See suggestions" link. Sidebar collapses (hidden) when hamburger toggled; collapsed by default < 1080px.
- **Main column**: max-width `728px`, horizontally centred in the space right of the sidebar, padding `0 24px`.
- **Right rail** (home, profile, story pages *without* reading focus): width `368px`, padding `40px 0 0 40px`, border-left `1px solid #F2F2F2`, sticky top 57px, min-height `100vh`. Footer links at bottom (13px #6B6B6B: Help · Status · About · Careers · Press · Blog · Privacy · Rules · Terms · Text to speech).
- **Article column**: max-width `680px`, centered, page padding top 48px; story pages hide the right rail and use the full width minus sidebar.
- **Feed item**: padding `24px 0`, border-bottom `1px solid #F2F2F2`; thumbnail `160×107` (aspect 3:2), radius 2px, margin-left 56px (desktop); hidden < 600px → `80×53`.
- **Tabs row**: height `48px`, gap `32px`, border-bottom `1px solid #F2F2F2`, active tab has `border-bottom: 1px solid #242424` overlapping the hairline. Home tabs row is sticky under the top bar with white bg.
- **Editor**: top bar 65px (no search, no sidebar). Canvas width `700px`, padding-top 48px; "+" insert button sits 56px left of the text column.
- **Responses drawer**: right-anchored, width `414px`, height `100vh`, padding `24px`, z-index 60, slides in 250ms ease.
- **Modals**: width `600px` (create list / submit to publication / delete), padding `56px 64px 48px`, radius `4px`.
- **Publish overlay**: full-screen white page (z 70), inner container max-width `1040px`, two columns with `80px` gap, padding-top 96px; close X 24px at top-right (24px inset).
- **Radii**: pills `99em`; modals/menus/cards `4px`; thumbnails `2px`; avatars `50%`; list-card covers `2px`; publication logos `4px` (square) or circle in bylines.
- **Gaps**: generic 8 / 16 / 24 / 32 / 48 scale.

## 5. Component Patterns

**Logo (inline SVG, no remote assets)** — monogram path (viewBox `0 0 1043.63 592.71`, fill `#000`):
```
M588.67 296.36c0 163.67-131.78 296.35-294.33 296.35S0 460 0 296.36 131.78 0 294.34 0s294.33 132.69 294.33 296.36
M911.56 296.36c0 154.06-65.89 279-147.17 279s-147.17-124.94-147.17-279 65.88-279 147.16-279 147.17 124.9 147.17 279
M1043.63 296.36c0 138-23.17 249.94-51.76 249.94s-51.75-111.91-51.75-249.94 23.17-249.94 51.75-249.94 51.76 111.9 51.76 249.94
```
Render at height 19px, followed by the "Medium" wordmark. In the editor top bar show the monogram only. Favicon: same monogram as `public/favicon.svg`. `<title>`: "Medium" on home; "<Story title> | by <Author> | <Pub or 'Medium'>" on story pages.

**Buttons**
```css
.btn { font: 400 14px/20px var(--font-sans); border-radius: 99em; padding: 8px 16px; cursor: pointer; }
.btn-green { background:#1A8917; color:#fff; border:1px solid #1A8917; }       /* Publish, Respond, Create */
.btn-green:hover { background:#0F730C; border-color:#0F730C; }
.btn-green:disabled { opacity:.3; cursor:default; }
.btn-green-sm { padding:4px 12px; }                                           /* editor "Publish", "Respond" */
.btn-black { background:#191919; color:#fff; border:1px solid #191919; }       /* Follow */
.btn-outline { background:#fff; color:#242424; border:1px solid #242424; }     /* Following, Cancel(alt) */
.btn-outline-green { background:#fff; color:#1A8917; border:1px solid #1A8917; } /* Cancel in green modals */
.btn-danger { background:#C94A4A; color:#fff; border:1px solid #C94A4A; }      /* Delete confirm */
.btn-text { background:none; border:none; color:#6B6B6B; padding:0; }         /* Cancel, Reply */
```
"Following" outline button text changes to "Unfollow" on hover (Medium behaviour).

**Icons**: `lucide-react` at `strokeWidth={1.5}`, size 24 (nav/top bar) or 20/24 (action bars), colour `#6B6B6B`, hover `#242424`. Clap icon: draw a custom inline SVG (hand with burst lines); filled black version when the user has clapped. Bookmark-plus (outline) → filled black bookmark when saved to any list. Response icon = speech bubble. Member star: 4-point sparkle in `#FFC017`.

**Inputs**
- Modal text inputs: bg `#F9F9F9`, border none, radius 4px, padding `12px 16px`, 16px sans, char counter right-aligned 13px #6B6B6B ("12/60").
- Underline inputs (publish preview, profile edit): border none, border-bottom `1px solid #E6E6E6`, padding `6px 0`, focus border `#242424`.
- Checkbox: 16px square, border 1px `#6B6B6B`, checked fill `#1A8917` with white check.
- Toggle (settings): 32×20 track, off `#E6E6E6`, on `#1A8917`.
- Response composer: white box, `box-shadow: rgba(0,0,0,0.12) 0 2px 8px`, radius 4px, padding 14px; collapsed shows placeholder "What are your thoughts?" only; expanded shows author row (32px avatar + name), auto-growing textarea, B / i buttons left, "Cancel" text + "Respond" green-sm right.

**Popovers / menus** (bookmark list picker, "…" menus, account menu, publication picker)
```css
.menu { background:#fff; border:1px solid #F2F2F2; border-radius:4px;
        box-shadow: rgba(0,0,0,0.15) 0 2px 10px; padding:8px 0; min-width:200px; }
.menu-item { font:14px/20px var(--font-sans); color:#6B6B6B; padding:8px 20px; }
.menu-item:hover { color:#242424; }
.menu-item.danger { color:#C94A4A; }
.menu-divider { border-top:1px solid #F2F2F2; margin:8px 0; }
```
A 14px rotated-square caret points at the trigger. Close on outside click and Esc.

**Bookmark list picker** (popover 280px): rows = 16px checkbox + list name (14px #242424) + lock icon if private; first row always "Reading list"; footer divider + "Create new list" (green text). Toggling a checkbox saves immediately.

**Topic pill**: bg `#F2F2F2`, color `#242424`, 14px, padding `8px 16px`, radius 99em; hover bg `#E6E6E6`. Selected/followed in tab row: plain text tabs (not pills).

**List card** (Library / profile Lists tab): bg `#F9F9F9`, radius 4px, height 140px, flex row. Left (padding 24px): owner 20px avatar + name 13px; list name 20px 700; "N stories" + lock icon 13px #6B6B6B; bottom-left bookmark/… icons. Right: three overlapping cover thumbnails (each 140×140 area, offset 2px white border, z-stacked from left), grey `#F2F2F2` placeholders if fewer than 3 stories.

**Story card (feed)** — see §4 Feed item; hover shows nothing (no card lift). Title and subtitle link to the story. Bottom-right icons: "Show less like this" (circle-minus), bookmark-plus, "…". The "…" menu: "Follow author", "Follow publication", "Mute author", "Mute publication", "Report story…".

**Article action bar**: `border-top` + `border-bottom` `1px solid #F2F2F2`, padding `3px 8px`, height 48px; left: clap (24px) + count 13px, gap 24px, response icon + count; right (gap 24px): bookmark-plus, play-circle ("Listen" — opens a toast "Listen is available in the Medium app"), share (opens menu: Copy link, Share on X, Share on LinkedIn, Share on Facebook), "…" (menu: Follow author, Mute author, Report story…; for own story: Edit story, Story settings, Story stats, Delete story).

**Clap interaction**: each click +1 (max 50 per user per target), shows floating "+N" bubble above the icon (black circle 40px white text, fades after 1s), icon becomes filled. Long-press (pointerdown ≥ 400ms) repeats every 120ms while held (user-driven; stop on pointerup).

**Toasts**: bottom-centre, bg `#242424`, white 14px, padding 12px 20px, radius 4px, 3s. E.g. "Saved to Reading list", "Link copied", "Story deleted", "Response published".

**Selection toolbar (editor)**: bg `#1A1A1A`, radius 5px, height 44px, padding 0 8px, icons white 20px: **B**, *i*, link, | T (H3), t (H4), “ (quote, 2nd press = pull quote). Arrow at bottom centre. Active state icon `#8BD18A`.

**Editor "+" button**: 32px circle, border 1px `#B3B3B1`, "+" `#B3B3B1`; on click rotates 45° and reveals a horizontal row of 32px circular outline buttons (green `#1A8917` border/icon): image, video, embed, code `{}`, new part `···`.

**Status badges**: 12px, padding 2px 8px, radius 99em; Pending review = `#6B6B6B` on `#F2F2F2`; In review = `#386DBA` on `rgba(56,109,186,.1)`; Edits requested = `#C89A16` on `rgba(200,154,22,.12)`; Declined = `#C94A4A` on `rgba(201,74,74,.1)`; Approved/Published = `#1A8917` on `rgba(26,137,23,.1)`; Draft = `#6B6B6B` on `#F2F2F2`; Unlisted = `#6B6B6B` with eye-off icon.

**Avatars**: generated locally — circle with deterministic background from a 10-colour palette (`#E8D5B7 #B5C9C3 #C9B8D8 #F2C6B4 #A9C6E8 #D8E2B6 #E3B5B5 #BFD7EA #F0DDA8 #C7C7C7`) and 1–2 initials in `#242424` sans 600. Sizes used: 20, 24, 32, 44, 48, 72, 88, 120.

**Cover images**: generated SVG data-URIs (deterministic from story id): soft two-stop gradient from a curated palette + 2–4 abstract shapes (circles/arches/lines). No remote images.

## 6. Shadow & Elevation

| Level | Use | Value |
|-------|-----|-------|
| 0 | Feed cards, list cards, page sections | none (hairlines only) |
| 1 | Response composer, search suggestion dropdown | `rgba(0,0,0,0.12) 0 2px 8px` |
| 2 | Popovers / menus / bookmark picker / account menu | `rgba(0,0,0,0.15) 0 2px 10px` + `1px solid #F2F2F2` |
| 3 | Responses drawer | `rgba(0,0,0,0.15) 0 4px 12px` (left edge) |
| 4 | Modals (create list, delete, submit) | `rgba(0,0,0,0.15) 0 2px 10px` over `rgba(255,255,255,0.94)` scrim |
| — | Publish overlay | full-screen white, no shadow |

Transitions: menus fade 150ms; drawer slide 250ms `cubic-bezier(.2,0,0,1)`; clap bubble 1s ease-out.
