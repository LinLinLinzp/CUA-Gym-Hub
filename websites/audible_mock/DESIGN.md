# Audible Account Design

## 1. Visual Theme and Atmosphere

Design the account as a personal listening shelf. A dark aubergine navigation rail anchors a warm paper canvas. Large serif headings, illustrated square covers, and fine horizontal rules give the views an editorial rhythm. The text wordmark `Audible` sits at the top of the rail. Use orange for emphasis and an amber surface for the credit indicator.

Library uses roomy, compact rows with thumbnail covers. Browse is the one grid-led view. Keep the account frame consistent across Library, Browse, Wish List, Credit summary, and Purchase history. Use original local artwork for the seeded titles, with a neutral square fallback when an injected title has no usable cover.

## 2. Color Palette and Roles

| Role | Hex | Use |
| --- | --- | --- |
| Navigation | `#2C2435` | Rail background and primary button fill |
| Navigation foreground | `#FAF4EB` | Wordmark and active rail text |
| Navigation muted | `#D3C5D7` | Inactive rail text |
| Navigation active | `#493B52` | Selected and hover rail background |
| Brand orange | `#F5A45D` | Active rail marker and cover palette |
| Link orange | `#913C1E` | Links and focus rings on light surfaces |
| Canvas | `#F7F3EC` | Page background |
| Surface | `#FFFCF7` | Inputs, cards, dropdowns, and dialogs |
| Text | `#28222B` | Titles and body copy |
| Secondary text | `#615764` | Author, dates, and supporting values |
| Border | `#D8CFC6` | Dividers and secondary button outlines |
| Credit surface and ink | `#FBE9CC` / `#703A19` | Credit count, balance panel |
| Positive surface and ink | `#E6F0E8` / `#254B37` | Finished, refunded, and success states |
| Destructive surface and ink | `#F9E5E1` / `#812F32` | Return confirmation and inline failure |

## 3. Typography Rules

Use Georgia with a serif fallback for display type and system UI with Segoe UI as a fallback for controls and body text. Both work offline.

| Role | Family | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- | --- |
| Text wordmark | Georgia | 27px | 700 | 1.12 | -0.035em |
| Page title | Georgia | 48px desktop, 34px compact | 400 | 1.06 | -0.045em |
| Section title | Georgia | 26px | 400 | 1.2 | -0.025em |
| Row title | System UI | 16px | 650 | 1.35 | Normal |
| Body and controls | System UI | 14px | 400 or 600 | 1.5 | Normal |
| Metadata | System UI | 13px | 400 | 1.4 | Normal |
| Credit balance | Georgia | 42px | 400 | 1 | -0.04em |

## 4. Spacing and Layout

- At 1200px and wider, use a 224px rail, a 72px utility header, and a content column capped at 1200px with 48px horizontal padding. Use 40px between major sections and 16px between controls.
- The rail lists Library, Browse, Wish List, Credit summary, and Purchase history. Place the member name and plan below the destinations. Include a labeled catalog search and a live balance link in the utility header.
- Align title, author, and action columns in Library and Wish List. Use 68px square cover thumbnails and 16px vertical row padding. Add a separator between rows and allow titles to wrap. On Browse, use a responsive grid with 190px minimum card width, 20px gaps, and square covers.
- Use an amber balance panel on Credit summary, followed by available credits and credit activity. Purchase history follows the Library row rhythm. Order details use a compact receipt panel with the original payment and linked refund when available.
- Below 900px, use 24px content padding and move the full rail into a top header with a wrapping destination list. Below 560px, use 16px padding, place search on its own line, and stack row action controls below title metadata. Keep clickable controls at least 44px high and avoid horizontal scrolling.

## 5. Component Patterns

- Buttons use 44px minimum height, 8px border radius, and 14px horizontal padding. Primary buttons use aubergine with cream text. Secondary buttons use the light surface and a 1px outline. Text actions use the link color. Put the title in the accessible name for repeated row actions.
- Search and selects use 44px minimum height, 8px radius, and a 1px border. Include a real label. Active tabs use a 2px orange-brown underline and dark text. Use visible 2px focus outlines with a 3px offset and communicate selection by more than color.
- Cover images use a 6px radius. Commission or generate original local square artwork for the synthetic catalog. Use distinct palettes and motifs such as a monsoon skyline, an illustrated seed packet, and a printed astronomy chart. Keep real titles, characters, covers, logos, and screenshots out of the image set. Store runtime artwork under `public/` and frame it as decorative when the adjacent title already identifies the record.
- Dialogs use a 440px maximum width, 24px padding, 16px radius, a labeled heading, and stacked confirmation controls on narrow screens. Include the title and the credit or refund quantity before confirmation. Put keyboard focus inside the dialog, support Escape, and restore focus to the trigger or a logical replacement when it closes.
- Use inline text for unavailable actions and screen-reader status messages for confirmed actions. Keep destination links and primary actions visible without relying on hover. Use a heading and one relevant recovery action for empty and error states.

## 6. Shadow and Elevation

Resting rows and surfaces use borders. Cards use `0 3px 10px rgb(44 36 53 / 7%)`. Dropdowns use `0 8px 24px rgb(44 36 53 / 14%)`. Dialogs use `0 16px 48px rgb(44 36 53 / 24%)` over a `rgb(44 36 53 / 45%)` scrim.
