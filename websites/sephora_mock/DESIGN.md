# Sephora account design

## Visual direction

Build an account workspace with warm ivory surfaces, wine-colored controls, and large serif page headings. A horizontal account navigation sits below the text wordmark, with a wide, asymmetrical overview. Keep the brand name plain text and give the workspace its own composition, palette, artwork, and layout.

The overview pairs a welcome heading and account shortcuts with an original cosmetic still life. Below it, use a wider recent-orders column and a narrower member and returns column. Keep the remaining views compact enough to scan long histories.

## Color roles

| Role | Token | Use |
| --- | --- | --- |
| Canvas | `#FAF6F1` | Main background |
| Surface | `#FFFCF9` | Cards, forms, and lists |
| Ink | `#241C21` | Headings and body |
| Secondary ink | `#685961` | Dates, amounts context, and help text |
| Wine | `#682D47` | Primary actions, links, active navigation |
| Wine hover | `#522237` | Hovered primary action |
| Rose tint | `#F4E3E9` | Selected states and member backgrounds |
| Line | `#E4D7DC` | Dividers and card borders |
| Control line | `#A58995` | Inputs and secondary actions |
| Success | `#225641` on `#E5F2EB` | Delivered and completed |
| In progress | `#69451C` on `#F9ECDC` | In progress and in transit |
| Error | `#922C44` on `#FBE7EC` | Inline errors and destructive confirmation |

## Type

Use Georgia or another local serif for display headings and system UI for controls and content. Use tabular figures for prices, points, and order or return numbers.

| Role | Size / line height | Weight | Tracking |
| --- | --- | --- | --- |
| Wordmark | 22 / 24 px | 650 | 0.18 em |
| Overview heading | 52 / 55 px, 36 / 40 px mobile | 400 | -0.04 em |
| Page heading | 40 / 44 px, 32 / 36 px mobile | 400 | -0.03 em |
| Section heading | 25 / 30 px | 400 serif | -0.02 em |
| Body and controls | 15 / 22 px | 400 or 600 | Normal |
| Supporting text | 13 / 18 px | 400 or 600 | Normal |

## Layout

- Center a 1184 px maximum content column with 32 px desktop, 24 px tablet, and 16 px mobile side padding. The wordmark row is 64 px tall and the account navigation row is 46 px tall.
- Use 32 px before the first section, a 24 px grid gap and section spacing of 32–40 px. Use a 7:4 overview and detail grid above 960 px. Below that breakpoint, stack summary and primary content in reading order.
- Use 18 px card corners, 20 or 24 px internal padding, 72 px minimum desktop list rows, and 44 px minimum control height. Turn dense multi-column rows into labeled stacked rows below 640 px. Keep the four account destinations reachable without growing the page width.
- Reserve decorative art for the overview and small product thumbnails. Use an original, locally authored still life showing abstract cream jars, a soft pink tube, or a wine-colored cap with studio lighting. Create a local raster asset or compose the art with CSS. Use matching original packaging silhouettes for products by category. Use consistent image boxes and keep dense history items readable when artwork is unavailable.

## Components and elevation

- **Buttons** use a wine fill and white text, 10 px radius, and 16 px horizontal padding. Secondary buttons use the surface fill, wine text, and a 1 px control border. Use text links for destinations and buttons for in-place actions. Add a 2 px wine focus ring with 3 px offset.
- **Navigation** uses a 3 px wine active indicator and readable text. The wordmark links to Overview.
- **Inputs** use visible labels, 1 px control borders, 10 px radius, 12 px horizontal padding, and linked inline validation. Search and filter controls wrap on narrow widths. Include contextual empty states with a usable next action.
- **Cards** use a 1 px line border and a `0 1px 2px rgba(36, 28, 33, .04)` shadow. Put monetary totals at the end of the row and secondary metadata beneath the primary label. Use a small tinted badge with a readable status label for each state.
- **Dialogs** use a 480 px maximum width, 20 px corners, 24 px padding, `0 20px 64px rgba(36, 28, 33, .18)` shadow, and a 40% ink scrim. Move focus inside, support Escape and keyboard navigation, and restore focus on dismissal. Keep dialog actions visible on narrow screens.
