# Design System Inspired by Yahoo Mail (2025–2026 desktop "New Yahoo Mail")

Reference screenshots live in `assets/screenshots/`. The **primary visual target** is the 2025 redesign
(`01_inbox_2025_old_vs_new_KEY.png` right half, `02_inbox_2025_primary_tab_starred_panel.jpg`,
`03_left_nav_2025_more_new_folder_dialog.jpg`). Older 2019–2024 screenshots (purple header) are used only for
*structure* of screens that kept the same layout (Settings, Filters editor, message reading view, contacts).
Re-skin those screens in the 2025 visual language described below — **no purple gradient header bar**.

## 1. Visual Theme & Atmosphere

Bright, airy, rounded. A very light grey app canvas (`#F5F5F7`) holds white rounded "cards": the message list
card in the centre and an optional Starred/Contacts card on the right. The left column sits directly on the
canvas (no card) with a big violet **Compose** pill at the top. Purple (Yahoo "grape" / ultraviolet) is the
single accent: Compose button, active tab underline, active nav item, links, primary buttons, focus rings.
Typography is large and friendly (Yahoo Sans in the real product — use Inter as the offline stand-in), with
generous row height (~56px) and lots of white space. Unread = bold black text; read = regular grey text.
Avatars are coloured circles with 1–2 letter initials. Stars are warm yellow.

## 2. Color Palette & Roles

### Primary
- **Yahoo Purple / Brand** (`#6001D2`): Wordmark "yahoo!mail", active tab text, active nav text, links.
- **Compose / Primary Button** (`#7B2CF6`): Compose pill, "Create", "Save", "Send" buttons (sampled `#7828F8`–`#7E2AFC`).
- **Primary Button Hover** (`#6A1FE0`); **Pressed** (`#5A14C8`).
- **Canvas Background** (`#F5F5F7`): page behind cards, left nav background.
- **Card / Surface** (`#FFFFFF`): message list card, reading pane, right panel, dialogs, menus.
- **Text Primary** (`#1D1D1F`): unread sender/subject, headings.
- **Text Secondary** (`#5B5B66`): read sender/subject, body copy in lists.
- **Text Muted** (`#8A8A99`): snippets, dates of read rows, helper text, placeholders.

### Accent
- **Active Nav / Selection Tint** (`#EFE7FE`): active left-nav pill background, selected row background.
- **Selected Row (checkbox checked)** (`#E9DFFD`), **Row Hover** (`#F5F5F7`).
- **Star** (`#F0B428`): filled star icon (sampled `#E4BA36`). Empty star outline `#B0B0BB`.
- **Unread dot / count** (`#6001D2`): count numbers next to Inbox use `#5B5B66` 12px semibold.

### Interactive
- **Link** (`#6001D2`), **Link Hover** (`#4A00A3`, underline).
- **Focus ring** (`0 0 0 2px #FFFFFF, 0 0 0 4px #7B2CF6`).
- **Secondary Button** bg `#FFFFFF`, border `1px solid #D6D6DE`, text `#1D1D1F`, hover bg `#F5F5F7`.
- **Ghost Icon Button** 32×32, radius 16, icon `#5B5B66`, hover bg `#EDEDF2`.

### Surface & Borders
- **Divider / Row border** (`#ECECF1`), **Input border** (`#D6D6DE`), **Input border focus** (`#7B2CF6`).
- **Search field bg** (`#EEEEF2`), **Search field focus bg** `#FFFFFF` with border `#7B2CF6`.
- **Tooltip** bg `#1D1D1F`, text white 12px.
- **Overlay scrim** `rgba(29,29,31,0.40)`.

### Status
- **Success** (`#1A8754`), **Warning** (`#B76E00`), **Error / Destructive** (`#D92D20`) (delete confirm buttons, validation text),
  **Info banner** bg `#F0EBFF` text `#3F0099` (e.g. "Looking for older messages? Try checking the All tab.").

### Avatar colours (initial circles, choose by hash of email)
`#7B843B`, `#A07A40`, `#5B8DB8`, `#C2185B`, `#00897B`, `#6D4C41`, `#7E57C2`, `#EF6C00`, `#546E7A`, `#2E7D32`.
White initials, 600 weight.

### Dark mode (P2, Settings > Appearance)
Canvas `#121214`, card `#1E1E22`, text `#ECECF1`, muted `#9A9AA6`, divider `#2C2C33`, accent stays `#9B5CFF`.

