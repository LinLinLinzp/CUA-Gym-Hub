# Figma workflow research and handoff

The workspace is a signed-in account for Maya Chen at the fictional Commonfield Studio. Designers organize documents, prepare reusable design elements, and give teammates access. Reviewers select a location, discuss changes, and check resolved feedback. The planned browser and file workspace use original layouts and synthetic art from [DESIGN.md](../DESIGN.md).

| Priority | Feature | Screen and interaction |
|---|---|---|
| P0 | Account shell | Cream file library with aubergine workspace rail, Search, and New design file. The editor replaces the rail with a breadcrumb header, canvas, page tabs, and a single tool dock. |
| P0 | Session and state | Neutral boot screen, repository Harbor templates, direct links, safe empty and missing states, and a verifier-readable schema. |
| P1 | Files | Browse folders, Drafts, Starred, and Trash. Search and sort the gallery or list. Create, rename, move, duplicate, star, trash, and restore from named actions. |
| P1 | Comments | Pin feedback on an artboard or layer, open a thread from its pin or the Comments panel, reply, resolve, and filter to reopen. |
| P1 | Components | Select a layer, create or rename a reusable main, publish it, and insert a linked instance locally or into another file from Assets. |
| P1 | Sharing | Invite synthetic people as viewers or editors, manage or remove a direct grant, save link settings, and copy the session-aware file URL. |

## Product behavior references

- Figma organizes files into folders and keeps unfiled work in Drafts. The browser supports starring and restoring deleted work. Duplication makes a new document without carrying the source discussion or version history. The sandbox uses the current **Folders** label, with stable deep links for its local routes. [File browser](https://help.figma.com/hc/en-us/articles/14381406380183-Guide-to-the-file-browser), [Files and folders](https://help.figma.com/hc/en-us/articles/1500005554982-Guide-to-files-and-folders), [Duplicate files](https://help.figma.com/hc/en-us/articles/360038511533-Duplicate-or-copy-files)
- Reviewers can pin a comment on the canvas, reply in a thread, resolve it, and make resolved comments visible again. The sandbox supports page and layer anchors and keeps resolution and replies as related records. [Add comments](https://help.figma.com/hc/en-us/articles/360041068574-Add-comments-to-files), [Manage comments](https://help.figma.com/hc/en-us/articles/360041547593-View-and-manage-comments)
- A main component derives from selected content. An instance refers back to its main, and publishing a library makes reusable elements available in other files. The sandbox implements that relationship through component and layer IDs. [Create components](https://help.figma.com/hc/en-us/articles/360038663154-Create-components-to-reuse-in-designs), [Insert instances](https://help.figma.com/hc/en-us/articles/360039150173-Create-and-insert-component-instances), [Libraries](https://help.figma.com/hc/en-us/articles/360041051154-Guide-to-libraries-in-Figma)
- File sharing has individual grants and a link audience, with viewer and editor roles. The sandbox models grants, link settings and their local effect within the active synthetic session. [Share files](https://help.figma.com/hc/en-us/articles/360040531773-Share-files-and-prototypes), [File permissions](https://help.figma.com/hc/en-us/articles/35361119554711-File-and-folder-permissions)

## Data model overview

The account points to the current user. Files link to owners and folders. Pages and layers form documents. Components reference main layers, and instances keep their main's component ID. Threads reference the file and page and optionally a layer, with replies stored as separate records. File stars and access grants are separate so the UI and verifier can identify their actors and statuses. Link policy is stored on the file. Refer to the [data model](data_model.md) for shapes, examples, mutation semantics and seed distributions.

The four seed workflows define the implementation scope. The synthetic account starts signed in. Share records do not trigger external email. General vector editing, prototype playback, plugins, real-time collaboration, and permanent deletion are outside the task paths.
