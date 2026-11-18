# Login.gov workspace design

## 1. Visual theme

Use a deep evergreen header, warm ivory page, white cards, and dark plum action buttons. Set major headings in Georgia and keep forms, controls, and metadata in system sans. The brand appears in the header as the text **Login.gov**. Place a small `Practice workspace` context label in the header so synthetic identity actions have an explicit setting.

Build the overview around two workflow cards. Add an original CSS illustration to the welcome panel using offset rounded rectangles and thin arcs. Decorative layers are hidden from assistive technology. Use local CSS and system fonts for all views.

## 2. Color palette

| Role | Hex | Use |
| --- | --- | --- |
| Header evergreen | `#193935` | Masthead and selected navigation text |
| Ivory | `#F7F4ED` | Main page |
| Ink | `#202925` | Body text and headings |
| Muted ink | `#4D5B55` | Secondary text |
| Plum | `#54324F` | Primary buttons and text links |
| Plum hover | `#3E243B` | Hover and pressed states |
| White | `#FFFFFF` | Cards and fields |
| Hairline | `#DCDDD4` | Card dividers |
| Control border | `#79857C` | Inputs, secondary buttons and interactive chip boundaries |
| Selected tint | `#DFECE5` | Active tabs and highlighted rows |
| Focus blue | `#1959A6` | Light surface focus ring |
| Status green | `#275744` on `#E4F1E8` | Connected or verified |
| Status amber | `#713F13` on `#FAE9CC` | In progress or waiting for visit |
| Status neutral | `#4D5B55` on `#EEF0EA` | Unverified, disconnected, or canceled |
| Destructive red | `#9A2634` on `#FCECEF` | Validation and destructive action emphasis |

## 3. Typography

| Role | Font | Size / line height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Brand | Segoe UI, system-ui, sans-serif | 23 / 28 px | 700 | −0.4 px |
| Page title | Georgia, serif | 40 / 46 px | 400 | −0.8 px |
| Section title | Georgia, serif | 27 / 34 px | 400 | −0.3 px |
| Card title | Segoe UI, system-ui, sans-serif | 18 / 25 px | 650 | 0 |
| Body and controls | Segoe UI, system-ui, sans-serif | 16 / 24 px | 400, 600 for actions | 0 |
| Labels and metadata | Segoe UI, system-ui, sans-serif | 14 / 20 px | 500 | 0 |

## 4. Layout

- Header height 68 px and centered content at a 1160 px maximum width. Place the signed-in name at the end when space permits.
- A horizontal navigation row below the header has Account, Identity, and Connected services. Use 44 px minimum hit areas and apply `aria-current` to the active link.
- Main content shares the header alignment. Use 32 px desktop side padding, 40 px top spacing, 24 px card gaps, and 24 px card padding. Overview cards form two columns of equal width.
- Keep the verification flow and consent form to 640 px max width and make the primary step action visible below the fields. Show progress as a simple current-step label.
- At 740 px or below use 16 px gutters, a 32 px page title, single-column cards, wrapping navigation and filter controls, and stacked list metadata. Collapse the illustration space before narrowing functional content. Verify at 390 px width and 200% zoom.

## 5. Components

- **Buttons** use 44 px minimum height, 16 px horizontal padding, 8 px radius, and 600 weight. Primary uses a plum background and white text. Secondary uses white with a control border. Destructive buttons use red with white text.
- **Inputs** use explicit labels, 44 px minimum height, 12 px padding, 8 px radius, a 1 px control border, and inline errors tied to their fields. Keep helper copy adjacent to the field.
- **Cards** use a 1 px hairline, 14 px radius, and flat surfaces. The overview card groups status, one relevant current detail, and a link to the workflow.
- **Lists** use 16 px row padding and hairline separators. Put service name first, followed by agency and shared-email text, with status and date aligned to the end on wide screens. Provide clear row action names and explicit empty states for seeded, filtered, and missing records.
- **Status labels** include plain text and a tinted background, with 4 px by 9 px padding and a rounded border radius. Announce action results in a polite live region.
- **Confirmation dialogs** use a 480 px maximum width, 24 px inner padding, 14 px radius and an evergreen scrim at 55% opacity. Give them a visible title and text naming the target. Set focus on a safe action on open, contain it while open, support Escape, and return focus to the trigger. On navigation, focus the destination heading.
- **Focus** uses a 3 px blue outline and 2 px offset on light surfaces. Use a 3 px white outline inside the dark masthead. Underline text links and support reduced motion.

## 6. Elevation

Keep cards flat. For menus use `0 8px 24px rgb(32 41 37 / 12%)`. For dialogs use `0 18px 60px rgb(32 41 37 / 24%)`.
