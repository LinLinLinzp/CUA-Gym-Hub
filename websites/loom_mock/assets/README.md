# Loom Research and Feature Inventory

Loom is an asynchronous video workspace. A recording creator shares walkthroughs, project updates and process demos. A reviewer returns feedback tied to the relevant point in a recording, and a team librarian uses folders and the archive to keep the working set manageable. The account represents Maya Chen on the fictional Northstar Studio team.

## Public Research

- The personal library holds created videos and personal folders. Search supports video titles, tags and transcript phrases. A video moved into a personal folder is accessible there rather than in the root video list. The implementation uses title, description and tags with a location label in search results. [Navigate your library](https://support.atlassian.com/loom/docs/navigate-your-library/) · [Organize your Library Folders](https://support.atlassian.com/loom/docs/organize-your-library-folders/)
- Owner menus in the library support moving, renaming, duplicating, archiving and deleting. Archived videos and folders can be restored. Permanent folder deletion is reached through Archive. [Manage videos you created](https://support.atlassian.com/loom/docs/manage-videos-you-created/) · [Archive your videos](https://support.atlassian.com/loom/docs/archive-your-videos/) · [Organize your Library Folders](https://support.atlassian.com/loom/docs/organize-your-library-folders/)
- In-video comments support timestamps and replies and appear beside the video. The workspace uses text discussion, one level of replies and timestamp seeking. [React to videos with emojis and in-video comments](https://support.atlassian.com/loom/docs/react-to-videos-with-emojis-and-in-video-comments/)
- The source product has a New Video entry point for importing recordings. The local account uses that entry point to create a recording from a bundled sample. Bulk organization is a secondary extension of the individual move and archive actions. [Upload or import videos](https://support.atlassian.com/loom/docs/upload-or-import-videos/) · [Bulk update videos](https://support.atlassian.com/loom/docs/bulk-update-videos/)

## Feature Inventory

| Priority | View | Behavior and layout |
| --- | --- | --- |
| P0 | Account shell | Horizontal masthead with text wordmark, Library, Folders, Archive, search and current account. Page content stays in the same shell on direct links. |
| P0 | Harbor | Neutral loading state, session-scoped hydration and whole-state saves on successful business actions. The app works with empty and injected collections. |
| P1 | My Library and search | Warm canvas, a recording grid, a right-hand folder panel and actions above. Search returns videos and folders with their location. Sort options apply to the visible recording list. |
| P1 | New Video and item actions | A local sample picker and metadata form create a playable recording. A video action menu supports rename, duplicate, move and archive. The detail page also exposes description editing. |
| P1 | Folders | A dedicated index lists folders and counts. Each folder opens into its own recording list. Create and rename use focused forms. Archive uses a confirmation with affected content. |
| P1 | Archive | Visible video and folder groups provide Restore and Delete. Restore respects prior location when available, and permanent deletion confirms the records affected. |
| P1 | Video detail and discussion | The player and description sit next to a discussion panel. Comments show author, date, text and optional timestamp, with one level of replies and owner-authorized edit and delete. |
| P2 | Bulk video organization | Selection controls on the library and folder view lead to a contextual action bar for Move and Archive. |

## Data Overview

The proposed world has `account`, `users`, `videos`, `folders` and `comments`. Videos belong to at most one folder, and each comment belongs to a video with an optional parent comment. Status and timestamps give the verifier observable lifecycle transitions. Seed the account with fixed English-language records about product reviews, support playbooks, launch readiness, engineering handoffs and onboarding. See [the data model](data_model.md) for field definitions.

Use the original layout and local asset direction in [the design system](../DESIGN.md). The team starts inside a pre-signed-in workspace. Authentication, integrations, external imports and recording hardware sit outside this account's workflows.
