# Hugging Face account workspace design

## Visual theme

Use a warm, editorial workspace with a navy navigation rail, an ivory canvas, and a large serif title on Overview. The text wordmark “Hugging Face” sits at the top of the rail. Sunny yellow identifies the selected section and primary actions. Keep catalogs compact enough to scan and give the overview more room around its headline and counts.

## Color palette

| Role | Value | Use |
| --- | --- | --- |
| Rail | `#1B2535` | Sidebar and mobile menu |
| Rail text | `#F5F1E9` | Brand and navigation text |
| Canvas | `#F7F4EE` | Main workspace |
| Surface | `#FFFEFA` | Cards, tables, inputs, dialogs |
| Ink | `#1C2939` | Main text, headings, action text |
| Muted ink | `#526174` | Secondary labels and metadata |
| Border | `#DDD8CE` | Dividers and card outlines |
| Accent | `#FFD36A` | Primary actions and selected navigation |
| Accent hover | `#FAC251` | Hovered primary buttons |
| Link and focus | `#245187` | Ordinary links and focus outline |
| Success | `#20604C` on `#E4F2E9` | Running, accepted, active |
| Warning | `#755218` on `#FFF0CB` | Pending, paused |
| Error | `#9B3E38` on `#FBE9E4` | Rejected, revoked, errors |

## Typography

| Role | Stack | Size | Weight | Line height | Letter spacing |
| --- | --- | --- | --- | --- | --- |
| Wordmark | Segoe UI, system-ui, sans-serif | 22px | 700 | 26px | -0.35px |
| Overview headline | Georgia, serif | 52px | 400 | 1.04 | -1.7px |
| Page heading | Georgia, serif | 40px | 400 | 1.12 | -1.1px |
| Section heading | Segoe UI, system-ui, sans-serif | 20px | 650 | 26px | -0.2px |
| Body and controls | Segoe UI, system-ui, sans-serif | 15px | 400–650 | 22px | normal |
| Metadata | Segoe UI, system-ui, sans-serif | 13px | 500 | 19px | normal |
| Paths and counts | Consolas, ui-monospace, monospace | 13px | 400 | 20px | normal |

## Layout

- Desktop rail is 232px wide with 24px padding. Place navigation below a divider and the signed-in account identity at the bottom. Use an initials tile generated from the account name.
- The main frame has a 64px utility header, 40px horizontal padding, a 1280px maximum content width, and a 24px vertical section gap. Utility content is limited to breadcrumbs and page-level actions.
- Overview has a two-column hero with heading and actions on the left and a locally authored CSS composition on the right. Compose the graphic from overlapping square grid cells and thin concentric arcs over a muted warm panel. Use CSS gradients and borders. Treat it as decorative and hide it from assistive technology. Below it, place up to four linked count cards followed by recent repositories and pending review. The card gap is 16px.
- Catalogs show a title and create action above the search/filter toolbar. A table-like list places repository name and description first, followed by type information, visibility or status, and updated date. Rows can grow to fit wrapped descriptions.
- Detail pages have a breadcrumb, a repository title and primary action, a tab strip, and a main card with a short metadata column. Place gate status and request action above any gated file content. Use a local CSS pattern for the Space preview with the Space name and status overlaid.
- Access has Received, Sent, and Access Tokens tabs. Review actions sit beside the requester record. Use text labels alongside status colors.
- At 900px, reduce main padding to 24px and allow overview cards to wrap. At 720px, place navigation behind a labeled header control, use 16px content padding, set page headings to 34px, and stack hero, details, and controls. Use labeled stacked list rows for long paths on small screens.

## Components and elevation

- Primary button uses the accent fill, ink text, no visible default border, 8px radius, 10px vertical and 14px horizontal padding, and at least 40px height. Secondary buttons use surface, a 1px border, and the same geometry.
- Inputs and selects use a 1px border, 8px radius, visible label, 10px by 12px padding, and at least 40px height. Keep placeholder cues brief. Place field errors beneath the field and preserve input after rejection.
- Cards and list containers use a 1px border and 12px radius. Rows have 12px vertical and 16px horizontal padding. Give hover a light tint and preserve normal keyboard activation for links and buttons.
- Menus use `0 8px 24px #1B25351C`. Dialogs use a maximum 560px width, 16px radius, 24px internal padding, `0 20px 48px #1B253533`, and a `#1B253571` backdrop. Keep the input, confirmation, cancellation, and errors within the dialog. Close with Escape, trap focus while open, and restore focus on close.
- Use a 2px `#245187` focus outline with a 2px offset, and a pale outline on the rail. Use regular labels for keyboard and screen-reader navigation and a polite status region for mutation feedback.
