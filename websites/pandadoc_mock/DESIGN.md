# PandaDoc workspace design

## Visual direction

Use an original account workspace with a horizontal ink-blue masthead, warm porcelain surfaces, and an understated jade action color. A serif title gives the proposal pages the character of a prepared document. Use plain PandaDoc text in the masthead and browser title. Use initials for people, CSS-drawn separators and paper accents, and locally authored document motifs for template previews.

## Tokens

| Role | Value |
| --- | --- |
| Masthead, primary text | `#192A37` |
| Canvas | `#F5F4EF` |
| Surface | `#FFFFFF` |
| Secondary text | `#53636D` |
| Divider | `#DADFD9` |
| Primary action | `#17644C` on white text |
| Hover action | `#114A39` on white text |
| Accent surface | `#E5F0E9` |
| Focus outline | `#326B9D`, 2px with 2px offset |
| Draft | `#4E5F68` on `#E9EDF0` |
| Sent | `#264E78` on `#E5EFFB` |
| Viewed | `#604978` on `#F0E9F7` |
| Completed | `#17644C` on `#E5F0E9` |
| Expired | `#72510C` on `#FAF0D7` |
| Declined or error | `#8D3438` on `#FBEAEB` |

| Role | Typeface | Size / line height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Wordmark | System sans | 20 / 24px | 750 | −0.03em |
| Page title | Georgia, serif | 38 / 44px | 400 | −0.03em |
| Document title | Georgia, serif | 44 / 50px | 400 | −0.03em |
| Section heading | System sans | 18 / 24px | 650 | −0.01em |
| Controls and body | System sans | 14 / 21px | 400–650 | normal |
| Metadata | System sans | 12 / 16px | 500 | normal |

Use tabular numerals for amounts, align currency values right, and label statuses in text. Use 4, 8, 12, 16, 24, 32, and 48px spacing increments.

## Views and layout

- **Masthead.** Use a 70px bar with workspace navigation next to the wordmark and the user identity at the right. Overview, Documents, Templates, Catalog, and Contacts are direct destinations. Mark the current section with an underline and semantic current-page state.
- **Overview.** Center the content in a 1320px maximum width with 32px gutters. Put the workspace heading and New document button on one line. Place a full-width strip of linked Draft, Sent, Viewed, and Completed counts above a recent proposal register.
- **Document register.** Under the heading, put search on the left and status and sort controls on the right. Use a single white table with an understated header, 52px rows, and pagination beneath. Each document title is a link. Move primary actions above filters at narrow widths.
- **Proposal editor.** Put the title, document status, Save draft and Review and send in a local toolbar. Underneath, use a 220px context rail for section navigation, a white paper surface up to 800px wide, and a 280px inspector for Recipients and Fields. Render sections, pricing and signature assignments in the same document flow. Use a dedicated pricing editor panel when the table needs extra width.
- **Template, Catalog and Contacts.** Use a three-column template gallery with locally composed paper previews. Use compact, searchable tables for products and contacts. Each template card exposes its own Use template button. Catalog results in the editor show SKU, name and unit price.
- **Signing view.** Use a narrow document column and a separate progress pane, with signer name and status visible. Place Finish where it stays discoverable after scrolling without covering document fields.
- **Responsive.** Below 1100px move the context links above the paper and keep the inspector beside it where it fits. Below 760px stack inspector panels and cards, wrap masthead navigation, and allow tables to scroll within their own container. Keep keyboard and click targets visible at both sizes.

## Components and elevation

Use 40px minimum control height, 8px radius on inputs and buttons, 12px radius on cards, 1px borders and 16–24px panel padding. Primary buttons are jade and secondary buttons use a white fill with an ink label. Use a text label on every primary action and an accessible name on icon buttons. Use inline validation beside the field and use a status region for Save and Finish feedback.

Use flat register surfaces, a `0 4px 14px rgba(25,42,55,.08)` paper shadow, and `0 12px 32px rgba(25,42,55,.16)` for dialogs and menus. Center the send review dialog at up to 560px wide, transfer focus to its heading on open, and restore focus on dismiss.
