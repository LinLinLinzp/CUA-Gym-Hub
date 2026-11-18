# Wikipedia workflow research

Wikipedia contributors edit article content, discuss potential changes on associated talk pages, and track activity on pages they watch. This English-language account workspace starts signed in as the fictional contributor `MaraFieldnotes`. The interaction behaviors below draw on public MediaWiki documentation. The layouts are original design decisions documented in [DESIGN.md](../DESIGN.md).

## Contributors and common tasks

- A copy editor finds an article, edits prose, checks the preview and publishes with a concise summary. They can verify attribution and the changed version in history. [Editing pages](https://www.mediawiki.org/wiki/Help:Editing_pages/en) · [Page history](https://www.mediawiki.org/wiki/Help:History)
- A subject contributor raises a sourcing or wording question on an article’s talk page and follows threaded replies. The thread shows the author and date of each message. [Talk pages](https://www.mediawiki.org/wiki/Help:Talk_pages)
- A watchlist reviewer monitors pages they care about, checks edits and discussion activity, and removes pages from the list when finished. A membership follows an article and its discussion together. [Watching pages](https://www.mediawiki.org/wiki/Help:Watching_pages) · [Watchlist data](https://www.mediawiki.org/wiki/API:Watchlist)

## Feature inventory and views

| Priority | View or feature | Implementation direction |
| --- | --- | --- |
| P0 | Signed-in shell | Deep blue vertical navigation on desktop, compact masthead on mobile, persistent search and a text account indicator. |
| P0 | Route and state foundation | Local boot, `sid`-aware links, reloadable deep links, empty states and the shared Harbor API. |
| P1 | Workspace | Reading-desk illustration beside the heading, article index linking into the catalog, and an activity preview linking to the watchlist. |
| P1 | Article catalog | Search field and topic and sort controls above a ruled results list with title and excerpt. |
| P1 | Article view | Single reading sheet with page actions, section index, prose and section-level edit entry points. |
| P1 | Article editor | Source field and edit metadata in the main column, preview or changes directly below it, and explicit publish and cancel actions. The snapshot and edit summary become visible in history when published. [Edit summary](https://www.mediawiki.org/wiki/Help:Edit_summary/en) |
| P1 | History | Newest-first revisions with editor, timestamp, summary and size change. A row opens its saved text and the change against its parent. [Page history](https://www.mediawiki.org/wiki/Help:History) |
| P1 | Talk pages | Topic list linked to individual threads, new-topic composer, and inline replies beneath each comment. Signed posts are represented as structured records. [Talk pages](https://www.mediawiki.org/wiki/Help:Talk_pages) |
| P1 | Watchlist activity and management | `Activity` and `Watched pages` tabs, shared watch status across article and talk routes, filterable updates, and checkbox selection to remove memberships. [Watching pages](https://www.mediawiki.org/wiki/Help:Watching_pages) |
| P2 | Two-revision comparison | Allow selecting two snapshots after the core history flow works. [Page history](https://www.mediawiki.org/wiki/Help:History) |

## Data and asset handoff

Articles hold current text while revisions hold saved snapshots. Talk topics group comments with explicit reply relationships. Watch memberships represent the active pages and events record additions and removals. Watchlist activity is a read-time view of revisions and talk comments. See [data model](data_model.md) for fields, fixtures, and writes.

The original [`reading-desk.css`](../public/visuals/reading-desk.css) draws an abstract library card and bookmark from CSS shapes. The reading desk pattern, typographic accents and contributor initials supply the local visual system. The documentation links here are research references for maintainers. The running site uses local assets and synthetic article text and account data.

The signed-in workspace covers article editing, discussion and watchlist management. Account onboarding, production integrations and wiki administration fall outside this scenario.
