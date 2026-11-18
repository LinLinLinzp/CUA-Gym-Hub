# Loom Account Design System

## 1. Visual Theme

Use an editorial workspace with a slim horizontal masthead, a warm paper canvas, deep plum typography, and violet actions. The first screen pairs a wide “My Library” header with a three-column recording inventory and a slim folder panel on the right. Keep the masthead continuous across the full width. Use a dedicated folder index and put the discussion next to the player on the video detail.

Thumbnail art depicts fictional work artifacts such as planning boards, ticket lists, performance reports and annotated drafts. Build a set of original compositions as local assets, with varied silhouettes, colors and title placement. The assets can use synthetic document blocks and shapes with no logos. Original local video samples can reuse the same scenes with motion.

## 2. Color Palette

| Token | Value | Role |
| --- | --- | --- |
| Canvas | `#F8F6F1` | Main page background |
| Surface | `#FFFFFF` | Cards, forms, navigation |
| Ink | `#251C34` | Primary text, wordmark |
| Muted | `#655D72` | Metadata, descriptions |
| Border | `#DDD7E3` | Dividers and outlines |
| Action | `#5639BF` | Filled actions, links and focus ring |
| Action hover | `#462BA5` | Filled button hover |
| Selection | `#EEE8FB` | Active tabs and selection |
| Moss | `#29533E` | Success text on `#E7F2EB` |
| Amber | `#7D4B12` | Archive status on `#FBEDD7` |
| Berry | `#A02843` | Destructive text and actions |

## 3. Typography

| Role | Font | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- | --- |
| Wordmark | Georgia, serif | 30px | 700 | 1 | -0.05em |
| Page title | Georgia, serif | 46px | 700 | 1.06 | -0.045em |
| Section title | system-ui, sans-serif | 19px | 650 | 1.3 | -0.02em |
| Card title and controls | system-ui, sans-serif | 15px | 650 | 1.4 | 0 |
| Body | system-ui, sans-serif | 15px | 400 | 1.5 | 0 |
| Metadata | system-ui, sans-serif | 13px | 450 | 1.4 | 0 |

## 4. Spacing and Layout

- Masthead is 68px tall with a 1px bottom border. At desktop width place Loom at left, Library, Folders and Archive next, then search and the signed-in account avatar at right.
- Center a maximum-width 1440px content frame with 48px desktop horizontal padding and 36px top padding. Use the title and concise account context on the left and New Folder and New Video actions on the right.
- Use a desktop grid of `minmax(0, 1fr) 252px` with a 24px gutter. The recording grid uses three columns at wide desktop widths, 16px gaps and 16:9 media. The folder panel shows a short slice of actual folders with a View all folders link.
- At 1100px use a two-column recording grid. At 880px place the folder panel in the normal page flow below recordings and move discussion below the player. At 620px use a single card column, 16px page gutters and a wrapped masthead with a full-width search.
- On video detail use a fluid player column plus a 340px discussion column. Place the breadcrumb and title above both. In folders and Archive use lists or the shared card grid with visible empty states and clear action labels.

## 5. Components

- Primary action uses the Action fill and white text, 40px minimum height, 14px horizontal padding and 10px radius. Secondary controls use white with a 1px Border outline. Icon buttons need accessible names and a minimum 36px target.
- Search uses a 40px tall outlined field with an explicit Search label, a clear control when populated and a results heading when active. Sort uses a labeled select or a menu with a visible current value.
- Media cards use a white surface, 1px Border outline and 12px radius. The thumbnail fills the top of the card. Anchor duration on a dark high-contrast chip in the lower-right corner. Put the tappable title and metadata below the thumbnail. Keep the overflow button independent of the card link and visible with keyboard focus.
- Folder rows use a small color tile, the folder name and a count. Use initials on a colored tile for the account and discussion avatars.
- Dialogs use a white surface, 16px radius, up to 480px width, 24px padding and clearly labeled fields. Use a visible error near the affected input. Destructive confirmations identify the item and consequences. Return focus to the trigger or the nearest surviving control on close.
- Use a 2px Action focus ring with a 2px offset. Provide feedback near the affected list or detail view and announce successful mutations in a polite live region. Keep short labels consistent between menus, buttons and dialogs.

## 6. Elevation

- Cards rely on borders. On hover use `0 4px 16px rgb(37 28 52 / 8%)`.
- Menus use `0 8px 24px rgb(37 28 52 / 15%)` with a 10px radius.
- Dialogs use `0 20px 60px rgb(37 28 52 / 24%)` with a `rgb(37 28 52 / 35%)` backdrop.
