# Spotify account design

## Visual theme

Use an editorial record-collection layout with warm paper backgrounds, ink typography, a single dark green action color and artwork as the main source of color. Keep page-level navigation in a horizontal masthead. Your Library starts with a two-column composition inside the content area. A narrow collection panel sits alongside a full-width feature and cover grid on desktop. Detail routes use the same masthead and a spacious single-column content region. Display Spotify in plain text in the masthead and use Spotify in the page title.

Use original local cover art with grain, cut-paper shapes, printed linework and cropped geometric forms. Give covers consistent framing and distinct compositions so they remain recognizable at small sizes. Examples include a burnt-orange sun over stair-stepped violet bands for Sunday Side A, cobalt arcs on pale lime for Blue Hour Signals, and a deep plum rectangle over a sandy checkerboard for Cabin Sessions. Use a deterministic local cover fallback for unknown art keys and initials for people with missing art.

## Palette and roles

| Role | Value | Use |
| --- | --- | --- |
| Paper | `#F6F3EA` | Page background |
| Raised surface | `#FFFDF7` | Collection rail, track panels, menus and forms |
| Ink | `#20251F` | Headings and standard text |
| Muted ink | `#5D665A` | Metadata and supporting copy |
| Green | `#205A40` | Primary actions and current navigation |
| Green hover | `#184631` | Primary button hover |
| Green tint | `#E1ECE1` | Selected chips and success surface |
| Border | `#DBD9CC` | Dividers and quiet outlines |
| Field border | `#858C7A` | Input boundaries |
| Focus | `#255DAF` | 2px focus outline with 3px offset |
| Warning | `#785014` | Expired invitation copy |
| Error | `#952E35` | Destructive action and inline form error |

## Type

Use a bundled serif or Georgia for display headings and a bundled sans or system UI for everything else. Align duration and counts with tabular numerals.

| Role | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- |
| Spotify wordmark text | 24px | 750 | 1.12 | -0.035em |
| Page title | 48px desktop, 36px mobile | 500 | 1.04 | -0.04em |
| Section heading | 26px | 500 | 1.15 | -0.025em |
| Card and track title | 15px | 650 | 1.35 | 0 |
| Buttons, inputs and body | 14px | 500 | 1.45 | 0 |
| Metadata | 13px | 400 | 1.4 | 0 |

## Layout

- Use a 72px masthead, a 1280px centered content width, 40px desktop side padding and 32px spacing between the masthead and the page title. Masthead order is Spotify, Your Library, Browse, then the account control. Add thin underline emphasis for the active primary route.
- On Your Library, align the title and Create playlist in one row. Below it, use a 248px collection rail, 32px column gap and a flexible right column. Put Liked Songs, Shared with you and incoming invitations in the rail. In the main column feature one actual collection item with focus art and an Open playlist link. Render the full filterable collection below, with 20px card gaps and a minimum card width of 164px.
- Detail heroes use square art up to 184px wide next to title, linked owner/artist and relevant actions. Place track tables below the hero with 56px minimum row height, visible action controls and a stable title column. On collaborative playlists, show the contributing user next to track metadata.
- Below 900px reduce side padding to 24px and let the collection rail stack above the main column. Below 600px use 16px padding, allow navigation and action rows to wrap, cap artwork at 128px for detail headers, and shift secondary track metadata into the title cell. Forms and menus must remain within the viewport.

## Components and elevation

- Buttons have 40px minimum height, 8px corner radius and 14px horizontal padding. Solid green primary buttons use white text. Secondary buttons use ink text and a 1px field-border outline. Icon buttons carry accessible names and large hit targets. Use short visible labels for core actions where space permits.
- Controls use 40px minimum height, an 8px radius, the field border and the raised-surface fill. Filter chips use the green tint and dark green text when selected, with clear pressed semantics. Save and Follow states show visible text or an icon paired with an accessible name that conveys the next action.
- Cards keep typography below square art with a 10px radius. Preserve document order for keyboard navigation and use separate action buttons alongside links. Use 1px borders and no shadow on static panels. Menus use `0 8px 24px #20251F24`, and dialogs use `0 16px 48px #20251F33` over a `#20251F59` backdrop.
- Use a dialog up to 520px wide for edit/create forms and deletion confirmations. Use a wider panel up to 640px for track and collaborator pickers. Label controls clearly, focus the first field, return focus on close, support Escape and keep messages next to the affected input. Announce successful writes in a polite status region.
