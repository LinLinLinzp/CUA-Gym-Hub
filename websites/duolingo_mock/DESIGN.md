# Duolingo account design

## Visual theme

Use a warm desktop account workspace modeled on a language-study notebook. A plum masthead and tab strip sit above a cream sheet. A local geometric illustration of an open notebook and overlapping language cards anchors the Overview. Use simple lines, quarter circles, and solid fills. Use the Duolingo name as text. Carry bright green into small course accents and progress indicators.

## Color roles

| Role | Value | Use |
| --- | --- | --- |
| Masthead | `#2D203D` | Header and navigation background |
| Page | `#F7F4ED` | Main canvas |
| Surface | `#FFFCF7` | Cards, inputs and dialogs |
| Ink | `#282132` | Heading and body copy |
| Muted ink | `#665D70` | Supporting text and dates |
| Border | `#DCD3E2` | Dividers and card borders |
| Input outline | `#8F8298` | Form control borders |
| Action | `#583A78` | Primary button and active tab |
| Hover and focus | `#432960`, `#7A52AB` | Action hover and focus ring |
| Lavender | `#ECE1F5` | Illustration panel and selected rows |
| Green | `#58CC02`, `#285A25`, `#E5F1D8` | Progress fill, success text and tinted background |
| Apricot | `#F7DFBF`, `#75441D` | Reward and time-sensitive surfaces and text |
| Destructive | `#9D3338`, `#F8E1DF` | Removal and validation |

Use pale and saturated colors as accents, with dark text on light backgrounds. Pair status color with a short label. Match icons to ink or the action color.

## Typography

| Role | Font | Size / line height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Wordmark | Georgia, serif | 26 / 30 px | 700 | −0.02 em |
| Page heading | Georgia, serif | 42 / 46 px | 700 | −0.025 em |
| Section heading | Georgia, serif | 26 / 32 px | 700 | −0.015 em |
| Card title | Segoe UI, system-ui, sans-serif | 18 / 25 px | 650 | Normal |
| Body and controls | Segoe UI, system-ui, sans-serif | 15 / 22 px | 400–650 | Normal |
| Caption | Segoe UI, system-ui, sans-serif | 13 / 18 px | 500 | Normal |

## Layout and spacing

- No sidebar. Use a full-width 66 px masthead with wordmark at left and learner initials, display name, and gem count at right. The 44 px navigation strip follows the masthead. Use a 3 px accent line and a clear active label for the current route.
- Center the page at a maximum of 1,248 px including its 32 px horizontal padding. Begin content 32 px below the nav. Use a 20 px grid gap and a 32 px gap between sections.
- Overview begins with a 248 px minimum-height two-column feature panel. Put active course name, unit or XP progress, and `Continue learning` at left. Put the notebook art at right with lavender and apricot fields. Follow with equal-width Goals and Friends Quests summary cards, then recent activity if present.
- Courses begins with a current-course strip, then a searchable catalog with a three-column grid. Show each course name, language badge, enrollment status, and relevant action. Put destructive controls behind a clearly labeled menu or a separate `Remove course` button on enrolled cards.
- Goals begins with the current period's progress, followed by filters and goal rows. Show the metric, cadence, progress label and bar, and edit/archive actions on each applicable row.
- Friends Quests begins with a shared progress card and the two participants, followed by joinable cards and filterable history rows. Show date, progress, and reward status where they apply. Display names and initials in contrasting 40 px circles.
- Below 960 px use two columns for catalog. Below 680 px stack cards, drop horizontal padding to 16 px, allow nav wrapping, and reduce the page heading to 32 / 38 px. Keep controls operable at a 360 px viewport and avoid horizontal page scrolling.

## Components and interaction

- Buttons and inputs are at least 44 px tall with 10 px corners and 14 px horizontal padding. Primary buttons use plum and white. Secondary buttons use the light surface and plum text. Use a visible 2 px focus ring with a 2 px offset. Progress bars are 8 px high with a full numeric text equivalent.
- Cards use a 16 px radius, a 1 px border, and 20–24 px padding. Use `0 2px 3px rgb(45 32 61 / 6%)` where elevation clarifies hierarchy. Use thin separators for histories instead of a separate card for every row.
- Center dialogs with a 520 px maximum width, 20 px radius, 24 px padding, a dimmed plum scrim, and `0 18px 60px rgb(45 32 61 / 20%)` shadow. Capture focus, support Escape, and return focus to the triggering control. Label primary and cancel actions explicitly. Leave goals and partner selection visible behind validation errors.
- Use labeled inputs, clearly described empty states, and polite feedback for successful saves. All visuals ship locally. Build the notebook art and language badges from original CSS shapes and type. Use original CSS or type-based glyphs for icons, supplemented by accessible text labels.
