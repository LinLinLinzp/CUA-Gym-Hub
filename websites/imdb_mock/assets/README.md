# IMDb account workflow research

The account workspace links three tasks for a film and television viewer. Use Watchlist to plan future viewing, Ratings to record and revisit personal scores, and Lists to curate groups of titles. The account opens on Your Activity with a fictional English-language film and TV catalog.

## View inventory

| Priority | View | Content and main paths |
| --- | --- | --- |
| P0 | Your Activity | Account identity, collection counts, a short Watchlist shelf, recent personal ratings, and list previews. Each preview has a direct route to its full collection. |
| P1 | Search and title detail | Global search opens local catalog results. A result opens a title with metadata, poster, synopsis, and controls for each seed workflow. |
| P1 | Your Watchlist | A browsable saved queue with custom order, remove actions, filters, and visibility settings. Reorder through a numeric position control in edit mode. |
| P1 | Your Ratings | Personal score history with date, title metadata, and filters. Open the shared rating dialog to revise or remove a score. |
| P1 | Your Lists | Index showing list title, artwork, count, visibility, and edit/delete actions. Create a named title list from this page. |
| P1 | List detail | Metadata and member rows. Add through a local title picker, edit details or visibility, set custom order, remove members, or delete the list. |
| P2 | Collection enhancements | Optional compact browsing mode and a derived ratings distribution. |

Use the plum rail, ivory workspace, and original art direction from [DESIGN.md](../DESIGN.md). The global search and persistent collection links make each workflow reachable from any detail page. On small screens, turn the rail into a top navigation row and stack content in reading order.

## Public product behavior

- IMDb Watchlist tracks movies and television for later viewing. The help describes title-page add/remove and re-add, custom ordering, visibility, and filtering. The workspace uses the same user outcomes through labeled controls and leaves the account’s Watchlist available after the last title is removed. [Watchlist FAQ](https://help.imdb.com/article/imdb/track-movies-tv/faq-for-the-watchlist-feature/G9PA556494DM8YBA)
- IMDb accepts integer personal scores from 1 to 10 on released titles, with a single current value per user and title. Changes replace the previous score and an existing rating can be removed. The workspace has a shared rating dialog, fixed catalog aggregates, and a personal history view. [Ratings FAQ](https://help.imdb.com/article/imdb/featured-content/ratings-faq/G67Y87TFYYP6TWAV), [Change or remove a rating](https://help.imdb.com/article/imdb/track-movies-tv/how-do-i-change-or-delete-my-vote-on-a-title/GD9UAYG9EUUERMUH)
- IMDb list editing supports creating and managing lists, adding items from a detail page or from within a list, custom sequence, and public/private settings. This project focuses on titles so that the same synthetic catalog supports each workflow. [Lists FAQ](https://help.imdb.com/article/imdb/track-movies-tv/lists-faq/GNQMN47VZSE7KW38)
- IMDb’s profile help documents collection entry points and privacy controls. The workspace places each collection in persistent navigation and exposes visibility next to the corresponding collection controls. [Profile FAQ](https://help.imdb.com/article/imdb/general-information/faq-for-the-your-profile-feature/GJSRJTR7G24USEPC)

## Data and scope

One seeded account owns Watchlist memberships, ratings, lists, and list memberships. These entries reference shared title IDs. Business actions leave events alongside active records, which lets a verifier identify removed entries and see what a reorder changed. See the [data model](data_model.md).

The seeded account is available on arrival. Authentication, external sharing, reviews, check-ins, streaming, and person or media lists are outside the title collection workflows. Public/private controls persist the selected visibility locally. Title art and fallback treatments are served by the site.
