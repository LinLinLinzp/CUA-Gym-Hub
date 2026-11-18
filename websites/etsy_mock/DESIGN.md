# Etsy buyer account design

## Visual theme

Use a warm paper background, aubergine account panels, and clay-orange actions. The landing page is an account overview with a two-column activity area and a row of illustrated saved listings. Carry the same account navigation, form styles, and typography across shopping and support. Render `Etsy` as editable text in a local serif face. Set the browser title to `Etsy` or `<page> | Etsy`.

## Color and roles

| Role | Value | Usage |
| --- | --- | --- |
| Brand | `#B83F1C` | Etsy wordmark, primary buttons on light surfaces |
| Action hover | `#963115` | Primary button hover |
| Page background | `#F8F3ED` | Main canvas |
| Card surface | `#FFFCF8` | Tools, lists, and forms |
| Warm accent | `#F1D9CB` | Selected filters, tiny chips, and illustration backing |
| Deep accent | `#332635` | Account overview panel and mobile nav text |
| Deep panel text | `#FFF7EF` | Text on deep accent surfaces |
| Primary text | `#2D2328` | Headings, body, and key numbers |
| Secondary text | `#695C63` | Metadata, secondary copy, inputs |
| Border | `#E5D8D0` | Separators and card outlines |
| Control border | `#887680` | Input boundaries on light backgrounds |
| Focus | `#694077` | Three-pixel outline outside interactive controls on light surfaces |
| Success | `#265941` on `#E1EFE5` | Delivered, payment confirmation |
| Warning | `#735016` on `#F8EDCD` | In progress, awaiting action |
| Error | `#911D2C` on `#F9E2E5` | Invalid input, failed operation, destructive confirmation |

## Typography

Use system fonts offline. Define `Georgia, 'Times New Roman', serif` for display and `system-ui, 'Segoe UI', sans-serif` for the UI. Use tabular numerals for amounts and counts.

| Role | Font | Size | Weight | Line height | Letter spacing |
| --- | --- | --- | --- | --- | --- |
| Etsy wordmark | Georgia | 30 px | 700 | 1 | -0.05em |
| Dashboard title | Georgia | 44 px / 34 px on mobile | 400 | 1.06 | -0.03em |
| Route title | Georgia | 36 px / 30 px on mobile | 400 | 1.13 | -0.025em |
| Section title | Georgia | 24 px | 400 | 1.2 | -0.015em |
| UI labels | system UI | 14 px | 600 | 1.35 | 0 |
| Body | system UI | 15 px | 400 | 1.52 | 0 |
| Metadata | system UI | 13 px | 400 | 1.45 | 0 |

## Grid and responsive layout

- Center the shell at 1320 px max with 32 px desktop outer padding, 24 px on tablet, and 16 px on mobile. Use an eight-pixel spacing base. Main sections are 24–32 px apart and section grids use 16–20 px gaps.
- Use a 72 px masthead with the wordmark left, expandable search in the middle, and labeled Cart with count at right. Below it, desktop uses a 208 px account rail and a 28 px gutter. Links cover Overview, Purchases, Messages, Cases, and Favorites. The active route uses a tinted surface and a clear `aria-current` indicator.
- On the overview, a 176 px minimum-height aubergine panel holds the buyer's name, one short useful status summary derived from state, and a Browse marketplace action. Beside or below the panel as space permits, show two small linked sections for the latest order and recent messages, with a saved-item grid below. Avoid counting decorative sections or duplicating labels.
- Listing results use up to four columns of 4:3 artwork. Product detail uses a 55/45 grid. Checkout uses a flexible left form and a 320 px summary. Purchases uses receipt rows with aligned costs. Messages uses a 280 px inbox and flexible conversation. Case details and order help forms use a readable measure of about 65 characters.
- Below 900 px, let the account rail become a horizontal scrollable nav. Below 640 px, stack checkout and detail columns, wrap search below the wordmark/Cart row, and use two product columns down to 360 px then one if needed. On narrow screens, the inbox and thread are separate route views with a Back to messages link. Keep touch targets at least 44 px and the main workflow usable at 360 px.

## Components and elevation

- Primary button uses a 44 px minimum height, 0 18 px padding, 10 px radius, brand fill and white text. Secondary button uses the same geometry, with a transparent or paper fill and a control-colored border. Disabled controls have a visible reason nearby where needed.
- Inputs use 44 px minimum height, 12 px horizontal padding, an 8 px radius, `#FFFCF8` surface, visible label, and field-specific errors. Keep keyboard order logical. Use `aria-pressed` and accessible action names for favorites, `role="status"` for progress, and live feedback for submit outcomes.
- Cards use a one-pixel border, 16 px radius, and 16–20 px internal spacing. Listing art uses a 12 px radius and muted, category-appropriate backgrounds. A visible favorite button sits atop the image without covering the title link. Status pills pair text with color and use 6–8 px horizontal padding.
- Dialogs use up to 520 px width and 24 px padding with an 18 px radius and `rgba(32,24,31,.46)` backdrop. Handle focus entry and return, Escape, and keyboard trapping. Use an ordinary page for checkout and the main support forms so deep links work.
- Use the border on standard cards. Elevated cards may use `0 6px 20px rgba(51,38,53,.08)`. Menus and dialogs use `0 16px 42px rgba(51,38,53,.18)`. In dark panels use a light focus ring such as `#FFE6A9`.

## Artwork

Create original local product still lifes or illustrations for ceramics, stationery, prints, jewelry, textiles, and woodwork. Use warm daylight, neutral backdrops, and clear product silhouettes so categories are recognizable at thumbnail size. Give featured items distinct images and use multiple images per category across the catalog. Put assets under `public/images/` and use a local fallback image for missing art. Use buyer and shop initials when a portrait adds little value.
