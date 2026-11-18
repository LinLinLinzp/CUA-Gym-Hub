# USPS account design

## Visual direction

Build a private account organized around mail tasks. Use deep navy, a warm paper background, a red accent and a text-only USPS masthead. The home page pairs an asymmetrical navy introduction with a pale activity panel. Below it, a two-by-two service directory uses bold headings and small line icons. Draw any envelope, parcel, change-of-address or mailbox graphics locally from simple geometric forms. Keep those graphics visually quiet so the four actions dominate.

## Color palette

| Token | Value | Role |
|---|---|---|
| Ink | `#142339` | Body text and headings |
| Navy | `#172D50` | Desktop navigation, home feature panel and primary buttons |
| Paper | `#F5F2EB` | Application background |
| Surface | `#FFFFFF` | Cards, forms and dialogs |
| Border | `#D9DED9` | Card dividers and table rules |
| Input border | `#768391` | Form control boundary |
| Red | `#B82D39` | Selected marker and destructive controls |
| Link | `#204C82` | Inline links and keyboard focus |
| Hover navy | `#24446C` | Primary button hover |
| Muted text | `#536175` | Labels and supporting details |
| Success | `#22643E` on `#E7F2E9` | Completed or active |
| Pending | `#754C12` on `#FAEED6` | Scheduled, reserved or under review |
| Error | `#9F2532` on `#F9E7E9` | Validation or denied |
| Neutral | `#41516B` on `#EAF0F7` | Draft or cancelled |

## Typography

Use Georgia for display headings and system-ui for the interface. Use tabular numerals for prices, dates and confirmation references. Fonts resolve locally.

| Role | Font | Size | Weight | Line height | Tracking |
|---|---|---|---|---|---|
| Masthead | system-ui | 25 px | 800 | 1 | 0.045 em |
| Home heading | Georgia | 50 px desktop, 35 px narrow | 400 | 1.05 | -0.035 em |
| Route heading | Georgia | 38 px desktop, 31 px narrow | 400 | 1.12 | -0.025 em |
| Section heading | system-ui | 21 px | 700 | 1.25 | -0.015 em |
| Body and controls | system-ui | 15 px | 400/600 | 1.5 | 0 |
| Table headings and metadata | system-ui | 13 px | 600 | 1.4 | 0.01 em |

## Layout

- At widths of 1024 px and above, use a 218 px full-height left navigation and a 66 px top account bar in the main column. Keep the content at max-width 1160 px with 32 px padding. Use 24 px between cards and 16 px between form rows.
- At 768–1023 px, replace the rail with a compact top account bar and a labeled navigation menu. Use 24 px content padding and two columns for service cards where space permits. At 767 px and below, stack the home feature and recent activity, use one service-card column, and reduce page padding to 16 px. Reflow history rows into labeled stacked entries. Keep the primary action reachable without horizontal scrolling.
- Home uses an approximately 3:2 split between the navy introduction and recent requests. Present service links as short action labels. The introduction can include an original line drawing using local CSS or a local asset. Keep headings, links, and focus indicators unobscured.
- Service histories place the heading and primary action above the search and status filter, with rows grouped in a single bordered surface. Details use a summary section, a status pill with text and grouped actions. Place related transactions below the PO Box summary.
- Forms use a centered content width up to 740 px. Group related fields under clear step titles, keep obvious Back and Continue actions, and place the final confirmation action after a readable review of the entered data.

## Components

- Cards use a white surface, 1 px border, 14 px radius and 20–24 px padding. Use `0 2px 6px rgba(20,35,57,.06)` for raised cards.
- Primary buttons use navy with white text, 8 px radius, 44 px minimum height and 16 px horizontal padding. Secondary buttons use white with navy text and an input-color border. Destructive confirmation uses red, with the verb in the label.
- Controls use a 44 px minimum height, 8 px radius, visible labels above, inline errors below, and a 3 px blue focus outline with 2 px offset. Group paired fields only when labels and values fit comfortably.
- Confirmation dialogs use a 480 px maximum width, 20 px radius, 24 px padding, a `rgba(20,35,57,.48)` backdrop and `0 16px 40px rgba(20,35,57,.20)` shadow. Move focus into the dialog and restore it on close.
- Use text to convey status and announce saved results. Confirmation details display the reference and durable result within the page. Use semantic headings, a skip link, explicit control labels and keyboard-accessible menus.
