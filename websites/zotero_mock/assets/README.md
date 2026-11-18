# Zotero — Product Research

Zotero supports collecting research references, organizing them in personal and group libraries, and generating citations and bibliographies. This account workspace is designed for researchers curating a project library, research assistants maintaining group records, and students preparing references for a paper. [Product overview](https://www.zotero.org/) · [Web library overview](https://www.zotero.org/support/kb/web_vs_desktop)

## Workflow inventory

| Priority | User task | Product behavior and planned interaction |
| --- | --- | --- |
| P0 | Open the account workspace | Start with the personal library, a named signed-in account, and links to the Libraries directory and Citations history. Follow `DESIGN.md` for the workspace and `HARBOR_CONTRACT.md` for routes and persistence. |
| P1 | Browse and manage libraries | Zotero separates personal and group libraries and supports different group visibility and access models. List libraries with role and reference counts, switch context, and create or edit a private group locally. [Zotero Groups](https://www.zotero.org/support/groups) |
| P1 | Add and maintain references | Zotero records metadata by item type, with creators, tags, and collection associations. Use a manual editor and searchable list for journal articles, books, reports, and web pages. Keep trashed records recoverable. [Adding Items](https://www.zotero.org/support/adding_items_to_zotero) · [Editable item data](https://www.zotero.org/support/dev/web_api/v3/write_requests) |
| P1 | Organize references in collections | An item can belong to multiple collections within the same library. Parent and child collections can contain different references. Deleting a collection retains library items. Expose filing and removal in the item drawer and selection toolbar. [Collections and Tags](https://www.zotero.org/support/collections_and_tags) |
| P1 | Produce citations and bibliographies | Zotero supports selecting one or more references, choosing a style, and generating either citations or bibliographies. Its documented desktop shortcuts cover both clipboard operations. Put these actions in a visible composer with preview, local output, and workspace history. [Creating Bibliographies](https://www.zotero.org/support/creating_bibliographies) · [Keyboard shortcuts](https://www.zotero.org/support/kb/keyboard_shortcuts) |
| P2 | Copy references between libraries | Cross-library copying carries tags and starts with independent collection placement. Offer this in the bulk action menu after the core workflows are complete. [Collections and Tags](https://www.zotero.org/support/collections_and_tags) |

## Screens and interaction patterns

- **Libraries directory.** Cards list the personal and group libraries, role, and active item count. Management actions sit on the card for owners. New Group opens a focused form for name and description.
- **Library workspace.** A collection sidebar frames a searchable reference list. The toolbar exposes filter, sort, add, and selection actions. A collection route retains the same workspace layout and changes the list scope.
- **Item details.** A drawer shows item type, creators, identifiers, tags, and memberships. Actions open an editor or collection selector, or start the citation composer.
- **Citations.** Compose with a selected reference list, style, output kind, and preview. The separate history page shows the selected style, action, related items, and stored text for reuse.
- **Compact layout.** Show navigation and collection tools in labeled disclosures as needed. Preserve the reference editing and citation actions on narrow screens. Mobile support includes reading and editing library data. [Zotero for Mobile](https://www.zotero.org/support/mobile)

## Data and scope

An account supplies the actor for changes. Libraries own collections and items. Item records carry collection IDs, and citation records point to source items and store rendered output. The [data model](data_model.md) specifies IDs, seed volumes, and exact fields.

The app covers signed-in research workflows with synthetic references and local state. Account access, live collaboration, integrations, attachments, and web imports require services outside the sandbox brief.