## 3. Typography Rules

Font stack: `"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif` (install `@fontsource/inter` 400/500/600/700 — no CDN).

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|------|------|------|--------|-------------|----------------|
| Wordmark "yahoo!mail" | Inter | 26px | 800 | 32px | -0.03em |
| Page / pane title (e.g. "Filters", message subject) | Inter | 22px | 600 | 28px | -0.01em |
| Section heading (Settings "Your filters") | Inter | 16px | 600 | 22px | 0 |
| Nav item | Inter | 14px | 500 (active 600) | 20px | 0 |
| Category tab | Inter | 14px | 500 (active 600) | 20px | 0 |
| List sender (unread / read) | Inter | 14px | 700 / 400 | 20px | 0 |
| List subject (unread / read) | Inter | 14px | 600 / 400 | 20px | 0 |
| List snippet | Inter | 14px | 400 | 20px | 0 |
| List date | Inter | 12px | 600 unread / 400 read | 16px | 0 |
| Message body | Inter | 15px | 400 | 24px | 0 |
| Button | Inter | 14px | 600 | 20px | 0 |
| Caption / helper / counts | Inter | 12px | 400–500 | 16px | 0 |
| Group header ("Today", "Yesterday", "Last week") | Inter | 12px | 600 | 16px | 0.02em, color `#5B5B66` |

**Wordmark**: render the text `yahoo!mail` in `#6001D2`, lowercase, weight 800; the `!` is slanted (wrap in a span
with `display:inline-block; transform: skewX(-12deg)`), so it reads like the real "yahoo!mail" logo. Build it as
inline JSX/SVG — no remote image.

## 4. Spacing & Layout

Target viewport 1280×800 (must also work 1440×900 and 1920×1080).

- **Header height**: 64px; background = canvas `#F5F5F7`; no border.
  - Wordmark at left, x=24px, vertically centred; occupies the 232px left column.
  - Search field: starts at x=248px, width `min(640px, 50vw)`, height 44px, radius 22px, bg `#EEEEF2`,
    placeholder "Search your mail", sliders icon button (advanced search) 32px inside the right end;
    separate circular search button 44×44, white bg, `1px solid #D6D6DE`, magnifier icon, 8px gap.
  - Right cluster (right 24px): settings gear ghost button (opens Quick Settings panel), avatar circle 32px with
    user initials, then the user's first name 14px 500.
- **Left column (sidebar)**: 232px wide (compact mode 72px — icons + 11px labels underneath, as in screenshot 02).
  Padding 16px 12px. Compose pill: 168×48, radius 24, gap 8 icon(pencil 18px)+label, margin-bottom 16px.
  Nav item height 36px, padding 0 12px, radius 18px, icon 18px + 12px gap. Section headers ("Views", "Folders")
  12px 600 `#5B5B66` with right-aligned action link ("Hide"/"Show", "New folder" in `#6001D2`).
- **Main card**: margin 0 8px 8px 0, radius 16px, white, fills remaining width. Inner header row (category tabs
  or toolbar) 48px high with 16px horizontal padding and bottom border `#ECECF1`.
- **Message row**: 56px tall (Settings › Appearance "Spacious"=64 / "Comfortable"=56 / "Compact"=40),
  padding 0 16px, columns: checkbox 20px | 12px | avatar 28px | 12px | sender 184px | 16px | subject·snippet flex |
  attachment icon 20px | date 64px right-aligned. Hover reveals action icons over the date column.
- **Right panel**: 320px wide card (radius 16, margin-right 8px), collapsible via `>` chevron; tabs "Starred" | "Contacts".
- **Reading pane**: replaces list (default "List" layout), or splits right (`Right` layout, list 420px) / bottom.
- **Settings**: left settings menu 220px, middle column 420px, right detail/editor column flex (screenshot 08/09).
- **Dialogs**: width 400px (Create folder) / 560px (Add contact) / 640px (attachment preview: 80vw max), radius 16,
  padding 24px, title 20px 600, buttons right-aligned pills (Cancel secondary, primary purple), gap 12px.
- Gaps: card gap 8px; form field vertical gap 16px; settings section gap 32px.
- Border radius: pills 999px; cards 16px; inputs 8px (search 22px); menus 12px; attachment tiles 12px; chips 16px.

