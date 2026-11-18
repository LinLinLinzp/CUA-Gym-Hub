# SharePoint workflow research

SharePoint supports team collaboration, organization-wide publishing and content management. Sites provide a workspace for collections. Lists hold structured business entries, while document libraries hold files and folders. Microsoft's resource model confirms the relationships among sites, lists, list items and drives. [Microsoft Graph resource overview](https://learn.microsoft.com/en-us/graph/api/resources/sharepoint?view=graph-rest-1.0)

## People and tasks

- Morgan Ellis, workplace operations lead, creates and follows sites, tracks facilities requests and organizes procedures in document libraries.
- Team coordinators add and update list items, sort work by due date and filter by status.
- Document contributors create folders, upload local files and move documents to the appropriate folder.
- Readers find a site or document from search and inspect the associated content.

## Feature inventory and layout

| Priority | Feature | View and behavior |
|---|---|---|
| P0 | Account shell | Text brand and global search in the header, Home and Sites in the rail, and an initials avatar for the active account. |
| P0 | Session and state | A neutral loading view during boot and valid deep links, with session context preserved across navigation. |
| P1 | Home and site discovery | Home opens with an illustrated welcome panel plus followed and recently updated sites. The Sites directory adds search and type filters. |
| P1 | Site creation and follow | A creation dialog offers Team and Communication types. Site home has a concise title banner and a follow control. |
| P1 | Site contents and collections | A shared New menu creates a blank list or library. Group lists and libraries by kind, each with a name and short description. |
| P1 | List tables and item maintenance | A table with type-aware columns and a command bar. Item forms open in a side panel. Delete confirms selected rows. |
| P1 | Library tables and documents | Toolbar and breadcrumbs above files and folders. Rename and Move to use dialogs. Files open in a detail panel with local preview where supported. |
| P1 | Global search | Group or filter results by kind, label their parent site and link into the result's context. |
| P2 | Copy to | Duplicate a file into another folder in the same library via the destination picker. |

## Functional references

- Team sites support active collaboration, and communication sites support broader publishing. The site creation flow allows a name and description and leads into the new site. The start page makes followed sites available for return visits. [Create a site](https://support.microsoft.com/en-gb/sharepoint/sharepoint-training/create-a-site-in-sharepoint) · [Discover and follow sites](https://support.microsoft.com/en-us/sharepoint/sites-pages/discover-content-with-the-sharepoint-start-page)
- Lists support required fields, typed columns, row-level edits and deletion of selected items. Column headers provide sorting and filtering. [Add, edit or delete items](https://support.microsoft.com/en-us/sharepoint/lists/data-and-lists/add-edit-or-delete-list-items) · [Change a list view](https://support.microsoft.com/en-us/sharepoint/lists/create-or-change-the-view-of-a-list)
- Document libraries accept files, provide file details and let contributors select a folder destination for a move or copy. [Upload files](https://support.microsoft.com/en-us/sharepoint/documents-and-library/upload-files-and-folders-to-a-library) · [File details](https://support.microsoft.com/en-us/sharepoint/libraries/work-with-files-in-a-document-library) · [Move or copy files](https://support.microsoft.com/en-us/sharepoint/libraries/move-or-copy-files-in-sharepoint)
- Public accessibility guidance identifies the navigation landmarks and site-content links that should be reachable by keyboard. Microsoft's mobile documentation confirms that site browsing includes lists, libraries and files. Use the same logical ordering as controls reflow. [Screen-reader navigation](https://support.microsoft.com/en-us/accessibility/sharepoint/use-a-screen-reader-to-explore-and-navigate-sharepoint-online) · [Mobile content browsing](https://support.microsoft.com/en-us/sharepoint/get-started-with-sharepoint/about-sharepoint-mobile-app)

## Data and scope

Use the synthetic Acme account and deterministic workplace fixtures described in [data_model.md](data_model.md). Sites own lists and libraries. Items belong to lists and carry values keyed by column ID. Files and folders belong to libraries and reference a parent folder or the library root. Follow relationships connect users to sites. The Harbor state API handles session state and local uploaded files.

The plan uses the public product documentation for terminology and interaction flow. [DESIGN.md](../DESIGN.md) specifies an original layout and original local artwork for this build. Authentication, permissions administration, external sharing and cloud integrations are outside the training workflows. Dedicated mobile app behavior, site template galleries, version history and coauthoring are outside this implementation.
