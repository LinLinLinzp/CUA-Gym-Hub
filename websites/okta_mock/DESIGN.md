# Okta admin workspace design

## Visual direction

Use a full-width workspace bar above a warm white page. The three primary destinations sit in a horizontal navigation row beside the Okta wordmark rendered in plain text. The People landing page pairs a short title and its primary action with a compact summary band and a full-width directory table. Detail pages keep record identity and actions in a single header, with tabs directly above the content panel.

## Color roles

| Role | Value | Use |
| --- | --- | --- |
| Brand and primary action | `#304FC4` | Okta text, primary buttons, links, focus |
| Primary hover | `#243EAA` | Main button hover |
| Workspace | `#F6F5F2` | Page canvas |
| Surface | `#FFFFFF` | Masthead, table, forms, dialogs |
| Ink | `#19233B` | Headings and field labels |
| Muted ink | `#506079` | Descriptions, secondary table lines |
| Border | `#DCE1EB` | Panels and row rules |
| Control border | `#78859C` | Inputs and secondary action outlines |
| Selected and hover wash | `#EDF1FB` | Navigation, tabs, row hover |
| Active | `#216445` on `#E7F4EC` | Active status |
| Staged or suspended | `#794707` on `#FFF0D5` | Pending or restricted status |
| Deactivated | `#4D596D` on `#EDF0F5` | Inactive records |
| Error and destructive action | `#A12643` on `#FCEBF0` | Inline errors and destructive confirmations |

## Typography

| Role | Font stack | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- | --- |
| Brand | `system-ui, Segoe UI, sans-serif` | 25px | 750 | 1.15 | −0.04em |
| Page title | Same | 36px | 700 | 1.16 | −0.035em |
| Section heading | Same | 20px | 650 | 1.35 | −0.02em |
| Body, buttons | Same | 14px | 400 or 600 | 1.45 | normal |
| Table heads, captions, pills | Same | 12px | 600 | 1.4 | normal |

## Layout and spacing

- Use a 64px masthead with a subtle bottom border. Keep the active destination underlined in blue. Wrap navigation beneath the brand row when width is under 720px. Use the workspace and administrator labels to orient the reader.
- Center content with a 1280px maximum width and 32px desktop gutters. Reduce gutters to 16px below 720px. Set the title block 32px below the masthead and space major blocks by 24px.
- The People summary band uses three segments for All people, Active and Suspended counts. Each segment selects its corresponding list filter. Use plain text, dividers and 16px padding. Groups and Applications lead directly into their list panels.
- Start list panels with a search/filter toolbar and align result count and pagination below the table. Keep row heights around 56px with a 40px header. Scroll wide tables inside their panels on narrow screens. Preserve readable row labels, focus indicators and visible primary actions.
- Keep form drawers at up to 480px wide. Use a centered confirmation dialog at up to 440px wide, with a backdrop of `rgb(25 35 59 / 36%)`. Both become fluid with 16px page clearance on small screens.

## Components and elevation

- Primary buttons have a 40px minimum height, 16px horizontal padding, 8px radius, the blue fill and white text. Secondary buttons use a white surface and the control border. Keep a 2px blue keyboard focus outline offset by 2px.
- Inputs use 40px minimum height, an 8px radius, explicit labels, and inline errors associated with their field. Dialogs and drawers move focus inside on open and restore it to the initiating control on close. Handle Escape and keep focus inside modal surfaces while open.
- Panels use 12px corners, a 1px border, and `0 1px 2px rgb(25 35 59 / 6%)`. Give menus `0 8px 24px rgb(25 35 59 / 12%)` and dialogs `0 18px 60px rgb(25 35 59 / 22%)`.
- Use readable status labels with small supporting dots. Use initials in locally styled avatar tiles and original CSS-drawn glyphs where an icon supports an action. App icons are local monograms with category accents. Show one concise sentence and an appropriate action for empty results. Announce successful saves and failures through an accessible live region.
