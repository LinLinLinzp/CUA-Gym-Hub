# Dropbox Workflow Research

The workspace serves a signed-in operations team at Harborline Studio. Morgan Ellis organizes project folders and manages access. Project leads circulate review materials and collect vendor deliverables. Contributors upload through a recipient link, and editors inspect file history when they need to recover prior content.

## Feature inventory and placement

| Priority | View | Features |
| --- | --- | --- |
| P0 | Account frame | Text brand, account identity, global search, top navigation, route and session continuity |
| P1 | All files and folders | Folder tree, breadcrumbs, searchable and sortable file index, create, upload, preview, rename, move, copy, delete, bulk move and bulk delete |
| P1 | Deleted files | Searchable recovery list with original path, deletion metadata and restore |
| P1 | Shared | Incoming and outgoing tabs, item share panel, direct member roles, link audience and revocation |
| P1 | File requests | Open and Closed tabs, request form, destination selection, local recipient link, submission list, close and reopen |
| P1 | Recipient link | Upload form for an open request and a status message for unavailable requests |
| P1 | Version history | Revision list beside a preview, author and date metadata, restore confirmation |
| P2 | Files keyboard navigation | Slash to search, arrow-key row traversal and Enter to open |

## Product behavior informing the plan

- Dropbox’s website groups file creation, uploads, filtering and recovery around the file browser. The plan uses these capabilities in a horizontal-navigation workspace with its own file index, folder column and preview layout. [Dropbox website guide](https://help.dropbox.com/installs/homepage)
- Direct sharing grants a person a role, while link sharing has its own audience and access controls. The plan models them independently so removal of one access path leaves the other available. [Sharing permissions](https://help.dropbox.com/share/set-file-folder-permissions)
- A request collects files into a chosen folder. Owners can close and reopen the same request, and contributors can submit through a link using their name and email. The plan records each submission and the resulting file separately so edited destinations and reopened requests retain their history. [Create and manage file requests](https://help.dropbox.com/en-us/share/create-file-request) · [Respond to a file request](https://help.dropbox.com/share/received-file-request)
- Version history supports previewing an older revision and restoring it under the same file name. A stable file ID and separate revision IDs support that behavior in the local model. [Restore older file versions](https://help.dropbox.com/delete-restore/recover-older-versions) · [Dropbox FileMetadata reference](https://opensource.dropbox.com/SwiftyDropbox/api-docs/latest/Classes/Files/FileMetadata.html)
- File keyboard shortcuts are confined to the file-browsing context. [Dropbox keyboard shortcuts](https://help.dropbox.com/organize/keyboard-shortcuts)

## Implementation references

[DESIGN.md](../DESIGN.md) specifies the original visual direction and local assets. [Data model](data_model.md) defines the normalized records, state relationships and sample data. [TODO.md](../TODO.md) maps each workflow to persisted changes and local test evidence.

The pre-signed-in scenario assumes one synthetic account and a local Harbor session. Account creation, production authentication, real message delivery and remote integrations are outside the scenario.
