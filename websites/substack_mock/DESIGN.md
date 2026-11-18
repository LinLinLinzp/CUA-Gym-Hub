# Substack publisher workspace design

## 1. Theme

Build a warm, paper-toned editorial workspace for *The Sunday Margins*. Use familiar Substack action names and a warm orange accent. Give the workspace its own appearance through a full-width masthead, a tinted navigation rail, ochre rules, squared table edges, and a visibly separate desktop inspector for subscriber details. Place the Substack wordmark in the masthead and use an original monogram for the fictional publication. Keep the article reader especially quiet, with a serif text column and generous space around the discussion.

The research screenshots show the product's content hierarchy and control groupings. The values below are implementation tokens for this workspace.

## 2. Color palette

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| Brand | `--brand` | `#FF6719` | Substack wordmark accent and selected marks |
| Action | `--action` | `#AE3B16` | Primary background with white label and accessible text links |
| Action hover | `--action-hover` | `#933213` | Darken the primary button and links on hover |
| Action soft | `--action-soft` | `#F8E6D9` | Selected navigation and active filter surface |
| Canvas | `--canvas` | `#FAF8F4` | Workspace background |
| Rail | `--rail` | `#F2EDE5` | Sidebar and toolbar accents |
| Surface | `--surface` | `#FFFFFF` | Tables, dialogs, and editor canvas |
| Ink | `--ink` | `#29231E` | Headings and body |
| Secondary ink | `--muted` | `#655D55` | Metadata, hints, and secondary labels |
| Borders | `--line` | `#DDD5C9` | Row dividers, card edges, and controls |
| Hover | `--hover` | `#F6F1E9` | Tables and menu items |
| Focus | `--focus` | `#255C96` | Two-pixel outline with two-pixel offset |
| Success | `--success` | `#1F6D49` | Saved, active, approved |
| Warning | `--warning` | `#865B17` | Scheduled or pending |
| Error | `--danger` | `#A72D2A` | Invalid entries and removal actions |

Pair status color with a visible label. Set dark-mode colors only if P2 Appearance is built. Check contrast against the actual surface in both themes.

## 3. Typography

Use local system sans-serif for the application and Georgia with a serif fallback for editorial text. Use tabular numerals for table metrics.

| Role | Family | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- | --- |
| Page heading | Georgia | 32px | 700 | 39px | -0.4px |
| Section heading | System sans | 18px | 650 | 25px | 0 |
| Navigation and buttons | System sans | 14px | 600 | 20px | 0 |
| Body and table | System sans | 14px | 400 | 21px | 0 |
| Captions | System sans | 12px | 500 | 17px | 0 |
| Article/editor title | Georgia | 42px | 700 | 49px | -0.6px |
| Article/editor body | Georgia | 19px | 400 | 31px | 0 |
| Article subtitle | Georgia | 22px | 400 | 30px | 0 |

## 4. Layout and spacing

- Use a 56px masthead across the full workspace. Put brand and publication label on the left and View publication and account identity on the right.
- Place a 220px left rail below the masthead on desktop. Inset links 12px and use 40px rows with a 3px active rule. The Create action always precedes the content and audience navigation.
- Center the main workspace within its available area, with a 1200px maximum and 32px horizontal padding. Use a 24px vertical gap between page sections and 16px between related controls.
- Home places three concise stats in a horizontal band. Below the band, give the recent-post list roughly two-thirds of the width and the drafts panel one-third. Stack at narrow widths.
- Posts keeps tabs on their own line beneath the title and puts search, filter, and sort in one toolbar. Use 64px article rows, 44px thumbnails when available, and clear separation between metrics and row actions.
- Subscribers uses 36px table headers, 46px rows, and aligned metric columns. Open details as a routed 396px inspector at desktop widths of at least 1180px. Below that threshold, render the same detail as a full page.
- The editor uses a centered 680px writing column below a toolbar. On wide screens, Continue opens a 392px review panel on the right, with a footer for the primary action. On compact screens, show review as a full-page step.
- The publication reader uses a 680px max article width and a thinner masthead. Align the discussion with the article. Use 36px avatars with 16px reply indentation and a visible thread line.
- Below 860px, replace the rail with a masthead navigation drawer, set horizontal padding to 16px, and wrap action toolbars. Give the subscriber table a scroll region and keep the selection and action controls reachable. Below 600px, move large dialogs into a bottom sheet with the title and footer visible while the content scrolls.

## 5. Components

| Component | Specification |
| --- | --- |
| Primary button | 36px min height, 14px horizontal padding, 6px radius, `--action` background, white text, darker hover |
| Secondary button | Same size with white or transparent fill, 1px `--line` border, and warm hover |
| Inputs | 38px min height, 10px horizontal padding, white fill, 1px border, 6px radius, persistent label or accessible name |
| Tabs | Text labels in a single strip, 42px height, 2px bottom rule for selection, count where applicable |
| Table | White canvas with hairline separators, muted header fill, checkbox selection, end-aligned numbers, and row focus and hover styling |
| Status labels | 12px text with 4px radius and pale semantic backgrounds, e.g. Draft, Scheduled, Paid, Comp, or Pinned |
| Menu | At least 176px wide, 6px padding, 36px items, visible divider above destructive choices |
| Confirm dialog | 464px max width, 24px padding, written item count and effect, 12px radius, focus trap, Escape and Cancel; focus returns to the trigger |
| Editor toolbar | Grouped 32px icon buttons for inline formatting, lists, and links, visible active states, labels on hover and accessible names |
| Empty state | Title that names the view and one relevant action when available, e.g. Create article, Add subscribers, or Clear filters |
| Feedback | Inline input errors; status message after a committed action, with labels and live region for assistive technology |

## 6. Elevation

- In-flow surfaces use a 1px border and a 6px to 8px radius for panels. Tables use straight internal row edges.
- Menus use `0 4px 14px rgb(42 29 19 / 12%)` and a 1px border.
- Dialogs use `0 12px 36px rgb(42 29 19 / 20%)` over `rgb(36 28 22 / 34%)`.
- The inspector uses an inset left border and `-4px 0 18px rgb(42 29 19 / 6%)`.
