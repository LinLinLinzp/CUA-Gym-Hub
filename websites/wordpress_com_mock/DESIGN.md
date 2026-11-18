# WordPress.com publishing workspace design

## 1. Visual theme

Use a compact, visually distinct editorial workspace for Harbor & Field Journal. Keep the WordPress.com name and the task vocabulary in the reference guides. Give the workspace a deep blue-green sidebar, warm off-white background, and restrained teal accents. Use a serif for the story canvas and dashboard title with a crisp sans serif for navigation, tables and controls.

The screenshots establish information hierarchy and interaction placement. The classic admin references show persistent navigation and compact rows. The block editor reference shows a focused canvas with settings alongside it, and Attachment details pairs a large preview with metadata. The following dimensions, fonts and colors are specifications for this implementation.

## 2. Color palette

| Role | Value | Use |
| --- | --- | --- |
| Brand and sidebar | `#153538` | Sidebar, wordmark text on light surfaces |
| Sidebar foreground | `#F2F7F4` | Navigation and site title |
| Sidebar muted | `#AFC5C1` | Secondary information and icons |
| Sidebar selected | `#265354` | Active navigation item |
| Background | `#F6F5F1` | Dashboard, list workspace, editor surround |
| Surface | `#FFFFFF` | Tables, cards, editor paper, drawers |
| Surface subtle | `#F8FAF9` | Table headings and control groups |
| Text primary | `#1C2B29` | Body text, titles, form labels |
| Text secondary | `#52615C` | Metadata, descriptions, captions |
| Accent and links | `#126658` | Primary action, links, tab selection |
| Accent hover | `#0C5146` | Primary action hover and pressed states |
| Accent pale | `#E8F3EE` | Selected rows or media tiles |
| Border | `#D6DDD7` | Table dividers, cards and panels |
| Control border | `#82948A` | Text fields and standalone controls |
| Focus | `#0969A2` | Keyboard focus ring |
| Success | `#175C42` on `#E7F4EC` | Published and approved |
| Pending | `#754700` on `#FFF4DC` | Pending pill and queue highlight |
| Error and destructive | `#9D2829` on `#FDEBE9` | Validation, spam and destructive actions |
| Scheduled | `#334C8A` on `#EAF0FC` | Scheduled status |

Pair color with an explicit label or icon. Use a quiet gray pill for draft or trash and a lock icon with a Private label.

## 3. Typography

Bundle Instrument Sans plus Instrument Serif if used. Use system-ui and Georgia as corresponding fallbacks. Use tabular numbers for counts and dates.

| Role | Font | Size | Weight | Line height | Letter spacing |
| --- | --- | --- | --- | --- | --- |
| Dashboard title | Instrument Serif | 40 px | 400 | 44 px | 0 |
| Screen heading | Instrument Sans | 28 px | 650 | 36 px | −0.02 em |
| Section heading | Instrument Sans | 18 px | 650 | 24 px | −0.01 em |
| Form, button, nav | Instrument Sans | 14 px | 500–650 | 20 px | 0 |
| Table title | Instrument Sans | 14 px | 650 | 20 px | 0 |
| Table body | Instrument Sans | 14 px | 400 | 21 px | 0 |
| Metadata and status | Instrument Sans | 12 px | 500 | 17 px | 0 |
| Editor title | Instrument Serif | 46 px | 400 | 51 px | 0 |
| Editor body | Instrument Serif | 23 px | 400 | 32 px | 0 |

## 4. Spacing and layout

- **Desktop shell.** Sidebar 224 px, full viewport height. Place a WordPress.com text wordmark and the site beneath it, followed by 40 px navigation rows with a 6 px gap and 14 px rail padding. Put the 60 px utility header above the main region with New and the signed-in profile on the right.
- **Workspace.** Use 32 px horizontal and 26 px top padding at desktop size, 16 px gaps between groups, and a 1440 px maximum content width. Use a single clear heading per screen. The Dashboard uses a full-width site heading, one row of summary links, then a two-column recent content and moderation layout with an 18 px gap.
- **Lists.** Place the primary action beside the heading, then a status row and a combined search and filter toolbar. Use white tables with 48 px minimum rows, 12 px cell padding and 1 px dividers. Keep selections and bulk controls at the table edge. Put pagination and results count at the bottom.
- **Editor.** Replace the dashboard chrome with a 60 px bar containing Back, title/status, Preview, Save or Publish, and Settings. Use a centered white canvas up to 760 px wide with 44 px insets and a 320 px inspector. The block inserter opens from the canvas margin or toolbar. Keep the main action in the header, with publishing details and confirmation in the inspector.
- **Media.** Make the tile grid responsive with 150 px minimum columns and 12 px gaps. Use 4:3 preview areas and readable file labels. Use an attachment details dialog up to 1080 px wide with a 60/40 preview and form split, up to 84 vh high with internal scrolling. Use the same dialog and tile patterns for selecting content and images.
- **Responsive.** Below 960 px, collapse the rail to a menu, reduce page gutters to 16 px, and move the editor inspector to a drawer. Below 640 px, stack toolbar controls and media details. Keep dense list columns reachable in a labeled horizontal scroll region. Keep editing and confirmation buttons in view.

## 5. Components

| Component | Specifications |
| --- | --- |
| Primary button | 36 px height, 14 px horizontal padding, 6 px radius, accent fill, white 14 px semibold label |
| Secondary button | Same geometry, white fill, control border and primary text |
| Destructive button | Explicit verb label with white on `#9D2829` in a confirmation dialog |
| Input/select | 36 px minimum height, 6 px radius, 10 px x-padding, white background, 1 px solid control border |
| Focus | 2 px focus ring with 2 px offset, visible on items inside menus and rows |
| Status tabs | 36 px minimum target height, 10 px horizontal padding, 2 px selected accent underline, label and count |
| Status pill | Min. 22 px height, 7 px horizontal padding, 11 px radius |
| Card | White background, 1 px border, 8 px radius, 20 px inset |
| Table and action menu | Stable title and status columns. Give each row a visible, labeled actions menu. Highlight pending comments with a 3 px left border and tinted background. |
| Modal | 10 px radius, header and footer separated by dividers, 24 px body inset. Trap and restore focus with Escape support. Confirmations up to 480 px wide. |
| Notices | Place validation next to the field, give empty views a direct action where appropriate, and announce save results without moving focus. |

## 6. Elevation

Keep tables and cards flat. Use `0 6px 18px rgba(21, 53, 56, 0.12)` for menus and `0 18px 56px rgba(21, 53, 56, 0.23)` for dialogs. Set the dialog scrim to `rgba(17, 37, 35, 0.40)`.

[Reference screenshots and workflow sources](assets/README.md#visual-references)