## 5. Component Patterns

```css
/* Compose pill */
.compose { height:48px; padding:0 24px; border-radius:24px; background:#7B2CF6; color:#fff;
  font:600 15px/20px Inter; display:inline-flex; gap:8px; align-items:center;
  box-shadow:0 2px 6px rgba(123,44,246,.30); }
.compose:hover { background:#6A1FE0; }

/* Primary / secondary pill buttons (Create, Save, Send / Cancel) */
.btn-primary { height:40px; padding:0 20px; border-radius:20px; background:#7B2CF6; color:#fff; font-weight:600; }
.btn-secondary { height:40px; padding:0 20px; border-radius:20px; background:#fff; border:1px solid #D6D6DE; color:#1D1D1F; }
.btn-danger { background:#D92D20; color:#fff; }

/* Category tabs (All / Primary / Offers / Social / Newsletters) */
.tab { height:48px; padding:0 14px; color:#5B5B66; font-weight:500; position:relative; }
.tab.active { color:#6001D2; font-weight:600; }
.tab.active::after { content:''; position:absolute; left:8px; right:8px; bottom:0; height:3px;
  border-radius:3px 3px 0 0; background:#6001D2; }

/* Left nav item */
.nav-item { height:36px; border-radius:18px; padding:0 12px; color:#1D1D1F; }
.nav-item:hover { background:#EDEDF2; }
.nav-item.active { background:#EFE7FE; color:#6001D2; font-weight:600; }
.nav-count { margin-left:auto; font:600 12px Inter; color:#5B5B66; }

/* Outlined text field (Create folder "Folder name", filter name) — floating label */
.field { border:1px solid #D6D6DE; border-radius:8px; height:48px; padding:0 14px; }
.field:focus-within { border:2px solid #7B2CF6; }
.field label { font-size:12px; color:#6001D2; background:#fff; padding:0 4px; position:absolute; top:-8px; left:10px; }

/* Recipient chip (To/CC) */
.chip { height:28px; border-radius:14px; background:#F0F0F4; padding:0 4px 0 2px; gap:6px; }
.chip .avatar { width:24px; height:24px; }
.chip.invalid { background:#FDECEA; color:#D92D20; }

/* Attachment tile (message view & compose) */
.att { width:160px; border:1px solid #ECECF1; border-radius:12px; overflow:hidden; }
.att .thumb { height:96px; background:#F5F5F7; display:grid; place-items:center; }
.att .meta { padding:8px 10px; font-size:12px; } /* name (ellipsis) + size "245 KB" */

/* Toast (bottom-centre) */
.toast { background:#1D1D1F; color:#fff; border-radius:12px; padding:12px 16px; font-size:14px; }
.toast a { color:#C9A8FF; font-weight:600; margin-left:16px; } /* "Undo" */

/* Menus / dropdowns */
.menu { background:#fff; border-radius:12px; padding:6px 0; min-width:200px; box-shadow: var(--shadow-menu); }
.menu-item { height:36px; padding:0 16px; font-size:14px; } .menu-item:hover { background:#F5F5F7; }
```

- **Message list group header**: 32px row, 12px 600 `#5B5B66`, padding-left 16px, sticky inside the card.
- **Conversation count badge**: after subject, `font-size:12px; padding:0 6px; border-radius:9px; background:#ECECF1; color:#5B5B66`.
- **Category label pill in All tab**: tiny 11px pill "Offers"/"Social"/"Newsletters" before subject, bg `#F0F0F4`.
- **Info banner** at bottom of Primary tab: "Looking for older messages? Try checking the All tab." with "checking the All tab" as a purple link.
- **Toolbar (selection mode)**: replaces tabs row; icon+label ghost buttons: Archive, Move ▾, Delete, Spam, ··· ;
  left: select-all checkbox with ▾ menu (All, None, Read, Unread, Starred, Unstarred); right: "Sort ▾".
- **Avatar**: circle, initials 600 white; 28px in list, 40px in message header, 64px in contact detail.

## 6. Shadow & Elevation

