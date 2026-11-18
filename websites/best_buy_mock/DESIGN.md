# Best Buy account design

## Visual direction

Use a warm off-white canvas, midnight blue typography, cobalt controls, and small yellow accents. Set **Best Buy** in bold plain text in a slim masthead. Below it, a compact left rail holds account navigation, while the workspace uses a large page title and aligned rows. The Overview leads with an ink-blue account panel and one original still life of abstract electronics. Use the title and supporting text to identify the account and orient the shopper. A recent-order list and service links follow.

## Color palette

| Token | Value | Role |
| --- | --- | --- |
| Canvas | `#F6F5F0` | Main background |
| Surface | `#FFFFFF` | Cards, forms and masthead |
| Ink | `#16233C` | Primary text and overview panel |
| Muted text | `#536078` | Secondary labels and dates |
| Brand blue | `#173DC9` | Primary actions, links and selected navigation |
| Blue hover | `#102D9F` | Primary hover and pressed state |
| Blue tint | `#EEF2FF` | Selected navigation and information surfaces |
| Yellow | `#F9D649` | Illustration accent and dark-panel callout |
| Border | `#D9DFE9` | Dividers, cards and form strokes |
| Input stroke | `#8390A3` | Input boundaries on white |
| Success | `#146346` on `#E7F6ED` | Delivered, completed, active |
| Warning | `#794600` on `#FFF2D0` | Pending, processing, ready for pickup |
| Error | `#AD2936` on `#FDECEE` | Invalid values, destructive action and error |

Use text with every status. Use ink labels on yellow and white labels on blue. Focus uses a `2px solid #173DC9` outline at `3px` offset, with a white outline on the dark panel.

## Typography

Use `system-ui, 'Segoe UI', sans-serif` with tabular numerals on prices and identifiers. Left-align body text and right-align amounts in desktop lists.

| Role | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- |
| Masthead wordmark | 22px | 800 | 1.1 | `-0.04em` |
| Overview greeting | 42px | 750 | 1.08 | `-0.045em` |
| Page heading | 34px | 750 | 1.15 | `-0.035em` |
| Section heading | 22px | 700 | 1.25 | `-0.02em` |
| Body and navigation | 15px | 400–650 | 1.5 | normal |
| Labels and captions | 13px | 600 | 1.4 | normal |

## Layout and spacing

- Use a 64px masthead and a centered `max-width: 1320px` layout with 32px desktop gutters. Set the rail to 208px with a 32px workspace gap and `minmax(0, 1fr)` for the main column. Start the workspace 32px below the masthead.
- The overview panel uses `min-height: 210px`, 28px inset, and a `16px` radius. Give the illustration about 35% of the panel width. Follow with a two-column workspace for recent orders and service shortcuts, with a 24px gap. Use a single column on narrower screens.
- Use 12px radius on standard cards, 16–20px card padding, 12px between controls, and 28px between sections. Detail pages pair item information with a narrower summary or action panel on wide screens. Keep form content around 640px so ticket and return forms scan easily.
- At widths below 960px, reduce outer gutters to 20px and rail width to 168px. At widths below 720px, move the rail into a wrapped navigation row and use a single-column workspace with 16px gutters and 28px page titles. Use labeled stacked rows in dense lists. Keep all primary controls within the viewport at 390px.

## Component patterns

- **Navigation** · Minimum 44px-tall links, 10px radius, 12px inline padding, and `aria-current="page"` for the active item. Keep account name visible in the masthead.
- **Buttons** · Minimum 44px height, `0 16px` padding, 8px radius, and 650 weight. Use cobalt fills for primary actions, white and a border for secondary actions, and red for destructive confirmations. Show progress in the confirming control and disable repeat submission during that action.
- **Inputs** · Minimum 44px height, `1px solid #8390A3`, 8px radius, and 12px horizontal padding. Keep labels above inputs and validation below them. Associate errors with the controls they describe.
- **List rows** · Use a 48px product thumbnail, primary identifier or product name, secondary metadata, and a visible detail link. Align prices and dates where space permits. Use status labels in compact pills. Preserve scan order on mobile.
- **Dialogs and review views** · Use a 520px maximum width for compact confirmations. Provide a labeled heading, close and back actions, and focus return. Keep longer return and protection forms inline, with a review step before the final commit. Provide a persistent link or identifier after success.
- **Empty states** · Show a brief message and, where applicable, a link to orders or an action to clear filters. Show missing optional values as an em dash or omit the associated block.

## Elevation and illustration

Use `0 1px 2px rgb(22 35 60 / 0.06)` on cards and `0 18px 48px rgb(22 35 60 / 0.18)` on dialogs, with a `rgb(22 35 60 / 0.42)` scrim. Keep list dividers flat. Draw the Overview still life in-house with a dark notebook display, a softly lit blue headphone silhouette, and a small yellow charging case on a navy ground. Create original local raster variants for product categories or draw the miniatures directly in CSS. Use an abstract neutral device shape for an unfamiliar image key. Treat decorative images as decorative in accessibility markup. The masthead wordmark stays live text.
