# Ticketmaster account design

## Visual theme

Use an editorial event ledger. Render the Ticketmaster wordmark in upright text in a midnight header. Set the main workspace on a cool off-white canvas with deep navy type, cobalt actions and compact white ledger rows. Use the same event information hierarchy across orders, transfers, listings and refunds so fans can match activity to their event and seats.

Use original local artwork for event thumbnails, with compact, locally authored CSS or bitmap compositions such as layered stage lighting, court markings and a theater curtain. Choose a treatment by genre and vary color within the genre. Keep titles and venue information in live text. The thumbnails have empty alt text when adjacent text identifies the event.

## Color palette

| Role | Value | Use |
| --- | --- | --- |
| Header | `#111C33` | Global header and active utility accents |
| Canvas | `#F3F5F9` | Workspace background |
| Surface | `#FFFFFF` | Rows, details and dialogs |
| Ink | `#15223A` | Titles and body copy |
| Secondary text | `#50607A` | Venue, dates and subdued labels |
| Border | `#D7DFEB` | Dividers and panel outlines |
| Control border | `#7A89A2` | Input, checkbox and secondary button outlines |
| Action | `#1748D1` | Primary buttons, links and selected tabs |
| Action hover | `#1038AD` | Pointer feedback |
| Focus | `#1D5BEB` | Visible 2 px outline with 3 px offset on light surfaces |
| Success | `#156044` on `#E7F5ED` | Completed or accepted |
| Warning | `#754708` on `#FFF2D8` | Pending, postponed or eligible notices |
| Error | `#9A2935` on `#FCECEF` | Invalid input and cancellations |

## Typography

Use `"Segoe UI", system-ui, sans-serif`. Use tabular figures for money, orders and dates in lists.

| Role | Size / line height | Weight | Letter spacing |
| --- | --- | --- | --- |
| Wordmark | 23 / 28 px | 750 | −0.02em |
| Page title | 42 / 46 px | 700 | −0.035em |
| Section title | 22 / 28 px | 700 | −0.015em |
| Event title | 17 / 23 px | 650 | −0.01em |
| Body and controls | 15 / 22 px | 400–650 | normal |
| Metadata | 13 / 18 px | 400–600 | normal |

## Layout and components

- Use a 64 px header, 1240 px maximum workspace, 32 px desktop gutters and a horizontal account navigation row under the header. Keep brand text on the left and the signed-in name on the right. Place the page title above the filters. Use a 16–24 px gap between sections.
- Render each order row as an 88 × 64 px image, event information, labeled order metadata and a clear order link. Give rows an 8 px radius, 16 px inset and 10 px vertical gap. On narrow screens move metadata beneath the event title and let search, filters and navigation wrap. At 600 px or below, use 16 px gutters and a 32 px page title.
- Order detail uses a full-width event header, then a 2:1 seat-list and summary grid with a 24 px gap. Stack at 850 px. Show notices beside the relevant order controls and retain the corresponding status text in activity rows.
- Inputs and buttons have a 44 px minimum height and 8 px radius. Primary buttons use white on cobalt. Outline buttons use ink text and the control border. Use 6–10 px gap between labels, helper text and options. Status chips have text labels with 6 × 10 px padding.
- Forms open in a dialog up to 540 px wide with 24 px padding and 14 px radius. On small screens let the dialog body scroll within the viewport. Review screens repeat exact selected seats and totals. Place a labeled cancel action next to the final action. Focus enters the dialog, stays within it, and returns to its trigger on close.
- Default panels use their borders for separation. Dialogs use `0 16px 48px rgba(17, 28, 51, .20)` and a `rgba(17, 28, 51, .48)` backdrop. Confirmation and validation messages have accessible text and live announcements where appropriate.
