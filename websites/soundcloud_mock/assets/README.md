# SoundCloud workspace research

This workspace serves a signed-in independent artist. On release day, Mira Vale uploads an audio file and publishes its metadata. After publishing, she groups tracks into playlists, replies to listener comments, and checks how each release is performing. The supplied listener accounts populate the catalog and discussions with synthetic activity.

## Workflow references

- **Uploads** involve selecting an audio file and setting track visibility. The workspace uses a local upload endpoint and shows editable title, description, genre, tags and privacy. [SoundCloud upload troubleshooting](https://help.soundcloud.com/hc/en-us/articles/115003561208-Upload-Issues-Troubleshooting) · [SoundCloud privacy guide](https://help.soundcloud.com/hc/en-us/articles/115003451767-Manage-Privacy-for-Your-SoundCloud-Profile-and-Content)
- **Playlists** have independent public/private settings and an explicit track order. Adding a track appends it, and the artist can reorder or remove individual entries. [SoundCloud playlist editing guide](https://help.soundcloud.com/hc/en-us/articles/115003449787-Adding-Removing-and-Rearranging-Tracks-in-a-Playlist-or-Album) · [SoundCloud playlist privacy guide](https://help.soundcloud.com/hc/en-us/articles/115003447187-Changing-your-playlist-s-privacy-settings)
- **Comments** on a track can be associated with timeline positions, and creators can remove comments on their own tracks. The Comments inbox gives this workspace a second entry point into the same conversation. [SoundCloud creator comments guide](https://help.soundcloud.com/hc/en-us/articles/15979541572251-Manage-Comments-as-a-Creator)
- **Insights** summarizes plays, likes, comments, reposts and downloads by period. The workspace uses daily fixture rows and records the artist's explicitly applied selection, so Harbor can verify which report the artist opened. [SoundCloud Insights guide](https://help.soundcloud.com/hc/en-us/articles/115003564988-Insights-on-SoundCloud)

## Feature inventory

| Priority | View or component | Behavior |
| --- | --- | --- |
| P0 | Signed-in shell | Text wordmark, workspace destinations, Upload entry point, neutral loading state, session-scoped routes |
| P0 | Overview | Account activity totals, recent tracks, recent comments and links into each workflow |
| P0 | Harbor store | Seed load, injected records, whole-state persistence and verifier-readable diffs |
| P1 | Upload and track catalog | Local audio selection and validation, publish, track search and filters, track editor |
| P1 | Playlists | Search by title, filter by visibility, create, add or remove tracks, change order and privacy |
| P1 | Comments | Track conversation, timed and untimed posts, replies, removal and account inbox |
| P1 | Insights | Counts, chart and rankings, date/track/metric controls, persisted applied reports |
| P2 | Audio preview | Keyboard-operable playback and waveform seeking with local audio |
| P2 | Insights table | Explicit chart/table switch for reviewing long ranges |

See [the design guide](../DESIGN.md) for page layouts, [the state model](data_model.md) for records and relationships, and [the implementation checklist](../TODO.md) for acceptance criteria. The app starts within the creator workspace. Account access, paid services, external sharing and moderation reports are outside the supplied workflows. Cover art and the workspace banner use original local artwork.
