# Design System Inspired by ClickUp (3.0 / 2025 UI, light theme)

> Tokens sampled from `assets/screenshots/*` (primary reference: `home_sidebar_list_view_3.0.png`, 3600×2400 @2x — divide pixel measurements by 2).
> ClickUp 3.0 uses a Radix-style neutral grey scale plus saturated status colours. Purple `#7B68EE` is the legacy brand accent still used for primary actions in modals, sprint and time-tracking features.

## 1. Visual Theme & Atmosphere

ClickUp 3.0 is a dense, calm, near-monochrome workspace. A **black icon rail** on the far left anchors the app. Next to it sits a **very light grey sidebar** (`#FCFCFC`) holding the hierarchy tree (Spaces › Folders › Lists). The main content area is a **white rounded panel** floating on a `#FAFAFA` canvas with a hairline border. Most chrome is grey on white with thin `#F0F0F0` dividers. Colour shows up in data: status pills, priority flags, tag chips, Space icons and avatars. Typography is small (13–14px), tight and Inter-like. Bold weight is used only for titles and group headers.

Primary actions use a **near-black button** ("+ Task", `#202020`) in the main chrome. **Purple `#7B68EE`** is reserved for brand/primary actions inside dialogs (Save, Create, Submit, Add Widget), the sprint chips, time-tracking popovers and focus rings. Hover states are light grey fills (`#F0F0F0`/`#EDEDED`) rather than colour shifts. Hidden affordances appear on hover: row checkbox, "…" menu, "+" buttons, the quick-edit pencil.

## 2. Color Palette & Roles

### Primary
- **Brand Purple** (`#7B68EE`): primary buttons in modals and popovers, sprint chips and outlines, active tab underline in hubs, focus ring, selected checkbox fill, timer "play" button.
- **Brand Purple Hover** (`#6A57E3`), **Purple Tint** (`#F0EEFF` bg / `#E4E0FD` border): selected rows, active filter chips ("Group by: Status" chip uses a purple outline + `#F0EEFF` bg).
- **Logo gradient**: `linear-gradient(135deg, #8930FD 0%, #49CCF9 100%)` with the second chevron `#FF02F0 → #FFC800`. Render the logo as an inline SVG, never a remote image.
- **Ink / Dark Button** (`#202020`): "+ Task" split button, header text, icon rail background `#000000`.
- **Canvas** (`#FAFAFA`): app background behind the main panel.
- **Panel** (`#FFFFFF`): main content panel, modals, cards, popovers.
- **Sidebar / Top bar** (`#FCFCFC`).

### Text
- **Text Primary** (`#202020`): task names, titles.
- **Text Secondary** (`#646464`): sidebar items, column headers, metadata.
- **Text Tertiary / Muted** (`#838383`): timestamps, placeholders, empty-cell dashes, low-priority flag.
- **Text Disabled** (`#BBBBBB`).
- **Text on dark** (`#FFFFFF`), **rail icon inactive** (`#A0A0A0`).

### Interactive
- **Link** (`#0D74CE`), hover underline.
- **Hover fill** (`#F0F0F0`) for rows, sidebar items and icon buttons.
- **Active / selected sidebar item** (`#EDEDED`) with text `#202020` and weight 500.
- **Pressed** (`#E8E8E8`).
- **Focus ring**: `0 0 0 2px #7B68EE33`, border `#7B68EE`.

### Surface & Borders
- **Border hairline** (`#F0F0F0`): list rows, column separators, section dividers.
- **Border default** (`#E8E8E8`): inputs, cards, popovers.
- **Border strong** (`#D9D9D9`): input hover.
- **Breadcrumb / sub-header bar** (`#F9F9F9`).
- **Board column background** (`#F7F7F7`), **board card** `#FFFFFF` with border `#E8E8E8`.
- **Table header row** (`#FFFFFF`) with text `#646464` 12px.

