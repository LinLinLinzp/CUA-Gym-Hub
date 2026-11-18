# Goodreads workflow research

The account sandbox serves a reader who organizes a personal library, records opinions, and tracks a yearly reading goal. Mara Chen is the signed-in synthetic reader. Catalog titles, authors and community contributions are fictional. [Design specifications](../DESIGN.md)

## Workflow references

- **Shelves.** Goodreads documents three default status shelves and supports creating, renaming and deleting custom shelves. Custom shelves support cross-cutting uses such as favorites, genres and books owned. The first build models one reading status plus multiple custom tags. [Goodreads guide to custom shelves](https://www.goodreads.com/blog/show/1399-goodreads-hack-how-to-create-custom-bookshelves)
- **Reviews.** The book detail is a natural starting point for creating a review or returning to a previous review. The sandbox also gives the reader a dedicated review index for editing and revisiting their own entries. [Goodreads moderator walkthrough](https://help.goodreads.com/s/question/0D51H00004FDafbSAD/how-do-i-edit-a-review-ive-already-posted)
- **Reading challenge.** Goodreads supports an editable annual goal and credits rereads. The sandbox ties progress to explicit finish dates, so a correction moves that finish to the appropriate calendar year. [Goodreads Reading Challenge overview](https://www.goodreads.com/blog/show/3144-join-the-goodreads-reading-challenge?content_type=all)

## Views and priorities

| Priority | View | Main behaviors |
| --- | --- | --- |
| P0 | Account shell | Goodreads text wordmark, signed-in account, local catalog search, route navigation, session preservation |
| P0 | Harbor state | Fixed synthetic seed, startup hydration, centralized saves and sid-scoped verification |
| P1 | My Books | Status counts, custom shelf management, title/author filtering, sorting, shelf assignment and library removal |
| P1 | Catalog results and book detail | Find a book, inspect its summary, change shelf membership, manage personal review and date read |
| P1 | My Reviews | Browse signed-in reader ratings and reviews, reveal spoiler text, edit or delete a review |
| P1 | Reading Challenge | Select a year, set or edit a goal, inspect counted finishes, add or correct a completion date |
| P2 | My Books bulk controls | Apply or remove one custom shelf for selected books |

## Data and assets

Catalog records are separate from shelves, memberships, reviews, annual goals and finish dates. Actor and book IDs connect the records and allow Harbor to inspect each write. Shelf counts and challenge progress are computed from those relationships. [Data model and field-level write map](data_model.md)

Illustrations are authored locally for the fictional catalog. [Visual design and cover specification](../DESIGN.md)

The exercise begins inside the account. Authentication, account creation, purchasing, external integrations and social posting are outside scope so each task can run in Harbor with the supplied account and data.
