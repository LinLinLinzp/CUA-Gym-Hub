# Coursera learner workspace design

## Theme

Treat the account as a study desk. A deep indigo side rail anchors a warm paper workspace. The dashboard opens with a compact editorial feature panel for the most relevant course, followed by a library of enrollments. Catalog covers use original geometric artwork related to course subjects. Use the brand name as typeset text and keep invented partner names in plain text.

## Color palette

| Token | Value | Role |
| --- | --- | --- |
| Workspace | `#F7F5EF` | App canvas |
| Surface | `#FFFFFF` | Lists, cards and inputs |
| Ink | `#20283E` | Main text |
| Muted ink | `#555D72` | Metadata and supporting text |
| Rail | `#172542` | Persistent navigation |
| Rail selected | `#2B3B5D` | Active destination background |
| Rail text | `#E8EDF8` | Wordmark and navigation text |
| Coursera blue | `#0056D2` | Primary actions, progress fill and links |
| Blue hover | `#0045A8` | Primary action hover |
| Feature panel | `#E8EDFF` | Featured course background |
| Border | `#D9DDE7` | List dividers and card boundaries |
| Input border | `#838CA0` | Form field boundaries |
| Success | `#18583E` on `#E5F4EA` | Passed, completed and issued |
| Warning | `#754000` on `#FFF0CE` | Due soon and needs attention |
| Failure | `#942D3B` on `#FBE9EC` | Validation, failed attempts and withdrawal |

## Typography

| Role | Family | Size and line height | Weight |
| --- | --- | --- | --- |
| Brand | System sans | 25/30 px | 700 |
| Page title | Georgia or local equivalent | 40/46 px, mobile 32/38 px | 700 |
| Feature title | Georgia or local equivalent | 30/36 px | 700 |
| Subsection | System sans | 20/28 px | 650 |
| Card title | System sans | 17/24 px | 650 |
| Body and controls | System sans | 15/22 px | 400 to 650 |
| Metadata | System sans | 13/18 px | 400 to 600 |
| Verification code | System monospace | 14/20 px | 500 |

## Layout and spacing

- Desktop uses a 232 px rail with My Learning, Explore, Assignments and Accomplishments. Place the learner's initial and name at the bottom. The main header has a 72 px minimum height. Center the content within a 1200 px maximum width and use 36 px horizontal padding.
- At widths below 900 px, reduce main padding to 24 px and use two catalog columns when space allows. Below 760 px replace the rail with a header and a wrapping navigation row. Use 16 px side padding and collapse feature and detail views to a single column. Preserve visible labels and 44 px minimum touch targets.
- Use 8 px spacing increments, a 20 px card gap, 14 px card radius and 24 px between major groups. Filter controls wrap at their natural widths and clear a single filter independently. Rows stack their metadata on compact layouts.
- Keep tab order aligned with reading order. Use a skip link, semantic headings, labeled form controls, text for status and a 3 px blue focus outline with a 2 px gap. On the dark rail, use a light blue focus outline. Dialogs return focus to the triggering control. Announce submission results and action feedback through live regions.

## Components and artwork

- Primary actions use `background: #0056D2`, white text, `border-radius: 9px`, `min-height: 44px`, and `padding-inline: 16px`. Secondary buttons use a white or transparent fill with an input-border outline. Place withdrawal in an explicit confirmation with a descriptive action label.
- Use solid white cards with a 1 px border. The pinned course panel uses two columns with a prominent resume action. On mobile the artwork sits below the text or within the card header. Catalog cards reserve a 16:9 artwork area for local course illustrations.
- Develop original, flat covers with visual motifs such as stacked frames for museum studies, overlapping arcs for storytelling, angular light bands for film, and offset tiles for design. Use warm ochre, muted teal, lavender and slate with restrained contrast. Use decorative CSS shapes or original offline assets under `public/`. Keep text, progress and interactive labels in HTML and hide decorative artwork from assistive technology.
- Records in Assignments and My Learning show a title, context, textual status and a direct action. Grade and certificate detail views put the most important field above the fold. Render the certificate on white paper with a thin indigo rule and an original geometric accent. Keep recipient, course, issuer, date and verification code as selectable text.
- Input fields use a 1 px solid input border, an 8 px radius and at least 44 px height. Modal confirmations have a 480 px maximum width, 24 px padding, a 16 px radius and scrim `rgb(23 37 66 / 48%)`.

## Elevation

Use borders for rest states. Use `0 6px 16px rgb(23 37 66 / 9%)` on interactive card hover and `0 20px 56px rgb(23 37 66 / 22%)` for dialogs. Keep motion short and respect reduced-motion preferences.
