# Chewy Account Design

## 1. Visual theme

Use a cream canvas, a quiet off-white navigation rail, and deep blue controls. Treat the home screen like a pet care dashboard. Give the next delivery the most space, then use compact order rows and individual pet portraits to show what needs attention. Render `Chewy` as plain text in the header using the same type family as the headings.

Use original local artwork for a dog and cat beside a parcel on the Autoship overview card. Draw from simple geometric shapes, navy outlines, flat apricot and sage fills, and a cream field. Create small local illustrations for pet species and product categories. Keep illustrations decorative when the adjacent text already labels the subject. Use PNG or WebP assets or CSS-built illustrations, with a local fallback for unknown categories and species.

## 2. Color palette

| Token | Value | Role |
| --- | --- | --- |
| Brand | `#1646A3` | Wordmark text, primary buttons, links |
| Brand hover | `#123780` | Primary action hover |
| Brand soft | `#EAF1FF` | Selected navigation, informational details |
| Canvas | `#F6F4ED` | Main background |
| Rail | `#FCFBF7` | Account navigation |
| Surface | `#FFFFFF` | Cards, dialogs, input and menu surfaces |
| Text | `#18253A` | Headings and body |
| Muted | `#546176` | Supporting text |
| Border | `#D9E0E9` | Card borders and dividers |
| Input border | `#77859B` | Form boundaries |
| Hero | `#E5EEDC` | Delivery panel background |
| Artwork accent | `#F6CAAC` | Portrait and parcel artwork |
| Success | `#245648` on `#E2F2E9` | Delivered, active, refunded |
| Warning | `#704913` on `#FFF0D6` | Processing, return requested |
| Danger | `#9D2D37` on `#FDEBED` | Validation, destructive actions |
| Quiet status | `#4F5C70` on `#EEF1F4` | Canceled, removed |

## 3. Typography

Use system stacks so the rendered interface works offline. Use `Georgia, serif` for page headings and `system-ui, 'Segoe UI', sans-serif` elsewhere.

| Role | Family | Size and line height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Wordmark | Sans | 25px / 30px | 800 | -0.7px |
| Page heading | Serif | 42px / 47px | 600 | -0.8px |
| Section title | Sans | 22px / 29px | 700 | -0.35px |
| Card title | Sans | 17px / 24px | 700 | 0 |
| Body and form fields | Sans | 15px / 23px | 400 | 0 |
| Controls | Sans | 14px / 20px | 650 | 0 |
| Metadata | Sans | 13px / 19px | 500 | 0.05px |

## 4. Layout

- Desktop header is 68px high. Use a 224px navigation rail and a main column up to 1200px wide with 36px gutters. Space major sections 28px apart and cards 16px apart. Use a 20px card radius and 20–24px card padding.
- The overview starts with the page heading and a delivery card spanning the main column. Use a two-column area below for recent orders and pets, at roughly a 3:2 ratio. Detail pages use a wide content column and a narrow summary column where both add value.
- Below 900px, move navigation to a horizontally scrollable row and reduce main gutters to 24px. Below 600px, use 16px gutters, a 32px / 38px page heading, and a single stacked column. Keep actions visible as rows wrap and keep list items readable without horizontal page scrolling.

## 5. Components

- Buttons use `min-height: 44px`, `padding: 10px 16px`, and `border-radius: 12px`. Primary actions use blue fill and white text. Secondary actions use a white surface, blue text, and visible border. Reserve red styling for the final destructive action.
- Inputs and selects use visible labels, `min-height: 44px`, `padding: 10px 12px`, and `border-radius: 10px`. Show field errors adjacent to the affected control. Apply `outline: 2px solid #1646A3` with `outline-offset: 3px` on keyboard focus.
- Rows show a meaningful title, date or identifying metadata, status with a text label, and a named action. Keep each action reachable by keyboard. Use tabular numbers for prices and order totals.
- Use a modal up to 520px wide for confirmations, with a title, current/proposed values where relevant, Cancel, and one labeled commit button. Use a dedicated page for the multi-line return form. Keep focus in the modal while open and restore it when dismissed. Announce save feedback without moving focus.

## 6. Elevation

- Cards use a 1px border. Hoverable cards can add `0 3px 12px rgba(24, 37, 58, 0.06)`.
- Menus use `0 8px 24px rgba(24, 37, 58, 0.12)`. Dialogs use `0 20px 60px rgba(24, 37, 58, 0.22)` over `rgba(24, 37, 58, 0.40)`.
