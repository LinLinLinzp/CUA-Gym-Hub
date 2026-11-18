# SoundCloud account design

## Visual direction

Build a creator workspace with a warm paper background, a deep plum navigation rail and an orange accent. Use the brand name **SoundCloud** as a text wordmark. Present releases in an editorial collection with original abstract cover art. Keep operational views quieter, with legible tables and space between controls.

Build original local artwork from layered CSS gradients and shapes for covers and the Overview banner. Use a small set of distinct palettes and compositions keyed to each record. Keep text and controls in HTML and reserve artwork for decorative areas and covers. Use a neutral patterned tile when artwork is unavailable.

## Color

| Token | Value | Use |
| --- | --- | --- |
| Canvas | `#F5F2EE` | Workspace background |
| Surface | `#FFFDF9` | Cards, tables, forms and dialogs |
| Ink | `#251E2A` | Main text |
| Muted | `#655D69` | Supporting text |
| Border | `#DCD4DB` | Dividers and card borders |
| Control border | `#8C7F8C` | Text field and select outlines |
| Rail | `#241D2C` | Navigation background |
| Rail selected | `#45344D` | Active navigation item |
| Rail text | `#F8F2F8` | Navigation and wordmark |
| Orange | `#FF6B3D` | Brand accent and primary action background with dark ink |
| Orange hover | `#F25C30` | Primary action hover |
| Purple | `#65417B` | Links, chart mark and focus ring on canvas |
| Success | `#246246` | Success text and indicator |
| Warning | `#785410` | Warning text and indicator |
| Error | `#A32A3C` | Error text and destructive actions |

## Type

Use `"Segoe UI", system-ui, sans-serif` for controls and copy with tabular numerals for times and metrics. Use `Georgia, serif` for the Overview greeting and major page titles.

| Role | Size | Weight | Line height |
| --- | --- | --- | --- |
| Overview greeting | 44px | 400 | 1.08 |
| Page title | 36px | 400 | 1.1 |
| Section heading | 21px | 650 | 1.25 |
| Body and controls | 15px | 400–600 | 1.5 |
| Captions and field help | 13px | 400–600 | 1.4 |
| Metric total | 32px | 650 | 1.12 |

## Layout

- At desktop widths, use a 220px rail and 72px workspace header. Give the main content 32px side padding and a maximum width of 1280px. Separate sections by 28px and use 16px between cards. Put identity and Upload in the header.
- At widths below 900px, reduce gutters to 20px and collapse split content into one column. Below 640px, use a header menu with text labels, 16px page gutters, and stacked list rows or scrollable tables with labeled headers.
- Overview pairs a plum welcome banner with an original layered wave composition, three summary cards, recent tracks and recent comments. Build quick links into the relevant sections of the workspace and show an explicit empty state when activity is absent.
- Tracks uses an account list with title/genre search, visibility and sort controls. Track detail places cover and metadata above a timeline and comments. Upload places the dashed file zone beside a form on wide screens, placing the file zone first when stacked.
- Playlists uses a two- to four-column collection of cover cards with title, privacy and count. Detail uses a stable ordered list with visible row controls. Comments uses a list with timestamps and track links. Insights places the filter bar above the summary cards, activity chart and ranked tracks.

## Components and elevation

- Primary actions use 44px minimum height, 16px horizontal padding, 8px corners, bold dark ink and the orange fill. Secondary actions use the surface color with a solid control border. All controls show a visible 2px focus outline with a 3px offset; use a light outline on the rail.
- Forms use labels above 44px minimum controls, a 16px vertical gap, 8px input corners, and persistent inline help or error text. Use short verb-first labels for actions such as Publish track, Add tracks, Post comment and Apply.
- Cards use 14px corners and a 1px border. Tables use visible row dividers and 56px minimum desktop row heights. Let artwork and copy scale independently. Pair privacy and status colors with their names.
- Center confirmation dialogs at up to 460px wide with 24px padding; keep focus inside while open and restore it on close. Use `0 14px 40px rgb(37 30 42 / 20%)` for dialogs and a translucent plum backdrop. Keep card shadow subtle at `0 2px 8px rgb(37 30 42 / 5%)`.
- Give waveform positions and chart points a visible time or value on hover and keyboard focus. Include tabular equivalents for chart values and name icon-only controls. Respect reduced motion and keep layouts usable at 200% zoom.
