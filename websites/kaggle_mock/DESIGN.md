# Kaggle account design system

## Visual direction

Use a horizontal navigation bar above a light research workspace. A dark indigo hero on the home page introduces the three catalog entry points and the signed-in user's workspace. Catalogs use small original geometric illustrations and compact metadata; detail pages give a broad reading pane to rules, files, and notebook contents. Use Kaggle as a plain text wordmark in the same font family as the app.

## Color

| Token | Value | Role |
|---|---|---|
| Canvas | `#F4F6FA` | App background |
| Surface | `#FFFFFF` | Navigation, catalog cards, and details |
| Primary text | `#17213D` | Headlines and body |
| Secondary text | `#4E5C76` | Metadata and description text |
| Hero | `#20284F` | Home feature panel |
| Action | `#2448B9` | Primary buttons and links |
| Hover | `#1B368E` | Primary button hover |
| Accent | `#36C5E8` | Data illustration and hero accents |
| Action tint | `#E7EDFF` | Selected tabs and filters |
| Border | `#DCE2EF` | Cards and table dividers |
| Input border | `#7C89A3` | Unfocused text controls |
| Status | `#126449` / `#8B500B` / `#A8293C` | Success, caution, error, paired with labels |

## Typography

Use system `"Segoe UI", Inter, sans-serif` and `Consolas, monospace` for code. Use tabular numbers for tables.

| Role | Size | Weight | Line height | Tracking |
|---|---|---|---|---|
| Home heading | 44px | 700 | 1.10 | -0.035em |
| Page heading | 34px | 700 | 1.18 | -0.025em |
| Section heading | 22px | 650 | 1.3 | -0.015em |
| Card title | 17px | 650 | 1.35 | 0 |
| Body and controls | 15px | 400 / 600 | 1.5 | 0 |
| Metadata and code | 13px | 400 | 1.5 | 0 |

## Layout and spacing

- Use a 68px top bar with wordmark at left, primary links centered and account at right. Max content width is 1248px with 32px desktop and 16px narrow-screen gutters.
- Home uses a 300px minimum-height hero with a two-column text and illustration layout. Place three 1fr workflow cards below with a 20px gap. Stack them on small screens.
- Catalogs put page title and primary action first, then search, filters, sort and a result count in reading order. Use a responsive grid with 290px minimum cards. Controls wrap and results collapse to one column on narrow screens.
- Details use a title and action bar above tabs. Content uses a flexible main pane plus a 280px contextual rail when space permits. Stack the rail below main content under 900px. Tables can scroll within their panels.
- Use an 8px spacing base with 12px, 16px, 24px and 32px gaps for nested controls, cards, sections and page groups. Cards have a 14px radius and 20px padding.

## Components and elevation

- Primary buttons use the Action fill and white text, 42px minimum height, 16px horizontal padding and an 8px radius. Secondary buttons use a white fill, Action text and the Input border. Give keyboard-focused controls a 2px blue outline with 3px offset.
- Search and form controls use visible labels, 42px minimum height, white fill and an 8px radius. Show form errors beside fields and put success feedback in a polite live region.
- Tabs mark the current selection with an underline and semantic state. Dialogs fit within 560px and use a `rgba(23,33,61,.46)` backdrop, focus containment, Escape handling and focus restoration.
- Use `0 1px 2px rgba(23,33,61,.06)` for cards, `0 8px 24px rgba(23,33,61,.12)` for menus and `0 18px 48px rgba(23,33,61,.22)` for dialogs.
- Author original artwork locally in CSS or SVG. Base the hero on a modular chart motif of plotted lines and translucent grid marks. Use simple linework for catalog illustrations and initials for avatars. Keep decorative artwork out of the accessibility tree.
