# myUSCIS design system

## Visual direction

Use a quiet account workspace with warm paper surfaces, deep navy typography, and teal action accents. A compact vertical account rail anchors the left, while the overview leads with a warm cream welcome strip and a two-column work area. Render myUSCIS as a text wordmark. For the welcome strip, build an original abstract stack of document sheets with CSS rectangles, rules, and a warm accent circle in a local stylesheet. Mark the artwork decorative and hide it at narrow widths. Keep all task views focused on their inputs and records.

## Color tokens

| Token | Value | Use |
| --- | --- | --- |
| Brand navy | #17344F | Wordmark and headings |
| Canvas | #F5F6F3 | Page background |
| Surface | #FFFFFF | Panels, inputs and rail |
| Welcome surface | #F4ECDD | Overview welcome strip |
| Text | #182735 | Primary text |
| Muted | #516273 | Secondary text and hints |
| Action | #075F5B | Primary buttons, links and active nav text |
| Action hover | #064A47 | Primary hover background |
| Active surface | #E1EFED | Selected nav item |
| Border | #D5DED9 | Panel and table borders |
| Control border | #687B78 | Input and secondary control boundaries |
| Focus | #245BC2 | Keyboard focus outline |
| Success | #17633F on #E5F3EB | Approved or completed |
| Warning | #774908 on #FAEED6 | Evidence or action needed |
| Error | #9E352D on #FBECEA | Validation errors |
| Neutral status | #41576A on #EDF1F5 | Received and pending |

Pair status colors with visible labels. Use a white focus offset against dark controls.

## Typography

Use system fonts and tabular numerals for dates, counts, and receipt numbers.

| Role | Family | Size | Weight | Line height | Letter spacing |
| --- | --- | --- | --- | --- | --- |
| Wordmark | Segoe UI, system-ui, sans-serif | 24px | 700 | 28px | -0.02em |
| Page heading | Georgia, serif | 36px | 700 | 42px | -0.02em |
| Section heading | Segoe UI, system-ui, sans-serif | 20px | 650 | 28px | 0 |
| Body and controls | Segoe UI, system-ui, sans-serif | 16px | 400–600 | 24px | 0 |
| Record metadata | Segoe UI, system-ui, sans-serif | 14px | 400 | 20px | 0 |

## Spacing and layout

- Desktop header 64px high, 224px rail, 32px main padding, 1160px maximum content width. Use 24px between panels and 20px panel padding.
- Overview summary grid uses a 2:1 split where room permits. Use a 12px panel radius, 8px control radius, and 48px minimum row height.
- Below 900px turn the rail into horizontal navigation beneath the header and use one column. Below 560px use 16px page padding and stack form controls and action groups. Present narrow record lists as label/value rows while retaining their actions.
- Constrain wizard content to 720px. Provide a horizontal step list that wraps naturally. Keep button order consistent with the task flow.

## Components and elevation

- Primary buttons have a 44px minimum height, 16px horizontal padding, and white labels over the action color. Secondary buttons use white with a 1px control border. Text links underline when embedded in body copy.
- Inputs have visible labels above the field, 44px minimum height, 12px horizontal padding, a 1px control border, and a 3px focus outline offset by 2px. Link inline errors programmatically to the field; focus the first invalid field or the error summary after failed submit.
- Record lists use shallow dividers, generous receipt alignment, and inline detail links. Case activity uses a vertically connected series of labeled events with dates. Use meaningful empty states with the next relevant action.
- Confirmations use a persistent summary panel with the receipt or confirmation number and a meaningful destination link. Move focus to the confirmation heading when a flow completes and announce inline lookup outcomes.
- Cards use a border and no shadow. A floating disclosure may use 0 8px 24px rgb(23 52 79 / 12%). Keep the filing and address wizards in page flow.
