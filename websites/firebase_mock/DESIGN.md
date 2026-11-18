# Firebase workspace design

## 1. Visual theme

Use a wide project workspace with an ink-blue masthead, a warm off-white canvas and cobalt actions. Display **Firebase** as plain text at the upper left. Follow it with the project name in the same bar and place the signed-in operator at the right. A horizontal tab strip below the masthead gives every critical workflow a consistent entry point.

The overview leads with the project name in a pale blue panel. An original local CSS illustration to its right connects four circular service nodes around a rectangular project node. Treat it as decorative and omit it on narrow screens. Four individually labeled workflow links below the panel show counts and open their respective screens. Use geometric product symbols drawn with CSS borders and shapes, and use initials for the operator avatar.

## 2. Color palette

| Role | Value | Use |
| --- | --- | --- |
| Masthead | `#17243A` | Full-width project bar and dark editor surface |
| Wordmark | `#FFFFFF` | Firebase text and primary masthead labels |
| Canvas | `#F7F7F2` | App background |
| Panel | `#FFFFFF` | Cards, tables, dialogs and nav |
| Overview accent | `#E8EEFF` | Project introduction panel |
| Primary text | `#18243B` | Headings and values |
| Muted text | `#536279` | Metadata, helper text and secondary controls |
| Border | `#D7DEEA` | Dividers, controls and panels |
| Primary action | `#244DCE` | Buttons, links and selected navigation |
| Action hover | `#1B3DAA` | Primary button hover |
| Focus | `#3266F4` | Visible outer focus ring |
| Success | `#16603C` on `#E6F6ED` | Enabled, live and connected |
| Warning | `#795000` on `#FFF1C9` | Pending and needs setup |
| Error | `#A52636` on `#FFF0F2` | Destructive action and validation |
| Neutral | `#44516A` on `#EEF1F6` | Disabled, inactive and defaults |

## 3. Typography

Use `system-ui, "Segoe UI", sans-serif` for interface text and `ui-monospace, Consolas, monospace` for source, IDs and paths.

| Role | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- |
| Project heading | 36px | 700 | 42px | -0.03em |
| View heading | 28px | 700 | 34px | -0.02em |
| Panel heading | 18px | 650 | 25px | -0.01em |
| Body and form | 14px | 400 | 21px | 0 |
| Table and caption | 13px | 400 or 600 | 18px | 0 |
| Code and identifiers | 13px | 400 | 21px | 0 |

## 4. Layout and spacing

- Masthead 64px. Tab strip 52px. Cap inner content at 1280px and align both bars to the main canvas.
- Use 32px desktop outer gutters and 20px panel gaps. Below 800px, use 16px gutters, wrap action bars, and switch overview cards to two or one column. Keep product navigation horizontally scrollable when needed.
- Overview project panel uses 32px padding, a 12px radius and a two-column grid with text first. Workflow cards have 20px padding and lead into a recent activity list.
- Auth uses a single table panel with the search and filters above the result rows. Use 46px minimum row height and a scroll container for narrow tables.
- Firestore Data uses three panes with approximate widths 220px, 280px and remaining space. Show path breadcrumbs directly above. On narrow screens, stack lists over details while keeping the path visible.
- Rules uses an editor and version panel at roughly 2:1. Put the Playground below the editor or in a labeled drawer. Hosting pairs a Live release panel with a site selector and gives release history and domains their own panels.

## 5. Component patterns

- Primary buttons use a 40px minimum height, 14px horizontal padding, 8px radius, white text and cobalt fill. Secondary buttons use white fill and a border. Use explicit destructive verbs in red at confirmation.
- Inputs use a 40px minimum height, 8px radius, 12px side padding and a persistent label. Place validation beside the field and link it with `aria-describedby`.
- Panels have a 1px border, 12px radius and 20px padding. Empty panels retain their headings and available add action.
- Active tabs use cobalt text and a 3px indicator. Apply current-state semantics to links. Status chips use text plus color in their corresponding roles.
- Standard dialogs use up to 520px width, 24px padding and 14px radius. Document field forms may use up to 680px. Keep a scrollable body on short viewports. Escape closes, focus is contained, and closing returns focus to the opener or the nearest surviving control.
- Rules source uses the dark panel color with light text and a monospace font. Keep rule source readable when wrapping long lines. Display simulation feedback beside its Run action.

## 6. Elevation

Use flat panels with borders. Elevate menus with `0 8px 24px rgb(23 36 58 / 12%)` and dialogs with `0 20px 60px rgb(23 36 58 / 22%)` over a `rgb(23 36 58 / 48%)` backdrop. Give keyboard focus a 2px ring with a 2px offset.
