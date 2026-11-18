# Freshdesk design system

## 1. Visual theme

Use a light operations workbench with a dark pine masthead, pale sage work surfaces, and compact white panels. Set Freshdesk as a plain text wordmark at the start of the masthead, followed by Tickets and Admin. Put the primary ticket action and the signed-in user's initials at the right. Use a compact top navigation and a local queue rail to give the account its own visual identity.

## 2. Color palette

| Token | Value | Role |
| --- | --- | --- |
| Masthead | `#133830` | Global navigation |
| Brand action | `#116149` | Primary buttons and links |
| Action hover | `#0C4C39` | Hover and active buttons |
| Selected | `#DDEFE5` | Current tab, queue view or folder |
| Canvas | `#F3F6F3` | App background |
| Surface | `#FFFFFF` | Panels, dialogs and form controls |
| Ink | `#182923` | Main text |
| Muted | `#536660` | Metadata and secondary labels |
| Border | `#D9E2DC` | Panel and row dividers |
| Control border | `#899A91` | Input outlines |
| Focus | `#236DC0` | Visible keyboard focus |
| Success | `#176145` on `#E2F3EA` | Resolved and active |
| Warning | `#81520A` on `#FFF0D4` | Pending and approaching a deadline |
| Error | `#9F323C` on `#FBE9EB` | Urgent, overdue and validation errors |
| Neutral | `#43554D` on `#EDF1ED` | Closed and inactive |

## 3. Typography

Use locally installed Segoe UI with a system sans-serif fallback. Use tabular numerals for IDs, durations and queue counts.

| Role | Size / leading | Weight | Tracking |
| --- | --- | --- | --- |
| Wordmark | 21 / 26 px | 700 | -0.03em |
| Page title | 32 / 38 px | 700 | -0.032em |
| Panel heading | 18 / 25 px | 650 | -0.015em |
| Row subject | 14 / 20 px | 600 | Normal |
| Body and form text | 14 / 21 px | 400 | Normal |
| Metadata and pills | 12 / 17 px | 500 | Normal |

## 4. Layout

- Masthead height 64 px. Center pages in a 1440 px maximum frame with 32 px desktop padding, 24 px panel gaps and an 8 px spacing grid.
- Queue uses a 216 px views rail, flexible ticket table and a filters popover anchored in the table toolbar. Put search beside the filter control and selection actions in the same toolbar. Aim for 58 px ticket rows with two-line subject/requester and visible status and priority labels.
- Ticket details use a flexible conversation column and a 320 px properties and SLA rail. Keep Reply and Add note immediately above the editable composer. Collapse the details rail beneath the conversation at 960 px.
- SLA policies use a full-width ordered list and a dedicated edit panel with a four-row priority matrix. The canned library uses a 216 px folder column and a search and results pane with a form for editing.
- Below 720 px use 16 px padding, collapsible queue and folder views, and stacked details and form rows. Keep horizontal overflow inside the SLA matrix or ticket table when needed.

## 5. Components and accessibility

- Primary buttons have at least 40 px height, 14 px horizontal padding, 8 px radius and white text. Secondary buttons use white fill, a 1 px control border and dark text. Icon-only actions have accessible labels and 40 px targets.
- Form labels sit above 40 px controls. Use 8 px corners, 12 px horizontal padding, the control border and an adjacent validation message. Focus uses a 2 px blue outline with 2 px offset.
- Cards use 12 px corners and a 1 px border. Table headers and private notes use subtle sage or amber fills with text labels. Status and priority pills use 999 px corners and 6 px horizontal padding.
- Dialogs have 16 px corners, 24 px padding and a scrim of `rgba(16, 36, 29, .45)`. Support Escape, initial focus, focus trapping and restoration. Confirm destructive actions with the affected item name. Empty states name the active context and provide the relevant action or a filter reset.
- Use initials, original CSS decoration and locally bundled generic icons. Keep icons secondary to text labels in the main workflows.

## 6. Elevation

Use `0 1px 2px rgba(19, 56, 48, .06)` on panels, `0 8px 24px rgba(19, 56, 48, .12)` on menus, and `0 18px 56px rgba(12, 35, 28, .22)` on dialogs.
