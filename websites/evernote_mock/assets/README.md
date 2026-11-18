# Evernote workflow research

Evernote combines project notes, notebook-based organization and tasks that stay attached to their source notes. This account represents Maya Chen, an operations lead coordinating vendor reviews, an office move and internal project follow-up. A project coordinator can capture meeting decisions and track follow-up in the same note. A teammate preparing a handoff can browse project notebooks and find instructions by title, body text or tag. [Notes product overview](https://evernote.com/features/notes-app) · [Tasks overview](https://help.evernote.com/hc/en-us/articles/1500003792141-Tasks-Overview) · [Organize with notebooks](https://help.evernote.com/hc/en-us/articles/209005637-Organize-with-notebooks)

## Product behavior

- **Notes and discovery.** Users create and edit notes, locate them through search and refine the result by notebook or tag. Official help covers both direct creation and filters applied to a notebook or search result. The planned account also supports moving and duplicating notes, with a separate Trash view for restoration. [Create a note](https://help.evernote.com/hc/en-us/articles/360052533493-Create-a-note) · [Search overview](https://help.evernote.com/hc/en-us/articles/360040282613-Search-overview) · [Filter your notes list](https://help.evernote.com/hc/en-us/articles/360050105293-Filter-your-notes-list) · [Recover deleted notes](https://evernote.com/en-us/online-notepad/recover-deleted-notes-in-evernote)
- **Notebook lifecycle.** Each notebook contains related notes, and a default notebook receives new notes without a more specific destination. Deleting a non-default notebook sends its notes to Trash. The planned restore flow returns notes to an active original notebook or uses the effective default after the original notebook is removed. [Organize with notebooks](https://help.evernote.com/hc/en-us/articles/209005637-Organize-with-notebooks) · [Change your default notebook](https://help.evernote.com/hc/en-us/articles/208314728-Change-your-default-notebook) · [Delete a notebook](https://help.evernote.com/hc/en-us/articles/360051769514-Delete-a-notebook-Free-Personal-or-Professional)
- **Contextual tasks.** Tasks can originate in a specific note or an account-wide capture flow. The default task note handles uncategorized work. A task appears both within its note and in Tasks, where due dates and flags support prioritization. The two views use one task record. [Tasks overview](https://help.evernote.com/hc/en-us/articles/1500003792141-Tasks-Overview) · [Tasks product overview](https://evernote.com/features/tasks)
- **Desktop and small screens.** The product exposes collection filters on both desktop and mobile. This design keeps creation and navigation reachable on narrow screens, with a full-width editor in place of the desktop sheet. Account-wide search may later gain a keyboard shortcut. [Filter your notes list](https://help.evernote.com/hc/en-us/articles/360050105293-Filter-your-notes-list) · [Keyboard shortcuts](https://help.evernote.com/hc/en-us/articles/34296687388307-Keyboard-shortcuts)

## Feature inventory

| Priority | Feature | Entry and interaction |
| --- | --- | --- |
| P0 | Workspace shell and state | Horizontal command bar, section tabs, common route providers, session-scoped loading and saving |
| P1 | Note library | Open Notes or Search, refine the cards by notebook and tag, and open a result in the editor |
| P1 | Note capture and organization | Create or edit from Notes or a notebook, then move, tag, duplicate or trash from the note editor |
| P1 | Trash and restore | Select a trashed note, review its content and restore it to an active notebook |
| P1 | Notebook directory and lifecycle | Open Notebooks, search by name, create, rename, set default, or confirm deletion |
| P1 | Task capture and lifecycle | Create from Tasks or inside a note, set date and flag, edit, move, complete, reopen or delete |
| P1 | Task review | Group by due date or note, filter by status or flag, open the parent note and set the default task note |
| P2 | Search hotkey and keyboard help | Open search from the workspace and access shortcut help |

## View and data handoff

- **Notes and Search** use a full-width note grid under the shared navigation. Search supplies the query and removable filters. The right-side note editor shows the notebook link, title, body, tags and linked tasks.
- **Notebooks** shows a directory of cards with note counts and a default marker. Opening a notebook leads to its scoped Notes view. Create and Rename use a focused name dialog. Deletion includes the number of active notes affected.
- **Tasks** shows due-date or note groupings and each task's linked note. The editor supports title, description, linked note, due date and flag. Changes appear immediately in the corresponding note and Tasks view after commit.
- **Trash** uses the note grid and a read-only editor with Restore. The same note ID and linked task records survive deletion and restoration.

The app state consists of the synthetic account, default preferences, notebooks, notes and tasks. Notebook and note IDs define membership, and a task has one parent note. Counts and task grouping are derived. See [the data model](data_model.md) and [the design guide](../DESIGN.md) for implementation details.

The workspace starts signed in for local practice. The scope covers individual account organization and excludes authentication, sharing with real people, plan management, external integrations, AI and clipper features. The visual design uses original local elements. Product documentation is the source for workflow behavior.
