# Microsoft Word for the web research

Microsoft Word for the web is a browser-based word processor for creating, editing and sharing documents. Its signed-in workspace moves from a document library to a page editor and gives collaborators separate controls for comments, tracked suggestions and sharing. The public `word.cloud.microsoft` landing page shows product information. The signed-in library pictured in Microsoft’s training material is the workflow reference. [Product page](https://www.microsoft.com/en-us/microsoft-365/word) · [Web walkthrough](https://support.microsoft.com/en-us/word/training/get-to-know-word-for-the-web) · [Library search walkthrough](https://techcommunity.microsoft.com/blog/Microsoft365InsiderBlog/a-faster-way-to-find-your-word-excel-and-powerpoint-files-online/4496115)

## Personas and tasks

| Persona | Typical task in this workspace |
| --- | --- |
| Document author | Create a blank document or template copy, name it, write and format it, then find it later in Recent or Favorites. |
| Reviewer | Open a document with review permission, request clarification on selected text, reply to feedback, and propose a tracked insertion or deletion. |
| Editor | Read existing suggestions, compare markup views, accept a correction and reject a conflicting proposal, then check the resulting text. |
| Document owner | Invite named people with different roles, copy a scoped link, and change or revoke access. |
| Reader | Open a shared link and read the document in Viewing mode. |

## Workflow inventory

| Priority | Feature | Interaction and feedback |
| --- | --- | --- |
| P0 | Harbor shell | Load a session world, then render the signed-in library, editor or share entry point. Keep the session through navigation and reload. |
| P1 | Library discovery | Create entry points, template choices, Recent/Favorites/Shared filters, search and sortable file rows. Search narrows the active view, with distinct empty and no-result states. |
| P1 | Create, copy, rename and delete | Start a blank or template document, edit the title inline, create independent copies and confirm owner deletion. |
| P1 | Write and format | A white canvas accepts keyboard input and paste. Home controls format text and paragraphs while preserving selection. Saved status and the word count reflect editor activity. |
| P1 | Editor access modes | Editing permits accepted edits, Reviewing produces suggestions and supports comments, and Viewing keeps the canvas readable. |
| P1 | Post and reply to comments | Create from the selection or caret. Use a visible draft and Post action, threaded replies, `@` suggestions and a clear selection highlight. |
| P1 | Comment lifecycle | Select a thread to jump to its text. Edit/delete one’s own message, resolve a thread and reopen it from the list. |
| P1 | Track changes | Choose whose edits to track. Render changes with Simple or All Markup while retaining the accepted version. |
| P1 | Decide changes | Navigate pending edits in document order or use a change card. Accept, reject, or decide all with persistent outcomes. |
| P1 | Invite people | Pick recipients and a permission, optionally add a note, and confirm the local share. Names and email addresses use the same recipient input. |
| P1 | Copy and open a link | Choose audience and permission, copy the session link, and open it with the access implied by scope and role. |
| P1 | Manage access | See the owner, people and active links. Update an individual role or confirm revocation and observe the resulting access. |
| P2 | Reading aids | Navigate by heading or change zoom for longer documents. |
| P2 | Print preview | Render a local print view from accepted document content for eligible readers. |

## View and interaction notes

- **Library.** Microsoft’s web walkthrough uses a Create blank document entry point, template previews and recent documents. The newer search demo shows search in the top bar and a file result surface, with Recent, Favorites and Shared on the library page. Use the planned rail and compact file table in `DESIGN.md`. Owners, timestamps and accessible status make files distinguishable. [Create and rename](https://support.microsoft.com/en-us/word/training/create-a-document-in-word-for-the-web) · [Search demo](https://techcommunity.microsoft.com/blog/Microsoft365InsiderBlog/a-faster-way-to-find-your-word-excel-and-powerpoint-files-online/4496115)
- **Editor.** The web walkthrough describes formatting in Home and feedback controls in Review. Microsoft’s editor demonstration shows the ribbon above a centered page and a status bar below. Support ordinary text selection, paste, familiar formatting shortcuts and Escape in menus. The compact editor-specific command row preserves the workspace when width is limited. [Web editor tour](https://www.youtube.com/watch?v=vGm5BM9UC9Y) · [Ribbon and page reference](https://techcommunity.microsoft.com/blog/Microsoft365InsiderBlog/view-your-document-across-separate-pages-in-word-for-the-web/4221278) · [Keyboard shortcuts, including web](https://support.microsoft.com/en-us/accessibility/word/keyboard-shortcuts-in-word)
- **Comments.** Microsoft distinguishes contextual comments by the selection from a full list that includes resolved threads. Modern comments use an explicit post action. The web refresh shows a selected card with a clear highlight and surrounding inactive cards with subdued backgrounds. Provide keyboard paths to post, reply and jump to the range. [Modern comments](https://support.microsoft.com/en-us/word/modern-comments-in-word) · [Word web comments accessibility](https://support.microsoft.com/en-us/accessibility/word/use-a-screen-reader-to-add-read-and-delete-comments-in-word) · [Web comments refresh](https://techcommunity.microsoft.com/blog/Microsoft365InsiderBlog/introducing-a-fresh-new-look-for-comments-in-word-for-the-web/4458184)
- **Track changes.** The web-specific section documents Off, Just Mine and For Everyone, with Simple Markup in margins and All Markup on the page. The inline change card and toolbar support single decisions and review in sequence. A review recipient can propose edits or add comments, with decisions reserved for editing access in this plan. [Track Changes in Word](https://support.microsoft.com/en-us/word/training/track-changes-in-word) · [Simple Markup walkthrough](https://techcommunity.microsoft.com/blog/Microsoft365InsiderBlog/simple-markup-view-in-word-for-the-web/4214635) · [Review mode in Word](https://support.microsoft.com/en-us/word/review-mode-in-word)
- **Share, Link settings and Manage access.** Word’s web guide names the Edit, Review, View and Can’t download options. Microsoft 365’s shared sharing workflow supplies audience choices, an optional note and a way to change or remove individual access. The link for people with existing access follows the recipient’s current permissions. Use the planned drawer, with a clear transition between invite, link settings and access management. [Word web sharing](https://support.microsoft.com/en-us/word/training/share-and-collaborate-with-word-for-the-web) · [Microsoft 365 link settings](https://support.microsoft.com/en-us/sharepoint/libraries/sharing-files-folders-and-list-items) · [Manage sharing and permissions](https://support.microsoft.com/en-us/onedrive/sharepoint/manage-sharing-and-permissions-in-onedrive-and-sharepoint)
- **Narrow browser widths.** Keep the same four workflows. Use a narrow rail, overflow commands and overlay panels. Microsoft’s mobile app confirms document, review and sharing tasks matter on smaller screens. Native mobile screenshots and controls are a separate product surface. [Microsoft Word for iPhone and iPad](https://apps.apple.com/us/app/microsoft-word/id586447913)

## Visual references

Use images under `screenshots/` as research references. See the [official manifest](screenshots/official/manifest.json) for publisher pages, image dimensions and source files or frames. `DESIGN.md` specifies the implementation layout and tokens. Keep these reference images outside the runtime UI.

| Reference | Observed layout and relevance |
| --- | --- |
| [Web library and search](screenshots/official/library-search.png) | The top bar’s file-search field opens a results panel. Blank document and templates appear before the library with visible Recent, Favorites and Shared filters. |
| [Web editor canvas](screenshots/official/editor-canvas.png) and [compact ribbon](screenshots/official/web-ribbon.png) | The white page sits on a pale canvas. The compact controls use a thin tab row above a command row, with the document status controls below the page area. |
| [Create action](screenshots/official/create-01.png) and [rename control](screenshots/official/create-02.jpg) | The blank document action is filled blue. The title control sits in the editor header, close to the saved indicator. |
| [Comment cards](screenshots/official/comments-refresh-02.png) and [reply composer](screenshots/official/comments-refresh-03.png) | Document text and margin markers are visible alongside the cards. A selected card is white with an emphasized range and reply box. Inactive cards use subtle gray. [Announcement overview image](screenshots/official/comments-refresh-01.png). |
| [Simple Markup](screenshots/official/simple-markup.png) and [All Markup](screenshots/official/all-markup.png) | The same page shows margin indicators in Simple Markup and adds underlines and strikethroughs in All Markup. |
| [Tracking picker](screenshots/official/web-tracking-01.png), [review controls](screenshots/official/web-tracking-02.png), [insertion menu](screenshots/official/web-tracking-03.png) and [deletion menu](screenshots/official/web-tracking-04.png) | The picker sits with markup controls. The review group pairs Accept/Reject and Previous/Next. Context menus name the selected edit type. |
| [Manage access permissions](screenshots/official/manage-access.png) | Microsoft illustrates the shared permissions component inside PowerPoint. It shows an owner row, individual permission menus, removal, link settings and Copy link. Use the Word-specific text for the Can review option. |
| [Header/footer announcement crop](screenshots/official/header-footer-01.png) | Shows a slim extra command row for a contextual ribbon tab. This is a secondary visual reference for density. |

The supplied `home/000001` through `000003`, `editor/000001` and `000002`, `review/000001` and `000003`, and `sharing/000001` and `000002` are desktop Word or legacy Office screens. `editor/000003` depicts a ribbon-authoring utility. `review/000002` and `sharing/000003` are tutorial covers. The image-search pass returned additional desktop and legacy material. The indexed official references above cover the relevant web workflows.

## Data model and scope

The model follows document, paragraph and run concepts from Office Open XML and uses purpose-built JSON suitable for Harbor. Comments retain an anchor and separate messages. Tracked changes store the proposed patch and decision. Sharing uses separate invitation, direct grant and share link records, with explicit permission and status fields. These conventions adapt public product concepts for the offline sandbox. [Open XML word processing](https://learn.microsoft.com/en-us/office/open-xml/word/overview) · [Microsoft Graph permission model](https://learn.microsoft.com/en-us/graph/api/resources/permission) · [Planned JSON data model](data_model.md)

The workspace starts with a fictional, preselected user and original English sample documents. Authentication, real messages, online storage, desktop integrations and live collaboration are outside the offline Harbor workflow. Detailed record writes and acceptance steps are in the [implementation checklist](../TODO.md).