### Task statuses (pill background, white text unless noted)
| Status | Color | Pill text |
|---|---|---|
| to do / open | `#87909E` (icon); pill bg `#F0F0F0`, text `#646464`, dashed-circle icon | dark |
| in progress | `#0091FF` | white |
| in review | `#AB4ABA` | white |
| review (Marketing) | `#F76B15` | white |
| blocked | `#E5484D` | white |
| waiting | `#FFB224` | `#202020` |
| complete / done | `#30A46C`, filled check-circle icon | white |
| closed | `#30A46C` | white |

The status icon left of each task name is a 14px circle. Open statuses show a dashed outline in the status colour. Custom statuses show a ring plus a partially filled centre. Done statuses show a filled circle with a white check.

### Priority flags (flag icon + label)
- **Urgent** `#C62A2F` (filled red flag)
- **High** `#FFC53D` (yellow/orange flag)
- **Normal** `#3E63DD` (blue flag)
- **Low** `#838383` (grey flag)
- **None**: outline grey flag `#BBBBBB`, shown only on hover

### Tag chips (bg / text)
- teal `#E7F9F5 / #0D9B8A`
- blue `#EDF6FF / #448BD8`
- orange `#FFEDD5 / #C2590A`
- purple `#F3E8FF / #8E4EC6`
- pink `#FDE8F1 / #D6409F`
- grey `#F0F0F0 / #646464`
- red `#FEEBEC / #CE2C31`
- green `#E9F9EE / #218358`

Chips are 20px tall, radius 4px, 12px font weight 500, padding 0 6px.

### Space icon colours
Product purple `#A43CB4`, Marketing red `#E5484D`, Engineering blue `#3E63DD` (screenshots show `#6E8AE5` too), Design teal `#12A594`, Operations violet `#8E4EC6`. The icon is a 20px rounded square (radius 5px) with a white initial letter (11px, weight 600).

### Status / feedback
- **Success** `#30A46C`, **Warning** `#FFB224`, **Error** `#E5484D`, **Info** `#0091FF`.
- **Overdue date text** `#E5484D`; **Today** `#E5484D` weight 500; **Tomorrow** `#F76B15`.
- **Inbox / notification badge** `#E93D82` (pink pill, white 11px text).
- **Billable** `#12A594` (teal donut segment, `$` icon active); non-billable `#D9D9D9`.
- **Capacity bar** `#0091FF` on track `#EDEDED`; over capacity `#E5484D`.
- **Running timer** red stop button `#E5484D`; idle play button `#7B68EE`.

### Avatar palette (initials circles)
`#7B68EE #0091FF #30A46C #AB4ABA #F76B15 #E93D82 #12A594 #E5484D #3E63DD #FFB224 #8E4EC6 #0D74CE`, white initials.

## 3. Typography Rules

