# Design System Inspired by Microsoft Excel for the web

> Sources: `assets/screenshots/01_excel_web_main_classic_ribbon_2024.jpg` (primary ground truth — 2024 Excel for the web on SharePoint, Classic ribbon),
> `02/03/04_crop_*.png` (zoomed crops of header, ribbon, sheet tabs, status bar), `05_excel_web_simplified_ribbon.jpg`.
> Colours marked *(sampled)* were measured from the screenshots; the rest follow Microsoft Fluent UI 2 web tokens, which Excel for the web uses.

## 1. Visual Theme & Atmosphere

Excel for the web is a dense, utilitarian Fluent-UI application. A solid **Excel green** suite header bar (48px) sits on top of a light-grey ribbon. Below that is a white formula bar and an enormous white grid with very faint gridlines and light-grey row/column headings. Colour is used sparingly. Green marks brand, active state and selection (the active cell border, the active ribbon tab underline, the active sheet-tab underline, the Share button). Everything else is neutral grey (`#242424` → `#F5F5F5`). Ribbon icons are small (16–20px) and mostly monochrome `#424242`, with a few signature multi-colour icons (Paste clipboard, Conditional Formatting, Format as Table, Cell Styles, Insert/Delete cells).

The start page (Home / Create / My Content) is a calm Microsoft 365 "app home". It has a white canvas, a narrow left app rail, a horizontal strip of template thumbnails, and a file list (Recent / Favorites / Shared) with 48px rows. Corners are softly rounded (4px on controls, 8px on cards and dialogs). Shadows are subtle Fluent elevation shadows.

## 2. Color Palette & Roles