| Level | Use | Value |
|-------|-----|-------|
| 0 | Cards on canvas | none (cards distinguished by white vs `#F5F5F7`) |
| 1 | Compose pill, floating chips | `0 2px 6px rgba(123,44,246,.30)` |
| 2 | Menus, dropdowns, autocomplete, quick settings popover | `0 4px 16px rgba(0,0,0,.12), 0 1px 3px rgba(0,0,0,.08)` |
| 3 | Dialogs, compose pop-out | `0 12px 40px rgba(0,0,0,.20)` |
| Toast | bottom toast | `0 6px 20px rgba(0,0,0,.25)` |

Transitions: 150ms ease for hover/background, 200ms for panel collapse; no long animations.

## 7. Research corrections and canonical view choices (2026-11-18)

Preserve sections 1–6 as the inherited design vocabulary. The following refinements resolve conflicts with the inspected official source and current Help; they take precedence where different.

- **Reference date:** the verified official desktop redesign artwork was published June 11, 2024, not 2025. Local file names containing 2025 are retained. `assets/screenshots/official/desktop-overview.jpeg` is the best overall layout reference. No live authenticated mailbox was inspected; tokens and dimensions are implementation estimates, not claimed exact samples.
- **Visible category copy:** the official reference reads **Priority**, so render `All / Priority / Offers / Social / Newsletters`. Keep `primary` as the internal category/route value for compatibility with the data model. Replace “Primary” in the banner with “Priority” where referring to the view; the All link remains available.
- **Wordmark:** official artwork uses purple `yahoo!` and near-black `mail`. Use separate spans/SVG text, locally rendered; keep the size/position in §3–4. Do not color the entire suffix purple. Page title is Yahoo Mail.
- **Frame:** exclude purple promotional backdrop, browser chrome, laptop bezel, explanatory overlay outlines, watermarks and tutorial highlight circles. The app itself is the pale canvas and white cards.
- **Default navigation:** the official hero shows a 72px compact icon rail. Use the existing 232px expanded sidebar default to expose Inbox and the seeded searchable folder tree; compact mode reproduces the official rail. Add Folders and More entry points even when expanded. More contains Settings as in current Help; gear/More settings is a convenient second route.
- **Two inbox row patterns:** standard All/folder/search rows retain the 56px grid in §4 (40px compact / 64px spacious). Priority rows are richer: min-height 88px, 16px vertical padding, 28px avatar, flexible text stack with sender/date top line and subject/snippet below; allow 112px when a second snippet line or 64px local thumbnail is shown. Checkbox space remains stable on hover/focus. Density changes apply proportionally (72/88/104px base Priority rows). Do not compress the official two-line view into a single-line list.
- **Folder creation:** current Help describes inline Add/Update. Use a 40px input row inside the Folders panel, purple Add/Update button and Cancel. The pre-existing 400px rounded modal remains a styling reference for confirmation dialogs, not the only create-folder path. Parent/child indentation is 16px per level; searchable tree must scroll independently.
- **Settings geometry at 1280px:** header remains 64px; settings menu 200–220px, filter list 320–360px, flexible editor min-width 360px. The earlier 420px middle column applies only when space permits. Close right Starred/Contacts while in full settings. Editor uses 16px row gaps and full-width rule dropdown/input rows; Save/Cancel stays reachable at bottom.
- **Overflow:** at widths <1280px collapse right panel; keep a 600px minimum main card when practical. At 1024px permit compact nav and overlay Contacts; no horizontal clipping of Send, form Save, folder actions or filter destination fields. At mobile widths use a drawer as polish; native mobile app fidelity is outside this desktop brief.
- **Reading/compose:** reading subject 22px, body 15px/24px; bounded white content, no arbitrary remote image fetching. Full-page compose uses 48px recipient/subject rows, content min-height 240px, and a 56px bottom action strip; 40px purple Send with 20px horizontal padding. Recipient dropdown max-height 280px, 40px result rows. Inline reply uses the same editor at the end of its source message.
- **Preview:** attachment modal max-width 960px / 90vw, max-height 85vh, topbar 48px with file title/Close, content scroll region, bottom download controls. Office formats use file metadata; avoid blank broken embedded frames.
- **Accessibility:** text contrast follows primary/secondary tokens; controls have at least 32px targets (40px primary). Focus rings remain visible on hover/selection backgrounds. Never rely solely on color for unread/starred/selection. Inputs have persistent labels, inline errors and explicit button names.

Screenshot catalogue, source links and limitations: `assets/README.md`. All research images are developer references, not runtime assets. New runtime attachments/illustrations must be local files or locally generated SVG.