Font: **Inter** via `@fontsource/inter` (weights 400/500/600/700), imported in `main.jsx`. Fallback: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`. No Google Fonts.

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|------|------|------|--------|-------------|----------------|
| Task view title | Inter | 26px | 700 | 34px | -0.01em |
| Doc title | Inter | 36px | 700 | 44px | -0.02em |
| Doc H1 / H2 / H3 | Inter | 28 / 22 / 18px | 700 / 600 / 600 | 1.3 | -0.01em |
| Page / location header ("Marketing ▾") | Inter | 15px | 600 | 22px | 0 |
| Modal title | Inter | 16px | 600 | 24px | 0 |
| Section / group header ("IN PROGRESS 3") | Inter | 12px | 600 uppercase pill | 16px | 0.02em |
| Body / list row task name | Inter | 14px | 400 (500 for parent rows on hover) | 20px | 0 |
| Sidebar item | Inter | 14px | 400 (500 active) | 20px | 0 |
| Sidebar section label ("Spaces") | Inter | 12px | 500 | 16px | 0 |
| Column header | Inter | 12px | 500 | 16px | 0 |
| Doc body paragraph | Inter | 15px | 400 | 24px | 0 |
| Caption / metadata | Inter | 12px | 400 | 16px | 0 |
| Chip / badge | Inter | 11–12px | 500 | 16px | 0 |
| Code (doc, inline) | ui-monospace, SFMono-Regular, Menlo | 13px | 400 | 20px | 0 |
| Timesheet cell durations | Inter (tabular-nums) | 13px | 500 | 20px | 0 |

Use `font-variant-numeric: tabular-nums` for times, points and money.

## 4. Spacing & Layout

```
┌────┬──────────────────────────── Top bar 44px (#FCFCFC) ─────────────────────────────┐
│Rail│ [ws switcher]          [  🔍 Search          ⌘K ]        [timer][+New][🔔][JR] │
│56px├─────────────┬────────────────────────────────────────────────────────────────────┤
│#000│ Sidebar     │ ┌ Main panel (white, radius 12px, border #EBEBEB, margin 0 8px 8px 0)
│    │ 260px       │ │ Location header 48px  (breadcrumb, ☆, …, right: Share / Ask)      │
│    │ #FCFCFC     │ │ View tabs 40px (List | Board | Calendar | + View)                 │
│    │ resizable   │ │ Toolbar 44px (Group, Subtasks, Columns | Filter, Me, Assignee,    │
│    │ 220–400     │ │              Closed, 🔍, ⚙ , [+ Task ▾])                          │
│    │             │ │ Content (scroll)                                                  │
└────┴─────────────┴─┴───────────────────────────────────────────────────────────────────┘
```

- **Icon rail**: 56px wide, `#000`, icons 20px in 40px rounded (8px) hit areas with 10px labels underneath (Home, Planner?, Docs, Dashboards, Timesheets, More). Active: bg `#2B2B2B`, icon white.
- **Top bar**: 44px. Search pill 36% width (max 520px), height 30px, bg `#F0F0F0`, radius 8px, centred.
- **Sidebar**: 260px (collapsible via `«` button to 0). Header row 44px (workspace name + new/collapse icons). Items 32px tall, padding 0 8px, radius 6px, icon 16px, gap 8px. Tree indent 16px per level. Section headers 28px.
- **Main panel**: margin-right 8px, margin-bottom 8px, radius 12px, border `1px solid #EBEBEB`, bg white, overflow hidden.
- **Location header**: 48px, padding 0 16px. **View tabs** 40px, tab padding 0 10px, active tab text `#202020` + 2px bottom border `#202020`. **Toolbar** 44px, padding 0 16px.
- **List view**: group header 36px (status pill + count + "…" + "+ Add Task"). Rows 40px, padding-left 32px (status icon 14px, gap 8px). Hairline separators `#F0F0F0`. Columns: Name flex 1 (min 320px), Assignee 120px, Due date 120px, Priority 110px, Sprint Points 90px, Tags 160px, Time tracked 120px. Subtask rows indent +24px.
- **Board view**: columns 272px wide, gap 12px, padding 8px, radius 8px, bg `#F7F7F7`. Column header 36px. Cards padding 12px, radius 8px, gap 8px, min-height 72px.
- **Task modal**: width `min(1200px, 92vw)`, height 90vh, radius 12px. Left pane flex 1 (padding 24px 48px). Right pane 400px Activity/comments (bg `#FAFAFA`, border-left `#F0F0F0`). Field grid 2 columns, label width 120px, row 36px.
- **Doc editor**: content max-width 760px centred, padding 48px 24px. Pages sidebar 240px on the left of the doc.
- **Timesheet grid**: first column 360px, 7 day columns min 110px each, total column 100px, row 52px (task name + 12px location breadcrumb).
- **Modals**: 480px (simple), 600px (create task), radius 12px, padding 20px 24px, footer right-aligned buttons with 8px gap.
- **Popovers / dropdowns**: min-width 220px, radius 8px, padding 4px, item height 32px, item radius 6px.
- **Radius scale**: 4px chips, 6px buttons and items, 8px inputs, cards and popovers, 12px panels and modals, 999px pills and avatars.
- **Spacing scale**: 4, 8, 12, 16, 20, 24, 32, 48px.
- **Avatars**: 24px in rows (stacked overlap -6px, max 3 then "+N"), 32px in comments, 20px in chips.

## 5. Component Patterns

**Dark primary button ("+ Task")**
```css
.btn-dark { height: 32px; padding: 0 12px; background: #202020; color: #fff; border-radius: 6px; font: 500 13px Inter; display: inline-flex; gap: 6px; }
.btn-dark:hover { background: #3A3A3A; }
/* split variant: right segment 28px with ▾, separated by 1px rgba(255,255,255,.2) */
```
**Purple primary (modals)**
```css
.btn-primary { height: 32px; padding: 0 14px; background: #7B68EE; color: #fff; border-radius: 6px; font: 500 13px Inter; }
.btn-primary:hover { background: #6A57E3; }
.btn-primary:disabled { background: #C9C2F7; cursor: not-allowed; }
```
**Secondary / ghost**
```css
.btn-secondary { height: 32px; padding: 0 12px; background: #fff; border: 1px solid #E8E8E8; color: #202020; border-radius: 6px; }
.btn-secondary:hover { background: #F7F7F7; }
.btn-ghost { background: transparent; color: #646464; } .btn-ghost:hover { background: #F0F0F0; color: #202020; }
.icon-btn { width: 28px; height: 28px; border-radius: 6px; color: #646464; } .icon-btn:hover { background: #F0F0F0; }
.btn-danger { background: #E5484D; color: #fff; }
```
**Toolbar chip (Group by / Subtasks / Columns)**: height 28px, padding 0 8px, border `1px solid #E8E8E8`, radius 6px, 13px `#646464`. When active (non-default setting): border `#7B68EE`, bg `#F0EEFF`, text `#5B4AD6`, e.g. "Group: Status".

**Inputs**
```css
.input { height: 32px; padding: 0 10px; border: 1px solid #E8E8E8; border-radius: 8px; font: 14px Inter; background: #fff; }
.input:hover { border-color: #D9D9D9; } .input:focus { border-color: #7B68EE; box-shadow: 0 0 0 2px rgba(123,104,238,.2); outline: none; }
.input.error { border-color: #E5484D; } /* + 12px #E5484D helper text below */
```
**Status pill (group header & task view)**: height 22px, padding 0 8px, radius 4px, 11px weight 600 uppercase, with a 12px status icon. In the task view it is a split pill with a "▸" next-status button. Clicking opens the status dropdown, which lists statuses grouped under "Not started / Active / Done / Closed" with a search box.

**Status dropdown items**: 32px, coloured status icon + uppercase name; check mark on current.

**Priority dropdown**: Urgent, High, Normal, Low (flag icons), divider, "Clear".

**Assignee picker**: search input, "People" list with avatars + checkmark, multi-select, "Me" shortcut at top.

**Date picker**: left column of quick options (Today, Later, Tomorrow, This weekend, Next week, Next weekend, 2 weeks, 4 weeks). Right side is a month calendar with Start date / Due date inputs at the top. The selected day is a purple filled circle and today is outlined.

**Tag chip**: see palette. Tags picker supports search and create ("Create tag 'xyz'").

**Sidebar tree item**: caret on hover (rotates 90° when expanded), space icon square, name, hover-only "…" and "+" icons on the right, count on the right for lists (muted 12px).

**Inbox badge**: pink pill `#E93D82`, min-width 18px, height 18px, 11px weight 600 white.

**List row hover**: bg `#FAFAFA`. A checkbox (16px, radius 4px) appears to the left of the status icon. Inline actions after the name: "+" subtask, tag, rename pencil. Columns become editable on click and open the relevant popover. Selected row: bg `#F0EEFF`.

**Bulk action toolbar**: fixed bottom-centre dark bar `#202020`, radius 12px, height 48px, white 13px text: "N Tasks selected ×" then icon buttons Status, Assignees, Dates, Priority, Tags, Sprint (Add to Sprint), Move, Duplicate, Archive, Delete.

**Board card**: white, border `1px solid #E8E8E8`, radius 8px, padding 10px 12px. Top: muted list name (11px) when shown outside its list. Name 14px weight 500. Footer row: avatars, date chip (red if overdue), priority flag, subtask count "⤷ 2", points chip "◆ 5". Hover: shadow-sm and "…" icon.

**Modal**: overlay `rgba(0,0,0,.4)`. Panel white, radius 12px, shadow-lg. Header 56px with title and × button. Body padding 0 24px. Footer 64px, border-top `#F0F0F0`.

**Toast**: bottom-left, dark `#202020` with white 13px text, radius 8px, optional "Undo" link in `#A99CF5`, auto-dismiss 4s (UI only, no state change).

**Tabs (hub pages: Timesheets, Docs, Inbox)**: 40px, active tab text `#202020` weight 500 with 2px bottom border `#7B68EE`; inactive `#646464`.

**Time tracking popover**: 360px, header tabs Timer / Manual / Range (pill tabs). The input is 40px and large. Then a task selector ("Select task..."), note input, "When: now", and an icon row with a tag button and a `$` billable toggle (teal when on). Purple Save button on the right.

**Timer pill (top bar)**: when running: red dot + `0:12:45` tabular + task name truncated 160px + stop square button `#E5484D`; height 28px, radius 999px, bg `#FEEBEC`.

**Progress bars**: height 4–6px, radius 999px, track `#EDEDED`, fill `#30A46C` (checklist/sprint done), `#0091FF` (capacity), `#7B68EE` (time tracked vs. estimate).

**Charts (sprint)**: SVG. Guideline dashed `#BBBBBB`. Actual remaining line orange `#F76B15` 2px with dots. Burnup scope line `#0091FF`, completed `#30A46C`. Velocity bars: committed `#D9D2FB`, completed `#7B68EE`. Axis labels 11px `#838383`, gridlines `#F0F0F0`.

**Empty states**: centred 64px grey line illustration (inline SVG), title 15px weight 600, body 13px `#646464`, primary action button.

## 6. Shadow & Elevation

| Level | Use | Value |
|---|---|---|
| 0 | List rows, sidebar | none (hairline borders) |
| 1 (sm) | Board card hover, chips on hover | `0 1px 2px rgba(0,0,0,.06), 0 1px 3px rgba(0,0,0,.08)` |
| 2 (md) | Dropdowns, popovers, date picker | `0 4px 16px rgba(0,0,0,.12), 0 0 0 1px rgba(0,0,0,.04)` |
| 3 (lg) | Modals, task view, command palette | `0 12px 48px rgba(0,0,0,.18), 0 0 0 1px rgba(0,0,0,.05)` |
| Bulk bar | Floating action bar | `0 8px 24px rgba(0,0,0,.24)` |

Z-index: sidebar 10, sticky table header 20, dropdown 1000, modal 1100, popover-in-modal 1200, toast 1300.

## 7. Iconography

Use **lucide-react** (bundled locally) at 16px with a 1.75 stroke for UI icons. Mappings: Home `House`, Inbox `Inbox`, My Tasks `CircleCheck`, Docs `FileText`, Dashboards `LayoutDashboard`, Timesheets `Timer`, Sprint `Zap`/`IterationCw`, Folder `Folder`, List `List`, Board `Columns3`, Calendar `Calendar`, Filter `ListFilter`, Group `Layers`, Subtasks `GitBranch`, Priority `Flag`, Points `Diamond`, Time `Clock`, Play `Play`, Stop `Square`. Status icons are custom SVG circles (see §2).
