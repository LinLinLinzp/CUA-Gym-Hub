# Figma account workspace design

## 1. Visual theme and atmosphere

Give the workspace the feel of a design studio with a cream library surface, a deep aubergine navigation rail, and colorful file studies. Display **Figma** as a plain text wordmark. Pair expressive serif headings with a compact sans-serif interface. Use full-color imagery only in document previews and on the canvas, where it represents actual synthetic work.

At a desktop starting view of 1440 × 900, the fixed rail and quiet cream toolbar frame a large **Files** heading and a three-column file gallery. Four clickable folder cards sit between the heading and the gallery. Use compact type, visible file names and deliberate spacing so the first two rows of results remain legible.

## 2. Color palette and roles

| Role | Token | Use |
|---|---|---|
| Rail | `#251C36` | Workspace navigation and lower account block |
| Rail hover | `#3A2B50` | Hover and expanded surfaces |
| Rail selection | `#49365F` | Current page with a thin `#CAA9F8` leading rule |
| Rail text | `#FFF5FC` | Wordmark, active labels, avatar initials |
| Rail secondary | `#D4C2E3` | Quiet labels |
| Background | `#F7F3EC` | File browser and dialog backdrop area |
| Canvas | `#EFE9F4` | Editor stage |
| Surface | `#FFFCF8` | Headers, tiles, dialogs and drawers |
| Text | `#292036` | Headings and body |
| Text secondary | `#62576C` | Metadata and breadcrumbs |
| Divider | `#DFD6E2` | Passive boundaries |
| Control border | `#92819D` | Inputs and outlined controls |
| Primary action | `#60369A` | Buttons, selected text tabs and links |
| Primary hover | `#482572` | Filled button hover |
| Focus | `#8048CB` | Outer keyboard ring, with a light offset on dark backgrounds |
| Accent | `#F2C1AA` | File art and selected avatar backgrounds |
| Success | `#235843` on `#E1F0E7` | Saved and published states |
| Warning | `#754210` on `#F8E5CE` | Pending and restricted indicators |
| Error | `#962D49` on `#FAE6EB` | Form validation and destructive confirmations |

## 3. Typography

| Role | Font | Size | Weight | Line height | Letter spacing |
|---|---|---:|---:|---:|---:|
| Wordmark | Georgia, serif | 31 px | 700 | 1.05 | −0.04em |
| Workspace heading | Georgia, serif | 44 px | 400 | 1.08 | −0.035em |
| Section heading | Georgia, serif | 24 px | 400 | 1.18 | −0.02em |
| File or dialog title | Segoe UI, system-ui, sans-serif | 16 px | 650 | 1.35 | 0 |
| Control and body | Segoe UI, system-ui, sans-serif | 14 px | 400 / 600 | 1.45 | 0 |
| Metadata | Segoe UI, system-ui, sans-serif | 12 px | 400 / 600 | 1.4 | 0 |

Use system fonts available offline. Preserve a single-line file name visually where space is limited and keep the full name available to assistive technology.

## 4. Spacing and layout

- **File browser.** Use a 224 px rail, a 64 px toolbar, and a content region with 36 px horizontal padding. Place the workspace label above Files, Drafts, Starred and Trash in the rail, and the avatar with name and email at its foot. Keep Search near the toolbar center, within 420 px. Place **New design file** at the end of the toolbar. The Files view starts with the title, then a folder strip of four 72 px tiles and an All files section with sort and view controls. Expose remaining folders through the Files search or a **Show all folders** disclosure. Use three gallery columns with 18 px gaps at desktop, then two and one as space narrows. Preview art has a 16:9 ratio. File metadata and an always-discoverable overflow button sit below each preview. Keep the card link and overflow button as separate controls.
- **File workspace.** Replace the account rail with a 64 px sticky header that contains **Back to files**, breadcrumb, file name and **Share**. Below it, use a full-width stage with a pale dotted work surface. Align page tabs and the Layers, Assets and Comments controls along a 50 px strip above it. Open the active tool in a single 328 px dock on the right. This leaves room for a centered document frame and makes switching tools predictable. On narrow screens the active tool becomes a dismissible sheet, with canvas and page navigation available after closing it.
- **Gallery on smaller screens.** Reduce side padding to 20 px below 1024 px. Collapse the rail into a labeled navigation drawer below 760 px. Let search occupy its own row when needed and preserve the visible create action. File and folder actions remain available by keyboard and touch.

## 5. Component patterns

- **Buttons.** Use 40 px height, 14 px horizontal padding, 10 px radius, and semantic text or an accessible name for icon controls. Primary actions use a solid fill and white text. Secondary buttons use the surface color and a 1 px control border. Use a 2 px focus outline with a 2 px offset. Menus support keyboard navigation and restore focus on dismissal.
- **Inputs.** Use 40 px minimum height, a 1 px control border, 10 px radius, and a persistent label. Show inline errors directly below the matching control. Disable a commit when its current form is invalid and explain any constraint the user needs to resolve.
- **Cards and previews.** Use a 14 px radius and a 1 px divider. Render original miniatures from local CSS and seeded design data. Include a cream mobile checkout with warm coral buttons, a moss-green desktop dashboard with tiny chart bars, a lilac component board with pill controls, a pale-blue onboarding stepper, a teal travel map with geometric location markers, and a sand-colored type specimen. Assign preview variants explicitly in the seed and use a neutral art panel for a new blank file. Derive colors, shapes and initials locally. The art belongs to the fictional document and may appear enlarged on its canvas.
- **Canvas and panels.** Render each page as an original titled artboard with a white interior, synthetic shapes or text, and small labeled pins. Use a 2 px violet outline for selection, circles with visible numbers for comment pins, and a diamond motif drawn with CSS for main components and instances. Layers, Assets, and Comments each show an empty state with the next available action. Component details show source file, status and description. Keep the comment composer adjacent to the selected pin or in the dock on narrow screens.
- **Dialogs.** Center a 480 px surface with 24 px inset, 16 px radius, clear heading and a footer with Cancel and the named action. Share can use 540 px and separates People from Link access using section headings. Set an accessible name, support Escape and focus restoration, and contain focus while open. Scroll the dialog body when people or components exceed viewport height.

## 6. Elevation

Use `0 2px 8px rgba(37, 28, 54, 0.06)` on file cards when hovered, `0 8px 24px rgba(37, 28, 54, 0.14)` on menus, and `0 20px 56px rgba(37, 28, 54, 0.24)` on dialogs. Use a backdrop of `rgba(37, 28, 54, 0.42)`. Keep dividers and spacing as the primary grouping cues.