### Primary
- **Excel Brand Green** (`#107C41`) *(sampled #107C42)*: suite header background, Share button, active cell border, fill handle, active ribbon-tab underline, active sheet-tab underline/text, primary buttons, focus accents.
- **Brand Green Hover** (`#0E6E3A`): hover on primary buttons. **Pressed** (`#0C5E31`).
- **Brand Green Dark Text** (`#0E5C2F`): green text on light-green backgrounds.
- **Brand Green Tint** (`#E9F5EE`): selected rows in file lists, selected rail item background, light highlight.
- **Header Search Box** (`#B7D8C7`, i.e. `rgba(255,255,255,0.7)` over green) *(sampled)*; focused → `#FFFFFF`.
- **Background (app canvas)** (`#FFFFFF`): grid, formula bar, status bar, start-page canvas.
- **Text Primary** (`#242424`): all primary text, ribbon labels.
- **Text Secondary** (`#616161`): group labels, column/row header text, metadata, placeholders.
- **Text Disabled** (`#BDBDBD`).

### Accent
- **Fluent Blue** (`#0F6CBD`): hyperlinks, "filtered" row-number colour, info banners, focus ring in dialogs.
- **Comment Purple** (`#8764B8`): comment indicator triangle in cell corner, comment author accent.
- **Presence colours** (co-author cell outlines/avatars): `#D13438`, `#8764B8`, `#CA5010`, `#038387`, `#0078D4`, `#C239B3`.
- **Formula reference colours** (cycled in order while editing a formula, used for both the text token and the range box): `#0078D4`, `#D13438`, `#8764B8`, `#107C10`, `#CA5010`, `#038387`, `#8E562E`, `#C239B3`.

### Interactive
- **Link** (`#0F6CBD`), hover (`#115EA3`) underline.
- **Ribbon button hover** (`#EBEBEB`), **pressed** (`#E0E0E0`), **checked/toggled** (`#D1D1D1` background + `#242424` icon), e.g. Bold while active.
- **Menu item hover** (`#F5F5F5`), **menu item selected** (`#EBEBEB`).
- **Header icon button hover** (`rgba(255,255,255,0.16)` on green).

### Surface & Borders
- **Ribbon / tab row background** (`#F5F5F5`) *(sampled #F3F3F3–#F5F5F5)*.
- **Sheet tab bar background** (`#F5F5F5`) *(sampled)*.
- **Grid headings background** (`#F5F5F5`) *(sampled #F3F3F3/#F5F5F5)*; heading separators `#D4D4D4`.
- **Selected heading (partial selection)**: bg `#E1E1E1`, text `#107C41` weight 600, 2px `#107C41` line on the edge touching the grid.
- **Selected heading (entire row/column selected)**: bg `#C8E6D3`, text `#0E5C2F`.
- **Gridlines** (`#E1E1E1`), 1px.
- **Range selection fill** (`rgba(16,124,65,0.10)`) with 1px `#107C41` outline. The active cell inside the range stays white.
- **Copy marquee** (marching ants): 2px dashed `#107C41`, animated.
- **Card / dialog surface** (`#FFFFFF`); **subtle surface** (`#FAFAFA`).
- **Border default** (`#D1D1D1`), **border subtle** (`#E0E0E0`), **divider** (`#EDEBE9`).
- **Ribbon group separator** (`#E0E0E0`), 1px vertical, 60% of the ribbon height.

### Status
- **Success** (`#107C10`), success banner bg `#F1FAF1`, border `#9FD89F`.
- **Warning** (`#BC4B09`), warning banner bg `#FFF9F5`, border `#FDCFB4`.
- **Error** (`#C50F1F`), error banner bg `#FDF3F4`, border `#EEACB2`. Cell error values (`#DIV/0!`, `#REF!` …) render in normal text colour (Excel does not colour them).
- **Info** (`#0F6CBD`), info banner bg `#EBF3FC`.

### Excel cell palette (Fill Color / Font Color pickers — "Theme Colors" 10×6 grid + "Standard Colors")
Theme row 1: `#FFFFFF #000000 #E8E8E8 #0E2841 #156082 #E97132 #196B24 #0F9ED5 #A02B93 #4EA72E` (Office 2023+ theme), with tint/shade rows beneath.
Standard: `#C00000 #FF0000 #FFC000 #FFFF00 #92D050 #00B050 #00B0F0 #0070C0 #002060 #7030A0`.
Default "Fill Color" swatch on button: `#FFFF00`; default "Font Color" swatch: `#FF0000` (matches screenshot).

### Tab colours
The sheet tab colour picker uses the same Theme + Standard palette, plus a "No Color" option.

## 3. Typography Rules

UI font stack (system only — **no web-font downloads**):
`"Segoe UI", "Segoe UI Web (West European)", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", Arial, sans-serif`

Grid/cell font stack (default workbook font "Aptos Narrow", 11pt):
`"Aptos Narrow", Calibri, Carlito, "Arial Narrow", Arial, sans-serif` at 14.67px (11pt). The Font dropdown lists: Aptos Narrow (Body), Aptos Display (Headings), Arial, Calibri, Cambria, Consolas, Courier New, Georgia, Segoe UI, Tahoma, Times New Roman, Trebuchet MS, Verdana.

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|------|------|------|--------|-------------|----------------|
| Header app name "Excel" | UI | 16px | 600 | 48px | 0 |
| Header file name "Book" | UI | 14px | 400 | 20px | 0 |
| Header search placeholder | UI | 14px | 400 | 20px | 0 |
| Ribbon tab label | UI | 14px | 400 (active 600) | 20px | 0 |
| Ribbon large-button label (2 lines) | UI | 12px | 400 | 14px | 0 |
| Ribbon small-button label | UI | 12px | 400 | 16px | 0 |
| Ribbon group label | UI | 11px | 400 | 14px | 0, color `#616161` |
| Name box / formula bar | UI (formula bar uses grid font for content) | 13px / 14.67px | 400 | 22px | 0 |
| Column/row headings | UI | 11px (row numbers 11px) | 400 (selected 600) | 20px | 0 |
| Cell text | Aptos Narrow 11pt | 14.67px | 400 | 20px (row height) | 0 |
| Sheet tab | UI | 13px | 400 (active 600) | 32px | 0 |
| Status bar | UI | 12px | 400 | 24px | 0 |
| Dialog title | UI | 20px | 600 | 28px | 0 |
| Dialog body / labels | UI | 14px | 400 | 20px | 0 |
| Start page H1 ("Good afternoon, Megan") | UI | 24px | 600 | 32px | 0 |
| Start page section title | UI | 16px | 600 | 22px | 0 |
| File list name | UI | 14px | 600 | 20px | 0 |
| File list meta (location, dates) | UI | 12px | 400 | 16px | 0, `#616161` |
| Caption / tooltip | UI | 12px | 400 | 16px | 0 |

## 4. Spacing & Layout

### Workbook editor (top → bottom; full viewport height, no page scroll — only the grid scrolls)
| Region | Height | Notes |
|---|---|---|
| Suite header | **48px** | green `#107C41`; left: 48px waffle button, "Excel" (16px/600), file-name button "Book ⌄" with cloud-sync icon; centre: search box 468px max × 32px, radius 4px; right: settings gear 48px, avatar 32px circle |
| Ribbon tab row | **40px** | `#F5F5F5`; tabs 14px, horizontal padding 8px, 3px green underline (radius 2px, width = text width) under active; right cluster: Comments, Catch up, Editing ⌄ (outlined 32px buttons, radius 4px, gap 8px), Share ⌄ (filled green 32px) |
| Ribbon commands (Classic) | **92px** | `#F5F5F5`; groups separated by 1px `#E0E0E0`; group label row 16px at bottom; collapse chevron bottom-right |
| Ribbon commands (Simplified) | **40px** | single row of 32px icon buttons + overflow "…" |
| Formula bar | **32px** (expanded: 32px + 3 lines) | white; name box 120px wide (combobox with ⌄), then ⋮ splitter, ✕ ✓ *fx* (24px icons, gap 4px), then input flexible; border-bottom 1px `#E0E0E0`; top margin 4px from ribbon |
| Grid | flex | column heading row **20px**; row heading column **32px** (grows to fit row number digits; 40px at ≥10000); default column width **64px**; default row height **20px**; select-all corner triangle in top-left |
| Horizontal scrollbar row | 16px | shares row with sheet tab bar on narrow screens; on wide screens is just above |
| Sheet tab bar | **32px** | `#F5F5F5`; left: ‹ › scroll arrows (24px), ≡ "All Sheets" button, then tabs (padding 0 12px, min width 64px), then "+" (New sheet) |
| Status bar | **24px** | white; border-top 1px `#E0E0E0`; left: "Calculation Mode: Automatic", "Workbook Statistics"; right: aggregates (Average / Count / Sum), "Give Feedback to Microsoft", zoom − 100% + |

### Start page (Home / Create / My Content)
- Suite header 48px (same green), with centre search "Search" (468px).
- Left app rail **68px** wide, white, border-right 1px `#E0E0E0`; rail items 68×56px: 24px icon + 10px label; selected = icon `#107C41`, label 600, bg `#F5F5F5`, 3px green bar on left edge (radius 2px).
- Content column: max-width **1200px**, padding **32px 48px**.
- Template strip: cards **156px** wide, thumbnail **156×116px** (radius 8px, 1px `#E0E0E0` border), label 12px below, gap **16px**; "More templates →" link on the right of the section header.
- File list: tab pills (Recent / Favorites / Shared) height 32px, gap 4px, active = text 600 + 2px green underline; list header row 36px (12px `#616161`); rows **52px** with 1px `#F0F0F0` divider; columns: icon 32px | Name (flex, min 320px) | Opened 160px | Owner 180px | Activity 240px | actions 72px.

### General
- Base spacing unit 4px (4, 8, 12, 16, 20, 24, 32, 48).
- Border radius: controls **4px**, cards/dialogs/flyouts **8px**, avatars 50%, pills 16px.
- Dialog widths: small 440px, medium 600px (Share), large 760px (Custom Sort, Insert Function).
- Task panes (Comments, Manage access, Version history, Workbook Statistics, Find): docked right, **320px** wide (Comments 360px), full height under the formula bar, white, border-left 1px `#E0E0E0`, header 48px with title 16px/600 and ✕.

## 5. Component Patterns

**Primary button** (Share, Send, Apply, OK): `background:#107C41; color:#fff; border:1px solid transparent; border-radius:4px; height:32px; padding:0 12px; font:600 14px/20px UI;` hover `#0E6E3A`; pressed `#0C5E31`; disabled `background:#F0F0F0; color:#BDBDBD`.

**Secondary/outline button** (Comments, Catch up, Editing, Cancel): `background:#fff; color:#242424; border:1px solid #D1D1D1; border-radius:4px; height:32px; padding:0 12px; font:600 14px UI;` hover `background:#F5F5F5; border-color:#C7C7C7`.

**Ribbon large button** (Paste, Conditional Formatting, Insert, Sort & Filter…): 56–64px wide × 76px tall, 32px icon on top, 12px label below (wraps to 2 lines), optional ⌄ under label for menus; radius 4px; hover `#EBEBEB`.

**Ribbon small button** (Cut, Copy, Wrap Text, AutoSum…): 24px tall, 16px icon + 12px label, padding 0 4px; split buttons show a separate 12px ⌄ zone with its own hover.

**Ribbon icon toggle** (B, I, U, align): 24×24px, hover `#EBEBEB`; checked `#D1D1D1`.

**Combobox** (Font name 116px, Font size 44px, Number format 136px, Name box 120px): `height:24px; border:1px solid #D1D1D1; border-bottom-color:#616161; border-radius:4px; background:#fff; padding:0 6px; font:12px UI;` focus → bottom border 2px `#107C41`.

**Text input (dialogs)**: height 32px, border 1px `#D1D1D1`, bottom `#616161`, radius 4px, padding 0 10px, 14px; focus bottom border 2px `#107C41`; error → border `#C50F1F` + 12px red message below.

**Checkbox**: 16px square, radius 2px, border 1px `#616161`; checked fill `#107C41` with white check. **Radio**: 16px circle, checked inner dot `#107C41`. **Toggle**: 40×20px track, on `#107C41`.

**Menu / dropdown flyout**: `background:#fff; border-radius:8px; box-shadow: 0 8px 16px rgba(0,0,0,.14), 0 0 2px rgba(0,0,0,.12); padding:4px;` items 32px tall, padding 0 12px, 14px, 20px icon column on the left, shortcut text right-aligned `#616161`, submenu chevron ›, separators 1px `#E0E0E0` with 4px margin; hover `#F5F5F5`, radius 4px.

**Context menu (cells, headers, sheet tabs)**: same as flyout; min-width 220px.

**Dialog (modal)**: `background:#fff; border-radius:8px; box-shadow: 0 32px 64px rgba(0,0,0,.24), 0 0 8px rgba(0,0,0,.20); padding:24px;` title 20px/600, close ✕ 32px top-right; footer right-aligned buttons with 8px gap; overlay `rgba(0,0,0,.4)`.

**Share dialog**: 480px wide, radius 8px, padding 20px 24px. Title row `Share "FY26 Regional Sales"` (20px/600), right icons ⚙ (link settings) and ✕. People picker "Add a name, group, or email" with a role chip on the right ("✎ Can edit ⌄"). Multiline "Add a message" (min-height 64px). Primary **Send**. Divider. "Copy link" section: link-scope icon + text ("People in Contoso with the link can edit") + ⚙ + outline **Copy** button. After copy: green success banner "Link copied" + scope text.

**Filter dropdown button** (header cell): 16×16px square in the right of the header cell, bg `#fff`, border 1px `#C7C7C7`, radius 2px, ⌄ glyph 10px `#424242`; when a filter is active on that column the glyph becomes a funnel+⌄ and the button bg `#E9F5EE`, border `#107C41`. Sorted columns show ↑/↓ arrow next to the funnel.

**Filter menu**: 280px wide flyout, per §Menu, plus a 32px search box ("Search"), a 200px scrollable checklist (16px checkboxes, 28px rows) starting with "(Select All)" and ending with "(Blanks)" if any; footer OK (primary) + Cancel (outline), right-aligned.

**Cell selection**: active cell 2px `#107C41` inset border; fill handle 7×7px `#107C41` square with 1px white outline at bottom-right corner; range fill `rgba(16,124,65,.10)`; headers of selected rows/cols highlighted (see §2).

**Comment indicator**: purple `#8764B8` 6px triangle in the cell's top-right corner; hovering shows a comment card (320px, radius 8px, elevation 8).

**Sheet tab**: height 32px, padding 0 12px, text 13px `#424242`; hover bg `#EBEBEB`; active: text `#107C41` 600 with 3px green underline (radius 2px) inset 8px left/right; tab colour: inactive tab shows a 4px bar in the tab colour at the bottom; active tab underline uses the tab colour. Rename: inline input (white, 1px green border).

**File-list row**: 52px; hover bg `#F5F5F5`; selected bg `#E9F5EE`; the Excel file icon is a 24px green square-ish glyph (`#107C41` with white "X" grid) drawn as inline SVG.

**Avatars**: 24px (lists), 32px (header). Initials on deterministic background colours from: `#0078D4 #8764B8 #CA5010 #038387 #498205 #C239B3 #986F0B #D13438`; 10–12px white 600 text.

**Toasts / banners**: top-centre under the ribbon, 360px, radius 8px, elevation 16; success has a green icon; auto-dismiss after 5s (UI only — must never write state).

## 6. Shadow & Elevation (Fluent 2)

| Level | Use | box-shadow |
|---|---|---|
| 2 | cards, file-list hover lift | `0 1px 2px rgba(0,0,0,.14), 0 0 2px rgba(0,0,0,.12)` |
| 4 | template cards hover, sheet-tab drag ghost | `0 2px 4px rgba(0,0,0,.14), 0 0 2px rgba(0,0,0,.12)` |
| 8 | menus, flyouts, filter dropdown, comment cards | `0 4px 8px rgba(0,0,0,.14), 0 0 2px rgba(0,0,0,.12)` |
| 16 | toasts, task panes floating | `0 8px 16px rgba(0,0,0,.14), 0 0 2px rgba(0,0,0,.12)` |
| 64 | modal dialogs | `0 32px 64px rgba(0,0,0,.24), 0 0 8px rgba(0,0,0,.20)` |

## 7. Iconography

Use inline SVG icons (no icon CDN). `@fluentui/react-icons` (MIT, bundled offline) is allowed and recommended for exact Fluent glyphs (e.g. `ClipboardPaste24Regular`, `Cut20Regular`, `TextBold20Regular`, `Filter20Regular`, `Share20Regular`, `Comment20Regular`, `Search20Regular`, `Settings20Regular`, `Grid20Regular` for the waffle). Multi-colour signature icons (Paste, Conditional Formatting, Format as Table, Cell Styles, Insert/Delete/Format cells, Sort & Filter, Find & Select, Analyze Data) should be hand-drawn SVGs that roughly match `03_crop_header_ribbon_right.png` (red/blue grid glyphs).

The Excel app logo is a green rounded "X" tile. Draw it as inline SVG and use it for the favicon too (`public/favicon.svg`).

## 8. Plan-agent research addendum — 2026-11-18

This section enriches and clarifies the pre-existing guide; sections 1–7 are retained. When a source identification or default below conflicts with earlier prose, this addendum governs the implementation. See `assets/README.md` for every screenshot's classification and `assets/screenshots/official/sources.json` for new primary-source image URLs.

### Visual authority and confidence

- Primary editor structure is existing `01_excel_web_main_classic_ribbon_2024.jpg` and its enlarged crops 02–04. They visibly show the browser web editor. Original download provenance/year is not independently established; do not label this a verified 2026 live UI. The app must exclude the image's browser address/tab bars.
- Existing screenshot 09 is a **native desktop dark start page**, not an authentic light web Home screenshot. Home measurements/colors in this guide are an explicit light Fluent adaptation for the sandbox. Follow the 68px rail/white content/green accents specified here, without copying native window controls.
- Existing 06/07, 11/12, 14/15/16 and several nested images are desktop references. Their backstage layouts, Mac title bars and sharing popovers are not alternative web themes. Rejected promotional/unrelated images are indexed in assets/README.md and must not steer layout.
- New official Microsoft Web crops show the filter checklist, numeric-operator submenu, resulting filtered grid, Create Table range/headers dialog and an AutoSum draft. Use their hierarchy/behavior within the chosen Fluent palette. `filter-number-result.png` shows the result grid, **not** a custom-filter dialog. Existing `excel-shared-section-copy.png` supplies the actual web Copy link structure.
- CSS dimensions above are target values normalized for a 100% desktop viewport, not all literal pixel samples from scaled screenshot exports. Colors explicitly tagged sampled are inherited measurements, not freshly resampled claims. Treat remaining Fluent colors as chosen approximations.

### Fonts and content density

The primary editor screenshot's selected workbook font reads **Calibri (Body), 11**. Use workbook default `Calibri, Carlito, Arial, sans-serif` at 11pt (14.67px) for this selected classic-ribbon fixture, overriding the earlier universal Aptos Narrow default. Keep Aptos Narrow available as a font option; cell.format.fontFamily wins. UI stays Segoe UI/system stack. No external font request.

At 1440×900: suite header y=0–48; ribbon tabs y=48–88; classic commands y=88–180; formula bar approximately y=180–212 (allow the documented 4px inset); column headings beneath; grid fills remaining height above bottom 32px tabs + 24px status, with its own scrollbar. Header and ribbon never scroll with cells. Base grid columns are 64px/rows 20px; actual populated Sales column widths come from persisted sheet.columnWidths for legible dates/products/amounts. Do not squeeze all 8 data columns into illegible defaults or replace the spreadsheet with a table widget lacking cell addresses.

### Concrete control states

- Focused grid cell: 2px Excel-green inset stroke and 7px fill handle. Range tint uses rgba(16,124,65,.10); active cell remains white. Filtered row headings keep **source** numbers, with gaps.
- Name box and formula input reflect the currently selected cell; selected cell shows evaluated value while formula input shows `=...`. While editing show Cancel/Enter and colored reference boxes, all draft-local until commit.
- Filter flyout is 280px target width, 32px search, 28px checklist rows and scrollable values; root menu may wrap when viewport edges constrain it. Checkbox changes have separate OK/Cancel. Color-filter options may be disabled until their semantics exist; required value/custom filters remain functional.
- Share dialog is **480px target width** (overrides the earlier general 600px Share example). Link settings is 440px; Manage access pane is 320px (360px if People rows require it). Use green primary actions consistently even when older official image crops have blue/gray buttons. Picker suggestions and email chips must fit inside dialog without shifting its footer.
- Empty/no-result state stays within existing home/grid/pane region. Invalid values show 12px inline red text and keep the dialog open; never rely only on a disappearing toast. Disabled Viewing controls show clear disabled appearance and a usable Viewing label.
- At 1024px keep ribbon overflow, filename, Share and sheet tab overflow reachable; at smaller widths prioritize the same editor with scrolling/overflow over a fabricated native mobile app. Primary acceptance at 1440×900, secondary check at 1280×800 and 1024×768.

### Offline assets and interaction boundaries

Draw/bundle Excel favicon, icons, avatars and template previews locally. Research screenshots are references only, not application backgrounds or runtime resources. Use a system/bundled font and deterministic initials avatars. A Saved label follows completed user transactions; no background coauthoring or auto-changing cloud status. Tooltip/toast dismissal timers may change transient presentation only and must not call saveState. Keep implementation terms such as `sid`, state API, fixture IDs and verifier out of product UI.
