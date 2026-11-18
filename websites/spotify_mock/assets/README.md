# Spotify workflow research

This offline account centers on maintaining a synthetic music collection. Maya Chen is the signed-in listener. A collector builds playlists and saves tracks or albums. A listener follows artists and people from their profile pages. A playlist owner invites people to contribute and manages their access. An invited listener can join and edit a shared playlist.

## Product behaviors

- **Playlist management.** Spotify documents desktop playlist creation in Your Library, catalog actions for adding tracks, and per-item removal and reordering. Its developer documentation describes ordered items and the identity and date of the user who added each item. The plan uses stable item IDs and retains attribution for collaborative edits. [Create and edit playlists](https://support.spotify.com/am/article/create-playlists/) · [Playlist concepts](https://developer.spotify.com/documentation/web-api/concepts/playlists)
- **Saved library.** Spotify documents Liked Songs, collection filtering and independent track and album saves. The plan gives saved tracks a dedicated destination and implements album and external playlist saves as separate relationships. [Your Library](https://support.spotify.com/us/article/your-library/)
- **Follow.** Spotify supports following artists from artist profiles and following people from their user profiles. The plan also provides a compact Following view for finding and unfollowing existing targets. [Follow artists, podcasts and shows](https://support.spotify.com/us/article/follow-artists-podcasts-and-shows/) · [Follow friends and manage followers](https://support.spotify.com/sg-en/article/follow-friends-manage-followers/)
- **Collaboration.** Spotify describes generated invitation links with seven-day validity and owner controls for removing collaborators. Playlist contributions include adding, removing and reordering tracks. In this account, a private same-origin invite route joins the active synthetic user and a seeded incoming link makes that workflow testable. [Collaborative playlists](https://support.spotify.com/pw/article/collaborative-playlists/) · [Playlist concepts](https://developer.spotify.com/documentation/web-api/concepts/playlists)

## Views and actions

| Priority | View | Content and actions |
| --- | --- | --- |
| P0 | Shared shell | Text masthead, Library and Browse navigation, account link, loading state, deep links and recovery states |
| P1 | Your Library | Create playlist, Liked Songs, shared playlists, pending incoming invitations and searchable, sortable collection cards |
| P1 | Browse | Search across tracks, albums, artists, playlists and profiles. Track results expose Save and Add to playlist. |
| P1 | Playlist detail | Cover, owner, description, track count, ordered tracks, empty-state Add tracks and eligible edit, save and delete actions |
| P1 | Collaboration | Manage collaborators, create/copy/revoke an invite, join a playlist, view contributors, edit tracks and remove a member or disable collaboration |
| P1 | Liked Songs and album | Searchable saved tracks in Liked Songs. Album art, artist, release details, ordered tracks and album Save on album pages. |
| P1 | Artist, profile and Following | Artist releases and songs, user public playlists, Follow/Following and current account's followed targets |
| P2 | Playlist cover selection | Offer bundled original cover presets in the edit form. |

The full workflow handoff is in [TODO.md](../TODO.md). Use [DESIGN.md](../DESIGN.md) for the original page composition and visual tokens. Create visual assets locally during implementation.

## State and scope

Seed account identity, people, artists, albums, tracks and playlists with fixed IDs. Editable relationship records track saved items, follows, ordered playlist contents, collaborators and invitations. Derive views from those records. The [state model](data_model.md) names every relationship and mutation for the Harbor verifier.

Authentication, billing, streaming and external message delivery are outside this account's workflows. The seeded identity and local catalog make every action available in an offline Harbor task.
