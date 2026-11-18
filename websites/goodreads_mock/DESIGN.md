# Goodreads account design

## 1. Visual theme

Design a personal reading journal with a deep blue header, a pale slate canvas and a warm yellow accent. Large serif headings and abstract illustrated book covers establish the editorial character. The layout uses a full-width shelf selector below the page heading and a spacious book grid below it. Use the Goodreads name as a text wordmark in the header.

## 2. Color palette

| Token | Value | Role |
| --- | --- | --- |
| Ink blue | `#182C46` | Masthead, book titles and primary headings |
| Canvas | `#F3F5F8` | App background |
| Surface | `#FFFFFF` | Cards, dialogs, menus |
| Body | `#263A52` | Body copy and controls |
| Muted | `#536578` | Authors, dates and secondary labels |
| Amber | `#FFCA62` | Masthead selection and challenge highlights, paired with ink text |
| Action | `#234D73` | Text links and primary buttons |
| Action hover | `#173650` | Hover and active states |
| Border | `#D5DFE8` | Surface dividers |
| Control border | `#71859A` | Input and button boundaries |
| Success | `#21624D` | Success status |
| Warning | `#805400` | Warning text and unrated form feedback |
| Error | `#A12739` | Validation and destructive actions |
| Focus | `#176CB0` | Focus ring on the canvas, use amber in the header |

## 3. Typography

Use system-local Georgia for display and system-ui for navigation, body and controls. Set the wordmark in 28 px Georgia bold with 1.1 line height and −0.02em tracking.

| Role | Font | Size | Weight | Line height | Letter spacing |
| --- | --- | --- | --- | --- | --- |
| Page heading | Georgia | 48 px | 700 | 1.08 | −0.035em |
| Section heading | Georgia | 28 px | 700 | 1.18 | −0.015em |
| Card title | Georgia | 20 px | 700 | 1.2 | −0.01em |
| Body | System UI | 15 px | 400 | 1.55 | 0 |
| Label / button | System UI | 14 px | 650 | 1.35 | 0 |
| Caption / date | System UI | 13 px | 500 | 1.4 | 0 |

## 4. Spacing and layout

- Header height 72 px on desktop. Center header and main content in a 1240 px rail with 32 px gutters. Start page content 40 px below the header. Use 24 px between major blocks.
- My Books uses a title and “New shelf” action, followed by a shelf bar and a compact search and sort row. Place the result count by the controls. Group custom shelves in a labeled popover or an expandable wrapping list with counts and management controls.
- Library and catalog cards use a responsive grid with a 232 px minimum track and 20 px gap. Each card has a tinted cover well with a locally authored 2:3 cover, then metadata and controls in a 16 px padded body. Keep actions consistently aligned.
- Book detail uses a 240 px cover column alongside the synopsis and personal controls. Reviews and reading dates follow under clear headings. My Reviews uses a vertical list with a 56 × 84 px thumbnail, title, rating and edit affordance.
- Challenge opens with a 1.4:1 split between the progress panel and recent finish activity on desktop. Give the count a 52 px display treatment and pair the progress bar with written progress. Use a clearly labeled year selector and primary goal action.
- Below 760 px, wrap the header into navigation and search rows, reduce gutters to 16 px, use a 36 px page heading, stack the challenge and book detail panels, and wrap shelf controls. Support 320 px without horizontal page overflow.

## 5. Components and assets

- Primary buttons use an action-blue fill, white text and an 8 px radius. Secondary buttons use white fill, ink text and a 1 px control border. Target a 44 px minimum height with 14 px horizontal padding. Use contextual labels such as “Save goal” and “Delete review”.
- Fields use white fill, a 1 px control border, an 8 px radius and associated visible labels. Keep errors next to the field and programmatically associated. Use a 2 px focus ring with a 2 px offset. Ensure every action is reachable by keyboard.
- Cards use white fill, a 1 px border and a 14 px radius. Shelf tabs use a filled active state and readable book counts. Menus use a 10 px radius and a clear selected state. Dialogs are up to 520 px wide with 24 px padding, focus containment, Escape dismissal and focus return.
- Draw cover motifs locally with CSS or locally authored SVG. Use several treatments such as branches, contour lines, layered hills, constellation marks and geometric type blocks. Set each cover’s palette and motif from the seeded book record. Use synthetic book names and authors, with CSS cropping rules safe for long titles. Use account initials for reader avatars.
- Use an accessible rating group with numeric labels, named icon controls, dialog headings and visible status text. Announce completed saves and inline errors through appropriate live regions.

## 6. Elevation

Keep cards and the page header flat. Use `0 8px 24px rgb(24 44 70 / 14%)` for floating menus, `0 20px 64px rgb(24 44 70 / 24%)` for dialogs and `rgb(14 29 46 / 48%)` for the dialog backdrop.
