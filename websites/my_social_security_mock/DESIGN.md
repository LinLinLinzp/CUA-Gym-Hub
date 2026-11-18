# my Social Security — Design System

## 1. Visual theme

Use a quiet account workspace with a dark ink masthead, warm paper background and teal actions. Build the overview around current benefits and the documents people regularly return to. Use “my Social Security” as a text wordmark. On the overview hero, draw an original local illustration of two offset document sheets with rules and a restrained teal accent. Keep it decorative with empty alt text, and hide it on small screens.

## 2. Color tokens

| Token | Value | Role |
| --- | --- | --- |
| Ink | `#172B3A` | Masthead, headings, primary text |
| Paper | `#F6F5EF` | Page background |
| Surface | `#FFFFFF` | Cards, forms, tables |
| Rule | `#D8DED9` | Card outlines and dividers |
| Field outline | `#7D8B88` | Input boundaries |
| Muted ink | `#495E67` | Secondary text |
| Teal | `#086756` | Primary buttons, links and selected navigation |
| Teal hover | `#074D41` | Hover and pressed primary UI |
| Teal pale | `#E4F2EB` | Active nav, summary callouts |
| Focus | `#0069AC` | Focus outline on light surfaces |
| Focus on ink | `#A4DAFF` | Focus outline in masthead |
| Success | `#235842` on `#E4F2EB` | Ready, confirmed |
| Warning | `#754C13` on `#FFF1D7` | Attention needed |
| Error | `#A42931` on `#FCEBEC` | Field errors and unsupported actions |

Pair every status color with visible text. Use neutral tones for secondary labels like Read or Historical.

## 3. Typography

| Role | Font | Size | Weight | Line height |
| --- | --- | --- | --- | --- |
| Wordmark | Georgia, serif | 23px | 700 | 1.2 |
| Page title | Georgia, serif | 40px desktop / 32px mobile | 700 | 1.12 |
| Section title | system-ui, Segoe UI, sans-serif | 22px | 650 | 1.3 |
| Body | system-ui, Segoe UI, sans-serif | 16px | 400 | 1.5 |
| Form and table label | system-ui, Segoe UI, sans-serif | 14px | 650 | 1.4 |
| Supporting text | system-ui, Segoe UI, sans-serif | 14px | 400 | 1.45 |

Use normal letter spacing, except a `-0.025em` page title. Align money and dates with tabular numerals where supported. Keep text left aligned and make money columns right aligned.

## 4. Spacing and layout

- Use a 64px global masthead, a centered content max width of 1200px, and a desktop grid with a 224px navigation rail, 32px gap and a fluid main column.
- At desktop size use 32px outer inset, 32px between sections, 20px between cards and 24px card padding. Use a 4/8/12/16/20/24/32px spacing scale and 12px card corners.
- Place the overview greeting and illustration in a pale teal panel. Follow it with a two-column layout for current benefits and frequently used actions, then a full-width recent documents list.
- On inner routes, put the title and primary action first. Place filters above tables and put the current deposit above its history. Form and review panels should stay within a 680px reading width.
- At 760px and below, use a 16px page inset, single-column cards and text navigation in a wrap-friendly strip. Allow tables of monetary data to scroll inside a labeled container. Stack simple archive rows with their date and status below the title. Keep controls visible at 360px.

## 5. Components and accessibility

- Primary buttons use teal fill, white text, 8px radius, 12px horizontal padding and a 44px minimum height. Secondary buttons use a white surface and teal text with a 1px field outline. Keep text links underlined where they appear within sentences.
- Inputs use 44px minimum height, an 8px radius and a 1px field outline. Put labels above inputs and hints below. Associate errors with fields and focus the error summary or first invalid field on submission. Keep a 3px focus outline with 2px offset.
- Use semantic headers for the archive tables and real buttons for sorting. Search and filter update the visible count and provide a reset action when no items match. Include a main-content skip link and apply `aria-current` to navigation.
- Review steps use an inline panel with a heading and clear Back, Cancel and Confirm actions. Focus the new heading when a step changes. Use a visible inline status for a completed action so the receipt stays readable.
- Use generated local artwork and a small set of original line icons with consistent 20px boxes and 1.75px strokes. Text labels carry the meaning of navigation and actions. Use print styling that leaves the selected document with its title, numbers and sample marking.

## 6. Elevation

Cards have 1px rule borders and no shadow. A dropdown or mobile menu may use `0 8px 24px rgba(23, 43, 58, .12)`. Keep the masthead and section separators flat.
