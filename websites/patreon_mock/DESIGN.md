# Patreon creator workspace design

## Visual theme

The workspace takes its cues from Lantern Room, a fictional independent publication about film, sound and city life. A charcoal masthead and compact horizontal navigation sit above a warm paper canvas. Serif section headings, thin rules and original culture photography give the Posts library the feel of an editorial index. Deliberate coral accents mark the main action and current section. Interface labels stay direct and task-oriented.

## Color palette

| Role | Value | Use |
| --- | --- | --- |
| Masthead and primary text | `#201F1B` | Header surface, headings and body |
| Canvas | `#F5F0E7` | Workspace background |
| Paper | `#FFFCF7` | Editor, list and detail surfaces |
| Coral | `#A93B2E` | Primary action, links and current-section line |
| Coral hover | `#8A2B22` | Primary action hover |
| Coral on charcoal | `#FF8C78` | Selected navigation accent and dark-surface focus |
| Muted text | `#675F55` | Metadata and placeholders |
| Rule | `#DED5C6` | Card edges, rules and dividers |
| Input outline | `#8B7D6E` | Form control border |
| Published | `#285849` on `#E5EEE5` | Published and active status |
| Scheduled | `#654613` on `#F5E7CA` | Scheduled status |
| Draft and unpublished | `#554E46` on `#EEE9DF` | Neutral status |
| Error | `#A12F29` on `#FBECE8` | Validation and declined status |
| Light-surface focus | `#1D625E` | 2 px ring with 2 px offset |

## Typography

| Role | Font | Size / line height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Patreon wordmark | Arial, sans-serif | 26 / 28 px | 700 | −1 px |
| Page heading | Georgia, serif | 48 / 50 px | 400 | −1.5 px |
| Section or panel heading | Georgia, serif | 28 / 34 px | 400 | −0.4 px |
| Post title | Georgia, serif | 21 / 26 px | 700 | −0.25 px |
| Body and controls | system-ui, sans-serif | 14 / 21 px | 400–600 | Normal |
| Table headings and metadata | system-ui, sans-serif | 12 / 17 px | 500–650 | 0.15 px |

## Layout

- Use a 68 px masthead with Patreon at left, the publication label alongside, and the creator's initials and name at right. The identity block is informational. Put Posts, Tiers, Members and Messages in an attached 48 px navigation row with an active underline.
- Center a 1240 px-wide content area with 40 px desktop gutters and 32 px vertical padding. Below 760 px, use 20 px gutters, a 36 px heading and a horizontally scrollable section navigation row. Let filter rows wrap. Keep the Members table independently scrollable on narrow screens.
- Open Posts with a 156 px banner that pairs the page heading and New post action with an original image, then the status tabs and filter row. The main library is a full-width paper surface with dividing rules. Post rows use 72 × 52 px art crops when media is available, otherwise display the format label. Align title and excerpt left, with secondary metadata trailing.
- Use a three-column tier grid at desktop widths, reducing to two and then one as space tightens. Give each card a consistent price and action position. In Members, use a dense data table with a visible selected count and durable member detail route.
- Use a 320 px conversation rail with a flexible thread pane in Messages. Keep the composer immediately below the conversation. On small screens show the list and thread as separate route views with an explicit back link.
- Editors use a flexible writing column and a 300 px settings panel for metadata. Stack them on narrow screens. Keep Save, Schedule and Publish visibly distinct. Show validation next to the relevant input.

## Components

- Use an 8 px spacing rhythm, 16 px card gaps and 10 px card radii. Controls are at least 40 px high with a 6 px radius and 12 px horizontal padding. Primary buttons have a coral fill and white text. Secondary buttons use paper, dark text and a visible outline.
- Status pills use readable labels and compact padding of 3 × 8 px. Use text and shape for active, unread and error states so color is one cue among several.
- Menu and dialog triggers have keyboard focus. Confirmation dialogs show the affected entity, use a maximum width of 440 px and return focus to the trigger on cancellation. Put routine confirmations in a live status region and keep validation in view.
- Cards use their border for separation. Menus use `0 6px 20px rgb(32 31 27 / 12%)`. Dialogs use `0 16px 44px rgb(32 31 27 / 22%)` over a `rgb(32 31 27 / 48%)` scrim.

## Original local visuals

Create local visuals for the publication, with film-projector light, library windows and night street details as subjects. Draw from the same muted coral, amber and green palette across a hero crop and smaller post images. Use original local raster artwork where an image conveys post subject matter, and CSS initials for people. If an audio post uses playback, include a short original local recording or synthesized sound. Use system fonts and keep all imagery and audio available offline.
